# UX3 Handover

## Current unit

**UX3-BASELINE-01 — verified UX2 baseline merged and exact-SHA CI passed; pending independent Manager acceptance.**

- UX3 starting HEAD: `f982f266fc10e1865e8eb3ac634d2a5891df9bfa`.
- Imported UX2 baseline: `fffd4d91f8a199a849dbc82ed49be2b0ace103f6`.
- UX3 merge SHA: `6130f24cc37a4b3ce5e890cee887393af519ee3c`; parents are the starting UX3 HEAD and the pinned UX2 baseline.
- Baseline exact-SHA Actions run: [45801259202](https://github.com/dmoneyUK/three-kingdoms/actions/runs/45801259202), all four UX2 jobs passed.
- UX2 tip observed during this sync: `a7fba3a35adfcd578a9aa3adcfb3ded96c924ddc`. Later commits `e3af159f` and `a7fba3a3` are intentionally outside this batch.
- Original UX2 fork: `136c2788a2589b536d7a8883c7bad8d961690fca`.

## Integration

One normal Git merge brought the 36 incoming UX2 baseline paths. No merge conflicts occurred. `tests/run-fast-tests.mjs` retains UX2 Judgement/discard tests and the UX3 staging-config guard test.

The UX3 CI workflow uses `npm run lint` with `NODE_OPTIONS=--max-old-space-size=8192`; the temporary stack-size check is removed. Guard tests and failure-preserving build/fast conditions remain. `wrangler.jsonc`, `.github/workflows/deploy.yml`, UX3 design/workflow, and the staging guard are unchanged from the UX3 starting parent. UX3 CI has no deployment job.

## Exact-SHA UX3 validation

[Actions run 45968168870](https://github.com/dmoneyUK/three-kingdoms/actions/runs/45968168870), head SHA `6130f24cc37a4b3ce5e890cee887393af519ee3c`: **success**, four jobs, no deployment job.

- UX3 staging config guard (`140401790230`) — passed: focused tests **52/52**, staging build and generated-config guard passed with the sentinel.
- Lint and fast tests (`140401790672`) — passed: full `npm run lint`, build, fast tests **549/549**.
- API tests (`140401790679`) — passed: **394/394** across 32 files and two sequential shards (262.58 seconds).
- Browser smoke (`140401790551`) — passed: **4/4**.

`git diff --check` passed on the integration diff before commit. ENV-01A remains unaccepted until the Manager reviews this merge and CI; do not start ENV-01B or FE-01 automatically.

No UX2 or AI worktree/branch was written. No Cloudflare resource, remote migration, deployment, production workflow, or paid resource was changed. Stop for independent Manager review.
