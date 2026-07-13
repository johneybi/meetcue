# MeetCue Design System

상태: **현행 시각 언어의 단일 실행 기준 (v2)**

방향: 빠르고 차분한 한국형 의사결정 제품 UI

적용 범위: 구현 프레임워크와 무관한 시각·상호작용 계약

## 1. 문서 경계

이 문서는 제품 기능, 화면 목록, 사용자 흐름, 정보 구조를 결정하지 않는다.

- 제출 범위: `.local-docs/p0-submission-scope-lock-v2.10.md`
- 제품 범위와 요구사항: `.local-docs/prd-v2.2.1.md`
- UX 구조와 반응형 동작: `UX-ARCHITECTURE.md`
- 시각 언어와 컴포넌트 표현: `DESIGN.md`
- 과거 디자인 방향의 채택·폐기 기록: `DESIGN-DECISIONS.md`
- 리팩터링 중 보존·정상화 기준: `DESIGN-REFACTOR-BASELINE.md`

PRD와 UX Architecture가 무엇을 보여줄지 결정한다. 이 문서는 그것을 어떤 위계, 밀도, 색상, 타이포그래피, 간격, 상태 표현으로 보여줄지 결정한다.

## 2. 구현 원칙

- 이 문서는 ASTRYX, Tailwind, shadcn/ui, OMD 또는 특정 생성 도구에 종속되지 않는다.
- 라이브러리는 접근성 있는 동작과 구현 효율을 제공하며, MeetCue의 외형을 결정하지 않는다.
- 시각 기준은 이 문서의 MeetCue 토큰과 규칙이다.
- 라이브러리 기본 외형이 이 문서와 충돌하면 이 문서의 시각 규칙을 따른다.
- 공식 Toss 로고, 브랜드 마크, 독점 에셋은 사용하지 않는다.
- 공식 TDS 패키지를 설치하거나 비공개 구현을 가정하지 않는다.
- 새 색상과 간격을 컴포넌트 안에 직접 추가하지 않는다. 먼저 공통 토큰으로 정의한다.
- 구조 문제를 padding, shadow, 임의의 max-width로 숨기지 않는다.
- 기존 화면은 참고 자료이지 명세가 아니다. 의도적인 UX와 시각 결정만 보존하고 CSS 충돌로 생긴 결과는 정상화한다.

디자인 근거의 우선순위:

1. 사용자가 승인한 현재 제품 결정
2. 이 문서
3. `UX-ARCHITECTURE.md`의 정보 위계와 반응형 계약
4. `DESIGN-REFACTOR-BASELINE.md`에서 보존 대상으로 판정한 현재 화면
5. TDS에서 확인한 일반 원칙
6. OMD, Creative Production 무드보드, Figma, 과거 QA 산출물

하위 근거는 상위 근거를 덮어쓸 수 없다.

## 3. 스타일 방향

화면은 다음처럼 느껴져야 한다.

- 장식보다 명확함이 먼저다.
- 표현보다 다음 행동이 먼저다.
- 가볍지만 비어 보이지 않는다.
- 따뜻하지만 귀엽지 않다.
- 확신이 있지만 과장되지 않는다.
- 모바일 앱 수준의 정교함을 PC까지 확장한다.

품질은 다음 요소에서 만든다.

- 강하고 짧은 제목
- 명확한 회색 위계
- 절제된 파란색
- 정확한 간격
- 일관된 radius
- 낮은 그림자 의존도
- 짧은 한국어 제품 문장
- 분명한 선택·대기·오류·완료 상태

피해야 할 방향:

- 일반적인 SaaS 대시보드
- 장식적인 랜딩페이지 조형
- 과도하게 조밀한 엔터프라이즈 관리자 화면
- 카드 안의 카드
- 기능을 설명하는 텍스트가 많은 와이어프레임
- 임의의 액센트 도형과 색상 블록

## 4. 색상 토큰

