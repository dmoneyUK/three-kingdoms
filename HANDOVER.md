# Current Handover

Branch: `ux-v2` (working branch `codex/p0-card-play-f1`) · Updated: 2026-10-24

## Latest result

- `UX2-10.23-P0-PLAY-ACTION-LIVENESS`: **IMPLEMENTED / DEPLOYED — PENDING OWNER REAL-iPHONE RE-REVIEW**. Source `fcc35a9be3365193996e603cbf2a624eb9626b68` passed every required exact-SHA job in [Actions `40038794768`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/40038794768): lint/fast, API, browser smoke, deploy and production smoke. Worker version `502d9941-4f90-4317-ab04-8a0a3f0651b3`; direct `/api/health` returned `{"ok":true,"worker":"available"}` and `/` returned HTTP 200. First source attempt failed two fast checks; the compatibility/source-assertion CI repair is included in the passing SHA. Owner acceptance is not claimed.
- Focused local validation on mobile: P0 F1/F2 touch browser regressions 2/2, existing Duel-during-reveal, play-target authority (3), E1-F real Worker/D1 arrival, R1 response-during-polling, and fast tests 292/292 passed. Build passed; targeted ESLint had 0 errors and 3 pre-existing Hook warnings; `git diff --check` passed.
- Reviewed current `docs/UX2-refine.md` revision `9da58498707fc711adbdab955fce083189580e35`, especially §§10.17.2, 10.22 and 10.23. §10.23 is technically delivered; §10.22 is next at the safe boundary.

## Exactly ONE current bounded task: `UX2-10.22-POOL-SHARED-1 / S1`

**Status:** NOT STARTED. Extract the existing measured Harvest pool placement into a reusable battlefield-safe placement helper and presentational `BattlefieldChoiceStage` shell, then move Harvest through a thin adapter with **zero visible or behavioral change**. Keep this first slice to shared placement and shell; do not migrate Steal/Burning Bridge yet.

**Hard boundaries:** preserve accepted Harvest CardFace sizing, H4 position/copy, reveal/move/park timing, Negation chain, taken state, Info/Confirm, chooser authority, privacy and TEST SWITCH. No gameplay/API rule changes. Phone viewports only; compare actual DOMRects, safe-area/Seat/H4/timer/Dock obstacles and touch hit targets before and after.

**Validation/delivery:** extend relevant existing mobile browser coverage without a broad new matrix, run focused local checks and the normal exact-SHA required Actions/deploy/production health gate. Record actual measurements and limitations. Keep the result **IMPLEMENTED / DEPLOYED — PENDING USER PHONE REVIEW** until the owner reviews it; then continue the approved §10.22 sequence and original §10.17.2 BCP-2 migration as a separate bounded handoff.
