# MeetCue 컴포넌트 구조

## 공통 UI primitive

- `ui/button.tsx`가 primary, secondary, quiet, fieldAction과 크기 계약을 제공한다.
- 일반 명령은 `Button`의 명시적인 variant와 size를 사용하고, 후보 카드·시간표 셀·내비게이션 탭처럼 자체 상태 모델이 있는 복합 컨트롤만 목적별 버튼 구조를 유지한다.
- `ui/badge.tsx`가 success, warning, danger, info tone과 default, compact 크기를 제공하며 호스트 상태와 참여자 완료 상태가 같은 semantic 계약을 사용한다.
- `ui/field.tsx`가 라벨, 입력과 선택 도움말의 공통 구조를 제공하고 `Input`·`Textarea` 외형은 `ui/primitives.css`가 소유한다.
- 회의 안내, 날짜 범위와 응답 마감의 폭·강조는 각 단계 CSS가 primitive 이후에 적용하며 전역 화면 CSS는 폼 selector를 소유하지 않는다.
- 후보 선택 카드, 시간표 셀과 복합 listbox option은 독립적인 상호작용 모델이므로 일반 Button으로 평탄화하지 않는다.

## 현재 주최자 흐름

주최자 가능 시간 화면은 `AvailabilityWindowPicker`에 구현된 페인트 입력을 사용한다.

- 클릭·탭은 30분 한 칸을 바꾼다.
- 드래그는 연속된 칸을 칠한다.
- 회의 길이는 브러시 크기가 아니라 파생 후보 계산에만 영향을 준다.

## 보존된 블록형 입력

`BlockTimeRangePicker.tsx`는 대안인 블록형 입력을 독립된 제어 컴포넌트로 보존한다.

- 클릭하면 `defaultDurationMinutes` 길이의 블록을 만든다.
- 드래그하면 더 긴 블록을 만든다.
- 호버·포커스하면 시작·종료 리사이즈 핸들이 나타난다.
- 각 블록을 개별 삭제할 수 있다.

현재 애플리케이션에서는 의도적으로 import하지 않는다. 향후 필요한 화면이 명시적으로 선택해서 사용해야 하며, 블록·리사이즈 동작을 주최자 페인트 그리드와 결합하지 않는다.

## 생성 화면

`CreateScreen.tsx`는 회의 생성 경험의 화면 경계다.

- 생성 초안과 변경 callback을 받아 단계별 컴포넌트, 참석자 선택 훅과 흐름 컨트롤러를 조합한다.
- 생성 화면의 상태와 렌더링이 `App.tsx`에서 분리되어 라우트 셸은 초안 연결만 담당한다.

`useCreateFlowController.ts`는 생성 화면의 대단계와 시간 하위 단계 전환을 소유한다.

- 단계 메타데이터, CTA 활성 조건과 문구, 다음·이전 동작을 한 계약으로 관리한다.
- 회의 조건이 바뀐 뒤 시간 범위에 처음 진입할 때만 기본 평일 범위를 만들고, 후보 단계 진입 시 유효한 응답 마감을 제안한다.
- 단계 전환 후 스크롤과 제목 포커스 이동을 관리하되 회의 초안과 참석자 검색 상태는 소유하지 않는다.

`useAttendeeSelection.ts`는 참석자 선택 단계의 상호작용 상태를 소유한다.

- 사람 검색·추가·삭제, 최근 함께한 사람의 로컬 저장, 모바일 picker 열림 상태와 접근성 안내 문구를 관리한다.
- 사람 선택을 확정하거나 다시 수정할 때 사람 단계와 참석 기준 단계 사이의 스크롤·포커스를 이동한다.
- 참석자 역할과 최소 인원 같은 회의 성립 기준은 계산하지 않고 회의 초안과 `AttendanceCriteriaStep`에 남긴다.

`AvailabilityWindowPicker.tsx`는 주최자가 참석자에게 물어볼 시간 범위를 편집하는 페인트형 입력을 소유한다.

