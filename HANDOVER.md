# HANDOVER — Current Task Only

Repository: `dmoneyUK/three-kingdoms` · target branch: `ux-v2`

Task: `CONSOLE-01 — Card tap-to-deselect and End Turn confirmation`

Design reviewed: `docs/UX2-refine.md` from `origin/ux-v2` `77879be2b5e114dcc9c9f2e3e87994d86579f61b`; canonical work index reconciled 2026-11-01 00:01 UTC. The design index had no active Table A item; this bounded change is authorized by the owner's direct task instruction. The main checkout's pre-existing unrelated changes remain untouched.

## Current status

**CI REPAIR IN PROGRESS — PENDING OWNER iPHONE REVIEW.** The implementation is pushed, but Actions for its exact SHA failed one fast source-shape assertion; deployment was skipped. Do not mark USER-ACCEPTED.

Hand-card selection remains local and uses the existing toggle. Its accessible name now says `Select [card]` or `Deselect [card]` as appropriate. End Turn retains existing `CurrentAction` visibility and legality; tapping it asks `End your turn?`, Cancel sends no action, and affirmative confirmation submits only the existing `end_turn` action.

## Execution record

- **2026-11-01, earlier in this execution session (exact command start times were not captured):** Added the accessible select/deselect state and confirmation guard in `app/page.tsx`; added focused unit/mobile-browser coverage and a shared Playwright dialog helper. Updated existing browser cases that click End so they explicitly accept the new confirmation.
- **Focused unit test:** Initial run failed because its room fixture did not include authoritative `end_turn` in `currentAction.legalActions`. Corrected the fixture; final focused run passed **2/2**. The test also verifies that retapping clears selection without submitting `play_card`, Cancel submits no `end_turn`, and affirmative confirmation submits once.
- **Build/browser startup:** First mobile browser launch could not start because generated `dist/server/wrangler.json` was absent. `npm run build` passed, generating the browser runtime configuration; the focused mobile test then passed **1/1** at 390×844 with touch. Combined local UI/browser test time stayed under five minutes.
- **Targeted ESLint:** Passed with 0 errors and 2 existing hook-dependency warnings in `app/page.tsx` (lines 8470 and 8692 at validation time). Build emitted existing large-chunk and API-classification warnings.
- **2026-11-01 00:29 UTC:** Rechecked `origin/ux-v2` at `77879be2`; no active Actions run. Latest code-triggered Actions observed before this task: [run 41236301619](https://github.com/dmoneyUK/three-kingdoms/actions/runs/41236301619), success for `ac7fd80f01b306ca15c5985f8b1f60a0e24f4cda`. This is baseline health evidence only, not validation for this task's future SHA.
- **2026-11-01 00:29 UTC:** Reset the focused unit test's mocked `window.confirm` after completion and replaced this file with the current task only. `git diff --check`, commit, push, exact-SHA CI, deployment and production health verification are still pending.
- **2026-11-01 00:30–00:32 UTC:** Pushed implementation SHA `05efe5542dc94fa67e86788305670889f75651ac`. Exact-SHA [Actions run 41257001700](https://github.com/dmoneyUK/three-kingdoms/actions/runs/41257001700) completed **failure**: Browser smoke, API, lint and build passed; `test:fast` failed one stale source-shape assertion in `tests/room-safety-render.test.mjs:706`, which expected `aria-pressed` to precede sibling controls in source. Deployment was skipped. The implementation had placed its new `aria-label` before `aria-pressed`; the correction reorders these attributes without changing behavior.
- **2026-11-01 00:32 UTC:** Corrected the source order and reran only the failed focused room-safety test; **1/1 passed**. No additional UI test was run. `git diff --check`, corrective commit and push are pending; then wait for exact-SHA CI/deploy and verify Worker health.

## Resume point / acceptance boundary

Commit and push the isolated CI correction with this handoff update. Wait for that exact SHA's Actions and deployment, verify Worker health, and record the observed SHA/run/Worker version here. Owner iPhone review remains required; do not start another task or claim acceptance.
