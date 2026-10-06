# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

Product/UI behavior is defined by `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`; execution rules are in `AGENTS.md` and `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`; durable history is in `docs/AUTONOMOUS_UI_ROADMAP.md`.

## Latest result and CI

`UX2.7-PLAYER-FACING-PREVIEW-INSPECT-LABELS-01` was pushed as `131dcdb`. Actions run `37404719333` failed in `Run npm test`: the only failing assertion expected the architectural `INTERACTION STAGE` label that design §12.7.2 removes from player-facing chrome. The focused repair now preserves the accessible Stage name and asserts that the visible architectural heading is absent; CI is not yet rerun.

The Steal/Dismantle delivery passed local build, focused unit tests 6/6, focused browser regressions 11/11, full browser suite 535/535, targeted ESLint, and `git diff --check`. Preview/Inspect copy passed local build, focused browser tests 14/14, targeted ESLint, and `git diff --check`. The CI-repair regression file passed locally: 19/19 tests.

## Design checkpoint

Reviewed remote design blob `5157af29079cf03f86476b71bc58607a215d6b53`, including §12.7.2 and §§0.35–0.36, 3B, 3C, 12.6, and 12.8–12.9. Architectural headings are not player-facing copy; Group/AOE progress must use explicit server-projected participant data.

## Current task — CI-REPAIR-ROOM-SAFETY-STAGE-LABEL-ASSERTION-01

Replace the stale uppercase Stage-label assertion in `tests/room-safety-render.test.mjs` with checks for its accessible name and absence of visible architectural chrome. Keep this repair test-only; do not change product rendering or gameplay semantics.
