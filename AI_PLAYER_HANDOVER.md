# Smart Bot Player — Coding Agent Handover

Branch `feature/smart-bot-player` (local worktree `codex/aip-perf-01-20261122`). Latest design reviewed: AIP-D37 / remote design `e1aa234cd1d1bbce6d4fa3dc3e023a1993df365c`. Parent `AIP-PERF-01` remains **CHANGES_REQUESTED**; FREE-CI-FIX-01 is the sole current task. Runtime `3c6fb522` and FREE-BUDGET-01R delivery `2ae54900` remain the baseline. Do not repeat the benchmark, start GET-02/BOT-02/PLAY, or run a hosted retry.

## Current task — FREE-CI-FIX-01 (IN_PROGRESS)

Repair only the deterministic role-policy API fixture that failed exact-SHA Actions `45549441478` at `tests/api/bot-scheduler.test.mjs:735` (`expected draw`, `actual response`). Set all four heroes, roles, HP/alive state, hand, equipment, judgement and room skill state deterministically; keep Cao Cao as the Loyalist and preserve the canonical real Bot action path. Add one deterministic companion proving a real End Turn can open a turn-start trigger and that the authorized actor canonically declines it to the next draw phase. No runtime, CI gate, UX2, Cloudflare or production changes.

## Validation / stop gate

Run only the modified focused Bot scheduler API test and `git diff --check` locally. Deliver one source/test + handover commit, push, then verify exact-SHA lint/fast/API/browser and guarded AI Staging/mobile jobs with Production **SKIPPED**. If another failure appears, record its sanitized phase/pending/actor-seat/hero/transition evidence and stop; do not weaken assertions or retry the same SHA. `AIP-PERF-01` stays **CHANGES_REQUESTED** and real Worker CPU/Owner iPhone acceptance remain unproven.
