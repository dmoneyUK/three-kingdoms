# Smart Bot Player — Current Coding Agent Handover

Branch: `feature/smart-bot-player` (isolated local worktree `codex/aip-sync-04-20261119`)
Design: `docs/AI_PLAYER_DESIGN.md` — AIP-D23
Workflow: `docs/AI_PLAYER_AGENT_WORKFLOW.md` — AIP-AUTO-1

## Latest result

- **AIP-RATE-01 code SHA:** `824e79d14d682dd05d5f224ca9155d0149a08838`.
- Exact-SHA [Actions run 44955463000](https://github.com/dmoneyUK/three-kingdoms/actions/runs/44955463000) completed successfully: lint/build/fast, API, browser smoke and AI Staging deploy/mobile smoke succeeded; production `deploy` was skipped. API attempt 1 hit the known Wrangler ProxyWorker `fetch failed`; the configured retry passed (final 404 test instances: 402 passed, 2 mode-specific skips, 0 failures).
- Local checks passed: default and AI-Staging builds, focused ESLint, fast tests 498/498, API tests 402 passed/2 skipped/0 failed, generated config guard/tests 6/6, Wrangler Staging dry-run and `git diff --check`.
- Staging URL: https://three-kingdoms-ai-staging.dai-jinge.workers.dev. Worker version `344cee45-bca7-42d1-8cdf-0bb71589491c`; AI Staging D1 `62616495-59ea-4a9c-b669-2d3267a83cab`. Remote migration step: `No migrations to apply!`. Staging target guard confirmed the quota opt-out is true, `BOT_AI_ENABLED=false`, production D1 excluded. Mobile-emulated reconnect smoke: 1 passed in 5.5m; artifact [14727776258](https://github.com/dmoneyUK/three-kingdoms/actions/runs/44955463000/artifacts/14727776258). No production deploy/migration occurred.

## Current task: PENDING_REVIEW — AIP-RATE-01 (AIP-D23, P0)

The Staging-only hourly Bot-add quota bypass and conservative stale-room admission count are implemented and CI/Staging-validated. The AI Staging owner must still perform the specified real-iPhone check and independently accept this task. CI mobile emulation does not establish iPhone acceptance.

### Boundaries and next gate

- Preserved host authentication, genuine bot identity, request-ID idempotency, three Bots per room, and the eight-live-room cap. Only five-minute-expired `playing` rooms outside `resolving` are excluded; `heroes` and `resolving` remain counted. No stale row was cleaned or mutated.
- No D1 schema/migration, game-rule, UI, OpenAI or production changes. AI remains off. Only AI Staging has `BOT_DEMO_DISABLE_HOURLY_ADD_LIMIT=true`.
- Stop here. Do not start AIP-LOG-01 until the human marks AIP-RATE-01 `ACCEPTED` in the design. After acceptance, re-read the full latest design and reconcile the next task.
