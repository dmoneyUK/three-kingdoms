# Current Handover

Branch: `ux-v2` (isolated worktree). Latest reviewed design: `docs/UX2-refine.md` §10.10.3.1, owner decision 2026-10-26 21:18 UTC.

## Current task — T3-F1 R4: owner iPhone re-review

**IMPLEMENTED / DEPLOYED — PENDING OWNER iPHONE RE-REVIEW.** Source `dee0fb52488473891975cfc03cb8981c57b4bada`; exact-SHA [Actions `40412974924`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/40412974924) passed lint/fast, API, browser startup/room smoke, D1 migrations, Worker deployment and production smoke. Worker version `5c5f9db8-444e-4c42-9262-aeabfd7f6531`; direct production `/api/health` returned HTTP 200 with `{"ok":true,"worker":"available"}`. No server rules, protocol, legal actions or private-card projection changed.

Stage A keeps target selection interactive only for the authorized actor and shows other viewers the public take/discard waiting copy. Stage B presents the proof-backed affected-card face, or one generic back for concealed-Hand Steal, with matching public copy for 3,000ms of actually visible read time before the existing fade. Hidden Hand identity is absent from the result markup and observer projection. Polling, hidden tabs and overlapping Inspector/card/pool overlays reset the per-viewer read clock.

## Execution record — 2026-10-26 UTC

- **22:28 — Focused mobile run 1:** stopped before settlement. The inherited handoff probe waited only 1 second for a target pool on every viewer, although spectators now correctly have no pool. Updated the probe to observe the actor pool or spectator waiting status and use the existing 5-second readiness bound.
- **22:28–22:30 — Focused mobile run 2:** authenticated 4-player Steal flow at 390×844 reached the proven result. Result card/back, matching public text, hidden-ID checks and the ≥3,000ms visible-read assertion passed. The run then timed out on the old final assertion, which looked up the public display after the result had faded and been removed. Moved that action-key assertion into the visible-result phase. **The focused spec was not rerun**, to stay within the five-minute local UI-test cap; the final local browser spec is therefore not claimed green. The trace frame confirms the actual mobile back-and-copy composition.
- **22:30–22:34 — Local checks and delivery:** build passed; targeted ESLint had 0 errors and 15 Hook dependency warnings; browser script syntax and `git diff --check` passed. Commit `dee0fb5` pushed to `ux-v2` at 22:30 UTC. Exact-SHA Actions finished green at 22:34 UTC. Direct production health check at 22:34 UTC returned HTTP 200.

## One outstanding item

Owner: review T3-F1 R4 on iPhone and provide the acceptance verdict. Do not mark USER-ACCEPTED until the owner explicitly accepts it. No additional coding task is open in this handoff.
