# 📈 Freqtrade Web Dashboard

Freqtrade(암호화폐 자동매매 봇)를 위한 **웹 기반 백테스팅 및 모니터링 대시보드**입니다.
터미널 명령어 없이 클릭만으로 전략을 백테스팅하고, 복잡한 결과 파일(JSON)을 직관적인 UI로 분석할 수 있습니다.

## ✨ 주요 기능 (Key Features)

* **📊 백테스팅 결과 시각화:** `user_data/backtest_results`에 저장된 결과들을 리스트 형태로 한눈에 확인.
* **📝 상세 분석 리포트:**
    * 순이익, 승률, MDD(최대 낙폭), 샤프 비율 등 핵심 지표 표시.
    * 손익비(Risk-Reward Ratio) 자동 계산.
    * 시작 원금 대비 최종 잔고 변동 확인.
* **▶️ 웹에서 백테스팅 실행:** 터미널을 열지 않고 전략 이름만 입력하여 백테스팅 수행 (로그 실시간 확인).
* **📱 반응형 UI:** React와 Tailwind CSS를 활용한 깔끔한 디자인 (다크/라이트 모드 호환 구조).

## 🛠 기술 스택 (Tech Stack)

* **Backend:** Python, FastAPI, Uvicorn
* **Frontend:** React, Vite, Tailwind CSS, Axios, Lucide-React
* **Core:** Freqtrade (Subprocess 연동)

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
