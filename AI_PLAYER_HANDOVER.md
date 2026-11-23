# Smart Bot Player — Coding Agent Handover

Branch: `feature/smart-bot-player` · Isolated worktree: `/private/tmp/WTK-AIP-PERF-01-20261122` · Planner design reviewed: AIP-D35.

## Current task — AIP-PERF-01 (`IN_PROGRESS`)

Correct the 2026-11-22 23:04 CPU 1102 incident in Staging room `24V7K`, Worker version `e0c1dd5e-7402-47bc-81ca-7fd7ecd2c360`. The incident had one `/api/rooms` POST and three separate GET failures. Raw Logpush data and request tokens stay out of Git and logs. Preserve Owner-accepted AIP-ROLE-01/AIP-SYNC-02; no UX2/gameplay changes, production reads/writes, production migrations, Cloudflare quota changes, or live model calls.

## Findings and current implementation

- Read-only D1 inspection found a valid `playing/response` group continuation and no active scheduler lease. The 23:04 work item later became `stale/revision_changed`; subsequent work and audit actions show the room progressed. Whether the failed decline committed is unproven. D1 reads made no changes.
- Cloudflare still serves the earlier AI Staging Worker at 100%. Its settings show `invocation_logs=false`, logs persisted at 100%, traces off, and no explicit `limits.cpu_ms`; no settings were changed. One self-filtered Worker Tail GET measured 23 ms CPU / 128 ms Worker wall time / HTTP 200; an earlier sample measured 13 / 96 ms. These are successful invocation samples, not the effective limit.
- The logged-in Workers plans page marks **Free** current and lists 10 ms maximum CPU per invocation. Yet the active Staging Worker Metrics page shows 20.8 ms median CPU and 24-hour CPU percentiles P50 27.9, P90 49.05, P99 95.68, P99.9 120 ms, alongside 51 CPU-limit errors. This conflict leaves the effective runtime limit unresolved; do not infer it from either the plan label or absent override. Invocation logs remain off because URLs can carry session tokens.
- A five-second Cloudflare profile again had no application stack; one capture window showed six unexplained 503 GETs. Later direct GETs returned 200. These are not a confirmed CPU root cause or fix.
- Current candidate in `app/api/rooms/route.ts` returns one latest `bot_work` status per Bot via `ROW_NUMBER()` ordered exactly by `updated_at DESC, created_at DESC, decision_id DESC`, instead of transferring and reducing the entire room history in JavaScript. The focused regression now has 203 public events, 150 historical Bot rows, four seats, a private hand, a real shared Negation with three Bot passes, and a defeated seat; it checks the canonical continuation, latest public Bot status, and privacy.
- Same-fixture local Worker Inspector comparison: 200 public events, 152 work rows, four seats/one defeated, real shared Negation, 76,732-byte GET response. Old query: five requests, sampled non-idle CPU mean 9.07 ms (range 6.37–12.52); candidate: five requests, mean 8.26 ms (range 7.53–8.85). Both runs passed; sample intervals are sparse, so this is a local estimate, not Staging CPU or proof that 1102 is fixed.
- `npm run build` passed. Focused `bot-scheduler.test.mjs` completed 29 passed / 1 skipped / 0 failed on the final run; an earlier run had one unrelated role-policy assertion fail once and it passed on rerun. The focused Inspector profile passed 1/1. Full local suites are not authorized or needed; exact-SHA GitHub Actions is the full gate.

## Next bounded step

Run focused ESLint and `git diff --check`, remove only task-local diagnostics, commit and push the scoped source/test/design/handover change. Verify the exact-SHA Actions lint/build/fast/API/browser and isolated AI Staging deploy/smoke; production deploy must be skipped. Then measure representative long-room Staging GET and Bot POST CPU on the deployed version, verify bot/Negation progress and privacy, compare actual CPU with a reconciled effective limit, and confirm no 1102. Keep AIP-PERF-01 `IN_PROGRESS` until that evidence is complete; then hand over as `PENDING_REVIEW` for one Owner iPhone recheck. Do not start AIP-PACE-01.
