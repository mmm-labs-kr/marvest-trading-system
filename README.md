# 📊 Marvest Trading System

## AI 기반 암호화폐 자동매매 전략 최적화 플랫폼

> **Freqtrade** 백테스팅 + **Gemini AI** 전략 분석 + **몬테카를로** 리스크 평가를 통합한 올인원 트레이딩 시스템

---

## 🎯 프로젝트 개요

**Marvest**는 단순한 자동매매 시스템을 넘어, **AI가 백테스트 결과를 분석하고 개선된 전략을 자동 생성**하는 플랫폼입니다.

### 핵심 차별점

| 기능 | 설명 |
|------|------|
| 🤖 **AI 전략 개선** | Gemini 2.5-Flash가 백테스트 결과를 분석해 문제점을 진단하고 개선안 제시 |
| 📈 **M-Score 시스템** | 리스크(67%) + 성과(33%) 가중치 기반 전략 평가 (S~C 등급) |
| 🎲 **몬테카를로 분석** | 5,000회 시뮬레이션으로 파산 확률 및 95% 신뢰구간 계산 |
| 🔍 **실시간 리스크 감지** | 모의투자 시 신뢰구간 이탈, 실전투자 시 Rolling MDD 초과 경고 |

---

## 🏗️ 시스템 아키텍처

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

---

## ✨ 주요 기능

### 1️⃣ 백테스팅 & AI 분석

```
전략 선택 → 백테스트 실행 → AI 분석 → 개선안 적용 → 새 전략 생성
     ▲                                                        │
     └────────────────────────────────────────────────────────┘
                         반복 개선 루프
```

- **원클릭 백테스트**: UI에서 전략 선택만으로 Freqtrade 실행
- **M-Score 자동 계산**: 
  - **Phase 1 (67%)**: MDD, 복구기간, 보유시간
  - **Phase 2 (33%)**: 칼마 비율, 소르티노 비율
  - **필터링**: 최소 거래 수(150회), 기대 수익(0.5%), MC 파산 확률(0%)
- **AI 피드백**:
  - 전략 구조 요약 (사용 지표, 진입/청산 로직)
  - 문제점 분석 (high/medium/low 심각도)
  - 구체적 개선안 제시 (코드 힌트 포함)

### 2️⃣ 몬테카를로 시뮬레이션

- **파산 확률**: 자산이 원금 50% 미만 떨어질 확률 (5,000회 시뮬레이션)
- **신뢰 구간**: 각 거래 시점별 97.5%, 50%, 2.5% 퍼센타일
- **MDD 분포**: 최악/평균 MDD 산출

### 3️⃣ 모의투자 (Paper Trading)

- **신뢰구간 이탈 감지**: 현재 equity가 백테스트 MC 범위를 벗어나면 경고
- **실시간 대시보드**: 수익률, 승률, 활성 거래 현황
- **거래 로그**: 최근 50건 거래 내역 및 누적 수익

### 4️⃣ 실전투자 (Live Trading)

- **Rolling MDD 모니터링**: 최근 30거래 MDD가 백테스트 상위 5% MDD 초과 시 경고
- **봇 관리**: 웹 UI에서 시작/중지/삭제
- **리스크 상태**: NORMAL / WARNING / DANGER 단계별 표시

---

## 📁 프로젝트 구조

```
marvest-trading-system/
├── backend/
│   ├── app/
│   │   ├── main.py                     # FastAPI 앱 진입점
│   │   ├── api/endpoints/
│   │   │   ├── backtest.py             # 백테스트 실행 및 결과 조회
│   │   │   ├── ai_feedback.py          # Gemini AI 분석/전략 생성
│   │   │   ├── trading.py              # 봇 관리 및 모니터링
│   │   │   ├── monte_carlo.py          # MC 시뮬레이션 로직
│   │   │   ├── score_calculator.py     # M-Score 계산
│   │   │   └── auth.py                 # OTP 인증
│   │   └── schemas/
│   │       └── backtest.py             # Pydantic 모델
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── BacktestList.jsx        # 백테스트 결과 목록
│   │   │   ├── BacktestDetail.jsx      # 상세 분석 페이지
│   │   │   ├── AIFeedbackSection.jsx   # AI 분석 결과 UI
│   │   │   ├── MonteCarloSection.jsx   # MC 차트 시각화
│   │   │   ├── PaperTrading.jsx        # 모의투자 대시보드
│   │   │   └── LiveTrading.jsx         # 실전투자 대시보드
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
│
├── user_data/                           # Freqtrade 데이터
│   ├── strategies/                      # 전략 파일 (.py)
│   ├── backtest_results/                # 백테스트 결과 (.zip)
│   ├── mc_results/                      # MC 결과 캐시 (.json)
│   ├── databases/                       # 봇별 SQLite DB
│   ├── config.json                      # 백테스트/모의투자 설정
│   └── config_live.json                 # 실전투자 설정
│
├── docker-compose.yml
├── Dockerfile
└── .github/workflows/deploy.yml         # CI/CD
```

