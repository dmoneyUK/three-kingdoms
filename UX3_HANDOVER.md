# UX3 Handover

## D15 continuous batch — in progress

- Latest authority: UX3-D15 at `f4163cae3821cbb8de793707c6cf530c770f0e10`; isolated branch/worktree `ux3`, clean before this unit. BASELINE-02 source merge remains `899fa260529ff10af98c960e3c43803c139f7318`, reconciled to pinned UX2 `82de25990edc51e957a34ed3303005558ac5cbae`.
- Owner-authorized order: DEPLOY-01A → DEPLOY-01B → FE-01 → FE-02 → FE-03 → FE-04 → FE-05 → FE-06. No human wait between green units. All FE work stays CI-only if DEPLOY-01B is blocked. Final status is pending consolidated independent Manager/Owner review; this Agent does not declare product acceptance.
- Current unit: **UX3-FE-01**, ready to start from the exact `ux3` tip after this handover-only update. DEPLOY-01A passed its D15 technical gate at `a097c9c0262928cb208cfe31008716a30092f87d`; DEPLOY-01B is skipped as blocked. No Cloudflare operation or deployment is authorized in this batch.
- Local preparation checks: `env -u CLOUDFLARE_ENV npm run build` passed. The generated `dist/server/wrangler.json` has no `targetEnvironment`, `name`/`topLevelName` `three-kingdoms`, `definedEnvironments: ["ux3-staging"]`, one `DB` binding to `three-kingdoms-db` / `3151997a-f69e-4a45-ab51-9e4fd062aeb3`, and `migrations_dir: ../../drizzle`; routes, Cron, explicit workers.dev and preview overrides are absent. Shared-target guard CLI passed against that actual file.
- Focused guard tests pass **17/17**, including target/ID/name/binding/path negatives, staging/AI/test/Bot/unsafe/legacy/remote overrides, invalid JSON, and CLI config/migrations symlink escapes. Targeted ESLint on the new guard/tests/runner passed. Current task diff check passed. Full exact-SHA CI is pending the initial source commit/push.

## DEPLOY-01B preflight

**BLOCKED; skipped without hosted activity.** Current `origin/main` is `3484e005dc5f86e16095ad70264fda1be6e5dfb9`; `origin/ux-v2` is `82de25990edc51e957a34ed3303005558ac5cbae`. Both actual `.github/workflows/deploy.yml` files still use the per-ref concurrency group `cloudflare-deploy-${{ github.ref }}`, so they do not serialize a shared Worker/D1 target across branches. The required PM-coordinated workflow manifest and in-flight drain, schema/persisted-room compatibility, existing account/secret authority, compatible rollback Worker, and reliable live SHA/version readback are not established in the reviewed refs/evidence. No other branch was edited, no credential values were read, and no Cloudflare access/write/deploy was attempted. Under D15, after A's exact-SHA CI passes, continue FE-01..06 CI-only with deployment disabled.

## Batch evidence

| Unit | Exact start/source | Delivery SHA | Focused evidence | Exact-SHA CI / hosted | Status |
| --- | --- | --- | --- | --- | --- |
| BASELINE-02 | UX3 `7181cfa4`; pinned UX2 `82de2599` | `899fa260529ff10af98c960e3c43803c139f7318` | Merge/source reconciliation recorded below | [46141762056](https://github.com/dmoneyUK/three-kingdoms/actions/runs/46141762056), 4/4 jobs green; no deploy | Accepted baseline, no product acceptance inferred |
| DEPLOY-01A | `f4163cae3821cbb8de793707c6cf530c770f0e10` | `a097c9c0262928cb208cfe31008716a30092f87d` | generated default build; guard 17/17; CLI; targeted ESLint; diff check passed | [46146234137](https://github.com/dmoneyUK/three-kingdoms/actions/runs/46146234137), exact SHA, 4/4 jobs passed; no deploy | TECHNICAL_CI_PASS; pending consolidated review |
| DEPLOY-01B | After DEPLOY-01A | — | preflight above | No hosted action | BLOCKED; D15 permits CI-only continuation |
| FE-01 | Exact `ux3` tip after this docs-only handover | pending | pending | pending; deploy disabled | Current next unit |
| FE-02 | After preceding green source + docs-only handover | pending | pending | pending; deploy disabled | Not started |
| FE-03 | After preceding green source + docs-only handover | pending | pending | pending; deploy disabled | Not started |
| FE-04 | After preceding green source + docs-only handover | pending | pending | pending; deploy disabled | Not started |
| FE-05 | After preceding green source + docs-only handover | pending | pending | pending; deploy disabled | Not started |
| FE-06 | After preceding green source + docs-only handover | pending | pending | pending; deploy disabled | Not started |

## BASELINE-02 source and evidence

- Normal merge `899fa260` imports UX2 tip `82de2599` atop UX3 parent `7181cfa4`; exact ancestry, 49-path source diff, and preservation of the 12 UX3-specific paths were independently reconciled in D14.
- Exact-SHA UX3 CI run [46141762056](https://github.com/dmoneyUK/three-kingdoms/actions/runs/46141762056): 4/4 jobs passed, including 584/584 fast, 397/397 API, 4/4 browser smoke, and 52/52 UX3 staging-config tests plus generated-config guard. The two inherited trailing-space lines in imported `docs/UX2-refine.md` remain preserved per contract.
- No UX2 Owner acceptance is inferred from CI. UX2 and AI worktrees/branches remain untouched.

## DEPLOY-01A source and evidence

- Initial material commit `a097c9c0262928cb208cfe31008716a30092f87d` changed only `.github/workflows/ux3-ci.yml`, `scripts/verify-shared-deploy-config.mjs`, `tests/shared-deploy-config.test.mjs`, `tests/run-fast-tests.mjs`, and this handover. The guard is offline-only, fixed to the reviewed production Worker/D1 shape, resolves the generated migration path to the trusted checkout, rejects symlink escapes, and prints no config contents or credential values. No deploy job, secret, cloud write, remote migration, resource, Wrangler source config, or game source change was introduced.
- Exact-SHA GitHub Actions run [46146234137](https://github.com/dmoneyUK/three-kingdoms/actions/runs/46146234137) for `a097c9c0262928cb208cfe31008716a30092f87d`: staging guard **52/52** plus generated staging config passed; lint passed; generated shared target guard tests **17/17** and actual default config CLI passed; fast **601/601**; API **397/397** across two shards; browser smoke **4/4**. All four required jobs succeeded. The job inventory contained only staging-config, lint-fast, API, and browser-smoke; no deployment job ran.
- DEPLOY-01A local checks and CI prove the reviewed generated config shape only. They do not authorize or verify an actual live deployment. All source code changes remain on `ux3`.

## Current boundaries

- Latest reviewed design/workflow: UX3-D15 and UX3-AUTO-04. Only the ordered batch above is authorized.
- DEPLOY-01A is TECHNICAL_CI_PASS, pending consolidated review. DEPLOY-01B remains disabled and blocked by cross-branch/operator evidence; no remote action occurred.
- FE-01..06 must preserve UX2 contracts, execute §6C retirement within each bounded slice, use focused non-browser local checks plus exact-SHA full UX3 CI, and record changed/retired paths and remaining legitimate owners.
- No Agent-initiated local UI/browser/device checks, production/AI Staging write, remote migration, UX2/AI edit, backend rule/schema/protocol change, or new resource.
- After FE-06 evidence, update this handover and stop for consolidated independent Manager/Owner review. CI is not product or phone acceptance.
