# Smart Bot Player — Current Coding Agent Handover

Branch: `feature/smart-bot-player`

Design authority: `docs/AI_PLAYER_DESIGN.md` — AIP-D4

Workflow: `docs/AI_PLAYER_AGENT_WORKFLOW.md` — AIP-AUTO-1

## Current state: IN_PROGRESS — AIP-00B

- AIP-00A was explicitly accepted by the human Product Owner in design commit `4ad98b9151fc2c1e373897b8ca7adf5335c657ee`. Its workflow commit `75073b6bbfffe9281223ef1eaac85349496224af` passed [Actions run 39058906244](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39058906244); the production deploy job was skipped.
- Task start HEAD: `4ad98b9151fc2c1e373897b8ca7adf5335c657ee` (design-only; latest validated code-bearing ancestor is `75073b6bbfffe9281223ef1eaac85349496224af`).
- Scope: provision and deploy the unmodified application to an isolated `ai-staging` Worker and new D1 database, with `BOT_AI_ENABLED=false`. Preserve the production Worker, D1 binding, migrations and deploy policy. No OpenAI key or AI gameplay.
- `wrangler.jsonc` has only the production DB binding (`3151997a-f69e-4a45-ab51-9e4fd062aeb3`) and no Staging environment. Wrangler 4.128.0 authentication is now restored; `whoami` confirms the account whose D1 list contains the production UUID and whose token grants D1/Workers write permissions.
- Read-only inventory found only `three-kingdoms-db` (`3151997a-f69e-4a45-ab51-9e4fd062aeb3`); `three-kingdoms-ai-staging` does not exist. No remote Cloudflare writes have occurred.
- Next checkpoint: create the separately named Staging D1, verify its generated UUID, configure the explicit `ai-staging` environment and `BOT_AI_ENABLED=false`, then run exact-SHA CI before migration/deploy.

## Exactly one current task — AIP-00B

Create and verify the isolated Staging D1/Worker, then migrate/deploy only with explicit `--env ai-staging` after exact-SHA CI. Verify health, room creation and production isolation. Do not start AIP-00C or AIP-01 until AIP-00B is accepted.
