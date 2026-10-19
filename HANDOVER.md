# Current Handover

Working branch: `codex/bcp1-r1-20261019`, based on `origin/ux-v2`. The primary checkout and its unrelated uncommitted work remain untouched.

## Latest result

- Re-reviewed the latest BCP-1 feedback in `docs/UX2-refine.md` §10.17.1.1–§10.17.1.2, including the 2026-10-19 phone rejection recorded in `fa957ee`. Bumper Harvest remains **NOT USER-ACCEPTED**.
- Implemented the current BCP-1 mobile corrections: public root and committed response cards keep distinct landing cells beside their real author (including multiple cards by one author); viewer switches hide stale-layout frames and settle the same card/event at the new view; Inspector, card Details, Info, and legal controls remain accessible above/readable beside the public pool; four-card card titles fit without shrinking the accepted card face or moving Info. `Overindulgence` uses a visible discretionary hyphen only in the compact Harvest choice face; action and Info labels retain the canonical card name. No game rules, privacy, timers, H4 geometry, or INS-5 layout changed.
- `npm run build` passed. Focused Worker/D1 mobile suite `tests/browser/bumper-harvest-touch-pass-through-real-gameplay.spec.mjs`: **7 passed**, including same-author root + Negation, four-viewer TEST SWITCH, Inspector/Info/touch checks, and 1–8 card pools at phone sizes. Focused ESLint: 0 errors, 15 warnings. `git diff --check` passed.
- Changes are local and not yet committed/deployed. Latest code-bearing `ux-v2` Actions run is exact SHA `c74cefc27cd4c4d53094eb07af68ca33244af20c`, run `39246431786` (success); current remote `ux-v2` tip `67d5f1c50087397050b9c85a01afc0384da262ac` is a handover-only commit excluded by workflow path filters. No CI/deployment result exists yet for these changes.
- The separate P1 phase-guidance hierarchy has not been redesigned: §10.17.1.1 requires a separately reviewable design/mockup for copy/layout changes outside the accepted H4 geometry. Keep Bumper Harvest **NOT USER-ACCEPTED** until any required design decision and the real-phone re-review are complete.

## Exactly one active task

**BCP-1 — commit and push these scoped mobile corrections to `ux-v2`, verify exact-SHA Actions/deployment and record the deployed Worker, then obtain real-phone re-review. Mark implementation PENDING USER REVIEW; never mark it accepted.** Preserve accepted H4/INS-5, Plan A, public card identities, 4s/380ms motion, 8s Negation, 60s Harvest, server authority, and privacy.
