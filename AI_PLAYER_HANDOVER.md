# Smart Bot Player — Current Coding Agent Handover

Branch: `feature/smart-bot-player`
Design: `docs/AI_PLAYER_DESIGN.md` — AIP-D19
Workflow: `docs/AI_PLAYER_AGENT_WORKFLOW.md` — AIP-AUTO-1

## Latest relevant result

- AIP-02A code SHA `59303f85f2370feed788a8b5f2a6ae70cd88ccdf`; exact-SHA [Actions run 44916475813](https://github.com/dmoneyUK/three-kingdoms/actions/runs/44916475813), attempt 1. Lint/fast, API, browser smoke and guarded Staging deployment passed. Staging mobile smoke failed at 15:07 UTC waiting for human Play Phase; latest state was `playing / draw / turnSeat=3` with BOT 4 still thinking. Production `deploy` was skipped. Staging Worker version: `9f4eeae6-c2ea-4426-8dfc-5285f8159fc9`.
- Read-only PU99V inspection used only AI Staging D1 `62616495-59ea-4a9c-b669-2d3267a83cab`; production D1 was excluded. Bot seat 2 had four `consumed` decisions and one `unsupported` decision with `unsupported_bot_decision` at 16:05:51.893 UTC; the revision tag identifies `playing|response`. Attempts were 1. No hand/card data was queried, so this does not prove the bot held a physical Dodge.
- Staging `/api/health` returned HTTP 200 and `{"ok":true,"worker":"available"}`. Staging D1 UUID is `62616495-59ea-4a9c-b669-2d3267a83cab`, distinct from production UUID `3151997a-f69e-4a45-ab51-9e4fd062aeb3`; `BOT_AI_ENABLED=false`. No D1 writes or migrations were performed for the PU99V inspection.

## Current task: IN_PROGRESS — AIP-OBS-01 (AIP-D19, P0)

Add low-volume, structured, privacy-safe Staging Bot diagnostics and replace silent scheduler rejection catches. Use the new events and existing server state to diagnose the delayed Staging smoke, then rerun the exact-SHA Staging smoke after required checks pass.

### Boundaries

- Scope: `worker/index.ts`, `worker/bot-driver.ts`, `worker/bot-diagnostics.ts`, focused tests and the Staging-only diagnostic flag/guard.
- No frontend, public debug API, D1 schema/migration, game-rule/route behavior, OpenAI, external player data or production changes. Keep `BOT_AI_ENABLED=false`; use only guarded AI Staging deployment, with production `deploy` skipped.
- AIP-RSP-01 is gated on independent AIP-OBS-01 acceptance. Do not start it or change AIP-02A/AIP-MOB-01 task states.

### Implementation and validation progress

- Added a fixed JSON schema with bounded fields. Work transition events emit only after the D1 compare-and-set changes the row; retries and failures use fixed error codes. The two scheduler `waitUntil` paths now share one rejection handler that records one sanitized error event. Successful-action diagnostics have a per-wake cap. Diagnostics are enabled only in `env.ai-staging`; the generated-config guard checks the Staging Worker and D1 identity, excludes production D1, and confirms AI remains off.
- Added API coverage for successful draw/decline, unsupported response, duplicate wake/expired lease, stale revision, retry-limit/budget errors, thrown dispatch, no idle/human-turn logs, and repeated wakes. A test-only room filter isolates scheduler assertions; the pre-existing response regression still expects unsupported when a Dodge is available.
- Local checks pass after the assertion correction: default and AI-Staging builds; focused ESLint; 10 logger/Staging-guard unit tests; 8 bot-scheduler API tests; generated Staging target guard and Wrangler dry-run; `git diff --check`. The guard confirms the expected Staging Worker/D1, production D1 exclusion, `BOT_AI_ENABLED=false`, and diagnostics enabled only in AI Staging. The dry-run binds only the Staging D1.
- Implementation commit `822afb1f59eff00d562dfabe35fa412ef27c03ac` is pushed. Exact-SHA [Actions run 44934168275](https://github.com/dmoneyUK/three-kingdoms/actions/runs/44934168275): lint/fast and browser smoke passed; API failed in the new decline duplicate-log assertion because a later bot decision in the same room correctly emitted its own `unsupported` transition. The original decline decision did not duplicate; the local assertion is now scoped to its decision ID and the focused API harness passes 8/8. Staging and production deployment were skipped because API failed. The prior P0 smoke remains unrerun.

### Resume point

Current pushed code SHA is `822afb1f59eff00d562dfabe35fa412ef27c03ac`; the worktree contains one focused regression-test correction scoped to the original decline decision ID. The corrected API harness passes 8/8; default and AI-Staging builds, focused lint, 10 logger/Staging-guard tests, Staging target guard, dry-run, and `git diff --check` also pass. The exact-SHA run for `822afb1f...` remains failed in API because of the now-corrected assertion, so no Staging deployment occurred on that SHA. The earlier failed smoke artifact remains [here](https://github.com/dmoneyUK/three-kingdoms/actions/runs/44916475813/artifacts/14711424290); it captured BOT 4 thinking while the room remained in Draw Phase, and later D1 aggregate activity showed progress without proving why the smoke waited. Next: commit/push only AIP-OBS-01 files, then watch the new exact-SHA required checks and guarded Staging smoke while capturing sanitized Worker events. Report `PENDING_REVIEW` only if all required jobs and the smoke pass; otherwise record the precise blocker. Cloudflare request events are independent of this custom logger's event count.