토큰 이름은 MeetCue가 소유한다. 리팩터링 중에는 기존 `--tds-*` 변수를 아래 토큰의 호환 alias로만 유지하고, 새 컴포넌트에서는 사용하지 않는다.

### Foundation

```css
--mc-color-canvas: #f6f8fb;
--mc-color-surface: #ffffff;
--mc-color-surface-subtle: #f4f7fb;
--mc-color-surface-pressed: #e8edf4;
--mc-color-border: #e7ecf3;
--mc-color-border-strong: #cfd8e5;
```

### Text

```css
--mc-color-text-primary: #151b24;
--mc-color-text-secondary: #2f3744;
--mc-color-text-tertiary: #46515f;
--mc-color-text-muted: #596574;
--mc-color-text-placeholder: #626d7c;
--mc-color-disabled: #b0b8c1;
```

### Primary

```css
--mc-color-accent-soft: #e8f3ff;
--mc-color-accent-soft-strong: #c9e2ff;
--mc-color-accent: #1f6feb;
--mc-color-accent-pressed: #1558c9;
```

### Semantic

```css
--mc-color-success: #007f65;
--mc-color-success-soft: #e6f8f3;
--mc-color-warning: #9a5700;
--mc-color-warning-soft: #fff4d6;
--mc-color-danger: #c23542;
--mc-color-danger-soft: #ffecef;
```

색상 규칙:

- 파란색은 주 CTA, 포커스, 선택 상태에 사용한다.
- 초록색은 안전하거나 완료된 상태에만 사용한다.
- 노란색은 확인 필요, 대기, 주의 상태에만 사용한다.
- 빨간색은 불가, 차단, 삭제, 오류 상태에만 사용한다.
- 대부분의 화면은 흰색과 회색이 지배해야 한다.
- 상태마다 색을 하나씩 배정해 화면 전체를 다채롭게 만들지 않는다.
- 보라색 계열, 베이지 중심 팔레트, 짙은 네이비 테마, 장식용 그라디언트를 사용하지 않는다.
- 선택 상태를 색상만으로 전달하지 않는다.

## 5. 타이포그래피

기본 서체:

```css
Pretendard, -apple-system, BlinkMacSystemFont, system-ui, "Segoe UI", sans-serif
```

워드마크 서체:

```css
"futura-100", Futura, "Century Gothic", sans-serif
```

- Adobe Fonts 키트 `dcj5tyi`를 사용한다.
- `MeetCue` 워드마크에만 Futura 100 normal 500을 적용한다.
- 기본 헤더 락업은 28px 엠블럼과 19px 워드마크를 사용한다.
- 한국어 본문과 제품 UI에는 적용하지 않는다.
- 웹폰트를 불러오지 못하면 Futura 계열 시스템 폰트로 대체한다.

타입 스케일:

| 역할 | 크기 / 행간 | 굵기 |
| --- | --- | --- |
| Display | 32 / 42 | 700 |
| Page title | 26 / 36 | 700 |
| Section title | 20 / 30 | 600 |
| Card title | 17 / 26 | 600 |
| Body | 15 / 24 | 400~500 |
| Body strong | 15 / 24 | 600 |
| Body small | 14 / 22 | 400~500 |
| Caption | 13 / 20 | 400~500 |
| Label | 13 / 20 | 500~600 |
| Compact label | 12 / 18 | 500~600 |
| Dense axis | 11 / 17 | 500~600 |

규칙:

