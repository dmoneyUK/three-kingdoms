# Smart Bot Player — Coding Agent Handover

Branch: `review/aip-perf-bot-02` (non-deploying). Latest design reviewed from `origin/feature/smart-bot-player`: **AIP-D48 / §0C**. The bounded Track G task is **AIP-G-LOCAL-01**. This handover is **PENDING_REVIEW**; the agent does not self-accept it.

## AIP-G-LOCAL-01 — **PENDING_REVIEW**

Implemented only the approved terminal-commit correctness fixes and the reusable local normal-match driver, within the two substantive source-commit budget:

- Terminal Bot proofs are correlation-checked, terminal proofs cannot be downgraded, checkpoint proofs are recorded before continuation, and terminal settlement/victory logging use positive guarded CAS results so duplicate terminal writes do not produce a second proof or victory log.
- Added a test-only local `/__test/run-bot-step` compact-outcome adapter, preserving the existing capability gate; no public runtime route or game-rule/UI/schema change was made.
- Added a real local Worker/D1 normal-match driver using ordinary `create`, three `add_bot`, `start`, `choose_hero`, projected legal human actions, and genuine `runBotScheduler({ maxStepsPerWakeup: 4 })` wakes. It uses no SQL mutation, test-player/seed shortcut, fake clock/RNG, or retry loop; summaries are sanitized and typed.
- Added terminal proof and projected `target_card` regressions and registered the driver in the API suite.

## Evidence

Substantive source commits (both pushed to this review branch):

- `ed427de5d446712526244fd7c8863297d9b1539e` — terminal proof/settlement correctness and initial normal-match driver.
- `82c2fbade4a0467e51950b9f4a87a8765f81a086` — projected target-card choices and private-view fixture correction.

Exact GitHub Actions run **46007750258** has `headSha=82c2fbade4a0467e51950b9f4a87a8765f81a086` and concluded **success**: Lint and fast tests, API tests, and Browser startup/H4 smoke all passed. The `deploy` and `Deploy isolated AI Staging Worker` jobs were **SKIPPED**; no Staging or Production deployment/activation occurred.

Focused local checks passed: `node --check` for the new driver/tests/suite, targeted ESLint for all changed files, `node --import tsx --test tests/bot-outcome.test.mjs` (**5/5**), and `git diff --check`. A standalone `tsc --noEmit` remains a pre-existing repository baseline failure and is not claimed as passing.

The CI normal-match driver executed against real local Worker/D1 and returned this sanitized result:

```json
{"status":"NO_PROGRESS","turns":0,"iterations":60,"scheduler":{"consumed":82,"stale":0,"failed":0,"unsupported":0,"waitingForHuman":0,"steps":82},"pending":"none","actionKind":"none","winner":null,"invariants":{"genuineBots":true,"privateIsolation":true,"independentReread":true,"publicPhysicalTransitionIntegrity":true}}
```

This is an incomplete bounded run, not proof of a finished normal game and not an acceptance result. It does prove that the driver reached genuine Bot scheduler work while preserving the reported privacy/re-read/physical-card invariants; the zero-turn `NO_PROGRESS` outcome remains for independent review.

## Boundaries and next task

No Hosted validation, S1/S2/S3 work, BOT-02 optimization, GET-02, PLAY, UX2/UX3 work, branch merge, Cloudflare resource/migration change, or production operation was started. The next and only task is: **AI Planner/PM Reviewer independently inspect the terminal proof changes and the incomplete normal-driver result; Owner review is required. Do not start another roadmap task or mark ACCEPTED.**
