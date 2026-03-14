from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import sqlite3
import subprocess
import os
import json
import uuid
import zipfile
import signal
import numpy as np
import pandas as pd
import time
import ctypes
import threading
from typing import List, Optional, Dict, Any, Tuple
from app.core.config import USER_DATA_DIR, BOTS_FILE, DB_DIR, BACKTEST_RESULTS_DIR, MC_RESULTS_DIR, LOGS_DIR, PAPER_CONFIGS_DIR, STRATEGIES_DIR
from app.core.exceptions import BotNotFoundException, ConfigFileNotFoundException, InternalServerException, MarvestException
from .monte_carlo import get_latest_mc_for_strategy

router = APIRouter()

# 전역 락 설정 (bots.json 동시성 제어)
bots_file_lock = threading.Lock()

# 실행 중인 봇 프로세스 관리 (메모리 상 캐시)
# key: bot_id, value: subprocess.Popen
running_processes: Dict[str, subprocess.Popen] = {}

# --- [Helper Functions] ---

def is_process_running(pid: int) -> bool:
    """
    PID를 사용하여 프로세스가 실제로 실행 중인지 확인합니다. (OS 호환)

    Args:
        pid (int): 확인할 프로세스 ID

    Returns:
        bool: 프로세스가 살아있으면 True, 아니면 False
    """
    if pid is None:
        return False
    
    if os.name == 'nt': # Windows
        # Windows에서는 os.kill(pid, 0)이 지원되지 않으므로 kernel32 사용
        PROCESS_QUERY_LIMITED_INFORMATION = 0x1000
        handle = ctypes.windll.kernel32.OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, False, pid)
        if handle:
            exit_code = ctypes.c_ulong()
            ctypes.windll.kernel32.GetExitCodeProcess(handle, ctypes.byref(exit_code))
            ctypes.windll.kernel32.CloseHandle(handle)
            # STILL_ACTIVE = 259
            return exit_code.value == 259
        return False
    else: # Linux/Mac
        try:
            # signal 0은 프로세스가 존재하는지만 확인 (실제 신호 안 보냄)
            os.kill(pid, 0)
        except OSError:
            return False
        else:
            return True

def load_bots_data() -> Dict[str, Any]:
    """
    bots.json 파일에서 모든 봇 정보를 로드합니다.

    Returns:
        Dict[str, Any]: 봇 ID를 키로 하는 봇 정보 딕셔너리
    """
    if not os.path.exists(BOTS_FILE):
        return {}
    with open(BOTS_FILE, "r", encoding="utf-8") as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return {}

