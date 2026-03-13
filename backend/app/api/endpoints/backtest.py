import os
import subprocess
import sys
import json
import zipfile
from datetime import datetime
from typing import List
from fastapi import APIRouter, HTTPException
from app.schemas.backtest import BackTestRequest, BacktestResultSummary
from .score_calculator import calculate_score
from .monte_carlo import perform_monte_carlo, get_latest_mc_for_strategy
from app.core.config import USER_DATA_DIR, BACKTEST_RESULTS_DIR, MC_RESULTS_DIR

router = APIRouter()

# MC 결과 폴더 생성
if not os.path.exists(MC_RESULTS_DIR):
    os.makedirs(MC_RESULTS_DIR)


# ============================================
# Helper Functions (MC 캐시 관련)
# ============================================

def get_mc_cache_path(strategy_name: str, backtest_filename: str) -> str:
    timestamp = backtest_filename.replace("backtest-result-", "").replace(".zip", "")
    return os.path.join(MC_RESULTS_DIR, f"{strategy_name}_{timestamp}.json")


def save_mc_results(strategy_name: str, backtest_filename: str, mc_data: dict, total_trades: int):
    cache_path = get_mc_cache_path(strategy_name, backtest_filename)
    cache_data = {
        "strategy": strategy_name,
        "backtest_file": backtest_filename,
        "created_at": datetime.now().isoformat(),
        "total_trades": total_trades,
        "mc_data": mc_data
    }
    with open(cache_path, "w", encoding="utf-8") as f:
        json.dump(cache_data, f, indent=2, ensure_ascii=False)
    print(f"[INFO] MC results saved: {cache_path}")
    return cache_path


def load_mc_results(strategy_name: str, backtest_filename: str) -> dict:
    cache_path = get_mc_cache_path(strategy_name, backtest_filename)
    if os.path.exists(cache_path):
        with open(cache_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            print(f"[INFO] MC results loaded from cache: {cache_path}")
            return data.get("mc_data")
    return None


# ============================================
# API Endpoints
# ============================================

# ★ 누락된 /run 엔드포인트 복원!
@router.post("/run")
def run_backtest(req: BackTestRequest):
    """백테스트 실행"""
    strategy = req.strategy
    config_path = os.path.join(USER_DATA_DIR, "config.json")
    
    if not os.path.exists(config_path):
        raise HTTPException(status_code=404, detail=f"Config file not found at {config_path}")

    cmd = [
        "freqtrade",
        "backtesting",
        "--config", config_path,
        "--strategy", strategy,
        "--userdir", USER_DATA_DIR,
        "--export", "trades"
    ]

    try:
        result = subprocess.run(
            cmd, 
            capture_output=True, 
            text=True, 
            encoding="utf-8"
        )
        
        if result.returncode != 0:
            return {
                "status": "error",
                "message": "백테스팅 실행 중 에러가 발생했습니다.",
                "output": result.stderr + "\n" + result.stdout
            }

        return {
            "status": "success",
            "message": "백테스팅이 완료되었습니다.",
            "output": result.stdout
        }

    except Exception as e:
        return {
            "status": "error",
            "message": f"서버 내부 오류: {str(e)}",
            "output": str(e)
        }


@router.get("/results", response_model=List[BacktestResultSummary])
def get_backtest_results():
    """백테스트 결과 목록"""
    if not os.path.exists(BACKTEST_RESULTS_DIR):
        return []
    
    results = []
    
    try:
        files = [f for f in os.listdir(BACKTEST_RESULTS_DIR) 
                 if f.endswith(".zip") and f.startswith("backtest-result")]
        files.sort(reverse=True)

        for filename in files:
            file_path = os.path.join(BACKTEST_RESULTS_DIR, filename)
            try:
                with zipfile.ZipFile(file_path, "r") as z:
                    json_files = [f for f in z.namelist() 
                                  if f.endswith(".json") and "_config" not in f]
                    if not json_files:
                        continue
                    
                    with z.open(json_files[0]) as f:
                        data = json.load(f)
                        stats = data.get("strategy_comparison", [])
                        if not stats:
                            continue
                        
                        main_stat = stats[0]
                        strategy_name = main_stat.get("key", "Unknown")
                        total_trades = main_stat.get("trades", 0)
                        profit_pct = main_stat.get("profit_total_pct", 0.0)
                        win_rate = main_stat.get("winrate", 0.0) * 100
                        
                        full_stats = data.get("strategy", {}).get(strategy_name, {})
                        
                        # MC 캐시 확인
                        mc_results = load_mc_results(strategy_name, filename)
                        
                        if mc_results is None:
                            trades = full_stats.get("trades", [])
                            if trades:
                                trades_profit_pct = [t.get("profit_ratio", 0) for t in trades]
                                mc_results = perform_monte_carlo(trades_profit_pct)
                                if mc_results:
                                    save_mc_results(strategy_name, filename, mc_results, len(trades))
                        
                        score = None
                        if full_stats:
                            score = calculate_score(full_stats, mc_results)
                        
                        summary = BacktestResultSummary(
                            filename=filename,
                            strategy=strategy_name,
                            run_id=data.get("run_id", "N/A"),
                            total_trades=total_trades,
                            total_profit_pct=round(float(profit_pct), 2),
                            win_rate=round(float(win_rate), 2),
                            score=score
                        )
                        results.append(summary)
                        
            except Exception as e:
                print(f"파일 읽기 실패({filename}): {e}")
                continue
                
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading results: {str(e)}")
    
    return results


@router.get("/results/{filename}")
def get_backtest_detail(filename: str):
    """백테스트 상세 결과"""
    file_path = os.path.join(BACKTEST_RESULTS_DIR, filename)
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Result file not found")
    
    try:
        with zipfile.ZipFile(file_path, "r") as z:
            json_files = [f for f in z.namelist() 
                         if f.endswith(".json") and "_config" not in f]
            
            if not json_files:
                raise HTTPException(status_code=404, detail="No valid result JSON found")
            
            with z.open(json_files[0]) as f:
                data = json.load(f)
                
                try:
                    strategy_dict = data.get("strategy", {})
                    
                    if strategy_dict:
                        strategy_name = list(strategy_dict.keys())[0]
                        full_stats = strategy_dict[strategy_name]
                        
                        # MC 캐시 확인
                        mc_results = load_mc_results(strategy_name, filename)
                        
                        if mc_results is None:
                            trades = full_stats.get("trades", [])
                            trades_profit_pct = [t.get("profit_ratio", 0) for t in trades]
                            print(f"[INFO] Computing MC for {strategy_name} ({len(trades)} trades)...")
                            mc_results = perform_monte_carlo(trades_profit_pct)
                            if mc_results:
                                save_mc_results(strategy_name, filename, mc_results, len(trades))
                        else:
                            print(f"[INFO] Using cached MC for {strategy_name}")
                        
                        score = calculate_score(full_stats, mc_results)
                        data["m_score"] = score
                    else:
                        data["m_score"] = None
                        
                except Exception as calc_error:
                    print(f"[ERROR] Score calculation failed: {calc_error}")
                    import traceback
                    traceback.print_exc()
                    data["m_score"] = None
                
                return data
                
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/mc/latest/{strategy_name}")
def get_latest_mc(strategy_name: str):
    """특정 전략의 최신 MC 결과 (모투/실투 연동용)"""
    mc_data = get_latest_mc_for_strategy(strategy_name)
    
    if mc_data is None:
        raise HTTPException(
            status_code=404, 
            detail=f"No MC results found for strategy: {strategy_name}"
        )
    
    return mc_data