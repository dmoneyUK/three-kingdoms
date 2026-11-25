# Smart Bot Player — Coding Agent Handover

Branch `feature/smart-bot-player` (local worktree `codex/aip-perf-01-20261122`). Latest design reviewed: AIP-D37 / 2026-11-25. Parent `AIP-PERF-01` remains **CHANGES_REQUESTED**; the current executable slice is `AIP-PERF-01 DEFEAT-HANDOFF-01`. FREE-CI-FIX-01 is historical and superseded. No GET-02, BOT-02, PLAY work, paid service, production change or UX2 change is authorized.

## Current task — DEFEAT-HANDOFF-01 (IN_PROGRESS)

Repair the confirmed crash window where a current-turn player is defeated with no parent/group continuation: persist death, card/reward/penalty settlement and a private durable handoff checkpoint in one guarded D1 batch, then resume exactly once through the existing authenticated member GET, authorized timer or Bot recovery boundary. The checkpoint must be hidden from every public/private projection and must not alter unrelated Dying, Group, turn-end or causal continuations.

## Implementation checkpoint

- `app/api/rooms/route.ts`: added a private `defeat_handoff` checkpoint parser, guarded death/zone/room settlement, canonical `determineDefeatContinuation` recovery, old-turn-seat CAS fencing for `beginTurnStart`, and recovery hooks before existing recovery checkpoints. Public `roomState` hides the checkpoint and exposes no actionable state while it is unresolved.
- `tests/api/concurrency.test.mjs`: added a real four-seat Duel → shared Dying → no-rescue fixture with pinned roles/heroes/zones, a local D1 trigger interrupt before turn-start, concurrent recovery reads, replay/idempotency, card conservation and private-hand assertions.
- PM/UX2 impact: **NO IMPACT**. No schema, UI, protocol, Cloudflare resource or production change.

## Local validation / next gate

Focused Worker/D1 API file: `GAME_TEST_FILES=tests/api/concurrency.test.mjs GAME_TEST_PORT=3140 GAME_TEST_INSPECTOR_PORT=9240 node tests/run-tests.mjs` — **21 passed, 0 failed**. `node --check`, targeted ESLint, `git diff --check`, and `npm run build` passed. Source/test/design/handover commit is not yet pushed; exact-SHA full GitHub Actions and guarded isolated Staging/mobile validation remain required. Production must be **SKIPPED**.

After exact-SHA CI and safe Staging isolation are verified, update this handover with the source SHA, CI jobs, Staging version/cleanup and residual risks, set only DEFEAT-HANDOFF-01 to **PENDING_REVIEW**, and keep parent AIP-PERF-01 **CHANGES_REQUESTED**. CPU-limit proof and real iPhone 10–15 minute acceptance remain outstanding; do not self-accept.
