# UX3 Handover

## Current unit

**UX3-ENV-01A — D06 final correction, D07 evidence submission complete; BLOCKED / CHANGES_REQUESTED, not accepted.** The sole remaining material source submission has been used. Stop here for independent Manager review; no more source submissions or unchanged-job reruns without new Owner authorization.

- Branch: `ux3`
- D07 documentation baseline: `8673140ad49ed26d2d06f61fc701d07083b5c7e4`
- Final source commit: `c0a010b6fbb43424b64f4187a5dc5107d50acf50` (2 of 2 material submissions used)
- Original UX2 runtime fork: `136c2788a2589b536d7a8883c7bad8d961690fca`

## Correction scope

Changed files were limited to the D06 allowlist:

- `scripts/verify-ux3-staging-config.mjs`
- `tests/ux3-staging-config.test.mjs`
- `.github/workflows/ux3-ci.yml`
- `UX3_HANDOVER.md` (Agent-owned)

The guard resolves `migrations_dir` from the actual generated config location and requires the trusted checkout `drizzle` path. It rejects same-name absolute/traversal paths, active `wasm_modules` / `text_blobs` / `data_blobs`, and non-empty unsafe settings while accepting generated empty defaults. UX3 CI runs the focused guard tests as a required staging-config step; lint uses the specified Node CLI after checking the Linux stack allowance; build and fast-test conditions preserve evidence after lint failure without masking job failure.

## Local validation

- `node --test tests/ux3-staging-config.test.mjs` — **52/52 passed**.
- Targeted ESLint for the verifier and its tests — passed.
- `CLOUDFLARE_ENV=ux3-staging npm run build` — passed.
- Generated `dist/server/wrangler.json` readback — UX3 Staging Worker, one sentinel D1, `../../drizzle`, `workers_dev=false`, `preview_urls=false`, empty `unsafe_hello_world` default.
- Generated-config CLI guard — passed in preparation mode with sentinel classification.
- `git diff --check` — passed before source submission and after recording CI evidence.
- Required full-lint reproduction on macOS / Node `v26.3.0` exited 134 with a fatal JavaScript heap OOM at the specified 8 GB heap cap. No larger stack/heap retry or source-scope workaround was attempted.

## Exact-SHA CI

[Run `45782754400`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/45782754400), head SHA `c0a010b6fbb43424b64f4187a5dc5107d50acf50`: overall **failure**. The actual run had four jobs and no deployment job.

- `UX3 staging config guard` (`139781940635`) — **passed**. Focused guard tests **52/52**, staging build passed, generated-config guard passed with preparation mode and sentinel classification.
- `Browser smoke` (`139781940867`) — **passed**.
- `Lint and fast tests` (`139781940703`) — **failed** in full ESLint. Runner reported Linux stack limit 16384 KiB; Node `v22.13.0`; the specified `--stack-size=4096 --max-old-space-size=8192` command hit `FATAL ERROR: ... heap out of memory` and exited 134. The gated Build then passed and Fast tests passed **523/523**. This is not a green lint result.
- `API tests` (`139781940457`) — **failed**. Build passed. API shard 1 had 79/212 passing and 133 failures with `TypeError: fetch failed` from `seedPlayingGame` in `tests/api/harness.mjs:213` during Yue Jin Dauntless tests; shard 2 passed **180/180**. No API retry was run.

The earlier run `45732474325` at `56aa9e13f68675463608428348d40d33c007b02f` also failed inherited lint before running build/fast. It does not affect this exact-SHA result.

## Boundaries and stop point

No game/UI, UX2 or AI worktree, production workflow, Cloudflare resource, secret, remote migration, deployment, or paid resource was changed or created. The sentinel is not a real database ID. ENV-01B remains blocked; FE-01 remains behind GATE-00. **ENV-01A remains unaccepted pending Manager review of this source and the complete CI evidence. Do not start another task or make further source changes without new Owner authorization.**
