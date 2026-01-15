import os
import subprocess
import sys
import json
import glob
import zipfile
from typing import List
from fastapi import APIRouter, BackgroundTasks, HTTPException
from app.schemas.backtest import BackTestRequest
from app.schemas.backtest import BacktestResultSummary
from .score_calculator import calculate_score

router = APIRouter()
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))
USER_DATA_DIR = os.path.join(BASE_DIR, "user_data")
BACKTEST_RESULTS_DIR = os.path.join(USER_DATA_DIR,"backtest_results")

@router.post("/run")
def run_backtest(req: BackTestRequest):
    strategy = req.strategy
    config_path = os.path.join(USER_DATA_DIR, "config.json") # 기본 설정 파일 경로
    
    # 설정 파일 확인
    if not os.path.exists(config_path):
        raise HTTPException(status_code=404, detail=f"Config file not found at {config_path}")

    # 명령어 구성
    cmd = [
        "freqtrade",
        "backtesting",
        "--config", config_path,
        "--strategy", strategy,
        "--userdir", USER_DATA_DIR,
        "--export", "trades" # 필요시 주석 해제
    ]

    try:
        # subprocess.run을 사용하여 실행이 끝날 때까지 기다립니다 (capture_output=True)
        # 이렇게 해야 프론트엔드 모달창에 로그를 띄울 수 있습니다.
        result = subprocess.run(
            cmd, 
            capture_output=True, 
            text=True, 
            encoding="utf-8" # 한글 로그 깨짐 방지
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
    
@router.get("/results",response_model = List[BacktestResultSummary])
def get_backtest_results():
    if not os.path.exists(BACKTEST_RESULTS_DIR):
        return []
    results = []

    try:
        #리스트 컴프리헨션 문장, 파이썬에서 리스트를 만드는 가장 간결하고 빠른 방법
        files = [f for f in os.listdir(BACKTEST_RESULTS_DIR) if f.endswith(".zip") and f.startswith("backtest-result")]
        files.sort(reverse=True)

        for filename in files:
            file_path = os.path.join(BACKTEST_RESULTS_DIR,filename)
            try:
                #압축파일 풀지 않고 내부 파일 읽기
                with zipfile.ZipFile(file_path,"r") as z:
                    json_files=[f for f in z.namelist() if f.endswith(".json") and"_config"not in f]
                    if not json_files:
                        continue
                    target_json = json_files[0]
                    with z.open(target_json) as f:
                        data = json.load(f)
                        stats = data.get("strategy_comparison",[])
                        if not stats:
                            continue
                        main_stat = stats[0]
                        strategy_name = main_stat.get("key","Unknown")
                        total_trades = main_stat.get("trades",0)
                        profit_pct = main_stat.get("profit_total_pct",0.0)
                        win_rate = main_stat.get("winrate",0.0)*100

                        full_stats = data.get("strategy",{}).get(strategy_name,{})

                        score = None
                        if full_stats:
                            score = calculate_score(full_stats)

                        summary = BacktestResultSummary(
                            filename = filename,
                            strategy = strategy_name,
                            run_id = data.get("run_id","N/A"),
                            total_trades = total_trades,
                            total_profit_pct = round(float(profit_pct),2),
                            win_rate = round(float(win_rate),2),
                            score = score
                        )
                        
                        results.append(summary)
                        
            except Exception as e:
                print("파일 읽기 실패({filename}): {e}")
                continue
    except Exception as e:
        raise HTTPException(status_code =500, detail=f"Error reading results: {str(e)}")
    return results

@router.get("/results/{filename}")
def get_backtest_detail(filename: str):
    file_path = os.path.join(BACKTEST_RESULTS_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code = 404, detail="Result file not found")
    try:
        with zipfile.ZipFile(file_path,"r") as z:
            all_files = z.namelist()
            json_files =[
                f for f in all_files if f.endswith(".json") and "_config" not in f
            ]
            if not json_files:
                raise HTTPException(status_code = 404, detail="No valid result JSON found in zip archive")
            target_json = json_files[0]
            with z.open(target_json) as f:
                data = json.load(f)
                # =======================================================
                # ★ [수정됨] 상세 데이터에 점수(Marvest Score) 추가하기
                # =======================================================
                try:
                    # 1. 전략 데이터 찾기 ('strategy' 키 안에 있음)
                    strategy_dict = data.get("strategy", {})
                    
                    if strategy_dict:
                        # 보통 파일 하나엔 전략 하나만 들어있으므로 첫 번째 키를 가져옴
                        strategy_name = list(strategy_dict.keys())[0]
                        full_stats = strategy_dict[strategy_name]
                        
                        # 2. 점수 계산기 돌리기
                        # (calculate_marvest_score가 import 되어 있어야 함)
                        score = calculate_score(full_stats)
                        
                        # 3. 원본 데이터에 'marvest_score'라는 이름으로 끼워넣기
                        data["m_score"] = score
                    else:
                        # 전략 데이터가 없는 경우 null 처리
                        data["m_score"] = None
                        
                except Exception as calc_error:
                    # 계산 중 에러가 나도 전체 데이터는 보여줘야 하므로 로그만 찍고 넘어감
                    print(f"[Warning] Score calculation failed for {filename}: {calc_error}")
                    data["m_score"] = None

                # 수정된 data 반환 (이제 프론트에서 data.marvest_score로 접근 가능!)
                return data
    except Exception as e:
        raise HTTPException(status_code = 500, detail=str(e))