- 30분 격자, 주간 이동, 모바일 날짜 목록과 포인터·키보드 입력을 컴포넌트 내부에 캡슐화한다.
- 기본 범위 복원과 시간 제외·추가 결과만 `AvailabilityWindow[]`로 상위 생성 흐름에 전달한다.
- `AvailabilityWindowPicker.css`가 데스크톱 격자, 브러시 상태, 모바일 날짜·시간 목록과 reduced-motion 규칙을 소유하며 관련 selector는 `App.css`에서 제거했다.
- `CreateScreen.css`는 생성 화면의 프레임, 콘텐츠 폭, 캔버스와 페이지 수준 elevation을 소유한다.
- 생성 단계 전환은 `useCreateFlowController`, 회의 초안 상태는 앱의 회의 편집 훅이 소유한다.

`CreateFlowFrame.tsx`는 생성 화면에서 단계와 무관하게 유지되는 진행 표시, 헤더, 이전 동작과 하단 CTA 배치를 소유한다.

- 이전 버튼과 데스크톱·모바일 CTA는 CVA 기반 shadcn `Button` primitive를 사용한다.
- 기존 class name을 함께 유지해 primitive 전환과 시각 스타일 정상화를 서로 다른 단계로 분리한다.
- `CreateScreen`은 현재 단계, 활성화 조건, 버튼 문구와 단계별 본문만 전달한다.

`AttendanceCriteriaStep.tsx`는 사람 선택이 끝난 뒤 회의 성립 기준을 정하는 하위 흐름을 소유한다.

- 전원 참석과 일부 참석 허용, 필수 참석자, 최소 참석 인원 조건을 한 경계 안에서 표현한다.
- 다중 정보가 있는 선택 카드는 라디오형 복합 컨트롤로 유지하고, 최소 인원 스테퍼의 아이콘 명령만 shadcn `Button` primitive를 사용한다.
- 참석자 역할과 기준 변경은 상위 회의 초안으로 전달하며 판정 규칙을 컴포넌트에서 새로 계산하지 않는다.
- `AttendanceCriteriaStep.css`가 선택 카드, 필수 참석자, 최소 인원 스테퍼와 모바일 재배치를 소유하며 관련 selector는 `App.css`에서 제거했다.

`AttendeePeopleStep.tsx`는 사람 검색, 최근 함께한 사람, 선택 요약과 모바일 picker를 소유한다.

- 검색 필드는 shadcn 방식 `Input`, 추가·수정·삭제·닫기·완료 명령은 `Button` primitive를 사용한다.
- 사람 목록은 이름과 선택 상태를 함께 전달하는 복합 listbox option이므로 일반 버튼 primitive로 평탄화하지 않는다.
- 검색어, 최근 목록 저장과 선택 확정 상태는 상위 생성 흐름에 남기고 렌더링과 접근성 계약만 컴포넌트가 담당한다.
- `AttendeePeopleStep.css`가 데스크톱 검색, 선택 목록, 모바일 sheet와 반응형 규칙을 소유한다.

`MeetingBriefStep.tsx`는 회의 제목, 목적과 선택 자료 입력을 소유한다.

- 단문 입력은 shadcn 방식 `Input`, 장문 입력은 `Textarea`, 자료 추가·삭제 명령은 `Button` primitive를 사용한다.
- 필수 입력의 완료 여부와 회의 초안 상태는 상위 생성 흐름이 소유하고 컴포넌트는 입력 계약만 전달한다.
- `MeetingBriefStep.css`가 입력 필드, 선택 자료 disclosure와 자료 목록 스타일을 소유한다.

`MeetingTimeConstraintsStep.tsx`는 참석자에게 물어볼 날짜 범위와 회의 길이 입력을 소유한다.

- 날짜와 직접 입력은 `Input`, 닫기와 30분 증감 명령은 `Button` primitive를 사용한다.
- 빠른 시간 선택은 단일 값을 설명하는 복합 라디오이므로 기존 선택 구조를 유지한다.
- `meetingDuration.ts`가 30~240분, 30분 단위와 기본 선택지의 검증 계약을 단일화한다.
- `MeetingTimeConstraintsStep.css`가 날짜 필드, 시간 선택, 직접 입력과 모바일 재배치를 소유하며 관련 selector는 `App.css`에서 제거했다.

`MeetingAvailabilityStep.tsx`는 회의 조건을 확인한 뒤 주최자 가능 범위를 편집하는 단계를 소유한다.

