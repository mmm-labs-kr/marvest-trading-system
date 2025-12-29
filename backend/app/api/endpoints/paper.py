from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import sqlite3
import subprocess
import os
import signal
import pandas as pd
import json
import uuid
from typing import List, Optional, Dict

router = APIRouter()

# --- [전역 변수 및 경로 설정] ---
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))
USER_DATA_DIR = os.path.join(BASE_DIR, "user_data")
BOTS_FILE = os.path.join(USER_DATA_DIR, "bots.json") # 봇 목록 저장 파일
DB_DIR = os.path.join(USER_DATA_DIR, "databases")

# 실행 중인 봇 프로세스 관리 (Memory Only)
# Key: bot_id, Value: subprocess.Popen 객체
running_processes: Dict[str, subprocess.Popen] = {}

# --- [Helper Functions] ---

def load_bots_data():
    """bots.json에서 봇 목록을 읽어옴"""
    if not os.path.exists(BOTS_FILE):
        return {}
    with open(BOTS_FILE, "r", encoding="utf-8") as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return {}

def save_bots_data(data):
    """bots.json에 봇 목록 저장"""
    with open(BOTS_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4, ensure_ascii=False)

def get_bot_paths(bot_id: str, strategy_name: str):
    """bot_id를 기준으로 고유한 파일 경로 생성"""
    # DB 파일: tradesv3_{bot_id}.sqlite (ID로 구분하여 완벽 격리)
    db_path = os.path.join(DB_DIR, f"tradesv3_{bot_id}.sqlite")
    log_path = os.path.join(USER_DATA_DIR, "logs", f"paper_{bot_id}.log")
    
    # 설정 파일은 전략 이름을 따라감 (전략 파일은 공유 가능하므로)
    # 없다면 기본 config.json 사용
    config_path = os.path.join(USER_DATA_DIR, "paper_configs", f"config_paper_{strategy_name}.json")
    if not os.path.exists(config_path):
         config_path = os.path.join(USER_DATA_DIR, "config.json")
         
    return db_path, log_path, config_path

# --- [Pydantic Models] ---

class BotCreateRequest(BaseModel):
    name: str          # 사용자가 식별하기 쉬운 이름 (예: 비트코인 1호기)
    strategy: str      # 사용할 전략 파일명
    pair: str          # 거래할 코인 (예: BTC/USDT)

class BotControlRequest(BaseModel):
    bot_id: str

class BotResponse(BaseModel):
    id: str
    name: str
    strategy: str
    pair: str
    status: str        # STOPPED, RUNNING
    pid: Optional[int] = None

# --- [API 1: 봇 관리 (CRUD)] ---

@router.get("/bots", response_model=List[BotResponse])
def list_bots():
    """저장된 모든 봇 목록 반환"""
    bots = load_bots_data()
    result = []
    
    for bot_id, bot_info in bots.items():
        # 실제 프로세스가 살아있는지 확인하여 상태 동기화
        proc = running_processes.get(bot_id)
        is_alive = proc is not None and proc.poll() is None
        
        result.append({
            "id": bot_id,
            "name": bot_info.get("name"),
            "strategy": bot_info.get("strategy"),
            "pair": bot_info.get("pair"),
            "status": "RUNNING" if is_alive else "STOPPED",
            "pid": proc.pid if is_alive else None
        })
    return result

@router.post("/bots")
def create_bot(req: BotCreateRequest):
    """새로운 봇 생성 (실행 X, 리스트에 추가만 함)"""
    bots = load_bots_data()
    
    # 고유 ID 생성 (UUID 사용)
    bot_id = str(uuid.uuid4())[:8] # 짧게 8자리만 사용
    
    new_bot = {
        "id": bot_id,
        "name": req.name,
        "strategy": req.strategy,
        "pair": req.pair,
        "created_at": str(pd.Timestamp.now())
    }
    
    bots[bot_id] = new_bot
    save_bots_data(bots)
    
    return {"message": "Bot created successfully", "bot_id": bot_id}

