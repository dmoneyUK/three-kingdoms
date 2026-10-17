# Smart Bot Player — Current Coding Agent Handover

Branch: `feature/smart-bot-player`

Design authority: `docs/AI_PLAYER_DESIGN.md` — AIP-D4

Workflow: `docs/AI_PLAYER_AGENT_WORKFLOW.md` — AIP-AUTO-1

## Current state: PENDING_REVIEW — AIP-00B

- AIP-00A was explicitly accepted by the human Product Owner in design commit `4ad98b9151fc2c1e373897b8ca7adf5335c657ee`. Its workflow commit `75073b6bbfffe9281223ef1eaac85349496224af` passed [Actions run 39058906244](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39058906244); production deploy was skipped.
- AIP-00B config/code commit `fd78a100edd7c629db12b989613be3d3d416852b` passed exact-SHA [Actions run 39075595817](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39075595817): lint/build/fast tests, API tests, and browser startup/room smoke passed; production deploy was skipped. Later branch commits only update this handover and AIP-00B design evidence.
- Wrangler 4.128.0 account was verified for D1/Workers write access. Created isolated D1 `three-kingdoms-ai-staging-db`, UUID `62616495-59ea-4a9c-b669-2d3267a83cab`, separate from production UUID `3151997a-f69e-4a45-ab51-9e4fd062aeb3`. Applied all checked-in migrations `0000`–`0012` only with `--remote --env ai-staging`; follow-up migration listing reports none pending, and a read-only query confirms the application tables.
- `wrangler.jsonc` defines `env.ai-staging` as Worker `three-kingdoms-ai-staging`, with `workers_dev: true`, only the new Staging D1 binding, and `BOT_AI_ENABLED=false`. A `CLOUDFLARE_ENV=ai-staging npm run build` build plus config assertions and Wrangler dry-run confirmed this exact target. The root production DB binding is unchanged.
- Deployed from branch SHA `9b36442` to `https://three-kingdoms-ai-staging.dai-jinge.workers.dev`; Cloudflare version `b722630a-5794-4f04-ba2c-ae2def827828`. Wrangler confirmed the deployed Worker binds to the Staging D1 and `BOT_AI_ENABLED=false`.
- Live smoke: `/` returned HTTP 200, `/api/health` returned HTTP 200, room creation returned HTTP 201, and authenticated lobby read returned HTTP 200 for room `ZNPR5` with one host. The production Worker deployment listing was unchanged by this task; all D1 migration commands explicitly targeted the Staging database. No production Worker deployment or D1 migration was run by this task.
- **Human review required:** Open the URL in iPhone Safari, create a room using a display name, and confirm the lobby and room code are usable. Record acceptance or any feedback in `docs/AI_PLAYER_DESIGN.md`. The API key is not needed for AIP-00B; `BOT_AI_ENABLED` remains false.

## Exactly one current task — AIP-00B

Review the real HTTPS lobby on iPhone Safari, then mark AIP-00B ACCEPTED or record specific feedback. Do not start AIP-00C or AIP-01 before AIP-00B is accepted. No OpenAI calls, secrets, production changes, or gameplay changes are part of this task.
