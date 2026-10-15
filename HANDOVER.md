# WTK UX2 — Current Handoff

Branch: `ux-v2`

## Latest result

Reviewed latest design blob `cd044dd794eb81e7564d1ff035d0f74088b3dbd6`; comparison with recorded blob found only an L4 progress entry, with no changed design requirements. L4 implementation commit `5a8e6fc98ddfc63a60bdf44483c3798cfb9dea1e` was pushed. Exact-SHA run [38767688870](https://github.com/dmoneyUK/three-kingdoms/actions/runs/38767688870) found an unused import; repair commit `0b5a022a035383e94438154a6d21cf7c547d111b` removed it. Exact-SHA run [38768636155](https://github.com/dmoneyUK/three-kingdoms/actions/runs/38768636155) then exposed `react-hooks/set-state-in-effect` at `app/public-card-display.tsx:2212`; API and browser smoke passed, Lint and fast tests failed, deploy was skipped. The CI-repair patch now makes settlement expiry timer-driven and treats a server-projected zero remaining time as expired during render. Focused rule lint and the L4 authenticated Worker/D1 browser regression pass locally. Full local ESLint has exhausted Node's heap and is not claimed as passing.

Measured parked CardFace rectangles from the real browser run: LUST cost at `(338.3,124)`, first Attack at `(14,529)`, second Attack at `(53.7,124)`, each `48×72`; all three remained in place during settlement. Screenshots and the attached geometry record are in `tests/browser/test-results/browser/hero-active-skills-real-ga-4cfe6-istory-at-true-author-Seats/`.

## Current task

**L4 CI repair only.** Fix the synchronous state reset in the LUST settlement timer effect identified by run `38768636155`, preserving the server-bounded two-second history window. The unused import from the previous run is already removed. Focused local validation: `react-hooks/set-state-in-effect` on `app/public-card-display.tsx` passed; authenticated Worker/D1 test `real Lust Duel keeps one cost root and appends committed Attack history at true author Seats` passed at 440×894. Commit/push only after reviewing the staged repair and handoff, then verify exact-SHA CI and deployment. Do not start L5 until L4 CI/deployment is verified.

**Stop/status:** L4 remains **PENDING REVIEW**; no Reviewer acceptance is claimed. After the repair SHA succeeds and deploys, record the exact result, re-read current §10.12.5, then continue with L5 only. Do not implement unrelated queued UX tasks.
