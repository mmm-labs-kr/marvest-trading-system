# TASK-016: UI/UX 테마 완결 및 레이아웃 오류 수정

## 1. 목적
- 미반영된 페이지(모의투자, 실전투자)에 Option B(Dark Stealth) 테마를 완전 적용.
- 몬테카를로 상세 분석 모달의 화면 잘림(Overflow) 및 레이아웃 오류 수정.
- 전체 UI의 한국어화 완성 및 시각적 일관성 검증.

## 2. 상세 문제점 및 해결 방안

### 2.1 몬테카를로 섹션 레이아웃 수정
- **현상**: 모달 창이 화면 밖으로 벗어나거나 내부 차트가 잘림.
- **해결**: 
    - 모달 외부 컨테이너에 `max-h-[90vh]` 및 `overflow-y-auto` 적용.
    - 차트 컨테이너의 반응형 높이(`aspect-ratio` 등) 조정.
    - 패딩 및 마진 최적화로 모바일/데스크탑 대응.

### 2.2 모의/실전 투자 페이지 테마 적용
- **파일**: `PaperTrading.jsx`, `LiveTrading.jsx`
- **해결**:
    - 기존의 녹색/검정 테마를 삭제하고 `stealth-bg`, `glass-card` 스타일 적용.
    - 텍스트 한국어화 (Status, Start, Stop 등).

### 2.3 전체 UI 한글화 최종 점검
- 기술 지표(MDD, ROI 등)를 제외한 모든 사용자 인터페이스 텍스트를 정석적인 한국어로 교체.

## 3. 작업 파일
- `frontend/src/components/MonteCarloSection.jsx`
- `frontend/src/components/PaperTrading.jsx`
- `frontend/src/components/LiveTrading.jsx`

## 4. 테스트 계획
1. 몬테카를로 분석 버튼 클릭 시 모달이 화면 중앙에 안정적으로 표시되는지 확인.
2. 모의/실전 투자 메뉴 진입 시 메인 대시보드와 동일한 테마가 유지되는지 확인.
3. 스크롤이 필요한 경우 모달 내부에서 정상적으로 동작하는지 확인.
