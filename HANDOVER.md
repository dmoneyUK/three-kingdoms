# WTK UI / Layout — Current Task Handoff

## REMOTE HANDOVER RULE
HANDOVER.md is the single current task/execution file. Work only on branch `ux-v2`.

Agent sequence:
1. `git fetch origin`
2. checkout/pull `ux-v2`
3. read the current remote `HANDOVER.md`
4. implement only the task below
5. run the required validation
6. append the execution result to this HANDOVER
7. commit and push implementation + HANDOVER to `origin/ux-v2`
8. `git fetch origin`
9. verify `origin/ux-v2:HANDOVER.md` contains the execution result
10. STOP

Read `docs/PLANNER_DEVELOPMENT_WORKFLOW.md` before implementation.

## Reviewer status — Zhang Liao Assault is fixed in source but not deployed

The user reports that Zhang Liao's Assault still behaves incorrectly in the live game.

Repository review shows that the prior Assault UI fix is present on `ux-v2` in commit
`fe5ab574a0f896e7807c8cb221236dc3cbc12642` and remains in the current branch history.
That fix already covers the reported local interaction failure:
- selecting 1 or 2 legal Assault targets;
- an enabled Confirm surface;
- repeated Assault button clicks not clearing the selection;
- explicit Cancel and reactivation;
- exact multi-target payload `{ providerId: "zhang_liao_assault", targetIds }`;
- a real Worker/D1 Draw Phase fixture and Playwright browser regression.

The current live symptom is explained by deployment failure, not by evidence that the
server Assault rule regressed.

### Verified deployment blocker

Two consecutive `ux-v2` workflow runs that contain the Assault fix failed before deploy:

- run 583, head `e34708dc615fbfd80001f27fd74dd4b8c0f03b95`;
- run 584, head `6d14864de7cff3a48c40404627a71619867021de`.

Both fail in `npm run test:browser` before `npm test`/build and before the deploy job.
The browser Worker server tries to open:

`dist/server/wrangler.json`

but a clean GitHub Actions checkout has not run `npm run build` yet, so the file does not
exist. The observed CI error is:

`ENOENT: no such file or directory ... dist/server/wrangler.json`

The last successful `ux-v2` deployment was run 582 at
`474e2f15c1dd6f44a2a11bcc58d3c33083582a99`, which predates the Assault fix.
Therefore the production screenshot can still show the old broken Assault UI even though
the corrected source exists on `ux-v2`.

# NEXT TASK — BUG-ZHANG-LIAO-ASSAULT-02: Unblock CI and deploy the existing Assault fix

## Objective

Make the already-reviewed Zhang Liao Assault fix actually reach production.

This is primarily a CI/deployment-order bug. Do **not** redesign Assault gameplay or its
selection UX unless the current `ux-v2` code still fails the existing real browser/API
regressions after the build-order problem is corrected.

## Existing accepted truth

Preserve these accepted Assault contracts:

- Zhang Liao Assault is a Draw Phase optional trigger.
- It replaces the normal deck draw.
- It may select 1 or 2 eligible other characters.
- Each selected character contributes one server-random hidden Hand card.
- Empty-hand characters are not legal targets.
- The client uses projected target legality only; it must not inspect private opponent Hand cards.
- The semantic action remains generic `trigger` with provider
  `zhang_liao_assault`.
- One target and two targets are both valid.
- Repeated clicking of the already-active Assault skill is not a second Cancel surface.
- Explicit Cancel is local-only and emits no gameplay action.
- Server action revision / stale-action checks remain authoritative.

Do not change `game/capabilities/heroes/zhang-liao-assault.ts` unless a failing
current regression proves an actual gameplay defect.

## Root-cause contract

The clean-checkout CI sequence currently runs:

1. `npm ci`
2. `npm run lint`
3. install Chromium
4. `npm run test:browser`
5. `npm test`

But `tests/browser/worker-server.mjs` starts Wrangler with
`dist/server/wrangler.json`, which is created by `npm run build`.
Therefore step 4 cannot succeed from a clean checkout.

The fix must ensure the build artifact exists **before** Playwright starts its Worker
webServer.

## Required implementation

### 1. Repair the workflow order with the smallest change

Preferred implementation:

- edit `.github/workflows/deploy.yml`;
- add an explicit `npm run build` step after Chromium installation and before
  `npm run test:browser`.

Keep the existing browser harness unchanged unless this build step still fails to produce
the expected `dist/server/wrangler.json`.

Do not weaken or skip `npm run test:browser`.

Do not mark the browser test as continue-on-error.

Do not remove the deploy dependency on `build-and-test`.

A second build later via `npm test` is acceptable for this bounded fix. Do not broaden
the task into CI optimization unless required for correctness.

### 2. Re-run the actual Zhang Liao browser regression after build

From a clean-enough working tree, run:

`npm run build`

then:

`npx playwright test tests/browser/zhang-liao-assault.spec.mjs --config tests/browser/playwright.config.mjs`

The test must pass the real Worker/D1 Draw Phase path and prove at minimum:
- Assault control visible/enabled;
- target 1 selectable;
- target 2 selectable;
- Confirm visible/enabled after selecting two targets;
- repeated Assault click preserves selection;
- explicit Cancel sends no `trigger` / `decline_trigger`;
- reactivation works;
- submitted payload uses `providerId: "zhang_liao_assault"` and the expected target IDs.

If this existing test fails after build, diagnose the actual current branch behavior and
make only the smallest Assault-specific correction needed. Add/adjust regression coverage
for the exact failure. Do not guess from the screenshot alone.

### 3. Preserve the current VIS-01 implementation

The current branch also contains the completed VIS-01 top-row CSS work. This task must not
revert or redesign it.

Do not change:
- opponent seat topology/layout;
- Interaction Stage;
- Hero Focus;
- local dock composition;
- unrelated CSS.

### 4. Push and require a successful deploy of the exact fixed head

After local validation:
1. append the execution result to HANDOVER;
2. commit implementation + HANDOVER;
3. push to `origin/ux-v2`;
4. identify the GitHub Actions `Deploy to Cloudflare` run whose `head_sha` equals the
   pushed implementation/HANDOVER head;
5. wait for that run to finish;
6. verify both `build-and-test` and `deploy` conclude `success`.

Do not report production fixed if the workflow is still running, failed, cancelled, or
the deploy job was skipped.

If the workflow fails, append the exact failing step/error to HANDOVER and STOP. Do not
silently work around CI with a manual Cloudflare deploy.

## Validation

Run and report actual results for:

- `npm run build`
- `npx playwright test tests/browser/zhang-liao-assault.spec.mjs --config tests/browser/playwright.config.mjs`
- `npm run test:browser`
- `npm run test:fast`
- `npm run test:api`
- `npm run lint`
- `git diff --check`

Then report the GitHub Actions run:
- run ID;
- head SHA;
- `build-and-test` result;
- `deploy` result;
- production smoke-test result from the workflow.

Report exact test counts where the runner provides them. Do not claim unrun checks passed.

## Scope exclusions

Do not:
- rewrite Assault server logic without a reproduced failure on current `ux-v2`;
- change Assault to inspect/choose specific opponent Hand cards;
- add hero-specific HTTP endpoints;
- bypass `currentAction` / generic `trigger`;
- weaken stale/replay rejection;
- skip browser tests to force deployment;
- manually deploy outside GitHub Actions;
- start a new visual/layout task;
- modify `main`.

## Execution result

Append only the BUG-ZHANG-LIAO-ASSAULT-02 execution result:
- full implementation SHA;
- files changed;
- exact CI ordering change;
- Zhang Liao focused browser result;
- full validation commands/results;
- workflow run ID/head SHA;
- `build-and-test` conclusion;
- `deploy` conclusion;
- whether production smoke passed;
- any remaining Assault symptom after the successful deploy.

Do not declare the bug accepted/closed. The Planner/Reviewer will review the pushed result.

## Acceptance

This task passes only if:
- a clean GitHub Actions checkout builds before Playwright needs
  `dist/server/wrangler.json`;
- the real Zhang Liao Assault browser regression passes;
- the exact pushed `ux-v2` head containing `fe5ab...` and the CI fix completes
  `build-and-test` successfully;
- the Cloudflare deploy job for that same head succeeds;
- no Assault gameplay/server semantics are changed without a reproduced failing regression;
- no unrelated visual/gameplay scope is modified.
