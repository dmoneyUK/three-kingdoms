# HANDOVER

Target branch: `ux-v2` (working branch: `codex/quick-test-modes`). Phone-only.

## Latest execution result

**H2-G3-F1 §10.8.2.2 — IMPLEMENTED / DEPLOYED — PENDING OWNER REAL-iPHONE RE-REVIEW.** Source `a74b0bbbbfd676c04c06299de4c975e16a248982`; exact-SHA [Actions `40145397817`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/40145397817) passed lint/fast, browser startup smoke, API, D1 migration, Worker deployment and production smoke. Worker `de8bcf1b-ad77-4ae7-8c98-d1ee46d7b8cd`; production `/` and `/api/health` returned HTTP 200, health `{"ok":true,"worker":"available"}`. Before the fix, the 6-player 480×900 geometry case placed top Seats 44.7px below the board edge. After the fix, the existing focused geometry check passed 2/2 for 6/8 players at 480×900, checking top-edge alignment, two safe upper Seats, compact same-side gaps, containment and no overlap. Local visual coverage was only the deterministic 480×900 fixture; authenticated multi-viewer and shorter-phone checks were not run. No owner phone acceptance is inferred.

Reviewed §10.8.2.2 in `docs/UX2-refine.md` from `ux-v2` SHA `ee276a4`; the document now records F1 evidence and keeps F2 active under the original H2-G3 identity.

## Exactly one current bounded task

**H2-G3-F2 §10.8.2.2 — 6/8-player mobile Inspector HP/Hand and Judgement reflow.** Diagnose the reported text overlap with measured phone DOMRects and computed widths; create a readable independent HP/Hand header area, then place skills and the existing two Judgement slots below/alongside it without overlap, keeping the four-slot Equipment row below. Preserve the accepted INS-5-F1-R content, truthful public values, scrollable details, Inspector bounds, and role/Hand privacy. Scope changes only to the 6/8-player phone Inspector; do not alter F1 seat placement, 4-player or 5-player layouts, game rules, public card parking, H4 or legal authority. Use the smallest focused browser check, capped at five minutes, and record any unverified phone sizes; final status must be pending owner iPhone review, never Agent-accepted.
