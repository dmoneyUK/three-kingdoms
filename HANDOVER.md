# WTK UX2 — Current Handoff

Branch: `ux-v2`

## Latest result

Reviewed latest design blob `cd044dd794eb81e7564d1ff035d0f74088b3dbd6`; comparison with recorded blob found only an L4 progress entry, with no changed design requirements. L4 implementation commit `5a8e6fc98ddfc63a60bdf44483c3798cfb9dea1e` was pushed. Exact-SHA runs [38767688870](https://github.com/dmoneyUK/three-kingdoms/actions/runs/38767688870) and [38768636155](https://github.com/dmoneyUK/three-kingdoms/actions/runs/38768636155) found, in sequence, an unused type import and `react-hooks/set-state-in-effect`; commit `29e55bbb34ba72d6c6aeb5341c0d7732d6e5fab1` removed the import and made LUST settlement expiry timer-driven. On exact-SHA run [38769687733](https://github.com/dmoneyUK/three-kingdoms/actions/runs/38769687733), lint/build, API and browser smoke passed, but fast tests found the new `lustDuelExchange: null` projection missing from a deep-equality expectation in `tests/presentation-client.test.mjs`; deploy was skipped. The repository TSX runner reproduced 60/61 before correction; after adding the exact expected field the file passes 61/61. The focused LUST lint and authenticated Worker/D1 browser regression also pass locally; exact-SHA validation/deployment for this regression repair remains pending.

Measured parked CardFace rectangles from the real browser run: LUST cost at `(338.3,124)`, first Attack at `(14,529)`, second Attack at `(53.7,124)`, each `48×72`; all three remained in place during settlement. Screenshots and the attached geometry record are in `tests/browser/test-results/browser/hero-active-skills-real-ga-4cfe6-istory-at-true-author-Seats/`.

## Current task

**L4 CI repair only.** Keep the CHOICE adapter deep-equality expectation synchronized with the public projection by asserting `lustDuelExchange: null`. The two earlier CI findings are repaired in `29e55bbb34ba72d6c6aeb5341c0d7732d6e5fab1`; run `38769687733` passed lint/build, API and browser smoke but exposed this exact fast-test expectation, so deploy was skipped. `node --import tsx --test tests/presentation-client.test.mjs` now passes 61/61 after reproducing 60/61 before the correction. Commit/push only this test and handoff/progress update; verify the new exact-SHA CI and deployment. Do not start L5 until L4 CI/deployment is verified.

**Stop/status:** L4 remains **PENDING REVIEW**; no Reviewer acceptance is claimed. After the repair SHA succeeds and deploys, record the exact result, re-read current §10.12.5, then continue with L5 only. Do not implement unrelated queued UX tasks.
