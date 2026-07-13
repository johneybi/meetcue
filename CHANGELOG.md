# Changelog

- Reassigned the host decision typography without shrinking the reading baseline: meeting criteria now belong to the meeting header, candidate times retain readable body sizing, and the decision sentence carries the primary emphasis.

- Added semantic typography tokens and normalized the host decision hierarchy: metadata is lighter, candidate titles follow body roles, decision copy is readable at body-small size, dense matrix labels respect the 11px minimum, and Korean negative tracking was removed. DESIGN.md now matches the existing Wanted Sans Variable implementation.
- Removed unused ASTRYX CSS/theme wiring, replaced its remaining spacing dependencies with MeetCue tokens, and moved the required browser reset into project-owned global styles.
- Updated the component architecture guide to remove obsolete App.css and legacy-button compatibility claims and document the shared attendance control.
- Converted account-level create, restart, notification, and section-link commands to shared Button variants; navigation tabs and list rows remain purpose-built composite controls.
- Moved reminder, participant reset, and participant-shell exit commands onto shared Button variants while preserving their screen-owned placement classes.
- Shared the minimum-attendance stepper between create and criteria-review flows, and moved criteria choices onto SelectableCard's data-selected contract.
- Removed root-scoped typography overrides from create, account, shortlist, and decision-matrix styles; account CSS no longer changes badges or required labels owned by other screens.
- Moved the remaining HostCandidateDetail request, fallback, and criteria commands onto explicit Button variants and removed another root-scoped typography override.
- Added a 36px icon button size, moved attendee removal and attendance steppers onto explicit Button variants, removed a leaked global button-typography block, and added Escape dismissal to the mobile people picker.
- Replaced meeting-duration raw radio buttons and `is-selected` state with the shared SelectableCard contract; the custom stepper retains Button/Input primitives with local geometry only.
- Restored explicit Input, Textarea, and SelectableCard border ownership after identifying that the later ASTRYX reset can override Tailwind's border utility layer.
- Extracted Field context styling into `ui/field.css`, aligned Textarea with the Input token contract, and removed ineffective 52px field overrides in favor of the 56px field size.
- Unified invitee and attendance-card selection on `SelectableCard`'s `data-selected` contract, moved Avatar sizing into CVA, and removed duplicate Input/SelectableCard base CSS.
- Replaced legacy primary/secondary/text/icon button classes with explicit shadcn-compatible `variant` and `size` contracts; screen CSS now targets stable data attributes.
- Replaced numeric 800/900 weights with semantic semibold/bold tokens, removed component typography `!important` declarations, and changed the global type reset from a forced override to low-specificity defaults.
- Replaced all legacy `--tds-*` and soft-shadow references with canonical `--mc-*` tokens, promoted glass/elevation values to named MeetCue tokens, and removed the compatibility alias layer.
- Removed `App.css` after splitting its final global, theme, host-shell, participant-panel, and time-grid responsibilities into explicit owners; dead avatar and legend rules were dropped.
- Moved shared action rows and legacy shadcn Button compatibility classes into `ui/primitives.css`, while host-only prototype actions now belong to `HostShell.css`.
- Moved participant response-panel and time-grid visual overrides into their owning component stylesheets, and removed the unused legacy response list/baseline surface rules.
- Extracted the two-part attendee disclosure flow into `CreateAttendeeFlow.css` and moved the create-only required-field chip out of the global stylesheet.
- Moved every `.create-*` and `.time-create-stage*` rule, including responsive branches and mixed-selector splits, from `App.css` into `CreateScreen.css` with PostCSS-preserved source order.
- Extracted the participant route frame, responsive content width, sticky header, and shared typography from `App.css` into `ParticipantPageShell.css`; invalid-invite and standard participant routes now share the same explicit style owner.

## 2026-07-13 - 디자인 시스템 리팩터링 기반 정리

