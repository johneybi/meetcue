# MeetCue

여러 사람의 가능한 시간을 모으는 데서 끝나지 않고, 지금 회의를 확정해도 되는지 판단할 수 있도록 돕는 일정 조율 도구예요.

[데모 체험하기](https://johneybi.github.io/meetcue/toss)

> 문제 정의와 UX 설계부터 인터랙션 디자인, React 구현, 배포까지 직접 진행한 개인 프로젝트예요.

<!-- 배포 전 확인: 위 데모 URL에서 직접 접속과 새로고침이 정상 동작하는지 검증해 주세요. -->

## 응답을 모은 다음이 더 어려웠어요

기존 일정 조율 도구는 가장 많은 사람이 선택한 시간을 찾는 데 집중해요. 하지만 실제로 회의를 만드는 사람은 단순한 득표수만으로 시간을 정하기 어려워요.

- 꼭 참석해야 하는 사람들의 응답이 모였는지
- 지금 확정할 수 있는 시간이 있는지
- 더 기다려야 한다면 누구의 응답이 필요한지
- 모두가 가능한 시간이 없다면 어떤 선택지가 남는지

MeetCue는 응답을 수집하는 화면보다 **확정할 수 있는 상태를 설명하고 다음 행동을 제안하는 과정**에 집중했어요.

## 이렇게 풀었어요

### 참석자를 같은 조건으로 계산하지 않았어요

꼭 참석해야 하는 사람과 선택적으로 참석할 수 있는 사람을 구분했어요. 단순히 가장 많은 사람이 선택한 시간이 아니라, 실제 회의가 성립하는 조건을 기준으로 후보 시간을 판단해요.

### 후보 시간마다 판단 가능한 상태를 만들었어요

후보 시간을 `확정 가능`, `응답 대기`, `확정 불가` 상태로 나눴어요. 결과만 보여주지 않고 왜 그런 상태인지, 지금 무엇을 할 수 있는지도 함께 알려줘요.

### 응답이 덜 모여도 다음 행동을 보여줘요

모든 응답이 올 때까지 화면을 멈춰두지 않았어요. 누구의 응답이 더 필요한지와 현재 남아 있는 선택지를 보여줘서 조율을 이어갈 수 있게 했어요.

## 데모에서 확인할 수 있어요

1. 주최자가 회의 정보와 참석 기준을 정해요.
2. 참석자가 가능한 시간을 응답해요.
3. 응답에 따라 후보 시간의 상태와 판단 근거가 달라져요.
4. 주최자가 가능한 선택지를 확인하고 회의 시간을 확정해요.

별도 로그인 없이 웹에서 직접 체험할 수 있어요.

## 제가 맡은 범위예요

개인 프로젝트로 아래 과정을 직접 수행했어요.

- 문제 정의와 제품 구조 설계
- 사용자, 상태, 의사결정 모델 정의
- 정보 구조와 사용자 흐름 설계
- UX writing과 인터랙션 디자인
- 디자인 시스템과 반응형 UI 설계
- React·TypeScript 기반 프로토타입 구현
- 도메인 로직 테스트와 GitHub Pages 배포

## 구현 환경

- React 19
- Vite
- TypeScript
- `@astryxdesign/core`
- `@astryxdesign/theme-neutral`
- `@astryxdesign/cli`
- `react-aria-components`
- `@internationalized/date`
- `lucide-react`
- ESLint
- Prettier

## 로컬에서 실행하기

```bash
npm install
npm run dev
```

검증 명령은 다음과 같아요.

```bash
npm run check
npm run test:domain
npm run lint
npm run build
```

<details>
<summary>제품·설계 문서 보기</summary>

### 문서를 보는 순서

`.local-docs/README.md`에서 문서의 관계와 변경 이력을 확인할 수 있어요. 현재 구현을 이해할 때는 아래 문서를 순서대로 보면 돼요.

1. `.local-docs/sprint-decision-coherence-v2.2.1.md` — 현재 목표와 완료 조건
2. `.local-docs/prd-v2.2.1.md` — 제품 범위와 사용자 계약, 인수 조건
3. `.local-docs/decision-model-v2.2.md` — 후보 시간의 상태와 설명 규칙
4. `UX-ARCHITECTURE.md` — 정보 구조, 상태, 화면 구조, 반응형 동작
5. `DESIGN.md` — TDS에서 영감을 받은 시각 언어와 컴포넌트 원칙

그 외 IA, 생성 흐름, 레이아웃 전략, 리서치, QA 문서는 현재 구현에 이르기까지의 판단 기록이에요.

### 핵심 도메인 모델

- 참석자 역할: `required` / `optional`
- 주최자: 항상 참석하며, 탐색 범위를 확인하거나 수정하고 최종 결정을 내려요.
- 시간 모델: 회의 가능 범위 + 확보 시간 + 가능한 시간대 → 후보 시간 → 응답 마감
- 응답 값: 30분 단위의 `available` / `adjustable` / `unavailable`
- 후보 상태: `ready` / `pending` / `impossible`
- 제출 경계: 저장하지 않은 임시 응답은 주최자의 판단에 반영하지 않아요.
- 응답 대기: 필수 참석자와 대체 가능한 선택 참석자 그룹을 구분해요.

### 세부 의사결정 기록

- `.local-docs/availability-window-model-decision-v2.3.md`
- `.local-docs/host-time-model-decision-v2.0.md`
- `.local-docs/host-search-scope-input-decision-v2.4.md`
- `.local-docs/participant-availability-input-decision-v2.6.md`
- `.local-docs/meeting-time-reservation-decision-v2.1.md`
- `.local-docs/time-quantum-decision-v2.2.md`

</details>

<details>
<summary>ASTRYX 개발 참고사항 보기</summary>

ASTRYX는 프런트엔드 런타임과 구현 프리미티브를 제공해요. 시각적 기준은 `DESIGN.md`를 따라요. 익숙하지 않은 컴포넌트를 추가하기 전에는 아래 명령으로 먼저 확인해요.

```bash
npx astryx build
npx astryx search <query>
npx astryx component <ComponentName>
npx astryx docs tokens
```

</details>
