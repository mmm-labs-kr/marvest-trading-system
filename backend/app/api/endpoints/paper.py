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

def get_bot_paths(bot_id: str, strategy_name: str, mode: str):
    """
    bot_id와 mode를 기준으로 파일 경로 생성
    mode가 'live'이면 config_live.json을 우선적으로 찾음
    """
    # 1. DB 폴더 생성
    if not os.path.exists(DB_DIR):
        os.makedirs(DB_DIR)

    # 2. DB 및 로그 파일 경로 (ID로 격리)
    db_path = os.path.join(DB_DIR, f"tradesv3_{bot_id}.sqlite")
    log_path = os.path.join(USER_DATA_DIR, "logs", f"{mode}_{bot_id}.log")
    
    # 3. 설정 파일 결정 로직 (가장 중요 ★)
    # 전략별 전용 설정 파일이 있는지 확인
    strategy_config = os.path.join(USER_DATA_DIR, "paper_configs", f"config_{mode}_{strategy_name}.json")
    
    if os.path.exists(strategy_config):
        config_path = strategy_config
    else:
        # 없다면 공용 설정 파일 사용
        # live -> config_live.json
        # paper -> config.json (기본값)
        if mode == 'live':
            config_path = os.path.join(USER_DATA_DIR, "config_live.json")
        else:
            config_path = os.path.join(USER_DATA_DIR, "config.json")
         
    return db_path, log_path, config_path

# --- [Pydantic Models] ---

class BotCreateRequest(BaseModel):
    name: str          
    strategy: str      
    pair: str          
    mode: str = "paper" # [추가] paper 또는 live

class BotControlRequest(BaseModel):
    bot_id: str

class BotResponse(BaseModel):
    id: str
    name: str
    strategy: str
    pair: str
    mode: str          # [추가]
    status: str        
    pid: Optional[int] = None

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
            "mode": bot_info.get("mode", "paper"), # 없으면 기본 paper
            "status": "RUNNING" if is_alive else "STOPPED",
            "pid": proc.pid if is_alive else None
        })
    return result

@router.post("/bots")
def create_bot(req: BotCreateRequest):
    """새로운 봇 생성"""
    bots = load_bots_data()
    
    bot_id = str(uuid.uuid4())[:8]
    
    new_bot = {
        "id": bot_id,
        "name": req.name,
        "strategy": req.strategy,
        "pair": req.pair,
        "mode": req.mode, # [추가] 모드 저장
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
    mode = bot_info.get("mode", "paper") # 모드 확인
    
    if req.bot_id in running_processes and running_processes[req.bot_id].poll() is None:
        return {"message": "Bot is already running"}

    try:
        # 경로 생성
        db_path, log_path, config_path = get_bot_paths(req.bot_id, bot_info['strategy'], mode)
        
        # [핵심] 설정 파일 존재 여부 체크 (특히 Live 모드일 때 중요)
        if not os.path.exists(config_path):
             raise Exception(f"Config file not found: {config_path}. Please create it first.")

        # 기본 명령어
        command = [
            "freqtrade", 
            "trade", 
            "--strategy", bot_info['strategy'], 
            "--config", config_path,
            "--userdir", USER_DATA_DIR,
            "--db-url", f"sqlite:///{db_path}",
            "--logfile", log_path
        ]
        
        # [핵심] 모의투자 모드일 때만 --dry-run 추가
        if mode == "paper":
            command.append("--dry-run")
        
        # 프로세스 실행
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
        
    strategy_name = bots[bot_id]['strategy']
    mode = bots[bot_id].get('mode', 'paper')
    
    proc = running_processes.get(bot_id)
    is_running = proc is not None and proc.poll() is None
    status_str = "RUNNING" if is_running else "STOPPED"
    
    # DB 연결
    db_path, _, _ = get_bot_paths(bot_id, strategy_name, mode)
    
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
            "name": bots[bot_id]['name'],
            "total_roi": 0.0, "total_trade_count": 0, "win_count": 0, "loss_count": 0, "active_trade_count": 0
        }

@router.get("/trades")
def get_trade_logs(bot_id: str):
    """거래 기록 조회"""
    bots = load_bots_data()
    if bot_id not in bots: return []
        
    db_path, _, _ = get_bot_paths(bot_id, bots[bot_id]['strategy'], bots[bot_id].get('mode', 'paper'))
    
    if not os.path.exists(db_path): return []

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
        
        if df.empty: return []

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