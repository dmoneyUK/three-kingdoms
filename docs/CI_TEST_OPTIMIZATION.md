# CI and Test-Suite Optimization Plan

Status: **Execution reference for a dedicated optimization agent**  
Target branch: `ux-v2`  
Primary goal: **Reduce CI wall-clock time substantially without weakening regression coverage, privacy guarantees, or gameplay validation.**

This document is intentionally separate from `HANDOVER.md`. It is a focused execution plan for an agent working only on CI/test performance. Do not modify `HANDOVER.md` as part of this work unless the reviewer explicitly asks for that in a separate instruction.

---

## 1. Problem statement

The repository now has a large browser-regression suite. CI is approaching roughly ten minutes from push to completion, which is too slow for the current UX2 iteration loop.

The problem is not simply "too many tests". There are three distinct causes:

1. CI currently serializes work that can safely run in parallel.
2. The workflow performs a duplicate production build.
3. Browser regression coverage has grown substantially, including a large legacy matrix in `tests/browser/ui19.spec.mjs` plus newer feature-specific specs that may overlap older coverage.

The first optimization phase must preserve the complete existing test suite and only improve orchestration. Test removal/deduplication is a later, evidence-based phase.

---

## 2. Current repository facts

At the time this plan was written:

- Workflow: `.github/workflows/deploy.yml`
- Browser runner: Playwright
- Browser config: `tests/browser/playwright.config.mjs`
- Browser tests use:
  - `fullyParallel: true`
  - CI workers: `2`
  - Chromium only
  - two local web servers:
    - Vite fixture server
    - Wrangler Worker server
- Fast test entry point: `tests/run-fast-tests.mjs`
- API suite entry point: `tests/run-api-suite.mjs`
- API suite already runs four parallel shards internally.
- `npm test` currently expands to:
  - `npm run build`
  - `npm run test:fast`
  - `npm run test:api`
- The workflow already runs `npm run build` before `npm run test:browser`, and then later runs `npm test`, causing a second build.

Do not assume these facts remain unchanged. Re-read the current branch before editing.

---

## 3. Measured baseline

Use GitHub Actions logs to capture a fresh baseline before making changes.

Historical evidence from a successful run showed approximately:

| Stage | Historical duration |
| --- | ---: |
| npm ci | ~8s |
| lint | ~23s |
| Playwright/Chromium install | ~22s |
| production build | ~7s |
| browser suite: 461 tests, 2 workers | ~4.3 min |
| repeated build inside npm test | ~7s |
| fast tests: 203 tests | ~6.5s |
| API suite: 4 shards | ~80.9s |

A later run was observed starting:

```text
Running 665 tests using 2 workers
```

The browser suite is therefore the dominant and growing critical path.

Historical browser distribution also showed that `tests/browser/ui19.spec.mjs` accounted for 398 of 461 browser tests in one successful run. That is historical evidence, not a current count; re-measure the current suite before making deduplication decisions.

### Required baseline capture

Before changing CI:

1. Identify a recent successful `ux-v2` run.
2. Record:
   - total workflow duration;
   - build-and-test job duration;
   - deploy duration;
   - npm ci duration;
   - lint duration;
   - Chromium install duration;
   - build duration;
   - browser test count and duration;
   - fast test count and duration;
   - API duration and per-shard duration.
3. Record the current number of browser tests.
4. Record the current number of fast tests.
5. Record the current API test count if the runner can report it correctly.
6. Save the before/after numbers in the final commit message, PR description, or a short section added to this document.

Do not claim an optimization unless measured on GitHub Actions.

---

## 4. Non-negotiable constraints

The optimization must preserve the existing quality contract.

### 4.1 Do not weaken correctness

Do not:

