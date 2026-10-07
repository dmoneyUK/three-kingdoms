# CI Test Optimization Handover

Status: Phase 1 in progress  
Branch: `ux-v2`  
Task authority: `docs/CI_TEST_OPTIMIZATION.md`  
Updated: 2026-10-07

## Current baseline

The latest successful `ux-v2` workflow observed before changes was run [#37639976811](https://github.com/dmoneyUK/three-kingdoms/actions/runs/37639976811), on commit `c7ec91770635261d83b2dac656dbd4bdf0ef1c59`.

| Stage | Observed duration |
| --- | ---: |
| Total workflow | 10m 58s |
| `build-and-test` job | 10m 01s |
| `npm ci` | 14s |
| lint | 32s |
| Chromium install | 21s |
| build before browser | 7s |
| browser suite | 6m 58s |
| `npm test` (build + fast + API) | 1m 34s |
| deploy job | 50s |

GitHub's unauthenticated log download returned HTTP 403, so the historical fast/API test counts and per-API-shard durations could not be recovered. The baseline workflow metadata confirms that `npm test` runs after the browser suite and therefore repeats the build.

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

## Next bounded task: validate and measure Phase 1

1. Check the exact diff and verify Playwright accepts the two shard arguments in list mode.
2. Commit only `.github/workflows/deploy.yml`, the three timing parsers, and this handover; preserve concurrent `app/page.tsx` and `tests/browser/fixture.jsx` edits.
3. Push to `ux-v2` and record the resulting GitHub Actions job, suite, shard, count, and total durations here. Do not claim a measured improvement until the run completes successfully.

## Validation state

No tests have been run locally. Playwright `--list` enumerated the suite and both shards; JavaScript syntax checks, YAML parsing, and `git diff --check` passed for the optimization changes. GitHub Actions remains pending and is the validation and timing source for this change.
