# Document Map

This directory preserves both the current product specification and the decisions that led to it.
Documents are not required to use the same product name or describe the same model when they belong
to different points in the product's history.

## Post-challenge evidence reset

- `post-challenge-retrospective-v1.md`: current retrospective. Separates confirmed facts, likely evaluation gaps, strengths, and unknowns without claiming an official rejection reason.
- `post-challenge-retrospective-v2.md`: deep postmortem of the submitted answers, product contract, demo flow, review process, schedule, and the causal chain that made the application copy weak.
- `post-challenge-retrospective-evidence-v2.md`: audit trail for v2. Separates official criteria, file evidence, current-run observations, Git timing, implementation checks, inferences, and unknowns.
- `user-evidence-log-v1.md`: accumulating log of concrete scheduling incidents. Keeps raw events, user-reported frustration, interpretations, hypothesis impact, and open questions separate.
- `meeting-cue-public-incident-log-v1.md`: source-linked public incident log covering nonresponse, required attendees, stale calendars, repeated rescheduling, and failed meetings.
- `meeting-cue-hypothesis-evidence-synthesis-v1.md`: compares U01 and the vetted public incidents against H1-H5, introduces H6-H8, and narrows the defensible problem definition.
- `meeting-cue-product-thinking-revision-log-v1.md`: chronological product-thinking record. Preserves what was believed, which evidence challenged it, what was revised or withdrawn, and what could change the decision again.
- `meeting-cue-participant-input-interaction-audit-v1.md`: focused interaction-risk inspection of the participant time grid. Separates observed behavior, contract drift, usability hypotheses, and evidence limits.
- `meeting-cue-participant-input-comparison-test-plan-v1.md`: counterbalanced A/B task plan for cyclic state input versus direct state selection, including fixtures, measures, stop conditions, and decision gates.
- `evidence-led-validation-plan-v1.md`: superseded pre-change validation plan. Preserved for history.
- `evidence-led-validation-plan-v2.md`: current validation plan. Starts with U01 and vetted public incidents as product scenarios, then separates state-model checks from direct user validation.
- `meeting-cue-scenario-coverage-audit-v1.md`: current S1-S5 prototype audit. Identifies supported judgment rules, missing failure-lifecycle states, false-ready risks, and the next state-model changes.
- `meeting-cue-s1-state-model-and-fixture-v1.md`: current S1 product contract. Defines the minimum states, U01-based fixture, copy, scope boundary, and acceptance conditions for required-attendee nonresponse and failed follow-up.
- `application-answer-revision-brief-v1.md`: preserves the submitted v6 answers and defines the evidence required before drafting v7.

These documents govern what to learn next. They do not retroactively change the submitted product or claim that the rejection reason is known.

## Current implementation basis (submission product)

- `toss-product-designer-challenge-success-framework-v1.md`: hiring-oriented success framework; connects Toss evaluation criteria, evidence levels, product proof, visual quality, application answers, and submission gates.
- `p0-submission-scope-lock-v2.10.md`: highest-priority submission boundary; only creation, participant response, host judgment, one-person re-request, re-evaluation, and confirmation are P0.
- `research-internalized-thinking-v1.md`: research-grounded reasoning and explicit hypotheses behind the pivot.
- `sprint-decision-coherence-v2.2.1.md`: current sprint objective, gates, and intentional scope cuts.
- `prd-v2.2.1.md`: current P0 product, input, result, action, and acceptance contract.
- `prd-v2.2.md`: superseded full draft retained for the reasoning and contradictions corrected by v2.2.1.
- `decision-model-v2.2.md`: authoritative candidate-state, pending-condition, deadline, ordering, and grouping contract.
- `availability-window-model-decision-v2.3.md`: current availability-window contract and derived-candidate model.
- `host-search-scope-input-decision-v2.4.md`: current host input contract; the product proposes a default search scope and the host edits exceptions instead of building an empty grid.
- `participant-availability-input-decision-v2.6.md`: current participant input contract; simulated calendar free/busy data fills a responsive timetable and the participant edits exceptions with a three-state brush. v2.5 remains the manual-input fallback rationale.
- `personal-invite-identity-decision-v2.7.md`: superseded personal-token invitation decision retained as the reasoning step that removed participant self-selection.
- `account-based-request-delivery-decision-v2.8.md`: post-P0 product-direction record for organization-account delivery. It is not part of the submission completion gate.
- `account-navigation-ia-decision-v2.9.md`: post-P0 product-direction record for account entry and re-entry. Its screens remain DEV-only during the submission sprint.
- `host-time-model-decision-v2.0.md`: why the host provides coordinatable time windows.
- `meeting-time-reservation-decision-v2.1.md`: distinction between meeting duration and reserved time.
- `time-quantum-decision-v2.2.md`: rationale for the P0 30-minute time unit.
- `../UX-ARCHITECTURE.md`: current IA, state transitions, layout, navigation, and responsive behavior.
- `../DESIGN.md`: visual design principles. Its PRD reference records the context in which the design
  language was developed; it is not the source of current product requirements.
