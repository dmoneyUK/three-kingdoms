# Smart Bot Player — Coding Agent Handover

Branch `feature/smart-bot-player`, worktree `/private/tmp/WTK-AIP-SYNC-04-20261119`. Reviewed complete current design AIP-D33 and `docs/AI_PLAYER_AGENT_WORKFLOW.md`.

## Current task — AIP-EVAL-01 (IN_PROGRESS)

The offline evaluator at `c4981a3247e57ccfceae93e321a87d88c0f87ee1` reports 20/20 synthetic cases: 12 legal selections, one abstention, seven expected rejections, zero model tokens/spend. Current code SHA `cdba99e2fcc48b6d3ceda6ee038d9d6e9c6675f6` contains the evaluator and focused CI repairs. No local test/build/lint suite ran.

Exact-SHA Actions [45035214890](https://github.com/dmoneyUK/three-kingdoms/actions/runs/45035214890), attempt 2: lint/build/fast, API, browser startup smoke and Staging target guard/deploy/migration steps passed; production `deploy` was skipped. The Staging mobile smoke failed after the 280-second first-Bot-turn wait in room `TF565`, at `playing / response`, actor seat 2. Read-only Staging D1 inspection later showed the room had progressed into a subsequent Harvest window; it also showed old inactive Bot rooms and an expired `claimed` work row. This proves post-timeout progress, not the precise reason for the delay; Worker tail yielded no matching diagnostic. No Staging data was changed.

**Current bounded repair:** align the first-turn browser smoke with the later Bot-cycle wait: track authoritative revision progress, allow up to eight minutes total, and fail after three minutes without revision progress. Raise the Playwright/Staging-job ceilings coherently while keeping the test bounded. Do not change scheduler/gameplay behavior or begin AIP-ROLE-01. Push the repair and require all exact-SHA Actions, including Staging mobile smoke, GREEN before submitting AIP-EVAL-01 as `PENDING_REVIEW`.

Boundaries: no local full test/build/lint; no production deploy/migration, UX2 edits, CPU/pacing work, live model/API call, Cloudflare resource creation, or gameplay changes outside the current task. AIP-PERF-01 remains `PENDING_REVIEW` with Owner/Planner.
