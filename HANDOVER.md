# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

Product/UI behavior is defined by `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`; execution rules are in `AGENTS.md` and `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`; durable history is in `docs/AUTONOMOUS_UI_ROADMAP.md`.

## Latest result and CI

`UX2.7-AOE-DEFEATED-OUTCOME-01` is implemented: only positive Raining Arrows / Barbarian Invasion damage followed by the matching authoritative Dying failure publishes `DEFEATED`; pending Dying stays outcome-free, rescue remains `DAMAGED`, and mismatched/non-Group proof fails closed. The value is derived from persisted player state at the typed Group continuation boundary and is carried through PresentationV2, Snapshot, Client, and Stage labels without exposing private continuation data. Local validation passed: build, focused presentation tests 111/111, engine-backed API tests 30/30, targeted ESLint, and `git diff --check`. The current remote `db8970d` passed Actions run #760 (`37454554676`); the feature push-triggered result is not yet observed.

## Design checkpoint

Reviewed remote design blob `530c8ec9b7ef5790b6a8bc27b694ac7b00499a6a` at `db8970d`, including §§0.35–0.36, 0.51–0.54, 3B–3C, 6, 10–12, and the 2026-10-06 Group/AOE mobile composition additions. Group outcomes remain small public summaries gated by server-owned participant/causal proof; the §12.8 Cavalry priority is implemented and is not reopened.

## Next task — UX2.8-AOE-MOBILE-TARGET-STRIP-01 (READY TO IMPLEMENT)

For mobile Group/AOE ACTIVE presentation, remove the duplicate large current-participant Hero Focus/metadata and make the existing authoritative Group Target Strip the sole participant emphasis. Preserve the stable Source → root action → target-strip spine, private CurrentAction/Dock controls, fixed seat DOM, privacy, and protected `ui19.spec.mjs`; add focused 390/480px and wider geometry/semantic regressions without changing gameplay or projection authority.