- `../DESIGN-DECISIONS.md`: adopted and rejected decisions from TDS, ASTRYX, OMD, moodboards, and prior visual artifacts.
- `../DESIGN-REFACTOR-BASELINE.md`: preservation, normalization, migration, and screen-order contract for the post-submission refactor.
- `../docs/design-consistency-improvement.md`: current visual and interaction decision log. D-001 through D-052 preserve observations, alternatives, tradeoffs, implementation scope, QA, and release checkpoints; it complements but does not replace the PRD.

## Previous working history

- `prd-v2.1-onepage.md`, `prd-v2.1.md`: previous decision-support specification before the v2.2 alignment and scope reduction.
- `prd-v2.0.md`: previous implementation basis before the decision-support pivot was made explicit.
- `prd-v1.5.md`: the latest PRD produced through the earlier conversation and design process. It is
  retained as the history of the direct-candidate-selection model and its requirements.
- `prd-v1.0.md` through `prd-v1.4.md`, and earlier `prd-v0.*.md` files: earlier product snapshots.
- `ia-v1.md`, `ia-prd-alignment-review.md`: earlier IA exploration and PRD alignment review.
- `create-flow-product-design-v1.5.md`, `create-attendee-flow-design-v1.6.md`,
  `create-attendee-selection-redesign-v1.7.md`: creation and attendee-flow design history.
- `create-layout-strategy-v1.8.md`, `create-layout-research-v1.9.md`: layout decisions and research.
- `meeting-invite-context-model.md`: earlier meeting-context exploration.
- `pencil-design.md`: design-agent input created for Pencil.

## Naming

- `MeetCue` is the current prototype and UI name.
- `확정보드` is a historical Korean planning name, not an approved final product name.
- Final naming is outside the current P0 decision-coherence sprint.

## Reading order

For post-challenge planning, read:

1. `post-challenge-retrospective-v2.md`
2. `post-challenge-retrospective-evidence-v2.md`
3. `post-challenge-retrospective-v1.md`
4. `user-evidence-log-v1.md`
5. `meeting-cue-product-thinking-revision-log-v1.md`
6. `evidence-led-validation-plan-v2.md`
7. `application-answer-revision-brief-v1.md`
8. the current prototype and the submission-product documents below

For implementation work, read:

1. `toss-product-designer-challenge-success-framework-v1.md` when deciding whether work improves hiring evidence or submission readiness
2. `p0-submission-scope-lock-v2.10.md`
3. `sprint-decision-coherence-v2.2.1.md`
4. `prd-v2.2.1.md`
5. `decision-model-v2.2.md`
6. `availability-window-model-decision-v2.3.md`
7. `host-search-scope-input-decision-v2.4.md`
8. `participant-availability-input-decision-v2.6.md`
9. `meeting-time-reservation-decision-v2.1.md`
10. `time-quantum-decision-v2.2.md`
11. `../UX-ARCHITECTURE.md`
12. `../DESIGN.md`
13. `../DESIGN-DECISIONS.md` and `../DESIGN-REFACTOR-BASELINE.md` when changing visual implementation
14. the current code

Read v2.8 and v2.9 only when working on post-P0 account and delivery exploration.

`decision-model-v2.1.md` is not authoritative for v2.2 implementation because its four-state model and adjustable-response semantics were superseded.

Use the remaining documents to understand prior reasoning, rejected structures, and the evolution of
the product. Do not treat an older document as an active requirement unless a current-basis document
explicitly adopts it.
