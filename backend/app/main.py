from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.endpoints import configs, backtest,paper

app = FastAPI(title="Freqtrade Manager")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],      # 모든 주소 허용 (보안상 개발때만 사용)
    allow_credentials=True,
    allow_methods=["*"],      # 모든 HTTP 메소드(GET, POST 등) 허용
    allow_headers=["*"],      # 모든 헤더 허용
)

app.include_router(configs.router, prefix="/configs",tags=["configs"])
app.include_router(backtest.router, prefix="/backtest",tags=["backtest"])
app.include_router(paper.router, prefix="/paper",tags=["paper"])

@app.get("/")
def read_root():
    return {"message":"Server is running"}

