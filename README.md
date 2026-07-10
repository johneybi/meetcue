# Meeting Cue

Meeting Cue is a React + Vite + TypeScript prototype for turning lightweight
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
npm run lint
npm run build
```

## Product Basis

Use these sources in order:

1. `.local-docs/prd-v1.5.md` for product scope and requirements
2. `UX-ARCHITECTURE.md` for IA, state, layout, navigation, and responsive behavior
3. `DESIGN.md` for TDS-inspired visual language and component treatment

Older IA, create-flow, layout-strategy, research, and QA documents are decision records rather
than current implementation instructions.

The accepted host and time-model rationale is recorded in
`.local-docs/host-time-model-decision-v2.0.md`. The distinction between actual meeting end time
and the time participants reserve is recorded in
`.local-docs/meeting-time-reservation-decision-v2.1.md`. The P0 30-minute time quantum is
recorded in `.local-docs/time-quantum-decision-v2.2.md`.

The core model is:

- participant roles: `required` / `optional`
- host: always attends, proposes host-available candidates, and makes the final decision
- time model: meeting window + 30-minute-quantized reserved duration → exact candidates → response deadline
- response values: `available` / `adjustable` / `unavailable`
- candidate states: `confirmable` / `needs_adjustment` / `waiting_required` / `excluded`

## ASTRYX

ASTRYX provides the frontend runtime and implementation primitives. `DESIGN.md` remains the visual
authority. Run discovery commands before introducing unfamiliar components:

```bash
npx astryx build
npx astryx search <query>
npx astryx component <ComponentName>
npx astryx docs tokens
```
