# Smart Bot Player — Current Coding Agent Handover

Branch: `feature/smart-bot-player`

Design authority: `docs/AI_PLAYER_DESIGN.md` — AIP-D5

Workflow: `docs/AI_PLAYER_AGENT_WORKFLOW.md` — AIP-AUTO-1

## Current state: IN_PROGRESS — AIP-00C

- AIP-00A is ACCEPTED; AIP-00B is accepted by the Product Owner's direct instruction on 2026-10-18 to proceed after the review gate was summarized. This records human authorization; the specific iPhone refresh/rejoin checks were not separately reported as observed.
- AIP-00B evidence: Worker `three-kingdoms-ai-staging` at https://three-kingdoms-ai-staging.dai-jinge.workers.dev, version `b722630a-5794-4f04-ba2c-ae2def827828`; isolated D1 UUID `62616495-59ea-4a9c-b669-2d3267a83cab`, migrations `0000`–`0012` applied. Health and room create/read smoke passed. Production Worker/DB were not targeted. Exact config CI SHA `fd78a100edd7c629db12b989613be3d3d416852b`, [run 39075595817](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39075595817), passed all validation; deploy skipped.
- AIP-00C: implement CI-gated, Staging-only automatic migration/deploy after all validation jobs succeed on source pushes to `feature/smart-bot-player`; preserve PR, Markdown-only, `main`, `ux-v2`, and production deployment behavior. Never stage a default Vinext build artifact.
- Mandatory safety gate: build with `CLOUDFLARE_ENV=ai-staging`, verify generated Worker name, exact Staging D1 UUID, production UUID exclusion, `workers_dev`, and `BOT_AI_ENABLED=false`; dry-run the generated artifact before any migration/deploy. GitHub environment `ai-staging` is restricted to `feature/smart-bot-player` and admin bypass is disabled. Its environment-secret list is empty; existing repository Cloudflare secrets are passed only to migration/deploy steps.
- Starting branch HEAD: `3e52a567a004094c471f86dc7adb1e2cbd774158` (docs-only); latest validated code SHA is `fd78a100edd7c629db12b989613be3d3d416852b`.

## Exactly one current task — AIP-00C

Inspect `.github/workflows/deploy.yml`, repository secrets by name only, current package/build scripts and relevant exact-SHA CI; implement focused staging target assertions and a fail-closed staging job. Validate source workflow changes before committing, push, verify exact-SHA checks, and inspect the job graph/target. Do not invoke production deploy, production migrations, OpenAI, or any live AI gameplay. Submit AIP-00C as `PENDING_REVIEW` and stop.
