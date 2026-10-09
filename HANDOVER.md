# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result / CI

Remote `ux-v2` HEAD `e92512360514cf63b9cc4181d0dd80b3124aa2fb` failed run `37987317069`: API/Lint and Browser shard 2 passed; Browser shard 1 failed the dense 8-player Attack geometry test at 480×900. Exact job log `114012430663` shows the Attack root is less than 8px clear of a player Seat/Dock; shard report and worker-log artifacts are present (`11644615343`, `11644630363`). Local repair reserves 18px only for the 8-player side-column compact layout (401–600px), covering the measured 10px Dock growth on Dodge handoff. `npm run build`, focused geometry browser tests (4/4: 6/8 players at 390/480px), targeted ESLint, and `git diff --check` pass. CI repair is prepared locally; push and exact-HEAD CI validation remain pending.

## Design checkpoint

Latest remote `docs/UX2-refine.md` blob `88c73eb523b6e14f769fc10eee5a5ad40b8f93ba` reviewed, including §§6.28–6.29.2. Section 6.29.8 keeps A (Attack/Dodge continuity and public counter hold) separate from B (source-owned AOE root geometry).

## Current task

`UX2-6.29-A-ATTACK-DODGE-CONTINUITY-AND-HOLD-01` — CI repair for the 8-player 480×900 Attack root/Dock clearance regression. Commit and push only this repair; do not resume UX work until the exact pushed HEAD is green. After CI completes, stop and await the user's next instruction. No Reviewer acceptance is claimed.
