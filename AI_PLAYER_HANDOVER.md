# Smart Bot Player — Current Coding Agent Handover

Branch: `feature/smart-bot-player`
Design: `docs/AI_PLAYER_DESIGN.md` — AIP-D18
Workflow: `docs/AI_PLAYER_AGENT_WORKFLOW.md` — AIP-AUTO-1

## Current task: PENDING_REVIEW — AIP-SYNC-01 UX2 → AI integration

One-way sync authorized by the Product Owner; `ux-v2` and `main` were not modified. Worktree `/private/tmp/WTK-AIP-SYNC-03-20261115`, branch `codex/aip-sync-03-20261115`. Merge `8b074b42c4ce655b0123d7d0b64f06d64579c8aa` has AI base `2255118aa2aa4212df2a9eec49049f69c7321aeb` first and pinned UX2 `bcc2a72e5b56db674700acf1775890522832caaa` second; merge base `587d00f50204716ec1151d23881e838b9052bbc2`. CI retry repair commit: `63c40f6317c0848e3aebded8b91ff6c628356211`. Remote `ux-v2` advanced to `9f8dd07446fc19ca121dd9e16fb0a9dfa4bc557d`; do not move the authorized pin. No unresolved conflicts remain. Incoming UX2 docs/`HANDOVER.md` were not edited.

### Result and validation

- Merge retains UX2 presentation/shared-response behavior and AI bot lobby/controller/scheduler. AI migrations `0013`–`0015` are unchanged; additive UX2 migration `0016_ux2_shared_response_window_submissions` applied on isolated AI Staging.
- Initial merge-SHA [Actions run 43844596604](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43844596604) hit a Wrangler ProxyWorker `Network connection lost` in API; Staging and production deploys were skipped. The follow-up adds one CI-only retry for that exact ready-worker disconnect, with per-attempt logs and a new local D1. Local API **379/379**, fast **449/449**, retry-policy **4/4**, focused lint and diff checks passed.
- Follow-up exact code SHA `63c40f6317c0848e3aebded8b91ff6c628356211` passed [Actions run 43848297264](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43848297264): lint/build/fast, API, browser smoke, Staging config/D1 guard and dry-run, Staging migration/deploy, and mobile room/bot/refresh/rejoin smoke (**1/1**, 4.4m). CI build/deploy used that SHA and the isolated Worker `three-kingdoms-ai-staging` at `https://three-kingdoms-ai-staging.dai-jinge.workers.dev`. Evidence artifact: [Staging mobile smoke 14216209198](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43848297264/artifacts/14216209198). Production `deploy` was skipped. Public `/api/health` returned `{"ok":true,"worker":"available"}`.
- Pre-merge S3 evidence remains: default/Staging builds; Linux x64 lint (0 errors, 16 Hook warnings); UX2 targeted browser **6/6** and previously failing regressions **4/4**; three-Bot smoke **1/1**; Staging guards **6/6**; local clean and existing-schema D1 migration paths. No production deployment or migration ran.

### Reviewer handoff

All AIP-SYNC-01 implementation and CI/Staging gates passed. Await the Product Owner's combined real iPhone Safari review of the 1-human/3-bot pilot and integrated UX2 gameplay. Do not self-accept this task or AIP-MOB-01, and do not start overlapping AIP work until that review. Production, OpenAI calls and real-player data transfer remain unauthorized. Keep the next handover task limited to this pending human review.
