# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

Product/UI behavior is defined by `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`; execution rules are in `AGENTS.md` and `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`; durable history is in `docs/AUTONOMOUS_UI_ROADMAP.md`.

## Latest result and CI

The prior Raining Arrows avoidance change (`3409723`) passed Actions run #756 (`37430172672`). The earlier actual CI failure was run #752's unused-variable lint error and was repaired in `331ea94`; #753/#754 were cancelled, not failed. The current Raining Arrows `Damaged` projection passed local build, focused PresentationV2/Snapshot/client/render tests 110/110, engine-backed API tests 27/27, targeted ESLint, and `git diff --check`. No result is claimed yet for this task's push-triggered run.

## Design checkpoint

Reviewed remote design blob `5157af29079cf03f86476b71bc58607a215d6b53`, including §§0.51–0.52, 12.4–12.9. Group outcomes require authoritative participant proof; Reaction Chain remains concise and semantic. The §12.8 Cavalry priority is already implemented and recorded in the roadmap, so it is not reopened.

## Next task — UX2.7-AOE-BARBARIAN-INVASION-DAMAGE-OUTCOME-01 (READY TO IMPLEMENT)

Project `Damaged` only after Barbarian Invasion's authoritative response path proves positive effective damage and the matching Group participant resolves. Keep pending Damage/Dying, prevented or zero damage, stale/mismatched continuations, gameplay rules, privacy, public protocol, and protected `ui19.spec.mjs` unchanged; add focused server-to-Stage regressions.
