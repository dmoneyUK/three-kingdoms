# HANDOVER — Current Task Only

Repository: `dmoneyUK/three-kingdoms` · target `ux-v2`

Worktree: `/Users/jingedai/.codex/worktrees/ux2-judgement-seat-01` · branch `codex/ux2-judgement-seat-01`

Latest design reviewed: `docs/UX2-refine.md` revision `e33190bfdee03c87ddcd27ccfaeab4b1db9638d4` (2026-11-02 23:09 UTC).
Latest remote `ux-v2` reviewed: `eb35a13ba6c0e36f426d54f30eee36468190e467`; design revision unchanged.

## Current bounded task — T6 PUBLIC-PAC-REVEAL-ORDER-01 (§10.30)

**Status: IN PROGRESS — NOT OWNER-ACCEPTED.** This remains one consolidated phone-acceptance scope. Preserve the delivered T4 Frame typography and accepted T2 Inspector, Console End, Harvest, Steal/Dismantle, privacy and 4/5/6-player behavior. The design defines no new task IDs.

**Current implementation step:** Finish the shared countdown-lane projection, then commit, run exact-SHA CI and deploy. Its measured Rect must share the CardFace/Frame, H4 and PAC scene identity; preserve current timer position and touch behavior, and fail closed if the full reveal stack cannot fit. Do not change phase-transition or history ownership in this step. After deployment, reflow H4 across REVEAL → MOVE → PARKED as the next bounded step.

**Current local result — 2026-11-03 00:17 UTC:** shared layout now includes visible countdowns among its protected Rects and tags them with the current scene identity without changing timer CSS/position. The full-size 90×135 card remains unchanged; the browser-measured CardFace-to-PAC gaps are **8.94px** and **8.67px** after adding a 1px subpixel margin. Targeted layout tests **4/4**, targeted ESLint, `npm run build`, and `git diff --check` passed. One real-game 390×844 browser scenario passed in **10.2s** for committed Something Out of Nothing and Barbarian Invasion reveals; countdown identity and Rect match the shared result on both. This step is local and not yet committed.

**Latest delivered T6 step — shared REVEAL geometry:** Source commit [`16468f5e713a0c68bd9d4e1a45e6deb897bc1854`](https://github.com/dmoneyUK/three-kingdoms/commit/16468f5e713a0c68bd9d4e1a45e6deb897bc1854) is pushed to `ux-v2`. Exact-SHA [Actions run 41550956280](https://github.com/dmoneyUK/three-kingdoms/actions/runs/41550956280) completed **SUCCESS** at 00:14 UTC: Lint/fast tests, API tests, browser startup/room smoke, Worker deployment and production smoke all passed. Worker version `285c94ea-b1fc-4261-a754-ddec38b77306`; direct `/api/health` at 00:14 UTC returned HTTP 200, `{"ok":true,"worker":"available"}`. The shared REVEAL geometry and focused 390×844 test results above are deployed. Public response-history retention and MOVE/PARKED H4 reflow remain unmodified and unverified.

Do not mark T6 accepted or ready for owner phone review until the remaining phase-reflow and committed public counter history corrections are deployed and the single combined iPhone checklist is prepared.
