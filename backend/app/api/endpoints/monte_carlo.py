import numpy as np
import os
import json
from typing import List, Optional, Dict, Any
from app.core.config import MC_RESULTS_DIR

def get_latest_mc_for_strategy(strategy_name: str) -> Optional[Dict[str, Any]]:
    """
    특정 전략의 가장 최신 몬테카를로 시뮬레이션 결과를 가져옵니다.

    Args:
        strategy_name (str): 검색할 전략 클래스 명

    Returns:
        Optional[Dict[str, Any]]: 최신 MC 결과 데이터 (파일이 없으면 None)
    """
    if not os.path.exists(MC_RESULTS_DIR):
        return None

    matching_files = [
        f for f in os.listdir(MC_RESULTS_DIR) 
        if f.startswith(f"{strategy_name}_") and f.endswith(".json")
    ]

    if not matching_files:
        return None

    # 파일명 기반 정렬 (최신순)
    matching_files.sort(reverse=True)
    latest_file = matching_files[0]

    try:
        with open(os.path.join(MC_RESULTS_DIR, latest_file), "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"[ERROR] Failed to load MC result {latest_file}: {e}")
        return None

def perform_monte_carlo(
    trades_profit_pct: List[float], 
    iterations: int = 5000, 
    starting_balance: float = 10000
) -> Optional[Dict[str, Any]]:
    """
    매매 수익률 데이터를 기반으로 몬테카를로 시뮬레이션을 수행합니다.

    Args:
        trades_profit_pct (List[float]): 개별 매매의 수익률 리스트 (예: [0.02, -0.01])
        iterations (int): 시뮬레이션 반복 횟수. 기본값 5000.
        starting_balance (float): 시뮬레이션 시작 잔고. 기본값 10000.

    Returns:
        Optional[Dict[str, Any]]: 파산 확률, 신뢰 구간, MDD 통계 등을 포함한 결과
    """
    n_trades = len(trades_profit_pct)
    if n_trades == 0:
        return None

    # 5,000회 복원 추출 시뮬레이션 (Vectorized 연산)
    # 결과 행렬 크기: (5000, n_trades)
    sim_matrix = np.random.choice(trades_profit_pct, size=(iterations, n_trades), replace=True)

    # 누적 수익 곡선 계산 (초기 잔고 기준)
    # (1 + r)들을 누적 곱한 후 초기 자산 곱함
    equity_curves = starting_balance * np.cumprod(1 + sim_matrix, axis=1)

    # 1. 파산 확률 (Ruin Probability): 자산이 원금의 50% 미만으로 떨어진 시나리오 비율
    ruined_scenarios = np.any(equity_curves < (starting_balance * 0.5), axis=1)
    ruin_prob = np.mean(ruined_scenarios) * 100

    # 2. 신뢰 구간 (Confidence Intervals) 계산
    # 각 매매 시점(Column)별로 퍼센타일 산출
    upper_bound = np.percentile(equity_curves, 97.5, axis=0)
    median_curve = np.percentile(equity_curves, 50, axis=0)
    lower_bound = np.percentile(equity_curves, 2.5, axis=0)

    # 3. MDD 분포 계산
    peaks = np.maximum.accumulate(equity_curves, axis=1)
    drawdowns = (equity_curves - peaks) / peaks
    max_drawdowns = np.min(drawdowns, axis=1) * 100 # 시나리오별 최대 낙폭

    return {
        "ruin_probability": round(float(ruin_prob), 2),
        "stats": {
            "median_final_balance": round(float(np.median(equity_curves[:, -1])), 2),
            "worst_mdd": round(float(np.min(max_drawdowns)), 2),
            "avg_mdd": round(float(np.mean(max_drawdowns)), 2)
        },
        "chart_data": [
            {
                "trade_num": i + 1,
                "upper": round(float(upper_bound[i]), 2),
                "median": round(float(median_curve[i]), 2),
                "lower": round(float(lower_bound[i]), 2)
            } for i in range(n_trades)
        ],
        "mdd_histogram": np.histogram(max_drawdowns, bins=20)[0].tolist()
    }