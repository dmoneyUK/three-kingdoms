# Smart Bot Player — Current Coding Agent Handover

Branch: `feature/smart-bot-player`
Design: `docs/AI_PLAYER_DESIGN.md` — AIP-D16 (2026-11-03)
Workflow: `docs/AI_PLAYER_AGENT_WORKFLOW.md` — AIP-AUTO-1

## Current task: IN_PROGRESS — AIP-MOB-01, M0–M5 local checks complete; exact-SHA CI/Staging and M6 remain

The Product Owner authorized the continuous deterministic Staging-only M0–M6 task on 2026-11-04. The owner also confirmed AIP-01 mock-only acceptance, authorized AIP-02A within its existing scope, and confirmed authorization for the `9d0bf68` synchronization. That commit is already an ancestor of the feature branch; no additional sync is needed. AIP-02A remains deferred until this mobile pilot clears its consolidated review. Stop at `PENDING_REVIEW`; never self-accept.

### Scope and safety boundary

- Worktree: `/private/tmp/WTK-AIP-MOB-01-20261104`, detached at `0e578ea059cfab8131abf2ea8d3c04125de517bc`, exactly matching the freshly fetched `origin/feature/smart-bot-player`; `origin/main` is `7e14307eff6af1ab917666b6fc1aa409df96ab61`. It is isolated from the primary UX2 worktree. Recheck the remote feature head immediately before push.
- Only the AI feature branch may change. Do not modify UX2 documents, `HANDOVER.md`, core-game design, or unrelated source.
- Staging target: Worker `three-kingdoms-ai-staging`, D1 `three-kingdoms-ai-staging-db`, UUID `62616495-59ea-4a9c-b669-2d3267a83cab`; production D1 UUID `3151997a-f69e-4a45-ab51-9e4fd062aeb3` must remain excluded. `BOT_AI_ENABLED=false`; `BOT_DEMO_ENABLED=true` is configured only under `env.ai-staging`. The root/default Worker has no Cron and cannot enable demo seats.
- No OpenAI/model calls, paid requests, external real-player data, production Worker/D1 changes, Test Player identity shortcut in the bot path, or public bot-action endpoint.
- Inherited code-bearing baseline `9d0bf68c818b4dc18e3cbf8b40be714b800a0660` passed [Actions run 39842895719](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39842895719); production deploy was skipped. Its migration evidence did not query the present remote ledger. No migration or Worker deployment has yet been run from this worktree.

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
- Staging config guard and room safety render: 27/27 passed.
- Strengthened local mobile bot smoke: 1/1 passed in 46.6 seconds with a Staging-target build, isolated local D1, scheduled-event simulation during Hero selection and bot turns, all 3 bot turns, human-control return, and refresh/rejoin. Screenshot: `tests/browser/test-results/ai-bot-demo-local/staging-room-reconnect-mob-3d014-s-and-rejoins-after-refresh/staging-bot-demo.png`.
- Demo-off local mobile fallback: 1/1 passed in 2.5 seconds with `BOT_DEMO_ENABLED=false` through the legacy Test Player path.
- Staging config guard and full room-safety render passed; default and Staging-target builds passed; focused ESLint reported 0 errors and 3 React Hook warnings in existing presentation effects; browser/API syntax checks and `git diff --check` passed on the current source.
- Local Staging D1 migrations 0000–0015 applied using `--local`. Generated target guard confirmed Worker `three-kingdoms-ai-staging`, D1 UUID `62616495-59ea-4a9c-b669-2d3267a83cab`, production UUID excluded, AI disabled, demo enabled, and one-minute Cron enabled. A read-only remote ledger check lists only `0013`–`0015` pending. No remote migration or Worker deployment has occurred.
- The demo-on screenshot was visually inspected. Both local browser runs are Chromium mobile emulation, not real iPhone acceptance or Staging deployment evidence.

### Next steps

1. Recheck remote head and the complete scoped diff/file list; commit only AIP-MOB-01 implementation, tests, this handover and this task's design evidence.
2. Push only to `origin/feature/smart-bot-player`. Verify lint/build/fast, API, browser, Staging target guard, migrations, Worker deploy and mobile smoke for the exact pushed SHA; confirm production deploy is skipped and only the Staging Worker/D1 were mutated. Fix any failures before proceeding.
3. Verify the live HTTPS Staging Worker, deployed build SHA and health/room/rejoin smoke. Record sanitized evidence, limitations and short iPhone test steps in this handover and only AIP-MOB-01's design status/evidence.
4. Finish at `PENDING_REVIEW` and stop for the consolidated human mobile review. Do not start AIP-02A.

Rollback: disable `BOT_DEMO_ENABLED` in the Staging-only config and run the guarded feature-branch Staging workflow, or revert this feature implementation through the same guarded workflow. Never use the root/default production deploy or D1 migration path.
