import os
import json
from fastapi import APIRouter
from app.core.config import USER_DATA_DIR, STRATEGIES_DIR
from app.core.exceptions import ConfigFileNotFoundException, InternalServerException

router = APIRouter()

@router.get("/")
def get_config_list():
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

@router.get("/strategies")
def list_strategies():
    """user_data/strategies 폴더 내의 .py 파일 목록 반환"""
    try:
        if not os.path.exists(STRATEGIES_DIR):
            return []
        
        files = [f for f in os.listdir(STRATEGIES_DIR) if f.endswith(".py") and f != "__init__.py"]
        return [f.replace(".py", "") for f in files]
    except Exception as e:
        raise InternalServerException(message=str(e))

@router.get("/{filename}")
def read_config_file(filename: str):
    file_path = os.path.join(USER_DATA_DIR, filename)
    if not os.path.exists(file_path):
        raise ConfigFileNotFoundException(file_path)
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = json.load(f)
            return content
    except Exception as e:
        raise InternalServerException(message=f"Error reading file: {str(e)}")
    