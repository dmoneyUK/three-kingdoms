# Smart Bot Player — Current Coding Agent Handover

Branch: `feature/smart-bot-player`

Design authority: `docs/AI_PLAYER_DESIGN.md` — AIP-D6

Workflow: `docs/AI_PLAYER_AGENT_WORKFLOW.md` — AIP-AUTO-1

## Current state: IN_PROGRESS — AIP-00C

- AIP-00A is ACCEPTED. AIP-00B is ACCEPTED after the user's positive Staging feedback: the site was accessible and room/Hero selection worked. The browser identity and refresh/rejoin were not separately reported.
- AIP-00B evidence: Worker `three-kingdoms-ai-staging` at https://three-kingdoms-ai-staging.dai-jinge.workers.dev, version `b722630a-5794-4f04-ba2c-ae2def827828`; isolated D1 UUID `62616495-59ea-4a9c-b669-2d3267a83cab`, migrations `0000`–`0012` applied. Health and room create/read smoke passed. Production Worker/DB were not targeted. Exact config CI SHA `fd78a100edd7c629db12b989613be3d3d416852b`, [run 39075595817](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39075595817), passed all validation; deploy skipped.
- AIP-00C: add CI-gated Staging-only automatic migration/deploy after all validation jobs succeed on source pushes to `feature/smart-bot-player`; preserve PR, Markdown-only, `main`, `ux-v2`, and production deployment behavior. Never deploy a default Vinext build artifact.
- Safety: build with `CLOUDFLARE_ENV=ai-staging`; assert generated Worker name, exact Staging D1 UUID, production UUID exclusion, `workers_dev`, and `BOT_AI_ENABLED=false`; dry-run before any migration/deploy. GitHub environment `ai-staging` is restricted to the feature branch with admin bypass disabled and has no environment-scoped secrets. Existing repository Cloudflare secrets must be exposed only to migration/deploy steps.
- Branch documentation checkpoint: `e4b9297` (AIP-D6; docs-only). Last validated code-bearing ancestor: `fd78a100edd7c629db12b989613be3d3d416852b`, [Actions run 39075595817](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39075595817).

## Exactly one current task — AIP-00C

Inspect `.github/workflows/deploy.yml`, repository secrets by name only, current package/build scripts and relevant exact-SHA CI; implement focused Staging target assertions and a fail-closed staging job, including room refresh/rejoin browser smoke. Validate workflow changes before committing, push, verify exact-SHA checks and deployed target. Do not invoke production deploy/migrations, OpenAI, or live AI gameplay. Submit AIP-00C as `PENDING_REVIEW` and stop.
