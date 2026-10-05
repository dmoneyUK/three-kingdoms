# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

Product/UI behavior is defined by `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`; execution rules are in `AGENTS.md` and `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`; durable history is in `docs/AUTONOMOUS_UI_ROADMAP.md`.

## Latest CI checkpoint

The pushed feature SHA `1dab785167f5b25b3e042d20a8cbbf4a77495b0b` passed exact push-triggered Actions run `37358008000` on 2026-10-05; both `build-and-test` and `deploy` completed successfully.

## Design checkpoint

Rechecked `origin/ux-v2` at `1dab785`; the design blob remains `5157af29079cf03f86476b71bc58607a215d6b53` (no intervening design changes). At this planning boundary reviewed §§12.3–12.8: next priority is one authority-backed ACTIVE family, then SELECTABLE DETAIL, semantic Reaction/AOE projection, and final UX2 gate.

## Latest result

Closed `UX2.4-GENERIC-HERO-SKILL-ENTRY-01` in `1dab785`: the shared capability map now exposes projected Ma Chao Cavalry from the Skills band; Horse Riding stays passive and Cavalry is removed from the duplicate Action Row fallback. Focused browser tests passed 3/3, targeted ESLint had 0 errors (fixture JSX ignored), `git diff --check` passed, and exact Actions run `37358008000` passed both jobs. `tests/browser/ui19.spec.mjs` was untouched. Durable result and the selectable-detail authority audit are in the roadmap.

## Next task — UX2.3-ACTIVE-DYING-CURRENT-EFFECT-01

Extend the shared ACTIVE Source → Current Effect → Hero Focus composition to a proven DYING rescue scene. Render the relationship only from the typed public Interaction Stage when it supplies a source ID and effect, and its single active target matches the Dying current participant; reuse the existing DYING PLAYER Hero Focus and Dying Handoff. Preserve viewer-Hero Dock ownership and keep Peach/Skip controls exclusively in the local console. Missing or mismatched authority fails closed. No API, server, gameplay, or protocol changes. Add focused browser proof at 390/480/1440px plus missing/mismatched-authority cases; use focused local checks only. Stop if the typed scene cannot prove the cause/effect/participant relationship.
