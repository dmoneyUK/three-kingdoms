# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result and CI

Base SHA `73fa255428a82a5048c7eaca07e59c5cbcf0b20d` passed exact-SHA Actions run `37559875680` (#820); latest `ux-v2` push run is success. Current local System Menu change passes the focused browser pair (16/16), `tests/room-safety-render.test.mjs` (19/19), focused ESLint, and `git diff --check`; its own remote CI is pending push.

## Design checkpoint

Reviewed the complete current design blob `7e021455c8fdc9e88dc1b3b20d036400da82be44` and compared it with `9f8663afea206be9350153164c2c38e84d54823e`. The substantive change is §5.4 plus new §6: finish non-Hero Sections 1–4 before beginning UX3 Phase A. Current task is within §3 and does not alter deferred Hero/player presentation.

## Current task

`UX2.REFINE-STAGE-SYSTEM-CLUSTER-01` — implementation and focused local proof are complete but uncommitted. Move timer/Exit into the Stage lower-right cluster; keep server deadline/privacy, confirm Exit before the unchanged `onLeave`, and preserve Hero/player geometry. Push only after checking the current remote CI; then require exact-SHA green. Proof: 390×844, 480×900, 1440×900 plus Side Column 320–650px; 44px menu, 8px timer gap, 8–12px Guidance clearance, zero Stage/seat/Dock overlap or horizontal overflow. Scope: §3.5–3.9.