- 계정 셸과 홈, 내 회의, 받은 요청, 알림 화면을 `AccountScreens.tsx`로 분리하고 계정 화면 전용 CSS 677줄을 `AccountScreens.css`로 이전했다.
- 계정 시나리오 fixture와 전역 계정 헤더의 소유권을 기능 모듈로 옮겨 `App.tsx`가 라우팅과 상태 연결만 담당하도록 정리했다.
- 주최자 공통 프레임과 상태별 카피, 보조 내비게이션을 `HostShell.tsx`로 분리해 라우터에서 화면 셸 구현을 제거했다.
- 요청 발송 완료, 참석 기준 수정, 응답 대기 화면을 각각 독립 컴포넌트로 분리하고 관련 CSS 1,090줄을 화면별 스타일시트로 이전했다.
- 응답 진행률과 다시 알리기 상태, 참석 기준 입력 제약을 각 화면 내부로 옮겨 `App.tsx`가 도메인 상태 변경 콜백만 연결하도록 정리했다.
- 확정 안내와 잘못된 초대 링크 화면을 독립 컴포넌트로 분리하고 상태별 CSS를 각 화면에 귀속했다.
- 개발 화면 전환기와 fixture 목록을 `DevScreenSwitcher.tsx`로 이동하고 참석자 토큰을 명시적인 props 계약으로 변경했다.
- 제출용 5단계 데모 가이드를 `DemoGuide.tsx`와 전용 CSS로 분리하고 깨진 한글 카피를 정상화했다.
- 앱 라우트 타입과 해시 파싱·생성·대상 판정을 `lib/appRoutes.ts`로 통합하고 라우팅 계약 테스트 3건을 추가했다.
- 회의 초안과 참석자 응답을 변경하는 12개 명령을 `useMeetingEditor`로 이동해 앱 컴포넌트에서 직접 상태를 편집하는 코드를 제거했다.
- PENDING 데모 fixture와 변경 로그 생성을 순수 도메인 유틸로 분리하고 핵심 fixture 계약 테스트 2건을 추가했다.
- 라우트 동기화, 후보 선택, 재요청 대상, 계정·DEV fixture 전환과 토스트를 `useMeetCueController`로 통합했다.
- 계정 시나리오 fixture를 화면 모듈에서 `domain/accountScenarios.ts`로 이동하고 fixture 계약 테스트를 추가했다.
- `App.tsx`를 상태 구현이 없는 216줄의 화면 조합 파일로 축소했다.
- 디자인 권위를 `DESIGN.md`로 단일화하고 TDS, ASTRYX, OMD, Creative Production 산출물의 채택·폐기 범위를 분리했다.
- Tailwind CSS와 shadcn 호환 primitive 기반을 추가하고 MeetCue 소유의 `--mc-*` 토큰을 정의했다.
- ASTRYX와 레거시 전역 CSS가 남아 있는 동안 Tailwind Preflight를 제외해 기존 화면의 reset 소유권을 유지했다.
- 첫 결과 화면 이전은 시각 동등성을 지키지 못해 되돌렸고, 구조 추출 → 토큰 alias → 컴포넌트별 스타일 이전 순서의 보존 게이트를 추가했다.
- 전체 후보 비교 표를 DOM과 class name 변경 없이 `HostDecisionMatrix`로 분리해 첫 구조 보존 단위를 만들었다.
- 현재 화면의 실제 색을 MeetCue foundation 토큰 기준값으로 반영하고, 비교 표의 색상·간격·radius·elevation을 값이 동일한 `--mc-*` alias로 치환했다.
- 비교 표 전용 selector와 반응형 규칙을 `HostDecisionMatrix.css`로 이동하고 `App.css`에는 공유 타이포그래피 규칙만 남겼다.
- 추천 후보 목록을 `HostCandidateShortlist`로 분리하고 카드·상태·추천 표식·모바일 가로 목록 스타일을 전용 CSS와 동일 값 토큰으로 이전했다.
- 현재 DOM에서 사용되지 않던 추천 카드의 과거 rank·status icon cascade를 제거했다.
- 선택 후보의 판정 문장·일정 부담·응답 현황·다음 행동을 `HostCandidateDetail`로 구조 분리하고 기존 상태 분기와 class 계약을 유지했다.
- 선택 후보 상세의 상태색·간격·radius를 동일 값 토큰으로 치환하고 전용 `HostCandidateDetail.css`로 스타일 소유권을 이전했다.
- 현재 DOM에서 사라진 과거 상세 요약·응답 disclosure cascade를 제거했다.
- 응답 요청 포털을 `HostResponseRequestDialog`로 분리하고 선택·닫기·포커스 복원 계약을 유지했다.
- 응답 요청 dialog와 커스텀 체크박스의 최종 계산값을 `--mc-request-*` 토큰과 전용 CSS로 통합하고 중간 glass·host override를 제거했다.
- 주최자 결과 화면의 조합과 상호작용 상태를 `HostDecisionScreen`으로 분리하고 프레임·2열 관계·모바일 재배치 스타일을 전용 CSS로 이전했다.
- 결과 화면에서 더는 사용하지 않는 과거 레이아웃 실험과 상태 표현 selector를 제거해 `App.css`의 중첩 override를 정리했다.
- `HostDecisionMatrix`로 대체된 뒤 숨김 상태로 남아 있던 `HostCandidateCalendar`와 관련 CSS를 제거했다.
- 추천 후보 헤더의 반복 설명과 `추천 개수 · 전체 개수`를 제거하고, 추천 근거는 접근 가능한 정보 툴팁으로 전환해 좁은 후보 열의 정보 밀도를 낮췄다.
- 생성 화면의 프레임·캔버스·콘텐츠 폭·페이지 elevation 규칙을 `CreateScreen.css`로 분리하고 중간에 덮이던 960px·1040px 값을 제거해 최종 1120px 프레임을 토큰으로 고정했다.
- 주최자 페인트형 시간 입력을 `AvailabilityWindowPicker`로 분리하고 30분 격자, 주간 이동, 포인터·키보드 편집과 날짜 유틸의 소유권을 캡슐화했다.
- 생성 화면의 진행 표시·헤더·이전 동작·하단 CTA를 `CreateFlowFrame`으로 분리하고 세 버튼을 CVA 기반 shadcn `Button` primitive로 전환했다.
- 처음 실제 사용된 shadcn primitive가 Vite에서도 안정적으로 번들링되도록 `Button`의 공통 유틸 import 경로를 정상화했다.
- 참석자 선택 이후의 전원 참석·필수 참석자·최소 인원 설정을 `AttendanceCriteriaStep`으로 분리하고 기준 관련 타입·옵션·전용 CSS를 함께 이동했다.
- 복합 라디오 카드는 기존 정보 구조를 유지하고 최소 인원 스테퍼의 `+/-` 명령만 shadcn `Button` primitive로 전환했다.
- 사람 검색·최근 목록·선택 요약·모바일 sheet를 `AttendeePeopleStep`과 전용 CSS로 분리하고 관련 전역 selector를 제거했다.
- 검색 필드는 shadcn `Input`, 추가·수정·삭제·닫기·완료 명령은 `Button`으로 전환하되 복합 listbox option의 정보 구조는 유지했다.
- 회의 제목·목적·선택 자료 입력을 `MeetingBriefStep`과 전용 CSS로 분리하고 단문·장문 입력 및 자료 명령을 shadcn primitive로 전환했다.
- 날짜 범위와 회의 길이 입력을 `MeetingTimeConstraintsStep`으로 분리하고 직접 입력 상태와 30분 단위 검증을 컴포넌트 및 `meetingDuration` 유틸로 이동했다.
- 더는 도달할 수 없던 고정 1시간 분기와 스타일을 제거하고 시간 조건 관련 전역 selector를 전용 CSS로 이전했다.
- 가능 범위 편집과 응답 마감 화면을 각각 `MeetingAvailabilityStep`, `ResponseDeadlineStep`으로 분리하고 페인트 입력·마감 입력의 책임 경계를 명확히 했다.
- 시간 하위 단계의 이전 설정 요약을 `TimeStepSummary`로 통합하고 수정 명령을 shadcn `Button` primitive로 전환했다.
- 후보 단계 폭, 마감 필드와 요약 반응형 selector를 전용 CSS로 이동하고 `App.tsx`의 날짜 입력 보조 함수를 제거했다.
- 요청 전 최종 확인 화면과 기본 시간 대비 제외·추가 범위 계산을 `CreateReviewStep`으로 분리했다.
- 확인 화면의 섹션, 사실 행과 모바일 배치 selector를 전용 CSS로 이동하고 `App.tsx`에서 표시 전용 보조 컴포넌트를 제거했다.
- 생성 단계 메타데이터, CTA 조건·문구, 다음·이전 전환과 포커스 이동을 `useCreateFlowController`로 분리했다.
- 시간 범위 최초 초기화와 응답 마감 제안 규칙을 흐름 컨트롤러에 모으고 `CreateScreen`의 중복 상태·전환 함수를 제거했다.
- 참석자 검색·추가·삭제, 최근 목록 저장과 선택 완료 상태를 `useAttendeeSelection`으로 분리했다.
- 모바일 picker의 ESC·스크롤 잠금과 참석 기준 단계로 이어지는 포커스 이동을 참석자 선택 훅으로 옮겼다.
- 생성 화면 조합 전체를 `CreateScreen.tsx`로 이동해 `App.tsx`에서 생성 기능의 렌더링과 상태 연결을 분리했다.
- 참여자 응답 상단의 모바일 회의 정보, 마감 상태와 조율 조건을 `ParticipantMeetingContext`로 첫 구조 분리했다.
- 참여자의 캘린더 불러오기, 직접 입력, 시간표와 저장 확인 UI를 `ParticipantAvailabilityPanel`로 분리했다.
- 참여자 응답 초안, 입력 방식, 캘린더 기본값과 수동 수정 상태를 `useParticipantAvailabilityResponse`로 이동했다.
- 참여자 회의 컨텍스트와 입력 패널 전용 선택자 1,565줄을 각각의 CSS로 이동하고 복합 전역 선택자에서 소유 부분만 분리했다.
- 참여자 화면의 데스크톱·모바일 override 순서는 유지하면서 `App.css`에서 해당 컴포넌트 선택자를 제거했다.
- 참여자 공통 헤더를 `ParticipantPageShell`로 분리하고 입력·완료·확정 화면에서 동일한 셸을 사용하도록 했다.
- 응답 완료와 회의 확정 상태를 각각 `ParticipantDoneScreen`, `ParticipantConfirmedScreen`으로 이동하고 전용 스타일을 분리했다.
- 참여자 응답 화면 전체 조합을 `ParticipantShell.tsx`로 이동해 `App.tsx`에서 참여자 기능 경계를 분리했다.
- 참여자 상태 타입, 응답 라벨과 더미 캘린더 fixture를 셸로 옮겨 전역 화면 파일의 참여자 전용 계산을 제거했다.
- 전체 소스의 class 참조를 기준으로 `App.css`의 도달 불가능한 레거시 규칙 608개와 selector branch 710개를 제거해 5,588줄을 2,467줄로 축소했다.
- React Aria 런타임 상태 class와 현재 사용 중인 base class의 modifier는 보존하고, 호스트·생성·참여자 핵심 화면의 렌더링과 콘솔 오류를 확인했다.
- 주최자 페인트형 시간 입력의 데스크톱 격자, 브러시 상태, 모바일 목록과 reduced-motion 스타일 592줄을 `AvailabilityWindowPicker.css`로 이동했다.
- `App.css`에서 시간 입력 selector를 모두 제거해 전역 스타일을 1,876줄로 줄이고 컴포넌트 문서의 오래된 `App.tsx` 소유권 설명을 바로잡았다.
- 주최자 공통 프레임의 `host-shell`, 컨텍스트 바와 콘텐츠 캔버스 selector를 `HostShell.css`로 분리했다.
- 여러 시기에 중첩된 HostShell 규칙을 최종 계산값 기준으로 통합해 261줄을 198줄로 정리하고 `App.css`를 1,637줄로 축소했다.
- 결과 후보 확정, 응답 요청, 대기 화면 전환, 참석 기준 저장, 확정 알림, 참여자 저장과 요청 완료의 primary·secondary 명령을 공통 shadcn `Button`으로 전환했다.
- 응답 요청 dialog의 닫기 아이콘과 참여자 직접 입력 명령도 `quiet` variant로 통일하되, 기존 class를 유지해 화면별 시각값은 보존했다.
- 기존 44px primary·secondary 버튼의 최종 계산값을 `ui/primitives.css`의 `ui-button` 호환 계층으로 옮기고 `App.css`의 전역 버튼·미사용 `create-button` 규칙을 제거했다.
- success, warning, danger, info tone과 두 크기를 제공하는 공통 `Badge`를 추가하고 호스트 상태와 참여자 완료 상태를 전환했다.
- `status-label`, `state-badge`의 색상·치수 cascade를 Badge primitive로 대체해 `App.css`를 1,500줄로 축소했다.
- 라벨·입력·도움말 구조를 제공하는 공통 `Field`를 추가하고 회의 안내 2개, 날짜 2개와 응답 마감 입력을 전환했다.
- 입력과 textarea의 최종 border, focus, typography 규칙을 `ui/primitives.css`로 이동하고 화면별 CSS가 폭과 강조를 소유하도록 cascade 순서를 정상화했다.
- 전역 `.field` selector를 모두 제거해 `App.css`를 1,416줄로 축소했다.

