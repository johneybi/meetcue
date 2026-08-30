# MeetCue product and design documentation

This directory is the public, curated documentation set for MeetCue. Formerly tracked working
documents now live here; the local-only notes directory remains ignored by Git.

## Reading paths

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
