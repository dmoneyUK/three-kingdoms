# Smart Bot Player — Current Coding Agent Handover

Branch: `feature/smart-bot-player`
Design: `docs/AI_PLAYER_DESIGN.md` — AIP-D16 (2026-11-03)
Workflow: `docs/AI_PLAYER_AGENT_WORKFLOW.md` — AIP-AUTO-1

## Current task: PENDING_REVIEW — AIP-MOB-01 M0–M6 delivered; consolidated human mobile review pending

The Product Owner authorized the continuous deterministic Staging-only M0–M6 task on 2026-11-04. The owner also confirmed AIP-01 mock-only acceptance, authorized AIP-02A within its existing scope, and confirmed authorization for the `9d0bf68` synchronization. That commit is already an ancestor of the feature branch; no additional sync is needed. AIP-02A remains deferred until this mobile pilot clears its consolidated review. Stop at `PENDING_REVIEW`; never self-accept.

### Scope and safety boundary

- Worktree: `/private/tmp/WTK-AIP-MOB-01-20261104`, isolated from the primary UX2 worktree. Final code-bearing SHA is `8b49e13ea00870ad9a96438b8c92bb07a17ca05d`; CI and Staging evidence below identify that exact SHA. `origin/main` is `7e14307eff6af1ab917666b6fc1aa409df96ab61`.
- Only the AI feature branch may change. Do not modify UX2 documents, `HANDOVER.md`, core-game design, or unrelated source.
- Staging target: Worker `three-kingdoms-ai-staging`, D1 `three-kingdoms-ai-staging-db`, UUID `62616495-59ea-4a9c-b669-2d3267a83cab`; production D1 UUID `3151997a-f69e-4a45-ab51-9e4fd062aeb3` must remain excluded. `BOT_AI_ENABLED=false`; `BOT_DEMO_ENABLED=true` is configured only under `env.ai-staging`. The root/default Worker has no Cron and cannot enable demo seats.
- No OpenAI/model calls, paid requests, external real-player data, production Worker/D1 changes, Test Player identity shortcut in the bot path, or public bot-action endpoint.
- Code-bearing feature baseline `9d0bf68c818b4dc18e3cbf8b40be714b800a0660` is an ancestor of the current branch. Final deployment evidence is listed below; production was not deployed.

### M0 supported-action boundary

Bot actions require the current server-authorized bot actor and action revision, then pass through the ordinary room handlers. The driver never acts during a human turn or advances a human timer.

| Decision family | Pilot behavior |
| --- | --- |
| Hero selection | Select the first server-assigned legal option from the Staging demo's safe pool; normal non-demo options are unchanged. |
| Draw | Use canonical draw only when no delayed judgement card is pending; otherwise stop as unsupported. |
| Play phase / end play | End the bot turn through canonical `end_turn`; card play is outside this pilot. |
| Discard | Submit exactly the required physical card IDs from the bot's own hand to the existing discard handler. |
| Single response / decline | Decline only when the server's response projection has no legal response option; otherwise stop as unsupported. |
| Shared Negation window | Unsupported; no bot submits or settles another participant's window. |
| Dying / Peach rescue | Skip only when the server exposes no legal rescue option; a Peach choice is unsupported. |
| Triggers / Harvest / targets / multi-card Attack or Dodge | Unsupported and fail closed with `UNSUPPORTED_BOT_DECISION`; no new card rules or choices are invented. |

### Implementation and local evidence

M1–M4 add genuine `human`/`bot`/legacy-`test` controller identity, host-only bot lobby controls, an internal canonical action principal, bounded persistent D1 work/lease scheduling with Staging-only recovery Cron, and mobile bot status UI. Additive migrations are `0013_bot_player_identity.sql`, `0014_bot_work_queue.sql`, and `0015_bot_demo_rate_limits.sql`. M5 now also caps concurrent active bot games at 8, limits public Staging bot-seat creation to 12 per hour globally, and keeps each room to 3 bots and 200 bot actions. The demo assigns genuine bot seats only server-generated legal Hero choices that avoid the currently unsupported automatic Stargazing trigger; ordinary non-demo Hero offers remain unchanged.

Focused evidence from this worktree:

