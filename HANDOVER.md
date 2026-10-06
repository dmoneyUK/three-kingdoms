# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

Product/UI behavior is defined by `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`; execution rules are in `AGENTS.md` and `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`; durable history is in `docs/AUTONOMOUS_UI_ROADMAP.md`.

## Latest result and CI

The actual failure on `9f52db6` was run #752 (`37425349025`): lint rejected an unused `_localControl`; `331ea94` repaired it. Runs #753 (`37425718478`) and #754 (`37426101780`) were cancelled by later pushes, not failed. The latest remote head `ceca3dc` passed run #755 (`37427033710`), including lint, build, browser tests, full `npm test`, and deploy. The current AOE outcome change passed focused PresentationV2/Snapshot/client/render tests 108/108, API integration tests 49/49, build, targeted ESLint, and `git diff --check`; its new push's CI result has not yet been observed.

## Design checkpoint

Reviewed remote design blob `5157af29079cf03f86476b71bc58607a215d6b53`, including §§0.51–0.52, 6, 12.4–12.6, 12.8, and 12.9. Group outcomes require authoritative participant proof; Reaction Chain remains concise and semantic. The stale Cavalry priority in §12.8 is already implemented and recorded in the roadmap, so it is not reopened.

## Current task — UX2.7-AOE-RAINING-ARROWS-DAMAGE-OUTCOME-01 (READY TO IMPLEMENT)

Project `Damaged` only after the authoritative Raining Arrows damage path proves positive effective damage and the matching Group participant resolves. Preserve proof through typed server continuation while damage/Dying is pending; zero/prevented damage, nonmatching continuations, and unproven states stay outcome-free. Keep damage rules, legal actions, public protocol, privacy, and protected `ui19.spec.mjs` unchanged; add focused server-to-Stage regressions.
