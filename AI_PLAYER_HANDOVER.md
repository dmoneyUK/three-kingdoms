# Smart Bot Player — Current Coding Agent Handover

Branch: `feature/smart-bot-player`
Design: `docs/AI_PLAYER_DESIGN.md` — AIP-D19
Workflow: `docs/AI_PLAYER_AGENT_WORKFLOW.md` — AIP-AUTO-1

## Latest relevant result

- AIP-OBS-01 source SHA `21f793231900941951caf7e636bce9b3bccc7f0a`; exact-SHA [Actions run 44935266221](https://github.com/dmoneyUK/three-kingdoms/actions/runs/44935266221), attempt 1, passed lint/fast, API, browser smoke, Staging target guard/deploy and mobile refresh/rejoin smoke (1/1, 3.8m). Production `deploy` was skipped. Staging migration step reported no migrations to apply. Worker version: `ff4d5e9c-863e-4e7b-b395-0403fcf8ed79`; artifact [14718844428](https://github.com/dmoneyUK/three-kingdoms/actions/runs/44935266221/artifacts/14718844428).
- Read-only PU99V query used only AI Staging D1 `62616495-59ea-4a9c-b669-2d3267a83cab`; production D1 `3151997a-f69e-4a45-ab51-9e4fd062aeb3` was excluded. Bot seat 2 had four `consumed` decisions and one `unsupported` / `unsupported_bot_decision` decision at 2026-11-21 16:05:51.893 UTC, revision phase `playing|response`, attempts 1. Query wrote 0 rows and selected no hand/card fields. This proves the decision was unsupported, not that the bot held a physical Dodge.
- Filtered Worker tail observed 14 custom `bot_scheduler` events from CI room `F96YN`; all were `claimed → consumed` transitions with attempts 1 and elapsed times 557–4403 ms. No idle-poll or abnormal scheduler event appeared in that smoke. The PU99V row predates deployment of the logger, so no matching Cloudflare custom event was captured; the prior smoke timeout's root cause remains unproven despite the successful rerun.
- Staging target guard confirmed the exact Staging Worker/D1, production D1 exclusion, `BOT_AI_ENABLED=false`, and `BOT_DIAGNOSTICS_ENABLED=true`. No production deployment or new migration occurred.

## Current task: PENDING_REVIEW — AIP-OBS-01 (AIP-D19, P0)

Add low-volume structured, privacy-safe Staging Bot diagnostics and replace silent scheduler rejection catches. Implementation and exact-SHA CI/Staging smoke are complete; await independent review. The PU99V D1 outcome is identified as an unsupported response, but hidden-card ownership is intentionally unverified.

### Boundaries

- Scope: `worker/index.ts`, `worker/bot-driver.ts`, `worker/bot-diagnostics.ts`, focused tests and the Staging-only diagnostic flag/guard.
- No frontend, public debug API, D1 schema/migration, game-rule/route behavior, OpenAI, external player data or production changes. Keep `BOT_AI_ENABLED=false`; use only guarded AI Staging deployment, with production `deploy` skipped.
- AIP-RSP-01 is gated on independent AIP-OBS-01 acceptance. Do not start it or change AIP-02A/AIP-MOB-01 task states.

### Implementation and validation progress

- Added a fixed JSON schema with bounded fields. Work transition events emit only after the D1 compare-and-set changes the row; retries and failures use fixed error codes. The two scheduler `waitUntil` paths now share one rejection handler that records one sanitized error event. Successful-action diagnostics have a per-wake cap. Diagnostics are enabled only in `env.ai-staging`; the generated-config guard checks the Staging Worker and D1 identity, excludes production D1, and confirms AI remains off.
- Added API coverage for successful draw/decline, unsupported response, duplicate wake/expired lease, stale revision, retry-limit/budget errors, thrown dispatch, no idle/human-turn logs, and repeated wakes. A test-only room filter isolates scheduler assertions; the pre-existing response regression still expects unsupported when a Dodge is available.
- Implemented fixed-schema diagnostics for D1-confirmed transitions and sanitized scheduler rejection; both `waitUntil` paths share one safe rejection handler. Diagnostics are Staging-only and success logs are capped per wake. Local checks: default and AI-Staging builds, focused ESLint, logger/config tests 10/10, bot-scheduler API tests 8/8, generated-target guard, Wrangler dry-run and `git diff --check` all pass.
- CI smoke log sample (decision ID redacted): `{"component":"bot_scheduler","version":1,"event":"bot_work_transition","wakeSource":"cron","level":"info","roomCode":"F96YN","decisionId":"<redacted>","previousStatus":"claimed","nextStatus":"consumed","attempts":1,"elapsedMs":3705}`. The tail count is 14 events for the Staging smoke.

### Resume point

Current source SHA is `21f793231900941951caf7e636bce9b3bccc7f0a`; the exact-SHA CI and guarded Staging smoke passed as recorded above. The D1 query was read-only with zero writes. AIP-OBS-01 is ready for independent review, not self-accepted. Do not start AIP-RSP-01 unless AIP-OBS-01 is independently marked ACCEPTED; do not change AIP-02A or AIP-MOB-01 status.
