# Current Handover

Repository: `dmoneyUK/three-kingdoms`; branch: `ux-v2`.
Worktree: `/Users/jingedai/.codex/worktrees/h2-g3-f2-r3`.
Latest design reviewed: `5272b9c6`, `docs/UX2-refine.md` §10.8.2.2 F1-R4, owner override at 2026-10-28 19:12:12 UTC. Reviewed the newer §10.25 changes; they do not conflict with this in-progress F1-R4 correction.

## Current task

**H2-G3 F1-R4 — IMPLEMENTED / DEPLOYED — PENDING OWNER REAL-iPHONE RE-REVIEW (#3/#4).** Mobile left/right opponent Seat outer frames match the measured top width/height. Their Hero art now fills the portrait frame width using `object-fit: cover`, preserving image proportions and the existing vertical crop. Top sizing/gaps, player ring, game rules, Inspector and gameplay permissions are unchanged.

Code commit: `7ff2df4daeaab69c007ceb5900e7738a6fcccbd8`.
Exact-SHA [GitHub Actions 40757248761](https://github.com/dmoneyUK/three-kingdoms/actions/runs/40757248761): API, browser startup/room smoke, lint/fast tests, deployment and production smoke all passed. Cloudflare Worker version: `3251824a-dbb3-4268-b75b-66aa888237e5`. Direct production checks: `/api/health` returned HTTP 200 with `{"ok":true,"worker":"available"}`; homepage returned HTTP 200.

Focused mobile browser checks passed 2/2 in 9.4s with added side-image bounds/object-fit assertions. Measured frame border boxes remain: 390×844 seven-player top/side = 73.5×108px, outer-edge deltas 0/0px; 390×844 eight-player = 73.5×108px, deltas 0/0.5px; 440×766 eight-player = 83.5×108px, deltas 0/0.5px. Existing assertions also retain top gaps/margins, seat counts, target and TEST SWITCH hit regions, the 5/6-player regression, Inspector/SWITCH behavior and seven-player Harvest obstacle clearance. Owner must re-review the 7/8-player side frame/artwork fill on iPhone; do not mark accepted.

## Execution log

- 2026-10-28 19:27 UTC — reviewed the full owner F1-R4 correction and confirmed root cause: top Seats use `--mobile-seat-width`; side Seats inherited narrower `--side-safe-thumb-width`; prior test omitted side/top parity.
- 2026-10-28 19:29 UTC — a Playwright command without the repository config failed immediately on relative fixture URLs. The configured run then exposed a 2px bootstrap collapse when side height directly used an initially-zero variable. Added a 108px bootstrap floor matching existing top-frame CSS.
- 2026-10-28 19:31 UTC — configured focused browser checks passed 2/2; recorded the 390/440px DOMRects above. Browser time stayed well under the five-minute cap.
- 2026-10-28 19:32 UTC — safely fast-forwarded docs-only `b2a767db`, reviewed the change and confirmed F1-R4 requirements were unchanged. Local build, targeted ESLint, browser-spec syntax and diff checks passed.
- 2026-10-28 19:32 UTC — committed/pushed `104b0e70`; the prior latest Actions was green before this push.
- 2026-10-28 19:37 UTC — exact-SHA Actions completed green on `104b0e70`; deployment and production smoke passed. Confirmed Worker version and live health/homepage responses.

**Remaining action:** owner real-iPhone re-review of seven- and eight-player side frame/artwork fill. Keep H2-G3 partially accepted until that review; preserve previously passed #1/#2/#5 and accepted ST-RING-DIR-1 / Inspector F2-R3.

- 2026-10-28 19:45 UTC — reviewed the latest §10.8.2.2 F1-R4 contract and traced the remaining side-art gap to `width:auto` plus centered placement on the side-only Hero image rule. Scoped a mobile 7+ ring override to fill the portrait width while retaining `object-fit:cover`; extended the existing F1-R4 browser assertions for side-art width and edge alignment. Focused phone checks passed 2/2 in 9.4s at 390×844 and 440×766; `git diff --check` passed.
- 2026-10-28 19:46 UTC — committed `7ff2df4daeaab69c007ceb5900e7738a6fcccbd8` and pushed to `origin/ux-v2`.
- 2026-10-28 19:49 UTC — exact-SHA Actions `40757248761` completed green; Cloudflare Worker `3251824a-dbb3-4268-b75b-66aa888237e5` deployed and production smoke passed. Direct health/home checks returned 200.
- 2026-10-28 19:50 UTC — fetched and safely fast-forwarded remote documentation commits `5aee0a20` and `5272b9c6`; reviewed intervening design changes and confirmed §10.8.2.2 F1-R4 remained unchanged, preserving the unrelated NEG-COPY updates.
