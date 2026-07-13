# MeetCue Design Refactor Baseline

상태: **리팩터링 실행 계약**  
대상 브랜치: `codex/refactor-design-system`

## 1. 목표

현재 제품에서 의도적으로 잘된 흐름과 시각적 관계를 유지하면서, 누적 CSS와 여러 디자인 소스가 만든 우연한 결과를 MeetCue의 규칙으로 정상화한다.

리팩터링 성공은 현재 화면과 픽셀이 같은 상태가 아니다. 같은 사용자 과업이 더 일관된 토큰, 컴포넌트, 레이아웃 규칙으로 구현되고 시각적 결함이 재발하지 않는 상태다.

## 2. 기술 방향

- React와 Vite, 도메인 판정 로직과 테스트는 유지한다.
- Tailwind CSS는 레이아웃, 반응형, 상태 스타일링의 기본 수단으로 사용한다.
- shadcn/ui는 복사 가능한 범용 접근성 컴포넌트의 출발점으로 사용한다. 기본 테마를 완성 디자인으로 간주하지 않는다.
- React Aria는 캘린더·시간표처럼 복합 상호작용에서 유지할 수 있다.
- Sonner와 Lucide는 현재 역할을 유지한다.
- MeetCue 토큰은 `--mc-*` CSS 변수로 소유하고 Tailwind theme에 연결한다.
- ASTRYX는 새 코드에서 사용하지 않는다. reset과 theme import가 더 이상 필요하지 않은 시점에 의존성을 제거한다.
- 기존 `--tds-*` 변수는 마이그레이션 중 호환 alias로만 유지하고 마지막 화면 전환 후 제거한다.

## 3. 보존

- 생성 → 참석자 응답 → 주최자 판단 → 한 사람에게 재요청 → 재판정 → 확정의 핵심 흐름
- READY, PENDING, IMPOSSIBLE 판정과 후보 생성·선별 도메인 로직
- 결론을 먼저 보여주고 근거와 비교 자료를 뒤에 두는 정보 위계
- 추천 후보, 현재 선택 후보, 전체 후보 비교의 구분
- 참석 기준과 일정 조정 부담을 설명하는 구조
- 참석자 시간표와 주최자 후보 지도의 과업별 상호작용 차이
- 모바일 하단 CTA와 PC의 집중된 작업 영역
- MeetCue 워드마크와 승인된 UX 라이팅

## 4. 정상화

- 화면마다 달라진 container와 top bar 정렬축
- 같은 역할인데 다른 padding, gap, radius, 높이, 글자 크기를 가진 요소
- CSS cascade와 후반 override로만 성립하는 선택·hover·focus 상태
- 카드, 패널, section의 구분 없이 중첩된 표면
- 데스크톱에서 넓어진 공간을 의도 없이 비워 두거나 반복 정보로 채운 구성
- 모바일 breakpoint마다 정보 위계가 달라지는 문제
- 색상 토큰의 이름과 실제 값이 불일치하는 문제
- `!important`, 중복 selector, 화면 전용 전역 스타일
- 컴포넌트 내부 자식 요소가 버튼·라벨 타이포그래피를 덮어쓰는 문제

## 5. 제거 또는 격리

- 제품 화면에서 사용하지 않는 계정 홈·알림·목록 등 제출 범위 밖 UI는 리팩터링 우선순위에서 제외한다.
- 개발 화면 전환기와 데모 가이드는 제품 컴포넌트와 스타일 계층을 분리한다.
- `.omd`, `.reviews`, `.audit`, `.product-design-audit`, `outputs/moodboards`는 역사·검증 자료다. 구현 시 자동으로 읽는 명세가 아니다.
- 과거 Figma/Pencil 화면의 정적 카피와 더미 데이터는 현행 도메인 계약을 덮어쓰지 않는다.

## 6. 컴포넌트 경계

공통 primitive:

- Button, IconButton, Input, Textarea, Checkbox, RadioGroup
- Dialog, Sheet, Tooltip, Toast
- Badge는 상태에만, Chip은 선택된 값과 필터에만 사용한다.

MeetCue 도메인 컴포넌트:

- MeetingCriteria
- AvailabilityBrushGrid
- ParticipantAvailabilityGrid
- CandidateRail
- CandidateDecisionDetail
- CandidateComparisonMap
- ResponseRequestDialog
- ConfirmationSummary

도메인 컴포넌트는 shadcn 컴포넌트 이름이나 구조를 외부 계약으로 노출하지 않는다.

## 7. 첫 수직 슬라이스

주최자 결과 화면을 첫 대상으로 한다.

이유:

- MeetCue의 핵심 가치인 판정과 다음 행동이 가장 많이 드러난다.
- 반복 후보, 선택 상태, 추천 상태, 상태 색상, 상세 근거, 비교 지도가 모두 있어 시스템 검증 범위가 넓다.
- 이 화면에서 확정한 container, typography, button, badge, surface 규칙을 생성과 참석자 화면에 재사용할 수 있다.

완료 조건:

- 기존 동작과 도메인 테스트가 유지된다.
- 추천과 선택이 시각적으로 구분된다.
- READY·PENDING·IMPOSSIBLE이 색상 외 정보로도 구분된다.
- PC와 모바일에서 우선순위는 같고 배치는 각 환경에 맞다.
- 새 화면 스타일은 레거시 `App.css` selector에 의존하지 않는다.
- 마이그레이션된 컴포넌트에는 임의 색상·간격·radius가 없다.

## 8. 화면별 진행 순서

1. 주최자 결과와 재요청·재판정
2. 참석자 응답과 수정
3. 최소 생성 흐름
4. 공유·확정
5. 공통 셸과 개발 도구 격리
6. 제출 범위 밖 화면은 필요성을 다시 판단한 뒤 처리

각 단계에서 레거시 CSS를 남겨 둔 채 새 CSS를 덮어쓰지 않는다. 해당 화면의 소유권을 새 컴포넌트로 옮긴 뒤 사용하지 않는 selector를 함께 제거한다.

## 9. 시각 보존 게이트

리팩터링은 아래 단계를 한 번에 하나씩 통과한다. 구조 이전과 시각 재설계를 같은 작업 단위에 섞지 않는다.

1. 기존 JSX 의미, class name, DOM 순서를 유지한 채 화면 경계를 컴포넌트로 추출한다.
2. 추출 전후의 렌더링과 주요 computed style이 같은지 확인한다.
3. 기존 색상·간격·radius 값을 동일한 `--mc-*` alias로 먼저 치환한다.
4. 한 컴포넌트씩 Tailwind와 shadcn primitive로 이전하고 다시 시각 동등성을 확인한다.
5. 기존 화면의 명백한 결함은 별도 변경으로 분리해 의도와 전후 차이를 검수한다.

ASTRYX reset과 레거시 전역 CSS가 남아 있는 동안 Tailwind Preflight는 사용하지 않는다. reset 소유권은 공통 셸과 primitive 이전이 끝난 뒤 한 번만 변경한다.
