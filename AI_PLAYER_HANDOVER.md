# Smart Bot Player — Current Coding Agent Handover

Branch: `feature/smart-bot-player` (worktree `/private/tmp/WTK-AIP-SYNC-04-20261119`, local branch `codex/aip-log-01-20261121`)
Design: `docs/AI_PLAYER_DESIGN.md` — latest reviewed revision **AIP-D27**
Workflow: `docs/AI_PLAYER_AGENT_WORKFLOW.md` — **AIP-AUTO-1**

## Current task: IN_PROGRESS — one commit for AIP-LOG-02 + AIP-OBS-02 + AIP-RSP-01

The Owner directed all three tasks to be implemented together in one commit, without intermediate acceptance. This overrides implementation sequencing only; do not mark any task accepted. Keep them `PENDING_REVIEW` after exact-SHA CI/Staging checks, with required Cloudflare log export gaps stated explicitly.

## Scope and safety

- AIP-LOG-02 changes only AI Staging `observability.logs.invocation_logs=false`; persistent Workers Logs, sampling `1`, one-minute Cron, Staging Worker/D1 and bot safety variables remain enabled. Root/production config is unchanged.
- AIP-OBS-02 emits fixed-schema, versioned private decision context/evaluation/result records only when the explicit AI Staging flag is enabled. Only the acting Bot's own hand, equipment, role and canonical response candidates are eligible. No other player's hidden hand, credentials, raw request/error, gameplay response, frontend or public endpoint.
- AIP-RSP-01 dispatches only one exact physical Dodge through the existing canonical response handler for an ordinary card Attack. Empty legal options keep the existing decline; ambiguous, multi-card/provider, skill, shared, dying, negation and stale decisions remain fail-closed.
- No production deploy/migration, new schema, OpenAI/API spend, UI/UX2/HANDOVER/core-game document or unrelated feature work. The feature-branch workflow must skip production deployment and target only the isolated AI Staging Worker/D1.

## Implementation checkpoint

Changed task files are the Wrangler Staging config and guard/tests, server Bot diagnostics/principal/driver/route, Bot scheduler API regressions, this handover, and selected task status text in the AI design. The regression fixtures now pin both attacker and responding Bot to non-converting Sun Quan where an ordinary single-provider response is required; the skill-conversion case pins the attacker to Sun Quan and the Bot to Zhen Ji.

Local evidence observed before the Owner's instruction to stop local testing: generated-config and diagnostic tests passed 16/16; the focused Bot scheduler file passed once (13 passed, one quota-mode skip); fast tests passed 501/501; the default build passed. A later full API run caught random-Hero fixture assumptions (Lü Bu's two-Dodge requirement); the fixtures were made deterministic after that run. Do not rerun locally: the Owner directed that the changes go to GitHub Actions for validation. Local full lint under Node 26.3.0 also stack-overflowed in `react-hooks/rules-of-hooks` on untouched `app/page.tsx:4125`; the workflow uses Node 22.13.0 and its exact-SHA run is authoritative.

## Next action

Review the final diff, create one task commit containing all three implementations and task checkpoint, rebase that single unpushed commit onto remote `feature/smart-bot-player` tip `8ee9ad67740337322304ebe7f3d41e736db00777`, then push once. Inspect every GitHub Actions job for the pushed exact SHA, including isolated Staging deployment/mobile smoke and production `deploy` skipped. Do not claim AIP-LOG-02/AIP-OBS-02 Cloudflare persistence/export proof unless a fresh post-deploy export shows the new `scriptVersion`, room/decision correlation and no invocation rows; if unavailable, preserve `PENDING_REVIEW` and name the exact missing operator evidence.
