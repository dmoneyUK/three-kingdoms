# Smart Bot Player — Current Coding Agent Handover

Branch: `feature/smart-bot-player`
Design: `docs/AI_PLAYER_DESIGN.md` — AIP-D18
Workflow: `docs/AI_PLAYER_AGENT_WORKFLOW.md` — AIP-AUTO-1

## Current task: IN_PROGRESS — AIP-SYNC-01 UX2 → AI integration

The user authorized this one-way sync only; do not modify `ux-v2` or `main`. Worktree: `/private/tmp/WTK-AIP-SYNC-03-20261115`, local branch `codex/aip-sync-03-20261115`. The merge commit is `8b074b42c4ce655b0123d7d0b64f06d64579c8aa` (AI base first parent `2255118aa2aa4212df2a9eec49049f69c7321aeb`; pinned UX2 second parent `bcc2a72e5b56db674700acf1775890522832caaa`; merge base `587d00f50204716ec1151d23881e838b9052bbc2`). The current remote feature tip is that merge SHA. Remote `ux-v2` has advanced to `9f8dd07446fc19ca121dd9e16fb0a9dfa4bc557d`; retain the authorized pin. No unresolved conflicts remain. Incoming UX2 docs and `HANDOVER.md` were not edited.

The merge preserves UX2 presentation/shared-response behavior and the AI bot lobby/controller/scheduler. AI migrations `0013`–`0015` remain unchanged; UX2's conflicting migration is additive local `0016_ux2_shared_response_window_submissions`. Before pushing the merge, default/Staging builds, Linux x64 lint (0 errors, 16 Hook warnings), fast **448/448**, API **379/379**, browser smoke **1/1**, UX2 targeted browser **6/6**, previously failing UX2 regressions **4/4**, three-Bot mobile smoke **1/1**, Staging guards **6/6**, generated Staging target checks, dry-run and both local D1 migration paths passed. No remote deployment or migration occurred in that pre-push phase.

### Exact-SHA CI checkpoint

Merge SHA `8b074b42c4ce655b0123d7d0b64f06d64579c8aa` was pushed normally to the feature branch. [Actions run 43844596604](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43844596604) ran on that exact SHA: lint/fast and browser smoke passed; API failed after its worker became ready and Wrangler logged `Error in ProxyController: Error inside ProxyWorker` with `Network connection lost.`; Staging and production deploy jobs were skipped. The uploaded runtime log confirms the Wrangler client-abort failure; no remote migration/deployment ran.

### Follow-up repair and next action

Added a CI-only, once-per-shard retry for that exact Wrangler disconnect, requiring a ready worker, exit code 1, and no later unrelated Wrangler error. Each attempt has separate Wrangler logs and gets a fresh local D1. Regression policy test passes; focused ESLint and `git diff --check` pass. After the repair, local API suite passed **379/379** across 31 files/two shards and fast tests passed **449/449**. Retry was not triggered in that local run.

Next: inspect the six-file follow-up diff, confirm remote `feature/smart-bot-player` remains at `8b074b42`, commit and push non-force to that branch only, then verify every exact-follow-up-SHA Actions job, the guarded Staging deployment/mobile smoke and production deploy skipped. Update this handover and only AIP-SYNC-01 status/evidence in the design with the observed outcome. Do not target production, use OpenAI, alter `ux-v2`/`main`, or start another AI task. Stop at `PENDING_REVIEW`; AIP-MOB-01 still needs real iPhone Safari acceptance.
