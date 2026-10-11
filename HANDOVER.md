# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `USER-DIRECTED UX2 TASK`

## Latest result / CI

`UX2-6.36-03-LONGDAN-ATTACK-AS-DODGE-GRAPH-PROOF` was pushed as `f9cb0fe006bb5770f00ee84b2d2e2762feb6adec`. It adds an authoritative proof only for Zhao Yun’s exact `zhao_yun_attack_as_dodge` execution consuming one physical Attack as Dodge; the public event keeps its physical Attack face and the typed relation binds the exact root/response/resolution/frame/source/target. Projection, snapshot validation and overlay layout preserve that distinction. Real four-player browser flow showed the complete graph from attacker, defender and observer views with `AS DODGE`. Focused API (40), presentation/snapshot (64), build, and the converted-response browser test passed. Exact-SHA Actions run `38124654050` **failed**: API tests and browser smoke succeeded; Lint failed on two unused `readFrame` parameters at test line 2472, so deploy did not run. A CI-repair-only edit removes those unused parameters. Separate ordinary-Dodge browser run reached and passed graph assertions but failed the pre-existing 20-second timing assertion: its observer saw the exit class about 687ms before layout-ready `shownAt`; timers are out of scope. Focused local ESLint attempts exhausted Node heap (default and 4GB). Repair SHA validation/deployment pending.

## Design checkpoint

Latest remote `docs/UX2-refine.md` blob: `d966440b487bcbe172d5ea608704cc6945dfe6df` (reviewed; §6.36.4 Task 3 governs this bounded Longdan proof repair).

## Current task

CI-repair-only closeout for §6.36.4 Task 3: commit and push only the unused-parameter lint fix plus this handoff, verify the repair SHA’s Actions run and deployment, record exact results, then stop for Reviewer/user visual review. Do not start another task.
