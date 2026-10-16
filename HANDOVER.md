# Current Handover

Branch: `ux-v2`

## Latest results

- **UX2-U13-A and U13-B delivered; PENDING REVIEW.** U13-A is at `9d75811b424afc145074bee52c0fc9ada7e9e027` (Actions `38950208342` green). U13-B is at `488e991ac1b3ca1ab775882df860820466d3246e` after implementation `8f25da2` and assertion repairs `d0fb826` / `488e991` (Actions `38952156696` green; Worker `991f2898-6db9-4ca1-a8fe-83d547c152d4`). Standard browser coverage was startup/room smoke; their task-specific phone/multiviewer acceptance remains unverified.
- **R4-F USER-ACCEPTED/CLOSED** on iPhone 2026-10-16. R4-G remains queued after §10.14; preserve R4-F.
- **H4-A/B/C delivered; PENDING REVIEW.** Code commit `4e8add258285660a5cae8d4ce244b220f5882473`; exact-SHA Actions run [38953564452](https://github.com/dmoneyUK/three-kingdoms/actions/runs/38953564452) passed lint/build/fast, API, browser startup/room smoke, and deploy. Production `/` and `/api/health` smoke passed; Worker version `4018baeb-c3d9-498f-a345-00567ad4c4d1`. The two H4 Worker/D1 geometry specs are committed but were not run; the CI browser job covered only startup/room smoke. No H4 gameplay screenshots or geometry samples were captured, and no user acceptance is claimed.
- Latest reviewed design source: remote commit `22cc9c09ed22a2158236e832ee524e5f7dc20a94`, blob `d08c43f00b7ddeef3c139fb8ce5d1dd83c1a72b4`. H4 progress was added without changing its criteria. Preserve pre-existing untracked `HANDOVER 3.md`.

## Current bounded task

**UX2-10.14-UI4B-F-BEAUTY-PUBLIC-DRAW-01 — B1, prove and consolidate the public skill notice.** Design: §10.14.1–§10.14.3. Inspect the latest `diaoChanSkillNotices` / ACTIVATE / DRAWN projections and correlate only by server-proven root event and source identity. When the linked DRAWN proof exists, replace or merge the same activation notice immediately with “Diao Chan used Beauty and drew 1 card”; if only ACTIVATE is proven, show truthful provisional copy and upgrade that notice in place when DRAWN arrives. Keep declined/zero-card cases truthful, other notices queued normally, private drawn cards private, and add no server event or gameplay rule. This task is B1 only; B2 placement and B3 full integration remain subsequent slices. Per user direction, do not run local automated tests; report only checks and CI actually observed. Mark B1 PENDING REVIEW after delivery, then continue with B2 without waiting for human acceptance.
