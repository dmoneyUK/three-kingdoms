# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

Product/UI behavior is defined by `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`; execution rules are in `AGENTS.md` and `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`; durable history is in `docs/AUTONOMOUS_UI_ROADMAP.md`.

## Latest result and CI

The previous head `f976f3c` passed Actions run #757 (`37432494493`). The earlier actual CI failure was run #752's unused-variable lint error and was repaired in `331ea94`; #753/#754 were cancelled, not failed. `UX2.7-AOE-BARBARIAN-INVASION-DAMAGE-OUTCOME-01` now projects `Damaged` only after positive effective damage and resolution of that exact Group participant; a satisfied Attack remains outcome-free, and Barbarian Invasion cannot claim `Avoided`. Local validation passed: build, focused presentation tests 111/111, engine-backed API tests 27/27, targeted ESLint, and `git diff --check`. This task's push-triggered CI result has not yet been observed.

## Design checkpoint

Reviewed remote design blob `5157af29079cf03f86476b71bc58607a215d6b53`, including §§0.35–0.36, 0.51–0.54, 6, and 12.4–12.9. Group outcomes require authoritative participant proof; Reaction Chain remains concise and semantic. The §12.8 Cavalry priority is already implemented and recorded in the roadmap, so it is not reopened.

## Next task — UX2.7-AOE-NEGATED-OUTCOME-01 (READY TO IMPLEMENT)

Project `Negated` only when authoritative Negation cancels a Barbarian Invasion or Raining Arrows effect for its exact Group participant and that participant resolves. A merely open/unlinked Negation, a pass, or a stale/mismatched continuation remains outcome-free. Preserve server-owned legality, privacy, public protocol, and protected `ui19.spec.mjs`; add focused server-to-Stage regressions.
