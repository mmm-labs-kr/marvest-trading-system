from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import sqlite3
import subprocess
import os
import json
import uuid
import zipfile
import numpy as np
import pandas as pd
from typing import List, Optional, Dict
from app.core.config import USER_DATA_DIR, BOTS_FILE, DB_DIR, BACKTEST_RESULTS_DIR, MC_RESULTS_DIR, LOGS_DIR, PAPER_CONFIGS_DIR, STRATEGIES_DIR

router = APIRouter()

# 실행 중인 봇 프로세스 관리
running_processes: Dict[str, subprocess.Popen] = {}

# --- [Helper Functions] ---

def load_bots_data():
    if not os.path.exists(BOTS_FILE):
        return {}
    with open(BOTS_FILE, "r", encoding="utf-8") as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return {}

def save_bots_data(data):
    with open(BOTS_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4, ensure_ascii=False)

def get_bot_paths(bot_id: str, strategy_name: str, mode: str):
    if not os.path.exists(DB_DIR):
        os.makedirs(DB_DIR)

    db_path = os.path.join(DB_DIR, f"tradesv3_{bot_id}.sqlite")
    log_path = os.path.join(LOGS_DIR, f"{mode}_{bot_id}.log")
    
    # paper_configs 폴더 확인
    if not os.path.exists(PAPER_CONFIGS_DIR):
        os.makedirs(PAPER_CONFIGS_DIR)

    strategy_config = os.path.join(PAPER_CONFIGS_DIR, f"config_{mode}_{strategy_name}.json")
    
    # 만약 config_paper_MyStrategy.json 처럼 기존 형식이 있으면 그걸 사용 (하위 호환)
    legacy_config = os.path.join(PAPER_CONFIGS_DIR, f"config_{mode}_{strategy_name}.json")
    if not os.path.exists(strategy_config) and os.path.exists(legacy_config):
        strategy_config = legacy_config

    return db_path, log_path, strategy_config
        config_path = strategy_config
    else:
        if mode == 'live':
            config_path = os.path.join(USER_DATA_DIR, "config_live.json")
        else:
            config_path = os.path.join(USER_DATA_DIR, "config.json")
         
    return db_path, log_path, config_path


def get_latest_mc_for_strategy(strategy_name: str) -> dict:
    """특정 전략의 가장 최신 MC 결과 가져오기"""
    if not os.path.exists(MC_RESULTS_DIR):
        return None
    
    matching_files = [
        f for f in os.listdir(MC_RESULTS_DIR) 
        if f.startswith(f"{strategy_name}_") and f.endswith(".json")
    ]
    
    if not matching_files:
        return None
    
    matching_files.sort(reverse=True)
    latest_file = matching_files[0]
    
    with open(os.path.join(MC_RESULTS_DIR, latest_file), "r", encoding="utf-8") as f:
        return json.load(f)


def get_equity_curve_from_db(db_path: str, starting_balance: float = 10000) -> list:
    """DB에서 누적 수익 곡선 계산"""
    if not os.path.exists(db_path):
        return []
    
    try:
        conn = sqlite3.connect(db_path)
        df = pd.read_sql_query("""
            SELECT close_date, close_profit, close_profit_abs
            FROM trades 
            WHERE is_open = 0 
            ORDER BY close_date ASC
        """, conn)
        conn.close()
        
        if df.empty:
            return []
        
        df['cumulative'] = df['close_profit_abs'].cumsum()
        
        return [
            {
                "trade_num": i + 1,
                "timestamp": str(row['close_date']),
                "equity": round(starting_balance + row['cumulative'], 2),
                "profit_pct": round(row['close_profit'] * 100, 2)
            }
            for i, row in df.iterrows()
        ]
    except Exception as e:
        print(f"[ERROR] get_equity_curve_from_db: {e}")
        return []


def calculate_rolling_mdd(equity_curve: list, window: int = 30) -> float:
    """최근 N개 거래의 MDD 계산"""
    if not equity_curve or len(equity_curve) < 2:
        return 0
    
    recent = equity_curve[-window:] if len(equity_curve) > window else equity_curve
    equities = np.array([e['equity'] for e in recent])
    
    peak = np.maximum.accumulate(equities)
    drawdown = (equities - peak) / peak
    
    return round(float(np.min(drawdown)) * 100, 2)


