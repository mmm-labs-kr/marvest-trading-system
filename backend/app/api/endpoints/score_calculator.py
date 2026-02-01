def calculate_score(stats: dict, mc_results: dict = None) -> dict:
    # ---------------------------------------
    # 1. 데이터 전처리 (단위 변환)
    # ---------------------------------------
    
    # 1) MDD: 절대값 % 변환 후 음수 처리 (예: 0.15 -> -15.0)
    # Freqtrade JSON이 양수로 주든 음수로 주든 안전하게 변환
    mdd_val = stats.get('max_drawdown_account', 0.0) * 100 * -1
    rp_val = stats.get('drawdown_duration_s', 0.0) / 86400.0
    duration_val = stats.get('holding_avg_s', 0.0) / 3600.0
    calmar_val = stats.get('calmar', 0.0)
    sortino_val = stats.get('sortino', 0.0)
    total_trades = stats.get('total_trades', 0)
    expectancy = stats.get('expectancy_ratio', 0.0)

    # ---------------------------------------
    # 2. 선형 보간 계산 함수 (Linear Interpolation)
    # ---------------------------------------
    def get_score(val, min_limit, max_target, weight_ratio, lower_is_better=False):
        # 단계별 배점 (100점 만점)에 가중치를 적용한 '만점 점수'
        full_mark = weight_ratio * 100 
        
        score = 0.0
        
        if lower_is_better:
            # 낮을수록 좋은 지표 (RP, HT)
            if val <= max_target: return full_mark # 목표보다 낮으면 만점
            if val >= min_limit: return 0.0       # 한계보다 높으면 0점
            
            # 보간 계산: (한계 - 현재) / (한계 - 목표)
            ratio = (min_limit - val) / (min_limit - max_target)
            score = ratio * full_mark
        else:
            # 높을수록 좋은 지표 (MDD, 카르마, 소르티노)
            if val >= max_target: return full_mark # 목표보다 높으면 만점
            if val <= min_limit: return 0.0       # 한계보다 낮으면 0점
            
            # 보간 계산: (현재 - 한계) / (목표 - 한계)
            ratio = (val - min_limit) / (max_target - min_limit)
            score = ratio * full_mark
            
        return score

    # ---------------------------------------
    # 3. 단계별 점수 계산
    # ---------------------------------------

    s_mdd = get_score(mdd_val, -20.0, -7.5, 0.655, lower_is_better=False)
    s_rp = get_score(rp_val, 60.0, 14.0, 0.162, lower_is_better=True)
    s_ht = get_score(duration_val, 336.0, 24.0, 0.183, lower_is_better=True)
    phase1_score = s_mdd + s_rp + s_ht # 1단계 점수 합계 (0~100)
    s_calmar = get_score(calmar_val, 1.0, 3.0, 0.55, lower_is_better=False)
    s_sortino = get_score(sortino_val, 1.5, 3.0, 0.45, lower_is_better=False)
    phase2_score = s_calmar + s_sortino # 2단계 점수 합계 (0~100)

    # ---------------------------------------
    # 4. 최종 종합 점수 산출
    # ---------------------------------------
    final_total_score = (phase1_score * 0.667) + (phase2_score * 0.333)
    
    # ---------------------------------------
    # 5. 필터링 및 등급 판정
    # ---------------------------------------
    is_qualified = True
    fail_reasons = []
    
    # Filter 1: 리스크 점수 과락 (60점 미만)
    if phase1_score < 60:
        is_qualified = False
        fail_reasons.append("Risk Score Low (<60)")
    
    # Filter 2: 거래 횟수 부족 (150회 미만)
    if total_trades < 150:
        is_qualified = False
        fail_reasons.append(f"Not enough trades ({total_trades} < 150)")
        
    # Filter 3: 기대 수익 부족 (0.5% 미만)
    if expectancy < 0.5:
        is_qualified = False
        fail_reasons.append(f"Low Expectancy ({expectancy:.2f}% < 0.5%)")

    # [추가] 몬테카를로 파산 필터
    if mc_results and mc_results.get("ruin_probability", 0) > 0:
        is_qualified = False
        fail_reasons.append(f"Monte Carlo Ruin Risk ({mc_results['ruin_probability']}%)")

    # 등급 결정 함수
    def get_grade(score, qualified):
        if not qualified: return "Fail"
        if score >= 90: return "S"
        if score >= 80: return "A"
        if score >= 70: return "B"
        return "C"

    # ---------------------------------------
    # 6. 결과 반환 (프론트엔드 전송용)
    # ---------------------------------------
    result = {
        "total_score": round(final_total_score, 1),
        "grade": get_grade(final_total_score, is_qualified),
        "is_qualified": is_qualified,
        "fail_reason": ", ".join(fail_reasons) if fail_reasons else None,
        "mc_analysis": mc_results,
        # 상세 점수 (Detail View용)
        "details": {
            "phase1": {
                "name": "Risk Management",
                "score": round(phase1_score, 1),
                "items": [
                    {"name": "MDD", "value": f"{mdd_val:.2f}%", "score": round(s_mdd, 1), "full_mark": 65.5, "target": "-7.5% ~ -20%"},
                    {"name": "Recovery Period", "value": f"{rp_val:.1f} days", "score": round(s_rp, 1), "full_mark": 16.2, "target": "14d ~ 60d"},
                    {"name": "Avg Duration", "value": f"{duration_val:.1f} hrs", "score": round(s_ht, 1), "full_mark": 18.3, "target": "24h ~ 336h"},
                ]
            },
            "phase2": {
                "name": "Performance",
                "score": round(phase2_score, 1),
                "items": [
                    {"name": "Calmar Ratio", "value": f"{calmar_val:.2f}", "score": round(s_calmar, 1), "full_mark": 55.0, "target": "3.0 ~ 1.0"},
                    {"name": "Sortino Ratio", "value": f"{sortino_val:.2f}", "score": round(s_sortino, 1), "full_mark": 45.0, "target": "3.0 ~ 1.5"},
                ]
            },
            "filters": {
                "trades": {"value": total_trades, "pass": total_trades >= 150},
                "expectancy": {"value": f"{expectancy:.2f}%", "pass": expectancy >= 0.5},
                "monte_carlo": {"value": f"{mc_results.get('ruin_probability', 0) if mc_results else 0}%", "pass": (mc_results.get('ruin_probability', 0) if mc_results else 0) == 0}
            }
        }
    }
    return result
