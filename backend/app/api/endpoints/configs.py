import os
import json
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from app.core.config import USER_DATA_DIR, STRATEGIES_DIR
from app.core.exceptions import ConfigFileNotFoundException, InternalServerException

router = APIRouter()

# --- [Pydantic Models] ---

class StrategyCreateRequest(BaseModel):
    name: str
    code: str

class StrategyUpdateRequest(BaseModel):
    code: str

class StrategyResponse(BaseModel):
    name: str
    code: str

# --- [JSON Configuration Endpoints] ---

@router.get("/")
def get_config_list():
    """user_data 폴더 내의 JSON 설정 파일 목록 반환"""
    try:
        if not os.path.exists(USER_DATA_DIR):
            os.makedirs(USER_DATA_DIR)

        files = os.listdir(USER_DATA_DIR)
        json_files = [f for f in files if f.endswith(".json")]

        return {
            "path" : USER_DATA_DIR,
            "files" : json_files
        }
    except Exception as e:
        raise InternalServerException(message=str(e))

@router.get("/{filename}")
def read_config_file(filename: str):
    """특정 JSON 설정 파일의 내용을 읽어 반환"""
    file_path = os.path.join(USER_DATA_DIR, filename)
    if not os.path.exists(file_path):
        raise ConfigFileNotFoundException(file_path)
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = json.load(f)
            return content
    except Exception as e:
        raise InternalServerException(message=f"파일 읽기 오류: {str(e)}")

# --- [Strategy (.py) CRUD Endpoints] ---

@router.get("/strategies/list")
def list_strategies():
    """user_data/strategies 폴더 내의 .py 파일 목록 반환 (클래스명 기준)"""
    try:
        if not os.path.exists(STRATEGIES_DIR):
            return []
        
        files = [f for f in os.listdir(STRATEGIES_DIR) if f.endswith(".py") and f != "__init__.py"]
        return [f.replace(".py", "") for f in files]
    except Exception as e:
        raise InternalServerException(message=str(e))

@router.get("/strategies/{name}", response_model=StrategyResponse)
def get_strategy_code(name: str):
    """특정 전략 파일의 소스코드를 읽어 반환"""
    file_path = os.path.join(STRATEGIES_DIR, f"{name}.py")
    if not os.path.exists(file_path):
        raise ConfigFileNotFoundException(file_path)
    
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            code = f.read()
            return StrategyResponse(name=name, code=code)
    except Exception as e:
        raise InternalServerException(message=f"전략 파일 읽기 오류: {str(e)}")

@router.post("/strategies", response_model=StrategyResponse)
def create_strategy(req: StrategyCreateRequest):
    """새로운 전략 파일을 생성"""
    file_path = os.path.join(STRATEGIES_DIR, f"{req.name}.py")
    if os.path.exists(file_path):
        raise InternalServerException(status_code=400, message=f"이미 동일한 이름의 전략이 존재합니다: {req.name}")
    
    try:
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(req.code)
        return StrategyResponse(name=req.name, code=req.code)
    except Exception as e:
        raise InternalServerException(message=f"전략 파일 생성 오류: {str(e)}")

@router.put("/strategies/{name}", response_model=StrategyResponse)
def update_strategy(name: str, req: StrategyUpdateRequest):
    """기존 전략 파일의 소스코드를 수정"""
    file_path = os.path.join(STRATEGIES_DIR, f"{name}.py")
    if not os.path.exists(file_path):
        raise ConfigFileNotFoundException(file_path)
    
    try:
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(req.code)
        return StrategyResponse(name=name, code=req.code)
    except Exception as e:
        raise InternalServerException(message=f"전략 파일 수정 오류: {str(e)}")

@router.delete("/strategies/{name}")
def delete_strategy(name: str):
    """특정 전략 파일을 삭제"""
    file_path = os.path.join(STRATEGIES_DIR, f"{name}.py")
    if not os.path.exists(file_path):
        raise ConfigFileNotFoundException(file_path)
    
    try:
        os.remove(file_path)
        return {"message": f"전략 '{name}'이(가) 성공적으로 삭제되었습니다."}
    except Exception as e:
        raise InternalServerException(message=f"전략 파일 삭제 오류: {str(e)}")
