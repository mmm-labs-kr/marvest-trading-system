from pydantic import BaseModel
from typing import Optional, Dict, Any

class BackTestRequest(BaseModel):
    strategy: str

# 새로 추가된 부분: 점수 상세 구조 정의 (선택 사항이지만 권장)
class MarvestScore(BaseModel):
    total_score: float
    grade: str
    is_qualified: bool
    fail_reason: Optional[str] = None
    details: Dict[str, Any]

class BacktestResultSummary(BaseModel):
    filename: str
    strategy: str
    run_id: str
    total_trades: int
    total_profit_pct: float
    win_rate: float
    # ★ 여기에 점수 필드 추가
    score: Optional[MarvestScore] = None