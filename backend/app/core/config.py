import os

# backend/app/core/config.py
# 1. core/
# 2. app/
# 3. backend/
# 4. project_root/
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

USER_DATA_DIR = os.path.join(BASE_DIR, "user_data")
STRATEGIES_DIR = os.path.join(USER_DATA_DIR, "strategies")
BACKTEST_RESULTS_DIR = os.path.join(USER_DATA_DIR, "backtest_results")
MC_RESULTS_DIR = os.path.join(USER_DATA_DIR, "mc_results")
BOTS_FILE = os.path.join(USER_DATA_DIR, "bots.json")
DB_DIR = os.path.join(USER_DATA_DIR, "databases")
LOGS_DIR = os.path.join(USER_DATA_DIR, "logs")
PAPER_CONFIGS_DIR = os.path.join(USER_DATA_DIR, "paper_configs")
DATA_DIR = os.path.join(USER_DATA_DIR, "data")

# .env file path
DOTENV_PATH = os.path.join(BASE_DIR, ".env")