def save_bots_data(data: Dict[str, Any]) -> None:
    """
    봇 정보를 bots.json 파일에 저장합니다. (Atomic Write 적용)

    Args:
        data (Dict[str, Any]): 저장할 전체 봇 정보
    """
    temp_file = f"{BOTS_FILE}.tmp"
    try:
        with open(temp_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
        
        # Windows/Linux 모두 호환되는 파일 교체
        if os.path.exists(BOTS_FILE):
            os.replace(temp_file, BOTS_FILE)
        else:
            os.rename(temp_file, BOTS_FILE)
    except Exception as e:
        if os.path.exists(temp_file):
            os.remove(temp_file)
        raise e

def get_bot_paths(bot_id: str, strategy_name: str, mode: str) -> Tuple[str, str, str]:
    """
    봇 실행에 필요한 DB, 로그, 설정 파일 경로를 반환합니다.

    Args:
        bot_id (str): 봇 ID
        strategy_name (str): 전략 클래스 명
        mode (str): 실행 모드 ('paper' 또는 'live')

    Returns:
        Tuple[str, str, str]: (db_path, log_path, config_path)
    """
    if not os.path.exists(DB_DIR):
        os.makedirs(DB_DIR)

    db_path = os.path.join(DB_DIR, f"tradesv3_{bot_id}.sqlite")
    log_path = os.path.join(LOGS_DIR, f"{mode}_{bot_id}.log")
    
    if not os.path.exists(PAPER_CONFIGS_DIR):
        os.makedirs(PAPER_CONFIGS_DIR)

    strategy_config = os.path.join(PAPER_CONFIGS_DIR, f"config_{mode}_{strategy_name}.json")
    
    # 하위 호환성 체크
    if not os.path.exists(strategy_config):
        if mode == 'live':
            config_path = os.path.join(USER_DATA_DIR, "config_live.json")
        else:
            config_path = os.path.join(USER_DATA_DIR, "config.json")
    else:
        config_path = strategy_config
         
    return db_path, log_path, config_path


def get_equity_curve_from_db(db_path: str, starting_balance: float = 10000) -> List[Dict[str, Any]]:
    """
    SQLite DB에서 매매 기록을 읽어 자산 곡선(Equity Curve) 데이터를 생성합니다.

    Args:
        db_path (str): SQLite DB 파일 경로
        starting_balance (float): 시작 잔고. 기본값 10000.

    Returns:
        List[Dict[str, Any]]: 회차별 자산 및 수익률 정보 리스트
    """
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


def calculate_rolling_mdd(equity_curve: List[Dict[str, Any]], window: int = 30) -> float:
    """
    자산 곡선 데이터를 기반으로 최근 N회 거래의 최대 낙폭(MDD)을 계산합니다.

    Args:
        equity_curve (List[Dict[str, Any]]): 자산 곡선 데이터 리스트
        window (int): 계산할 윈도우 크기 (최근 거래 횟수). 기본값 30.

    Returns:
        float: 계산된 MDD 퍼센트 (음수)
    """
    if not equity_curve or len(equity_curve) < 2:
        return 0
    
    recent = equity_curve[-window:] if len(equity_curve) > window else equity_curve
    equities = np.array([e['equity'] for e in recent])
    
    peak = np.maximum.accumulate(equities)
    drawdown = (equities - peak) / peak
    
    return round(float(np.min(drawdown)) * 100, 2)


def check_confidence_breach(equity_curve: List[Dict[str, Any]], mc_baseline: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    현재 자산 곡선이 몬테카를로 신뢰 구간(95%)을 벗어났는지 확인합니다.

    Args:
        equity_curve (List[Dict[str, Any]]): 현재 봇의 자산 곡선 데이터
        mc_baseline (Dict[str, Any]): 비교 대상이 될 MC 시뮬레이션 결과

    Returns:
        Optional[Dict[str, Any]]: 침범 정보 (침범하지 않았거나 데이터 부족 시 상세 정보 포함)
    """
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


# --- [API 1: 봇 관리 (CRUD)] ---

@router.get("/bots", response_model=List[BotResponse])
def list_bots():
    """저장된 모든 봇 목록 반환 및 상태 동기화"""
    # 읽기 작업은 최신 데이터를 보장하기 위해 락을 사용할 수 있지만, 
    # 성능을 위해 락 없이 읽고 각 항목 처리 시 필요하면 확인
    bots = load_bots_data()
    result = []
    
    for bot_id, bot_info in bots.items():
        # 1. 메모리 상의 프로세스 확인
        proc = running_processes.get(bot_id)
        is_alive = proc is not None and proc.poll() is None
        
        # 2. 메모리에 없으면 bots.json의 PID로 OS 레벨 확인 (서버 재시작 대비)
        saved_pid = bot_info.get("pid")
        if not is_alive and saved_pid:
            is_alive = is_process_running(saved_pid)
        
        result.append({
            "id": bot_id,
            "name": bot_info.get("name"),
            "strategy": bot_info.get("strategy"),
            "pair": bot_info.get("pair"),
            "mode": bot_info.get("mode", "paper"),
            "status": "RUNNING" if is_alive else "STOPPED",
            "pid": saved_pid if is_alive else None,
            "backtest_file": bot_info.get("backtest_file")
        })
    return result


@router.post("/bots")
def create_bot(req: BotCreateRequest):
    with bots_file_lock:
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
            "pid": None, # 아직 시작 안 함
            "backtest_file": req.backtest_file,
            "mc_baseline": mc_baseline,
            "created_at": str(pd.Timestamp.now())
        }
        
        bots[bot_id] = new_bot
        save_bots_data(bots)
    
    return {"message": "Bot created successfully", "bot_id": bot_id}


@router.delete("/bots/{bot_id}")
def delete_bot(bot_id: str):
    with bots_file_lock:
        bots = load_bots_data()
        if bot_id not in bots:
            raise BotNotFoundException(bot_id)

        # 봇이 실행 중이면 먼저 정지 (락 안에서 처리)
        bot_info = bots[bot_id]
        saved_pid = bot_info.get("pid")
        if saved_pid and is_process_running(saved_pid):
            try:
                if os.name == 'nt':
                    subprocess.run(["taskkill", "/F", "/T", "/PID", str(saved_pid)], 
                                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                else:
                    os.kill(saved_pid, signal.SIGTERM)
            except:
                pass
            
        del bots[bot_id]
        save_bots_data(bots)
        
    return {"message": "Bot deleted"}


# --- [API 2: 봇 제어 (Start/Stop)] ---

@router.post("/start")
def start_bot(req: BotControlRequest):
    global running_processes
    
    with bots_file_lock:
        bots = load_bots_data()
        
        if req.bot_id not in bots:
            raise BotNotFoundException(req.bot_id)
            
        bot_info = bots[req.bot_id]
        mode = bot_info.get("mode", "paper")
        
        # 이미 실행 중인지 확인
        current_pid = bot_info.get("pid")
        if current_pid and is_process_running(current_pid):
            return {"message": "Bot is already running", "pid": current_pid}

        try:
            db_path, log_path, config_path = get_bot_paths(req.bot_id, bot_info['strategy'], mode)
            
            if not os.path.exists(config_path):
                 raise ConfigFileNotFoundException(config_path)

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
                cwd=os.path.dirname(USER_DATA_DIR), # 프로젝트 루트에서 실행
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if os.name == 'nt' else 0
            )
            
            # 메모리에 저장
            running_processes[req.bot_id] = proc
            
            # 파일(봇 정보)에 PID 업데이트
            bot_info["pid"] = proc.pid
            bots[req.bot_id] = bot_info
            save_bots_data(bots)
            
            return {"message": f"[{mode.upper()}] Bot {bot_info['name']} started", "pid": proc.pid}
            
        except MarvestException:
            raise
        except Exception as e:
            raise InternalServerException(message=str(e))


@router.post("/stop")
def stop_bot(req: BotControlRequest):
    global running_processes
    
    with bots_file_lock:
        bots = load_bots_data()
        
        if req.bot_id not in bots:
            raise BotNotFoundException(req.bot_id)
        
        bot_info = bots[req.bot_id]
        pid = bot_info.get("pid")
        
        if not pid or not is_process_running(pid):
            # 이미 종료된 경우에도 상태 동기화
            if bot_info.get("pid") is not None:
                bot_info["pid"] = None
                bots[req.bot_id] = bot_info
                save_bots_data(bots)
            return {"message": "Bot is not running"}

        try:
            # OS별 종료 신호 전달
            if os.name == 'nt': # Windows
                subprocess.run(["taskkill", "/F", "/T", "/PID", str(pid)], 
                               stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            else: # Linux/Mac
                try:
                    os.kill(pid, signal.SIGTERM)
                    # 정중하게 종료될 때까지 최대 2초 대기
                    for _ in range(20):
                        if not is_process_running(pid):
                            break
                        time.sleep(0.1)
                    
                    if is_process_running(pid):
                        os.kill(pid, signal.SIGKILL)
                except ProcessLookupError:
                    pass
                
            # 메모리 캐시 삭제
            if req.bot_id in running_processes:
                del running_processes[req.bot_id]
                
            # 파일의 PID 정보 초기화
            bot_info["pid"] = None
            bots[req.bot_id] = bot_info
            save_bots_data(bots)
            
            return {"message": "Bot stopped successfully"}
        except Exception as e:
            raise InternalServerException(message=f"Error stopping bot: {str(e)}")


# --- [API 3: 모니터링 (Status/Logs)] ---

@router.get("/status")
def get_bot_status(bot_id: str):
    bots = load_bots_data()
    if bot_id not in bots:
        raise BotNotFoundException(bot_id)
        
    bot_info = bots[bot_id]
    strategy_name = bot_info['strategy']
    mode = bot_info.get('mode', 'paper')
    pid = bot_info.get('pid')
    
    is_running = is_process_running(pid)
    status_str = "RUNNING" if is_running else "STOPPED"
    
    db_path, _, _ = get_bot_paths(bot_id, strategy_name, mode)
    
    # 기본 통계 정보 초기화
    default_stats = {
        "status": status_str,
        "name": bot_info['name'],
        "strategy": strategy_name,
        "mode": mode,
        "total_roi": 0.0, 
        "total_trade_count": 0, 
        "win_count": 0, 
        "loss_count": 0, 
        "active_trade_count": 0,
        "pid": pid if is_running else None
    }

    if not os.path.exists(db_path):
        return default_stats

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
        
        default_stats.update({
            "total_roi": round(total_profit * 100, 2),
            "total_trade_count": stats['total_count'] if stats['total_count'] else 0,
            "win_count": stats['wins'] if stats['wins'] else 0,
            "loss_count": stats['losses'] if stats['losses'] else 0,
            "active_trade_count": active['active'] if active['active'] else 0
        })
        return default_stats
    except Exception as e:
        print(f"[ERROR] get_bot_status database error: {e}")
        return default_stats


@router.get("/trades")
def get_trade_logs(bot_id: str):
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


# --- [API 4: 백테스트 옵션 및 분석] ---

@router.get("/backtest-options")
def get_backtest_options():
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
            except Exception as e:
                print(f"[ERROR] Failed to read {filename}: {e}")
                continue
    
    return sorted(options, key=lambda x: x["date"], reverse=True)


@router.get("/analysis/{bot_id}")
def get_bot_analysis(bot_id: str):
    bots = load_bots_data()
    if bot_id not in bots:
        raise BotNotFoundException(bot_id)
    
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
            analysis["rolling_mdd_30d"] = rolling_mdd
            
            worst_5pct_mdd = mc_data.get("stats", {}).get("worst_mdd", -100)
            analysis["mdd_breach"] = {
                "current_mdd": rolling_mdd,
                "threshold": worst_5pct_mdd,
                "is_breach": rolling_mdd < worst_5pct_mdd
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


# --- [TEST API (개발용 - 배포 시 제거 권장)] ---

@router.post("/test/add-fake-trade")
def add_fake_trade(bot_id: str, profit_pct: float = 0.02):
    from datetime import datetime, timedelta
    
    bots = load_bots_data()
    if bot_id not in bots:
        raise BotNotFoundException(bot_id)
    
    bot_info = bots[bot_id]
    db_path, _, _ = get_bot_paths(bot_id, bot_info['strategy'], bot_info.get('mode', 'paper'))
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
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
    
    cursor.execute("SELECT MAX(close_date) FROM trades WHERE is_open = 0")
    last_date = cursor.fetchone()[0]
    new_date = datetime.fromisoformat(last_date) + timedelta(hours=1) if last_date else datetime.now()
    
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
    import random
    for _ in range(count):
        profit_pct = random.uniform(-0.05, 0.05)
        add_fake_trade(bot_id, profit_pct)
    return {"message": f"{count} trades added", "bot_id": bot_id}


@router.delete("/test/clear-trades")
def clear_trades(bot_id: str):
    bots = load_bots_data()
    if bot_id not in bots:
        raise BotNotFoundException(bot_id)
    
    bot_info = bots[bot_id]
    db_path, _, _ = get_bot_paths(bot_id, bot_info['strategy'], bot_info.get('mode', 'paper'))
    
    if os.path.exists(db_path):
        conn = sqlite3.connect(db_path)
        conn.execute("DELETE FROM trades")
        conn.commit()
        conn.close()
    
    return {"message": "Trades cleared"}
