# HANDOVER — UX2 §10.71 H4-PLAYER-SOURCE-SEPARATOR-01

**Design reviewed:** current `origin/ux-v2` §10.71 at `134445c96411e61fc74a785fdda0345464083fc9`.

**Latest separate delivery:** §10.70 compact Kirin Bow correction `3e388c57141b2c202198e2f5db0f62cfa300eb64`; exact-SHA [Actions 45474986365](https://github.com/dmoneyUK/three-kingdoms/actions/runs/45474986365) passed and deployed Worker `545ac990-e2c6-4db0-abf4-cf614f2ab006`; `/api/health` HTTP 200. §10.70 remains **PENDING OWNER iPHONE REVIEW**.

**§10.71 implementation:** canonical `formatCommittedPublicOutcomeCopy()` joins verified actor and source with one ordinary space. Audited H4 paths in `game/public-activity.ts`, `app/page.tsx`, `app/public-card-display.tsx`, `game/public-h4-copy.ts`, `app/public-presentation-routing.ts` and public narration helpers; no other generated player/source H4 separator was found. PAC/private copy and genuine punctuation within names/source labels remain unchanged.

**Local validation:** focused Worker API run over 9 affected API files passed **148/148**; focused ESLint and `git diff --check` passed. Initial raw `node --test` invocation could not provide the Worker required by API fixtures; rerunning via `tests/run-tests.mjs` passed.

**§10.71 delivery:** commit `61a929813dfac33abfb53009dc68de65b473e717` pushed to `ux-v2`. Exact-SHA [Actions 45477847408](https://github.com/dmoneyUK/three-kingdoms/actions/runs/45477847408) passed Lint/fast, API, browser smoke, D1 migration, build, Worker deployment and production smoke. Worker `7b4cf1d3-cecf-42c3-9272-3c3ffe9e22cf`; direct `/api/health` returned HTTP 200 `{"ok":true,"worker":"available"}`. §10.70 and §10.71 both remain **PENDING OWNER iPHONE REVIEW**; no UX acceptance is claimed.

**Current review boundary:** Owner iPhone check for §10.71: genuine Kirin Bow and representative skill/HP/transfer H4; confirm the generated player/source long dash is absent, verified names and full copy remain intact, and PAC/private wording is unchanged. No next coding task is started here.
