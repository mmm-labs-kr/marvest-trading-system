# --- 1단계: 프론트엔드 빌드 ---
FROM node:18-slim AS build-stage
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build  # dist 폴더 생성

# --- 2단계: 최종 실행 이미지 (Python) ---
FROM python:3.11-slim
WORKDIR /app

# 시스템 의존성 설치
RUN apt-get update && apt-get install -y \
    build-essential curl && rm -rf /var/lib/apt/lists/*

# 백엔드 설치
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# 빌드 결과물 및 소스 복사
COPY --from=build-stage /app/frontend/dist ./frontend/dist
COPY backend/app ./backend/app

# 실행 설정
ENV PYTHONPATH=/app/backend
ENV FRONTEND_DIST_PATH=/app/frontend/dist
CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]