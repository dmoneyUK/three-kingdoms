# Smart Bot Player — Current Coding Agent Handover

Branch: `feature/smart-bot-player`

Design authority: `docs/AI_PLAYER_DESIGN.md` — AIP-D6

Workflow: `docs/AI_PLAYER_AGENT_WORKFLOW.md` — AIP-AUTO-1

## Current state: IN_PROGRESS — AIP-00C

- AIP-00A is ACCEPTED. AIP-00B is ACCEPTED after the user's positive Staging feedback: the site was accessible and room/Hero selection worked. The browser identity and refresh/rejoin were not separately reported.
- AIP-00B evidence: Worker `three-kingdoms-ai-staging` at https://three-kingdoms-ai-staging.dai-jinge.workers.dev, version `b722630a-5794-4f04-ba2c-ae2def827828`; isolated D1 UUID `62616495-59ea-4a9c-b669-2d3267a83cab`, migrations `0000`–`0012` applied. Health and room create/read smoke passed. Production Worker/DB were not targeted. Exact config CI SHA `fd78a100edd7c629db12b989613be3d3d416852b`, [run 39075595817](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39075595817), passed all validation; deploy skipped.
- AIP-00C: add CI-gated Staging-only automatic migration/deploy after all validation jobs succeed on source pushes to `feature/smart-bot-player`; preserve PR, Markdown-only, `main`, `ux-v2`, and production deployment behavior. Never deploy a default Vinext build artifact.
- Safety: build with `CLOUDFLARE_ENV=ai-staging`; assert generated Worker name, exact Staging D1 UUID, production UUID exclusion, `workers_dev`, and `BOT_AI_ENABLED=false`; dry-run before any migration/deploy. GitHub environment `ai-staging` is restricted to the feature branch with admin bypass disabled and has no environment-scoped secrets. Existing repository Cloudflare secrets must be exposed only to migration/deploy steps.
- First correction attempt, code SHA `fd4db1a452b9a6a28af8fe8cdbd070ccd20c9bd1`, has exact-SHA [Actions run 39078118256](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39078118256). It passed validation jobs but is **not valid AIP-00C deployment evidence**: `--env ai-staging` on Vinext's already environment-flattened `dist/server/wrangler.json` deployed `three-kingdoms-ai-staging-ai-staging`; the fixed-URL smoke therefore tested the pre-existing Worker. Production deploy was skipped, and the deployed binding was the Staging D1. I confirmed the intended Worker was unchanged and deleted the accidental duplicate Worker/version. Keep AIP-00C IN_PROGRESS.
- Correction: `CLOUDFLARE_ENV=ai-staging` selects the environment during build; validate, dry-run, migrate and deploy from that generated config without selecting a second Wrangler environment. The workflow pins the target name explicitly, and the mobile smoke now checks the deployed full build SHA before/after refresh/rejoin. This correction is awaiting exact-SHA CI.
- Focused local evidence: target guard regressions passed 5/5; a Staging-target build with a sentinel SHA embedded it in the client bundle and passed config assertions; generated-config dry-run showed only Staging D1 and `BOT_AI_ENABLED=false`; read-only Staging migration listing reports none pending. Mobile-emulated Chromium created a test match, refreshed, and rejoined on the existing Worker. That older manual build reports `development`, so it cannot satisfy the new exact-SHA deployment assertion. The root Wrangler config dry-run tries unresolved Vinext virtual modules; use the generated Staging config.
- Branch documentation checkpoint: `a57c0ba` (AIP-D6; docs-only). Last validated code-bearing ancestor: `fd78a100edd7c629db12b989613be3d3d416852b`, [Actions run 39075595817](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39075595817).

## Exactly one current task — AIP-00C

Inspect `.github/workflows/deploy.yml`, repository secrets by name only, current package/build scripts and relevant exact-SHA CI; implement focused Staging target assertions and a fail-closed staging job, including room refresh/rejoin browser smoke. Validate workflow changes before committing, push, verify exact-SHA checks and deployed target. Do not invoke production deploy/migrations, OpenAI, or live AI gameplay. Submit AIP-00C as `PENDING_REVIEW` and stop.
