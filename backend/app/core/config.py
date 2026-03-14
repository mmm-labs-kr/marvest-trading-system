import os
from dotenv import load_dotenv

# backend/app/core/config.py

# 현재 파일 위치: backend/app/core/config.py
# 로컬 개발 환경: project_root/backend/app/core/config.py (4단계 위가 루트)
# Docker 환경: /app/app/core/config.py (3단계 위가 /app 루트)

curr_path = os.path.abspath(__file__)
# 3단계 위 (app/ 바로 위)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(curr_path)))

# 만약 3단계 위 폴더에 'frontend'나 'user_data'가 없다면 한 단계 더 올라감 (로컬 환경 대응)
if not os.path.exists(os.path.join(BASE_DIR, "frontend")) and not os.path.exists(os.path.join(BASE_DIR, "user_data")):
    BASE_DIR = os.path.dirname(BASE_DIR)

# .env file path (루트 경로)
DOTENV_PATH = os.path.join(BASE_DIR, ".env")

# 환경 변수 로드
load_dotenv(DOTENV_PATH)

USER_DATA_DIR = os.path.join(BASE_DIR, "user_data")
STRATEGIES_DIR = os.path.join(USER_DATA_DIR, "strategies")
BACKTEST_RESULTS_DIR = os.path.join(USER_DATA_DIR, "backtest_results")
MC_RESULTS_DIR = os.path.join(USER_DATA_DIR, "mc_results")
BOTS_FILE = os.path.join(USER_DATA_DIR, "bots.json")
DB_DIR = os.path.join(USER_DATA_DIR, "databases")
LOGS_DIR = os.path.join(USER_DATA_DIR, "logs")
PAPER_CONFIGS_DIR = os.path.join(USER_DATA_DIR, "paper_configs")
DATA_DIR = os.path.join(USER_DATA_DIR, "data")

# Frontend dist path
FRONTEND_DIST_PATH = os.path.join(BASE_DIR, "frontend", "dist")

# CORS Settings
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")

# [Secrets]
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
OTP_SECRET_JS = os.getenv("OTP_SECRET_JS")
OTP_SECRET_SB = os.getenv("OTP_SECRET_SB")
