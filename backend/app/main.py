from fastapi import FastAPI

from app.api.endpoints import configs, backtest

app = FastAPI(title="Freqtrade Manager")

app.include_router(configs.router, prefix="/configs",tags=["configs"])
app.include_router(backtest.router, prefix="/backtest",tags=["backtest"])

@app.get("/")
def read_root():
    return {"message":"Server is running"}

