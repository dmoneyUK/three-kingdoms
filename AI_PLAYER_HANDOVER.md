# Smart Bot Player — Coding Agent Handover

Branch: `review/aip-perf-bot-02` (non-deploying). Latest design reviewed from `origin/feature/smart-bot-player`: **AIP-D46 / 2026-11-26**, including §0B and §7.2D PM-D44/D45. Owner-approved bounded task: **AIP-PERF-BOT-02-CLOSE-01**. R1 JSON micro-optimization is deferred; GET-02, PLAY and UX3 are not started.

## AIP-PERF-BOT-02-CLOSE-01 — **PENDING_REVIEW**

Implemented only the approved R2/S1/S2/S3 boundaries and actual runtime counters, preserving the reviewed CORR-01 baseline:

- **R2:** terminal proof now receives the exact in-process Bot execution context at canonical checkpoint/response/dying/group/duel/attack settlement paths; the old room-UUID/code context lookup is gone. Input revision is classified stale before `waiting_for_human`, and the focused replay regression expects a 409 stale result.
- **S1:** lifecycle room guard accepts complete zero-row inventories, binds non-baseline reads to the owned Worker/version/fixed D1, tracks exactly one fresh smoke-room fingerprint, rejects old-room mutation, identity loss, and a second/new room, and supervises the read-only monitor concurrently with Playwright.
- **S2:** request/diagnostic failures are categorical and credential-free, dynamic raw/encoded secret masking is registered, unsafe trace/HAR/screenshot/network artifacts are excluded, and the final upload is an explicit allowlist with fail-closed content scanning.
- **S3:** self-derived `STAGING_EXPECTED_SHA` authorization was removed. Hosted admission requires externally supplied exact SHA, exact run ID, expiry, S1/S2, historical-credential and controlled-access evidence; T0 is recorded before any Staging mutation with the bounded active/closure budget. This branch remains blocked from deployment by workflow guards.
- **Runtime evidence:** `BotRuntimeCounters` are private to the driver and returned only by the test-only scheduler endpoint. The real local Worker/D1 fixture reports room-state calls, compact short-circuits, JSON/request counters and diagnostic D1 reads without exposing them in public outcomes.

Focused validation on the final working tree:

- `node --test tests/ai-staging-lifecycle.test.mjs tests/browser/staging-room-reconnect-diagnostics.test.mjs tests/browser/staging-room-reconnect-logic.test.mjs`: **34 pass, 0 fail**.
- `tests/api/bot-scheduler.test.mjs`: **37 tests, 36 pass, 1 skipped, 0 fail**; the long fixture exercised **203 public events / 150 Bot Work rows**, including lease/replay, checkpoint recovery, shared responses, privacy and terminal-match regressions.
- Real local Worker/D1 benchmark (`FREE_BUDGET_RUNTIME_WARMUPS=1`, `FREE_BUDGET_RUNTIME_SAMPLES=3`): **1 pass**; same fixture **203 events / 150 Bot Work rows**, 4 authenticated viewers and 3 measured samples per path. Runtime counters per scheduler wake: `roomStateCalls=1`, `compactProjectionShortCircuits=1`, `fullViewerProjectionCalls=0`, `requestJsonEncodes=2`, `requestJsonParses=2`, `responseJsonParses=0`, `diagnosticD1Reads=0`. Wall/process CPU are reported separately; local Wrangler exposes neither Cloudflare Worker CPU nor hosted D1 telemetry, so no Free-plan CPU claim is made.
- `npm run build`, targeted ESLint, and `git diff --check`: pass. Standalone `tsc --noEmit` remains a known repository baseline failure (missing Cloudflare type declarations and unrelated existing errors), not a CLOSE-01 gate.

Source commit and exact-SHA GitHub Actions evidence will be recorded here after the initial review-branch push. Staging and Production are not deployed or activated; both deploy jobs must remain **SKIPPED** for the exact source SHA. No Cloudflare resource, D1 migration, OpenAI call, feature-branch merge or production operation was performed.

## Current bounded task

Wait for independent AI Planner and PM review of CLOSE-01. Agent does not self-accept and must not start GET-02, PLAY or UX3.