- 회의 조건 요약과 수정 동작을 제공하고 실제 30분 페인트 입력은 `AvailabilityWindowPicker`에 위임한다.
- `MeetingAvailabilityStep.css`는 넓은 시간표 단계의 폭 계약만 소유한다.

`ResponseDeadlineStep.tsx`는 조율 범위 요약, 응답 마감 입력과 유효성 안내를 소유한다.

- `datetime-local` 변환과 첫 조율 시간 표시는 컴포넌트 내부에서 처리하고 변경된 ISO 값만 상위 흐름으로 전달한다.
- 마감 입력은 shadcn 방식 `Input`을 사용하고 `ResponseDeadlineStep.css`가 필드 폭과 높이를 소유한다.

`TimeStepSummary.tsx`는 시간 하위 단계에서 이전 설정을 한 줄로 확인하고 수정하는 공통 패턴이다.

- 수정 명령은 `Button` primitive를 사용하며 `TimeStepSummary.css`가 말줄임과 모바일 줄바꿈을 소유한다.

`CreateReviewStep.tsx`는 참석자에게 요청을 보내기 전 회의 안내, 참석 기준과 시간 범위를 확인하는 최종 단계를 소유한다.

- 회의 초안에서 참석자 수, 필수 참석자와 주최자 시간 범위를 파생하므로 상위 흐름은 초안과 선택된 참석 기준 모드만 전달한다.
- 평일 기본 범위와 실제 선택 범위를 비교해 제외·추가 시간을 요약하는 계산도 컴포넌트 내부에 둔다.
- `CreateReviewStep.css`가 섹션 구분, 사실 행, 시간 범위 요약과 모바일 열 너비를 소유한다.

## 주최자 결과 화면

`HostDecisionScreen.tsx`는 주최자 결과 화면의 조합과 상호작용 상태를 소유한다.

- 추천 후보 선별, 현재 후보 선택, 응답 요청 대상과 데모 재판정 상태를 한곳에서 관리한다.
- 후보 목록, 선택 후보 상세, 전체 후보 비교, 응답 요청 대화상자에는 계산 결과와 이벤트만 전달한다.
- `HostDecisionScreen.css`가 결과 화면의 프레임, 후보 열과 상세 열의 관계, 헤더와 모바일 재배치를 소유한다.
- 하위 컴포넌트의 카드·표·대화상자 스타일은 각 컴포넌트 CSS에 남겨 화면 레이아웃과 표현 책임을 분리한다.

`HostCandidateShortlist.tsx`는 추천 후보 목록과 현재 선택 상태를 표현한다.

- 후보 선택, 확정, 응답 요청, 다른 후보 보기 이벤트만 상위 화면에 전달한다.
- `HostCandidateShortlist.css`가 카드, 추천 표식, 상태색, 모바일 가로 목록을 소유한다.
- 사용되지 않던 과거 rank·status icon 스타일은 소유권 이전 과정에서 제거했다.
- 추천과 선택의 계산은 컴포넌트가 새로 만들지 않고 전달받은 판정 결과를 사용한다.
- 목록에서 중복되는 후보 개수와 정렬 설명은 기본 노출하지 않고, 추천 근거만 제목 옆 정보 툴팁으로 제공한다.

`HostCandidateDetail.tsx`는 선택한 후보의 판정 문장, 일정 부담, 응답 현황과 다음 행동을 표현한다.

- 상위 화면에서 계산된 `CandidateEvaluation`을 받아 사용자에게 필요한 근거로 변환한다.
- 후보 확정, 응답 요청, 대체 후보 선택, 참석 기준 수정 이벤트만 상위로 전달한다.
- READY·PENDING·IMPOSSIBLE 분기와 기존 DOM·class name은 유지한다.
- `HostCandidateDetail.css`가 상태 패널, 일정 부담, 응답 현황, 대기·제외 안내와 모바일 반응형을 소유한다.
- 현재 화면의 색상·간격·radius는 동일 값 `--mc-candidate-detail-*`와 spacing alias로 이전했다.
- 공통 타이포그래피 기본값은 `styles/global.css`, 상세 화면의 위계는 `HostCandidateDetail.css`가 소유한다.

`HostDecisionMatrix.tsx`는 전체 후보별 참석 가능 상태를 비교하는 표를 소유한다.

