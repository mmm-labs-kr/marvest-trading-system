from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.api.endpoints import configs, backtest, auth, trading, ai_feedback
import os

app = FastAPI(title="Freqtrade Manager")

frontend_path = os.getenv("FRONTEND_DIST_PATH", "/app/frontend/dist")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],      # 모든 주소 허용 (보안상 개발때만 사용)
    allow_credentials=True,
    allow_methods=["*"],      # 모든 HTTP 메소드(GET, POST 등) 허용
    allow_headers=["*"],      # 모든 헤더 허용
)

if os.path.exists(frontend_path):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_path, "assets")), name="assets")


app.include_router(configs.router, prefix="/configs",tags=["configs"])
app.include_router(backtest.router, prefix="/backtest",tags=["backtest"])
app.include_router(trading.router, prefix="/trading",tags=["trading"])
app.include_router(auth.router, prefix="/auth",tags=["auth"])
app.include_router(ai_feedback.router, prefix="/ai", tags=["ai"]) 

if os.path.exists(frontend_path):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_path, "assets")), name="assets")

# 4. 루트 경로에서 React index.html 반환
@app.get("/")
def read_root():
    index_path = os.path.join(frontend_path, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message":"Server is running"}
