# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `USER-DIRECTED UX REFINEMENT`

## Latest result / CI

- Stage A ordinary Attack/Dodge was explicitly user-confirmed complete on 2026-10-12; no design-document edit was made.
- Previous B1 Duel long-chain code is `b5c94b7fbb8cc6433df5ac0264cbf77279c9a288`; lint repair `76c0db5068fc6890e3af3db7935576fbdfaadb83` passed exact-SHA Actions run [`38336678712`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/38336678712), including API, browser smoke, lint/fast, D1 migrations, Worker deploy and production smoke.
- Current `HEAD`/`origin/ux-v2` before this task's push is `f03ee6449fd92bdd029b8bf9ec7d3175522bd814` (handoff-only; workflow ignores Markdown). Latest relevant push run remains `38336678712`; this task's focused local validation passed: build, 47/47 selected browser tests, server-backed Attack/Dodge path 1/1, room-safety render 1/1, and `git diff --check`. Deployment for this task is pending.

## Design checkpoint

Reviewed `docs/UX2-refine.md` blob `6b9ad6ab83e8e64c185b3fdeed4ca03f40310ccb`, including §4B.12. No design-document edit was made.

## Current task — `UX2-4B.12-UNIFIED-TARGET-INSPECT`

Refine the unified opponent Hero inspector: remove thumbnail Hand count and info icon; make Hero clicks open inspection while preserving an explicit CurrentAction-backed target-selection path; show player name once and fit Hero, HP, Hand, and public skill chips together; expose four description lines; position the panel 48px above battlefield center without overlapping seats, menu, Guidance, or Dock; move the build label and exact SHA into the existing System menu. Preserve public-only server projections and inspection without changing a selected target.

Fixture and real server-backed responsive geometry/privacy/action-submission tests passed. Screenshot: `test-results/ux2-4b12-unified-target-inspect/server-unified-inspect-expanded-390.png`; measured layout: `test-results/ux2-4b12-unified-target-inspect/server-unified-inspect-layout-390.json`. Push this task, record exact Actions/deployment state, then stop for user visual review; do not start another refinement task.
