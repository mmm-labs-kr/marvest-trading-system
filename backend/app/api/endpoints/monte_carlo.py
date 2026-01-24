import numpy as np

def perform_monte_carlo(trades_profit_pct, iterations=5000, starting_balance=10000):
    """
    trades_profit_pct: [0.02, -0.01, 0.05, ...] 형태의 소수점 수익률 배열
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