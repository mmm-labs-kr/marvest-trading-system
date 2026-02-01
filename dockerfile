# ===== 1단계: 프론트엔드 빌드 =====
FROM node:20-alpine AS frontend-builder

WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build


# ===== 2단계: 백엔드 설정 =====
FROM python:3.10-slim

WORKDIR /app

# 시스템 패키지 (TA-Lib용)
RUN apt-get update && apt-get install -y \
    build-essential curl git wget \
    && rm -rf /var/lib/apt/lists/*

# TA-Lib 설치
RUN wget http://prdownloads.sourceforge.net/ta-lib/ta-lib-0.4.0-src.tar.gz && \
    tar -xvzf ta-lib-0.4.0-src.tar.gz && \
    cd ta-lib/ && \
    ./configure --prefix=/usr && \
    make && make install && \
    cd .. && rm -rf ta-lib ta-lib-0.4.0-src.tar.gz

# 파이썬 패키지 설치
COPY backend/requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# 백엔드 소스 복사
COPY backend/ .

# 프론트엔드 빌드 결과 복사
COPY --from=frontend-builder /frontend/dist /app/frontend/dist

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]