# 1. 베이스 이미지 설정 (파이썬 환경)
FROM python:3.11-slim

# 2. 필수 시스템 패키지 설치 (Freqtrade 의존성 및 한글 폰트 등 필요시)
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 3. 작업 디렉토리 설정
WORKDIR /app

# 4. 백엔드 의존성 설치
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# 5. 소스 코드 복사
# backend/app 폴더 전체를 컨테이너의 /app/backend/app 경로로 복사합니다.
COPY backend/app ./backend/app
COPY frontend/dist ./frontend/dist

# 6. 환경 변수 설정 (핵심 수정 사항)
# 파이썬이 /app/backend 폴더를 검색 경로에 추가하여 'app' 모듈을 찾을 수 있게 합니다.
ENV PYTHONPATH=/app/backend
ENV FRONTEND_DIST_PATH=/app/frontend/dist

# 7. 포트 개방 및 실행
EXPOSE 8000
# uvicorn 실행 시 모듈 경로를 정확히 지정합니다.
CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]