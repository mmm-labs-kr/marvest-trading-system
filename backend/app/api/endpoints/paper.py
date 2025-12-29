from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import sqlite3
import subprocess
import os
import signal
import pandas as pd
from typing import List, Optional, Dict

# --- [수정 1] 전역 변수: 봇 프로세스들을 딕셔너리로 관리 ---
# Key: 전략이름, Value: subprocess 객체
bot_processes: Dict[str, subprocess.Popen] = {}

router = APIRouter()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))
USER_DATA_DIR = os.path.join(BASE_DIR, "user_data")

# --- [수정 2] 동적 경로 생성 함수 ---
def get_paths(strategy_name: str):
    """전략 이름을 받아서 해당 전략 전용 파일 경로들을 반환"""
    # 1. DB 파일: tradesv3_{전략명}.sqlite
    db_path = os.path.join(USER_DATA_DIR, f"tradesv3_{strategy_name}.sqlite")
    
    # 2. 로그 파일: logs/paper_{전략명}.log
    log_path = os.path.join(USER_DATA_DIR, "logs", f"paper_{strategy_name}.log")
    
    # 3. 설정 파일: paper_configs/config_paper_{전략명}.json
    # (주의: 해당 설정 파일이 실제로 존재해야 합니다. 없으면 기본 config 사용 로직 추가 가능)
    config_path = os.path.join(USER_DATA_DIR, "paper_configs", f"config_paper_{strategy_name}.json")
    
    # 만약 전용 설정 파일이 없으면 기본 설정 파일 사용 (선택사항)
    if not os.path.exists(config_path):
         config_path = os.path.join(USER_DATA_DIR, "config.json")
         
    return db_path, log_path, config_path

class BotStartRequest(BaseModel):
    strategy: str
    pairs: List[str]

# 봇 중지 요청용 모델 추가
class BotStopRequest(BaseModel):
    strategy: str

class BotStatusResponse(BaseModel):
    status: str
    strategy_name: str
    total_roi: float
    total_trade_count: int
    win_count: int
    loss_count: int
    active_trade_count: int
    pid: Optional[int] = None

class TradeLog(BaseModel):
    id: int
    timestamp: str
    pair: str
    side: str
    is_win: bool
    close_price: float
    amount: float
    open_price: float
    profit_percent: float
    profit_abs: float
    accumulated_profit: float
    is_open: bool

# --- [수정 3] DB 연결 함수도 전략 이름을 받아야 함 ---
def get_db_connection(strategy_name: str):
    db_path, _, _ = get_paths(strategy_name)
    
    if not os.path.exists(db_path):
        return None
    
    try:
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        return conn
    except Exception:
        return None

