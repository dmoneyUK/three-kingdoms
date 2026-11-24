# Smart Bot Player — Coding Agent Handover

Branch `feature/smart-bot-player`. Design reviewed at `5c1ad3da`.

## Current task — AIP-PERF-01 (`IN_PROGRESS`)

Implement the review-authorized recovery fix for `TNX5F`'s bare end-turn resolving phase. Preserve the green `dd8f8d6b00dc` target-card settlement and UX2's discard barrier. Use a guarded durable checkpoint shared by ordinary End Turn and committed Discard, with existing member GET/timer and scheduler recovery. Keep pre-repair rooms read-only.

Next proof: inject failed checkpoint and continuation writes, then verify effect, discard, epoch, privacy and replay safety with isolated Worker/D1. Exact-SHA CI and isolated Staging follow the code change. The earlier 10 ms Free CPU plan and observed `Q6YYJ` failures remain open evidence. No old-code hosted retest or Owner acceptance is underway.