- `meeting`, 전체 판정 결과, 현재 선택된 후보 ID만 입력받는다.
- 후보 선택과 판정 계산 상태는 상위 `HostDecisionScreen`이 소유한다.
- `HostDecisionMatrix.css`가 표의 색상, 간격, radius, 상태, disclosure 반응형을 소유한다.
- 기존 DOM, class name, 기본 펼침 상태와 최종 적용값은 그대로 유지한다.
- 비교표의 글자 크기와 굵기 역할도 `HostDecisionMatrix.css`가 소유하며 루트 강제 selector를 사용하지 않는다.

`HostResponseRequestDialog.tsx`는 PENDING 후보에서 응답을 요청할 사람을 선택하는 포털 대화상자다.

- ESC, 바깥 영역 클릭, 닫기 버튼과 이전 포커스 복원 계약을 유지한다.
- 필수 미응답자와 선택 참석자 풀을 판정 결과 그대로 구분해 보여준다.
- `HostResponseRequestDialog.css`가 backdrop, 데스크톱 dialog, 모바일 bottom sheet와 체크박스 상태를 소유한다.

## 계정 화면

`AccountScreens.tsx`는 홈, 내 회의, 받은 요청, 알림과 계정 공통 내비게이션을 소유한다.

- 계정용 시나리오 fixture와 화면 간 콜백 계약을 한 모듈에서 관리한다.
- `App.tsx`는 계정 라우팅과 현재 회의 상태만 연결하며 목록 UI를 직접 렌더링하지 않는다.
- `AccountScreens.css`는 계정 헤더, 목록, 상태 표시와 모바일 하단 내비게이션의 반응형 규칙을 소유한다.
- 집중형 주최자 화면도 동일한 `GlobalAccountHeader`를 사용해 제품 셸의 시각적 연속성을 유지한다.

`HostShell.tsx`는 생성, 요청 완료, 응답 대기, 결과 확인, 확정 화면을 감싸는 주최자 공통 프레임이다.

- 회의 컨텍스트, 상태별 제목과 설명, 보조 내비게이션을 한곳에서 결정한다.
- `App.tsx`는 현재 주최자 상태와 라우트, 화면 콘텐츠만 전달한다.
- 계정 모듈의 `GlobalAccountHeader`를 재사용해 계정 화면과 집중 흐름 사이의 헤더 규칙을 통일한다.
- `HostShell.css`가 공통 컨텍스트 바, 콘텐츠 캔버스와 두 breakpoint의 반응형 규칙을 소유하며 `App.css`에는 해당 selector가 남지 않는다.

`RequestSentScreen.tsx`, `MeetingCriteriaReviewScreen.tsx`, `HostWaitingScreen.tsx`는 주최자 흐름의 개별 상태 화면을 소유한다.

- 요청 완료 화면은 전달 대상과 응답 상태 요약을 계산한다.
- 참석 기준 화면은 기준 변경 입력과 최소 참석 인원 제약을 관리한다.
- 응답 대기 화면은 응답 진행률, 정렬된 참석자 상태와 다시 알리기 로컬 상태를 관리한다.
- 각 화면의 레이아웃과 반응형 규칙은 같은 이름의 전용 CSS 파일에 있으며, 공통 `prototype-flow-action` 규칙만 전역에 남긴다.
- 생성·결과·응답·확정 흐름의 primary와 secondary 명령은 공통 shadcn `Button`을 사용하며, 후보 선택·시간표 셀처럼 자체 상호작용 모델이 있는 컨트롤만 raw button을 유지한다.

`MessageScreen.tsx`와 `InvalidParticipantInviteScreen.tsx`는 각각 확정 알림과 유효하지 않은 참석자 진입 상태를 소유한다.

- 확정 화면은 선택 후보의 최종 시각과 참석자 안내 문구를 계산해 보여준다.
- 초대 오류 화면은 참석자 공통 셸을 유지하면서 계정 알림을 통한 재진입만 안내한다.
- 두 화면의 상태별 레이아웃은 전용 CSS에 있고, 공통 버튼과 참석자 셸 규칙은 전역에 남는다.

`DevScreenSwitcher.tsx`는 개발용 fixture 목록과 화면 전환 UI를 소유한다.

