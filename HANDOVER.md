# Current Handover

Branch: `ux-v2`

## Latest results

- **UX2-U13-A and U13-B delivered; PENDING REVIEW.** U13-A is at `9d75811b424afc145074bee52c0fc9ada7e9e027` (Actions `38950208342` green). U13-B is at `488e991ac1b3ca1ab775882df860820466d3246e` after implementation `8f25da2` and assertion repairs `d0fb826` / `488e991` (Actions `38952156696` green; Worker `991f2898-6db9-4ca1-a8fe-83d547c152d4`). Standard browser coverage was startup/room smoke; their task-specific phone/multiviewer acceptance remains unverified.
- **R4-F USER-ACCEPTED/CLOSED** on iPhone 2026-10-16. R4-G remains queued after §10.14; preserve R4-F.
- **H4-A/B/C delivered; PENDING REVIEW.** Code commit `4e8add258285660a5cae8d4ce244b220f5882473`; exact-SHA Actions run [38953564452](https://github.com/dmoneyUK/three-kingdoms/actions/runs/38953564452) passed lint/build/fast, API, browser startup/room smoke, and deploy. Production `/` and `/api/health` smoke passed; Worker version `4018baeb-c3d9-498f-a345-00567ad4c4d1`. The two H4 Worker/D1 geometry specs are committed but were not run; the CI browser job covered only startup/room smoke. No H4 gameplay screenshots or geometry samples were captured, and no user acceptance is claimed.
- Latest reviewed design source: remote `ux-v2` commit `826e04ba0848a986343dc69f62f95a51e3b318b0`, `docs/UX2-refine.md` blob `71f6bc6c8ea952e283d03d1db1b1e9f05d77f11d`. Re-read §10.14.1–§10.14.3; design criteria are unchanged. Preserve pre-existing untracked `HANDOVER 3.md`.

## Current bounded task

**UX2-10.14-UI4B-F-BEAUTY-PUBLIC-DRAW-01 — B1, prove and consolidate the public skill notice.** Design: §10.14.1–§10.14.3. Implementation is in the working tree: correlate ACTIVATE/DRAWN only through validated `diaoChanSkillNotices` with exact root/source; coalesce both proofs into one stable notice ID, immediately upgrade an already queued activation on delayed DRAWN, keep the same ARIA-live node, and expose public proof IDs for manual review. Copy resolves the public Diao Chan player via proven `sourceId`; no drawn card identity enters the notice. Only `git diff --check` has been run; no local automated tests were run per user direction. Commit and exact-SHA CI are pending. After CI, record B1 PENDING REVIEW and continue to B2 without waiting for human acceptance.
