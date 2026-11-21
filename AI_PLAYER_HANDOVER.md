# Smart Bot Player — Current Coding Agent Handover

Branch: `feature/smart-bot-player` (isolated local worktree `codex/aip-sync-04-20261119`)
Design: `docs/AI_PLAYER_DESIGN.md` — AIP-D23
Workflow: `docs/AI_PLAYER_AGENT_WORKFLOW.md` — AIP-AUTO-1

## Latest relevant result

- AIP-OBS-01 was explicitly **ACCEPTED by the human Product Owner** on 2026-11-21 20:13 UTC. Its implementation SHA `21f793231900941951caf7e636bce9b3bccc7f0a` passed exact-SHA [Actions run 44935266221](https://github.com/dmoneyUK/three-kingdoms/actions/runs/44935266221), including lint/build/fast, API, browser smoke and guarded AI Staging deploy/mobile refresh-rejoin smoke. Production `deploy` was skipped; no migration was applied. Worker version: `ff4d5e9c-863e-4e7b-b395-0403fcf8ed79`; isolated D1: `62616495-59ea-4a9c-b669-2d3267a83cab`.
- Current source-validated SHA remains `21f793231900941951caf7e636bce9b3bccc7f0a`. Current remote/docs tip is `fa44ad7155c2fc28372f691a3a7877dc86c10945`, six Markdown-only commits later; its latest code-bearing Actions run is the successful run above. AI worktree was clean before this task. The unrelated root UX2 worktree was left untouched.

## Current task: IN_PROGRESS — AIP-RATE-01 (AIP-D23, P0)

Remove only the global hourly Bot-add quota in isolated AI Staging and make the eight-active-room admission count ignore only rooms provably expired by the existing five-minute playing-room idle policy.

### Boundaries

- Preserve host authentication, genuine bot identity, request-ID idempotency, three Bots per room, the eight-live-room cap, and default/root behavior.
- Staging opt-out must be explicit and guarded in the generated Worker config. Do not change production/default config, D1 schema/migrations, game rules, UI, OpenAI settings, or external resources. Do not clear or sweep old D1 rows.
- `heroes` and `playing/resolving` rooms remain counted conservatively; only timed-out `playing` rooms outside `resolving` may be excluded from admission count.
- AIP-02A remains separate offline work; AIP-RSP-01 has not started. Do not start AIP-LOG-01 until this task is independently marked ACCEPTED.

### Progress and validation

- Re-read D23, workflow, handover, source, migrations and current CI. `origin/feature/smart-bot-player` is aligned at docs tip `fa44ad7155c2fc28372f691a3a7877dc86c10945`; no in-flight route edit or dirty source was found. Prior exact-SHA CI run `44935266221` is green for the last source SHA above.
- Implemented the Staging-only hourly-limit opt-out, kept all host/seat/idempotency checks, and updated the atomic eight-room count to ignore only five-minute-expired `playing` rooms outside `resolving`. Added default-limit and 25-add opt-out API coverage, stale/resolving/`heroes` room-cap coverage, test-runner opt-out mode, and generated-config assertions. No route/schema cleanup, migration, UI, production or Cloudflare change has been made locally.
- Local validation passed: default and AI-Staging builds; focused ESLint; fast tests **498/498**; API test instances **402 passed, 2 mode-specific skips, 0 failures** (default 12/hour regression plus opt-out 25-add regression); generated Staging target guard and config tests **6/6**; Wrangler dry-run shows Worker `three-kingdoms-ai-staging`, D1 `62616495-59ea-4a9c-b669-2d3267a83cab`, opt-out `true`, `BOT_AI_ENABLED=false`, and no production D1; `git diff --check`. Exact-SHA CI and guarded remote Staging deployment/mobile smoke remain pending.

### Resume point

Implement only the D23 AIP-RATE-01 scope, validate the real generated Staging binding, then commit and push the focused change. Record exact code SHA, Actions jobs, actual Staging Worker version and test statuses. Production deployment must remain skipped. Submit `PENDING_REVIEW` only after the full gate is green, then stop for human acceptance; do not begin AIP-LOG-01 before that acceptance.