def check_confidence_breach(equity_curve: list, mc_baseline: dict) -> dict:
    """현재 자산이 95% 신뢰구간을 이탈했는지 확인"""
    if not equity_curve or not mc_baseline:
        return None
    
    mc_data = mc_baseline.get("mc_data", mc_baseline)
    chart_data = mc_data.get("chart_data", [])
    
    if not chart_data:
        return None
    
    current_trade_num = len(equity_curve)
    current_equity = equity_curve[-1]['equity'] if equity_curve else 10000
    
    if current_trade_num <= len(chart_data):
        baseline = chart_data[current_trade_num - 1]
        upper = baseline.get("upper", 999999)
        lower = baseline.get("lower", 0)
        median = baseline.get("median", 10000)
        
        is_below = current_equity < lower
        is_above = current_equity > upper
        
        return {
            "trade_num": current_trade_num,
            "current_equity": current_equity,
            "upper_95": upper,
            "lower_95": lower,
            "median": median,
            "is_breach": is_below or is_above,
            "breach_type": "below" if is_below else ("above" if is_above else None)
        }
    
    return {
        "trade_num": current_trade_num,
        "current_equity": current_equity,
        "upper_95": None,
        "lower_95": None,
        "median": None,
        "is_breach": False,
        "breach_type": None,
        "note": "Beyond MC simulation range"
    }


# --- [Pydantic Models] ---

class BotCreateRequest(BaseModel):
    name: str          
    strategy: str      
    pair: str          
    mode: str = "paper"
    backtest_file: Optional[str] = None  # ★ 추가: 백테스트 연결

class BotControlRequest(BaseModel):
    bot_id: str

class BotResponse(BaseModel):
    id: str
    name: str
    strategy: str
    pair: str
    mode: str
    status: str
    pid: Optional[int] = None
    backtest_file: Optional[str] = None  # ★ 추가


# --- [API 1: 봇 관리 (CRUD)] ---

@router.get("/bots", response_model=List[BotResponse])
def list_bots():
    """저장된 모든 봇 목록 반환"""
    bots = load_bots_data()
    result = []
    
    for bot_id, bot_info in bots.items():
        proc = running_processes.get(bot_id)
        is_alive = proc is not None and proc.poll() is None
        
        result.append({
            "id": bot_id,
            "name": bot_info.get("name"),
            "strategy": bot_info.get("strategy"),
            "pair": bot_info.get("pair"),
            "mode": bot_info.get("mode", "paper"),
            "status": "RUNNING" if is_alive else "STOPPED",
            "pid": proc.pid if is_alive else None,
            "backtest_file": bot_info.get("backtest_file")  # ★ 추가
        })
    return result


@router.post("/bots")
def create_bot(req: BotCreateRequest):
    """새로운 봇 생성"""
    bots = load_bots_data()
    bot_id = str(uuid.uuid4())[:8]
    
    # MC 기준값 로드 (백테스트 결과에서)
    mc_baseline = None
    if req.backtest_file:
        mc_baseline = get_latest_mc_for_strategy(req.strategy)
    
    new_bot = {
        "id": bot_id,
        "name": req.name,
        "strategy": req.strategy,
        "pair": req.pair,
        "mode": req.mode,
        "backtest_file": req.backtest_file,  # ★ 저장
        "mc_baseline": mc_baseline,           # ★ MC 기준값 저장
        "created_at": str(pd.Timestamp.now())
    }
    
    bots[bot_id] = new_bot
    save_bots_data(bots)
    
    return {"message": "Bot created successfully", "bot_id": bot_id}


@router.delete("/bots/{bot_id}")
def delete_bot(bot_id: str):
    """봇 삭제"""
    if bot_id in running_processes:
        stop_bot(BotControlRequest(bot_id=bot_id))
        
    bots = load_bots_data()
    if bot_id in bots:
        del bots[bot_id]
        save_bots_data(bots)
        return {"message": "Bot deleted"}
    raise HTTPException(status_code=404, detail="Bot not found")


# --- [API 2: 봇 제어 (Start/Stop)] ---

