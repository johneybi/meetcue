# 회의 결정 모델 v2.2

- 상태: 구현 계약
- 기준 문서: `prd-v2.2.md`
- 기준일: 2026-07-11
- 적용 범위: 백엔드 없는 P0 프로토타입

## 1. 목적과 보증 범위

이 문서는 시간 칸 원본을 후보별 회의 성립 상태, 이유, 남은 긍정 응답 조건으로 변환하는 단일 도메인 계약이다.

제품이 보증하는 것은 다음이다.

> 주최자가 설정한 필수 참석자와 최소 참석 인원 기준에 대해 같은 입력은 항상 같은 판정과 설명을 만든다.

제품은 회의의 실제 중요도, 참석자의 대체 가능성, 연락 순서, 주최자가 입력한 기준의 업무 적절성을 판단하지 않는다.

## 2. 시간 조건과 대표 fixture

```text
timezone = Asia/Seoul
timeQuantumMinutes = 30
reservedDurationMinutes = 주최자가 선택한 30분의 양의 배수
fixtureReservedDurationMinutes = 60
```

- 후보는 주최자가 연 시간 범위 안에서만 생성한다.
- 후보 시작 간격은 30분이다.
- 후보는 하루를 넘어가지 않는다.
- 응답 마감은 후보 상태를 바꾸지 않는다.

## 3. 회의 기준 정규화

모든 회의는 판정 전에 다음 값을 가진다.

```text
R = 필수 참석자 ID 집합
Q = 최소 참석 인원
T = 전체 참석자 ID 집합
H = 주최자 ID
```

불변식:

```text
H ∈ R
R ⊆ T
|R| <= Q <= |T|
```

정규화:

```text
전원 참석:
R = T
Q = |T|

일부 불참 가능, 필수 참석자만 필요:
R = {H} ∪ 주최자가 선택한 필수 참석자
Q = |R|

일부 불참 가능, 전체 인원 기준도 필요:
R = {H} ∪ 주최자가 선택한 필수 참석자
Q = 입력값을 |R| 이상 |T| 이하로 제한
```

## 4. 응답 원본

### 4.1 사람 단위 제출 상태

```text
NOT_STARTED
DRAFT
SUBMITTED
```

- `NOT_STARTED`, `DRAFT`: 모든 후보에서 `UNKNOWN`
- `SUBMITTED`: 시간 칸 원본을 후보 상태로 집계
- P0에서는 부분 제출과 공유 후 시간 범위 확장을 지원하지 않음

편집 중인 로컬 초안은 마지막 제출본과 분리한다. 첫 제출 전 초안은 판정에 들어가지 않으며, 제출본을 수정하는 동안에는 마지막 제출본이 새 초안을 저장할 때까지 유효하다. 이때 판정 입력의 `submissionStatus`는 마지막 제출본의 상태를 뜻한다.

### 4.2 시간 칸 상태

```text
UNSET
AVAILABLE
ADJUSTMENT_COMMIT
UNAVAILABLE
```

- `UNSET`은 제출 전 초안에만 존재한다.
- 제출 확인 시 기존 범위의 `UNSET`을 `UNAVAILABLE`로 확정한다.
- `ADJUSTMENT_COMMIT`은 회의가 해당 시간으로 정해지면 일정을 옮겨 참석하겠다는 확약이다.

## 5. 파생 후보

주최자 시간 범위 `[start, end)`에서 다음 조건을 만족하는 각 시작 시각을 후보로 만든다.

```text
candidateStart >= windowStart
candidateEnd = candidateStart + reservedDurationMinutes
candidateEnd <= windowEnd
candidateStart는 30분 경계
candidateStart와 candidateEnd는 같은 Asia/Seoul 날짜
```

후보 ID는 회의 ID와 시작·종료 시각에서 안정적으로 만든다.

## 6. 참석자별 후보 상태

주최자는 모든 파생 후보에서 `AVAILABLE`이다.

일반 참석자의 1시간 후보는 두 개의 30분 칸을 다음 우선순위로 집계한다.

```text
UNAVAILABLE > UNKNOWN > ADJUSTMENT_COMMIT > AVAILABLE
```

규칙:

1. 제출하지 않았으면 `UNKNOWN`
2. 후보 칸 중 하나라도 `UNAVAILABLE`이면 `UNAVAILABLE`
3. 그렇지 않고 하나라도 `UNSET` 또는 범위 미응답이면 `UNKNOWN`
4. 그렇지 않고 하나라도 `ADJUSTMENT_COMMIT`이면 `ADJUSTMENT_COMMIT`
5. 모두 `AVAILABLE`이면 `AVAILABLE`

선호는 가용 상태와 분리한다. 후보 칸 중 하나라도 `AVOID_PREFERRED`이면 해당 참석자를 선호 부담 집합에 포함한다.

## 7. 후보별 파생 집합

```text
R = 필수 참석자
Q = 최소 참석 인원
C = AVAILABLE 또는 ADJUSTMENT_COMMIT인 참석자
U = UNKNOWN인 참석자
N = UNAVAILABLE인 참석자
A = ADJUSTMENT_COMMIT인 참석자
P = AVOID_PREFERRED가 있는 참석자
```

