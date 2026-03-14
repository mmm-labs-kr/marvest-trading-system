import os
import json
import re
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from app.core.config import USER_DATA_DIR, STRATEGIES_DIR
from app.core.exceptions import ConfigFileNotFoundException, InternalServerException, MarvestException

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

# --- [Helper Functions] ---

def validate_strategy_name(name: str):
    """
    전략 이름이 유효한지 검증합니다.
    - 영문, 숫자, 언더바(_)만 허용
    - 영문자로 시작해야 함
    - 경로 탐색 방지를 위해 basename만 추출하여 비교
    """
    if not name:
        raise MarvestException(status_code=400, code="INVALID_NAME", message="전략 이름이 비어있습니다.")
    
    # 경로 탐색 방지: 입력된 이름과 basename이 다르면 잘못된 입력
    if os.path.basename(name) != name:
        raise MarvestException(status_code=400, code="INVALID_NAME", message="전략 이름에 경로를 포함할 수 없습니다.")

    # 정규표현식 검증: 영문자로 시작하고 영문/숫자/_ 만 포함
    if not re.match(r"^[a-zA-Z][a-zA-Z0-9_]*$", name):
        raise MarvestException(
            status_code=400, 
            code="INVALID_NAME", 
            message="전략 이름은 영문자로 시작해야 하며, 영문, 숫자, 언더바(_)만 사용할 수 있습니다."
        )

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
    except MarvestException:
        raise
    except Exception as e:
        raise InternalServerException(message=str(e))

@router.get("/{filename}")
def read_config_file(filename: str):
    """특정 JSON 설정 파일의 내용을 읽어 반환"""
    # 경로 탐색 방지
    safe_filename = os.path.basename(filename)
    file_path = os.path.join(USER_DATA_DIR, safe_filename)
    
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
            os.makedirs(STRATEGIES_DIR, exist_ok=True)
            return []
        
        files = [f for f in os.listdir(STRATEGIES_DIR) if f.endswith(".py") and f != "__init__.py"]
        return sorted([f.replace(".py", "") for f in files])
    except Exception as e:
        raise InternalServerException(message=str(e))

@router.get("/strategies/{name}", response_model=StrategyResponse)
def get_strategy_code(name: str):
    """특정 전략 파일의 소스코드를 읽어 반환"""
    validate_strategy_name(name)
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
    validate_strategy_name(req.name)
    file_path = os.path.join(STRATEGIES_DIR, f"{req.name}.py")
    
    if os.path.exists(file_path):
        raise MarvestException(status_code=400, code="ALREADY_EXISTS", message=f"이미 동일한 이름의 전략이 존재합니다: {req.name}")
    
    try:
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(req.code)
        return StrategyResponse(name=req.name, code=req.code)
    except Exception as e:
        raise InternalServerException(message=f"전략 파일 생성 오류: {str(e)}")

@router.put("/strategies/{name}", response_model=StrategyResponse)
def update_strategy(name: str, req: StrategyUpdateRequest):
    """기존 전략 파일의 소스코드를 수정"""
    validate_strategy_name(name)
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
    validate_strategy_name(name)
    file_path = os.path.join(STRATEGIES_DIR, f"{name}.py")
    
    if not os.path.exists(file_path):
        raise ConfigFileNotFoundException(file_path)
    
    try:
        os.remove(file_path)
        return {"message": f"전략 '{name}'이(가) 성공적으로 삭제되었습니다."}
    except Exception as e:
        raise InternalServerException(message=f"전략 파일 삭제 오류: {str(e)}")
