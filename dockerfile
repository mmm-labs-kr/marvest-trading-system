# Python 3.10 (Freqtrade 권장)
FROM python:3.10-slim

# 작업 디렉토리
WORKDIR /app

# 1. 시스템 패키지 설치 (TA-Lib 빌드를 위한 필수 도구)
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    git \
    wget \
    && rm -rf /var/lib/apt/lists/*

# 2. TA-Lib C 라이브러리 설치 (이게 없으면 pip install ta-lib에서 에러 남)
RUN wget http://prdownloads.sourceforge.net/ta-lib/ta-lib-0.4.0-src.tar.gz && \
    tar -xvzf ta-lib-0.4.0-src.tar.gz && \
    cd ta-lib/ && \
    ./configure --prefix=/usr && \
    make && \
    make install && \
    cd .. && \
    rm -rf ta-lib ta-lib-0.4.0-src.tar.gz

# 3. 파이썬 라이브러리 설치
# requirements.txt에 적힌 패키지들을 설치 (의존성 자동 해결)
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# 4. 소스 코드 복사
COPY . .

# 5. 실행
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]