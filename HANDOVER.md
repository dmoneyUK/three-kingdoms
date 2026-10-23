# Current Handover

Branch: `ux-v2` (working branch `codex/p0-card-play-f1`) · Updated: 2026-10-24

## Latest result

- `UX2-10.23-P0-PLAY-ACTION-LIVENESS`: **IMPLEMENTED / DEPLOYED — PENDING OWNER REAL-iPHONE RE-REVIEW**. Source `fcc35a9be3365193996e603cbf2a624eb9626b68` passed every required exact-SHA job in [Actions `40038794768`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/40038794768); Worker version `502d9941-4f90-4317-ab04-8a0a3f0651b3`, `/api/health` returned `{"ok":true,"worker":"available"}`, `/` returned HTTP 200. Owner acceptance is not claimed.
- `UX2-10.22-POOL-SHARED-1 / S1`: implementation is local; exact-SHA Actions/deployment pending. Extracted Harvest's measured lane/top algorithms into pure placement helpers and its existing outer DOM into `BattlefieldChoiceStage`. The existing 5-player phone flow rendered identical measured `table/stage/panel/H4/timer` bounds before/after at 390×700; its real-Worker choice/60s timer and 4s reveal/MOVE browser checks pass. Targeted build passed; ESLint had 0 errors and 3 pre-existing Hook warnings. The stale root-thumbnail assertion now expects the approved 32×48 phone size.
- Focused Harvest browser checks also expose existing base-branch failures, reproduced on unmodified `9cc450b`: occasional pool/H4 or parked-card/H4 overlap; a side-seat Negation card can remain `layoutPending`; one Info/title glyph check overlaps by 3–5px; and a 1px pool/timer edge overlap. These are unchanged by this extraction and remain recorded limitations; do not weaken the existing geometry assertions to mask them.
- Reviewed `docs/UX2-refine.md` revision `9da58498707fc711adbdab955fce083189580e35`, especially §§10.17.2, 10.22 and 10.23.

## Exactly ONE current bounded task: `UX2-10.22-POOL-SHARED-1 / S1`

**Status:** IMPLEMENTED LOCALLY — VALIDATION/DEPLOYMENT PENDING. Keep S1 behavior- and appearance-neutral: preserve accepted Harvest sizing/placement, H4, reveal/MOVE/park timing, Negation/taken semantics, Info/Confirm, chooser authority, privacy and TEST SWITCH. Do not migrate Steal/Burning Bridge yet.

**Validation/delivery:** run the commit-time exact-remote-head CI gate, push only S1 files to `ux-v2`, wait for exact-SHA required Actions and Worker production smoke, then record the run, Worker version and known base-branch limitations. Status after delivery: **IMPLEMENTED / DEPLOYED — PENDING USER PHONE REVIEW**. Only then plan §10.22 S2.
