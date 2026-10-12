# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `USER-DIRECTED UX REFINEMENT`

## Latest result / CI

- Stage A ordinary Attack / Dodge was confirmed complete by the user on 2026-10-12. No design-document change was made.
- B1 Duel long-chain work is paused by the user because the proposed design is incorrect. Its existing local source/test changes are preserved and must stay out of the current task commit.
- §4B.12 implementation is at `4f50d3d835ac42789e2ebf2529e3fa6112c6f09d`. Latest push run `38320753271` for that exact SHA: API tests and browser startup/room smoke succeeded; lint succeeded; fast tests failed in two legacy selectors that assumed only one `Inspect <player>` button; deploy was skipped. The selectors now scope to the opponent Hero control, and the two failing tests pass locally (2/2); repair push CI/deploy is pending.

## Design checkpoint

Reviewed current `docs/UX2-refine.md`, blob `b17239f56971ae0876e5ed2e56af3ce1e86d0759`, including §4B.12. Do not edit the design document unless the user separately requests it.

## Current task — `UX2-4B.12-UNIFIED-TARGET-INSPECT` CI repair and gate

This is the user's reference name for §4B.12, not a separately defined design task ID. Implement one compact public-information inspector used for both legal target selection and read-only player inspection. A legal Seat click selects the target and updates the panel; the information affordance changes only the inspected subject. Keep one panel, use only public hero/HP/Hand-count/equipment/Judgment data, and expand canonical skill descriptions inside the panel. Closing the panel preserves target selection and does not submit gameplay actions. Preserve CurrentAction legality, privacy, fixed Seats/Dock, and public presentation authority.

**Acceptance / stop:** keep the existing §4B.12 real server-backed 390×844, ~440px, 480×900 and wide-screen evidence, public values/skill disclosure, one-panel behavior, and no-overlap/selection-continuity proof distinct from fixture tests. Complete exact-SHA push CI and deployment for the test-selector repair; only then proceed to the user's separately ordered §4A.12 task. Keep B1 paused; do not start §6 graph work.
