# Smart Bot Player — Current Coding Agent Handover

Branch: `feature/smart-bot-player` (worktree `/private/tmp/WTK-AIP-SYNC-04-20261119`, local branch `codex/aip-log-01-20261121`)
Design: `docs/AI_PLAYER_DESIGN.md` — latest reviewed revision **AIP-D29**
Workflow: `docs/AI_PLAYER_AGENT_WORKFLOW.md` — **AIP-AUTO-2**

## Current task: IN_PROGRESS — one commit for AIP-LOG-02 + AIP-OBS-02 + AIP-RSP-01

The Owner directed all three tasks to be implemented together in one commit, without intermediate acceptance. This overrides implementation sequencing only; do not mark any task accepted. Keep them `PENDING_REVIEW` after exact-SHA CI/Staging checks, with required Cloudflare log export gaps stated explicitly.

## Scope and safety

- AIP-LOG-02 changes only AI Staging `observability.logs.invocation_logs=false`; persistent Workers Logs, sampling `1`, one-minute Cron, Staging Worker/D1 and bot safety variables remain enabled. Root/production config is unchanged.
- AIP-OBS-02 emits fixed-schema, versioned private decision context/evaluation/result records only when the explicit AI Staging flag is enabled. Only the acting Bot's own hand, equipment, role and canonical response candidates are eligible. No other player's hidden hand, credentials, raw request/error, gameplay response, frontend or public endpoint.
- AIP-RSP-01 dispatches only one exact physical Dodge through the existing canonical response handler for an ordinary card Attack. Empty legal options keep the existing decline; ambiguous, multi-card/provider, skill, shared, dying, negation and stale decisions remain fail-closed.
- No production deploy/migration, new schema, OpenAI/API spend, UI/UX2/HANDOVER/core-game document or unrelated feature work. The feature-branch workflow must skip production deployment and target only the isolated AI Staging Worker/D1.

## Implementation checkpoint

Changed task files are the Wrangler Staging config and guard/tests, server Bot diagnostics/principal/driver/route, Bot scheduler API regressions, this handover, and selected task status text in the AI design. The regression fixtures now pin both attacker and responding Bot to non-converting Sun Quan where an ordinary single-provider response is required; the skill-conversion case pins the attacker to Sun Quan and the Bot to Zhen Ji.

Per the Owner's instruction, no local tests are being run in this validation stage. First pushed task commit `28554f49458a8318969212f0e9789cea2af02472` reached exact-SHA Actions run [44966339264](https://github.com/dmoneyUK/three-kingdoms/actions/runs/44966339264): lint/build/fast and browser smoke passed; API failed in the opt-out rerun of the multi-Dodge case because a randomly assigned Hero produced a non-ordinary pending shape before the test setup assertion. The fixture correction is in `b95bdc4f224a4bb797170995a646807f14f51d1d`. Exact-SHA run [44967239184](https://github.com/dmoneyUK/three-kingdoms/actions/runs/44967239184) passed lint/build/fast, API and browser smoke; Staging target guard, dry-run, isolated D1 migration and Worker deployment passed; production `deploy` was skipped. Its final mobile Staging smoke timed out waiting for the human Play Phase while the host's random Hero (Zhen Ji) had a legal optional `decline_trigger` action ("Use Goddess of Luo River, or Skip"). The page showed the Skip control; the smoke had trigger handling only after its Play Phase wait, so this is a test-wait ordering defect, not evidence of a Bot scheduler stall. Run [44968939220](https://github.com/dmoneyUK/three-kingdoms/actions/runs/44968939220) passed lint/build/fast and browser smoke, but the API suite exposed a race in the existing canonical bot scenario: `requestAndSettle` drained the empty Bot response before the test asserted its actor. The correction adds `preserveResponse: true` so the test observes the actual pending actor before calling `runBotStep`. The staging smoke correction handles the human's legal trigger during the Play Phase wait. Both corrections are pending exact-SHA revalidation; production and Staging jobs were skipped on run 44968939220. Per the Owner's instruction, no local tests are being run.

## Next action

The three task implementations are together in `28554f49`. Follow-up commits repair CI-discovered test-fixture/wait-order issues without rewriting pushed history. Commit and push the API response-preservation correction with the current Staging smoke fix, then inspect every GitHub Actions job for that exact SHA, including isolated Staging deployment/mobile smoke and production `deploy` skipped. Do not claim AIP-LOG-02/AIP-OBS-02 Cloudflare persistence/export proof unless a fresh post-deploy export shows the new `scriptVersion`, room/decision correlation and no invocation rows; if unavailable, preserve `PENDING_REVIEW` and name the exact missing operator evidence.
