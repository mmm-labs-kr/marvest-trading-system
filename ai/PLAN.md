# Marvest 작업 계획서

## 현재 상태
- 단계: Phase 6 진행 중 (IDE 고도화 및 보안 강화)
- 마지막 완료 작업: Phase 5 완료 (전략 관리 IDE 시스템 기초 구현)
- 다음 작업: Phase 6 - Task 20 (UI 애니메이션 정리 및 통일)

---

## Phase 1: 설정 및 연결 구조 수정
| # | Task | 규모 | 상태 | 상세파일 |
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
| 8 | 에러 응답 형식 및 예외 처리 강화 | 중 | ✅ | TASK-008.md |
| 9 | `bots.json` 동시성 제어 방안 검토 (Locking) | 중 | ✅ | TASK-009.md |
| 10 | 불필요한 import 및 미사용 코드 제거 | 소 | ✅ | TASK-010.md |

## Phase 3: 문서화 및 최종 점검
| # | Task | 규모 | 상태 | 상세파일 |
|---|------|------|------|----------|
| 11 | 주요 함수 docstring 및 타입 힌트 보강 | 소 | ✅ | `monte_carlo.py`, `score_calculator.py`, `trading.py` |
| 12 | README 최종 업데이트 (설치 및 실행 가이드) | 소 | ✅ | 루트 `README.md` |

## Phase 4: UI/UX 디자인 테마 및 로컬라이제이션
| # | Task | 규모 | 상태 | 상세파일 |
|---|------|------|------|----------|
| 13 | 디자인 테마 시안 적용 (Option A: Cyber Blue) | 중 | ✅ | `index.css`, `App.jsx`, `BacktestList.jsx`, `BacktestDetail.jsx`, `AIFeedbackSection.jsx` |
| 14 | 디자인 테마 시안 적용 (Option B: Dark Stealth) | 중 | ✅ | `index.css`, `App.jsx`, `BacktestList.jsx`, `BacktestDetail.jsx`, `AIFeedbackSection.jsx` |
| 15 | 디자인 테마 시안 적용 (Option C: Vivid Neon) | 중 | ✅ | `index.css`, `App.jsx`, `BacktestList.jsx`, `BacktestDetail.jsx`, `AIFeedbackSection.jsx` |
| 16 | UI 텍스트 한글화 및 시안 B 최종 확정 및 레이아웃 수정 | 소 | ✅ | 모든 컴포넌트, TASK-016.md |

## Phase 5: 전략 관리 IDE 시스템 구현 및 고도화
| # | Task | 규모 | 상태 | 상세파일 |
|---|------|------|------|----------|
| 17 | 전략 파일 CRUD 백엔드 API 보강 (검증 로직 추가) | 중 | ✅ | `configs.py` |
| 18 | 전략 에디터 UI 버그 수정 및 개선 (X 아이콘, 실행 버튼) | 소 | ✅ | `StrategyEditor.jsx` |
| 19 | 에디터-백테스트 연동 (쿼리 파라미터 자동 바인딩) | 중 | ✅ | `StrategyEditor.jsx`, `BacktestList.jsx` |

## Phase 6: 통합 IDE 환경 및 보안 강화
| # | Task | 규모 | 상태 | 상세파일 |
|---|------|------|------|----------|
| 20 | UI 애니메이션 정리 및 통일 (출렁임 제거) | 소 | 🔄 | `App.jsx`, `BacktestList.jsx` 등 |
| 21 | OTP 허용 오차 확대 및 JWT 기반 세션 유지 | 중 | ⬜ | `auth.py`, `Login.jsx` |
| 22 | 전략 에디터 내 백테스트 히스토리 통합 (IDE화) | 대 | ⬜ | `StrategyEditor.jsx` |
| 23 | AI 분석 결과 반영 후 에디터 자동 로드 흐름 개선 | 중 | ⬜ | `AIFeedbackSection.jsx`, `StrategyEditor.jsx` |

---

## 디버깅 로그

### 해결됨
- [x] 프로젝트 구조 분석 및 의존성 파악 (`PROJECT.md`)
- [x] vite rewrite가 /api 제거 → 404 (rewrite 삭제로 해결)
- [x] 백테스트 No data → download-data 필요
- [x] Strategy not found → 클래스명으로 입력해야 함
- [x] 모든 백엔드 엔드포인트의 하드코딩된 경로를 `app.core.config`로 통합
- [x] `get_latest_mc_for_strategy` 로직을 `monte_carlo.py`로 일원화
- [x] `is_process_running` OS 호환성 개선 (Windows ctypes 사용)
- [x] 전역 예외 처리기 도입 및 에러 응답 형식 통일
- [x] `bots.json`에 대한 Thread Lock 및 Atomic Write 적용
- [x] 주요 로직 함수에 Python Type Hint 및 Docstring 보강
- [x] 전략 파일명 보안 검증 (Path Traversal 방지 및 정규표현식 검증)
- [x] 전략 에디터와 백테스트 페이지 간의 유기적 연동 (Run Backtest 버튼)

---

## 상태 범례
⬜ 대기 | 🔄 진행중 | ✅ 완료 | ❌ 보류
