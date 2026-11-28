# UX3 Handover

## D17 continuous batch — blocked at FE-01

- Latest authority: UX3-D17 at `4ef88a6236a6bea11c8a5e09e6fe5d54dce4da41`; D16 deploy implementation contract is binding. Independent worktree `/Users/jingedai/.codex/worktrees/ux3-env-01a`, branch `ux3`. BASELINE-02 source merge remains `899fa260529ff10af98c960e3c43803c139f7318`, reconciled to pinned UX2 `82de25990edc51e957a34ed3303005558ac5cbae`.
- Owner-authorized order: DEPLOY-01A → DEPLOY-01B → FE-01 → FE-02 → FE-03 → FE-04 → FE-05 → FE-06. No human wait between green units; stop after FE-06 for consolidated independent Manager/Owner review. This Agent does not declare product acceptance.
- DEPLOY-01A passed exact-SHA CI at `a097c9c0262928cb208cfe31008716a30092f87d`. D17 requires UX3 automatic deployment to the existing shared Worker `three-kingdoms` and D1 `three-kingdoms-db` (`3151997a-f69e-4a45-ab51-9e4fd062aeb3`). DEPLOY-01B completed on exact source SHA `206067a3414c53cd434bc21ba7a92c287eb3a2af`.
- Current unit: **UX3-FE-01 — BLOCKED**. Exact start SHA `c21ec95d3d1ff0b4a2ef4d45a1a46f2127694e67`; final source SHA `6d003811f033d718038ced7a2a9611a3cf23c4fd`. Three source submissions were used. Do not advance to FE-02 until the Manager reviews the CI blocker and issues a new decision.
- DEPLOY-01B changes only `.github/workflows/ux3-ci.yml` and this handover. Its push-only job depends on staging-config, lint-fast, API, and browser-smoke; it checks out `${{ github.sha }}`, runs the default build and fixed-target generated-config guard immediately before Wrangler deploy, then smoke-checks `/` and `/api/health`. It performed no `db:generate`, remote migration, schema/data change, or new resource creation. Existing secret names were used; no credential values were read or printed.
- Exact-SHA CI/deployment run [46149030209](https://github.com/dmoneyUK/three-kingdoms/actions/runs/46149030209) passed **5/5 jobs**: staging-config, lint-fast, API, browser smoke, and deploy. Fast tests **601/601**; API tests **397/397** across two shards; generated shared target guard **17/17**. Deploy job [140992955773](https://github.com/dmoneyUK/three-kingdoms/actions/runs/46149030209/job/140992955773) completed successfully and Wrangler reported Worker Version ID `af796e96-3a20-4bb7-ac9d-e43985ee86fe`; `/` and `/api/health` smoke requests passed. The landing page contained no build SHA marker, so no independent live-SHA readback is claimed. Another eligible branch can replace the live version after this deployment.
- Local preparation evidence for DEPLOY-01A: `env -u CLOUDFLARE_ENV npm run build` passed. The generated `dist/server/wrangler.json` had no `targetEnvironment`, `name`/`topLevelName` `three-kingdoms`, `definedEnvironments: ["ux3-staging"]`, one `DB` binding to the reviewed shared D1 ID, and `migrations_dir: ../../drizzle`; routes, Cron, explicit workers.dev and preview overrides were absent. Shared-target guard CLI passed against that actual file.
- DEPLOY-01A guard tests passed **17/17**, targeted ESLint and `git diff --check` passed. Its exact-SHA CI is [46146234137](https://github.com/dmoneyUK/three-kingdoms/actions/runs/46146234137), all four required CI jobs passed; there was no deploy job on that earlier SHA.

## Batch evidence

| Unit | Exact start/source | Delivery SHA | Focused evidence | Exact-SHA CI / hosted | Status |
| --- | --- | --- | --- | --- | --- |
| BASELINE-02 | UX3 `7181cfa4`; pinned UX2 `82de2599` | `899fa260529ff10af98c960e3c43803c139f7318` | Merge/source reconciliation recorded below | [46141762056](https://github.com/dmoneyUK/three-kingdoms/actions/runs/46141762056), 4/4 jobs green; no deploy | Accepted baseline, no product acceptance inferred |
| DEPLOY-01A | `f4163cae3821cbb8de793707c6cf530c770f0e10` | `a097c9c0262928cb208cfe31008716a30092f87d` | generated default build; guard 17/17; CLI; targeted ESLint; diff check passed | [46146234137](https://github.com/dmoneyUK/three-kingdoms/actions/runs/46146234137), exact SHA, 4/4 jobs passed; no deploy | TECHNICAL_CI_PASS; pending consolidated review |
| DEPLOY-01B | `4ef88a6236a6bea11c8a5e09e6fe5d54dce4da41` | `206067a3414c53cd434bc21ba7a92c287eb3a2af` | YAML parse, scope check, diff check; no migration | [46149030209](https://github.com/dmoneyUK/three-kingdoms/actions/runs/46149030209), exact SHA, 5/5 jobs green; Worker version and smoke recorded above | TECHNICAL_CI_PASS; pending consolidated review |
| FE-01 | `c21ec95d3d1ff0b4a2ef4d45a1a46f2127694e67` | `e40ca429ebda9d282e5ab364b6cec89dfd34a654` → `a20742dbe9773abdec2b7fb1ba0e06bb21dc6da8` → `6d003811f033d718038ced7a2a9611a3cf23c4fd` | focused regression **137/137**, targeted ESLint and diff check passed | [46154406004](https://github.com/dmoneyUK/three-kingdoms/actions/runs/46154406004) failed lint/browser; [46155524362](https://github.com/dmoneyUK/three-kingdoms/actions/runs/46155524362) failed lint/browser; [46156102397](https://github.com/dmoneyUK/three-kingdoms/actions/runs/46156102397) lint/fast, API and staging passed, browser failed, deploy skipped | **BLOCKED** — 3/3 submissions; browser smoke still fails |
| FE-02 | After preceding green material source | pending | pending | pending; auto-deploy enabled | Not started |
| FE-03 | After preceding green material source | pending | pending | pending; auto-deploy enabled | Not started |
| FE-04 | After preceding green material source | pending | pending | pending; auto-deploy enabled | Not started |
| FE-05 | After preceding green material source | pending | pending | pending; auto-deploy enabled | Not started |
| FE-06 | After preceding green material source | pending | pending | pending; auto-deploy enabled | Not started |

## FE-01 blocker

- Run [46154406004](https://github.com/dmoneyUK/three-kingdoms/actions/runs/46154406004), source `e40ca429`: staging passed, lint failed with 10 React Hooks diagnostics, API **397/397**, fast **618/618**, browser smoke had **3 failed / 1 passed**; deploy skipped.
- Run [46155524362](https://github.com/dmoneyUK/three-kingdoms/actions/runs/46155524362), source `a20742db`: staging passed, lint retained one `react-hooks/refs` error from the lazy Gateway initializer capturing Home refs, API **397/397**, fast **618/618**, browser smoke again **3 failed / 1 passed**; deploy skipped.
- Run [46156102397](https://github.com/dmoneyUK/three-kingdoms/actions/runs/46156102397), exact source `6d003811f033d718038ced7a2a9611a3cf23c4fd`: staging **52/52** plus generated config guard passed; lint passed; shared target guard **17/17**; fast **619/619**; API **397/397** across two shards; browser smoke **3 failed / 1 passed**; deploy skipped because browser-smoke failed. The three failed cases are the two public H4 gameplay tests timing out waiting for `.game-shell` and room creation timing out waiting for its `create` POST. No FE-01 SHA deployed to the shared Worker.
- Final correction moved Gateway callback binding to a layout effect and added a callback-binding regression. The focused local regression group passed **137/137**; targeted ESLint for Gateway/tests and `git diff --check` passed. No local browser/UI/device run was made. The exact CI browser failure remains unresolved and the FE-01 maximum of three source submissions is exhausted. FE-02..FE-06 were not started.

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
- DEPLOY-01A and DEPLOY-01B are TECHNICAL_CI_PASS, pending consolidated review. DEPLOY-01B deployed successfully on its recorded SHA; no FE-01 SHA reached deployment because each exact-SHA gate failed. The current live Worker SHA is not claimed.
- FE-01..06 must preserve UX2 contracts, execute §6C retirement within each bounded slice, use focused non-browser local checks plus exact-SHA full UX3 CI, and record changed/retired paths and remaining legitimate owners. FE-01 is blocked; FE-02..06 remain not started.
- No Agent-initiated local UI/browser/device checks, AI Staging write, remote migration, UX2/AI edit, backend rule/schema/protocol change, or new resource. D17-authorized shared Worker deployment runs only after the four required CI jobs pass and the generated target guard succeeds.
- Stop here for independent Manager review of the FE-01 browser-smoke blocker and exhausted correction budget. CI is not product or phone acceptance.