- `DevScreen` 타입을 export해 데모 가이드와 앱의 fixture 전환 로직이 같은 계약을 사용한다.
- 현재 참석자 토큰은 props로 받아 라우트 파싱 책임을 개발 UI에서 분리한다.

`DemoGuide.tsx`는 제출용 핵심 시연의 5단계 탐색과 현재 단계 표시를 소유한다.

- 개발 화면 전환기와 같은 `DevScreen` 계약을 사용하지만, 평가자가 따라갈 핵심 흐름만 노출한다.
- 단계 판정은 현재 라우트와 수진의 제출 상태만 읽으며 앱 fixture를 직접 변경하지 않는다.

`lib/appRoutes.ts`는 앱 전체의 단일 라우트 타입과 해시 변환 경계다.

- 해시 파싱, 참석자 토큰 추출, 사용자 대상 판정과 해시 생성을 순수 함수로 제공한다.
- 개발 전용 계정 라우트 허용 여부를 명시적으로 받아 배포 경로와 테스트의 차이를 고정한다.

`hooks/useMeetingEditor.ts`는 회의 초안과 참석자 응답을 수정하는 React 상태 경계다.

- 생성 단계의 기본 정보, 시간 조건, 참석 기준, 참석자와 주최자 가능 범위 변경 명령을 제공한다.
- 참석자 제출 시 빈 시간대를 불가로 보수적으로 채우고 응답·변경 로그를 함께 갱신한다.
- 라우팅, 토스트와 데모 fixture 전환은 포함하지 않아 제품 상태 편집과 화면 전환을 분리한다.

`domain/prototypeState.ts`와 `domain/meetingChanges.ts`는 데모 상태 생성과 변경 로그 생성을 담당하는 순수 유틸이다.

- PENDING 시연 상태는 한 명의 응답이 결과를 바꾸는 fixture 계약을 만든다.
- 변경 로그 ID와 공통 메타데이터 생성 규칙은 화면과 훅에서 공유한다.

`hooks/useMeetCueController.ts`는 앱의 라우트와 시연 상태를 조합하는 최상위 오케스트레이션 경계다.

- 라우트 동기화, 후보 평가 시각, 선택 후보, 재요청 대상과 계정·DEV fixture 전환을 관리한다.
- 화면에서 발생하는 토스트 문구와 확정·요청·재판정 전환을 한곳에서 연결한다.
- `App.tsx`는 컨트롤러 결과를 계정, 참석자, 주최자 화면에 전달하는 조합만 담당한다.

`domain/accountScenarios.ts`는 후속 계정 화면에서 사용하는 회의 fixture를 소유한다.

- 화면 컴포넌트가 mock meeting 생성 로직을 갖지 않도록 시나리오 ID와 변환 규칙을 도메인에 둔다.

## 참여자 응답 화면

`ParticipantShell.tsx`는 참여자 응답 기능의 화면 경계다.

- 신규 응답, 수정, 제출 완료와 회의 확정 상태를 분기하고 각 하위 컴포넌트와 응답 편집 훅을 조합한다.
- 참여자 전용 응답 라벨, 더미 캘린더 fixture와 화면 제목 계산을 소유해 `App.tsx`의 전역 fixture를 제거했다.
- 참여자 상태 타입을 export해 라우트의 상태 판정과 같은 계약을 사용한다.

`ParticipantMeetingContext.tsx`는 참여자 응답 화면 상단의 회의 정보와 진행 조건을 소유한다.

- 모바일 회의 정보 disclosure, 회의 목적·요청자, 응답 마감과 조율 기간·회의 길이를 한 컴포넌트에서 일관되게 표현한다.
- 입력 시작 여부, 수정 상태, 남은 응답 수와 마감 경과 여부만 전달받으며 시간표 입력 상태는 소유하지 않는다.
- `ParticipantMeetingContext.css`가 데스크톱·모바일 회의 컨텍스트, 마감 카드, 수정 안내와 조율 조건 배치를 소유한다.

`ParticipantAvailabilityPanel.tsx`는 참여자가 응답 방식을 고르고 시간표를 편집·저장하는 화면 표현을 소유한다.

