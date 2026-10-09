# CI Test Optimization Handover

Status: Phase 1 complete and measured; Phase 2 representative reduction measured in CI
Branch: `ux-v2`
Task authority: `docs/CI_TEST_OPTIMIZATION.md`
Updated: 2026-10-09

## Current baseline

The latest successful pre-optimization `ux-v2` workflow was run [#37648612674](https://github.com/dmoneyUK/three-kingdoms/actions/runs/37648612674), on parent commit `e1ee2bb8ca15026b039219834ca5f02e07ad4376`.

| Stage | Observed duration |
| --- | ---: |
| Push-to-deploy wall time | 22m 09s, including 11m 19s queued |
| Active pipeline after queue | about 10m 50s |
| `build-and-test` job | 9m 54s |
| `npm ci` | 15s |
| lint | 32s |
| Chromium install | 19s |
| build before browser | 7s |
| browser suite | 6m 56s, 749 tests / 2 workers |
| `npm test` (build + fast + API) | 1m 34s |
| fast suite | 228 tests, 6.37s, 17 files |
| API suite | 257 tests, 79.63s, 24 files, 4 shards |
| API shard durations | shard 1: 57.16s; shard 2: 38.42s; shard 3: 59.36s; shard 4: 66.67s |
| deploy job | 48s |

The run spent 11m 19s queued behind earlier branch workflows, so its push-to-deploy wall time is separated from active pipeline time. The old timing parsers printed fast/API counts as zero even though raw Node summaries contained the counts above. The baseline workflow metadata confirms that `npm test` runs after the browser suite and therefore repeats the build.

At Phase 1 completion, the working-tree inventory was 752 browser cases in 34 files; later feature-agent work means that count is historical, not a current total. The optimization branch still has 24 discovered API test files and 16 explicit fast-suite files; `rendered-html.test.mjs` is added by the fast runner when the built bundle exists.

## Completed in this handover

- Confirmed the checked-out branch and `origin/ux-v2` both pointed to `67827c9da7e31ad36edc832596f4f2070fdf8a99` before implementation.
- Captured the successful-run baseline above.
- Updated all three timing parsers to accept both `# tests N` and `ℹ tests N`; parsing still only affects the printed metric, not the test exit code.
- Confirmed browser configuration uses two CI workers and the fixture starts both Vite and an isolated Wrangler/D1 Worker.
- Replaced the serial validation job with parallel lint/fast, API, and browser jobs. The fast job builds before `test:fast` to retain rendered-HTML coverage; API and browser jobs build their own isolated artifacts.
- Added two Playwright matrix shards with the existing two workers per runner. Deployment now needs all three validation jobs, including the full browser matrix.
- Preserved push/PR filters, workflow concurrency, deployment secrets scope, and production smoke checks.
- Confirmed Playwright accepts the exact npm shard argument in list mode. The current working-tree inventory splits evenly: 376 cases in shard 1 and 376 in shard 2; no test execution occurred.
- Committed the focused optimization as `794ac2993b871d52de11eae84c2c837cdabc0b94` (`ci: parallelize validation and shard browser tests`) and pushed it to `origin/ux-v2`.
- GitHub Actions run [#37649255906](https://github.com/dmoneyUK/three-kingdoms/actions/runs/37649255906) was pending when checked. The previous queued run was still active, so before/after measurements are not available yet.
- Run #37649255906 began validation at 16:22:51Z after 17m 41s in the workflow queue. `lint-fast` passed with 228 tests in 6.72s; the API job passed with 257 tests in 80.89s (shard 1: 57.60s; shard 2: 38.71s; shard 3: 59.19s; shard 4: 66.87s).
- Both browser shards passed: 375 tests in 3.9m and 374 tests in 3.6m, for all 749 discovered CI browser tests. Validation completed in about 4m 52s from job start, versus 9m 54s for the previous validation job.
- The deploy job and both production smoke requests passed. Deploy took 47s; run #37649255906 completed at 16:28:38Z.
- Active time from validation-job start through deploy completion was about 5m 47s, versus about 10m 50s in the old workflow: 5m 03s (46.6%) less active pipeline time. Validation alone fell by about 5m 02s (50.8%).
- Push-to-deploy wall time for the new run was 23m 28s, including 17m 41s queued. The earlier baseline was 22m 09s, including 11m 19s queued. The workflow queue was longer by 6m 22s, so the end-to-end wall time did not improve in these two runs even though active execution did.
- Browser test membership stayed at 749 cases; the optimization commit removed or skipped none.

## Current bounded task: Phase 2 representative Hand matrix

The initial read-only audit found no exact replacement for the full Hand interaction flow. The only safe first reduction is the repetitive Hand-size matrix itself, using the plan's §10.4 rule: retain its required viewports and the fit/overflow boundary, normal selection, largest-Hand stress, and narrow-width screenshot cases. Keep the separate clipped-edge, native-touch, and Hand-membership tests because they cover distinct behaviors.

| Contract | Existing legacy cases | Dedicated/overlapping coverage | Viewports retained | Keep canonical | Remove/merge |
| --- | --- | --- | --- | --- | --- |
| Local Hand one-layer layout, overflow navigation, selecting the last/first physical card, card explanation, skill hit ownership, and no action submission | `ui19.spec.mjs` Hand-size matrix: 5 widths × 6 sizes; separate VIS-09B clipped-edge, native-touch, and VIS-09C membership tests | `local-dock-hero-hierarchy.spec.mjs` covers five-card layout and 25-card pannability at 390/414/480; it does not cover the matrix's full selection/navigation flow. VIS-09B clipped-edge and native-touch cases cover additional input paths. | Keep all 1440/650/480/360/320 widths. Keep 30 cards at 1440 and 650; 5 and 25 at 480; 25 and 30 at 360 and 320. | Remaining `ui19` representative matrix cases; dedicated local Dock geometry plus separate clipped-edge/touch/membership regressions. | Remove only repeated size rows at an already-covered width: 1440 sizes 5/10/15/20/25; 650 sizes 5/10/15/20/25; 480 sizes 10/15/20/30; 360 and 320 sizes 5/10/15/20. Retain the 25-card narrow screenshots. |

This table was recorded before editing test membership. The matrix now has 8 cases instead of 30, removing 22 repeated parameter rows while retaining every listed viewport, the 480px normal/overflow pair, the 25-card narrow screenshots, and 30-card maximum-density cases. The separate clipped-edge, native-touch, and membership tests are unchanged. No other `ui19` cases were removed.

Playwright list mode confirms `ui19.spec.mjs` now contains 376 cases, down from 398 before this edit. The eight retained Hand matrix cases match the table. `node --check tests/browser/ui19.spec.mjs` and `git diff --check` passed; no browser tests were executed locally.

The reduction and this handover were committed as `d23d6ad` (`test: reduce repeated hand-size matrix cases`) and pushed to `origin/ux-v2`. Only the two optimization-owned paths were included; the concurrent feature-agent changes remained in the working tree.

## Completed bounded task: measure the Phase 2 Hand matrix reduction

- GitHub Actions run [#37653756286](https://github.com/dmoneyUK/three-kingdoms/actions/runs/37653756286) for `d23d6ad32ba954af8c58aef9a6450480ab3dfc65` succeeded. Lint/fast, API, both browser shards, deploy, and production smoke all passed.
- A Playwright list-only discovery against the exact commit, with `CI=1`, found 733 browser cases: shard 1/2 has 367 and shard 2/2 has 366. No local browser tests were executed. The public Actions job pages confirm both shards passed but require sign-in to view detailed logs, so these counts come from exact-commit discovery rather than copied log summaries.
- GitHub reports browser shard job durations of 3m 17s and 4m 30s, including setup. The `Run browser shard` steps took 2m 32s and 3m 30s, respectively.
- The workflow took 13m 29s from trigger to completion. Its first validation jobs started 7m 45s after the trigger; the validation critical path was 4m 31s and deploy took 1m 08s. The first-job-to-deploy-completion interval was 5m 42s. Keep queue/scheduling delay separate from execution time; this single run does not isolate a speedup from the 22-case reduction.
- The reduced matrix remains at 8 cases from 30, with the separate clipped-edge, native-touch, and membership tests unchanged. No other `ui19` cases were removed.

## Next bounded task: audit one more browser-coverage candidate

Use `docs/CI_TEST_OPTIMIZATION.md` §§10–12 to perform a read-only contract-level audit of one candidate matrix in `tests/browser/ui19.spec.mjs`. Record its invariant, overlapping dedicated coverage, viewports, privacy/stale-safety assertions, and canonical surviving test before proposing any further membership change. Keep concurrent feature work untouched.

## Concurrent feature work to preserve

The checkout was synchronized with `origin/ux-v2` and clean before this handover update. Only `docs/CI_TEST_OPTIMIZATION_HANDOVER.md` is modified for this task. Recheck status before the next task to preserve any new concurrent work.

## Validation state

No test suites were run locally. Phase 1 Playwright list, JavaScript syntax checks, YAML parsing, `git diff --check`, and Actions run #37649255906 were recorded above. For Phase 2, the exact-commit Playwright list reports 733 total cases split 367/366 across the two shards; `ui19.spec.mjs` has 376 cases after the reduction (398 before). The Actions run for `d23d6ad` passed both shards and the full deploy workflow as recorded above.
