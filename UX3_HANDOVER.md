# UX3 Handover

## Current unit

**UX3-BASELINE-01 — merge the current verified UX2 baseline; exact-SHA UX3 CI pending. Not accepted.**

- UX3 starting HEAD: `f982f266fc10e1865e8eb3ac634d2a5891df9bfa`.
- Imported UX2 baseline: `fffd4d91f8a199a849dbc82ed49be2b0ace103f6`.
- Baseline evidence: exact-SHA [Actions run 45801259202](https://github.com/dmoneyUK/three-kingdoms/actions/runs/45801259202); lint/fast, API, browser and UX2 deployment jobs passed. This UX3 sync does not deploy.
- UX2 tip observed during sync: `a7fba3a35adfcd578a9aa3adcfb3ded96c924ddc`. Later commits `e3af159f` and `a7fba3a3` remain outside this batch pending their own exact-SHA verification.
- Original UX2 fork: `136c2788a2589b536d7a8883c7bad8d961690fca`.

## Integration

A normal Git merge was prepared from the pinned baseline. It brings the 36 incoming UX2 paths. The merged `tests/run-fast-tests.mjs` retains UX2 Judgement/discard tests and the UX3 staging-config guard test.

The UX3 CI workflow uses `npm run lint` with `NODE_OPTIONS=--max-old-space-size=8192`; the temporary stack-size check is removed. Guard tests and failure-preserving build/fast conditions remain. `wrangler.jsonc`, `.github/workflows/deploy.yml`, UX3 design/workflow, and the staging guard remain unchanged from the UX3 starting parent. UX3 CI has no deployment job.

## Validation and handoff

- Merge preview: no conflicts; the test-runner union was inspected.
- `git diff --check`: passed on the staged integration diff.
- UX3 merge SHA and exact-SHA four-job CI: pending.
- ENV-01A remains unaccepted until the Manager reviews the merged source and CI; no automatic ENV-01B or FE-01 start.

No UX2 or AI worktree/branch was written. No Cloudflare resources, migration, deployment, production workflow, or paid resource was changed. Stop for independent Manager review after exact-SHA CI evidence is recorded.
