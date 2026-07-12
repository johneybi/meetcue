# MeetCue

MeetCue is a React + Vite + TypeScript prototype for turning lightweight
availability responses into clear cues for confirming a business meeting time.

It is not a scheduling poll that simply ranks the most popular slot. The product
helps a host decide whether the current responses are enough to confirm a meeting,
what still needs checking, and how to continue coordination without restarting the
same request from scratch.

## Stack

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

## Scripts

```bash
npm run dev
npm run check
npm run test:domain
npm run lint
npm run build
```

## Product Basis

See `.local-docs/README.md` for the document map, provenance, naming relationship, and the
distinction between current implementation sources and preserved working history.

Use these sources in order:

1. `.local-docs/sprint-decision-coherence-v2.2.1.md` for the current objective and completion gates
2. `.local-docs/prd-v2.2.1.md` for product scope, user contracts, and acceptance criteria
3. `.local-docs/decision-model-v2.2.md` for candidate states and explanation rules
4. `UX-ARCHITECTURE.md` for IA, state, layout, navigation, and responsive behavior
5. `DESIGN.md` for TDS-inspired visual language and component treatment

Older IA, create-flow, layout-strategy, research, and QA documents are decision records rather
than current implementation instructions.

The availability-window model and its relationship to the earlier decisions are recorded in
`.local-docs/availability-window-model-decision-v2.3.md`. The accepted host rationale is recorded in
`.local-docs/host-time-model-decision-v2.0.md`. The current host-input rule, where the product proposes
a default search scope and the host edits only exceptions, is recorded in
`.local-docs/host-search-scope-input-decision-v2.4.md`. The participant simulated-calendar and timetable input
contract is recorded in `.local-docs/participant-availability-input-decision-v2.6.md`. The distinction between actual meeting end time
and the time participants reserve is recorded in
`.local-docs/meeting-time-reservation-decision-v2.1.md`. The P0 30-minute time quantum is
recorded in `.local-docs/time-quantum-decision-v2.2.md`.

The core model is:

- participant roles: `required` / `optional`
- host: always attends, confirms or edits the product-proposed search scope, and makes the final decision
- time model: meeting window + reserved duration + availability windows → derived candidates → response deadline
- response values: 30-minute availability cells with `available` / `adjustable` / `unavailable`
- participant input: simulated calendar free/busy import followed by three-state timetable exception editing, with manual baseline fallback
- candidate states: `ready` / `pending` / `impossible`
- submission boundary: unsubmitted UI drafts never enter host decisions
- pending action: required respondents and an interchangeable optional pool remain distinct

## ASTRYX

ASTRYX provides the frontend runtime and implementation primitives. `DESIGN.md` remains the visual
authority. Run discovery commands before introducing unfamiliar components:

```bash
npx astryx build
npx astryx search <query>
npx astryx component <ComponentName>
npx astryx docs tokens
```
