# Smart Bot Player — Coding Agent Handover

Branch `feature/smart-bot-player` (local worktree `codex/aip-perf-01-20261122`). Latest design reviewed: AIP-D37 / 2026-11-25. Parent `AIP-PERF-01` remains **CHANGES_REQUESTED**; the current executable slice is `AIP-PERF-01 DEFEAT-HANDOFF-01`. FREE-CI-FIX-01 is historical and superseded. No GET-02, BOT-02, PLAY work, paid service, production change or UX2 change is authorized.

## Current task — DEFEAT-HANDOFF-01 (CHANGES_REQUESTED)

Repair the confirmed crash window where a current-turn player is defeated with no parent/group continuation: persist death, card/reward/penalty settlement and a private durable handoff checkpoint in one guarded D1 batch, then resume exactly once through the existing authenticated member GET, authorized timer or Bot recovery boundary. The checkpoint must be hidden from every public/private projection and must not alter unrelated Dying, Group, turn-end or causal continuations.

## Implementation checkpoint

- `app/api/rooms/route.ts`: added a private `defeat_handoff` checkpoint parser, guarded death/zone/room settlement, canonical `determineDefeatContinuation` recovery, old-turn-seat CAS fencing for `beginTurnStart`, and recovery hooks before existing recovery checkpoints. Public `roomState` hides the checkpoint and exposes no actionable state while it is unresolved.
- `tests/api/concurrency.test.mjs`: added a real four-seat Duel → shared Dying → no-rescue fixture with pinned roles/heroes/zones, a local D1 trigger interrupt before turn-start, concurrent recovery reads, replay/idempotency, card conservation and private-hand assertions.
- PM/UX2 impact: **NO IMPACT**. No schema, UI, protocol, Cloudflare resource or production change.

## Local validation / exact-SHA CI

Focused Worker/D1 API file: `GAME_TEST_FILES=tests/api/concurrency.test.mjs GAME_TEST_PORT=3141 GAME_TEST_INSPECTOR_PORT=9241 node tests/run-tests.mjs` — **21 passed, 0 failed**. `node --check`, targeted ESLint, `git diff --check`, and `npm run build` passed. Source/test/design/handover SHA `e5072a4c2bb19ea1764da0a9e3b72b2cf84e392e` is pushed to `feature/smart-bot-player`.

Exact-SHA Actions [45622433984](https://github.com/dmoneyUK/three-kingdoms/actions/runs/45622433984) used that head SHA. Lint/Fast job `139233831048`, API job `139233831546`, and Browser job `139233831683` passed. Production job `139236657485` was explicitly **SKIPPED**. Guarded AI Staging job `139236653778` passed target guard, build, D1 migration check (`No migrations to apply`), and Worker deployment (Version `872f653b-d5ab-48e7-9245-f764f2166af4`, isolated URL `https://three-kingdoms-ai-staging.dai-jinge.workers.dev`), but `staging-room-reconnect.spec.mjs:110` failed after the 25-minute test timeout while waiting for a post-refresh `/api/rooms` GET response (`page.waitForResponse` at line 417). The log does not establish a defeat-handoff state or CPU cause; no acceptance is claimed.

The GitHub job ended and no independent local monitor/diagnostic process remains. Its log contains no post-run Cloudflare ingress/Cron/diagnostic shutdown step, so remote Staging cleanup is **not claimed**. Do not start another hosted retry, manual long room, GET-02/BOT-02/PLAY work, or production action without an independent review decision.

Next bounded task: independent review of the Staging refresh/rejoin timeout and safe cleanup decision. If that gate is later cleared, rerun only an authorized exact-SHA/changed-SHA validation; otherwise keep DEFEAT-HANDOFF-01 and parent AIP-PERF-01 **CHANGES_REQUESTED**. Effective Worker CPU-limit proof, hosted recovery evidence, and real iPhone 10–15 minute acceptance remain outstanding; do not self-accept.
