# Smart Bot Player — Current Coding Agent Handover

Branch: `feature/smart-bot-player`

Design authority: `docs/AI_PLAYER_DESIGN.md` — AIP-D2

Workflow: `docs/AI_PLAYER_AGENT_WORKFLOW.md`

## Current state: IN_PROGRESS — AIP-00A

- The stale AIP-D0/AIP-01 bot-seat preview was never started. AIP-D2 approves only AIP-00A for this Coding Agent cycle.
- Start SHA: `b11c8a7a855aafc7370b78f3190f7e7e77e0ce59`.
- No feature-branch Actions run existed at start. Inherited `main` baseline run `39037960303` passed on `6743a357ef19ca930a02f7e3faa8cee843bd6a38`; this is not feature-branch validation.
- Scope: add `feature/smart-bot-player` to the existing push and pull-request validation triggers. Preserve Markdown-only exclusions and the `main` / `ux-v2` production deploy gate. Do not add AI gameplay, Cloudflare resources, secrets, migrations or deployment behavior.
- Focused validation, implementation commit SHA, exact-SHA Actions run and deploy-skip evidence are pending.

## Exactly one current task — AIP-00A

Enable lint, build, fast tests, API tests and browser smoke checks on feature-branch code pushes and pull requests. Confirm that feature-branch runs skip the production deploy job, including its D1 migration step. Keep all acceptance criteria in AIP-D2 unchanged.

After the pushed code SHA passes all required validation and the deploy job is confirmed skipped, record the exact SHA and run here and in only AIP-00A's implementation status/evidence in `docs/AI_PLAYER_DESIGN.md`. Set the task to `PENDING_REVIEW` and stop. Do not start AIP-00B or another task.
