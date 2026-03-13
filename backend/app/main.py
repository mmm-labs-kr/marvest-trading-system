from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

from app.api.endpoints import configs, backtest, auth, trading, ai_feedback
from app.core.config import FRONTEND_DIST_PATH, ALLOWED_ORIGINS

app = FastAPI(title="Marvest Trading System API")

# --- [1] CORS 설정 (보안 강화) ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,  # .env 또는 기본값 '*' 사용
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- [2] API 라우터 등록 ---
app.include_router(configs.router, prefix="/api/configs", tags=["configs"])
app.include_router(backtest.router, prefix="/api/backtest", tags=["backtest"])
app.include_router(trading.router, prefix="/api/trading", tags=["trading"])
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(ai_feedback.router, prefix="/api/ai", tags=["ai"])

# --- [3] 정적 파일 서빙 및 SPA 라우팅 지원 (프론트엔드 연결) ---

# 3.1 /assets 경로 마운트 (이게 있어야 이미지/CSS가 나옵니다)
assets_path = os.path.join(FRONTEND_DIST_PATH, "assets")
if os.path.exists(assets_path):
    app.mount("/assets", StaticFiles(directory=assets_path), name="assets")

# 3.2 모든 경로에 대한 SPA 대응 (React의 BrowserRouter 대응용)
@app.get("/{full_path:path}")
async def serve_frontend(full_path: str):
    # API 요청이면 404를 반환 (실제 없는 API를 요청한 경우)
    if full_path.startswith("api"):
        return {"detail": "API endpoint not found", "path": full_path}
    
    # index.html 파일 경로
    index_file = os.path.join(FRONTEND_DIST_PATH, "index.html")
    
    # 파일이 있으면 반환 (새로고침 시 404 방지)
    if os.path.exists(index_file):
        return FileResponse(index_file)
    
    # 파일이 없으면 안내 메시지
    return {"message": "Marvest API is running. Frontend (index.html) not found.", "dist_path": FRONTEND_DIST_PATH}

# 3.3 루트 경로 접속 시 index.html 반환
@app.get("/")
async def read_root():
    index_file = os.path.join(FRONTEND_DIST_PATH, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {"message": "Marvest API is running. Please check if frontend is built."}