## 2026-07-12 - 확정 전 일정 부담 표시

- READY 후보 상세에서 일정 조정 약속과 기피 표시를 사람 이름으로 확인할 수 있게 했다.
- 부담이 없는 후보도 `일정 변경 없이 참석`, `피하고 싶은 표시 없음`으로 명시해 추천 정렬 근거와 확정 판단을 연결했다.
- 추천 카드에는 정보를 추가하지 않고 선택 후보 상세에만 배치했다.

## 2026-07-12 - 추천 동률과 기준 표시

- 추천 후보 영역에 `참석 기준 충족 → 일정 조정과 기피 표시가 적은 순`이라는 정렬 기준을 짧게 표시했다.
- 추천 조건이 같고 시간 순서만 다른 READY 후보는 카드, 선택 상세, 전체 시간 지도에서 모두 같은 추천으로 표시한다.
- PENDING 또는 IMPOSSIBLE만 있을 때는 추천 별표를 강제로 표시하지 않는다.

## 2026-07-12 - 후보 선별과 표시 계층 추가

- 30분 슬라이딩 윈도우로 계산한 전체 후보는 판정 데이터에 그대로 유지한다.
- 같은 판정으로 이어지는 중첩 후보를 대표 후보로 묶고, 날짜별 상위 후보를 우선해 최대 6개만 추천 카드로 노출한다.
- 결과 요약을 `추천 후보 수 · 가능한 시간 수`로 분리하고, 전체 후보는 기존 시간 지도에서 날짜별로 확인하도록 했다.
- 날짜 다양성과 연속 중복 축약을 도메인 테스트로 고정했다.

