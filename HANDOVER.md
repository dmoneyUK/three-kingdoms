# WTK UX2 — Current Handoff

Branch: `ux-v2`

Latest reviewed design: `docs/UX2-refine.md`, blob `0055a96125183dcffe510db9cbcb2c9d4f8c9f09`; N3 progress marker only, with requirements unchanged. The user is reviewing §8.7 by phone. No user/reviewer acceptance is recorded.

## Latest result

- §9.5 N2 delivered in `8223bd24f313cfbec64e311a11caeb24abe898a4`. Focused Presentation/Snapshot/Client tests: 128/128; Worker/D1 API: 40/40; `npm run build`: passed; real-browser Worker/D1 Duel 4/6/8-seat, Group-target and single-target history regressions: passed.
- Exact-SHA Actions run [`38627866006`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/38627866006): API tests, lint/fast, browser smoke and deploy all passed. Production `/api/health`: HTTP 200, `{"ok":true,"worker":"available"}`.
- §9.5 N3 Worker/D1 browser regression passed all 3 scenarios at 390×844, 440×894 and 480×900. Public action response → first full-size CardFace measured 40.8ms/34.6ms for early winner/counter at 390px, 22.7ms at 440px, and 24ms at 480px; the 440px reveal stayed 90×135 at 3.5s. Deadline actions started +1.8ms/+1.7ms after 8s and returned in 14.7ms/20.5ms. No post-commit queue/read/poll delay reproduced; no production source edit was justified.
- N3 local validation: `node --check tests/browser/negation-immediate-public-reveal-real-gameplay.spec.mjs`; `npx playwright test --config tests/browser/playwright.config.mjs tests/browser/negation-immediate-public-reveal-real-gameplay.spec.mjs --workers=1` — 3/3 passed against local Worker/D1. Exact current remote head `f181e5813f6f2d80fe42d3ecae110ea22df3f4ac` has no status check; latest relevant push run `38627866006` on N2 SHA passed all four jobs. N3 source/browser test push CI and deployment are pending.
- §9.5 N0–N3 reviewer acceptance and §8.7/§10.5.3 phone acceptance remain distinct; user/reviewer acceptance is pending.

## Current task — Finish UX2 §9.5 N3 delivery, then wait for acceptance

Only `tests/browser/negation-immediate-public-reveal-real-gameplay.spec.mjs` is locally new. The live Worker/D1 measurements did not reproduce a post-commit delay, so do not invent a production code change. Before committing, stage only this regression and the N3 progress/handoff updates; then push, record exact-SHA Actions jobs and deployment health, update these progress records with the observed result, and stop for the user's §8.7 plus §9.5/§10.5.3 acceptance. Do not start §10.2–§10.4 or §11 UX3 before that acceptance gate.