- disable tests to make CI green;
- add broad `.skip`, `.fixme`, grep exclusions, or conditional early returns;
- remove browser viewports merely because they are slow;
- remove privacy/fail-closed assertions;
- change gameplay behavior to simplify tests;
- replace integration/API coverage with mocks solely for speed;
- reduce assertions inside tests without proving equivalent coverage elsewhere;
- turn off retries as the primary optimization;
- loosen geometry tolerances merely to make tests faster;
- remove the Worker-backed browser fixture where tests actually depend on Worker behavior.

### 4.2 Preserve authority boundaries

Test optimization must not change product architecture:

- `CurrentAction` remains the legality authority.
- Public presentation remains the public semantic authority.
- Hidden Hand privacy must remain tested.
- Stale/revision safety must remain tested.
- Browser tests must not infer semantics from DOM order just because a faster assertion is convenient.

### 4.3 Keep local developer commands useful

Do not break the existing local meaning of:

- `npm run build`
- `npm run test:fast`
- `npm run test:api`
- `npm run test:browser`
- `npm test`

It is acceptable for CI to call these scripts differently from local development.

---

## 5. Phase 1 — Optimize CI orchestration without removing any test

This phase is the highest priority and should be completed before deleting or consolidating test cases.

### 5.1 Remove the duplicate build

Current sequence effectively performs:

```text
build
browser
npm test
  -> build again
  -> fast
  -> api
```

Change CI so that the already-built state is not rebuilt solely because `npm test` wraps `test:all`.

For example, CI may call the scripts directly:

```text
npm run build
npm run test:fast
npm run test:api
```

Do not change local `npm test` semantics unless there is a separate reason.

Expected gain is modest (~one build, historically around seven seconds) but this is deterministic wasted work and should be removed.

### 5.2 Split independent validation into parallel GitHub jobs

The current single `build-and-test` job serializes independent work.

Create independent jobs with clear names, for example:

```text
lint-fast
api
browser
        \
         -> validation gate -> deploy
```

A recommended minimum structure is:

**Job A — lint-fast**
- checkout;
- setup Node with npm cache;
- npm ci;
- lint;
- build if required by rendered-html coverage;
- fast tests.

**Job B — api**
- checkout;
- setup Node with npm cache;
- npm ci;
- build;
- run API suite.

**Job C — browser**
- checkout;
- setup Node with npm cache;
- npm ci;
- install Chromium/dependencies;
- build;
- run browser suite.

`deploy` must depend on every required validation job.

If the fast suite needs the built SSR bundle to include `rendered-html.test.mjs`, preserve that behavior. Do not accidentally cause `rendered-html` to disappear because the fast job stopped building.

### 5.3 Two-way Playwright sharding

The browser suite is the dominant critical path.

Use Playwright's native sharding across two GitHub-hosted runners.

Recommended model:

```text
browser shard 1/2 — 2 Playwright workers
browser shard 2/2 — 2 Playwright workers
```

Each shard should run on an independent runner.

Keep `fullyParallel: true`.

Do not initially increase per-runner worker count above 2. Two independent runners with 2 workers each are preferred over one runner with 4 workers because:

- Chromium processes no longer compete for one runner's CPU/memory;
- Wrangler instances are isolated by runner;
- a heavy geometry/browser test cannot starve all workers on the same VM;
- shard timing is easier to inspect.

The existing `npm run test:browser` script can remain unchanged for local use. CI may append Playwright shard arguments.

The exact command should be validated against the installed Playwright version. A typical form is conceptually:

```text
npm run test:browser -- --shard=<current>/<total>
```

Do not invent a custom test partitioner when Playwright's native shard support is sufficient.

### 5.4 Matrix-job failure semantics

The browser matrix must fail the workflow if any shard fails.

Do not use `continue-on-error`.

Do not let deploy run after only one shard succeeds.

Deployment must wait for all browser matrix entries plus API and lint/fast validation.

### 5.5 Keep browser service ports isolated

Each browser shard runs on its own GitHub runner, so the existing ports can remain the same inside each runner:

- Vite: 4177
- Worker: 3137

Do not introduce dynamic port complexity unless there is a real collision on a single runner.

### 5.6 Preserve browser fixture behavior

