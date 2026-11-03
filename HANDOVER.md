# HANDOVER — Current Task Only

Repository: `dmoneyUK/three-kingdoms` · target `ux-v2`

Worktree: `/Users/jingedai/.codex/worktrees/ux2-judgement-seat-01` · branch `codex/ux2-judgement-seat-01`

Latest design reviewed: `docs/UX2-refine.md` revision `e33190bfdee03c87ddcd27ccfaeab4b1db9638d4` (2026-11-02 23:09 UTC).
Latest remote `ux-v2` reviewed: `a884568859377bad73ac9f36ee0259dd1ee5247e`; design revision unchanged.

## Current bounded task — T6 PUBLIC-PAC-REVEAL-ORDER-01 (§10.30)

**Status: IN PROGRESS — NOT OWNER-ACCEPTED.** This remains one consolidated phone-acceptance scope. Preserve the delivered T4 Frame typography and accepted T2 Inspector, Console End, Harvest, Steal/Dismantle, privacy and 4/5/6-player behavior. The design defines no new task IDs.

**Current implementation step:** Extend the shared measured layout so the visible public countdown is represented by the same scene/generation in its protected side lane. Preserve the existing timer placement when the shared geometry confirms it is safe. Then complete shared H4 reflow across REVEAL → MOVE → PARKED before auditing committed public response history. No card/effect-specific offsets; preserve T4 Frame typography and accepted T2.

**Local result — 2026-11-03 00:09 UTC:** `npm run build` passed. Focused layout tests **4/4** and public announcement tests **27/27** passed. Targeted ESLint exited 0 with 15 Hook warnings in existing `app/page.tsx` and `app/public-card-display.tsx` locations. `git diff --check` passed. One real-game 390×844 browser scenario passed in 10.0s for committed Something Out of Nothing and Barbarian Invasion reveals: CardFace/Frame, H4 and PAC shared one layout identity; full-size 90×135 card and safe timer/Dock bounds were preserved. Earlier browser attempts used stale `dist/client` and one obsolete assertion required PAC compression; after rebuilding current source and removing that superseded assertion, the source-backed scenario passed. Total local browser time remained below five minutes.

**Latest delivered T6 step — shared REVEAL geometry:** Source commit [`16468f5e713a0c68bd9d4e1a45e6deb897bc1854`](https://github.com/dmoneyUK/three-kingdoms/commit/16468f5e713a0c68bd9d4e1a45e6deb897bc1854) is pushed to `ux-v2`. Exact-SHA [Actions run 41550956280](https://github.com/dmoneyUK/three-kingdoms/actions/runs/41550956280) completed **SUCCESS** at 00:14 UTC: Lint/fast tests, API tests, browser startup/room smoke, Worker deployment and production smoke all passed. Worker version `285c94ea-b1fc-4261-a754-ddec38b77306`; direct `/api/health` at 00:14 UTC returned HTTP 200, `{"ok":true,"worker":"available"}`. The shared REVEAL geometry and focused 390×844 test results above are deployed. Public response-history retention and MOVE/PARKED H4 reflow remain unmodified and unverified.

Do not mark T6 accepted or ready for owner phone review until the remaining §10.30 corrections, including committed public counter history, are deployed and the single combined iPhone checklist is prepared.
