# Current Handover

Repository: `dmoneyUK/three-kingdoms`; branch: `ux-v2`.
Worktree: `/Users/jingedai/.codex/worktrees/h2-g3-f2-r3`.
Latest design reviewed: `b2a767db`, `docs/UX2-refine.md` §10.8.2.2 F1-R4, owner override at 2026-10-28 19:12:12 UTC. The intervening W3-F2-R1 acceptance is unrelated.

## Current task

**H2-G3 F1-R4 — IMPLEMENTED / DEPLOYED — PENDING OWNER REAL-iPHONE RE-REVIEW (#3/#4).** Corrected only mobile left/right opponent Seat outer-frame sizing. Side frames now use the measured top width, bootstrap to the existing 108px top height, preserve outside-edge alignment, and calculate the safe corridor from the full side-seat width. Top sizing/gaps, player ring, game rules, Inspector and gameplay permissions were not changed.

Code commit: `104b0e703ac2af63a3c29bb15ac801c653d2e65f`.
Exact-SHA [GitHub Actions 40755206128](https://github.com/dmoneyUK/three-kingdoms/actions/runs/40755206128): API, browser startup/room smoke, lint/fast tests, deploy and production smoke all passed. Cloudflare Worker version: `2813b641-6fd5-4adc-9c32-2725f29d04d7`. Production `/api/health`: `{"ok":true,"worker":"available"}`; homepage HTTP 200.

Focused mobile browser checks passed 2/2 in 9.3s. Measured border boxes: 390×844 seven-player top/side = 73.5×108px, outer-edge deltas 0/0px; 390×844 eight-player = 73.5×108px, deltas 0/0.5px; 440×766 eight-player = 83.5×108px, deltas 0/0.5px. Existing assertions also retained top gap/margins, seat counts, target and TEST SWITCH hit regions, the 5/6-player regression, Inspector/SWITCH behavior and seven-player Harvest obstacle clearance. Owner must re-review the 7/8-player side frames on iPhone; do not mark accepted.

## Execution log

- 2026-10-28 19:27 UTC — reviewed the full owner F1-R4 correction and confirmed root cause: top Seats use `--mobile-seat-width`; side Seats inherited narrower `--side-safe-thumb-width`; prior test omitted side/top parity.
- 2026-10-28 19:29 UTC — a Playwright command without the repository config failed immediately on relative fixture URLs. The configured run then exposed a 2px bootstrap collapse when side height directly used an initially-zero variable. Added a 108px bootstrap floor matching existing top-frame CSS.
- 2026-10-28 19:31 UTC — configured focused browser checks passed 2/2; recorded the 390/440px DOMRects above. Browser time stayed well under the five-minute cap.
- 2026-10-28 19:32 UTC — safely fast-forwarded docs-only `b2a767db`, reviewed the change and confirmed F1-R4 requirements were unchanged. Local build, targeted ESLint, browser-spec syntax and diff checks passed.
- 2026-10-28 19:32 UTC — committed/pushed `104b0e70`; the prior latest Actions was green before this push.
- 2026-10-28 19:37 UTC — exact-SHA Actions completed green on `104b0e70`; deployment and production smoke passed. Confirmed Worker version and live health/homepage responses.

**Remaining action:** owner real-iPhone re-review of seven- and eight-player side-frame parity only. Keep H2-G3 partially accepted until that review; preserve previously passed #1/#2/#5 and accepted ST-RING-DIR-1 / Inspector F2-R3.
