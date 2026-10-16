# Current Handover

Branch: `ux-v2`

## Latest results

- **UX2-U13-A and U13-B delivered; PENDING REVIEW.** U13-A is at `9d75811b424afc145074bee52c0fc9ada7e9e027` (Actions `38950208342` green). U13-B is at `488e991ac1b3ca1ab775882df860820466d3246e` after implementation `8f25da2` and assertion repairs `d0fb826` / `488e991` (Actions `38952156696` green; Worker `991f2898-6db9-4ca1-a8fe-83d547c152d4`). Standard browser coverage was startup/room smoke; their task-specific phone/multiviewer acceptance remains unverified.
- **R4-F USER-ACCEPTED/CLOSED** on iPhone 2026-10-16. R4-G remains queued after §10.14; preserve R4-F.
- **H4-A/B/C delivered; PENDING REVIEW.** Code commit `4e8add258285660a5cae8d4ce244b220f5882473`; exact-SHA Actions run [38953564452](https://github.com/dmoneyUK/three-kingdoms/actions/runs/38953564452) passed lint/build/fast, API, browser startup/room smoke, and deploy. Production `/` and `/api/health` smoke passed; Worker version `4018baeb-c3d9-498f-a345-00567ad4c4d1`. The two H4 Worker/D1 geometry specs are committed but were not run; the CI browser job covered only startup/room smoke. No H4 gameplay screenshots or geometry samples were captured, and no user acceptance is claimed.
- **Beauty B1 delivered; PENDING REVIEW.** Code commit `08cac0a50e81c82b76865ac0291394aba4491fb6`; exact-SHA Actions run [38954824311](https://github.com/dmoneyUK/three-kingdoms/actions/runs/38954824311) passed lint/build/fast, API, browser startup/room smoke (1 test), deploy and production smoke. Worker version `a6bd1b6e-996e-4622-984a-d666c19b8d96`. The existing Beauty browser scenario was updated but not run by this workflow; no local automated tests were run per user direction. No reviewer acceptance is claimed.
- Latest reviewed design source: remote `ux-v2` commit `08cac0a50e81c82b76865ac0291394aba4491fb6`, `docs/UX2-refine.md` blob `71f6bc6c8ea952e283d03d1db1b1e9f05d77f11d`. Re-read §10.14.1–§10.14.3; design criteria are unchanged. Preserve pre-existing untracked `HANDOVER 3.md`.

## Current bounded task

**UX2-10.14-UI4B-F-BEAUTY-PUBLIC-DRAW-01 — B2, central shared placement for Beauty's public event.** Design: §10.14.2–§10.14.3. Reuse H4's canonical central stage announcement owner and measured safe-band geometry for the proven non-card Beauty notice; remove only Beauty from the independent top-right toast path. Protect the local viewer's actual `.private-draw-stage` rectangle while keeping the public message in the nearest stable central band above it, with the specified gap; observers without the private draw use the same canonical band. Keep top Seats, timer, parked history, public activity chip, Guidance, Dock and Hand clear; preserve private card display and expose no drawn-card identity publicly. Do not change Beauty proof/rules or start B3 integration. Per user direction, do not run local automated tests; record exact CI/deploy status and mark B2 PENDING REVIEW, then proceed to B3 without waiting for human acceptance.
