# HANDOVER

Target branch: `ux-v2` (working branch: `codex/quick-test-modes`). Phone-first; preserve the 4–8 player test-room limit.

## Latest execution state

**Quick Test starting-hand presets — implementation complete; exact-SHA CI/deployment pending.** Based on latest `origin/ux-v2` at `ad3d351`. Reviewed the latest T3-F1 design update; this task only adds test preset setup and does not change Dismantle/Steal gameplay or presentation behavior. Removed Attack/Dodge and Attack/Negation from selectable presets. Added Dismantle/Steal preset: each of the first five seats starts with Dismantle, Steal, a unique weapon, and either Lightning or Overindulgence. Seats beyond the fifth keep the normal random deal. Saved rooms using either retired preset fall back to Random Hands.

**Validation:** focused preset tests passed 3/3 using the already-installed `tsx` runtime; added the test file to the fast-test list. No browser/UI test was run. Exact-SHA CI and Worker deployment are not yet verified.

## Exactly one current bounded task

Finish delivery of the Quick Test preset change: commit/push only its source, focused regression, and this handoff; verify exact-SHA required CI and deployment, then leave the new preset ready for owner mobile review. Do not mark user-accepted.
