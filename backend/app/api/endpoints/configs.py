import os
from fastapi import APIRouter, HTTPException
from app.core.config import USER_DATA_DIR

router = APIRouter()

@router.get("/")
def get_config_list():
    try:
        if not os.path.exists(USER_DATA_DIR):
            os.makedirs(USER_DATA_DIR)

        files = os.listdir(USER_DATA_DIR)
        json_files = [f for f in files if f.endswith(".json")]

        return{
            "path" : USER_DATA_DIR,
            "files" : json_files
        }
    except Exception as e:
        raise HTTPException(status_code = 500, detail = str(e))
    
@router.get("/{filename}")
def read_config_file(filename: str):
    file_path = os.path.join(USER_DATA_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code =404, detail="File not found")
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            import json
            content = json.load(f)
            return content
    except Exception as e:
        raise HTTPException(status_code = 500, detail = f"Error reading file: {str(e)}")
    