@router.post("/start")
def start_bot(req: BotControlRequest):
    """봇 실행"""
    global running_processes
    bots = load_bots_data()
    
    if req.bot_id not in bots:
        raise HTTPException(status_code=404, detail="Bot ID not found")
        
    bot_info = bots[req.bot_id]
    mode = bot_info.get("mode", "paper")
    
    if req.bot_id in running_processes and running_processes[req.bot_id].poll() is None:
        return {"message": "Bot is already running"}

    try:
        db_path, log_path, config_path = get_bot_paths(req.bot_id, bot_info['strategy'], mode)
        
        if not os.path.exists(config_path):
             raise Exception(f"Config file not found: {config_path}")

        command = [
            "freqtrade", "trade", 
            "--strategy", bot_info['strategy'], 
            "--config", config_path,
            "--userdir", USER_DATA_DIR,
            "--db-url", f"sqlite:///{db_path}",
            "--logfile", log_path
        ]
        
        if mode == "paper":
            command.append("--dry-run")
        
        proc = subprocess.Popen(
            command, 
            shell=True,
            cwd=os.path.join(os.getcwd(), ".."),
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )
        
        running_processes[req.bot_id] = proc
        return {"message": f"[{mode.upper()}] Bot {bot_info['name']} started", "pid": proc.pid}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/stop")
