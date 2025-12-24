# 프로젝트 명: MMM

## 1. 개요

### 1.1. 프로젝트 목표

이 프로젝트는 이용하여 사용자가 사전에 등록한 전략으로 자동 매매 봇을 구현하는 것을 목표로 함

- 사용자는 감정을 배제하고 뇌동매매가 아닌 매매를 함으로써 적절한 수입을 창출 가능
- TP/SL 을 기본적으로 설정하여 안정적인 수입 창출 가능
- 하지만 큰 수익(인생 성공)은 기대하는 것이 불가능

---

## 2. 주요 기능

### 2.1. 백테스팅 자동화 및 결과 분석

- **원클릭 백테스팅 실행:** 터미널 명령어 없이, UI에서 전략 이름만 입력하면 백테스팅 수행.
- **실시간 로그 확인:** 실행 중인 백테스팅 프로세스의 로그를 모달창에서 실시간 모니터링.
- **이력 관리:** 과거 실행한 백테스팅 결과 파일(`user_data/backtest_results`)을 자동으로 목록화하여 관리.
- **상세 분석 리포트:**
    - 기본 지표: 승률, 총 거래 횟수, 순이익.
    - 리스크 지표: MDD, 샤프 비율, 손익비 자동 계산.
    - 자산 변동: 시작 원금 대비 최종 금액 및 총 수익률(CAGR 포함) 표시.

### 2.2. 모의투자/실전투자 모니터링

- **봇 제어:** 웹에서 봇 프로세스 시작/중지/재시작 제어.
- **실시간 대시보드:** 현재 보유 중인 자산, 오픈된 거래(Open Trades), 실시간 수익률 조회.
- **거래 로그:** 체결 내역 및 봇 상태 로그 실시간 조회.

---

## 3. 기술 스택

| **구분** | **기술** | **설명** |
| --- | --- | --- |
| **Frontend** | **React** (Vite) | 빠르고 반응성 높은 SPA(Single Page Application) 구축 |
|  | **Tailwind CSS** | 유틸리티 퍼스트 CSS 프레임워크로 모던한 UI 디자인 구현 |
|  | **Axios** | 백엔드 API와의 비동기 통신 처리 |
| **Backend** | **Python FastAPI** | 고성능 비동기 API 서버 구축 |
|  | **Subprocess** | Freqtrade CLI 명령어를 제어하고 실행 결과 캡처 |
|  | **Pydantic** | 엄격한 데이터 유효성 검사 및 타입 관리 |
| **Core** | **Freqtrade** | 암호화폐 알고리즘 트레이딩 엔진 |

---

## 4. 현재 진행 상황 (Current Status)

### 4.1. 개발 완료 (백테스팅 시스템)

- [x]  **프로젝트 환경 구축:** Vite(React) + FastAPI 연동 및 Proxy 설정 완료.
- [x]  **백테스팅 목록 조회:** 결과 폴더의 JSON/ZIP 파싱 및 요약 리스트 UI 구현.
- [x]  **백테스팅 상세 조회:** 승률, 손익비, MDD 등 핵심 지표 계산 로직 구현 및 상세 페이지 디자인.
- [x]  **백테스팅 실행 기능:** 프론트엔드에서 전략명을 입력받아 백엔드 `subprocess`로 Freqtrade 실행 및 로그 연동.

### 4.2. 개발 진행 중 (모의투자 시스템)

- [ ]  **프로세스 매니저:** 백그라운드에서 봇(Dry-run)을 실행하고 관리하는 기능 설계 중.
- [ ]  **DB 연동:** `tradesv3.sqlite` 데이터베이스를 읽어 실시간 거래 내역 조회 API 개발 예정.

### 4.3. 향후 계획

- [ ]  **실전 투자 모드:** API Key 보안 처리 및 실전 매매 제어 기능.
- [ ]  **차트 시각화:** Recharts를 활용한 자산 누적 수익률 그래프(Equity Curve) 구현.

→ 메인 화면을 만들어 모든 봇 현황(수익률, 거래 횟수, on/off 여부 등)을 시각화해서 볼 수 있게 구현

## 📂 폴더 구조 (Directory Structure)

이 프로젝트는 Freqtrade 루트 디렉토리 내에 위치하는 것을 권장합니다.

freqtrade-dashboard/
├── user_data/              # Freqtrade 설정 및 전략, 결과 데이터
│   ├── strategies/         # 전략 파일 (.py)
│   ├── backtest_results/   # 결과 파일 (.zip, .json)
│   └── config.json         # 설정 파일
├── backend/                # FastAPI 서버
│   ├── app/
│   │   ├── main.py
│   │   └── backtest.py
│   └── requirements.txt
└── frontend/               # React 클라이언트
    ├── src/
    ├── public/
    └── vite.config.js


## 설치 및 실행 방법 (Getting Started)

1. 사전 요구사항 (Prerequisites)
Python 3.8 이상
Node.js 16 이상
Freqtrade가 설치되어 있어야 함

2. 프로젝트 클론 (Clone)

git clone [https://github.com/your-username/freqtrade-dashboard.git](https://github.com/your-username/freqtrade-dashboard.git)
cd freqtrade-dashboard

3. 백엔드 설정 (Backend Setup)

1. 백엔드 폴더로 이동
cd backend

2. 가상환경 활성화 (Freqtrade 가상환경 사용 권장)
source ../.venv/bin/activate  # Mac/Linux
또는
..\.venv\Scripts\activate     # Windows

3. 필수 패키지 설치
pip install fastapi uvicorn pydantic

4. 프론트엔드 설정 (Frontend Setup)
새로운 터미널을 열고 진행하세요.

1. 프론트엔드 폴더로 이동
cd frontend

2. 패키지 설치
npm install
▶️ 실행하기 (Running the App)
서버와 클라이언트를 각각 다른 터미널에서 실행해야 합니다.

터미널 1: 백엔드 실행 (Backend)
cd backend
uvicorn app.main:app --reload
실행 성공 시: [http://127.0.0.1:8000](http://127.0.0.1:8000)

터미널 2: 프론트엔드 실행 (Frontend)
cd frontend
npm run dev
실행 성공 시: http://localhost:5173
이제 브라우저에서 http://localhost:5173 으로 접속하면 대시보드를 사용할 수 있습니다!

⚙️ 설정 (Configuration)
포트 변경: 백엔드 포트가 8000이 아닌 경우 frontend/vite.config.js의 proxy 설정을 수정하세요.

전략 폴더: 백엔드는 상위 폴더의 user_data를 참조합니다. 경로가 다르다면 backend/app/backtest.py의 BASE_DIR 설정을 변경하세요.
