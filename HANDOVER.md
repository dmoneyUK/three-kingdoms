# HANDOVER

Target branch: `ux-v2` (working branch: `codex/quick-test-modes`). Phone-first; preserve the 4–8 player test-room limit.

## Latest execution state

**Quick Test starting-hand presets — IMPLEMENTED / DEPLOYED; PENDING USER REVIEW.** Based on latest `origin/ux-v2` at `ad3d351`. Reviewed the latest T3-F1 design update; this task only adds test preset setup and does not change Dismantle/Steal gameplay or presentation behavior. Removed Attack/Dodge and Attack/Negation from selectable presets. Added Dismantle/Steal preset: each of the first five seats starts with Dismantle, Steal, a unique weapon, and either Lightning or Overindulgence. Seats beyond the fifth keep the normal random deal. Saved rooms using either retired preset fall back to Random Hands. Source SHA: `f954d67390ae3a548429addf5d8be39fb96c497f`.

**Validation:** focused preset tests passed 3/3 using the already-installed `tsx` runtime; added the test file to the fast-test list. No local browser/UI test was run. Exact-SHA [GitHub Actions run 40142844364](https://github.com/dmoneyUK/three-kingdoms/actions/runs/40142844364) passed lint/fast tests, API tests, browser startup/room smoke, Worker deployment and production smoke. Live homepage returned HTTP 200; `/api/health` returned `{"ok":true,"worker":"available"}`.

## Exactly one current bounded task

Owner: review the new Dismantle/Steal starting-hand preset in Quick Test on mobile. Confirm the removed presets are absent and the first five seats receive the configured cards. Do not mark USER-ACCEPTED until the owner reports acceptance.
