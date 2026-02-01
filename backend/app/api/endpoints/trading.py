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
from datetime import datetime, timedelta

# ★ [점수 계산기 임포트]
from .score_calculator import calculate_score

router = APIRouter()

# --- [경로 설정] ---
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))
USER_DATA_DIR = os.path.join(BASE_DIR, "user_data")
BOTS_FILE = os.path.join(USER_DATA_DIR, "bots.json")
DB_DIR = os.path.join(USER_DATA_DIR, "databases")
BACKTEST_RESULTS_DIR = os.path.join(USER_DATA_DIR, "backtest_results")
MC_RESULTS_DIR = os.path.join(USER_DATA_DIR, "mc_results")

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
    log_path = os.path.join(USER_DATA_DIR, "logs", f"{mode}_{bot_id}.log")
    
    strategy_config = os.path.join(USER_DATA_DIR, "paper_configs", f"config_{mode}_{strategy_name}.json")
    
    if os.path.exists(strategy_config):
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
                "trade_num": int(i + 1), # int 변환
                "timestamp": str(row['close_date']),
                "equity": float(round(starting_balance + row['cumulative'], 2)), # float 변환
                "profit_pct": float(round(row['close_profit'] * 100, 2)) # float 변환
            }
            for i, row in df.iterrows()
        ]
    except Exception as e:
        print(f"[ERROR] get_equity_curve_from_db: {e}")
        return []


def calculate_rolling_mdd(equity_curve: list, window: int = 30) -> float:
    """최근 N개 거래의 MDD 계산"""
    if not equity_curve or len(equity_curve) < 2:
        return 0.0
    
    recent = equity_curve[-window:] if len(equity_curve) > window else equity_curve
    equities = np.array([e['equity'] for e in recent])
    
    peak = np.maximum.accumulate(equities)
    drawdown = (equities - peak) / peak
    
    # ★ [Fix] Numpy 타입을 Python float로 변환
    return float(round(np.min(drawdown) * 100, 2))


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
        
        # ★ [Fix] Numpy bool 타입을 Python bool로 변환
        is_below = bool(current_equity < lower)
        is_above = bool(current_equity > upper)
        is_breach = bool(is_below or is_above)
        
        return {
            "trade_num": int(current_trade_num),
            "current_equity": float(current_equity),
            "upper_95": float(upper),
            "lower_95": float(lower),
            "median": float(median),
            "is_breach": is_breach,
            "breach_type": "below" if is_below else ("above" if is_above else None)
        }
    
    return {
        "trade_num": int(current_trade_num),
        "current_equity": float(current_equity),
        "upper_95": None,
        "lower_95": None,
        "median": None,
        "is_breach": False,
        "breach_type": None,
        "note": "Beyond MC simulation range"
    }