The browser config currently starts:

- Vite fixture server;
- Worker server;
- local D1 setup/migration through the Worker server helper.

Sharding must not bypass these services.

A shard should be runnable independently on a clean runner.

### 5.7 Chromium installation

Do not spend the first phase redesigning browser installation.

The current install step costs roughly tens of seconds, but after browser sharding it occurs in parallel and is no longer the main bottleneck.

After Phase 1 is stable, optional follow-up experiments may include:

- caching Playwright browser binaries;
- using an image/environment where Chromium dependencies are already present;
- CI-only reporter changes.

Only keep such changes if measured benefit exceeds added complexity.

---

## 6. Phase 1 target architecture

A good target workflow is conceptually:

```text
push / PR
   |
   +--------------------+---------------------+
   |                    |                     |
lint-fast             api              browser matrix
   |                    |                /          \
   |                    |             shard 1/2   shard 2/2
   |                    |                \          /
   +--------------------+---------------------+
                        |
                    validation
                        |
              deploy (push only)
                        |
                 production smoke
```

The workflow does not need a literal "validation" no-op job if `deploy.needs` can directly reference all required jobs.

Prefer the simplest correct YAML.

---

## 7. Phase 1 expected performance

Do not treat these as guaranteed results; measure.

Reasonable target:

- browser shard wall time: approximately half of the unsharded browser runtime plus startup overhead;
- API no longer adds ~80 seconds after browser completion because it runs in parallel;
- lint no longer delays browser startup;
- duplicate build removed.

For the current suite size, a reasonable goal is:

- validation completion: roughly **4–5 minutes**;
- push-to-deploy completion: roughly **5–6 minutes**.

If actual results are worse, inspect shard balance and setup overhead rather than declaring success.

---

## 8. Fix test timing metrics

The current test timing parsers appear to expect an older Node test output format.

The runners look for text similar to:

```text
ℹ tests 203
```

but current Node output is closer to:

```text
# tests 203
```

This causes misleading summaries such as:

```text
Timing: fast tests=0
Timing: API tests=0
```

even though hundreds of tests ran.

### Required fix

Update timing/count parsing in:

- `tests/run-fast-tests.mjs`
- `tests/run-tests.mjs`
- `tests/run-api-suite.mjs`

so current Node 22 test output produces correct counts.

Prefer a parser that accepts both formats if easy:

```text
# tests N
ℹ tests N
```

Do not let metric parsing affect test pass/fail status.

### Required output

At the end of each suite, logs should report truthful values such as:

```text
Timing: fast tests=203, duration=6.56s, files=17
Timing: API tests=248, duration=..., files=24, shards=4
```

The exact counts may change as the repository evolves.

---

## 9. API shard review

The API suite already has four internal shards and is not the main CI bottleneck after parallel job orchestration.

Historical shard durations were approximately:

```text
shard 1 ~58s
shard 2 ~39s
shard 3 ~57s
shard 4 ~66s
```

This shows some imbalance.

### Allowed Phase 1.5 improvement

After timing parsing is fixed:

1. run the API suite several times;
2. collect per-file/per-test cost;
3. rebalance `shardGroups` in `tests/run-api-suite.mjs`;
4. aim for similar wall time among all four shards.

Do not increase shard count unless measured data justifies it.

Each API child currently pays its own Wrangler/D1 lifecycle cost. Too many shards can make total CPU/startup work worse without reducing the critical path.

A good goal is to bring all four shards near the same maximum duration.

---

## 10. Phase 2 — Browser coverage deduplication

Start this phase only after Phase 1 is merged/stable and measured.

Phase 2 may reduce the number of browser cases, but only where duplicate coverage is proven.

### 10.1 Primary review target: ui19.spec.mjs

`tests/browser/ui19.spec.mjs` is a large legacy matrix file.

At plan-writing time it is roughly:

- 220 KB;
- more than 3,000 lines;
- dozens of test declarations;
- many nested viewport/state/player-count matrices;
- multiple screenshots and geometry checks.

