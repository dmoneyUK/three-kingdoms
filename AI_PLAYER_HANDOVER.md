# Smart Bot Player — Coding Agent Handover

Branch `feature/smart-bot-player`, worktree `/private/tmp/WTK-AIP-SYNC-04-20261119`. Reviewed the complete current AIP-D33 design and `docs/AI_PLAYER_AGENT_WORKFLOW.md`.

## Previous checkpoint — AIP-EVAL-01 (PENDING_REVIEW)

Exact code SHA `59552a97b6cfde7362ac3bafd3a85e5e8ebca09a`, [Actions 45039156995](https://github.com/dmoneyUK/three-kingdoms/actions/runs/45039156995), succeeded across lint/build/fast, API, browser startup smoke, isolated Staging guards, D1 migration check, Worker deploy and mobile refresh/rejoin smoke (`1 passed`, 8.1m). Staging Worker Version ID `bad1d95f-1445-4b64-b029-1978518bd519`; no Staging migrations were pending; production `deploy` was skipped. The evaluator reported 20/20 synthetic cases (12 legal, 1 abstention, 7 expected rejections), zero model tokens/spend. This is submitted for human review, not accepted. No local suites ran; only static `node --check` and `git diff --check` were used.

## Current task — AIP-ROLE-01 (IN_PROGRESS)

Implement the approved minimal role-aware deterministic Bot hostility guard. Next inspect the live `bot_step` candidate creation/selection/dispatch and canonical candidate/resolver contracts, then implement only the task's pure server-only filter and scoped call sites in `app/api/rooms/route.ts`; add focused pure/API regressions. Required invariants: Loyalist never voluntarily harms the living public Lord, including hostile AOE/Lightning and supported converted/targeted attacks; Rebel prioritizes a legally reachable Lord; Renegade delays Lord attacks while more than two remain and can target Lord in the final duel. Do not read other living players' hidden roles, invent legality, alter human actions, or change canonical rules.

Preserve all existing AIP-PERF-01 edits in `app/api/rooms/route.ts` exactly. No UX2, UI, D1 migration, production deployment, CPU/pacing change, or live OpenAI call. Run only new/modified focused tests locally; no full local suites. Push the scoped task and require exact-SHA GitHub Actions plus isolated Staging smoke green, with production `deploy` skipped. Human Owner/Reviewer acceptance remains required.

Role source changes have not started. AIP-PERF-01 remains `PENDING_REVIEW` with Owner/Planner for CPU profile analysis.