- `bot-scheduler.test.mjs` and lobby/Hero API regressions: 34/34 passed against isolated local D1, including concurrent rate-limit and active-room cap cases.
- Full API suite: 307/307 passed across 27 files; fast suite: 314/314 passed after registering the new API file in `tests/run-api-suite.mjs` and lazy-loading the Cloudflare-only room route from the Worker bot driver.
- First exact-SHA run [41818161496](https://github.com/dmoneyUK/three-kingdoms/actions/runs/41818161496) on `311ea0e855256544a97f1e41f61f4c44f4a93dbc` passed browser smoke and lint/build, but API shard discovery failed and one fast SSR test hit the eager `cloudflare:workers` import. Staging and production deploy were skipped. Both fixes were committed and pushed in `81f3d1338fee82f10245e99ffa7f944883274df6`.
- Follow-up exact-SHA run [41819196997](https://github.com/dmoneyUK/three-kingdoms/actions/runs/41819196997) on `81f3d1338fee82f10245e99ffa7f944883274df6`: lint/build/fast and browser smoke passed; both production and Staging deploy jobs were skipped because API was red. Shard 1 passed 179/179. Shard 2 first failed at `tests/api/privacy-response.test.mjs:800` (Deliverance, subtest 88) with `TypeError: fetch failed` from `tests/api/harness.mjs:175`; 41 later tests cascaded into fetch failures. Logs show Wrangler initially reached Ready and served requests, but do not establish why the local server connection failed. The full local API suite passed 307/307 and fast suite 314/314 on this source. Attempt 2 of the same-SHA workflow again passed lint/build/fast and browser smoke; shard 2 passed 128/128, while shard 1 failed first at `tests/api/concurrency.test.mjs:7` with the same `TypeError: fetch failed` and 41 later failures cascaded. Wrangler emitted a generic `✘ ERROR` and wrote detail to the runner home log, which was not uploaded. The different shard/test positions point to a local Wrangler runtime failure, but its cause remains unverified. The follow-up below added Wrangler log upload on API failure; no assertions were removed or weakened.
- Staging config guard and room safety render: 27/27 passed.
- Strengthened local mobile bot smoke: 1/1 passed in 46.6 seconds with a Staging-target build, isolated local D1, scheduled-event simulation during Hero selection and bot turns, all 3 bot turns, human-control return, and refresh/rejoin. Screenshot: `tests/browser/test-results/ai-bot-demo-local/staging-room-reconnect-mob-3d014-s-and-rejoins-after-refresh/staging-bot-demo.png`.
- Demo-off local mobile fallback: 1/1 passed in 2.5 seconds with `BOT_DEMO_ENABLED=false` through the legacy Test Player path.
- Staging config guard and full room-safety render passed; default and Staging-target builds passed; focused ESLint reported 0 errors and 3 React Hook warnings in existing presentation effects; browser/API syntax checks and `git diff --check` passed on the current source.
- Local Staging D1 migrations 0000–0015 passed. Before deployment, the generated target guard confirmed Worker `three-kingdoms-ai-staging`, Staging D1 UUID `62616495-59ea-4a9c-b669-2d3267a83cab`, production D1 excluded, `BOT_AI_ENABLED=false`, Staging demo enabled and one-minute Cron enabled.
- Final deployed Staging evidence: source SHA `8b49e13ea00870ad9a96438b8c92bb07a17ca05d`; [Actions run 41820787078](https://github.com/dmoneyUK/three-kingdoms/actions/runs/41820787078), attempt 1, SUCCESS. Lint/build/fast, API **307/307** (shards 179 + 128), browser smoke, Staging target guard, dry-run, migrations, Worker deployment and Staging mobile smoke passed. The production `deploy` job was skipped. Generated-config evidence recorded Worker `three-kingdoms-ai-staging`, D1 UUID `62616495-59ea-4a9c-b669-2d3267a83cab`, production D1 excluded, AI disabled and Staging demo enabled. Remote migrations `0013_bot_player_identity.sql`, `0014_bot_work_queue.sql`, and `0015_bot_demo_rate_limits.sql` applied; a later read-only remote migration query returned `No migrations to apply!`. Deployed Worker version ID: `61045a30-f59e-4e00-b73b-c398bf0b4972`. Independent `GET /api/health` returned `{"ok":true,"worker":"available"}`. The Staging Playwright smoke asserted deployed build SHA `8b49e13ea00870ad9a96438b8c92bb07a17ca05d`, host-created room, three genuine BOT seats, all three completed a bot turn after a human turn, human control returned, and refresh/rejoin preserved room and action revision; **1 passed in 2.4m**. Screenshot artifact: [staging-mobile-smoke-evidence](https://github.com/dmoneyUK/three-kingdoms/actions/runs/41820787078/artifacts/13317237042), file `staging-room-reconnect-mob-3d014-s-and-rejoins-after-refresh/staging-bot-demo.png`. Screenshot visually inspected. This is Chromium mobile emulation, not real iPhone Safari acceptance.

### Reviewer handoff

AIP-MOB-01 is complete and awaiting the human mobile review. Short iPhone check: open the Staging URL; host a room; tap **+ Bot** three times; start and select a Hero; take one human turn; observe the bots select Heroes and take their turns; refresh and confirm the same room returns. Confirm BOT seats are server-owned and the human seat retains control. This milestone is deterministic and limited: unsupported decisions stop safely, there is no LLM, and Chromium mobile emulation does not establish iPhone Safari acceptance.

Do not start AIP-02A or another bot task until the consolidated human review is returned.

Rollback: disable `BOT_DEMO_ENABLED` in the Staging-only config and run the guarded feature-branch Staging workflow, or revert this feature implementation through the same guarded workflow. Never use the root/default production deploy or D1 migration path.
