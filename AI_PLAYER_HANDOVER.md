# Smart Bot Player — Coding Agent Handover

Branch `feature/smart-bot-player` (local worktree `codex/aip-perf-01-20261122`); latest design reviewed `8b90e7e8` / AIP-D37. `AIP-PERF-01` remains `IN_PROGRESS / CHANGES_REQUESTED`, not accepted. Do not start AIP-PERF-GET-02, AIP-PERF-BOT-02 or PLAY work.

## Current result

The bounded CPU repair is implemented locally, with source commit/CI evidence pending. `worker/index.ts` no longer aggregates up to three sequential four-step post-write passes. It now calls `worker/postwrite-bot-scheduler.ts`, which invokes the existing room-scoped `runBotScheduler` exactly once with `maxStepsPerWakeup: 1`; Cron, the general four-step scheduler limit, leases/CAS, action budgets, role policy and canonical game handlers are unchanged. Remaining `bot_work` stays durable for later room-scoped or Cron wakes; this change does not prove one Bot step cannot itself exceed CPU.

Focused regressions cover injected post-write dispatch count and sequential durable wakes (`tests/postwrite-bot-scheduler.test.mjs`), plus the existing 203-public-event/150-Bot-work long-room, shared-response, duplicate/expired-claim, privacy and card-conservation path (`tests/api/bot-scheduler.test.mjs`). Local evidence: Worker regression 2/2 pass; modified API file 35 pass, 1 pre-existing hourly-limit opt-out skip, 0 fail; targeted ESLint and `git diff --check` pass.

## Required next step

Commit and push the source/test change, then verify every required GitHub Actions job for the exact code SHA (lint/build/fast/API/browser and isolated AI Staging; Production must be `SKIPPED`). If exact-SHA CI is green, perform one controlled 10–15 minute isolated Staging room with the AIP-D37 CPU/status/recovery/privacy checks, then close any temporary ingress/Cron/diagnostics. If any POST CPU failure remains, stop and propose the next narrowly scoped source fix; do not refactor GET or start another task.

PM/UX2 impact: `NO IMPACT` — no shared UI, projection, protocol, D1 schema, UX2 or client change. Human iPhone Safari acceptance remains a separate Owner gate; the Agent must submit `PENDING_REVIEW` and cannot self-accept.