def stop_bot(req: BotControlRequest):
    """봇 중지"""
    global running_processes
    
    proc = running_processes.get(req.bot_id)
    
    if proc:
        try:
            subprocess.run(["taskkill", "/F", "/T", "/PID", str(proc.pid)], 
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            del running_processes[req.bot_id]
            return {"message": "Bot stopped"}
        except Exception as e:
            return {"message": f"Error stopping bot: {e}"}
    
    return {"message": "Bot is not running"}


# --- [API 3: 모니터링 (Status/Logs)] ---

@router.get("/status")
def get_bot_status(bot_id: str):
    """현황 조회"""
    bots = load_bots_data()
    if bot_id not in bots:
        raise HTTPException(status_code=404, detail="Bot not found")
        
    bot_info = bots[bot_id]
    strategy_name = bot_info['strategy']
    mode = bot_info.get('mode', 'paper')
    
    proc = running_processes.get(bot_id)
    is_running = proc is not None and proc.poll() is None
    status_str = "RUNNING" if is_running else "STOPPED"
    
    db_path, _, _ = get_bot_paths(bot_id, strategy_name, mode)
    
    if not os.path.exists(db_path):
        return {
            "status": status_str,
            "name": bot_info['name'],
            "total_roi": 0.0, 
            "total_trade_count": 0, 
            "win_count": 0, 
            "loss_count": 0, 
            "active_trade_count": 0
        }

    try:
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT 
                COUNT(*) as total_count,
                SUM(CASE WHEN close_profit > 0 THEN 1 ELSE 0 END) as wins,
                SUM(CASE WHEN close_profit <= 0 THEN 1 ELSE 0 END) as losses,
                SUM(close_profit) as total_profit
            FROM trades WHERE is_open = 0
        """)
        stats = cursor.fetchone()
        
        cursor.execute("SELECT COUNT(*) as active FROM trades WHERE is_open = 1")
        active = cursor.fetchone()
        conn.close()

        total_profit = stats['total_profit'] if stats['total_profit'] else 0.0
        
        return {
            "status": status_str,
            "name": bot_info['name'],
            "strategy": strategy_name,
            "mode": mode,
            "total_roi": round(total_profit * 100, 2),
            "total_trade_count": stats['total_count'] if stats['total_count'] else 0,
            "win_count": stats['wins'] if stats['wins'] else 0,
            "loss_count": stats['losses'] if stats['losses'] else 0,
            "active_trade_count": active['active'],
            "pid": proc.pid if is_running else None
        }
    except Exception:
        return {
            "status": status_str,
            "name": bot_info['name'],
            "total_roi": 0.0, 
            "total_trade_count": 0, 
            "win_count": 0, 
            "loss_count": 0, 
            "active_trade_count": 0
        }


@router.get("/trades")
def get_trade_logs(bot_id: str):
    """거래 기록 조회"""
    bots = load_bots_data()
    if bot_id not in bots:
        return []
        
    db_path, _, _ = get_bot_paths(bot_id, bots[bot_id]['strategy'], bots[bot_id].get('mode', 'paper'))
    
    if not os.path.exists(db_path):
        return []

    try:
        conn = sqlite3.connect(db_path)
        df = pd.read_sql_query("""
            SELECT id, pair, is_open, open_date, close_date, 
                   open_rate, close_rate, amount, close_profit, close_profit_abs, strategy
            FROM trades WHERE is_open = 0 ORDER BY close_date ASC
        """, conn)
        conn.close()
        
        if df.empty:
            return []

        df['accumulated_profit'] = df['close_profit_abs'].cumsum()
        df = df.sort_values(by='close_date', ascending=False).head(50)

        result = []
        for _, row in df.iterrows():
            result.append({
                "id": row['id'],
                "timestamp": str(row['close_date']),
                "pair": row['pair'].replace("/USDT", ""),
                "is_win": row['close_profit'] >= 0,
                "profit_percent": round(row['close_profit'] * 100, 2),
                "profit_abs": round(row['close_profit_abs'], 4),
                "accumulated_profit": round(row['accumulated_profit'], 2),
            })
        return result
    except Exception:
        return []


# --- [★ NEW API 4: 백테스트 옵션 및 분석] ---

@router.get("/backtest-options")
def get_backtest_options():
    """봇 생성 시 선택할 수 있는 백테스트 결과 목록"""
    if not os.path.exists(BACKTEST_RESULTS_DIR):
        return []
    
    options = []
    for filename in os.listdir(BACKTEST_RESULTS_DIR):
        if filename.endswith(".zip") and filename.startswith("backtest-result"):
            try:
                file_path = os.path.join(BACKTEST_RESULTS_DIR, filename)
                with zipfile.ZipFile(file_path, "r") as z:
                    json_files = [f for f in z.namelist() if f.endswith(".json") and "_config" not in f]
                    if json_files:
                        with z.open(json_files[0]) as f:
                            data = json.load(f)
                            strategy_dict = data.get("strategy", {})
                            strategy_name = list(strategy_dict.keys())[0] if strategy_dict else "Unknown"
                            
                            # 요약 정보
                            stats = data.get("strategy_comparison", [{}])[0]
                            
                            options.append({
                                "filename": filename,
                                "strategy": strategy_name,
                                "date": filename.replace("backtest-result-", "").replace(".zip", ""),
                                "trades": stats.get("trades", 0),
                                "profit_pct": round(stats.get("profit_total_pct", 0), 2),
                                "has_mc": os.path.exists(os.path.join(
                                    MC_RESULTS_DIR, 
                                    f"{strategy_name}_{filename.replace('backtest-result-', '').replace('.zip', '')}.json"
                                ))
                            })
            except Exception as e:
                print(f"[WARN] Failed to read {filename}: {e}")
                continue
    
    return sorted(options, key=lambda x: x["date"], reverse=True)


@router.get("/analysis/{bot_id}")
def get_bot_analysis(bot_id: str):
    """봇의 실시간 분석 데이터 (MC 비교 포함)"""
    bots = load_bots_data()
    if bot_id not in bots:
        raise HTTPException(status_code=404, detail="Bot not found")
    
    bot_info = bots[bot_id]
    mode = bot_info.get("mode", "paper")
    strategy = bot_info.get("strategy")
    
    # 저장된 MC 기준값 또는 최신 MC 로드
    mc_baseline = bot_info.get("mc_baseline")
    if not mc_baseline:
        mc_baseline = get_latest_mc_for_strategy(strategy)
    
    # DB에서 현재 equity curve 로드
    db_path, _, _ = get_bot_paths(bot_id, strategy, mode)
    equity_curve = get_equity_curve_from_db(db_path)
    
    # 분석 결과
    analysis = {
        "confidence_breach": None,
        "mdd_breach": None,
        "rolling_mdd_30d": None,
        "status": "NORMAL"
    }
    
    if mc_baseline:
        mc_data = mc_baseline.get("mc_data", mc_baseline)
        
        # 모의투자: 신뢰구간 이탈 체크
        if mode == "paper":
            analysis["confidence_breach"] = check_confidence_breach(equity_curve, mc_baseline)
            if analysis["confidence_breach"] and analysis["confidence_breach"].get("is_breach"):
                analysis["status"] = "WARNING" if analysis["confidence_breach"]["breach_type"] == "above" else "DANGER"
        
        # 실전투자: Rolling MDD 체크
        if mode == "live":
            rolling_mdd = calculate_rolling_mdd(equity_curve, window=30)
            analysis["rolling_mdd_30d"] = rolling_mdd
            
            # 백테스트 상위 5% MDD와 비교
            worst_5pct_mdd = mc_data.get("stats", {}).get("worst_mdd", -100)
            analysis["mdd_breach"] = {
                "current_mdd": rolling_mdd,
                "threshold": worst_5pct_mdd,
                "is_breach": rolling_mdd < worst_5pct_mdd  # MDD는 음수이므로
            }
            
            if analysis["mdd_breach"]["is_breach"]:
                analysis["status"] = "DANGER"
    
    return {
        "bot_id": bot_id,
        "bot_name": bot_info.get("name"),
        "strategy": strategy,
        "mode": mode,
        "has_mc_baseline": mc_baseline is not None,
        "backtest_file": bot_info.get("backtest_file"),
        "equity_curve": equity_curve,
        "mc_baseline": mc_baseline,
        "analysis": analysis
    }













# ============================================
# ★ TEST API (개발용 - 배포 시 제거)
# ============================================

@router.post("/test/add-fake-trade")
def add_fake_trade(bot_id: str, profit_pct: float = 0.02):
    """테스트용: 가짜 거래 1개 삽입"""
    from datetime import datetime, timedelta
    
    bots = load_bots_data()
    if bot_id not in bots:
        raise HTTPException(status_code=404, detail="Bot not found")
    
    bot_info = bots[bot_id]
    db_path, _, _ = get_bot_paths(bot_id, bot_info['strategy'], bot_info.get('mode', 'paper'))
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # 테이블 생성
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS trades (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pair TEXT,
            is_open INTEGER DEFAULT 0,
            open_date TEXT,
            close_date TEXT,
            open_rate REAL,
            close_rate REAL,
            amount REAL,
            close_profit REAL,
            close_profit_abs REAL,
            strategy TEXT
        )
    """)
    
    # 마지막 거래 시간
    cursor.execute("SELECT MAX(close_date) FROM trades WHERE is_open = 0")
    last_date = cursor.fetchone()[0]
    new_date = datetime.fromisoformat(last_date) + timedelta(hours=1) if last_date else datetime.now()
    
    # 거래 데이터
    open_rate = 50000.0
    close_rate = open_rate * (1 + profit_pct)
    amount = 0.1
    profit_abs = (close_rate - open_rate) * amount
    
    cursor.execute("""
        INSERT INTO trades (pair, is_open, open_date, close_date, open_rate, close_rate, amount, close_profit, close_profit_abs, strategy)
        VALUES (?, 0, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        bot_info['pair'],
        (new_date - timedelta(minutes=30)).isoformat(),
        new_date.isoformat(),
        open_rate, close_rate, amount, profit_pct, profit_abs,
        bot_info['strategy']
    ))
    
    conn.commit()
    cursor.execute("SELECT COUNT(*) FROM trades WHERE is_open = 0")
    total = cursor.fetchone()[0]
    conn.close()
    
    return {"message": "Trade added", "profit": f"{profit_pct*100:.2f}%", "total_trades": total}


@router.post("/test/add-random-trades")
def add_random_trades(bot_id: str, count: int = 10):
    """테스트용: 랜덤 거래 여러 개 삽입"""
    import random
    for _ in range(count):
        profit_pct = random.uniform(-0.05, 0.05)
        add_fake_trade(bot_id, profit_pct)
    return {"message": f"{count} trades added", "bot_id": bot_id}


@router.delete("/test/clear-trades")
def clear_trades(bot_id: str):
    """테스트용: 거래 기록 전체 삭제"""
    bots = load_bots_data()
    if bot_id not in bots:
        raise HTTPException(status_code=404, detail="Bot not found")
    
    bot_info = bots[bot_id]
    db_path, _, _ = get_bot_paths(bot_id, bot_info['strategy'], bot_info.get('mode', 'paper'))
    
    if os.path.exists(db_path):
        conn = sqlite3.connect(db_path)
        conn.execute("DELETE FROM trades")
        conn.commit()
        conn.close()
    
    return {"message": "Trades cleared"}