## 2026-07-12 - MeetCue 핵심 시연 흐름 완결

### 제품

- 제품 UI명을 `MeetCue`로 확정하고 현재 PRD, 스프린트 계약, 지원서 검수본과 화면 표기를 통일했다.
- 생성한 회의의 제목, 참석자, 진행 기준, 시간 범위를 유지한 채 응답 대기 결과로 넘어가도록 전환 fixture를 수정했다.
- `응답이 더 필요해요` 후보에서 요청 대상을 고른 뒤 해당 참석자의 응답 화면으로 이어지고, 제출 후 같은 결과 보드에서 재판정 결과를 확인하도록 연결했다.
- 내부 용어였던 `프로토타입 시연` 대신 `일부 응답이 도착했어요`라는 사용자 사건을 진입점으로 사용한다.
- 추천 후보에 일정 변경 약속과 피하고 싶은 시간 표시를 함께 보여줘 추천 근거를 보강했다.

### 검증 계약

- DEV 메뉴 없이 `생성 → PENDING → 재요청 → 응답 변경 → READY → 확정`을 한 흐름으로 시연할 수 있어야 한다.
- 필수 참석자가 주최자뿐인 회의에서도 READY, PENDING, IMPOSSIBLE 비교 사례가 만들어져야 한다.

## 2026-07-12 - 단일 프로토타입 시연 흐름 연결

