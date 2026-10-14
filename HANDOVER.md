# WTK UX2 — Current Handoff

Branch: `ux-v2`  
Latest reviewed design: `docs/UX2-refine.md`, blob `a21e26d2fa17dfc8624a43397fefc7d1bd67e31e`

## Latest delivered result

§8.1–§8.4 and §9.4 Gates A–B are delivered pending aggregate user/Reviewer review. Gate A is on `9f2bc6be007065f7b458f70e02964124386de28f`; missing Drizzle snapshot repair is `1306d519afd6094200dfe2e36646b3bb3fa1cdd6`. Gate B privacy regressions are on `a899cf4d792298c0c17bd65ceedb53de82d4caf4`; CI exposed a Stauchness race assertion that incorrectly treated a losing request's in-flight snapshot as settled state. Test-only repair `31e385c94140442df18509d8b35d6ef1bfb91216` passed focused API tests locally and exact-SHA Actions run `38557911474`, including API, browser smoke, lint/fast, D1 migrations, Worker deployment, and production smoke. The earlier deploy failure was a missing Drizzle snapshot that caused duplicate migration generation; fixed in `1306d51` and validated in run `38555940573`.

## Current task

§9.4 Gate C — Client controls, public proof and regression.

Update the Local Dock to submit each viewer's private Negation intent or Pass and reflect only that viewer's submitted state. Suppress all optimistic Negation CardFace/discard/effect presentation; reveal only the server-committed winning card through the existing centre-to-actor-seat presentation. Preserve no-graph UX, public event proof and viewer privacy. Prove the client flow and extend focused regression coverage across shared root/counter windows, supported Group/AOE/Harvest/Judgement Negation, seat counts, skill providers, stale submissions, refresh/reconnect, timers and card conservation. Use authenticated API/browser flows and advance test deadlines without repeated real eight-second sleeps. Run focused local validation, push, then verify exact-SHA CI and deployment. Stop at Gate C for aggregate user/Reviewer review before any deferred Duel visual expansion or §10 card-family work.
