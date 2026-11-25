# Smart Bot Player — Coding Agent Handover

Branch `feature/smart-bot-player`. Latest design reviewed: AIP-D38 / 2026-11-25. Parent `AIP-PERF-01` remains **CHANGES_REQUESTED**; no GET-02, BOT-02, PLAY work, paid service, production change or UX2 change is authorized.

## STAGING-SAFE-DELIVERY-01 — delivered; **PENDING_REVIEW with hosted-smoke blocker**

Final source SHA: `ea8e0270236987895d38e8c30521325a940b7426`, pushed to `feature/smart-bot-player`. Focused lifecycle regressions (partial activation, paused-baseline no-op, malformed readback, ambiguous active versions) pass with diff-check, syntax and targeted ESLint. Reviewer corrections now prove the fixed account/Worker/D1, strict readbacks, version-owned run tag, independent containment and bounded 30-minute activation/smoke budget.

Exact-SHA Actions [45670682073](https://github.com/dmoneyUK/three-kingdoms/actions/runs/45670682073): lint/build/fast, API and browser jobs **GREEN**; isolated Staging preflight, build/config/dry-run, D1 migration, deployment and ownership capture **GREEN**; production `deploy` **SKIPPED**. Staging Worker `three-kingdoms-ai-staging`, isolated D1 `62616495-59ea-4a9c-b669-2d3267a83cab`, deployed version `ff281fc0-be75-4e69-bd63-ccb3dc0cb8c2` with version tag `aip-staging-45670682073-ea8e0270236987895d38e8c30521325a940b7426`.

Hosted smoke created fresh room `UV89N` and observed genuine Bot progression (Bot 2 attack, Bot 3/Bot 4 waiting), but failed before the refresh/rejoin assertion on `GET /api/rooms` with `ECONNRESET` at 18:15:59 UTC. This run does not prove CPU safety or successful rejoin; no 1102 was reported in this artifact. Automatic containment then succeeded: public=false, preview=false, Cron=[], matching routes/domains/queue consumers=0, with final readback in the lifecycle artifact. No production operation occurred. PM/UX2 impact: **NO IMPACT**; real iPhone acceptance and parent PERF CPU proof remain separate.

Resume only after Reviewer/Owner decides whether the hosted `ECONNRESET` is an in-scope correction. Do not repeat hosted smoke on this unchanged runtime or start another task.
