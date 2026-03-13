import os
import json
import re
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from app.core.config import STRATEGIES_DIR, GOOGLE_API_KEY

import google.generativeai as genai

# Gemini API 설정
if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)

router = APIRouter()


# ============================================
# Pydantic Models
# ============================================

class AnalyzeRequest(BaseModel):
    strategy_name: str
    backtest_stats: dict
    focus_areas: Optional[List[str]] = None


class AnalyzeResponse(BaseModel):
    success: bool
    strategy_summary: Optional[dict] = None
    failure_analysis: Optional[List[dict]] = None
    suggestions: Optional[List[dict]] = None
    error: Optional[str] = None

class ApplyRequest(BaseModel):
    original_strategy_name: str
    new_strategy_name: str
    selected_suggestions: List[dict]  # 선택된 제안들
    backtest_stats: dict


class ApplyResponse(BaseModel):
    success: bool
    new_strategy_name: Optional[str] = None
    file_path: Optional[str] = None
    error: Optional[str] = None

# ============================================
# Helper Functions
# ============================================

def load_strategy_code(strategy_name: str) -> str:
    """전략 파일 읽기"""
    strategy_file = os.path.join(STRATEGIES_DIR, f"{strategy_name}.py")
    
    if not os.path.exists(strategy_file):
        for f in os.listdir(STRATEGIES_DIR):
            if f.lower() == f"{strategy_name.lower()}.py":
                strategy_file = os.path.join(STRATEGIES_DIR, f)
                break
    
    if not os.path.exists(strategy_file):
        raise FileNotFoundError(f"Strategy file not found: {strategy_name}.py")
    
    with open(strategy_file, 'r', encoding='utf-8') as f:
        return f.read()


def build_analysis_prompt(strategy_code: str, backtest_stats: dict) -> str:
    """AI 분석을 위한 프롬프트 생성"""
    
    total_trades = backtest_stats.get('total_trades', 0)
    winrate = backtest_stats.get('winrate', 0) * 100
    profit_total = backtest_stats.get('profit_total_pct', 0)
    max_drawdown = backtest_stats.get('max_drawdown_account', 0) * 100
    calmar = backtest_stats.get('calmar', 0)
    sortino = backtest_stats.get('sortino', 0)
    avg_duration = backtest_stats.get('holding_avg_s', 0) / 3600
    profit_factor = backtest_stats.get('profit_factor', 0)
    
    json_template = '''
{
    "strategy_summary": {
        "indicators": [
            {"name": "지표명", "params": "파라미터"}
        ],
        "entry_logic": "진입 조건 설명 (한국어)",
        "exit_logic": "청산 조건 설명 (한국어)",
        "risk_management": "손절/익절 설정 설명"
    },
    "failure_analysis": [
        {
            "issue": "문제점 제목",
            "impact": "이 문제가 수익률/MDD에 미치는 영향",
            "severity": "high 또는 medium 또는 low"
        }
    ],
    "suggestions": [
        {
            "id": 1,
            "title": "개선안 제목",
            "description": "구체적인 개선 방법 설명",
            "expected_impact": "예상되는 개선 효과",
            "code_hint": "수정해야 할 코드 힌트"
        }
    ]
}
'''
    
    prompt = f"""
        당신은 15년 경력의 퀀트 트레이더이자 알고리즘 트레이딩 전문가입니다.
        다음 Freqtrade 트레이딩 전략 코드와 백테스트 결과를 분석해주세요.

        [전략 코드]
        {strategy_code}

        [백테스트 결과]
        - 총 거래 수: {total_trades}회
        - 승률: {winrate:.1f}%
        - 총 수익률: {profit_total:.2f}%
        - 최대 낙폭(MDD): {max_drawdown:.2f}%
        - 칼마 비율: {calmar:.2f}
        - 소르티노 비율: {sortino:.2f}
        - 평균 보유 시간: {avg_duration:.1f}시간
        - Profit Factor: {profit_factor:.2f}

        [분석 요청]
        다음 JSON 형식으로만 응답해주세요. 다른 설명 텍스트 없이 순수 JSON만 출력하세요.
        {json_template}

        [분석 시 고려사항]
        1. MDD가 -20%보다 나쁘면 리스크 관리 문제를 지적하세요
        2. 승률이 50% 미만이면 진입 조건 개선이 필요합니다
        3. 추세 필터(ADX, 이평선 등)가 없으면 추가를 권장하세요
        4. 손절이 없거나 너무 넓으면 지적하세요
        5. 과적합 위험이 있는 패턴을 경고하세요
        6. failure_analysis는 최소 2개, 최대 4개로 작성하세요
        7. suggestions는 최소 2개, 최대 4개로 작성하세요
        """
    
    return prompt


