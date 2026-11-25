# Smart Bot Player — Coding Agent Handover

Branch `feature/smart-bot-player` (local worktree `codex/aip-perf-01-20261122`). Latest design reviewed: AIP-D37 / 2026-11-25. Parent `AIP-PERF-01` remains **CHANGES_REQUESTED**; the current bounded slice is `AIP-PERF-01 STAGING-CONTAIN-01`. FREE-CI-FIX-01 is historical and superseded. No GET-02, BOT-02, PLAY work, paid service, production change or UX2 change is authorized.

## Current task — STAGING-CONTAIN-01 (complete; parent CHANGES_REQUESTED)

Safely close the already-deployed AI Staging surface after the failed validation, without redeploying, modifying D1 data, touching Production or starting another monitor/retry. Keep the defeat-handoff source fix and its failed hosted evidence available for independent review.

## Containment and failure evidence

- Before containment at 2026-11-25 13:59 UTC, read-only inventory showed the isolated Worker `three-kingdoms-ai-staging` with public access **enabled**, preview access **enabled**, one `* * * * *` Cron, and zero matching domains, queue consumers or zone routes.
- Using the existing fixed-target pause operation, at `2026-11-25T13:59:21.850Z` the Worker was set to public `false`, preview `false`, and schedules `[]`. Immediate readback confirmed the same plus zero domains, queue consumers and zone routes. No Worker deployment, D1 write, migration or Production operation was performed.
- Cloudflare read-only analytics for `13:59:21Z–14:00:30Z` reported zero Worker requests, zero D1 analytics rows and zero scheduled invocations. No local `wrangler tail`, Playwright, driver or diagnostic process remains. `wrangler d1 migrations list ... --remote --env ai-staging` reported `No migrations to apply`.
- Failure evidence for source SHA `e5072a4c2bb19ea1764da0a9e3b72b2cf84e392e` remains [Actions 45622433984](https://github.com/dmoneyUK/three-kingdoms/actions/runs/45622433984): base Lint/Fast, API and Browser jobs passed; Staging job `139236653778` deployed Worker `872f653b-d5ab-48e7-9245-f764f2166af4`, then the mobile artifact showed Cloudflare **Error 1102** (Ray `a6010c2299be2efd`, 13:37:19 UTC) and the test ultimately timed out after 25 minutes waiting for the post-refresh `/api/rooms` response at `staging-room-reconnect.spec.mjs:417`. This proves a resource-limit page occurred in the smoke, but does not identify the responsible route, defeat-handoff state or CPU hotspot. Production job `139236657485` was **SKIPPED**.
- PM/UX2 impact: **NO IMPACT**. This slice changed no repository source/config/schema/UI and made no production change.

## Source/CI checkpoint and next gate

The retained defeat-handoff source/test SHA is `e5072a4c2bb19ea1764da0a9e3b72b2cf84e392e`; its focused Worker/D1 test was **21/21**, with syntax, targeted ESLint, diff-check and build passing. The containment-only documentation update is separate and does not claim a new code CI run.

Next bounded task: independent review of the sanitized 1102/rejoin evidence and the retained defeat-handoff fix. Do not redeploy, reopen ingress/Cron, repeat the hosted smoke, or start GET-02/BOT-02/PLAY without a new explicit review decision. Parent `AIP-PERF-01` and the defeat-handoff slice remain **CHANGES_REQUESTED**; effective CPU-limit proof, hosted recovery evidence and real iPhone acceptance remain outstanding.