모든 참석자는 한 후보에서 정확히 `C`, `U`, `N` 중 하나에 속한다.

## 8. 후보 상태

판정 순서는 다음과 같다.

### 8.1 IMPOSSIBLE

```text
R ∩ N != ∅
또는
|C| + |U| < Q
```

설명 우선순위:

1. 어려운 필수 참석자 이름
2. 모든 미응답자가 가능해도 최소 인원을 충족하지 못한다는 사실

### 8.2 READY

```text
R ⊆ C
그리고
|C| >= Q
```

일반 미응답자는 READY를 막지 않는다. `A`와 `P`는 확정을 막지 않고 부담 정보와 후보 정렬에만 사용한다.

### 8.3 PENDING

```text
READY도 아니고 IMPOSSIBLE도 아님
```

## 9. PENDING 설명 값

```text
requiredPending = R ∩ U
optionalPendingPool = U - R

positiveResponsesNeededAfterRequiredYes =
max(0, Q - (|C| + |requiredPending|))
```

불변식:

```text
positiveResponsesNeededAfterRequiredYes <= |optionalPendingPool|
```

설명 계약:

- `requiredPending`은 이름으로 표시한다.
- `optionalPendingPool`은 대체 가능한 대상군으로 표시한다.
- 필요한 것은 단순 응답 수가 아니라 가능 응답 수라고 표현한다.
- `먼저`, `그다음`처럼 연락 순서를 만들지 않는다.
- 제품은 대상군 중 한 명을 자동 추천하지 않는다.

## 10. 응답 마감

- 마감 전후로 `C`, `U`, `N`의 의미는 바뀌지 않는다.
- 마감 경과만으로 PENDING을 IMPOSSIBLE로 바꾸지 않는다.
- 마감 경과는 `deadlinePassed` 보조 플래그로만 반환한다.
- UI는 마감 경과와 현재 후보 상태를 함께 설명한다.

## 11. 후보 비교

숨겨진 종합 점수를 만들지 않고 사전식 정렬을 사용한다.

상태 순서:

```text
READY
PENDING
IMPOSSIBLE
```

READY 내부:

1. `|A|`가 적음
2. `|P|`가 적음
3. 일반 미응답자가 적음
4. `|C|`가 많음
5. 시작 시각이 빠름

PENDING 내부:

1. `|requiredPending|`이 적음
2. `positiveResponsesNeededAfterRequiredYes`가 적음
3. `|A|`가 적음
4. `|P|`가 적음
5. 시작 시각이 빠름

시간순은 안정적인 표시 순서일 뿐 추천 근거가 아니다.

## 12. 후보군

시간상 인접한 후보가 다음 decision signature를 모두 공유할 때만 같은 후보군으로 묶는다.

```text
status
attendeeStateById
requiredPending IDs
optionalPendingPool IDs
positiveResponsesNeededAfterRequiredYes
adjustmentCommit IDs
avoidPreferred IDs
```

- 인원수만 같고 사람이 다르면 묶지 않는다.
- 전체 요약은 후보군 수가 아니라 실제 시작 시각 수를 센다.
- 후보군은 실제 시작 시각 목록을 보존한다.
- 첫 화면에는 상태별 상위 3개 후보군을 보여준다.

## 13. 재판정

- 응답 추가·수정 후 모든 후보를 순수 함수로 다시 계산한다.
- 시간 칸 원본은 후보 ID와 독립적으로 유지한다.
- 기존 범위 안의 응답 수정만 P0에서 지원한다.
- 같은 입력은 항상 같은 후보, 상태, 정렬, 후보군을 만든다.

## 14. 필수 자동화 테스트

### 회의 기준

1. 주최자가 필수 참석자와 최소 인원에 한 번만 포함된다.
2. 전원 참석은 `R=T`, `Q=|T|`가 된다.
3. 최소 인원은 `|R|...|T|` 범위를 벗어나지 않는다.

### 시간 집계

4. 가능+가능은 가능이다.
5. 가능+조정 확약은 조정 확약이다.
6. 가능+어려움은 어려움이다.
7. 가능+미응답은 미응답이다.
8. 미제출 참석자는 모든 후보에서 미응답이다.

### 후보 판정

9. 필수 참석자가 어려우면 다수가 가능해도 IMPOSSIBLE이다.
10. 일반 미응답이 남아도 필수 참석자와 Q를 충족하면 READY이다.
11. 필수 미응답자는 requiredPending에만 들어간다.
12. 일반 미응답자는 한 명을 임의 선택하지 않고 optionalPendingPool에 들어간다.
13. 필수 긍정 응답은 Q 계산에 중복되지 않는다.
14. 모든 미응답자가 가능해도 Q를 못 채우면 IMPOSSIBLE이다.
15. 조정 확약은 C에 포함되며 READY를 막지 않는다.
16. 마감이 지나도 미응답은 UNKNOWN이고 상태를 자동 제외하지 않는다.

### 후보군과 재판정

17. 동일한 인접 signature만 묶는다.
18. 사람이 다르면 인원수가 같아도 묶지 않는다.
19. 응답 변경 후 상태와 PENDING 설명값이 다시 계산된다.
20. 같은 입력은 같은 결과를 만든다.
