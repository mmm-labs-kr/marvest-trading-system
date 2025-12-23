from pydantic import BaseModel
from typing import Optional

class BackTestRequest(BaseModel):
    strategy: str
class BacktestResultSummary(BaseModel):
    filename: str
    strategy: str
    run_id: str
    total_trades: int
    total_profit_pct:float
    win_rate: float