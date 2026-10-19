# Current Handover

Working branch: `codex/bcp1-r1-20261019`, based on `origin/ux-v2`. The primary checkout and its unrelated uncommitted work remain untouched.

## Latest result

- Re-reviewed the latest BCP-1 feedback in `docs/UX2-refine.md` §10.17.1.1–§10.17.1.2, including the 2026-10-19 phone rejection recorded in `fa957ee`. Bumper Harvest remains **NOT USER-ACCEPTED**.
- Implemented the current BCP-1 mobile corrections: public root and committed response cards keep distinct landing cells beside their real author (including multiple cards by one author); viewer switches hide stale-layout frames and settle the same card/event at the new view; Inspector, card Details, Info, and legal controls remain accessible above/readable beside the public pool; four-card card titles fit without shrinking the accepted card face or moving Info. `Overindulgence` uses a visible discretionary hyphen only in the compact Harvest choice face; action and Info labels retain the canonical card name. No game rules, privacy, timers, H4 geometry, or INS-5 layout changed.
- `npm run build` passed. Focused Worker/D1 mobile suite `tests/browser/bumper-harvest-touch-pass-through-real-gameplay.spec.mjs`: **7 passed**, including same-author root + Negation, four-viewer TEST SWITCH, Inspector/Info/touch checks, and 1–8 card pools at phone sizes. Focused ESLint: 0 errors, 15 warnings. `git diff --check` passed.
- Implementation commit `6804ba79eb994639df14f1afa188978f2766c0b9` is pushed to `ux-v2`. Exact-SHA Actions run [`39253408830`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39253408830) passed Browser smoke, Lint/fast, API tests, deployment, and production smoke. Worker version: `242263bb-0bfe-4f0a-83b5-7aebf56d9c39`. Production `/` and `/api/health` smoke passed; the workflow smoke is not an authenticated Harvest gameplay test.
- The separate P1 phase-guidance hierarchy has not been redesigned: §10.17.1.1 requires a separately reviewable design/mockup for copy/layout changes outside the accepted H4 geometry. Keep Bumper Harvest **NOT USER-ACCEPTED** until any required design decision and the real-phone re-review are complete.

## Exactly one active task

**BCP-1 — obtain real-phone re-review of deployed Worker `242263bb-0bfe-4f0a-83b5-7aebf56d9c39`, then resolve the still-open P1 phase-guidance hierarchy only through a separately reviewable phone-sized design/mockup.** Implementation is **PENDING USER REVIEW**, not accepted. Preserve accepted H4/INS-5, Plan A, public card identities, 4s/380ms motion, 8s Negation, 60s Harvest, server authority, and privacy.
