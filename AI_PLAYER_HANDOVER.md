# Smart Bot Player — Coding Agent Handover

Branch `feature/smart-bot-player` (local worktree `codex/aip-perf-01-20261122`); latest design reviewed `8b90e7e8` / AIP-D37. `AIP-PERF-01` remains `CHANGES_REQUESTED`, not accepted. Do not start AIP-PERF-GET-02, AIP-PERF-BOT-02 or PLAY work.

## Delivered bounded fix

Code SHA `49fd9c734ac70ca5471c2d0e3e38083d5e74f764` removes the old three sequential four-step post-write passes. `worker/postwrite-bot-scheduler.ts` invokes the existing room-scoped scheduler once with `maxStepsPerWakeup: 1`; Cron, the general four-step scheduler limit, lease/CAS, action budget, role policy and canonical handlers are unchanged. Focused regressions cover injected call count, sequential durable wakes, and the existing 203-public-event/150-Bot-work long-room privacy/card/replay path. Local evidence: Worker regression 2/2 pass; modified API file 35 pass, 1 pre-existing opt-out skip, 0 fail; targeted ESLint and `git diff --check` pass.

Exact-SHA [Actions 45475568347](https://github.com/dmoneyUK/three-kingdoms/actions/runs/45475568347) for this code SHA passed API, lint/build/fast, browser startup/H4 and isolated AI Staging deploy/mobile refresh-rejoin; Production `deploy` was `skipped`. Staging URL was `https://three-kingdoms-ai-staging.dai-jinge.workers.dev`, isolated D1 `three-kingdoms-ai-staging-db`, Worker Version `ed17638c-be57-4b4a-b482-6e7bb7e9d816`, with `BOT_AI_ENABLED=false`.

## Long-room gate result / blocker

One disposable Staging fixture `X3QAG` ran 2026-11-24 20:23:20–20:30:04 UTC on that version. It started with 203 public records and 150 seeded Bot-work rows, reached 36 revisions and 2 target-card settlements, and ended at 200 retained records/193 Bot-work rows/38 live consumed rows before the driver’s HTTP/2 fetch was terminated by repeated CPU failures. Tail observed 231 GET 200, 9 GET HTTP 503 `exceededCpu` plus one GET `exceededCpu` without a response status; POST 49 HTTP 200, one 409 and 3 HTTP 503 `exceededCpu`; three Cron wakes were observed, including one four-decision Cron at 149ms CPU/44,970ms wall. Aggregate sampled GET CPU P50/P95/P99/max was 8/17/24/41ms; POST was 54/95/116/116ms. D1 analytics for the bounded window reported 4,535 read queries/280,037 rows read and 549 writes/2,072 rows written. Effective CPU limit remains UNKNOWN.

The driver proved two target-card settlements, a stale replay 409 and no duplicate card mutation before failure, but did not reach its final privacy/rejoin probes. Cleanup completed: room archived `finished`, tail stopped, no Staging ingress/previews, Cron schedules, domains, queues or zone routes remained. Because POST and GET `exceededCpu` recurred, AIP-D37’s post-fix CPU gate is failed; this change must not be marked `PENDING_REVIEW` as CPU-safe.

## Required next step

Stop for Planner/Reviewer direction on a second narrowly scoped, source-backed CPU proposal. The remaining evidence points to the canonical `roomState`/projection work still executed by authenticated GETs and final POST settlement (`app/api/rooms/route.ts`), while tail decision diagnostics show no multi-decision post-write aggregation; exact hotspot and effective limit are still unproven. Do not start a broad GET refactor, six-hour loop, new infrastructure, production action or another hosted run. PM/UX2 impact: `NO IMPACT`; human iPhone Safari acceptance remains a separate Owner gate.
