# Smart Bot Player — Coding Agent Handover

Branch `feature/smart-bot-player`, worktree `/private/tmp/WTK-AIP-SYNC-04-20261119`. Reviewed design AIP-D30 and workflow AIP-AUTO-2.

## Current task — AIP-EVAL-01 (IN_PROGRESS)

Build the independent offline benchmark using accepted AIP-01 only. Reuse its 11 fixed fixtures, add negative/privacy/abstention cases, keep the report synthetic, and validate in exact-SHA GitHub Actions. This slice has no runtime wiring or dependency on CPU/pacing acceptance. AIP-PACE-01 remains gated on performance acceptance and UX2 triage. The UX2 reports are with their own Planner.

Previous checkpoint — AIP-PERF-01 is **PENDING_REVIEW** per Owner; the Owner is collecting the CPU Profiler and the Planner will lead analysis. Final code `9b6f41205ea683f85792314447ed8b54393d7a44` is tracked in [Actions 45030900332](https://github.com/dmoneyUK/three-kingdoms/actions/runs/45030900332); lint/build/fast and browser smoke passed, API/Staging release were unconfirmed when handed off. Two full authenticated GET projections became one, with existing discard handoff and authorization preserved. R3RRX's exact root hotspot and CPU improvement remain unverified. Previous complete AI baseline is `80d275b5` / [Actions 45008320802](https://github.com/dmoneyUK/three-kingdoms/actions/runs/45008320802), Staging version `c2d25947-ffae-4bff-8c86-dab64214c45b`; all jobs required for that release passed and production was skipped.
