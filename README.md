# Marvest Trading System

Marvest는 AI 기반의 암호화폐 자동매매 전략 최적화 및 리스크 관리 플랫폼입니다. Freqtrade의 강력한 백테스팅 엔진과 Google Gemini AI의 전략 분석 능력, 그리고 통계적 몬테카를로 시뮬레이션을 통합하여 데이터 기반의 전략 개발 워크플로우를 제공합니다.

## 프로젝트 개요

단순한 매매 실행을 넘어, 트레이딩 전략의 취약점을 진단하고 개선하는 **지속적 개선 루프(Continuous Improvement Loop)** 구축을 목표로 합니다. LLM(Large Language Model)을 통한 코드 수준의 정성적 분석과 통계적 시뮬레이션을 통한 정량적 리스크 평가를 결합하여 안정적인 투자 의사결정을 돕습니다.

## 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────────────┐
│                         AWS EC2 (t3.micro)                          │
│                         Docker Compose                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐          REST API         ┌──────────────────┐   │
│  │  Frontend    │◄─────────────────────────►│    Backend       │   │
│  │              │                           │                  │   │
│  │  React       │   /api/backtest           │    FastAPI       │   │
│  │  + Vite      │   /api/ai                 │    + uvicorn     │   │
│  │  + Tailwind  │   /api/trading            │                  │   │
│  │  + Recharts  │                           └────────┬─────────┘   │
│  └──────────────┘                                    │             │
│                                          ┌───────────┼────────┐    │
│                                          ▼           ▼        ▼    │
│                                    ┌──────────┐ ┌──────┐ ┌────────┐│
│                                    │Freqtrade │ │SQLite│ │ Gemini ││
│                                    │  Engine  │ │  DB  │ │  API   ││
│                                    └──────────┘ └──────┘ └────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

## 주요 기능

### 1. 전략 분석 및 자동 개선 (AI Feedback)
- **전략 진단**: Gemini 2.5-Flash 모델이 백테스트 통계와 소스코드를 분석하여 로직의 취약점 파악.
- **자동 코드 생성**: 분석된 페인 포인트를 해결할 수 있는 개선된 전략 코드를 자동으로 생성 및 제안.

### 2. 정량적 리스크 평가 (M-Score & Monte Carlo)
- **M-Score 시스템**: MDD, 복구 기간, 수익 요인 등에 가중치(리스크 67%, 성과 33%)를 부여하여 전략 등급(S~C) 산출.
- **몬테카를로 시뮬레이션**: 5,000회 이상의 반복 시뮬레이션을 통해 파산 확률(Ruin Probability) 및 95% 신뢰 구간 계산.

### 3. 안정적인 봇 운영 및 모니터링
- **실시간 리스크 감시**: 모의 투자 시 신뢰 구간 이탈 여부를, 실전 투자 시 Rolling MDD 초과 여부를 실시간 추적.
- **프로세스 제어**: Windows와 Linux 환경을 모두 지원하는 안정적인 봇 시작/종료 및 상태 동기화.

## 시스템 품질 개선 (최근 리팩토링 성과)

프로젝트의 안정성과 확장성을 위해 다음과 같은 아키텍처 개선을 수행하였습니다.

- **중앙 집중식 설정 관리**: 모든 파일 경로와 환경 변수를 `app.core.config` 모듈로 통합하여 유지보수성 향상.
- **OS 호환성 확보**: `ctypes`를 활용한 프로세스 추적 로직을 도입하여 Windows와 Linux 환경에서 동일하게 안정적인 봇 제어 가능.
- **에러 핸들링 표준화**: 커스텀 예외 클래스(`MarvestException`)와 전역 처리기를 도입하여 API 응답 형식을 통일.
- **데이터 무결성 보장**: `bots.json` 수정 시 Thread Lock과 원자적 쓰기(Atomic Write) 패턴을 적용하여 동시성 이슈 및 파일 오염 방지.
- **코드 안정성**: 핵심 로직 전체에 Python Type Hint를 적용하고 상세한 문서화(Docstring) 완료.

## 기술 스택

### Backend
- **Framework**: FastAPI (Python 3.12+)
- **Core Engine**: Freqtrade
- **AI Integration**: Google Gemini 2.5-Flash API
- **Data Analysis**: NumPy, Pandas
- **Persistence**: SQLite (Trade logs), JSON (Bot metadata)

### Frontend
- **Framework**: React 19 (Vite)
- **Styling**: Tailwind CSS 4
- **Visualization**: Recharts

## 시작하기

### 사전 요구 사항
- Python 3.12 이상
- Node.js 18 이상
- Freqtrade 설치 및 시스템 PATH 등록
- Gemini API Key ([Google AI Studio](https://aistudio.google.com/app/apikey)에서 발급)

### 설치 및 환경 설정

1. **저장소 클론**
   ```bash
   git clone https://github.com/mmm-labs-kr/marvest-trading-system.git
   cd marvest-trading-system
   ```

2. **환경 변수 설정**
   루트 디렉토리에 `.env` 파일을 생성하고 아래 내용을 작성합니다.
   ```ini
   GOOGLE_API_KEY=발급받은_API_키
   OTP_SECRET=인증용_OTP_시크릿
   ALLOWED_ORIGINS=http://localhost:5173
   ```

### 실행 방법

1. **백엔드 서버 실행**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   pip install -r requirements.txt
   uvicorn app.main:app --reload
   ```

2. **프론트엔드 개발 서버 실행**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## 워크플로우

1. **전략 개발**: `user_data/strategies/` 폴더에 전략 파일(`.py`)을 작성합니다.
2. **백테스트**: 웹 UI에서 전략과 기간을 선택하여 백테스트를 수행하고 **M-Score** 등급을 확인합니다.
3. **AI 피드백**: 'AI 분석' 요청을 통해 전략의 취약점을 파악하고 개선 제안을 검토합니다.
4. **전략 최적화**: 선택한 제안을 적용하여 자동으로 생성된 새로운 버전의 전략을 확보합니다.
5. **운영 및 감시**: 최적화된 전략으로 봇을 생성하고, 실시간 리스크 지표를 모니터링하며 운용합니다.

## 면책 조항

본 시스템은 교육 및 실험적인 목적으로 제작되었습니다. 암호화폐 거래는 원금 손실의 위험이 매우 크며, 시스템이 제공하는 점수나 분석 결과는 투자 권유가 아닙니다. 모든 투자의 결과에 대한 책임은 투자자 본인에게 있습니다.
