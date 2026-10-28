# Current Handover

Repository: `dmoneyUK/three-kingdoms`
Target: `origin/ux-v2`; worktree: `codex/h2-g3-f2-r3`

Latest design reviewed: `docs/UX2-refine.md` at `29c2d1b46fb27b97613842db21df18b80bd2f8a5`, §10.8.2.2 and accepted §10.24; execution: `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`.

## Latest relevant result

- **H2-G3 F1-R3 — IMPLEMENTED / DEPLOYED — PENDING OWNER iPHONE RE-REVIEW.** Source `f0d3df334100517da646fb93fc8a680d542e7d90`; exact-SHA [Actions 40661908578](https://github.com/dmoneyUK/three-kingdoms/actions/runs/40661908578) passed lint/fast, API, browser smoke, D1 migration, Worker deployment and production smoke. Worker version `98d0c6ce-a9a8-40bc-a0c3-1bc2ef0e2281`. Direct production checks: `/` HTTP 200 and `/api/health` `{"ok":true,"worker":"available"}`. Phone fixture geometry and screenshots are in `tests/browser/test-results/browser/` for 390×844 seven/eight-player and 440×766 eight-player layouts.
- **H2-G3 F2-R3 — USER-ACCEPTED / CLOSED.** Owner's five iPhone checks passed at 2026-10-28 08:24 UTC. Source `cda8c8e71217675f3492004b0c6c5f74f41ab533`; exact-SHA [Actions 40612723870](https://github.com/dmoneyUK/three-kingdoms/actions/runs/40612723870) passed, including deployment and production smoke; Worker `c4b06c8a-bd89-4a2c-b492-ba2d8fcfe7bf`.
- **ST-RING-DIR-1 — USER-ACCEPTED / CLOSED.** Owner's five iPhone checks passed at 2026-10-28 08:21 UTC. Its clockwise seat projection remains the base for this task.

## Current bounded task

**H2-G3 F1-R3 — IMPLEMENTED / DEPLOYED — PENDING OWNER iPHONE RE-REVIEW.** Code commit `f0d3df334100517da646fb93fc8a680d542e7d90` is pushed to `origin/ux-v2`; exact-SHA CI and production Worker deployment passed. Fixed five-seat reference width, independent top spacing, eight-player TOP5 cap and side edge alignment are implemented. Preserve 4-player layout, accepted clockwise identity/order, Inspector, interactions, privacy, and all server/game rules.

### Acceptance / stop boundary

- Focus phone layouts at 390×844 and 440×766. At each viewport, compare 4-top and 5-top real Seats; width spread <=1 CSS px, top gap spread <=2 px, symmetric edge margin difference <=4 px, side outer-edge alignment <=2 px, no overlap/clipping/scroll, and all Seat/Inspector/SWITCH/public-choice controls remain usable.
- Verify 5/6/7/8 counts and clockwise player identity after TEST SWITCH; 7 is 4+2 and 8 is 5+2. Do not alter seat IDs, turn order, target legality, equipment modifiers, Inspector dimensions, or gameplay.
- Local browser testing combined limit: five minutes. Run focused geometry and projector checks only; stop UI testing at the limit.
- Owner iPhone re-review: compare 5-player TOP4 with 6-player TOP5; confirm 7-player TOP4+LEFT1+RIGHT1 and 8-player TOP5+LEFT1+RIGHT1; inspect equal top gaps, symmetric margins, flush side edges, TEST SWITCH, Inspector, public cards and choice controls. Only owner verdict can accept this change.
- Final status: **IMPLEMENTED / DEPLOYED — PENDING OWNER iPHONE RE-REVIEW**. Do not mark accepted.

### Execution log

- 2026-10-28 09:03 UTC — verified the isolated worktree was clean at `f5d00d1a`; fetched and fast-forwarded three documentation commits to latest `origin/ux-v2` `29c2d1b4`. Read complete existing HANDOVER, latest F1-R3 plan, workflow, and relevant seat projection/measurement/CSS/browser test sections. Reconciled F2-R3 and ST acceptance from the latest design.
- 2026-10-28 09:04 UTC — confirmed root causes in `projectSideColumnSeat()`, the measured `seatWidth` formula, centered top-seat offset, and side-column CSS tracks: actual width depended on current `topCount`, step stayed tied to width plus a small fixed gap, eight players could render six top, and side tracks did not guarantee outer-edge alignment.
- 2026-10-28 09:05 UTC — implemented five-top reference sizing independent of actual top count, x-step distribution, 8-player TOP5 cap, and side-grid outer-edge alignment. Updated the existing focused ring spec with 5–8 count, width/gap/margin/alignment, hit-target, TEST SWITCH, Harvest-clearance and 440px geometry assertions. No gameplay/server code changed.
- 2026-10-28 09:05 UTC — first test wrapper attempted to use the unavailable `timeout` shell utility; the command exited before starting Playwright. Reran the focused suite directly. Three F1-R3 cases passed in 10.2 seconds; after adding persistent local screenshot output and geometry logs, the final rerun passed the same three cases in 10.1 seconds. Total local UI execution was about 30.5 seconds, below the five-minute cap.
- 2026-10-28 09:06 UTC — measured 390×844: 7-player TOP4 widths 73.5px, equal gaps 30px, margins 0/0px and side edge deltas 0/0px; 8-player TOP5 widths 73.5px, equal gaps 4px, margins 0/0.5px and side edge deltas 0/0.5px. Measured 440×766 eight-player: TOP5 widths 83.5px, gaps 4px, margins 0/0.5px and side edge deltas 0/0.5px. All Seats were 108px high; switch/target hit checks and public-choice clearance passed. Screenshot evidence is in ignored `tests/browser/test-results/browser/` output folders for the 390px 7/8 and 440px 8-player views.
- 2026-10-28 09:06 UTC — `npm run build` passed (existing large-chunk and route-classification warnings). `node --check`, final `git diff --check`, and targeted ESLint passed; ESLint reported 0 errors and 2 pre-existing React Hook warnings at `app/page.tsx:8204` and `:8421`. The first diff check caught trailing Markdown hard-break spaces in this handover; they were removed, and the final diff check passed.
- 2026-10-28 09:07 UTC — pre-commit CI check: latest visible `ux-v2` run was successful [40612723870](https://github.com/dmoneyUK/three-kingdoms/actions/runs/40612723870) on `cda8c8e`; no queued/in-progress run existed. Its later design commits are Markdown-only and ignored by the deploy workflow.
- 2026-10-28 09:08 UTC — committed the four task files as `f0d3df334100517da646fb93fc8a680d542e7d90` (`fix(ux2): stabilize mobile multi-seat geometry`) and pushed by fast-forward to `origin/ux-v2`.
- 2026-10-28 09:11 UTC — exact-SHA [Actions 40661908578](https://github.com/dmoneyUK/three-kingdoms/actions/runs/40661908578) passed every required job: Lint/fast, API, browser startup/room smoke, D1 migration, deploy and production smoke. Cloudflare reports Worker version `98d0c6ce-a9a8-40bc-a0c3-1bc2ef0e2281`; direct production root/health checks also passed. Implementation remains pending owner iPhone review.