Historical Actions output showed it generating the majority of browser cases.

Since then the repository has also gained focused specs including examples such as:

- `active-current-effect.spec.mjs`
- `target-card-zone-picker.spec.mjs`
- `opponent-inspect-hero-focus.spec.mjs`
- `local-dock-hero-hierarchy.spec.mjs`
- `response-timer.spec.mjs`
- `private-draw-countdown-cluster.spec.mjs`
- `single-target-negation-*.spec.mjs`
- `ux2-final-visual-gate.spec.mjs`
- Hero-specific skill-control specs.

This creates a real risk that old broad VIS matrix coverage and newer dedicated coverage are testing the same contract repeatedly.

### 10.2 Do not delete by filename

Do not decide that `ui19.spec.mjs` is "old" and remove it wholesale.

Review at the semantic-contract level.

For every candidate case, answer:

1. What product invariant does this test protect?
2. Is that invariant tested elsewhere?
3. Is the same authoritative state used?
4. Is the same important viewport/breakpoint represented?
5. Is the same privacy/fail-closed behavior asserted?
6. Does the other test include equal or stronger assertions?
7. Is this case the only regression proof for a known bug?

Only then may a duplicate be removed or merged.

### 10.3 Create a coverage ownership table

Before deleting tests, create a temporary audit table in the optimization branch/work notes.

Suggested columns:

| Contract | Existing legacy case | Dedicated case | Viewports | Keep canonical | Remove/merge |
| --- | --- | --- | --- | --- | --- |
| Local Hand horizontal overflow | ui19... | local-dock-hero-hierarchy... | 390/480/etc | ... | ... |
| Opponent Inspect geometry | ui19... | opponent-inspect-hero-focus... | ... | ... | ... |
| Negation branch geometry | ui19... | single-target-negation... | ... | ... | ... |
| Response timer | ui19... | response-timer... | ... | ... | ... |

Do not commit this table if it becomes stale/noisy unless it is genuinely useful documentation.

### 10.4 Separate functional coverage from breakpoint coverage

A common duplication pattern is testing full functional behavior at every viewport.

Use this rule:

**Functional behavior**
- prove the state transition/submit payload/privacy once at a representative viewport unless layout changes the behavior.

**Responsive geometry**
- prove only the geometry-specific assertions at breakpoint representatives.

**Extreme boundary**
- use 320/360 only for components whose behavior actually changes or risks overflow there.

This avoids multiplying a complete behavioral flow by every width.

Example of an expensive matrix pattern:

```text
5 widths × 6 hand sizes = 30 complete browser tests
```

If the behavioral contract is identical and only overflow changes, consider a smaller deliberate matrix such as:

- one normal Hand size at representative mobile;
- one overflow Hand size at 390/480;
- one extreme large Hand at the narrowest supported boundary;
- one wide sanity check.

Do not apply this mechanically; preserve breakpoints that correspond to real layout changes.

### 10.5 UX2 minimum viewport contract

Do not remove the product's important UX2 viewport validation.

Where relevant, preserve:

- 390 × 844 portrait;
- 480 × 900 portrait;
- one wide viewport;
- 320/360-class boundary cases where the component specifically has an extreme-mobile contract.

A test does not need every one of these if its layout cannot vary across them, but the overall feature must retain its required responsive proof.

### 10.6 Player-count matrices

Likewise, do not run 2/3/4/6/10-player permutations for every invariant.

Use dense player-count coverage only when seat topology, overflow, ordering, routing, or participant density is the subject under test.

For an interaction whose behavior is independent of player count, one representative player count is normally enough.

### 10.7 State matrices

If REST, ordinary-turn, interaction, Negation, Dying, and group states all exercise the same static seat-size invariant, determine whether:

- one state is enough for the base geometry contract;
- one active state is enough for interaction clearance;
- special states need their own test only when they add distinct UI.

Do not multiply states without a distinct regression risk.

---

## 11. Phase 2 preferred end state