### 흐름

- 생성과 요청 발송 뒤 응답 대기 화면에서 `응답 도착 상태로 진행`을 선택해 PENDING 결과 보드로 이어갈 수 있게 했다.
- 전환 시 생성한 회의의 제목·목적·주최자 정보를 유지하고, 검증된 PENDING 판정 fixture를 결합한다.
- 시연 전환은 배포된 프로토타입에서도 `프로토타입 시연`으로 표시하며 DEV 메뉴는 QA용으로 남긴다.

### 문서

- `UX-ARCHITECTURE.md`에 DEV 메뉴 없이 확정까지 이어지는 핵심 시연 경로 계약을 추가했다.

## 2026-07-12 - 재알림 피드백 개선

### 인터랙션

- 응답 대기 화면의 `다시 알리기`를 실행하면 Sonner 토스트로 완료 결과를 즉시 알린다.
- 같은 참석자에 대한 토스트는 하나만 유지하고, 실행한 행은 `다시 알림 보냄` 상태로 바뀌어 중복 실행을 막는다.
- DEV 화면 바로가기에 모든 참석자가 미응답인 `응답 대기` fixture를 추가했다.

### 문서

- `UX-ARCHITECTURE.md`에 화면을 떠나지 않는 가벼운 행동을 위한 `ActionToast` 계약을 추가했다.