- 글자 크기를 viewport 너비로 비례 확대하지 않는다.
- 음수 letter-spacing을 사용하지 않는다.
- 한국어 본문은 충분한 행간을 사용한다.
- 작은 라벨을 여러 층으로 쌓지 않는다.
- 굵기는 정보 위계를 위해 사용한다.
- 한국어 제품 화면에서는 500과 600을 기본 위계로 사용한다.
- 700은 페이지 제목과 제품명처럼 화면에서 한 번만 강조되는 요소에 제한한다.
- 800과 900은 사용하지 않는다. 크기, 간격, 색으로 먼저 위계를 만든다.
- 한 영역에서 제목, 숫자, 라벨, 버튼을 모두 굵게 만들지 않는다.
- 10~13px 기능 라벨은 400으로 낮추지 않는다. 입력·단계·범례는 500, 상태·필수 배지는 600을 사용한다.
- 버튼 안의 자식 텍스트는 버튼의 600 굵기를 상속한다.
- 도움말, 날짜, 설명성 메타 정보만 400을 허용한다.
- 10px 텍스트는 사용하지 않는다.
- 11px은 시간 지도 축처럼 밀도가 필수인 보조 정보에만 사용한다.
- 입력·상태·단계처럼 과업에 필요한 라벨은 13px을 기본값으로 사용한다.
- 비교되는 숫자에는 tabular numbers를 사용한다.
- 제목은 한 문장 이내로 유지한다.
- 버튼 문구는 한 줄을 넘기지 않는다.

## 6. 간격

4px 기반 스케일:

```text
4, 8, 12, 16, 20, 24, 32, 40, 48, 64
```

기준:

- 모바일 페이지 여백: 16~20px
- PC 페이지 여백: 32~40px
- 큰 섹션 사이: 24~32px
- 관련 입력 사이: 16~24px
- 같은 그룹 안의 요소: 8~12px
- 표면 내부 여백: 20~32px
- 리스트 행 세로 여백: 12~16px
- 최소 조작 영역: 44px

규칙:

- 캔버스를 채우기 위해 요소를 균등 분산하지 않는다.
- 관련 없는 컨트롤을 한 행에 억지로 배치하지 않는다.
- 같은 의미 수준은 같은 간격을 사용한다.
- 필드마다 서로 다른 max-width를 부여해 가시적인 다중 컨테이너를 만들지 않는다.
- 리팩터링 중 기존 픽셀을 보존하기 위한 `--mc-space-*` 호환 alias는 4px 스케일 밖의 값을 가질 수 있다. 이는 새 컴포넌트가 사용할 간격 스케일이 아니며, 시각 정상화 단계에서 별도로 검토한다.

## 7. Radius

```text
Small control: 8px
Button: 8px
Input: 8px
Card: 12px
Large task surface: 16~20px
Mobile sheet top: 20px
Badge / pill: 999px
```

규칙:

- 8px과 12px을 기본값으로 사용한다.
- 큰 과업 표면에만 16~20px을 허용한다.
- 모든 요소를 pill로 만들지 않는다.
- 큰 표면에서 radius를 제거하지 않는다.
- 같은 계층의 컴포넌트는 같은 radius를 사용한다.
- 기존 외형 보존용 컴포넌트 alias는 9px·11px 같은 과도기 값을 유지할 수 있다. 구조 이전과 분리된 시각 정상화가 승인되기 전에는 이를 8px·12px로 반올림하지 않는다.

## 8. 경계와 높이

기본 원칙:

- 표면 분리는 배경, 간격, 1px border를 우선한다.
- 그림자는 실제로 떠 있는 요소에만 사용한다.
- 페이지 섹션은 기본적으로 그림자 없는 구조다.
- 현재 과업 표면에는 약한 border 또는 매우 부드러운 shadow를 사용할 수 있다.

허용 shadow:

```css
0 4px 16px rgb(25 31 40 / 6%)
0 8px 24px rgb(25 31 40 / 8%)
```

금지:

- 강한 대시보드 그림자
- 여러 shadow 중첩
- neumorphism
- shadow만으로 선택 상태 표현
- 모든 섹션을 떠 있는 카드로 처리

## 9. 컴포넌트 표현

### Primary Button

- 배경: `--mc-color-accent`
- 텍스트: 흰색
- 텍스트 크기: 15px / 22px, 600
- 높이: PC 48px, 모바일 52~56px
- radius: 8px
- shadow 없음
- hover / pressed: `--mc-color-accent-pressed`
- disabled: `--mc-color-disabled`