def parse_ai_response(response_text: str) -> dict:
    """AI 응답에서 JSON 추출"""
    try:
        # 코드 블록 제거
        cleaned = response_text.strip()
        cleaned = re.sub(r'^```json\s*', '', cleaned)
        cleaned = re.sub(r'^```\s*', '', cleaned)
        cleaned = re.sub(r'\s*```$', '', cleaned)
        
        # JSON 객체 찾기
        start_idx = cleaned.find('{')
        if start_idx == -1:
            return None
            
        # 중괄호 매칭으로 JSON 끝 찾기
        brace_count = 0
        end_idx = start_idx
        for i in range(start_idx, len(cleaned)):
            if cleaned[i] == '{':
                brace_count += 1
            elif cleaned[i] == '}':
                brace_count -= 1
                if brace_count == 0:
                    end_idx = i + 1
                    break
        
        json_str = cleaned[start_idx:end_idx]
        return json.loads(json_str)
        
    except json.JSONDecodeError as e:
        print(f"[ERROR] JSON parsing failed: {e}")
        print(f"[DEBUG] Response text: {response_text[:500]}")
        return None

def build_apply_prompt(original_code: str, selected_suggestions: List[dict], new_strategy_name: str) -> str:
    """선택된 제안을 적용한 새 전략 코드 생성 프롬프트"""
    
    suggestions_text = ""
    for i, suggestion in enumerate(selected_suggestions, 1):
        suggestions_text += f"""
{i}. {suggestion.get('title', '')}
   - Description: {suggestion.get('description', '')}
   - Code hint: {suggestion.get('code_hint', 'None')}
"""
    
    prompt = f"""You are a Freqtrade trading strategy expert.
Generate a new strategy by applying the selected improvements to the original code.

================================================================================
[ORIGINAL STRATEGY CODE]
================================================================================
{original_code}

================================================================================
[IMPROVEMENTS TO APPLY]
================================================================================
{suggestions_text}

================================================================================
[FREQTRADE CODING STANDARDS]
================================================================================

### 1. REQUIRED IMPORTS ###
from freqtrade.strategy import IStrategy
from freqtrade.strategy import IntParameter, DecimalParameter, BooleanParameter, CategoricalParameter
from pandas import DataFrame
import talib.abstract as ta
import freqtrade.vendor.qtpylib.indicators as qtpylib
import numpy as np

### 2. BANNED IMPORTS (DO NOT USE) ###
- from freqtrade.strategy.interface import ...
- from freqtrade.optimize.space import ...

### 3. HYPEROPT PARAMETER RULES ###
IntParameter/DecimalParameter CAN ONLY be used for:
- Custom variables used in populate_indicators()
- Custom variables used in populate_entry_trend()
- Custom variables used in populate_exit_trend()
- Custom variables used in custom_stoploss()

THESE ATTRIBUTES MUST BE FIXED VALUES (NOT Parameters):
- stoploss = -0.05  (MUST be float)
- trailing_stop = True  (MUST be bool)
- trailing_stop_positive = 0.01  (MUST be float)
- trailing_stop_positive_offset = 0.02  (MUST be float)
- trailing_only_offset_is_reached = True  (MUST be bool)
- minimal_roi = {{"0": 0.01}}  (MUST be dict)
- timeframe = '5m'  (MUST be string)
- use_custom_stoploss = True  (MUST be bool)

CORRECT Parameter usage example:
    rsi_buy_value = IntParameter(20, 40, default=30, space='buy', optimize=True)
    atr_multiplier = DecimalParameter(1.0, 3.0, default=2.0, space='sell', optimize=True)
    
    def populate_entry_trend(self, dataframe, metadata):
        dataframe.loc[
            (dataframe['rsi'] < self.rsi_buy_value.value),
            'enter_long'] = 1
        return dataframe

WRONG Parameter usage (DO NOT DO THIS):
    stoploss = DecimalParameter(-0.1, -0.01, default=-0.05)  # WRONG!
    trailing_stop_positive_offset = DecimalParameter(0.01, 0.05, default=0.02)  # WRONG!

### 4. TA-LIB USAGE ###
Single value indicators:
    dataframe['rsi'] = ta.RSI(dataframe, timeperiod=14)
    dataframe['adx'] = ta.ADX(dataframe, timeperiod=14)
    dataframe['plus_di'] = ta.PLUS_DI(dataframe, timeperiod=14)
    dataframe['minus_di'] = ta.MINUS_DI(dataframe, timeperiod=14)
    dataframe['ema200'] = ta.EMA(dataframe, timeperiod=200)
    dataframe['sma50'] = ta.SMA(dataframe, timeperiod=50)
    dataframe['atr'] = ta.ATR(dataframe, timeperiod=14)

Dictionary return indicators:
    macd = ta.MACD(dataframe)
    dataframe['macd'] = macd['macd']
    dataframe['macdsignal'] = macd['macdsignal']
    dataframe['macdhist'] = macd['macdhist']

    bollinger = ta.BBANDS(dataframe, timeperiod=20)
    dataframe['bb_upper'] = bollinger['upperband']
    dataframe['bb_middle'] = bollinger['middleband']
    dataframe['bb_lower'] = bollinger['lowerband']

    stoch = ta.STOCH(dataframe)
    dataframe['slowk'] = stoch['slowk']
    dataframe['slowd'] = stoch['slowd']

### 5. CUSTOM STOPLOSS ###
If using custom_stoploss, you MUST:
- Set use_custom_stoploss = True (fixed bool, not Parameter)
- Import: from datetime import datetime
- Import: from freqtrade.persistence import Trade
- Return a positive float (e.g., return 0.05 for 5% stoploss)

================================================================================
[OUTPUT REQUIREMENTS]
================================================================================
1. Class name must be: {new_strategy_name}
2. Apply ALL selected improvements
3. Maintain existing logic while adding improvements
4. Mark modifications with: # MODIFIED: description
5. Mark additions with: # ADDED: description
6. Output ONLY valid Python code
7. NO markdown code blocks
8. NO explanatory text before or after code

================================================================================
[CRITICAL RULES - VIOLATION WILL CAUSE ERRORS]
================================================================================
* ALL COMMENTS MUST BE IN ENGLISH ONLY
* NO Korean, Chinese, Japanese, or non-ASCII characters anywhere
* NO imports from freqtrade.strategy.interface
* NO imports from freqtrade.optimize.space
* stoploss, trailing_stop_positive, trailing_stop_positive_offset MUST be fixed float values
* Must include: populate_indicators, populate_entry_trend, populate_exit_trend

================================================================================
OUTPUT (Python code only):
"""
    return prompt