---

## 🛠️ 기술 스택

### Backend
| 기술 | 용도 |
|------|------|
| FastAPI | 고성능 비동기 API 서버 |
| Freqtrade | 암호화폐 백테스팅/자동매매 엔진 |
| google-generativeai | Gemini 2.5-Flash API 연동 |
| NumPy/Pandas | 몬테카를로 시뮬레이션 및 통계 분석 |
| SQLite | 봇별 거래 데이터 저장 |

### Frontend
| 기술 | 용도 |
|------|------|
| React 19 | UI 라이브러리 |
| Vite | 빠른 빌드 도구 |
| Tailwind CSS 4 | 유틸리티 퍼스트 스타일링 |
| Recharts | 차트 시각화 |
| Axios | HTTP 클라이언트 |

### Infrastructure
| 기술 | 용도 |
|------|------|
| Docker Compose | 멀티 컨테이너 오케스트레이션 |
| AWS EC2 t3.micro | 배포 서버 (스왑 메모리 활용) |
| GitHub Actions | CI/CD 파이프라인 |

---

## 🚀 설치 및 실행

### 사전 요구사항

- Python 3.8+
- Node.js 16+
- Freqtrade 설치
- Gemini API Key ([Google AI Studio](https://aistudio.google.com/app/apikey)에서 발급)

### 1️⃣ 저장소 클론

```bash
git clone https://github.com/your-username/marvest-trading-system.git
cd marvest-trading-system
```

### 2️⃣ 환경 변수 설정

루트 디렉토리에 `.env` 파일 생성:

```
GOOGLE_API_KEY=your_gemini_api_key_here
OTP_SECRET_JS=your_otp_secret_for_auth
```

### 3️⃣ 백엔드 실행

```bash
cd backend

# 가상환경 생성 (선택)
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 의존성 설치
pip install -r requirements.txt

# 서버 실행
uvicorn app.main:app --reload
```

✅ 확인: http://127.0.0.1:8000

### 4️⃣ 프론트엔드 실행

새 터미널에서:

```bash
cd frontend
npm install
npm run dev
```

✅ 확인: http://localhost:5173

### 🐳 Docker로 실행 (권장)

```bash
docker compose up -d --build
```

---

## 📊 API 엔드포인트

### Backtest
| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/backtest/run` | 백테스트 실행 |
| GET | `/api/backtest/results` | 결과 목록 (M-Score 포함) |
| GET | `/api/backtest/results/{filename}` | 상세 결과 + MC 데이터 |

### AI Feedback
| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/ai/analyze` | 백테스트 결과 AI 분석 |
| POST | `/api/ai/apply` | 개선안 적용 → 새 전략 생성 |
| GET | `/api/ai/strategies` | 전략 파일 목록 |

### Trading
| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/trading/bots` | 봇 생성 |
| POST | `/api/trading/start` | 봇 시작 |
| POST | `/api/trading/stop` | 봇 중지 |
| GET | `/api/trading/status?bot_id=` | 봇 현황 조회 |
| GET | `/api/trading/analysis/{bot_id}` | MC 비교 분석 |

---

## 📈 사용 워크플로우

### 전략 개선 사이클

1. **백테스트 실행** - 전략 선택 후 실행
2. **M-Score 확인** - S~C 등급 확인
3. **AI 분석 요청** - 문제점 + 개선안 생성
4. **개선안 적용** - 원하는 제안 선택
5. **새 전략 생성** - `NewStrategy_vX.py` 자동 생성
6. **반복** - 1번으로 돌아가 테스트

### 투자 실행

1. **봇 생성** - 백테스트 결과 선택 (MC 기준값 연결)
2. **모의투자** - 신뢰구간 이탈 모니터링
3. **실전투자** - Rolling MDD 모니터링

---

## 🐛 알려진 이슈

- AI가 생성한 전략에 가끔 문법 오류 포함 (수동 수정 필요)
- 프롬프트 최적화 진행 중 (개선안 품질 향상 목표)