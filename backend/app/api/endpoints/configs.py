import os
from fastapi import APIRouter, HTTPException

router = APIRouter()
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))
CONFIGS_DIR = os.path.join(BASE_DIR, "user_data")

@router.get("/")
def get_config_list():
    try:
        if not os.path.exists(CONFIGS_DIR):
            os.makedirs(CONFIGS_DIR)

        files = os.listdir(CONFIGS_DIR)
        json_files = [f for f in files if f.endswith(".fson")]

        return{
            "path" : CONFIGS_DIR,
            "files" : json_files
        }
    except Exception as e:
        raise HTTPException(status_code = 500, detail = str(e))
    
@router.get("/{filename}")
def read_config_file(filename: str):
    file_path = os.path.join(CONFIGS_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code =404, detail="File not found")
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            import json
            content = json.load(f)
            return content
    except Exception as e:
        raise HTTPException(status_code = 500, detail = "Error reading file: {str(e)}")
    