# TASK-008: 에러 응답 형식 및 예외 처리 강화

## 1. 목적
- 백엔드 API의 에러 응답 형식을 통일하여 프론트엔드에서의 에러 처리를 용이하게 함.
- 민감한 시스템 에러(raw exception)가 사용자에게 노출되지 않도록 방지.
- 로깅 시스템을 도입하여 에러 추적성 강화.

## 2. 상세 변경 사항

### 2.1 에러 응답 형식 통일
- 모든 에러 응답은 아래와 같은 JSON 형식을 따름:
  ```json
  {
    "status": "error",
    "code": "ERROR_CODE",
    "message": "사용자에게 보여줄 메시지",
    "detail": "디버깅용 상세 정보 (선택 사항, 개발 모드에서만 노출 권장)"
  }
  ```

### 2.2 전역 예외 처리기 (Global Exception Handler) 도입
- `app/main.py`에 `HTTPException` 및 일반 `Exception`을 처리하는 핸들러 등록.
- FastAPI의 기본 `HTTPException`을 가로채어 통일된 형식으로 변환.

### 2.3 커스텀 예외 클래스 정의
- `app/core/exceptions.py` 생성.
- `MarvestException` (Base class)
- `BotNotFoundException`, `StrategyNotFoundException`, `ConfigFileNotFoundException` 등 구체적인 에러 정의.

### 2.4 로깅 강화
- 에러 발생 시 서버 콘솔 또는 로그 파일에 스택 트레이스와 함께 기록.
- `logger.error()` 사용 습관화.

## 3. 작업 파일
- `backend/app/main.py` (전역 핸들러 등록)
- `backend/app/core/exceptions.py` (새로 생성)
- `backend/app/api/endpoints/*.py` (기존 `raise HTTPException` 수정)

## 4. 테스트 계획
1. 존재하지 않는 봇 ID로 요청 시 통일된 404 에러 형식이 반환되는지 확인.
2. 서버 내부 로직 오류 발생 시 500 에러와 함께 `status: error` 형식이 반환되는지 확인.
3. 로그 파일/콘솔에 에러 내용이 올바르게 기록되는지 확인.