# ★ [수정] 실시간 DB 통계 계산 함수 (Numpy 타입 변환 및 0 나누기 방지)
def get_realtime_stats_from_db(db_path: str, initial_balance: float = 10000.0) -> Optional[dict]:
    if not os.path.exists(db_path):
        return None

    try:
        conn = sqlite3.connect(db_path)
        df = pd.read_sql_query("""
            SELECT close_date, open_date, close_profit, close_profit_abs
            FROM trades 
            WHERE is_open = 0 
            ORDER BY close_date ASC
        """, conn)
        conn.close()

        if df.empty:
            return None

        # 1. 기초 통계
        total_trades = int(len(df))
        profit_mean = float(df['close_profit'].mean())

        # 2. Equity & MDD 계산
        df['cumulative_profit'] = df['close_profit_abs'].cumsum()
        df['current_balance'] = initial_balance + df['cumulative_profit']
        df['peak_balance'] = df['current_balance'].cummax()
        df['drawdown'] = (df['current_balance'] - df['peak_balance']) / df['peak_balance']
        
        # ★ [Fix] Numpy float -> Python float
        max_drawdown = float(df['drawdown'].min())
        if pd.isna(max_drawdown): max_drawdown = 0.0

        # 3. Recovery Period (간이)
        drawdown_duration_s = 0.0
        
        # 4. 평균 보유 시간
        df['close_date'] = pd.to_datetime(df['close_date'])
        df['open_date'] = pd.to_datetime(df['open_date'])
        holding_seconds = (df['close_date'] - df['open_date']).dt.total_seconds()
        holding_avg_s = float(holding_seconds.mean())

        # 5. CAGR
        total_seconds = (df['close_date'].max() - df['open_date'].min()).total_seconds()
        days = max(total_seconds / 86400, 1)
        total_profit_ratio = float((df['current_balance'].iloc[-1] - initial_balance) / initial_balance)
        
        try:
            cagr = float((1 + total_profit_ratio) ** (365 / days) - 1)
        except:
            cagr = 0.0

        # ★ [Fix] 0으로 나누기 방지
        if max_drawdown == 0:
            calmar = 0.0 if total_profit_ratio <= 0 else 100.0
        else:
            calmar = float(abs(cagr / max_drawdown))

        # 7. Sortino Ratio
        downside = df[df['close_profit'] < 0]['close_profit']
        downside_std = float(downside.std())
        
        if pd.isna(downside_std) or downside_std == 0:
            sortino = 0.0 if total_profit_ratio <= 0 else 100.0
        else:
            sortino = float((profit_mean / downside_std) * np.sqrt(total_trades))

        return {
            "max_drawdown_account": abs(max_drawdown), 
            "drawdown_duration_s": drawdown_duration_s,
            "holding_avg_s": holding_avg_s,
            "calmar": calmar,
            "sortino": sortino,
            "total_trades": total_trades,
            "profit_mean": profit_mean, 
        }

    except Exception as e:
        print(f"[ERROR] Stats calc failed: {e}")
        return None


# --- [Pydantic Models] ---

class BotCreateRequest(BaseModel):
    name: str          
    strategy: str      
    pair: str          
    mode: str = "paper"
    backtest_file: Optional[str] = None

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
    backtest_file: Optional[str] = None


# --- [API Endpoints] ---

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
            "backtest_file": bot_info.get("backtest_file")
        })
    return result


@router.post("/bots")
def create_bot(req: BotCreateRequest):
    """새로운 봇 생성"""
    bots = load_bots_data()
    bot_id = str(uuid.uuid4())[:8]
    
    mc_baseline = None
    if req.backtest_file:
        mc_baseline = get_latest_mc_for_strategy(req.strategy)
    
    new_bot = {
        "id": bot_id,
        "name": req.name,
        "strategy": req.strategy,
        "pair": req.pair,
        "mode": req.mode,
        "backtest_file": req.backtest_file,
        "mc_baseline": mc_baseline,
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

# backend/app/api/endpoints/trading.py

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

        # Freqtrade 명령어
        command = [
            "freqtrade", "trade", 
            "--strategy", bot_info['strategy'], 
            "--config", config_path,
            "--userdir", USER_DATA_DIR,
            "--db-url", f"sqlite:///{db_path}",
            # "--logfile", log_path  <-- 이 옵션은 Freqtrade 내부 로그용 (지우거나 둬도 됨)
        ]
        
        if mode == "paper":
            command.append("--dry-run")
        
        # ★ [수정] 로그 파일 열기 (Append 모드)
        # 이제 터미널 출력(stdout)과 에러(stderr)가 이 파일에 기록됩니다.
        log_file = open(log_path, "a", encoding="utf-8")

        proc = subprocess.Popen(
            command, 
            shell=True,
            cwd=os.path.join(BASE_DIR), # freqtrade 실행 위치 주의 (user_data 상위 폴더여야 함)
            stdout=log_file,  # ★ 표준 출력을 파일로
            stderr=log_file   # ★ 에러 출력을 파일로 (이게 중요!)
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
                "id": int(row['id']),
                "timestamp": str(row['close_date']),
                "pair": row['pair'].replace("/USDT", ""),
                "is_win": bool(row['close_profit'] >= 0),
                "profit_percent": float(round(row['close_profit'] * 100, 2)),
                "profit_abs": float(round(row['close_profit_abs'], 4)),
                "accumulated_profit": float(round(row['accumulated_profit'], 2)),
            })
        return result
    except Exception:
        return []


