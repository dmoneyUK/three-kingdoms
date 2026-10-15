# WTK UX2 — Current Handoff

Branch: `ux-v2`

Latest reviewed design: `docs/UX2-refine.md` blob `b3b30952be4907284f6b22514e92b69f0b00e52f`. After R4, the remote design was reread through §11. §8.7 allows interruption only by a newly committed, publicly proven response; §9 retains the all-living-seats explicit Negation/Pass rule and immutable 8-second maximum. §§8.1–8.5 and §10.5.3 remain closed. §10.8 H1 → H2 → H3 is next; H2 places Hero name on portrait, actual player name below, HP upper-right, and public Equipment below that strip. H3 requires short, proof-backed announcements. §11 UX3 remains out of scope.

## Latest result

H1 implementation is pushed as `727b5dabb06889ec6ec6df3079b429518d52c85b`. Exact-SHA Actions run [38665214118](https://github.com/dmoneyUK/three-kingdoms/actions/runs/38665214118): browser startup/room smoke and API passed; Lint and fast tests failed in ESLint, so build and deploy were skipped. The two H1 lint findings are being corrected: keyboard focus on the scrollable skill region, and room/viewer-change cleanup that synchronously set state in an effect. The focused `room-safety-render` file passed 19/19; isolated ESLint for the corrected patterns passed. Whole-file local ESLint could not complete because Node 24/26 exhausted available heap. H1 is not complete or deployed yet.

## Current task — §10.8.1 H1 CI repair and delivery

Finish the two lint corrections in `app/page.tsx`, push the isolated repair, and wait for exact-SHA CI plus deployment. The H1 panel remains pending human visual review; no acceptance is claimed. Once CI/deploy succeeds, update only factual H1 progress in the design, then reread the newest remote design from §8 onward before selecting the next single task. Do not start UX3 or broaden H1.
