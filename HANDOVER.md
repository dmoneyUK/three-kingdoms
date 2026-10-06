# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

Product/UI behavior is defined by `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`; execution rules are in `AGENTS.md` and `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`; durable history is in `docs/AUTONOMOUS_UI_ROADMAP.md`.

## Latest result and CI

The AOE `npm test` failure on run `37411200534` was repaired in `f98ba4c`. The browser failure on `45b7ce3` (run `37414234939`) was repaired in `bdd039a`; runs `37416789582`, `37418042611`, `37419896636`, and `37420750930` completed **Success** for build-and-test and deploy. Runs `37419043447`, `37419081776`, and `37424045378` (#750) were **cancelled** by subsequent pushes. Run `37424695881` (#751) for `09fdb08` is **in progress**; its result is not known yet.

## Design checkpoint

Reviewed remote design blob `5157af29079cf03f86476b71bc58607a215d6b53`, including §§0.56, 0.66, 0.75, 12.7, and 12.9. Quick Test changes only viewer projection/private controls; shared public causal facts stay fixed and viewer switching must not replay events.

## Latest implementation — UX2.9-FINAL-QUICK-TEST-REPROJECTION-01

The browser fixture re-renders a fixed public Attack response as observer p3, acting target p2, then p3 again. It verifies unchanged shared snapshot, `NONE` transition/no event replay, target-to-Dock projection, actor-only `CurrentAction` controls, and no gameplay submission; the existing one-time response timer arm occurs once. Focused browser test passed 1/1 and `git diff --check` passed. This local change is not covered by CI; run #751 for the preceding commit is in progress.

## Current task — UX2.9-FINAL-QUICK-TEST-REPROJECTION-01 (READY TO COMMIT)

Within the §12.9 final gate, add a focused browser fixture that re-renders one fixed Attack-response public snapshot as an observer (p3), its acting target (p2), then the observer again. Prove public interaction/root/participants remain identical with no presentation transition or gameplay action; the acting viewer's Hero moves to the Dock and receives only its `CurrentAction` controls, while the observer gets none. Permit the existing one-time `start_response_timer` request when p2 becomes eligible, and prove it does not repeat on return to p3. Test-fixture and browser regression only; do not alter gameplay/API/protocol behavior or `tests/browser/ui19.spec.mjs`. The broader privacy/meaningfulness pass remains after this bounded task.