@router.get("/backtest-options")
def get_backtest_options():
    """백테스트 결과 목록"""
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
            except Exception:
                continue
    
    return sorted(options, key=lambda x: x["date"], reverse=True)


@router.get("/analysis/{bot_id}")
def get_bot_analysis(bot_id: str):
    """봇 분석 데이터 (MC 비교 포함)"""
    bots = load_bots_data()
    if bot_id not in bots:
        raise HTTPException(status_code=404, detail="Bot not found")
    
    bot_info = bots[bot_id]
    mode = bot_info.get("mode", "paper")
    strategy = bot_info.get("strategy")
    
    mc_baseline = bot_info.get("mc_baseline")
    if not mc_baseline:
        mc_baseline = get_latest_mc_for_strategy(strategy)
    
    db_path, _, _ = get_bot_paths(bot_id, strategy, mode)
    equity_curve = get_equity_curve_from_db(db_path)
    
    analysis = {
        "confidence_breach": None,
        "mdd_breach": None,
        "rolling_mdd_30d": None,
        "status": "NORMAL"
    }
    
    if mc_baseline:
        mc_data = mc_baseline.get("mc_data", mc_baseline)
        
        if mode == "paper":
            analysis["confidence_breach"] = check_confidence_breach(equity_curve, mc_baseline)
            if analysis["confidence_breach"] and analysis["confidence_breach"].get("is_breach"):
                analysis["status"] = "WARNING" if analysis["confidence_breach"]["breach_type"] == "above" else "DANGER"
        
        if mode == "live":
            rolling_mdd = calculate_rolling_mdd(equity_curve, window=30)
            analysis["rolling_mdd_30d"] = float(rolling_mdd)
            
            worst_5pct_mdd = float(mc_data.get("stats", {}).get("worst_mdd", -100))
            analysis["mdd_breach"] = {
                "current_mdd": rolling_mdd,
                "threshold": worst_5pct_mdd,
                "is_breach": bool(rolling_mdd < worst_5pct_mdd)
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


@router.get("/score/{bot_id}")
def get_bot_score(bot_id: str):
    """Marvest Score 계산"""
    bots = load_bots_data()
    if bot_id not in bots:
        raise HTTPException(status_code=404, detail="Bot not found")
    
    bot_info = bots[bot_id]
    db_path, _, _ = get_bot_paths(bot_id, bot_info['strategy'], bot_info.get('mode', 'paper'))
    
    stats = get_realtime_stats_from_db(db_path)
    
    if not stats:
        return {
            "bot_id": bot_id,
            "score": None,
            "message": "No closed trades yet or DB not found"
        }
    
    mc_results = bot_info.get("mc_baseline")
    if not mc_results:
        mc_results = get_latest_mc_for_strategy(bot_info['strategy'])

    try:
        mc_data_for_calc = mc_results.get("mc_data", mc_results) if mc_results else None
        score_data = calculate_score(stats, mc_data_for_calc)
        return {
            "bot_id": bot_id,
            "score": score_data
        }
    except Exception as e:
        print(f"[ERROR] Score calculation error: {e}")
        return {
            "bot_id": bot_id,
            "score": None,
            "error": str(e)
        }


# --- [테스트용: 가짜 거래 추가] ---

@router.post("/test/add-fake-trade")
def add_fake_trade(bot_id: str, profit_pct: float = 0.02):
    """가짜 거래 1개 삽입 (스키마 완벽 대응)"""
    from datetime import datetime, timedelta
    
    bots = load_bots_data()
    if bot_id not in bots:
        raise HTTPException(status_code=404, detail="Bot not found")
    
    bot_info = bots[bot_id]
    db_path, _, _ = get_bot_paths(bot_id, bot_info['strategy'], bot_info.get('mode', 'paper'))
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS trades (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            exchange TEXT DEFAULT 'binance',
            pair TEXT,
            is_open INTEGER DEFAULT 0,
            open_date TEXT,
            close_date TEXT,
            open_rate REAL,
            close_rate REAL,
            amount REAL,
            close_profit REAL,
            close_profit_abs REAL,
            strategy TEXT,
            stake_amount REAL DEFAULT 0,
            is_short INTEGER DEFAULT 0,
            leverage REAL DEFAULT 1,
            fee_open REAL DEFAULT 0,
            fee_close REAL DEFAULT 0,
            fee_open_cost REAL DEFAULT 0,
            fee_close_cost REAL DEFAULT 0,
            fee_open_currency TEXT DEFAULT 'USDT',
            fee_close_currency TEXT DEFAULT 'USDT',
            orders TEXT,
            amend_orders TEXT,
            interest_rate REAL DEFAULT 0,
            funding_fees REAL DEFAULT 0,
            trading_mode TEXT DEFAULT 'spot',
            amount_requested REAL DEFAULT 0,
            is_stop_loss_trailing INTEGER DEFAULT 0,
            max_rate REAL DEFAULT 0,
            min_rate REAL DEFAULT 0,
            exit_reason TEXT DEFAULT '',
            exit_order_status TEXT DEFAULT 'closed',
            record_version TEXT DEFAULT '1.0'
        )
    """)
    
    try:
        cursor.execute("SELECT MAX(close_date) FROM trades WHERE is_open = 0")
        row = cursor.fetchone()
        last_date = row[0] if row else None
    except:
        last_date = None

    new_date = datetime.fromisoformat(last_date) + timedelta(hours=1) if last_date else datetime.now()
    
    open_rate = 50000.0
    close_rate = open_rate * (1 + profit_pct)
    amount = 0.1
    profit_abs = (close_rate - open_rate) * amount
    
    try:
        cursor.execute("""
            INSERT INTO trades (
                exchange, pair, is_open, open_date, close_date, 
                open_rate, close_rate, amount, close_profit, close_profit_abs, 
                strategy, stake_amount, is_short, leverage,
                fee_open, fee_close, fee_open_cost, fee_close_cost,
                fee_open_currency, fee_close_currency,
                is_stop_loss_trailing, max_rate, min_rate, exit_reason, exit_order_status,
                interest_rate, funding_fees, trading_mode, amount_requested,
                record_version
            )
            VALUES (?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1, 
                    0.0, 0.0, 0.0, 0.0, 'USDT', 'USDT',
                    0, ?, ?, 'roi', 'closed',
                    0.0, 0.0, 'spot', ?,
                    '1.0')
        """, (
            "binance",
            bot_info['pair'],
            (new_date - timedelta(minutes=30)).isoformat(),
            new_date.isoformat(),
            open_rate, 
            close_rate, 
            amount, 
            profit_pct, 
            profit_abs,
            bot_info['strategy'],
            5000.0,
            max(open_rate, close_rate), 
            min(open_rate, close_rate),
            amount
        ))
        
        conn.commit()
        
        cursor.execute("SELECT COUNT(*) FROM trades WHERE is_open = 0")
        total = cursor.fetchone()[0]
        conn.close()
        
        return {"message": "Trade added", "profit": f"{profit_pct*100:.2f}%", "total_trades": total}

    except Exception as e:
        conn.close()
        raise HTTPException(status_code=500, detail=f"Database Insert Error: {str(e)}")


@router.post("/test/add-random-trades")
def add_random_trades(bot_id: str, count: int = 10):
    """테스트용: 랜덤 거래 여러 개 삽입"""
    import random
    
    bots = load_bots_data()
    if bot_id not in bots:
        raise HTTPException(status_code=404, detail="Bot not found")

    results = []
    for i in range(count):
        if random.random() > 0.4:
            profit_pct = random.uniform(0.01, 0.10) 
        else:
            profit_pct = random.uniform(-0.05, -0.01) 
            
        try:
            res = add_fake_trade(bot_id, profit_pct)
            results.append(res)
        except Exception as e:
            print(f"Error adding random trade {i}: {e}")
            continue
            
    return {"message": f"{len(results)} trades added", "bot_id": bot_id}


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