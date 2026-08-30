# Meeting Cue

## 회의 시간을 고르는 일을, 결정 가능한 상태로

Meeting Cue는 가장 많은 표를 받은 시간을 보여주는 단순 일정 투표가 아닙니다. 참석자의 응답을 회의 성립 조건과 조정 리스크로 해석해, 주최자에게 **지금 확정해도 되는지, 무엇을 더 확인해야 하는지, 다음에 어떤 행동을 해야 하는지** 알려주는 의사결정 지원 프로토타입입니다.

> 응답은 가볍게, 해석은 제품이, 결정은 주최자가.

- [라이브 데모](https://johneybi.github.io/meetcue/toss)
- [CASE STUDY](CASE-STUDY.md)

## 문제와 아이디어

업무 회의에는 `모두 참석해야 하는 사람`, `최소 참석 인원`, `일정 조정이 필요한 사람`, `아직 답하지 않은 사람`이 함께 존재합니다. 단순히 가능한 표를 세면 필수 참석자가 빠진 후보나 조정 리스크가 큰 후보를 구분하기 어렵습니다.

Meeting Cue는 다음 정보를 분리해 수집하고, 주최자의 판단에 필요한 상태로 다시 묶습니다.

```text
회의 맥락·역할·성립 기준
→ 주최자와 참석자의 시간 정보
→ 확보 시간과 연속 가용성으로 파생 후보 계산
→ 필수 응답·최소 인원·조정 리스크 평가
→ 확정 / 확인 / 추가 요청 / 회복
```

v2.3에서 입력의 기본 단위는 정확한 후보 블록이 아니라 `조율 가능 시간대`입니다. 주최자가 30분 단위의 연속 시간대를 표시하면, 제품이 확보 시간에 맞는 시작 시각을 계산합니다. 단, 현재 프로토타입의 참석자 화면은 아직 계산된 후보마다 `가능해요 / 일정 조정하면 가능해요 / 어려워요`를 응답하는 단계이며, 참석자 가용시간 그리드로의 전환은 다음 구현 범위입니다.

## 상태 모델

화면을 기능 메뉴로 나누기보다 현재 사용자가 답해야 할 질문과 다음 행동으로 연결합니다.

```text
ENTRY
  → HOST_DRAFT
  → HOST_SHARE_READY
  → HOST_WAITING_EMPTY / HOST_WAITING_PARTIAL
  → HOST_DECISION_READY / HOST_REVIEW_NEEDED
  → HOST_RECOVERY_REQUIRED
  → HOST_CONFIRMED

PARTICIPANT_NEW → PARTICIPANT_EDITING → PARTICIPANT_DONE
                         └→ PARTICIPANT_ADDED_ONLY
```

후보 상태는 `confirmable`, `needs_adjustment`, `waiting_required`, `excluded`로 분리합니다. 주최자는 제품이 자동으로 확정한 결과를 받는 대신, 후보별 근거를 확인하고 최종 시간을 선택합니다.

## 역할과 구현 근거

이 프로젝트에서 맡은 역할은 문제 정의, 제품·UX 상태 모델링, 인터랙션 설계, React 프론트엔드 구현입니다.

- `src/domain/meeting.ts`: 참석자 역할, 3상태 응답, 회의·후보·가용시간 데이터 계약과 상태 라벨
- `src/domain/availability.ts`: 30분 단위 시간대 병합과 확보 시간 기반 파생 후보 계산
- `src/domain/evaluation.ts`: 필수 참석자, 최소 참석 인원, 미응답, 조정 가능, 선호 조건을 후보 상태와 설명으로 변환
- `src/App.tsx`: 생성 → 링크 공유 → 참석자 응답 → 주최자 결정 → 기존 링크 기반 회복 흐름, PC·모바일 시간대 선택, 응답 수정
- `docs/design/architecture.md`: 라우트, 화면 템플릿, 상태 전이, 반응형 실행 기준
- `docs/design/visual-system.md`: TDS-inspired 토큰, 위계, 간격, 상태 표현 기준

현재 구현은 브라우저 내 프로토타입 상태를 사용합니다. 영속 저장, 캘린더 연동, 자동 발송, AI 추천은 범위에 포함하지 않습니다.

## 기술 스택

`package.json` 기준:

- React `19.2.7` + React DOM
- TypeScript `~6.0.2`
- Vite `^8.1.0`
- `react-aria-components` — 접근성 있는 상호작용 primitives
- `@internationalized/date` — 날짜·주간 시간 선택
- `lucide-react` — 아이콘
- ASTRYX `core`, `theme-neutral`, `cli` — 런타임·테마·탐색 도구
- ESLint 10 + TypeScript ESLint + Prettier 3
- Vitest `^4.1.11` — 도메인 테스트

## 실행 스크립트

```bash
npm run dev          # 개발 서버
npm run check        # TypeScript 프로젝트 검사
npm run lint         # ESLint
npm run build        # tsc -b + Vite production build
npm run test:domain  # 도메인 테스트
npm run format       # Prettier 적용
npm run format:check # Prettier 검사
npm run preview      # production build 미리보기
```

`src/domain/domain.test.ts`에 시간대 병합·파생 후보·후보 평가를 검증하는 Vitest 테스트가 있습니다. [.github/workflows/domain-ci.yml](.github/workflows/domain-ci.yml)은 push와 pull request에서 타입 검사, 도메인 테스트, lint, build를 실행하도록 구성되어 있습니다. 도메인 함수는 UI와 분리되어 있어 입력·출력 계약 중심으로 확장할 수 있습니다.

## 설계 문서

제품과 구현의 기준이 되는 문서를 목적별로 골라 읽을 수 있습니다.

- [문서 인덱스](docs/README.md)
- [제품 명세](docs/product/prd.md)
- [UX 아키텍처](docs/design/architecture.md)
- [시각 시스템](docs/design/visual-system.md)
- [주최자 역할·시간 모델 v2.0](docs/product/host-time-model-decision-v2.0.md)
- [일정 확보 시간 v2.1](docs/product/meeting-time-reservation-decision-v2.1.md)
- [30분 시간 최소 단위 v2.2](docs/product/time-quantum-decision-v2.2.md)
- [조율 가능 시간대 모델 v2.3](docs/product/availability-window-model-decision-v2.3.md)
