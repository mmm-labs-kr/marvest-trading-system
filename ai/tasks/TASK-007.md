# TASK-007: trading.py OS 호환성 및 프로세스 관리 개선

## 1. 목적
- Windows/Linux 환경 모두에서 봇을 제어할 수 있도록 OS 호환성 확보.
- 서버 재시작 시에도 실행 중인 봇의 상태를 유지할 수 있도록 프로세스 정보(PID) 영속화.

## 2. 상세 변경 사항

### 2.1 OS 호환성 (종료 로직)
- 기존: `subprocess.run(["taskkill", ...])` (Windows 전용)
- 변경: `os.kill(pid, signal.SIGTERM)` (범용 파이썬 라이브러리) 사용.
- 비정상 종료를 대비하여 `SIGKILL` 핸들링 추가.

### 2.2 프로세스 정보 영속화
- 봇 시작 시 `bots.json`에 `pid` 저장.
- 서버 시작 시(또는 `list_bots` 호출 시) 저장된 `pid`를 통해 실제 프로세스가 살아있는지 확인.
- `running_processes` 전역 변수를 파일 데이터와 동기화.

### 2.3 헬퍼 함수 추가
- `is_process_running(pid)`: 특정 PID를 가진 프로세스가 실제로 살아있는지 확인하는 범용 함수.

## 3. 작업 파일
- `backend/app/api/endpoints/trading.py`

## 4. 테스트 계획
1. 봇 실행 후 `bots.json`에 PID가 저장되는지 확인.
2. 서버(uvicorn) 재시작 후에도 봇 상태가 `RUNNING`으로 유지되는지 확인.
3. 봇 중지 시 프로세스가 실제로 종료되는지 확인 (작업 관리자/ps 명령어로 검증).
