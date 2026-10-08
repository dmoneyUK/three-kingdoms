# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result / CI

The P2 production-routing audit and real-game browser proof remain uncommitted:
Steal/Burning Bridge use `CurrentAction.targetCardSelection`; Retaliation/Frost
Sword/Kirin Bow use authoritative trigger options. The shared picker does not
require Hero Focus, Inspect, or preview proof, and no production JSX callsite
for the legacy table picker remains.

Actions run `37790885726` for exact parent SHA
`4ebea0b269a6deb537d39e9833beb128aae18adb` **FAILED**: Browser shard 2 failed
the Stargazing 390×844 touch-cancel case after prior mouse drags; 410 passed,
one failed, and shard 1 was cancelled. API and lint/fast jobs succeeded. The
focused test repair preserves touch-cancel and order-preservation assertions,
checks the real grip hit target, and runs cancellation alongside native touch
operations before mouse-only drags. Under CI-mode browser configuration, the
full Stargazing real-game spec passed 4/4; syntax and `git diff --check` passed.
No production code was changed for this repair.

CI REPAIR PUSHED — VALIDATION PENDING. Wait for the exact repair SHA to pass
before resuming P2. The real-game P2 browser spec currently passes locally
14/14, and target-card contract browser passes 68/68; these do not override the
failed remote CI gate. Existing Fanjian/§6 work and the separate P2 changes
remain outside the CI repair.

## Design checkpoint

Re-fetched `origin/ux-v2`; `docs/UX2-refine.md` remains blob
`7feb8af937b6407f3f33c3959325db8d3f188cf4`. Re-reviewed §§4C.1–4C.29 and the
§4D P2 gate. Section 6 remains deferred until all active pre-§5 gates close.

## Current / next task

`UX2.CI-REPAIR-STARGAZING-TOUCH-CANCEL-01` — commit/push only the focused
Stargazing browser-test repair and this handoff update; then hold feature work
until the exact repair SHA is green. Resume the existing P2 production-path
gate after that CI result. Do not include P2 or Fanjian/§6 changes in the repair.
