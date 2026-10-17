# Smart Bot Player — Current Coding Agent Handover

Branch: `feature/smart-bot-player`

Design authority: `docs/AI_PLAYER_DESIGN.md` — AIP-D6

Workflow: `docs/AI_PLAYER_AGENT_WORKFLOW.md` — AIP-AUTO-1

## Current state: PENDING_REVIEW — AIP-00C

- AIP-00A and AIP-00B are ACCEPTED. AIP-00B acceptance reflects the user's positive Staging feedback: site access, room selection, and Hero selection. Browser identity and refresh/rejoin were not separately reported by the user.
- AIP-00C code commit: `ce897a842b13529fd9d7b2087b4ebfbf6525b1d1`. Exact-SHA [Actions run 39079095884](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39079095884) passed lint/build/fast, API, browser startup, Staging target guards, Staging build/config assertion, dry-run, migration step, deploy, and post-deploy mobile smoke. Production `deploy` was skipped.
- Current Staging: Worker `three-kingdoms-ai-staging`, version `5b5ec68c-7e70-414e-9982-235029dceb3f`, URL https://three-kingdoms-ai-staging.dai-jinge.workers.dev; D1 `three-kingdoms-ai-staging-db`, UUID `62616495-59ea-4a9c-b669-2d3267a83cab`. The generated config excludes production D1, has `workers_dev=true`, and `BOT_AI_ENABLED=false`; Wrangler reported no migrations pending.
- The exact-SHA mobile Chromium smoke checked the deployed build SHA before and after creating a room, starting a match, selecting Heroes, refreshing, and rejoining (1/1 passed). Waiting for `networkidle` fixes the client hydration race seen in the prior run `39078671949`.
- Focused local checks passed: Staging target guard tests 5/5, ESLint on scoped scripts/tests, workflow YAML parse, and `git diff --check`. No OpenAI calls were made.

## Exactly one current task — AIP-00C review

Review the task evidence and scoped diff. Do not start dependent AIP-01 until AIP-00C is ACCEPTED. No production deploy/migrations, OpenAI calls, or live AI gameplay were performed or authorized by this task. Stop at PENDING_REVIEW; the human Reviewer alone decides acceptance.
