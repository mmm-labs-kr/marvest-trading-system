# TASK-009: bots.json 동시성 제어 방안 검토 (Locking)

## 1. 목적
- 여러 API 요청이 동시에 `bots.json` 파일을 읽고 쓸 때 발생할 수 있는 데이터 유실 및 오염(Race Condition) 방지.
- 파일 기반 DB의 한계를 보완하여 시스템 안정성 향상.

## 2. 상세 변경 사항

### 2.1 동시성 문제 분석
- `load_bots_data()`와 `save_bots_data()` 사이의 시간 간격 동안 다른 요청이 파일을 수정하면 데이터가 덮어씌워질 위험이 있음.
- 특히 봇 생성(`create_bot`), 삭제(`delete_bot`), 상태 업데이트(`start_bot`, `stop_bot`) 작업이 겹칠 때 위험함.

### 2.2 해결 방안
- **메모리 락 (threading.Lock)**: 단일 프로세스 내에서 스레드 간 동기화 보장.
- **파일 락 (Atomic Write)**: 임시 파일에 먼저 쓰고 이름을 바꾸는(Rename) 방식으로 쓰기 작업의 원자성 확보.
- (검토) 프로젝트 규모상 외부 라이브러리 없이 표준 라이브러리(`threading`)를 사용한 락킹을 우선 적용.

### 2.3 구현 계획
- `trading.py`에 `bots_file_lock = threading.Lock()` 추가.
- `load_bots_data()` 및 `save_bots_data()`를 호출하는 비즈니스 로직 영역을 `with bots_file_lock:`으로 보호.
- 또는 `load`와 `save`를 포함한 전체 트랜잭션을 락으로 감싸도록 리팩토링.

## 3. 작업 파일
- `backend/app/api/endpoints/trading.py`

## 4. 테스트 계획
1. 짧은 시간 내에 여러 개의 봇 생성 요청을 동시에 보냈을 때 `bots.json`에 모든 봇이 누락 없이 저장되는지 확인.
2. 봇 상태 업데이트와 삭제가 동시에 일어날 때 에러 없이 순차적으로 처리되는지 확인.
