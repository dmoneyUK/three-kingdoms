# Smart Bot Player — Current Coding Agent Handover

Branch: `feature/smart-bot-player` (worktree `/private/tmp/WTK-AIP-SYNC-04-20261119`, local branch `codex/aip-log-01-20261121`)
Design: `docs/AI_PLAYER_DESIGN.md` — AIP-D25 (accepted RATE update `9bee2d72b16b0878657a99497eb63a05c771f645`)
Workflow: `docs/AI_PLAYER_AGENT_WORKFLOW.md` — AIP-AUTO-1

## Latest accepted result

- **AIP-RATE-01 code SHA:** `824e79d14d682dd05d5f224ca9155d0149a08838`; exact-SHA [Actions run 44955463000](https://github.com/dmoneyUK/three-kingdoms/actions/runs/44955463000) succeeded for lint/build/fast, API, browser smoke and AI Staging deploy/mobile smoke; production `deploy` was skipped. API attempt 1 had the known Wrangler ProxyWorker `fetch failed`; the configured retry passed (402 passed, 2 mode-specific skips, 0 failures).
- Staging Worker version `344cee45-bca7-42d1-8cdf-0bb71589491c`, URL https://three-kingdoms-ai-staging.dai-jinge.workers.dev, isolated D1 `62616495-59ea-4a9c-b669-2d3267a83cab`; migration output: `No migrations to apply!` The generated guard confirmed the Staging-only quota opt-out, `BOT_AI_ENABLED=false`, and production D1 excluded. Mobile-emulated reconnect smoke passed 1/1 (artifact [14727776258](https://github.com/dmoneyUK/three-kingdoms/actions/runs/44955463000/artifacts/14727776258)). No production deployment or migration occurred.
- **Human acceptance:** AIP-D25 records the Product Owner's 2026-11-21 22:42 UTC report that all 3 real-iPhone checks passed: create a room, add three Bots without 429, then start/refresh/rejoin. AIP-RATE-01 is ACCEPTED; no RATE rerun is needed.

## Current task: IN_PROGRESS — AIP-LOG-01 (AIP-D25, P0 #2)

Make the AI Staging deploy persist Cloudflare Workers Logs by setting `observability.enabled=true` and `head_sampling_rate=1` under `env.ai-staging` only. Verify the generated deploy config, Staging target, exact-SHA CI/deployment, and actual post-deploy Cloudflare Logs setting plus one newly saved `bot_scheduler` event. Cloudflare persisted-log readback is an explicit acceptance requirement, not established by `wrangler tail` or CI alone.

### Reconciliation and boundaries

- D25 makes AIP-LOG-01 the next eligible task after RATE acceptance. Existing AIP-02A code remains committed (`59303f85f2370feed788a8b5f2a6ae70cd88ccdf`) and its design status is still `IN_PROGRESS`; its earlier Staging smoke failure is recorded in the design (run `44916475813`). The working AI tree has no uncommitted AIP-02A edits. AIP-LOG-01's config/guard scope does not alter that bridge or its tests; preserve it for its own reconciliation.
- No AIP-RSP-01 implementation is in progress on this branch: the internal bot action allowlist still excludes `respond`. RSP remains gated on accepted AIP-OBS-02.
- Preserve the AIP-RATE-01 config flag and safeguards, Worker `three-kingdoms-ai-staging`, D1 `62616495-59ea-4a9c-b669-2d3267a83cab`, one-minute Cron, `BOT_DEMO_ENABLED=true`, `BOT_DIAGNOSTICS_ENABLED=true`, and `BOT_AI_ENABLED=false`. No root/default/production observability setting, production deploy/migration, schema change, gameplay/UI change, frontend log endpoint/download, paid service, or secret exposure.
- Scope: `wrangler.jsonc`, effective generated `dist/server/wrangler.json`, `scripts/verify-ai-staging-config.mjs`, its focused tests, and this Agent handover plus only AIP-LOG-01 status/evidence in the design.

### Validation and resume point

- Focused guard tests passed 8/8; targeted ESLint for the guard and test file passed; `git diff --check` passed.
- Required `CLOUDFLARE_ENV=ai-staging npm run build` passed. Generated `dist/server/wrangler.json` contains Worker `three-kingdoms-ai-staging`, the isolated Staging D1 only, `observability.enabled=true`, `head_sampling_rate=1`, Staging Cron and flags (`BOT_AI_ENABLED=false`, demo/quota/diagnostics flags true); the effective-config guard passed.
- Wrangler generated-config deploy dry-run passed. Source assertions confirm observability is under `env.ai-staging` only and the effective guard rejects missing/false logging, non-unit sampling, source-subtree-only settings, wrong target, production D1 or unsafe runtime flags.
- Baseline exact-SHA CI was rechecked before changes: code `824e79d14d682dd05d5f224ca9155d0149a08838`, [run 44955463000](https://github.com/dmoneyUK/three-kingdoms/actions/runs/44955463000), success; production `deploy` skipped. Remote branch remained at D25 `9bee2d72` with no running/queued validation when checked.
- Next: commit/push scoped source + handover/status evidence and inspect the resulting exact-SHA CI. Require Staging deploy/mobile smoke success and production `deploy` skipped.
- After deploy, read actual Staging Worker settings and confirm Workers Logs Enabled at rate 1; trigger one safe Bot action in a fresh room and verify a saved/searchable/exportable event after deployment with UTC time, roomCode, decisionId and scriptVersion. If account readback is unavailable, request a sanitized dashboard screenshot/export and keep the task `PENDING_REVIEW` with the evidence gap explicit.
