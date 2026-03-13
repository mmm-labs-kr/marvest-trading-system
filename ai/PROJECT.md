# Marvest Trading System - Project Context

---
## ⚠️ 작업 규칙
- 이 파일의 "User Goals" 섹션은 수정하지 말 것
- "Project Analysis" 섹션은 Gemini가 분석 후 작성/업데이트
- 코드 수정 전에 반드시 PLAN.md에 계획 먼저 기록
- 한 번에 하나의 Task만 수행
- 수정 후 변경된 파일 목록 보고
---

## 1. User Goals (수정 금지)

### 목표
1. 뒤죽박죽인 코드의 연결 구조, 파일 간 의존성, 설정을 정리
2. 새 기능 추가 아님. 기존 기능이 깔끔하게 동작하도록 개선
3. 내가 설명할 수 있을 정도로 프로젝트를 이해
4. 금융 데이터 분석 실험용 플랫폼으로 재활용 가능하도록

### 방향성
- 코드 정리 > 기능 추가
- 안정성 > 성능
- 이해 가능한 코드 > 고급 패턴

### 범위
- 새 기능 추가: ❌
- 코드 리팩토링: ✅
- 버그 수정: ✅
- 설정 오류 수정: ✅
- 불필요한 코드 제거: ✅
- 주석/문서 개선: ✅

## 2. Project Analysis (Gemini 작성 영역)

### 2.1 아키텍처 요약
- **Frontend**: React (Vite) 기반의 SPA로, Backend API와 통신하며 트레이딩 상태를 시각화하고 제어합니다.
- **Backend**: FastAPI 기반의 REST API 서버로, Freqtrade의 기능을 래핑하고 오케스트레이션합니다.
- **Freqtrade 통합**: 
    - **실행**: `subprocess`를 통해 Freqtrade CLI를 직접 호출하여 백테스트 및 트레이딩을 수행합니다.
    - **데이터 흐름**: 백테스트 결과는 ZIP 파일에서 읽어오며, 실전/모의 투자는 개별 SQLite (`tradesv3_{bot_id}.sqlite`) 파일을 통해 관리합니다.
    - **분석 알고리즘**: 자체적인 Monte Carlo 시뮬레이션과 점수 계산(Score Calculator) 엔진을 갖추고 있어 전략의 안정성을 평가합니다.
    - **AI 통합**: Google Gemini API를 사용하여 전략 코드 분석, 실패 원인 진단 및 코드 개선 제안을 수행합니다.

### 2.2 파일별 역할
- **Backend (FastAPI)**
    - `app/main.py`: 서버 진입점, CORS 설정 및 라우터 등록.
    - `api/endpoints/backtest.py`: 백테스트 실행, 결과 파싱, Monte Carlo 캐시 관리.
    - `api/endpoints/trading.py`: 봇 생성/삭제, 프로세스 제어(Start/Stop), 실시간 성과 및 신뢰 구간 침범 감시.
    - `api/endpoints/monte_carlo.py`: NumPy를 활용한 벡터화된 Monte Carlo 시뮬레이션 (파산 확률, 신뢰 구간 계산).
    - `api/endpoints/score_calculator.py`: 리스크 및 성과 지표 기반의 다단계 전략 점수 산출.
    - `api/endpoints/ai_feedback.py`: Gemini AI 기반의 전략 피드백 및 자동 코드 수정.
    - `api/endpoints/configs.py`: 전략 및 설정 파일 목록 조회.
    - `api/endpoints/auth.py`: TOTP 기반의 2단계 인증.
- **Data & Configuration**
    - `user_data/bots.json`: 현재 운영 중인 봇의 메타데이터 저장.
    - `user_data/strategies/`: Freqtrade 전략 파일(.py) 저장소.
    - `user_data/backtest_results/`: 백테스트 결과 파일(.json, .zip) 저장소.

### 2.3 파일 간 의존 관계
- **Frontend ↔ Backend**: REST API를 통한 양방향 통신 (Vite Proxy 사용).
- **Backend → Freqtrade**: 시스템 PATH의 `freqtrade` 명령어에 의존. `subprocess`로 실행.
- **Backend → Gemini API**: `GOOGLE_API_KEY` 환경변수와 `google-generativeai` 라이브러리에 의존.
- **내부 로직**: `backtest.py`와 `trading.py`는 분석의 일관성을 위해 `score_calculator.py`와 `monte_carlo.py`를 공통으로 참조.
- **데이터 구조**: 모든 봇 제어 로직은 `user_data/` 하위의 파일 구조(strategies, results, logs)에 강하게 결합됨.

### 2.4 발견된 문제점
1. **하드코딩된 경로**: `os.path.dirname(...).parent` 식의 복잡한 경로 계산이 여러 파일에 산재하여 유지보수가 어려움.
2. **프로세스 관리 취약성**: Windows 환경에서 `taskkill`을 사용한 강제 종료 방식은 불안정하며, 서버 재시작 시 실행 중인 프로세스 추적 정보(`running_processes`)가 유실됨.
3. **보안 설정 미흡**: CORS 설정이 `allow_origins=['*']`로 과도하게 개방되어 있으며, `auth.py`의 OTP 인증 후 세션/JWT 관리가 부재함.
4. **파일 시스템 기반 DB**: `bots.json`을 데이터베이스처럼 사용하고 있어 동시 수정 시 데이터 오염(Race Condition) 위험이 있음.
5. **로직 중복**: `get_latest_mc_for_strategy`와 같은 함수가 `backtest.py`와 `trading.py`에 중복 구현되어 있음.
6. **설정 오류**: `configs.py`에서 JSON 파일을 찾을 때 `.fson`이라는 오타를 검색하는 부분이 존재함.
7. **에러 핸들링 부족**: Freqtrade 실행 실패나 파일 파싱 오류 시 원시 예외 메시지를 그대로 반환하는 경우가 많음.

## 3. 기술 정보

### 실행 방법
```bash
# 백엔드 (포트 8000)
cd backend && uvicorn app.main:app --reload

# 프론트엔드 (포트 5173, proxy → 8000)
cd frontend && npm run dev
```

### 환경변수 (.env)
```
GOOGLE_API_KEY=xxx
OTP_SECRET_JS=xxx
OTP_SECRET_SB=xxx
```

### 핵심 규칙
- 프론트 5173 → vite proxy → 백엔드 8000
- Freqtrade는 subprocess로 호출, 결과는 파일로 소통
- 전략은 파일명 아닌 클래스명으로 식별