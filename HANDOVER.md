# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result / CI

Repair commit `6fe2e0f6096080db711d3f701fd7bc574f8ee191` was pushed; exact run `37993971425` failed Browser shard 1 (API/Lint and shard 2 passed). The new failure was `real 8-player Attack root overlay ... 390×844`: graph handoff measured 449ms against a 250ms bound; fit diagnostics show target/compact had no reserved Dodge slot and placement became ready at minimum size. One polling test was flaky but passed on retry; 447 browser tests passed. Diagnosis: the first repair let added Dock-clearance checks alter the 390px search path. A narrower local repair now applies those extra checks only to the 8-player side-column compact 401–600px layout. Build, focused browser coverage (5/5: 390px root handoff plus 6/8-player geometry at 390/480px), targeted ESLint, and `git diff --check` pass. Second CI-repair commit/validation pending; no UX work may resume until the exact pushed HEAD is green.

## Design checkpoint

Latest remote `docs/UX2-refine.md` blob `88c73eb523b6e14f769fc10eee5a5ad40b8f93ba` reviewed, including §§6.28–6.29.2. Section 6.29.8 keeps A (Attack/Dodge continuity and public counter hold) separate from B (source-owned AOE root geometry).

## Current task

`UX2-6.29-A-ATTACK-DODGE-CONTINUITY-AND-HOLD-01` — CI repair for the 8-player 480×900 Attack root/Dock clearance regression. Commit and push only this repair; do not resume UX work until the exact pushed HEAD is green. After CI completes, stop and await the user's next instruction. No Reviewer acceptance is claimed.