def extract_python_code(response_text: str) -> str:
    """AI 응답에서 Python 코드 추출"""
    
    # 코드 블록 제거
    cleaned = response_text.strip()
    
    # ```python ... ``` 형태 제거
    if '```python' in cleaned:
        match = re.search(r'```python\s*(.*?)\s*```', cleaned, re.DOTALL)
        if match:
            return match.group(1).strip()
    
    # ``` ... ``` 형태 제거
    if '```' in cleaned:
        match = re.search(r'```\s*(.*?)\s*```', cleaned, re.DOTALL)
        if match:
            return match.group(1).strip()
    
    # 코드 블록 없으면 그대로 반환
    return cleaned


def validate_strategy_code(code: str, strategy_name: str) -> tuple:
    """전략 코드 유효성 검사"""
    errors = []
    
    # 클래스 정의 확인
    if f"class {strategy_name}" not in code:
        errors.append(f"클래스 '{strategy_name}'이 정의되지 않았습니다")
    
    # IStrategy 상속 확인
    if "IStrategy" not in code:
        errors.append("IStrategy를 상속하지 않았습니다")
    
    # 필수 메서드 확인
    required_methods = ['populate_indicators', 'populate_entry_trend', 'populate_exit_trend']
    for method in required_methods:
        if f"def {method}" not in code:
            errors.append(f"필수 메서드 '{method}'가 없습니다")
    
    return len(errors) == 0, errors

def remove_non_ascii_from_comments(code: str) -> str:
    """주석에서 비-ASCII 문자 제거 (한글, 중국어, 일본어 등)"""
    lines = code.split('\n')
    cleaned_lines = []
    
    for line in lines:
        if '#' in line:
            # 문자열 리터럴 내부의 #은 제외
            in_string = False
            quote_char = None
            hash_idx = -1
            
            for i, char in enumerate(line):
                if char in ('"', "'") and (i == 0 or line[i-1] != '\\'):
                    if not in_string:
                        in_string = True
                        quote_char = char
                    elif char == quote_char:
                        in_string = False
                elif char == '#' and not in_string:
                    hash_idx = i
                    break
            
            if hash_idx != -1:
                code_part = line[:hash_idx]
                comment_part = line[hash_idx+1:]
                # 비-ASCII 문자 제거
                comment_cleaned = ''.join(c for c in comment_part if ord(c) < 128)
                if comment_cleaned.strip():
                    line = code_part + '#' + comment_cleaned
                else:
                    line = code_part.rstrip()
        
        cleaned_lines.append(line)
    
    return '\n'.join(cleaned_lines)

# ============================================
# API Endpoints
# ============================================

