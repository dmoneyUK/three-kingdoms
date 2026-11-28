# UX3 Handover

## D15 continuous batch — in progress

- Latest authority: UX3-D15 at `f4163cae3821cbb8de793707c6cf530c770f0e10`; isolated branch/worktree `ux3`, clean before this unit. BASELINE-02 source merge remains `899fa260529ff10af98c960e3c43803c139f7318`, reconciled to pinned UX2 `82de25990edc51e957a34ed3303005558ac5cbae`.
- Owner-authorized order: DEPLOY-01A → DEPLOY-01B → FE-01 → FE-02 → FE-03 → FE-04 → FE-05 → FE-06. No human wait between green units. All FE work stays CI-only if DEPLOY-01B is blocked. Final status is pending consolidated independent Manager/Owner review; this Agent does not declare product acceptance.
- Current unit: **UX3-DEPLOY-01A**, offline shared-target guard only. Start tip `f4163cae3821cbb8de793707c6cf530c770f0e10` (BASELINE-02 source plus D14/D15 docs-only commits). No Cloudflare operation or deployment is authorized in A.
- Local preparation checks: `env -u CLOUDFLARE_ENV npm run build` passed. The generated `dist/server/wrangler.json` has no `targetEnvironment`, `name`/`topLevelName` `three-kingdoms`, `definedEnvironments: ["ux3-staging"]`, one `DB` binding to `three-kingdoms-db` / `3151997a-f69e-4a45-ab51-9e4fd062aeb3`, and `migrations_dir: ../../drizzle`; routes, Cron, explicit workers.dev and preview overrides are absent. Shared-target guard CLI passed against that actual file.
- Focused guard tests pass **17/17**, including target/ID/name/binding/path negatives, staging/AI/test/Bot/unsafe/legacy/remote overrides, invalid JSON, and CLI config/migrations symlink escapes. Targeted ESLint on the new guard/tests/runner passed. Current task diff check passed. Full exact-SHA CI is pending the initial source commit/push.

## DEPLOY-01B preflight

**BLOCKED; skipped without hosted activity.** Current `origin/main` is `3484e005dc5f86e16095ad70264fda1be6e5dfb9`; `origin/ux-v2` is `82de25990edc51e957a34ed3303005558ac5cbae`. Both actual `.github/workflows/deploy.yml` files still use the per-ref concurrency group `cloudflare-deploy-${{ github.ref }}`, so they do not serialize a shared Worker/D1 target across branches. The required PM-coordinated workflow manifest and in-flight drain, schema/persisted-room compatibility, existing account/secret authority, compatible rollback Worker, and reliable live SHA/version readback are not established in the reviewed refs/evidence. No other branch was edited, no credential values were read, and no Cloudflare access/write/deploy was attempted. Under D15, after A's exact-SHA CI passes, continue FE-01..06 CI-only with deployment disabled.

## Batch evidence

| Unit | Exact start/source | Delivery SHA | Focused evidence | Exact-SHA CI / hosted | Status |
| --- | --- | --- | --- | --- | --- |
| BASELINE-02 | UX3 `7181cfa4`; pinned UX2 `82de2599` | `899fa260529ff10af98c960e3c43803c139f7318` | Merge/source reconciliation recorded below | [46141762056](https://github.com/dmoneyUK/three-kingdoms/actions/runs/46141762056), 4/4 jobs green; no deploy | Accepted baseline, no product acceptance inferred |
| DEPLOY-01A | `f4163cae3821cbb8de793707c6cf530c770f0e10` | pending initial source commit | generated default build; guard 17/17; CLI; targeted ESLint; diff check passed | pending exact-SHA 4-job CI; deployment job must remain absent | In progress |
| DEPLOY-01B | After DEPLOY-01A | — | preflight above | No hosted action | BLOCKED; D15 permits CI-only continuation |
| FE-01 | After preceding green source + docs-only handover | pending | pending | pending; deploy disabled | Not started |
| FE-02 | After preceding green source + docs-only handover | pending | pending | pending; deploy disabled | Not started |
| FE-03 | After preceding green source + docs-only handover | pending | pending | pending; deploy disabled | Not started |
| FE-04 | After preceding green source + docs-only handover | pending | pending | pending; deploy disabled | Not started |
| FE-05 | After preceding green source + docs-only handover | pending | pending | pending; deploy disabled | Not started |
| FE-06 | After preceding green source + docs-only handover | pending | pending | pending; deploy disabled | Not started |

## BASELINE-02 source and evidence

- Normal merge `899fa260` imports UX2 tip `82de2599` atop UX3 parent `7181cfa4`; exact ancestry, 49-path source diff, and preservation of the 12 UX3-specific paths were independently reconciled in D14.
- Exact-SHA UX3 CI run [46141762056](https://github.com/dmoneyUK/three-kingdoms/actions/runs/46141762056): 4/4 jobs passed, including 584/584 fast, 397/397 API, 4/4 browser smoke, and 52/52 UX3 staging-config tests plus generated-config guard. The two inherited trailing-space lines in imported `docs/UX2-refine.md` remain preserved per contract.
- No UX2 Owner acceptance is inferred from CI. UX2 and AI worktrees/branches remain untouched.

## Current boundaries

- Latest reviewed design/workflow: UX3-D15 and UX3-AUTO-04. Only the ordered batch above is authorized.
- DEPLOY-01A is offline validation of the generated default shared target; it must not add a deploy job, secret, migration, resource, or remote action. DEPLOY-01B remains disabled and blocked by cross-branch/operator evidence.
- FE-01..06 must preserve UX2 contracts, execute §6C retirement within each bounded slice, use focused non-browser local checks plus exact-SHA full UX3 CI, and record changed/retired paths and remaining legitimate owners.
- No Agent-initiated local UI/browser/device checks, production/AI Staging write, remote migration, UX2/AI edit, backend rule/schema/protocol change, or new resource.
- After FE-06 evidence, update this handover and stop for consolidated independent Manager/Owner review. CI is not product or phone acceptance.