## 2026-07-12 - P0 제출 범위 잠금 v2.10

### 범위 결정

- 제출용 완성 범위를 `회의 기준 설정 → 참석자 응답 → 주최자 판단 → 한 사람에게 재요청 → 응답 변경 후 재판정 → 확정`으로 잠갔다.
- 계정 홈, 내 회의, 받은 요청, 알림과 여러 회의 재진입은 후속 제품 탐색으로 내리고 DEV 전용 화면으로 보존했다.
- 6명, 다음 주, 1시간은 제품 제약이 아니라 대표 시연 fixture와 기본값으로 명시했다.

### 코드와 시연

- 기본 URL과 알 수 없는 URL이 회의 생성으로 진입하도록 변경했다.
- 제출용 주최자 헤더에서 계정 메뉴와 알림을 제거하고 `Meeting Cue / 회의 시간 결정 / 처음부터`만 유지했다.
- DEV 화면 바로가기를 `생성 → PENDING 결과 → 수진 응답 → 재판정 결과 → 확정` 순서로 재구성했다.
- DEV `current` fixture 전환은 현재 회의와 선택 후보를 보존한다.
- PENDING 결과 바로가기는 수진의 응답이 결론을 바꾸는 후보를 선택한다.
- 결과 보드 상단 결론이 첫 READY 후보에 고정되지 않고 현재 선택 후보의 상태와 근거를 반영하도록 수정했다.
- 참여자 화면의 결과 보드 복귀는 개발 환경에만 `시연 · 결과 보드`로 노출한다.

### 문서

- `.local-docs/p0-submission-scope-lock-v2.10.md`를 현재 최우선 실행 기준으로 추가했다.
- PRD, 스프린트, UX Architecture와 문서 맵에서 계정 v2.8·v2.9를 후속 제품 범위로 재분류했다.

## 2026-07-12 - 전역 앱 셸과 레이아웃 축 통합

### 문제

- 계정 홈은 전체 폭 상단 바와 중앙 콘텐츠를 사용했지만, 회의 생성·결과 화면은 별도의 떠 있는 컨텍스트 바와 서로 다른 최대 폭을 사용해 화면 전환 시 제품 골격이 바뀌어 보였다.

### 변경

- 계정 화면과 주최자 화면이 같은 전역 상단 바 컴포넌트를 사용하도록 통합했다.
- 회의 컨텍스트를 두 번째 앱 바에서 본문 헤더로 이동했다.
- 상단 바 `1180px`, 일반 실제 콘텐츠 `960px`, wide 결과 `1120px`, 데스크톱 거터 `24px`, 모바일 거터 `18px`로 프레임 계약을 고정했다.
- 모바일 생성 화면에서도 동일한 상단 바와 본문 축을 유지하고 하단 계정 내비게이션만 숨긴다.
- 세로 스크롤바 유무에 따른 중앙 컨테이너의 미세한 좌우 이동을 막도록 안정적인 스크롤바 거터를 적용했다.

### 문서

- `.local-docs/account-navigation-ia-decision-v2.9.md`에 전역 프레임 계약을 추가했다.

## 2026-07-12 - 계정 시나리오 데이터와 상태 탐색

### 화면과 흐름

- 계정 홈을 `응답 필요`, `주최자 결정 필요`, `다가오는 확정 회의`의 세 상태로 채웠다.
- 내 회의에 `전체 / 진행 중 / 확정`, 받은 요청에 `응답 필요 / 응답 완료` 상태 탭을 추가했다.
- 알림을 요청 도착, 새 응답, 회의 확정, 응답 저장, 마감 임박 이벤트로 확장했다.
- 제품 리뷰, 온보딩 개선안, 3분기 목표 점검, 디자인 QA 기준 정리를 하나의 계정 시나리오로 연결했다.

