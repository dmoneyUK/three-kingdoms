# Smart Bot Player — Coding Agent Handover

Branch `feature/smart-bot-player` (local worktree `codex/aip-perf-01-20261122`). Latest design reviewed: AIP-D37 / `8009e578`. `AIP-PERF-01` remains **CHANGES_REQUESTED**; do not start GET-02, BOT-02, PLAY or another hosted retry.

## Current result — FREE-BUDGET-01

Delivery source SHA `3c6fb522ed0161900b7e56a2486a9b59e48816df` skips the duplicate token-hash/authenticated-session query only for a server-minted internal Bot principal. Human authentication remains unchanged; the canonical all-player actor/controller, role, actionRevision, stale/replay, lease and privacy checks remain in the existing POST path.

Checked-in command: `WTK_SOURCE_SHA=3c6fb522ed0161900b7e56a2486a9b59e48816df node --import tsx --test tests/free-budget-benchmark.test.mjs`. The fixed seed `0x5eedf00d` uses 4 seats, 203 public events and 150 Bot-work rows, 5 warmups plus 20 measured samples for unchanged/active GET, both human response actions, final settlement, Bot step, postwrite and Cron classes. It reports local process CPU and wall time separately from synthetic D1 work counts; it is not hosted CPU evidence. Deep-equal projections, private-card absence and valid/wrong-room/wrong-actor/wrong-role/test-seat/stale/replay outcomes are equal before/after. Bot step and postwrite remove exactly one token hash, authenticated session lookup and modeled D1 query; other classes and payload bytes are unchanged.

Focused local evidence: benchmark 1/1; rebuilt Worker; targeted ESLint 0 errors; `git diff --check`; Bot scheduler API 35 passed, 1 conditional skip, 0 failed.

Exact-SHA [Actions 45514264725](https://github.com/dmoneyUK/three-kingdoms/actions/runs/45514264725): Lint/Fast, API and Browser all GREEN; Staging D1 guard/migration and Worker deploy GREEN; Staging Worker Version `a090ca17-9078-4262-889b-21855886bbe2`. Production `deploy` was **SKIPPED**. The required mobile Staging refresh/rejoin smoke FAILED after 13.7 minutes in disposable room `QT3AS`: the room was still `playing`, `draw`, `turnSeat=3`, waiting for a testable human action; D1 showed a pending Dodge response for the human after Bot 4's Attack, with no current Bot work row. This is a hosted progression/smoke blocker, not proof that the narrow lookup change caused the timeout. The fixture was archived in isolated Staging only (`status=finished`, `phase=finished`, `pending_json=NULL`); no production state or diagnostic ingress was changed.

## One next bounded task

Reviewer/PM must review the failed `QT3AS` Bot-cycle smoke and the Free-budget benchmark/`BOT-02` vs `GET-02` decision package. Keep `AIP-PERF-01` **CHANGES_REQUESTED**; do not rerun the same hosted room, claim Free CPU safety, or implement either DRAFT architecture without a new bounded authorization. Owner still needs the separate real iPhone Safari acceptance after engineering evidence is green.
