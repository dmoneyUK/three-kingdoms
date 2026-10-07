# CI Test Optimization Handover

Status: Phase 1 complete and measured
Branch: `ux-v2`
Task authority: `docs/CI_TEST_OPTIMIZATION.md`
Updated: 2026-10-07

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

Current source inventory: 24 discovered API test files and 16 explicit fast-suite files; `rendered-html.test.mjs` is added by the fast runner when the built bundle exists. Playwright `--list` now reports 752 cases in 34 files in the current working tree. That inventory includes another agent's untracked `tests/browser/huang-gai-self-sacrifice-skills-band.spec.mjs`, so it is a working-tree count, not the remote commit's count.

## Concurrent work to preserve

Another agent advanced `ux-v2` with commit `e1ee2bb` while this work was in progress. That commit includes `HANDOVER.md`, `docs/AUTONOMOUS_UI_ROADMAP.md`, `tests/browser/fixture.jsx`, and `tests/browser/generic-hero-response-skills-band.spec.mjs`. The shared working tree currently also has uncommitted changes in `app/page.tsx` and `tests/browser/fixture.jsx`, plus untracked `tests/browser/huang-gai-self-sacrifice-skills-band.spec.mjs`. Leave those files unstaged and untouched. Keep optimization changes limited to the workflow, test timing parsers, and this handover.

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

## Next bounded task: Phase 2 coverage ownership audit

1. Start the evidence-based review of `tests/browser/ui19.spec.mjs` against dedicated browser specs, as defined in `docs/CI_TEST_OPTIMIZATION.md` §§10–12.
2. Build a temporary contract/viewport ownership table before changing test membership. Preserve privacy, stale-safety, important breakpoints, and each known bug's canonical regression proof.
3. Avoid files another agent is actively editing; recheck `git status` before any change and keep feature-agent files out of optimization commits.
4. Remove or merge only duplicates with equal or stronger surviving coverage, then measure the full browser suite in GitHub Actions.

## Validation state

No tests have been run locally. Playwright `--list` enumerated the suite and both shards; JavaScript syntax checks, YAML parsing, and `git diff --check` passed for the optimization changes. Run #37649255906 passed every validation job and production smoke check. Its active-time improvement is measured; queue-inflated push-to-deploy time is recorded separately.
