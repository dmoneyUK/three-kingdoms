# Smart Bot Player — Current Coding Agent Handover

Branch: `feature/smart-bot-player`

Design authority: `docs/AI_PLAYER_DESIGN.md` — AIP-D4

Workflow: `docs/AI_PLAYER_AGENT_WORKFLOW.md` — AIP-AUTO-1

## Current state: IN_PROGRESS — AIP-00B

- AIP-00A was explicitly accepted by the human Product Owner in design commit `4ad98b9151fc2c1e373897b8ca7adf5335c657ee`. Its workflow commit `75073b6bbfffe9281223ef1eaac85349496224af` passed [Actions run 39058906244](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39058906244); the production deploy job was skipped.
- Task start HEAD: `4ad98b9151fc2c1e373897b8ca7adf5335c657ee` (design-only; latest validated code-bearing ancestor is `75073b6bbfffe9281223ef1eaac85349496224af`).
- Scope: provision and deploy the unmodified application to an isolated `ai-staging` Worker and new D1 database, with `BOT_AI_ENABLED=false`. Preserve the production Worker, D1 binding, migrations and deploy policy. No OpenAI key or AI gameplay.
- Initial inspection: `wrangler.jsonc` has only the production DB binding (`3151997a-f69e-4a45-ab51-9e4fd062aeb3`) and no Staging environment. Local Wrangler is not installed yet. No Cloudflare account check or remote write has been performed.
- Next checkpoint: install locked dependencies, verify Wrangler identity/permissions and list resources. Proceed with remote changes only if the selected account and distinct Staging targets are confirmed; otherwise record the blocker and request the specific access needed.

## Exactly one current task — AIP-00B

Configure `wrangler.jsonc` with an explicit `env.ai-staging` Worker, new D1 `DB` binding and `BOT_AI_ENABLED=false`; create and verify the separate remote D1, apply checked-in migrations to that target only, and deploy using the explicit Staging environment after exact-SHA CI passes. Verify the real URL, health, room creation and no production writes. Submit `PENDING_REVIEW` with actual resource IDs, deployment SHA, CI and smoke evidence; iPhone interaction remains for human acceptance. Do not start AIP-00C or AIP-01 until AIP-00B is accepted.