### Secondary Button

- 배경: `--mc-color-surface-subtle`
- 텍스트: `--mc-color-text-secondary`
- 텍스트 크기: 15px / 22px, 600
- Primary와 같은 높이와 radius
- 테두리는 필요한 경우에만 사용

### Button Typography Roles

- 기본 CTA와 보조 버튼은 15px / 22px, 600을 사용한다.
- 텍스트 버튼, 뒤로 가기, 다시 알림처럼 작은 보조 액션은 13px / 20px, 600을 사용한다.
- 일반 액션 버튼 안의 `span`, `strong`, `small`은 버튼의 글자 크기와 굵기를 상속한다.
- 날짜 선택 카드, 참석자 선택 행처럼 여러 정보 위계를 담은 복합 버튼은 내부 텍스트 역할을 별도로 유지한다.
- 같은 역할의 버튼 크기를 화면별 미디어 쿼리에서 임의로 줄이지 않는다.

### Icon Button

- 익숙한 아이콘이 있는 명령은 텍스트 박스 대신 아이콘을 사용한다.
- lucide 또는 기존 아이콘 라이브러리를 우선한다.
- 최소 44px 조작 영역을 보장한다.
- 의미가 불분명한 아이콘에는 tooltip 또는 접근 가능한 이름을 제공한다.

### Input

- 높이: 48~56px
- radius: 8px
- 배경: 흰색 또는 `--mc-color-canvas`
- border: `--mc-color-border-strong`
- focus: 파란 border와 부드러운 focus ring
- placeholder: `--mc-color-text-placeholder`
- 라벨은 항상 시각적으로 유지한다.
- placeholder와 도움말이 같은 내용을 반복하지 않는다.

### Selection Control

- 체크, 라디오, 아이콘 또는 명시적 선택 목록을 함께 사용한다.
- 선택된 전체 표면을 진한 파란색으로 채우지 않는다.
- blue inset border 또는 soft blue tint를 사용한다.
- 선택과 hover를 구분한다.

### Card

- 독립적으로 비교되는 반복 객체에만 사용한다.
- 배경: 흰색
- radius: 12px
- border: `--mc-color-border`
- padding: 16~24px
- 기본 shadow 없음
- 카드 내부에 페이지 섹션용 카드를 다시 넣지 않는다.

### Task Surface

- 현재 하나의 과업을 묶는 큰 표면이다.
- 페이지에서 한 번만 사용한다.
- radius: 16~20px
- border 또는 약한 shadow로 배경과 구분한다.
- 제목, 입력, CTA는 같은 정렬축을 사용한다.

### Badge and Chip

- Badge는 상태에만 사용한다.
- Chip은 선택된 값이나 필터에만 사용한다.
- 설명 문장이나 카테고리 장식을 chip으로 만들지 않는다.
- 삭제 가능한 chip은 명확한 제거 아이콘과 접근 가능한 이름을 가진다.

### Sheet and Dialog

- 실제 modal task에만 사용한다.
- 모바일 sheet 상단 radius는 20px이다.
- 배경 dim과 focus containment를 제공한다.
- 하단 CTA는 safe area를 포함한다.
- 배경 화면 CTA와 동시에 활성화되지 않는다.

## 10. 상태 표현

모든 상호작용 컴포넌트는 다음 상태를 가진다.

- default
- hover
- pressed
- focus-visible
- selected
- disabled
- error
- loading, 필요한 경우

규칙:

- focus ring을 제거하지 않는다.
- disabled를 안내 수단으로 남용하지 않는다.
- 오류는 입력 가까이에 짧고 구체적으로 표시한다.
- 완료 상태는 색상뿐 아니라 체크 또는 문구로 확인시킨다.
- `prefers-reduced-motion`에서 불필요한 전환을 제거한다.

## 11. UX 라이팅

화면에는 사용자에게 필요한 제품 문장만 쓴다.

원칙:

- 지금 할 행동을 구체적으로 쓴다.
- 짧은 한국어 구어체를 사용한다.
- 설명을 추가하기 전에 위계와 상태로 전달할 수 있는지 확인한다.
- 제목, placeholder, 도움말이 같은 내용을 반복하지 않는다.
- 내부 설계 이유와 구현 설명을 화면에 노출하지 않는다.
- 제품이 하지 않은 일을 완료했다고 말하지 않는다.

피할 표현:

- Gate, Score, P0, MVP, 판정, 프리셋
- 진행 중, 다음 단계처럼 위계를 설명하기 위한 캡션
- 자동으로 추천했어요
- 자동으로 확정할게요
- 전송했어요, 실제로 외부 전송하지 않은 경우
- 기능명만 나열한 내비게이션

CTA는 명사보다 결과가 분명한 동사 문장으로 쓴다.

MeetCue 용어와 표기:

- 제품명은 `MeetCue`로 쓴다.
- 시간은 `오후 3:00`처럼 오전·오후를 포함해 쓴다.
- 사용자 역할은 `주최자`, `참석자`로 통일한다.
- 회의가 성립하는 조건은 `참석 기준`으로 쓴다.
- 설명에서는 `꼭 참석해야 하는 사람`, 좁은 배지에서는 `필수 참석자`로 쓴다.
- 설명에서는 `아직 응답하지 않은 사람`, 좁은 상태 라벨에서는 `응답 전`으로 쓴다.
- 사용자 화면에서 `판단`, `대상군`, `PENDING`, `READY`, `fixture`를 쓰지 않는다.
- 응답 요청과 확정 안내는 제품 내부 알림 동작으로 표현한다. 복사나 외부 전송으로 표현하지 않는다.
- 응답 마감 뒤에도 응답이 결과에 반영된다는 점을 차단 안내처럼 표현하지 않는다.

## 12. 반응형 시각 원칙

- 모바일을 PC 화면의 축소판으로 만들지 않는다.
- 같은 상태와 우선순위를 유지하되 공간 구조와 조작 방식을 바꾼다.
- PC의 빈 공간을 반복 정보로 채우지 않는다.
- 모바일에서는 우선 CTA를 하단 액션 바에 둘 수 있다.
- 고정 CTA는 본문, 키보드, sheet, safe area와 충돌하지 않아야 한다.
- 1024px 미만에서 지나치게 좁아지는 보조 패널은 아래로 이동하거나 제거한다.
- 모바일 고정 형식의 보드·그리드·버튼은 안정적인 최소 크기를 가진다.
- 텍스트가 부모 영역을 넘거나 다른 요소와 겹치지 않아야 한다.

## 13. 금지 사항

- 장식용 gradient, orb, bokeh
- 수동 SVG 아이콘, 기존 아이콘 라이브러리로 가능한 경우
- 한 색조로만 이루어진 화면
- 섹션마다 카드와 shadow 추가
- 카드 안의 카드
- 과도한 pill
- 큰 hero 타이포를 좁은 도구 화면에 사용
- viewport 기반 글자 크기
- 음수 letter-spacing
- 제품 기능을 설명하는 보조 문구 남용
- 실제 데이터나 동작이 없는 추천·자동화 표현

## 14. 검수

화면별 검수:

- 제목, 본문, 입력, CTA의 정렬축이 명확한가?
- 현재 우선 행동이 색상과 위치로 구분되는가?
- 동일 정보를 반복하는 텍스트가 없는가?
- spacing scale 밖의 임의 값이 불필요하게 추가되지 않았는가?
- radius가 같은 계층에서 일관적인가?
- 선택과 focus가 색상 외에도 구분되는가?
- 모바일에서 고정 요소가 콘텐츠를 가리지 않는가?
- 모든 텍스트가 잘리지 않고 한글 행간이 충분한가?
- 내부 설계 설명이 사용자 카피에 섞이지 않았는가?

기술 검수:

```bash
npm run lint
npm run build
```