The browser suite should become layered:

### Layer A — functional interaction tests

Focused files prove:

- legal actions;
- submit payloads;
- private/public boundaries;
- stale revision behavior;
- state transitions.

These usually need only one representative viewport unless geometry affects the behavior.

### Layer B — responsive component tests

Focused geometry tests prove:

- 390 mobile;
- 480 mobile/tablet;
- wide;
- extreme narrow only where needed.

These should avoid replaying long interactive flows when a fixture can directly establish the state.

### Layer C — small final visual gate

A compact end-to-end visual/layout gate proves the most important whole-screen compositions without re-testing every feature permutation.

The final visual gate should not become another exhaustive matrix.

---

## 12. Browser test implementation guidelines

### 12.1 Reuse direct fixture states

The browser suite already supports many direct fixture states through query parameters.

Prefer loading the exact state needed for a layout assertion instead of reproducing a long gameplay path.

This is acceptable because browser fixture tests are presentation regression tests, not a substitute for API gameplay tests.

### 12.2 Avoid arbitrary sleeps

Continue using Playwright auto-waiting, locator assertions, and `expect.poll`.

Do not introduce `waitForTimeout` to "stabilize" faster CI.

### 12.3 Minimize screenshots

Screenshots are useful for:

- failure diagnostics;
- explicit visual evidence;
- reviewer-approved visual gates.

They should not be attached on every matrix case if the image is never consumed.

Audit `testInfo.attach(... page.screenshot ...)` calls.

If a screenshot is only useful on failure, prefer failure-only artifacts/reporting.

Do not remove a screenshot that is part of an intentional review workflow without checking its use.

### 12.4 Keep one page load per distinct state where practical

Many independent Playwright tests each create a fresh page context, which is correct for isolation.

Do not merge unrelated tests into giant stateful tests merely to save page startups.

However, within a single test that checks several static variants of one contract, it can be reasonable to navigate between fixture states rather than create dozens of separately scheduled tests if failure reporting remains understandable.

Balance runtime and diagnostics.

---

## 13. Optional Phase 3 optimizations

Only consider these after Phase 1 and Phase 2.

### 13.1 Playwright browser cache

Experiment with caching downloaded browser binaries keyed to the Playwright version.

Measure:

- cache restore time;
- install time with cache;
- dependency installation time.

Keep it only if it produces a meaningful stable gain.

### 13.2 CI reporter mode

The current Playwright config uses line + HTML reporter.

Consider CI behavior such as:

- line reporter always;
- HTML/trace artifacts retained on failure.

Do not sacrifice failure diagnostics to save a few seconds without evidence.

### 13.3 Path-aware test selection

Do **not** implement change-based selective testing as the first optimization.

The game has tightly coupled UI/presentation code, and path heuristics can easily miss regressions.

If introduced later, use it only as an additional fast lane while still running the full suite on merge/main or another guaranteed gate.

The deploy gate should remain conservative.

---

## 14. Workflow design cautions

### 14.1 Markdown-only changes

The workflow already ignores markdown-only changes.

Preserve that behavior unless the reviewer requests otherwise.

### 14.2 Push versus pull request

Deployment should remain push-only to the intended deploy branches.

Validation should run for the existing PR/push triggers.

### 14.3 Concurrency

Do not change workflow concurrency semantics during this optimization unless required.

CI cancellation/queuing behavior is a separate concern from test execution speed.

### 14.4 Secrets

No optimization should expose Cloudflare secrets to browser/API jobs that do not need them.

Keep deployment credentials limited to deployment steps.

---

## 15. Required acceptance criteria — Phase 1

Phase 1 is complete only when all of the following are true:

- [ ] No existing test case is intentionally removed or skipped.
- [ ] Duplicate build in the validation path is removed.
- [ ] Lint/fast, API, and browser validation are no longer one long serial chain.
- [ ] Browser suite runs in two GitHub matrix shards.
- [ ] Each browser shard still uses two Playwright workers unless measured evidence justifies another value.
- [ ] All browser shards must pass before deployment.
- [ ] API suite still runs all discovered API test files.
- [ ] Fast suite still includes built-bundle coverage when a build exists.
- [ ] Current Node test output reports truthful test counts instead of zero.
- [ ] `npm run build` passes.
- [ ] `npm run test:fast` passes.
- [ ] `npm run test:api` passes.
- [ ] Full `npm run test:browser` passes locally or in an equivalent unsharded verification.
- [ ] Both CI browser shards pass from a clean GitHub runner.
- [ ] Production deploy still waits for every required validation job.
- [ ] Production smoke tests still run after deploy.
- [ ] No gameplay/product code changes are mixed into the optimization unless strictly required for test infrastructure correctness.
- [ ] Git diff/check is clean.
- [ ] Before/after GitHub Actions wall-clock timings are recorded.

---

## 16. Required acceptance criteria — Phase 2

Phase 2 is complete only when:

- [ ] Every removed browser case has an identified equivalent or stronger canonical test.
- [ ] No hidden-information/privacy test is lost.
- [ ] No stale/revision safety test is lost.
- [ ] No important UX2 breakpoint is silently dropped.
- [ ] No known bug loses its only regression test.
- [ ] Dedicated specs become the canonical home for their feature contracts.
- [ ] Legacy matrix coverage is reduced only where it is demonstrably redundant.
- [ ] Full browser suite remains green.
- [ ] Test-count reduction and wall-time reduction are measured.
- [ ] The final result remains understandable to future agents.

Do not use raw test-count reduction as the success metric. The metric is faster CI with equivalent or stronger regression protection.

---

## 17. Suggested execution order for the optimization agent

Execute in this order:

1. Re-read `.github/workflows/deploy.yml`, `package.json`, Playwright config, fast runner, API runner, browser Worker helper, and current test inventory.
2. Capture a fresh successful-run timing baseline.
3. Fix test-count/timing parsing.
4. Remove the duplicate build from the CI validation path.
5. Split lint/fast, API, and browser into parallel jobs.
6. Add two-way Playwright sharding.
7. Push and measure a complete GitHub Actions run.
8. Fix any shard-specific isolation issues.
9. Record Phase 1 before/after timings.
10. Only then begin the `ui19.spec.mjs`/dedicated-spec overlap audit.
11. Remove/merge only proven duplicate cases.
12. Measure again.
13. Stop when gains become small compared with maintenance complexity.

Do not combine Phase 1 orchestration changes and a large Phase 2 test deletion in one opaque commit. Keep commits reviewable.

---

## 18. Recommended commit structure

Prefer several small commits, for example:

```text
test: fix CI timing count reporting
ci: parallelize validation jobs
ci: shard Playwright browser suite
test: deduplicate legacy responsive coverage
```

The exact messages may differ.

The first three should not reduce test membership.

---

## 19. Completion report expected from the agent

When finished, report:

1. files changed;
2. exact workflow structure after the change;
3. browser shard count and workers per shard;
4. before/after total validation wall time;
5. before/after push-to-deploy time;
6. current browser/fast/API test counts;
7. API shard durations;
8. browser shard durations;
9. whether any test cases were removed;
10. if Phase 2 was performed, a concise mapping of removed duplicate coverage to surviving canonical tests;
11. all validation commands run;
12. GitHub Actions run ID/URL or commit SHA used for timing evidence;
13. any remaining bottleneck.

Do not report estimated speedup as measured speedup.

---

## 20. Target outcome

The desired end state is not "the fewest tests".

The desired end state is:

```text
fast feedback
+ full authoritative gameplay coverage
+ strong privacy/stale-state regression protection
+ focused responsive UX2 validation
+ understandable test ownership
+ reliable deployment gate
```

A realistic first target is to reduce validation from the current near-ten-minute experience to roughly the four-to-five-minute range through parallelism and sharding alone, then use evidence-based browser deduplication to improve further without reducing confidence.