### 원칙

- 빈 메뉴를 설명용 기능 카드로 채우지 않고, 사용자의 실제 과업 상태와 다음 행동으로 밀도를 만들었다.
- 대표 목록 항목은 기존 주최자·참여자 상세 흐름으로 연결했다.

### 문서

- `.local-docs/account-navigation-ia-decision-v2.9.md`에 채용 과제용 대표 계정 시나리오와 표현 원칙을 추가했다.

## 2026-07-12 - 계정 내비게이션과 재진입 IA v2.9

### 제품 결정

- 기본 진입점을 단일 회의 생성에서 계정 홈으로 변경했다.
- `홈 / 내 회의 / 받은 요청 / 알림 / 새 회의`의 역할을 분리하고, 알림을 과업 목록이 아닌 변화 이벤트로 정의했다.
- 생성과 응답은 집중 화면을 유지하되 계정 홈 또는 받은 요청으로 돌아갈 수 있게 했다.

### 화면과 흐름

- PC 상단 내비게이션과 모바일 하단 내비게이션을 추가했다.
- 홈에서 응답할 요청, 내가 만든 회의, 새 회의로 바로 이동할 수 있다.
- 내 회의·받은 요청·알림 화면에서 기존 주최자와 참여자 fixture로 다시 진입할 수 있다.
- DEV 화면 바로가기에 계정 화면 네 개를 추가했다.

### 문서

- `.local-docs/account-navigation-ia-decision-v2.9.md`에 계정형 재진입 구조, 알림과 목록의 구분, 반응형 계약을 기록했다.
- PRD, UX Architecture, 문서 맵을 v2.9 기준으로 갱신했다.

## 2026-07-12 - 조직 계정 기반 응답 요청 v2.8

### 제품 결정

- 사내 구성원 검색과 캘린더 사용 맥락에 맞춰 개인 링크 전달을 조직 계정의 응답 과업 할당으로 대체했다.
- 개인 토큰은 실제 제품의 공유 수단이 아니라 계정 세션을 시연하는 DEV 전용 페르소나 라우트로 제한했다.
- 계정이 없는 외부 참석자용 보안 링크는 P0 이후 fallback으로 분리했다.

### 화면과 흐름

- 생성 CTA를 `응답 요청 보내기`로 바꿨다.
- 요청 완료 화면에서 링크 복사·미리보기를 제거하고 참석자별 `요청됨`·`응답 완료` 상태와 `응답 현황 보기`를 제공한다.
- 응답 대기에서는 미응답자에게 `다시 알리기`를 제공한다.
- PENDING 추가 요청과 회의 확정도 문구 복사가 아니라 계정 알림으로 표현한다.

### 문서

- `.local-docs/account-based-request-delivery-decision-v2.8.md`를 현재 요청·식별 계약으로 추가했다.
- 개인 링크 기반 v2.7은 대체된 결정 기록으로 보존했다.
- PRD, UX Architecture, 문서 맵의 현재 기준을 v2.8로 갱신했다.

## 2026-07-12 - 개인 초대 링크와 참여자 식별 v2.7

### 제품 결정

- 공용 초대 링크에서 참여자가 자기 이름을 고르는 구조를 제거했다.
- 지정된 참석자마다 개인 응답 토큰과 링크를 제공하고, 링크를 여는 순간 해당 참여자로 식별되도록 했다.
- 페르소나 전환 편의는 제품 화면이 아니라 DEV 화면 바로가기로 분리했다.

### 화면과 흐름

- 주최자 공유 화면에 참석자별 링크 복사와 응답 화면 미리보기를 추가했다.
- 생성 확인 화면에서 응답 전 파생 후보처럼 보이던 시간 목록과 강조 카드를 제거하고, 기간·회의 길이·기본 범위·제외·추가 예외를 같은 가로형 정보 행으로 정리했다.
- 신규·수정·완료가 같은 참여자 토큰을 유지하도록 초대 라우트를 정리했다.
- 토큰이 없거나 유효하지 않은 링크는 참석자 목록을 노출하지 않고 오류 상태만 보여준다.
- DEV 바로가기에 참여자별 신규·수정·완료 링크와 별도의 잘못된 링크 항목을 추가했다.

