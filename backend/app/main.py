from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
from app.api.endpoints import configs, backtest

app = FastAPI(title="Freqtrade Manager")

# 1. 환경 변수에서 프론트엔드 경로 획득
frontend_path = os.getenv("FRONTEND_DIST_PATH", "/app/frontend/dist")

# 2. API 라우터 등록
app.include_router(configs.router, prefix="/api/configs", tags=["configs"])
app.include_router(backtest.router, prefix="/api/backtest", tags=["backtest"])

# 3. 정적 파일 마운트 (CSS, JS, 이미지 등)
# dist 폴더 내의 파일들을 /assets 경로로 서빙합니다.
if os.path.exists(frontend_path):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_path, "assets")), name="assets")

# 4. 루트 경로에서 React index.html 반환
@app.get("/")
def read_root():
    index_path = os.path.join(frontend_path, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "Frontend build not found. API is running."}