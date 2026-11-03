# HANDOVER — Current Task Only

Repository: `dmoneyUK/three-kingdoms` · target `ux-v2`

Worktree: `/Users/jingedai/.codex/worktrees/ux2-judgement-seat-01` · branch `codex/ux2-judgement-seat-01`

Latest design reviewed: `docs/UX2-refine.md` revision `e33190bfdee03c87ddcd27ccfaeab4b1db9638d4` (2026-11-02 23:09 UTC).
Latest remote `ux-v2` reviewed: `b49becadc42909c55dd36de0d106da772d9d6d8f`; design revision unchanged.

## Current bounded task — T6 PUBLIC-PAC-REVEAL-ORDER-01 (§10.30)

**Status: IN PROGRESS — NOT OWNER-ACCEPTED.** This remains one consolidated phone-acceptance scope. Preserve the delivered T4 Frame typography and accepted T2 Inspector, Console End, Harvest, Steal/Dismantle, privacy and 4/5/6-player behavior. The design defines no new task IDs.

**Current implementation step:** Reflow H4 under one proven scene generation across REVEAL → MOVE → PARKED. When the primary card moves away, return H4 to its stage-centred band without replaying or re-parking the physical card. Preserve event/card/viewer identity, full CardFace/Frame, PAC and timer ownership. Do not change public history ownership in this step.

**Latest local result — 2026-11-03 00:17 UTC:** shared layout includes visible countdowns among its protected Rects and tags them with the current scene identity without changing timer CSS/position. The full-size 90×135 card remains unchanged; browser-measured CardFace-to-PAC gaps are **8.94px** and **8.67px** after adding a 1px subpixel margin. Targeted layout tests **4/4**, targeted ESLint, `npm run build`, and `git diff --check` passed. One real-game 390×844 browser scenario passed in **10.2s** for committed Something Out of Nothing and Barbarian Invasion reveals; countdown identity and Rect match the shared result on both.

**Latest delivered T6 step — shared REVEAL geometry:** Source commit [`16468f5e713a0c68bd9d4e1a45e6deb897bc1854`](https://github.com/dmoneyUK/three-kingdoms/commit/16468f5e713a0c68bd9d4e1a45e6deb897bc1854) is pushed to `ux-v2`. Exact-SHA [Actions run 41550956280](https://github.com/dmoneyUK/three-kingdoms/actions/runs/41550956280) completed **SUCCESS** at 00:14 UTC: Lint/fast tests, API tests, browser startup/room smoke, Worker deployment and production smoke all passed. Worker version `285c94ea-b1fc-4261-a754-ddec38b77306`; direct `/api/health` at 00:14 UTC returned HTTP 200, `{"ok":true,"worker":"available"}`. The shared REVEAL geometry and focused 390×844 test results above are deployed. Public response-history retention and MOVE/PARKED H4 reflow remain unmodified and unverified.

**Latest delivered T6 step — countdown shares the REVEAL generation:** Source commit [`b49becadc42909c55dd36de0d106da772d9d6d8f`](https://github.com/dmoneyUK/three-kingdoms/commit/b49becadc42909c55dd36de0d106da772d9d6d8f) is pushed to `ux-v2`. Exact-SHA [Actions run 41551875970](https://github.com/dmoneyUK/three-kingdoms/actions/runs/41551875970) completed **SUCCESS** at 00:22 UTC: Lint/fast tests, API tests, browser startup/room smoke, Worker deployment and production smoke all passed. Worker version `9acbd612-68d2-45cf-b340-90bfa3920fa8`; direct `/api/health` at 00:22 UTC returned HTTP 200, `{"ok":true,"worker":"available"}`. The countdown position is retained as a protected measured side lane within the same layout identity.

Do not mark T6 accepted or ready for owner phone review until shared phase reflow and committed public counter history corrections are deployed and the single combined iPhone checklist is prepared.