# 1. 봇 실행 -> URL: POST /paper/start
@router.post("/start")
def start_bot(req: BotStartRequest):
    global bot_processes

    # 이미 해당 전략이 실행 중인지 확인
    if req.strategy in bot_processes:
        proc = bot_processes[req.strategy]
        if proc.poll() is None: # 살아있다면
             return {"message": f"Bot {req.strategy} is already running", "pid": proc.pid}
        else:
            # 죽어있다면 딕셔너리에서 제거 후 재실행
            del bot_processes[req.strategy]

    try:
        # 경로 가져오기
        db_path, log_path, config_path = get_paths(req.strategy)
        
        # 명령어 구성 (DB URL과 로그파일을 전략별로 분리)
        command = [
            "freqtrade", 
            "trade", 
            "--dry-run", 
            "--strategy", req.strategy, 
            "--config", config_path,
            "--userdir", USER_DATA_DIR,
            "--db-url", f"sqlite:///{db_path}",
            "--logfile", log_path
        ]
        
        # 프로세스 실행
        proc = subprocess.Popen(
            command, 
            shell=True,
            cwd=os.path.join(os.getcwd(), ".."),
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )
        
        # 딕셔너리에 저장 (Key: 전략이름)
        bot_processes[req.strategy] = proc
        
        return {
            "message": f"Bot started with strategy {req.strategy}", 
            "pid": proc.pid,
            "db_path": db_path
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# 2. 봇 중지 -> URL: POST /paper/stop
@router.post("/stop")
def stop_bot(req: BotStopRequest): # 전략 이름을 받아서 특정 봇만 끔
    global bot_processes

    target_proc = bot_processes.get(req.strategy)

    if target_proc:
        try:
            # 해당 프로세스 강제 종료
            subprocess.run(["taskkill", "/F", "/T", "/PID", str(target_proc.pid)], 
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            
            # 목록에서 제거
            del bot_processes[req.strategy]
            return {"message": f"Bot {req.strategy} stopped successfully"}
        except Exception as e:
            print(f"Kill failed: {e}")
            return {"message": f"Failed to stop bot {req.strategy}", "error": str(e)}
    else:
        return {"message": f"Bot {req.strategy} is not running"}


# 3. 봇 현황 조회 -> URL: GET /paper/status?strategy=MyStrategy
@router.get("/status", response_model=BotStatusResponse)
def get_bot_status(strategy: str = "MyStrategy"): # Query Parameter로 전략 이름 받음
    global bot_processes
    
    # 해당 전략 봇이 실행 중인지 확인
    target_proc = bot_processes.get(strategy)
    is_running = (target_proc is not None and target_proc.poll() is None)
    
    status_str = "RUNNING" if is_running else "STOPPED"
    
    # 해당 전략의 DB 연결
    conn = get_db_connection(strategy)
    
    # DB가 없거나 연결 실패 시 (봇이 한 번도 안 켜진 경우 등)
    if conn is None:
        return {
            "status": status_str,
            "strategy_name": strategy,
            "total_roi": 0.0,
            "total_trade_count": 0,
            "win_count": 0,
            "loss_count": 0,
            "active_trade_count": 0,
            "pid": target_proc.pid if is_running else None
        }

    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT 
                COUNT(*) as total_count,
                SUM(CASE WHEN close_profit > 0 THEN 1 ELSE 0 END) as wins,
                SUM(CASE WHEN close_profit <= 0 THEN 1 ELSE 0 END) as losses,
                SUM(close_profit) as total_profit
            FROM trades 
            WHERE is_open = 0
        """)
        stats = cursor.fetchone()
        
        cursor.execute("SELECT COUNT(*) as active FROM trades WHERE is_open = 1")
        active = cursor.fetchone()

        total_profit = stats['total_profit'] if stats['total_profit'] else 0.0
        
        return {
            "status": status_str,
            "strategy_name": strategy, 
            "total_roi": round(total_profit * 100, 2),
            "total_trade_count": stats['total_count'] if stats['total_count'] else 0,
            "win_count": stats['wins'] if stats['wins'] else 0,
            "loss_count": stats['losses'] if stats['losses'] else 0,
            "active_trade_count": active['active'],
            "pid": target_proc.pid if is_running else None
        }
    except Exception as e:
        print(f"DB Error: {e}")
        return {
            "status": status_str,
            "strategy_name": "Error",
            "total_roi": 0.0, "total_trade_count": 0, "win_count": 0, "loss_count": 0, "active_trade_count": 0
        }
    finally:
        if conn: conn.close()

# 4. 거래 로그 조회 -> URL: GET /paper/trades?strategy=MyStrategy
@router.get("/trades", response_model=List[TradeLog])
def get_trade_logs(strategy: str = "MyStrategy"): # Query Parameter로 전략 이름 받음
    conn = get_db_connection(strategy)
    if conn is None:
        return []

    try:
        query = """
            SELECT 
                id, pair, is_open, open_date, close_date, 
                open_rate, close_rate, amount, close_profit, close_profit_abs,
                strategy
            FROM trades 
            WHERE is_open = 0 
            ORDER BY close_date DESC -- 최신순 정렬
            LIMIT 50
        """
        df = pd.read_sql_query(query, conn)
        
        if df.empty:
            return []

        # 최신순 정렬 상태에서 누적 수익금을 계산하면 그래프가 거꾸로 그려질 수 있음.
        # 계산을 위해 시간순(오름차순)으로 정렬 후 계산하고, 다시 최신순으로 뒤집어야 함.
        df = df.sort_values(by='close_date', ascending=True) 
        df['accumulated_profit'] = df['close_profit_abs'].cumsum()
        
        # 다시 최신순으로 (화면 표시용)
        df = df.sort_values(by='close_date', ascending=False)

        result = []
        for _, row in df.iterrows():
            profit_pct = round(row['close_profit'] * 100, 2)
            is_win = row['close_profit'] >= 0

            # Side 결정 로직 (DB에 컬럼이 없으면 기본값 처리)
            # strategy 문자열에 'short'가 포함되어 있으면 short로 간주하는 임시 로직 유지
            side = "short" if "short" in (str(row.get('strategy', '')).lower()) else "long"

            result.append({
                "id": row['id'],
                "timestamp": str(row['close_date']),
                "pair": row['pair'].replace("/USDT", ""),
                "side": side,
                "is_win": is_win,
                "close_price": row['close_rate'],
                "amount": row['amount'],
                "open_price": row['open_rate'],
                "profit_percent": profit_pct,
                "profit_abs": round(row['close_profit_abs'], 4),
                "accumulated_profit": round(row['accumulated_profit'], 2),
                "is_open": False
            })
            
        return result
    except Exception as e:
        print(f"Log Error: {e}")
        return []
    finally:
        if conn: conn.close()