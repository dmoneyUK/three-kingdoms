# Smart Bot Player — Current Coding Agent Handover

Branch: `feature/smart-bot-player`

Design authority: `docs/AI_PLAYER_DESIGN.md` — AIP-D4

Workflow: `docs/AI_PLAYER_AGENT_WORKFLOW.md` — AIP-AUTO-1

## Current state: IN_PROGRESS — AIP-00B

- AIP-00A was explicitly accepted by the human Product Owner in design commit `4ad98b9151fc2c1e373897b8ca7adf5335c657ee`. Its workflow commit `75073b6bbfffe9281223ef1eaac85349496224af` passed [Actions run 39058906244](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39058906244); the production deploy job was skipped.
- Task start HEAD: `4ad98b9151fc2c1e373897b8ca7adf5335c657ee` (design-only; latest validated code-bearing ancestor is `75073b6bbfffe9281223ef1eaac85349496224af`).
- Scope: provision and deploy the unmodified application to an isolated `ai-staging` Worker and new D1 database, with `BOT_AI_ENABLED=false`. Preserve the production Worker, D1 binding, migrations and deploy policy. No OpenAI key or AI gameplay.
- Wrangler 4.128.0 `whoami` confirms the authorized account and D1/Workers write permissions. Its D1 inventory contains the production DB (`3151997a-f69e-4a45-ab51-9e4fd062aeb3`) and the distinct Staging DB below.
- Created `three-kingdoms-ai-staging-db`; UUID `62616495-59ea-4a9c-b669-2d3267a83cab`. Applied all 13 migrations using the explicit `--remote --env ai-staging` command; the follow-up migration listing reports none pending, and a read-only schema query confirms the application tables exist. No Worker deployment has occurred.
- `wrangler.jsonc` now defines `env.ai-staging` with Worker `three-kingdoms-ai-staging`, `workers_dev: true`, only the Staging D1 binding, and `BOT_AI_ENABLED=false`; the root production binding is unchanged. A default Vinext build selected production in its dry-run, so it was stopped. `CLOUDFLARE_ENV=ai-staging npm run build` selected Staging and the dry-run showed only the Staging D1 and disabled flag. The generated config must be rechecked immediately before deploy.
- Config commit: `fd78a100edd7c629db12b989613be3d3d416852b`. Exact-SHA [Actions run 39075595817](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39075595817) passed lint/build/fast tests, API tests, and browser startup/room smoke; the production `deploy` job was skipped.
- Preflight reviewed the 13 checked-in migrations (`0000`–`0012`); no table drops or production target are present. Post-apply verification confirms no Staging migrations remain pending.
- Next checkpoint: rebuild with `CLOUDFLARE_ENV=ai-staging`, assert the generated Worker name, Staging DB UUID, `workers_dev`, and AI-disabled flag, then deploy only with `--env ai-staging`. Verify the deployed URL, health and room creation, and that production remains untouched; provide iPhone review instructions and stop at `PENDING_REVIEW`.

## Exactly one current task — AIP-00B

Create and verify the isolated Staging D1/Worker, then migrate/deploy only with explicit `--env ai-staging` after exact-SHA CI. Verify health, room creation and production isolation. Do not start AIP-00C or AIP-01 until AIP-00B is accepted.
