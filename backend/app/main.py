from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.api.endpoints import configs, backtest,paper
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
app.include_router(paper.router, prefix="/paper",tags=["paper"])

@app.get("/")
def read_root():
    index_path = os.path.join(frontend_path, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message":"Server is running"}