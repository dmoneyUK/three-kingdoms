# Smart Bot Player — Current Coding Agent Handover

Branch: `feature/smart-bot-player`

Design authority: `docs/AI_PLAYER_DESIGN.md` — AIP-D4

Workflow: `docs/AI_PLAYER_AGENT_WORKFLOW.md` — AIP-AUTO-1

## Current state: BLOCKED — AIP-00B

- AIP-00A was explicitly accepted by the human Product Owner in design commit `4ad98b9151fc2c1e373897b8ca7adf5335c657ee`. Its workflow commit `75073b6bbfffe9281223ef1eaac85349496224af` passed [Actions run 39058906244](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39058906244); the production deploy job was skipped.
- Task start HEAD: `4ad98b9151fc2c1e373897b8ca7adf5335c657ee` (design-only; latest validated code-bearing ancestor is `75073b6bbfffe9281223ef1eaac85349496224af`).
- Scope: provision and deploy the unmodified application to an isolated `ai-staging` Worker and new D1 database, with `BOT_AI_ENABLED=false`. Preserve the production Worker, D1 binding, migrations and deploy policy. No OpenAI key or AI gameplay.
- Initial inspection: `wrangler.jsonc` has only the production DB binding (`3151997a-f69e-4a45-ab51-9e4fd062aeb3`) and no Staging environment. `npm ci` installed locked dependencies; Wrangler 4.128.0 `whoami` failed because its saved auth token is expired and could not be refreshed in this non-interactive session.
- No Cloudflare account, permissions or remote resources could be verified. No Cloudflare D1 or Worker changes have been made.
- Resume after a valid Cloudflare credential is configured securely in this execution environment, or after interactive `wrangler login` on this host. Do not send a token in chat or commit it. Then verify account and production isolation before any remote write.

## Exactly one current task — AIP-00B

Blocked before remote provisioning: restore authenticated Cloudflare access on this host. Then verify the account and resource targets, complete AIP-00B's isolated D1/Worker setup, migration, exact-SHA CI and smoke checks. Do not start AIP-00C or AIP-01 until AIP-00B is accepted.
