# Current Handover

Repository: `dmoneyUK/three-kingdoms`

Target: `origin/ux-v2`; worktree branch: `codex/st-ring-dir1-topfirst`

Latest design reviewed: `docs/UX2-refine.md` §10.24 and H2-G3 §10.8.2.2 at `a024a9e8a09462f68534e95d9bcc682fad2cd3da`.

## Latest relevant result

**ST-RING-DIR-1 orientation-only interim — deployed, superseded by latest design.** Base source `dec38f2b76b4f134a8663acf40587ec669c5a525`; exact-SHA [Actions 40607411121](https://github.com/dmoneyUK/three-kingdoms/actions/runs/40607411121) passed and deployed Worker `cedf5412-5ea6-404e-8cc9-f483f50ba80e`; production `/` and `/api/health` returned HTTP 200. That implementation only normalized clockwise direction for the previous 6/8 top-row behavior. Latest §10.24 now requires top-first placement for all 5–10 phone games, with a specific seven-player cap of four top seats; the interim commit is not completion of this revised task.

## Current bounded task

**ST-RING-DIR-1 — implement §10.24 top-first phone seat topology for 5–10 players. IN PROGRESS; NOT ACCEPTED.** Measure a stable safe top capacity and use it for all 5–10 phone games; cap seven-player top seats at four even when five fit; use the approved clockwise server-relative projection for all overflow. Keep the accepted four-player layout and game rules/identity/legality/privacy unchanged. Keep H2-G3 F1-R3 as the separate next task; do not begin it in this handoff.

### Execution log

- **2026-10-28 00:27 UTC — synchronized and reviewed.** Fetched `origin/ux-v2` through `a024a9e8`; reviewed §10.24, H2-G3 linkage and the five-minute phone-test/CI workflow. Confirmed `dec38f2` is already an ancestor of the latest remote head. The older worktree's three uncommitted documentation files remain untouched; this task uses a clean isolated worktree.
- **2026-10-28 00:27 UTC — diagnosis confirmed.** `projectSideColumnSeat()` gates top seats to six/eight players and reserves two side seats; `GameRoom` gates measurement to six/eight and uses the re-expanded first Seat width for capacity; the five-player CSS forces its old side-only rows. I am replacing only this presentation mapping/measurement and its focused acceptance assertions.
- **2026-10-28 00:30 UTC — first UI launch did not reach tests.** The isolated worktree had no local Playwright install; I reused the existing matching package install after confirming identical `package-lock.json` SHA-256 values across all three checkouts. The first browser-server retry then exited before tests because `dist/server/wrangler.json` was not built. No product assertion ran or failed; I am building once before retrying the same focused mobile cases.
- **2026-10-28 00:33 UTC — one focused mobile case reached Inspector, then timed out at 30s.** The test opened Player 2's Inspector and then tried to tap a second hero/TEST SWITCH underneath the open panel; the panel correctly occluded those targets, so this was a test-flow failure rather than a seat-geometry assertion. The screenshot showed Player 4/5 switches still exposed. I changed the scenario to switch to Player 4 without targeting controls covered by Inspector; rerun remains required. No source behavior change was inferred from the timeout.
- **2026-10-28 00:34–00:35 UTC — focused mobile case found a real seven-player overlap.** At 390×844, overflow Seat `p3` was drawn at x=299–360, y=116–224 and was overlapped by top Seat `p2` at x=294–387, y=116–224. The computed Grid placed side overflow in row 1 despite the prior padding-based attempt to reserve the top band. I changed the layout to define an explicit top-band grid track and place side Seats starting in the following track; stable Seat width and viewer-relative order are unchanged. Two targeted re-runs confirmed the same overlap in under 6s each; no more diagnostic loop was needed.
- **2026-10-28 00:36 UTC — bounded phone browser checks passed.** The focused 5/6/7-player scenario passed in 7.5s, including TEST SWITCH with Inspector open, clockwise identity mapping after viewer switches, and seven-player Bumper Harvest pool clearance. The separate eight-player phone geometry scenario passed in 6.6s. Total actual UI execution for these focused runs remained well below the five-minute cap. No gameplay rules, server legality, or private projections changed.
- **2026-10-28 00:37 UTC — mapping contract and local build passed.** The pure projection assertions passed for N=5–10 and capacities 0/3/4/5/O in 5.8s. `npm run build` passed; `node --check tests/browser/side-column-seat-recognition.spec.mjs` and `git diff --check` passed. Build reports the existing >500 kB chunk and static route-classification warnings only.
- **2026-10-28 00:38 UTC — pre-commit CI gate checked.** Current remote tip remains docs-only `a024a9e8`; latest push-triggered Worker workflow is successful run [40607411121](https://github.com/dmoneyUK/three-kingdoms/actions/runs/40607411121) for ancestor `dec38f2b76b4f134a8663acf40587ec669c5a525`, with Browser startup/room smoke, API, Lint/fast, deploy and production smoke all successful; no queued or in-progress run is present. This is only the pre-commit gate, not validation of the pending ST source SHA.
- **2026-10-28 00:39–00:41 UTC — first exact-SHA CI failed on one introduced lint error.** Source/test commit `9e23bfe32faf94c8c3c24473e505ce69a1aeb00a` is on `origin/ux-v2`. [Actions 40610096477](https://github.com/dmoneyUK/three-kingdoms/actions/runs/40610096477) completed with API and Browser startup/room smoke green, but Lint/fast failed and deployment was skipped. ESLint identified only unused `leftCount` in the new projection test; the variable was removed and targeted `npx eslint tests/browser/side-column-seat-recognition.spec.mjs` now passes. CI repair commit and its required exact-SHA retry remain pending.

### Required delivery evidence

Record the actual source/test commit SHA, focused mapping and one phone browser result (combined local UI test time under five minutes), exact-SHA GitHub Actions, deployment/Worker version and production health. Final status: **IMPLEMENTED / DEPLOYED — PENDING OWNER PHONE REVIEW**. Do not mark user acceptance.
