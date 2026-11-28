# UX3 Handover

## D17 continuous batch — in progress

- Latest authority: UX3-D17 at `4ef88a6236a6bea11c8a5e09e6fe5d54dce4da41`; D16 deploy implementation contract is binding. Independent worktree `/Users/jingedai/.codex/worktrees/ux3-env-01a`, branch `ux3`. BASELINE-02 source merge remains `899fa260529ff10af98c960e3c43803c139f7318`, reconciled to pinned UX2 `82de25990edc51e957a34ed3303005558ac5cbae`.
- Owner-authorized order: DEPLOY-01A → DEPLOY-01B → FE-01 → FE-02 → FE-03 → FE-04 → FE-05 → FE-06. No human wait between green units; stop after FE-06 for consolidated independent Manager/Owner review. This Agent does not declare product acceptance.
- DEPLOY-01A passed exact-SHA CI at `a097c9c0262928cb208cfe31008716a30092f87d`. D17 requires UX3 automatic deployment to the existing shared Worker `three-kingdoms` and D1 `three-kingdoms-db` (`3151997a-f69e-4a45-ab51-9e4fd062aeb3`). DEPLOY-01B is the current unit; deploy result is pending exact-SHA five-job CI.
- DEPLOY-01B changes only `.github/workflows/ux3-ci.yml` and this handover. The new push-only job depends on staging-config, lint-fast, API, and browser-smoke; it checks out `${{ github.sha }}`, runs the default build and fixed-target generated-config guard immediately before Wrangler deploy, then smoke-checks `/` and `/api/health`. It performs no `db:generate`, remote migration, schema/data change, or new resource creation. Existing secret names are used; no credential values are read or printed.
- DEPLOY-01B workflow source SHA: pending. Exact-SHA CI/deployment run: pending. Worker version, smoke outcome, and any visible page build marker: pending. If another eligible branch replaces the live version after the UX3 deployment, record that observation without claiming UX3 remains live.
- Local preparation evidence for DEPLOY-01A: `env -u CLOUDFLARE_ENV npm run build` passed. The generated `dist/server/wrangler.json` had no `targetEnvironment`, `name`/`topLevelName` `three-kingdoms`, `definedEnvironments: ["ux3-staging"]`, one `DB` binding to the reviewed shared D1 ID, and `migrations_dir: ../../drizzle`; routes, Cron, explicit workers.dev and preview overrides were absent. Shared-target guard CLI passed against that actual file.
- DEPLOY-01A guard tests passed **17/17**, targeted ESLint and `git diff --check` passed. Its exact-SHA CI is [46146234137](https://github.com/dmoneyUK/three-kingdoms/actions/runs/46146234137), all four required CI jobs passed; there was no deploy job on that earlier SHA.

## Batch evidence

| Unit | Exact start/source | Delivery SHA | Focused evidence | Exact-SHA CI / hosted | Status |
| --- | --- | --- | --- | --- | --- |
| BASELINE-02 | UX3 `7181cfa4`; pinned UX2 `82de2599` | `899fa260529ff10af98c960e3c43803c139f7318` | Merge/source reconciliation recorded below | [46141762056](https://github.com/dmoneyUK/three-kingdoms/actions/runs/46141762056), 4/4 jobs green; no deploy | Accepted baseline, no product acceptance inferred |
| DEPLOY-01A | `f4163cae3821cbb8de793707c6cf530c770f0e10` | `a097c9c0262928cb208cfe31008716a30092f87d` | generated default build; guard 17/17; CLI; targeted ESLint; diff check passed | [46146234137](https://github.com/dmoneyUK/three-kingdoms/actions/runs/46146234137), exact SHA, 4/4 jobs passed; no deploy | TECHNICAL_CI_PASS; pending consolidated review |
| DEPLOY-01B | `4ef88a6236a6bea11c8a5e09e6fe5d54dce4da41` | pending | Workflow scope and fixed target guard checked | Pending five-job exact-SHA CI and shared Worker smoke | In progress |
| FE-01 | After DEPLOY-01B succeeds | pending | pending | pending; auto-deploy enabled | Not started |
| FE-02 | After preceding green material source | pending | pending | pending; auto-deploy enabled | Not started |
| FE-03 | After preceding green material source | pending | pending | pending; auto-deploy enabled | Not started |
| FE-04 | After preceding green material source | pending | pending | pending; auto-deploy enabled | Not started |
| FE-05 | After preceding green material source | pending | pending | pending; auto-deploy enabled | Not started |
| FE-06 | After preceding green material source | pending | pending | pending; auto-deploy enabled | Not started |

## BASELINE-02 source and evidence

- Normal merge `899fa260` imports UX2 tip `82de2599` atop UX3 parent `7181cfa4`; exact ancestry, 49-path source diff, and preservation of the 12 UX3-specific paths were independently reconciled in D14.
- Exact-SHA UX3 CI run [46141762056](https://github.com/dmoneyUK/three-kingdoms/actions/runs/46141762056): 4/4 jobs passed, including 584/584 fast, 397/397 API, 4/4 browser smoke, and 52/52 UX3 staging-config tests plus generated-config guard. The two inherited trailing-space lines in imported `docs/UX2-refine.md` remain preserved per contract.
- No UX2 Owner acceptance is inferred from CI. UX2 and AI worktrees/branches remain untouched.

## DEPLOY-01A source and evidence

- Initial material commit `a097c9c0262928cb208cfe31008716a30092f87d` changed only `.github/workflows/ux3-ci.yml`, `scripts/verify-shared-deploy-config.mjs`, `tests/shared-deploy-config.test.mjs`, `tests/run-fast-tests.mjs`, and this handover. The guard is offline-only, fixed to the reviewed production Worker/D1 shape, resolves the generated migration path to the trusted checkout, rejects symlink escapes, and prints no config contents or credential values. No deploy job, secret, cloud write, remote migration, resource, Wrangler source config, or game source change was introduced.
- Exact-SHA GitHub Actions run [46146234137](https://github.com/dmoneyUK/three-kingdoms/actions/runs/46146234137) for `a097c9c0262928cb208cfe31008716a30092f87d`: staging guard **52/52** plus generated staging config passed; lint passed; generated shared target guard tests **17/17** and actual default config CLI passed; fast **601/601**; API **397/397** across two shards; browser smoke **4/4**. All four required jobs succeeded. The job inventory contained only staging-config, lint-fast, API, and browser-smoke; no deployment job ran.
- DEPLOY-01A local checks and CI prove the reviewed generated config shape only. They do not authorize or verify an actual live deployment. All source code changes remain on `ux3`.

## Current boundaries

- Latest authority: UX3-D17 and UX3-AUTO-04. D17/D16 require the shared deployment; the previous cross-branch coordination prerequisites are superseded for this target.
- DEPLOY-01A is TECHNICAL_CI_PASS, pending consolidated review. DEPLOY-01B is being implemented on `ux3`; it does not modify `main`/`ux-v2`, run remote migrations, or change schema/data.
- FE-01..06 must preserve UX2 contracts, execute §6C retirement within each bounded slice, use focused non-browser local checks plus exact-SHA full UX3 CI, and record changed/retired paths and remaining legitimate owners.
- No Agent-initiated local UI/browser/device checks, AI Staging write, remote migration, UX2/AI edit, backend rule/schema/protocol change, or new resource. The only authorized remote write is D17's existing shared Worker deployment after the four required CI jobs pass and the generated target guard succeeds.
- After FE-06 evidence, update this handover and stop for consolidated independent Manager/Owner review. CI is not product or phone acceptance.
