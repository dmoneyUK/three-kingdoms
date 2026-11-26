# UX3 Handover

## Current unit

**UX3-ENV-01A — D06 final correction, D07 evidence submission released.** One correction commit is authorized; it is not accepted until the exact-SHA CI is independently reviewed. Stop after this delivery. Do not begin ENV-01B or FE-01.

- Branch: `ux3`
- Documentation baseline: `8673140ad49ed26d2d06f61fc701d07083b5c7e4` (D07)
- Previous submitted source: `56aa9e13f68675463608428348d40d33c007b02f` (1 of 2 material source submissions used)
- Original UX2 runtime fork: `136c2788a2589b536d7a8883c7bad8d961690fca`
- Correction commit: to be recorded after commit; exact-SHA CI pending.

## Correction scope

Changed files are limited to the D06 allowlist:

- `scripts/verify-ux3-staging-config.mjs`
- `tests/ux3-staging-config.test.mjs`
- `.github/workflows/ux3-ci.yml`
- `UX3_HANDOVER.md` (Agent-owned)

The guard resolves `migrations_dir` from the actual generated config location and requires the trusted checkout `drizzle` path. It rejects same-name absolute/traversal paths, active `wasm_modules` / `text_blobs` / `data_blobs`, and non-empty unsafe settings while accepting generated empty defaults. UX3 CI runs the focused guard tests as a required staging-config step; lint uses the specified Node CLI after checking the Linux stack allowance; build and fast-test conditions preserve evidence after lint failure without masking job failure.

## Local validation

- `node --test tests/ux3-staging-config.test.mjs` — **52/52 passed**.
- Targeted ESLint for the verifier and its tests — passed.
- `CLOUDFLARE_ENV=ux3-staging npm run build` — passed.
- Actual `dist/server/wrangler.json` readback — UX3 Staging Worker, one sentinel D1, `../../drizzle`, `workers_dev=false`, `preview_urls=false`, empty `unsafe_hello_world` default.
- Generated-config CLI guard — passed in preparation mode with sentinel classification.
- `git diff --check` — passed after the D07 docs fast-forward.
- Required full-lint reproduction, `node --stack-size=4096 --max-old-space-size=8192 ./node_modules/eslint/bin/eslint.js . --ignore-pattern dist --ignore-pattern .next` — **failed locally** on macOS with Node `v26.3.0`; system stack limit was 8176 KiB. It exited 134 after about 63 seconds with a fatal JavaScript heap OOM at the 8 GB heap cap. No larger stack/heap retry or source-scope workaround was attempted; D07 directs one CI evidence submission despite this local failure.

## Exact-SHA CI

Correction commit and run are pending. The previous D06 evidence remains run `45732474325` on `56aa9e13f68675463608428348d40d33c007b02f`: staging-config, API and Browser passed; lint-fast failed at the inherited React Hooks stack overflow, with build and fast tests skipped; no deployment job was present. That run does not validate this correction.

## Boundaries and stop point

No game/UI, UX2 or AI worktree, production workflow, Cloudflare resource, secret, remote migration, deployment, or paid resource was changed or created. The sentinel is not a real database ID. ENV-01B remains blocked; FE-01 remains behind GATE-00. Record the new source SHA and actual four-job CI outcome here, then stop for independent Manager review; no additional source submission or unchanged-job rerun is authorized.
