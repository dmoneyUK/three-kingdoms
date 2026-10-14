# WTK UX2 — Current Handoff

Branch: `ux-v2`

Latest reviewed design: `docs/UX2-refine.md`, blob `7a3672b4ec494c1773a45193ec230e58adf3bc60` (progress marker only; N0 requirements unchanged). The user is performing §8.7 mobile acceptance; this handoff tracks §9.5 N0.

## Latest relevant result

- §8.7 Policy B implementation is deployed. Current live build is `a191c08fb386b32f0d8ab24ecf3788bc86c89f50`; push Actions run [`38607911627`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/38607911627) succeeded. Production `/api/health` returned `{"ok":true,"worker":"available"}`.
- §8.7 remains deployed and awaits the user's phone acceptance. No mobile timing or geometry evidence is claimed here.
- N0 server implementation was pushed as `acfaf968476c4d2bf4b2fb1145e1736205dd24c2`. Actions run [`38617527930`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/38617527930): browser smoke and lint/fast tests passed; API tests failed on two older tests that required the Negation window to remain open after the final explicit Pass; deploy was skipped. The corrected assertions preserve the common window/checkpoint until the final snapshot seat responds, then verify immediate AOE/Duel continuation. Focused equipment API file passes 20/20 and the full local API suite passes 281/281 after this test correction. No deployment or acceptance is claimed yet.

## Current task — UX2 §9.5 N0 delivery verification

Commit the test-only CI correction in `tests/api/equipment.test.mjs` with this handoff/status update, push to `ux-v2`, and verify the exact-SHA API, lint/fast, browser smoke and deploy jobs. Local `npm run test:api` passes 281/281 after the correction. The last CI run's API job failed and deploy was skipped; do not start N1 until a new exact-SHA run succeeds. The user handles §8.7 mobile acceptance.