- 캘린더 일정 불러오기와 직접 입력, 초기화, 시간표, 미응답 칸 저장 확인과 데스크톱·모바일 CTA를 조합한다.
- 시간표 초안과 계산 결과를 props로 받는 제어형 컴포넌트이며 응답 데이터를 직접 생성하지 않는다.
- `ParticipantAvailabilityPanel.css`가 캘린더 불러오기, 입력 패널, 초기화, 저장 확인과 고정 모바일 CTA의 기존 cascade를 소유한다.

`useParticipantAvailabilityResponse.ts`는 참여자 시간 응답의 편집 상태를 소유한다.

- 기존 응답 초안, 입력 시작 방식, 캘린더 기본값 적용, 수동 수정된 칸과 저장 확인 상태를 관리한다.
- 전체 조율 슬롯 중 응답한 칸과 남은 칸을 계산하고 완성된 초안을 상위 제출 callback에 제공한다.

`ParticipantPageShell.tsx`는 참여자 응답 화면의 MeetCue 헤더와 개발용 결과 보드 진입점을 소유한다.

- `ParticipantPageShell.css` owns the shared participant canvas, sticky header, 800px content frame, responsive spacing, and schedule-entry safe-area behavior.

`CreateScreen.css` owns the complete create-flow frame and shared `.create-*` / `.time-create-stage*` layout contract; step-specific CSS files only own their local controls and content.

`CreateAttendeeFlow.css` owns the disclosure hierarchy shared by the people-selection and attendance-criteria substeps.

`ParticipantTimeGrid.css` now owns both interaction geometry and the final visual treatment; `App.css` no longer applies late time-grid overrides.

Shared action-row layout belongs to `ui/primitives.css`; `.prototype-flow-action` belongs to the host shell. Legacy command-button classes are not public contracts.

Application-wide accessibility and typography normalization live in `styles/global.css`; theme aliases live in `styles/meetcue-theme.css`. `App.css` no longer exists.

The application no longer imports ASTRYX reset, component CSS, or neutral-theme tokens. The small browser reset required by the existing visual baseline is owned explicitly by `styles/global.css`.

All active component styles consume canonical `--mc-*` tokens directly; no `--tds-*` compatibility aliases remain.

Typography uses the 400/500/600/700 role tokens. Component declarations participate in the normal cascade; `!important` is reserved for the third-party Sonner toast skin.

Buttons use explicit `variant` and `size` props. The `action` size preserves the 44px primary/secondary command contract, while `text` owns compact quiet commands; legacy button classes are not part of the API.

Host candidate actions use `fieldAction` for bordered requests and fallbacks, and `quiet` for criteria editing; screen CSS only owns their placement and local radius/color accents.

`MinimumAttendanceControl` is shared by create and criteria-review flows so the minimum-count constraints, accessible labels, stepper Button variants, and responsive geometry stay identical.

Input and SelectableCard base states are defined by CVA/Tailwind. Invitee and attendance selections use `isSelected`/`data-selected`; Avatar sizing is also a CVA contract.

Field owns its label, hint, and nested control context in `ui/field.css`. Form controls use the 44px default or 56px `field` size without screen-level height overrides.

Meeting-duration presets use SelectableCard's radio semantics and `data-selected` state; its custom duration editor composes Button and Input primitives.

Attendee removal uses the 36px `iconSmall` Button size, attendance steppers use `fieldAction`, and the mobile people picker supports backdrop and Escape dismissal.

- 응답 입력, 완료와 확정 화면이 같은 페이지 셸을 사용해 헤더 DOM과 동작을 중복하지 않는다.

`ParticipantDoneScreen.tsx`와 `ParticipantConfirmedScreen.tsx`는 제출 이후의 두 결과 상태를 소유한다.

- 완료 화면은 참석 가능한 응답 유무에 따라 저장 결과와 수정 동작을 안내한다.
- 확정 화면은 최종 후보와 ‘일정 조정하면 가능’ 응답 여부를 근거로 후속 안내를 제공한다.
- 완료 카드와 확정 안내 스타일은 각각의 전용 CSS로 `App.css`에서 이동했다.
- 과거 glass panel과 host 내부 selector를 제거하고 최종 포털 계산값을 `--mc-request-*` 토큰으로 고정했다.
