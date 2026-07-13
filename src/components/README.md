# 시간 입력 컴포넌트

## 현재 주최자 흐름

주최자 가능 시간 화면은 `App.tsx`의 `AvailabilityWindowPicker`에 구현된 페인트 입력을 사용한다.

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

## 주최자 결과 화면

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
- 공통 타이포그래피 역할만 `App.css`의 공유 규칙을 계속 사용한다.

`HostDecisionMatrix.tsx`는 전체 후보별 참석 가능 상태를 비교하는 표를 소유한다.

- `meeting`, 전체 판정 결과, 현재 선택된 후보 ID만 입력받는다.
- 후보 선택과 판정 계산 상태는 상위 `HostDecideScreen`이 소유한다.
- `HostDecisionMatrix.css`가 표의 색상, 간격, radius, 상태, disclosure 반응형을 소유한다.
- 기존 DOM, class name, 기본 펼침 상태와 최종 적용값은 그대로 유지한다.
- 전역 글자 크기와 굵기 역할은 아직 `App.css`의 공통 타이포그래피 규칙을 사용한다.
- 스타일 정상화는 소유권 이전과 분리된 작업에서 시각 동등성을 확인한 뒤 진행한다.

`HostResponseRequestDialog.tsx`는 PENDING 후보에서 응답을 요청할 사람을 선택하는 포털 대화상자다.

- ESC, 바깥 영역 클릭, 닫기 버튼과 이전 포커스 복원 계약을 유지한다.
- 필수 미응답자와 선택 참석자 풀을 판정 결과 그대로 구분해 보여준다.
- `HostResponseRequestDialog.css`가 backdrop, 데스크톱 dialog, 모바일 bottom sheet와 체크박스 상태를 소유한다.
- 과거 glass panel과 host 내부 selector를 제거하고 최종 포털 계산값을 `--mc-request-*` 토큰으로 고정했다.

`HostCandidateCalendar.tsx`는 전체 후보를 날짜와 30분 시작 시각으로 비교하는 시간 지도를 소유한다.

- 전체 후보의 READY·PENDING·IMPOSSIBLE 개수, 날짜 그룹과 연결 구간을 전달된 판정 결과에서 계산한다.
- 모바일 날짜 선택은 현재 선택 후보 ID에 귀속해, 외부에서 후보가 바뀌면 해당 날짜로 다시 동기화한다.
- 공통 날짜·시간 포맷은 `lib/candidateTime.ts`, 반응형 감지는 `hooks/useMediaQuery.ts`를 사용한다.
- 스타일은 아직 `App.css`에 있으며 다음 이전 단위에서 최종 계산값을 토큰과 전용 CSS로 옮긴다.
