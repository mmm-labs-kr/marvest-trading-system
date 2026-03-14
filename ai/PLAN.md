# Marvest 작업 계획서

## 현재 상태
- 단계: Phase 2 진행 중 (코드 정리 및 로직 개선)
- 마지막 완료 작업: Phase 2 - Task 6 (중복 로직 통합: `get_latest_mc_for_strategy`)
- 다음 작업: Phase 2 - Task 7 (`trading.py` OS 호환성 및 프로세스 관리 개선)

---

## Phase 1: 설정 및 연결 구조 수정

| # # | Task | 규모 | 상태 | 상세파일 |
|---|------|------|------|----------|
| 1 | `configs.py`의 `.fson` 오타 수정 | 소 | ✅ | - |
| 2 | 하드코딩된 경로 중앙 집중화 (Config 모듈) | 중 | ✅ | `backend/app/core/config.py` |
| 3 | `main.py` 중복 mount 및 CORS 설정 정리 | 소 | ✅ | `backend/app/main.py` |
| 4 | `vite.config.js` proxy 설정 최종 확인 | 소 | ✅ | `frontend/vite.config.js` |
| 5 | `.env.example` 생성 및 환경변수 로드 방식 통일 | 소 | ✅ | 루트 `.env.example` |

## Phase 2: 코드 정리 및 로직 개선

| # | Task | 규모 | 상태 | 상세파일 |
|---|------|------|------|----------|
| 6 | 중복 로직(`get_latest_mc_for_strategy`) 통합 | 소 | ✅ | `backend/app/api/endpoints/monte_carlo.py` |
| 7 | `trading.py` OS 호환성 및 프로세스 관리 개선 | 중 | ✅ | TASK-007.md |
| 8 | 에러 응답 형식 및 예외 처리 강화 | 중 | ⬜ | TASK-008.md |
| 9 | `bots.json` 동시성 제어 방안 검토 (Locking) | 중 | ⬜ | - |
| 10 | 불필요한 import 및 미사용 코드 제거 | 소 | ⬜ | - |

## Phase 3: 문서화 및 최종 점검

| # | Task | 규모 | 상태 | 상세파일 |
|---|------|------|------|----------|
| 11 | 주요 함수 docstring 및 타입 힌트 보강 | 소 | ⬜ | - |
| 12 | README 최종 업데이트 (설치 및 실행 가이드) | 소 | ⬜ | - |

---

## 디버깅 로그

### 해결됨
- [x] 프로젝트 구조 분석 및 의존성 파악 (`PROJECT.md`)
- [x] vite rewrite가 /api 제거 → 404 (rewrite 삭제로 해결)
- [x] 백테스트 No data → download-data 필요
- [x] Strategy not found → 클래스명으로 입력해야 함
- [x] 모든 백엔드 엔드포인트의 하드코딩된 경로를 `app.core.config`로 통합
- [x] `get_latest_mc_for_strategy` 로직을 `monte_carlo.py`로 일원화

### 미해결
- [ ] taskkill Windows 전용 (Linux 배포 시 문제)
- [ ] 서버 재시작 시 실행 중인 프로세스 정보 유실

---

## 상태 범례
⬜ 대기 | 🔄 진행중 | ✅ 완료 | ❌ 보류