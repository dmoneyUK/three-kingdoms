# Current Handover

Branch: `ux-v2`

## Latest results

- Q1 root-presenter audit and Q2 Group-root ownership repair were delivered in `d2bd2d692153e9f054ef56a867e080124bf286fc`; exact-SHA Actions run [39043497415](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39043497415) passed and deployed Worker `5ef4a4fe-cd33-4a0c-93a3-cf9ef19d0a64`. The real Barbarian Invasion and Raining Arrows paths covered Negation, target responses, damage/trigger, settlement and four TEST SWITCH perspectives; these were not four independent clients.
- H4-A/B/C public text and placement remain user-accepted. Preserve the accepted copy and U13-B activity chip.
- The user resumed Q3/Q4 on 2026-10-17. Q3 first-paint rebase commit `da144c8d4c2f061a34e3d8d4222cab3694f7e269` was pushed; exact-SHA Actions run [39070539128](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39070539128) failed because the anchor observer setup landed inside an object literal, causing a TSX parse error. The minimal placement/cleanup repair builds locally and targeted ESLint reports 0 errors (12 existing hook warnings). The focused Q3 browser regressions had passed 7/7 before the commit. Q4 remains uncommitted and waits for the repaired Q3 SHA to pass Actions.
- Latest design reviewed: `origin/ux-v2:docs/UX2-refine.md`, blob `f5553186d2c15eba0aa03f5cb9c8d91436a15e0e`.

## Exactly one current bounded task

**UX2-10.15-Q3-CI-REPAIR-01 — repair the exact-SHA Q3 CI failure.** Keep the repair limited to restoring anchor-observer registration after `schedule()` and disconnecting it in effect cleanup. Commit and push only this repair plus the handover update, then wait for exact-SHA Actions. Do not advance to Q4 until that run succeeds. Q4 cross-player consistency remains next; preserve accepted H4-A/B/C copy and U13-B chip.
