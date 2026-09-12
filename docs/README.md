# MeetCue product and design documentation

This directory is the public, curated documentation set for MeetCue. Formerly tracked working
documents now live here; the local-only notes directory remains ignored by Git.

## Reading paths

### 개선 과정과 포트폴리오 검토

[작업 기록 안내](process/README.md)와 [판단·대안 기록](process/decision-log.md)에
개선 관점, 대체·보류한 시안, 원본 자료, 검증 한계와 수록 검토 사항을 연결한다.
현재 구현·과거 제출·미구현 제안을 구분하며, 이 기록은 고정된 디자인 규칙이나
포트폴리오 수록 확정안이 아니다. 의미 있는 후속 작업에서 함께 갱신한다.

[시간 입력 비교안](design/time-entry-comparison-2026-09-12/README.md)은 기존 시간표와
범위·예외 중심안을 세 가지 예시 상황에서 비교하는 로컬 검토 화면이다.

### Korean product references and interaction refinement

[Design refinement](research/korean-design-refinement/README.md) records official Toss / Daangn
references, before/after screenshots, motion behavior, and visual QA for the participant flow.

### Current implementation: progressive response

[Progressive response v3](product/progressive-response-v3.md) is the latest implementation
contract for candidate-first responses, range expansion, and unreviewed times. It supersedes
the earlier full-grid-only response rules for this flow. The retrospective answer v9 below
predates this product change; it is not a description of the final v3 implementation.

### 2026-09-07 design follow-up

The [design review](research/design-review-2026-09-07.md) records the post-submission
product corrections, evidence boundaries, and unresolved alternatives. Use the
[comparison study](research/comparison-study.md) and [answer draft v9](application/answers-v9.md)
for the next validation cycle. These are retrospective materials, not historical submission evidence.
For the corrected demo navigation, participant response controls and commitment confirmation,
this follow-up supersedes the older interaction descriptions below; the decision model is unchanged.

### 1 minute

Start with the [P0 scope lock](product/p0-submission-scope-lock-v2.10.md) to understand what the
prototype must prove, then scan the [architecture](design/architecture.md) and
[visual system](design/visual-system.md).

### 5 minutes

Read the [sprint brief](product/sprint-decision-coherence-v2.2.1.md), the
[current PRD](product/prd-v2.2.1.md), and the [decision model](product/decision-model-v2.2.md).
Together they define the product promise, P0 journey, acceptance gates, and candidate-state rules.

### Deep reading

Read the accepted decision records in sequence: [availability-window model](product/availability-window-model-decision-v2.3.md),
[host search scope](product/host-search-scope-input-decision-v2.4.md),
[participant availability](product/participant-availability-input-decision-v2.6.md),
[personal invite identity](product/personal-invite-identity-decision-v2.7.md),
[account-based delivery](product/account-based-request-delivery-decision-v2.8.md), and
[account navigation](product/account-navigation-ia-decision-v2.9.md). Then read the supporting
[host-time model](product/host-time-model-decision-v2.0.md),
[meeting-time reservation](product/meeting-time-reservation-decision-v2.1.md), and
[time quantum](product/time-quantum-decision-v2.2.md) records.

For design implementation, use the [architecture](design/architecture.md),
[visual system](design/visual-system.md), and [visual consistency log](design/consistency-improvement.md),
alongside the [design decisions](../DESIGN-DECISIONS.md) and
[refactor baseline](../DESIGN-REFACTOR-BASELINE.md).

## Authority order

When documents disagree, use this order:

1. [P0 submission scope lock v2.10](product/p0-submission-scope-lock-v2.10.md)
2. [Decision coherence sprint v2.2.1](product/sprint-decision-coherence-v2.2.1.md)
3. [PRD v2.2.1](product/prd-v2.2.1.md)
4. [Decision model v2.2](product/decision-model-v2.2.md)
5. Accepted product decisions v2.3–v2.9 in `docs/product/`
6. Supporting host/time decisions in `docs/product/`
7. [UX architecture](design/architecture.md)
8. [Visual system](design/visual-system.md)
9. [Visual consistency log](design/consistency-improvement.md)
10. The implementation in `src/`

The account delivery and navigation records (v2.8 and v2.9) describe post-P0 product direction;
they do not expand the P0 completion gate. The v2.7 record documents the identity decision that led
to that direction. The v2.5 participant-input record is archived because v2.6 supersedes it.

## Archived history

Superseded product and research records remain available under [docs/archive](archive/):

- [PRD v1.5](archive/prd-v1.5.md), [PRD v2.0](archive/prd-v2.0.md), [PRD v2.1](archive/prd-v2.1.md), and [PRD v2.1 one-page](archive/prd-v2.1-onepage.md)
- [PRD v2.2](archive/prd-v2.2.md)
- [Decision model v2.1](archive/decision-model-v2.1.md)
- [Participant availability input v2.5](archive/participant-availability-input-decision-v2.5.md)
- [Research-internalized thinking](archive/research-internalized-thinking-v1.md)

Archive documents explain how the product changed; they are not active requirements.

- [서비스 전체 흐름·정보 위계 개선 기록](research/service-foundation/README.md): 공통 내비게이션, 회의별 저장, 홈·목록·응답·확정 연결 및 실제 브라우저 검증.

### 사용자 제공 무드 레퍼런스 (2026-09-07)

- [이미지 12장과 적용 해석](design/references/2026-09-07/README.md): 절대 규칙이 아닌 무드·스타일 참고 자료.
- [구현 화면과 검증](research/reference-mood/README.md): 공통 버튼·선택 상태·패널 표면 정리.
