from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
import os
import logging
import traceback

from app.api.endpoints import configs, backtest, auth, trading, ai_feedback
from app.core.config import FRONTEND_DIST_PATH, ALLOWED_ORIGINS
from app.core.exceptions import MarvestException

# --- [0] 로깅 설정 ---
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("marvest")

app = FastAPI(title="Marvest Trading System API")

# --- [1] 전역 예외 처리기 (Exception Handlers) ---

@app.exception_handler(MarvestException)
async def marvest_exception_handler(request: Request, exc: MarvestException):
    """Marvest 커스텀 예외 처리"""
    logger.error(f"MarvestException: {exc.code} - {exc.message}")
    if exc.detail:
        logger.error(f"Detail: {exc.detail}")
    
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "status": "error",
            "code": exc.code,
            "message": exc.message,
            "detail": exc.detail
        }
    )

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """기본 HTTPException을 Marvest 형식으로 변환"""
    logger.warning(f"HTTPException: {exc.status_code} - {exc.detail}")
    
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "status": "error",
            "code": f"HTTP_{exc.status_code}",
            "message": str(exc.detail),
            "detail": None
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """예상치 못한 모든 예외 처리"""
    logger.error(f"Unexpected Exception: {str(exc)}")
    logger.error(traceback.format_exc())
    
    return JSONResponse(
        status_code=500,
        content={
            "status": "error",
            "code": "INTERNAL_SERVER_ERROR",
            "message": "An unexpected server error occurred",
            "detail": str(exc) if os.getenv("DEBUG") == "true" else None
        }
    )

# --- [2] CORS 설정 (보안 강화) ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,  # .env 또는 기본값 '*' 사용
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- [3] API 라우터 등록 ---
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
