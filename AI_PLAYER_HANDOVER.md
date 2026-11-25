# Smart Bot Player — Coding Agent Handover

Branch `feature/smart-bot-player` (local worktree `codex/aip-perf-01-20261122`). Latest design reviewed: AIP-D37 / remote design `e1aa234cd1d1bbce6d4fa3dc3e023a1993df365c`. Parent `AIP-PERF-01` remains **CHANGES_REQUESTED**; FREE-CI-FIX-01 is the sole current task. Runtime `3c6fb522` and FREE-BUDGET-01R delivery `2ae54900` remain the baseline. Do not repeat the benchmark, start GET-02/BOT-02/PLAY, or run a hosted retry.

## Current task — FREE-CI-FIX-01 (CHANGES_REQUESTED — Staging smoke blocker)

Repair only the deterministic role-policy API fixture that failed exact-SHA Actions `45549441478` at `tests/api/bot-scheduler.test.mjs:735` (`expected draw`, `actual response`). Set all four heroes, roles, HP/alive state, hand, equipment, judgement and room skill state deterministically; keep Cao Cao as the Loyalist and preserve the canonical real Bot action path. Add one deterministic companion proving a real End Turn can open a turn-start trigger and that the authorized actor canonically declines it to the next draw phase. No runtime, CI gate, UX2, Cloudflare or production changes.

## Validation / stop gate

Run only the modified focused Bot scheduler API test and `git diff --check` locally. Deliver one source/test + handover commit, push, then verify exact-SHA lint/fast/API/browser and guarded AI Staging/mobile jobs with Production **SKIPPED**. If another failure appears, record its sanitized phase/pending/actor-seat/hero/transition evidence and stop; do not weaken assertions or retry the same SHA. `AIP-PERF-01` stays **CHANGES_REQUESTED** and real Worker CPU/Owner iPhone acceptance remain unproven.

## FREE-CI-FIX-01 result / blocker

Code/test SHA `f8f1777c1fdb809cd0d4d76ed92dcd0cf46c8a49` passed the focused local `bot-scheduler.test.mjs` run (36 passed, 1 skipped, 0 failed) and `git diff --check`. Exact-SHA Actions run [45580400480](https://github.com/dmoneyUK/three-kingdoms/actions/runs/45580400480) passed Lint/Fast (job `139088704178`), API (job `139088703810`, including the deterministic Loyalist fallback and turn-start trigger companion), and browser H4 smoke (job `139088704284`). Production `deploy` was **SKIPPED**.

Guarded AI Staging job `139091666101` passed target guards (9/9), build, generated-config isolation, dry-run, D1 migrations and Worker deployment at `https://three-kingdoms-ai-staging.dai-jinge.workers.dev`, Version `d0b4a924-1293-42f7-9b9d-ac70b79a2ca0`; the final mobile room refresh/rejoin smoke failed after 20.0 minutes. Sanitized evidence only: disposable room `PR9SZ`, latest state `status=playing`, `phase=play`, `turnSeat=2`; the browser context showed `Connection interrupted. Reconnecting…`, no human `currentAction`, three Bots waiting, one defeated Bot, and no testable human action. This is a different failure from the repaired API fixture; no runtime diagnosis is claimed and no hosted retry or benchmark repeat is authorized. Task remains **CHANGES_REQUESTED** pending independent review of the Staging liveness/connection failure; parent `AIP-PERF-01` remains **CHANGES_REQUESTED**.
