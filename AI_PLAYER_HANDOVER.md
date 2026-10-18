# Smart Bot Player — Current Coding Agent Handover

Branch: `feature/smart-bot-player`

Design authority: `docs/AI_PLAYER_DESIGN.md` — AIP-D10 (2026-10-18)

Workflow: `docs/AI_PLAYER_AGENT_WORKFLOW.md` — AIP-AUTO-1

## Current task: PENDING_REVIEW — AIP-01 offline decision prototype

- AIP-00A, AIP-00B and AIP-00C are accepted. AIP-01 is submitted for review as an offline/mock-only prototype; AIP-02 remains DRAFT and depends on AIP-01 acceptance.
- Implementation commit: `e61ae4045a3948038b2ab72058fa689c64282901`. Exact-SHA [Actions run 39137036867](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39137036867) is green. Lint/build/fast, browser startup/room smoke, API tests (294 passed on same-SHA failed-job rerun), and isolated Staging deploy/smoke succeeded. The first API attempt had transient `fetch failed` errors in shard 2; shard 1 passed 167/167. No assertion failure remained on rerun.
- Staging target guard confirmed Worker `three-kingdoms-ai-staging`, its separate D1, and `BOT_AI_ENABLED=false`; no migrations were pending. Mobile Chromium room refresh/rejoin smoke passed 1/1. Production `deploy` was skipped.
- Prototype scope is read-only response choices and legal decline. It has typed V1 request/result contracts, 11 synthetic fixtures, injected mock transport, and fail-closed privacy/stale/malformed/error checks. Focused tests passed 31/31; scoped ESLint, strict TypeScript check, and `git diff --check` passed. Full-repository `tsc --noEmit` reported unrelated diagnostics in untouched modules; scoped TypeScript and CI passed.
- [Reviewer report](docs/AIP-01_OFFLINE_EVALUATION.md) records fixture decisions and validation. No live API request, key read/use, model invocation, paid usage, real-player data transfer, gameplay integration, production change, or Cloudflare resource change occurred.

## Stop condition

Wait for human review of AIP-01. Do not self-accept, start DRAFT AIP-02, or enable live AI/API use. Resume only after the design records the reviewer’s decision or a newly approved independent task.
