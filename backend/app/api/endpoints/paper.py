from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import sqlite3
import subprocess
import os
import signal
import pandas as pd
from typing import List, Optional

# 전역 변수 영역
bot_process = None
current_strategy_name = "-"
router = APIRouter()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))
USER_DATA_DIR = os.path.join(BASE_DIR, "user_data")
CONFIG_DATA_DIR = os.path.join(USER_DATA_DIR,"paper_configs/config_paper_MyStrategy.json")
PAPER_STATUS_FILE = os.path.join(USER_DATA_DIR,"paper_status.json")
DB_PATH = os.path.join(USER_DATA_DIR,"tradesv3.dryrun.sqlite")
bot_process = None

class BotStartRequest(BaseModel):
    strategy: str
    pairs: List[str]

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
    is_win:bool
    close_price: float
    amount:float
    open_price:float
    profit_percent: float
    profit_abs:float
    accumulated_profit:float
    is_open: bool

def get_db_connection():
    if not os.path.exists(DB_PATH):
        return None
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

# 1. 봇 실행 -> URL: POST /paper/start
@router.post("/start")
def start_bot(req: BotStartRequest):
    global bot_process, current_strategy_name

    if bot_process and bot_process.poll() is None:
        return {"message": "Bot is already running", "pid": bot_process.pid}

    try:
        current_strategy_name = req.strategy
        LOG_DIR = os.path.join(USER_DATA_DIR,"logs",f"paper_{req.strategy}.log")
        command = [
            "freqtrade", 
            "trade", 
            "--dry-run", 
            "--strategy", req.strategy, 
            "--config", CONFIG_DATA_DIR,
            "--userdir", USER_DATA_DIR,
            "--db-url", f"sqlite:///{DB_PATH}",
            "--logfile",LOG_DIR
        ]
        
        bot_process = subprocess.Popen(command, shell=True,cwd=os.path.join(os.getcwd(), ".."),
            stdout=subprocess.DEVNULL, # 터미널엔 안 뜸
            stderr=subprocess.DEVNULL) 
        
        return {
            "message": f"Bot started with strategy {req.strategy}", 
            "pid": bot_process.pid
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# 2. 봇 중지 -> URL: POST /paper/stop
# ... (기존 코드들)

@router.post("/stop")
def stop_bot():
    global bot_process

    if bot_process:
        try:
            subprocess.run(["taskkill", "/F", "/T", "/PID", str(bot_process.pid)], 
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            bot_process = None
            return {"message": "Bot process killed via taskkill"}
        except Exception as e:
            print(f"Kill failed: {e}")
    try:
        subprocess.run(["taskkill", "/F", "/IM", "freqtrade.exe"], 
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return {"message": "All Freqtrade processes cleaned up"}
    except Exception:
        pass

    return {"message": "Bot stopped (or no running bot found)"}


# 3. 봇 현황 조회 -> URL: GET /paper/status
@router.get("/status", response_model=BotStatusResponse)
def get_bot_status():
    global bot_process, current_strategy_name
    
    is_running = (bot_process is not None and bot_process.poll() is None)
    status_str = "RUNNING" if is_running else "STOPPED"
    display_strategy = current_strategy_name if is_running else "-"
    conn = get_db_connection()
    
    if conn is None:
        return {
            "status": status_str,
            "strategy_name": display_strategy,
            "total_roi": 0.0,
            "total_trade_count": 0,
            "win_count": 0,
            "loss_count": 0,
            "active_trade_count": 0,
            "pid": bot_process.pid if is_running else None
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
            "strategy_name": display_strategy, 
            "total_roi": round(total_profit * 100, 2),
            "total_trade_count": stats['total_count'] if stats['total_count'] else 0,
            "win_count": stats['wins'] if stats['wins'] else 0,
            "loss_count": stats['losses'] if stats['losses'] else 0,
            "active_trade_count": active['active'],
            "pid": bot_process.pid if is_running else None
        }
    except Exception as e:
        print(f"DB Error: {e}")
        # 에러 발생 시 기본값 반환
        return {
            "status": status_str,
            "strategy_name": "Error",
            "total_roi": 0.0, "total_trade_count": 0, "win_count": 0, "loss_count": 0, "active_trade_count": 0
        }
    finally:
        if conn: conn.close()

# 4. 거래 로그 조회 -> URL: GET /paper/trades
@router.get("/trades", response_model=List[TradeLog])
def get_trade_logs():
    conn = get_db_connection()
    if conn is None:
        return []

    try:
        query = """
            SELECT 
                id, pair, is_open, open_date, close_date, 
                open_rate, close_rate, amount, close_profit, close_profit_abs,
                strategy
            FROM trades 
            WHERE is_open = 0  -- 종료된 거래만 가져오기 (이미지처럼 로그를 찍기 위해)
            ORDER BY close_date ASC
        """
        df = pd.read_sql_query(query, conn)
        
        if df.empty:
            return []

        # 누적 수익금 계산 (Cumulative Sum)
        df['accumulated_profit'] = df['close_profit_abs'].cumsum()

        # 최신순으로 정렬 변경 (화면에는 최신 거래가 위에 떠야 하므로)
        df = df.sort_values(by='close_date', ascending=False).head(50)

        result = []
        for _, row in df.iterrows():
            # 수익률 % 변환 (0.01 -> 1.0%)
            profit_pct = round(row['close_profit'] * 100, 2)
            
            # 익절/손절 여부 판단
            is_win = row['close_profit'] >= 0

            result.append({
                "id": row['id'],
                "timestamp": str(row['close_date']), # 종료 시간 기준
                "pair": row['pair'].replace("/USDT", ""), # /USDT 제거하여 깔끔하게 (선택사항)
                "side": "short" if "short" in (row.get('strategy', '').lower()) else "long", # 전략명이나 DB기록으로 롱/숏 구분 (기본값 long)
                # *참고: freqtrade DB에 side 컬럼이 없다면 기본 long, 혹은 strategy 이름으로 유추해야 함. 
                # 여기서는 일단 "long"을 기본으로 두고, 필요시 로직 수정. 
                # V3 DB라면 trade_direction 컬럼이 있을 수 있음. 확인 필요.
                # 일단은 화면 구성을 위해 기본값을 넣습니다.
                
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