@router.delete("/bots/{bot_id}")
def delete_bot(bot_id: str):
    """봇 삭제 (실행 중이면 강제 종료 후 삭제)"""
    # 1. 실행 중이면 종료
    if bot_id in running_processes:
        stop_bot(BotControlRequest(bot_id=bot_id))
        
    # 2. JSON에서 삭제
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
    
    # 이미 실행 중인지 확인
    if req.bot_id in running_processes and running_processes[req.bot_id].poll() is None:
        return {"message": "Bot is already running"}

    try:
        # 경로 생성 (bot_id 기준)
        db_path, log_path, config_path = get_bot_paths(req.bot_id, bot_info['strategy'])
        
        # 명령어 구성
        command = [
            "freqtrade", 
            "trade", 
            "--dry-run", 
            "--strategy", bot_info['strategy'], 
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
        
        running_processes[req.bot_id] = proc
        
        return {"message": f"Bot {bot_info['name']} started", "pid": proc.pid}
        
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
    """특정 봇의 현황 조회 (DB 읽기)"""
    bots = load_bots_data()
    if bot_id not in bots:
        raise HTTPException(status_code=404, detail="Bot not found")
        
    strategy_name = bots[bot_id]['strategy']
    
    # 프로세스 상태 확인
    proc = running_processes.get(bot_id)
    is_running = proc is not None and proc.poll() is None
    status_str = "RUNNING" if is_running else "STOPPED"
    
    # DB 연결
    db_path, _, _ = get_bot_paths(bot_id, strategy_name)
    
    if not os.path.exists(db_path):
        return {
            "status": status_str,
            "name": bots[bot_id]['name'],
            "total_roi": 0.0, "total_trade_count": 0, "win_count": 0, "loss_count": 0, "active_trade_count": 0
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
            FROM trades 
            WHERE is_open = 0
        """)
        stats = cursor.fetchone()
        
        cursor.execute("SELECT COUNT(*) as active FROM trades WHERE is_open = 1")
        active = cursor.fetchone()
        
        conn.close()

        total_profit = stats['total_profit'] if stats['total_profit'] else 0.0
        
        return {
            "status": status_str,
            "name": bots[bot_id]['name'],
            "strategy": strategy_name,
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
            "name": bots[bot_id]['name'],
            "total_roi": 0.0, "total_trade_count": 0, "win_count": 0, "loss_count": 0, "active_trade_count": 0
        }

@router.get("/trades")
def get_trade_logs(bot_id: str):
    """특정 봇의 거래 기록 조회"""
    bots = load_bots_data()
    if bot_id not in bots:
        return []
        
    db_path, _, _ = get_bot_paths(bot_id, bots[bot_id]['strategy'])
    
    if not os.path.exists(db_path):
        return []

    try:
        conn = sqlite3.connect(db_path)
        
        query = """
            SELECT 
                id, pair, is_open, open_date, close_date, 
                open_rate, close_rate, amount, close_profit, close_profit_abs,
                strategy
            FROM trades 
            WHERE is_open = 0 
            ORDER BY close_date ASC
        """
        df = pd.read_sql_query(query, conn)
        conn.close()
        
        if df.empty:
            return []

        df['accumulated_profit'] = df['close_profit_abs'].cumsum()
        df = df.sort_values(by='close_date', ascending=False).head(50)

        result = []
        for _, row in df.iterrows():
            profit_pct = round(row['close_profit'] * 100, 2)
            side = "short" if "short" in (str(row.get('strategy', '')).lower()) else "long"

            result.append({
                "id": row['id'],
                "timestamp": str(row['close_date']),
                "pair": row['pair'].replace("/USDT", ""),
                "side": side,
                "is_win": row['close_profit'] >= 0,
                "close_price": row['close_rate'],
                "amount": row['amount'],
                "open_price": row['open_rate'],
                "profit_percent": profit_pct,
                "profit_abs": round(row['close_profit_abs'], 4),
                "accumulated_profit": round(row['accumulated_profit'], 2),
                "is_open": False
            })
        return result
    except Exception:
        return []