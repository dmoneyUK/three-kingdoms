# Smart Bot Player — Coding Agent Handover

Branch: `feature/smart-bot-player` · Worktree: `/private/tmp/WTK-AIP-PERF-01-20261122` · Design reviewed: AIP-D35 (2026-11-22).

## Latest accepted baseline

AIP-ROLE-01 and the single AIP-SYNC-02 merge are Owner-accepted in AIP-D35. Current code-bearing baseline is merge SHA `f8813eb5aca048a53a7197ecaea3c9042993a8f1`; exact-SHA [Actions 45066768247, attempt 2](https://github.com/dmoneyUK/three-kingdoms/actions/runs/45066768247) passed and deployed isolated AI Staging Worker version `e0c1dd5e-7402-47bc-81ca-7fd7ecd2c360`. CPU 1102 failures on that version remain open under AIP-PERF-01.

## Current task — AIP-PERF-01 (`IN_PROGRESS`)

Investigate and correct the 2026-11-22 23:04 Staging incident in room `24V7K`: one `/api/rooms` POST and three separate authenticated GET polls hit CPU 1102 on Worker `e0c1dd5e-7402-47bc-81ca-7fd7ecd2c360`. The supplied Logpush analysis is in AIP-D35; its raw export and request tokens must not enter Git or logs. The 101-byte profile contained one 1ms sample, root→idle, and no application stack. Earlier change `c2bf6c1b` removed a duplicate authenticated GET projection; this incident shows further measured investigation is needed.

**Next step:** read-only verify persisted `24V7K` state/pending/work lease, effective AI Staging CPU limit/settings, and profile/CPU telemetry access. Then build the same-fixture long-room measurements specified in AIP-D35 before selecting a source change. No Cloudflare setting has been changed during this task yet. Keep all capture/deploy scope on AI Staging; no production access, migration, quota increase, UX2 edit, or gameplay change. Only task-focused local tests may run; full validation is exact-SHA GitHub Actions. The task stays open until measured Staging GET/POST headroom, no 1102, exact-SHA CI green and one Owner review are documented.