### 문서

- `.local-docs/personal-invite-identity-decision-v2.7.md`에 문제, 대안, 트레이드오프, 사용자 변화와 수용 기준을 기록했다.
- `.local-docs/prd-v2.2.1.md`의 참여자 입력 기준을 더미 캘린더 자동 채움 계약과 일치시켰다.
- `UX-ARCHITECTURE.md`와 `.local-docs/README.md`의 실행 우선순위와 Share 계약을 갱신했다.

### 검증

- 개인 신규 링크와 수정 링크의 실제 라우팅을 브라우저에서 확인했다.
- `npm run check`
- `npm run lint`
- `npm run build`

## 2026-07-11 - 결정 지원 피벗 v2.1

### 제품 전략

- 문제를 시간 수집이 아니라 수집된 응답을 회의 성립 여부와 다음 행동으로 바꾸는 해석 비용으로 다시 정의했다.
- 기존 제품의 기능 부재를 과장하지 않고, 회의 기준·가용 상태 강도·미응답 영향도를 행동까지 연결하는 경험을 차별화 범위로 정했다.
- 검증되지 않은 재조율 효용과 자동 판단 정확도는 가설로 분리했다.

### 문서

- `.local-docs/prd-v2.1.md`에 상세 범위, 핵심 순간, 성공 기준, 검증 시나리오를 작성했다.
- `.local-docs/decision-model-v2.1.md`에 상태 우선순위, 영향 인원, 후보 정렬, 설명 계약을 작성했다.
- `UX-ARCHITECTURE.md`, 루트 `README.md`, `.local-docs/README.md`의 실행 우선순위를 v2.1로 갱신했다.

### 도메인과 화면

- 현재 일정 그대로 가능한 인원, 조정하면 가능한 인원, 미응답으로 열려 있는 인원을 분리해 판정한다.
- 모든 미응답자가 아니라 회의 성립 여부를 바꾸는 사람만 응답·확인 대상으로 계산한다.
- 주최자 결정 화면을 현재 결론, 우선 행동, 후보 비교, 접힌 상세 근거 순서로 재구성했다.
- 프로토타입 데이터에서 즉시 확정, 조정 확인, 응답 필요, 다른 시간 필요의 네 상태를 모두 비교할 수 있다.

### 검증

- 네 후보 상태와 상태별 CTA·영향 인원 연결을 브라우저에서 확인했다.
- PC와 모바일에서 가로 오버플로가 없음을 확인했다.
- `npm run build`
- `npm run lint`

## 2026-07-11 - 가용시간 기반 조율 모델

### 제품

- 주최자의 정확한 후보 직접 선택을 조율 가능 시간대 선택으로 변경했다.
- 참석자 응답을 후보별 카드에서 30분 단위 가용시간 입력으로 변경했다.
- 후보를 사용자 입력값이 아니라 일정 확보 시간과 연속 가용시간의 계산 결과로 정의했다.
- 조율 회복의 기본 행동을 새 후보 추가에서 조율 가능 시간대 확장으로 변경했다.

### 도메인과 구현

- `AvailabilityWindow`를 `Meeting`의 시간 입력 원본으로 추가했다.
- 시간대 병합, 30분 슬롯 생성, 후보 생성, 참석자별 후보 응답 파생 로직을 분리했다.
- 참석자가 저장하지 않은 기존 칸을 `unavailable`로 확정하고 새로 열린 칸은 미응답으로 유지한다.
- 기존 `evaluateCandidates`의 필수 참석자, 최소 인원, 조정 필요, 미응답 판정을 파생 응답에 연결했다.
- 주최자 생성, 참석자 응답, 시간대 확장, 주최자 결정 흐름을 같은 시간 모델로 연결했다.

### 문서

- `.local-docs/prd-v2.0.md`를 새 실행 기준으로 추가했다.
- `.local-docs/prd-v1.5.md`는 대체된 결정 기록으로 보존했다.
- `.local-docs/availability-window-model-decision-v2.3.md`에 구현 상태를 반영했다.
- `UX-ARCHITECTURE.md`와 `README.md`의 기준 문서와 시간 모델을 갱신했다.

### 검증

- `npm run check`
- `npm run lint`
- `npm run build`
