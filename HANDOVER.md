# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result and CI

`UX2.18-AOE-STRUCTURAL-COMPOSITION-01` was pushed as `21ca89d741d2f0aa7cbd604b148b92d8f04f866a`. Actions run `37471054417` failed only at `npm test`: `tests/room-safety-render.test.mjs` still required a Group participant to render in the removed duplicate Hero Focus. Build, lint, and the full browser job succeeded; deploy was skipped. Failure class: stale assertion against the approved §12.6 composition, not a production regression. CI repair is in progress.

## Design checkpoint

Reviewed latest remote Design blob `530c8ec9b7ef5790b6a8bc27b694ac7b00499a6a`; unchanged. UX2.18 implements the existing typed Group structural composition. Oath/Bumper remain separate authority gaps.

## Current task — CI-REPAIR-UX218-GROUP-RENDER-ASSERTION-01 (IN PROGRESS)

Repair only the stale SSR assertion: verify Group Source/root/Target Strip, current-member status in the strip, and absence of duplicate Hero Focus; retain all unrelated single-target, privacy, and control-surface assertions. Run the named focused test and `git diff --check`. No production changes or Oath/Bumper work in this repair. Once pushed, record its exact SHA as `CI REPAIR PUSHED — VALIDATION PENDING`; resume feature work only after the repair SHA's CI succeeds.
