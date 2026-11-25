# Smart Bot Player — Coding Agent Handover

Branch `feature/smart-bot-player` (working branch `codex/aip-staging-safe-delivery-01-final`). Latest design reviewed: AIP-D37 / 2026-11-25. Parent `AIP-PERF-01` remains **CHANGES_REQUESTED**; the only executable slice is `AIP-PERF-01 STAGING-SAFE-DELIVERY-01`. No GET-02, BOT-02, PLAY work, paid service, production change or UX2 change is authorized.

## Current task — STAGING-SAFE-DELIVERY-01 (**IN_PROGRESS**)

Reviewer-specified lifecycle correction is implemented locally and awaiting one consolidated feature-branch delivery: strict Worker/D1/deployment readback and unambiguous active-version ownership, partial-activation capture, paused-baseline no-op containment, independent closure, and bounded 30-minute Staging CI activation/smoke/cleanup budgets. Focused new lifecycle regressions cover partial activation, no-op containment, malformed readback and ambiguous active versions. No gameplay, protocol, schema or production code was changed.

Focused validation so far: `git diff --check`, Node syntax checks, targeted ESLint, and the four newly added lifecycle regressions pass. SHA `5e72b9fff6f443ff05cd8d16f8524651580b2992` passed lint/build/fast, API and browser jobs in Actions `45667565579`, but Staging preflight rejected Cloudflare's valid empty-zone `total_pages=0` response before deployment; production was **SKIPPED**. The bounded 0/1-page readback correction is now the next source submission. PM/UX2 impact: **NO IMPACT**; real iPhone acceptance and parent PERF CPU proof remain separate review gates.

Resume: commit and push the scoped source/workflow/test changes to `feature/smart-bot-player`, wait for the exact-SHA required CI and guarded isolated Staging result, then contain and update this handover with factual deployment/cleanup evidence. Do not repeat hosted smoke on an unchanged runtime or start another task.