@router.get("/status")
def get_ai_status():
    """AI 서비스 상태 확인"""
    strategies = []
    if os.path.exists(STRATEGIES_DIR):
        strategies = [f.replace('.py', '') for f in os.listdir(STRATEGIES_DIR) 
                     if f.endswith('.py') and not f.startswith('__')]
    
    return {
        "available": api_key is not None,
        "model": "gemini-2.5-flash" if api_key else None,
        "strategies_dir": STRATEGIES_DIR,
        "strategies_found": strategies
    }


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_strategy(req: AnalyzeRequest):
    """전략 분석 및 피드백 생성"""
    
    if not api_key:
        raise HTTPException(
            status_code=503, 
            detail="Gemini API key not configured. Add GEMINI_API_KEY to .env file."
        )
    
    try:
        # 1. 전략 코드 로드
        strategy_code = load_strategy_code(req.strategy_name)
        print(f"[INFO] Loaded strategy: {req.strategy_name} ({len(strategy_code)} chars)")
        
        # 2. 프롬프트 생성
        prompt = build_analysis_prompt(strategy_code, req.backtest_stats)
        
        # 3. Gemini API 호출
        model = genai.GenerativeModel('gemini-2.5-flash')
        response = model.generate_content(prompt)
        
        print(f"[INFO] AI response received ({len(response.text)} chars)")
        
        # 4. 응답 파싱
        parsed = parse_ai_response(response.text)
        
        if not parsed:
            return AnalyzeResponse(
                success=False,
                error="Failed to parse AI response. Please try again."
            )
        
        return AnalyzeResponse(
            success=True,
            strategy_summary=parsed.get("strategy_summary"),
            failure_analysis=parsed.get("failure_analysis"),
            suggestions=parsed.get("suggestions")
        )
        
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        print(f"[ERROR] Analysis failed: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@router.get("/strategies")
def list_strategies():
    """사용 가능한 전략 파일 목록"""
    if not os.path.exists(STRATEGIES_DIR):
        return {"strategies": []}
    
    strategies = []
    for f in os.listdir(STRATEGIES_DIR):
        if f.endswith('.py') and not f.startswith('__'):
            strategies.append(f.replace('.py', ''))
    
    return {"strategies": strategies}

@router.post("/apply", response_model=ApplyResponse)
async def apply_suggestions(req: ApplyRequest):
    """선택된 제안을 적용하여 새 전략 파일 생성"""
    
    if not api_key:
        raise HTTPException(status_code=503, detail="Gemini API key not configured")
    
    # 전략 이름 유효성 검사
    if not req.new_strategy_name.isidentifier():
        return ApplyResponse(
            success=False,
            error="전략 이름은 영문자, 숫자, 언더스코어만 사용 가능하며 숫자로 시작할 수 없습니다"
        )
    
    # 중복 이름 확인
    new_file_path = os.path.join(STRATEGIES_DIR, f"{req.new_strategy_name}.py")
    if os.path.exists(new_file_path):
        return ApplyResponse(
            success=False,
            error=f"전략 '{req.new_strategy_name}'이 이미 존재합니다. 다른 이름을 사용하세요."
        )
    
    try:
        # 1. 원본 전략 코드 로드
        original_code = load_strategy_code(req.original_strategy_name)
        print(f"[INFO] Loaded original strategy: {req.original_strategy_name}")
        
        # 2. 프롬프트 생성
        prompt = build_apply_prompt(original_code, req.selected_suggestions, req.new_strategy_name)
        
        # 3. Gemini API 호출
        model = genai.GenerativeModel('gemini-2.5-flash')
        response = model.generate_content(prompt)
        
        # 4. 코드 추출
        new_code = extract_python_code(response.text)
        print(f"[INFO] Generated new strategy code ({len(new_code)} chars)")
        
        # ★ 4.5 한글/비-ASCII 문자 제거 (안전장치) ★
        new_code = remove_non_ascii_from_comments(new_code)
        print(f"[INFO] Cleaned non-ASCII characters from comments")
        
        # 5. 코드 유효성 검사
        is_valid, errors = validate_strategy_code(new_code, req.new_strategy_name)
        if not is_valid:
            print(f"[WARN] Code validation failed: {errors}")
            # 유효성 검사 실패해도 일단 저장 (사용자가 수동 수정 가능)
        
        # 6. 파일 저장
        with open(new_file_path, 'w', encoding='utf-8') as f:
            f.write(new_code)
        
        print(f"[INFO] Saved new strategy: {new_file_path}")
        
        return ApplyResponse(
            success=True,
            new_strategy_name=req.new_strategy_name,
            file_path=new_file_path
        )
        
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        print(f"[ERROR] Apply failed: {e}")
        import traceback
        traceback.print_exc()
        return ApplyResponse(
            success=False,
            error=f"전략 생성 실패: {str(e)}"
        )


@router.get("/strategy/{strategy_name}")
def get_strategy_code(strategy_name: str):
    """전략 코드 조회"""
    try:
        code = load_strategy_code(strategy_name)
        return {"strategy_name": strategy_name, "code": code}
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))