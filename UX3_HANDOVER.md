# UX3 Handover

## Current unit

**UX3-ENV-01A — independent environment preparation.** Preparation is pushed. Exact-SHA Actions is complete with one inherited lint failure; await independent Manager review. Do not self-accept this delivery.

- Branch: `ux3`
- Source commit: `56aa9e13f68675463608428348d40d33c007b02f`
- Preparation baseline before concurrent documentation-only updates: `8a87ee7f7e80c3ee9ffc5d5328c5b744497c617b`
- Current documentation baseline before implementation: `94c0164d` (design D05 / workflow AUTO-02); ENV-01A scope and no-remote-write gates were re-read and remain unchanged.
- Original UX2 runtime fork: `136c2788a2589b536d7a8883c7bad8d961690fca`

## Result

- Added only `env.ux3-staging` to `wrangler.jsonc`, with Worker `three-kingdoms-ux3-staging`, D1 `three-kingdoms-ux3-staging-db`, zero UUID preparation sentinel, `workers_dev=false`, and `preview_urls=false`. The top-level production Worker/D1 settings are unchanged.
- Added offline-only preparation/hosted validation modes and negative tests. The verifier never invokes Wrangler or Cloudflare and does not print config values.
- Registered the tests in the fast suite and added a CI-only generated-config job. Existing push-only `ux3` workflow still has read-only contents permission and no deployment, secret, or remote migration step.

## Local validation

- `CLOUDFLARE_ENV=ux3-staging npm run build` — passed.
- Generated `dist/server/wrangler.json` readback — `targetEnvironment=ux3-staging`, exact staging Worker/D1 names, sentinel UUID, one D1 binding, `workers_dev=false`, `preview_urls=false`.
- `node --test tests/ux3-staging-config.test.mjs` — 42/42 passed.
- Targeted ESLint for the verifier, tests, and fast runner — passed.
- Generated-config CLI guard and `git diff --check` — passed.

## Exact-SHA CI

[Run `45732474325`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/45732474325), head SHA `56aa9e13f68675463608428348d40d33c007b02f`: overall **failure**.

- `UX3 staging config guard` — passed, including a local staging-config build and generated-config verifier.
- `API tests` — passed.
- `Browser smoke` — passed.
- `Lint and fast tests` — failed in full ESLint at `app/page.tsx:4163`, `react-hooks/rules-of-hooks`, `RangeError: Maximum call stack size exceeded`. Its later build and `test:fast` steps were skipped. The original UX3 workflow run `45729747676` at `972e80503e0444dda56e3582f5bfdc295a2a68b6` failed at the same file, line, and rule. No lint rule was changed and the unchanged failure was not rerun.
- Actual run inventory contained only these four jobs; no deploy job was present. The separate deploy workflow is unchanged and remains scoped to `main` / `ux-v2`.

## Boundaries and resume point

No game logic/UI, UX2/AI worktree, production workflow, Cloudflare resource, secret, remote migration, deployment, or paid resource was changed or created. The sentinel is not a real database ID. ENV-01B remains blocked pending separate Manager release; FE-01 remains behind GATE-00. **The only current unit is independent Manager review of ENV-01A, including disposition of the inherited exact-SHA lint failure.**
