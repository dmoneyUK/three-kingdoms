# Smart Bot Player — Current Coding Agent Handover

Branch: `feature/smart-bot-player`
Design: `docs/AI_PLAYER_DESIGN.md` — AIP-D18 (2026-11-04)
Workflow: `docs/AI_PLAYER_AGENT_WORKFLOW.md` — AIP-AUTO-1

## Current task: IN_PROGRESS — AIP-SYNC-01 UX2 → AI integration

The user authorized one one-way sync and prohibited modifying `ux-v2` or `main`. Work is isolated at `/private/tmp/WTK-AIP-SYNC-03-20261115`, branch `codex/aip-sync-03-20261115`. AI base and current remote feature SHA: `2255118aa2aa4212df2a9eec49049f69c7321aeb`; pinned UX2 parent: `bcc2a72e5b56db674700acf1775890522832caaa`; merge base: `587d00f50204716ec1151d23881e838b9052bbc2`. The remote `ux-v2` tip has since advanced to `9f8dd07446fc19ca121dd9e16fb0a9dfa4bc557d`; retain the authorized pin. No unresolved paths remain. The UX2 `HANDOVER.md` and UX2 docs are present only as incoming merge content and were not edited by this Agent.

### Result and validation

- Semantic integration retains UX2 presentation/shared-response behavior and the AI bot lobby, server controller and scheduler. AI migrations `0013`–`0015` are unchanged; UX2's conflicting migration is additive local `0016_ux2_shared_response_window_submissions`.
- Default and AI Staging builds passed. Linux x64 lint with Node 22.13.0 passed with 0 errors and 16 existing Hook warnings; the local arm64 lint stack overflow also reproduces on clean UX2. Fast tests: **448/448**; API suite: **379/379** across 31 files in two shards; standard browser smoke: **1/1**.
- Targeted UX2 browser regressions: **6/6**; the four previously blocking Judgement, Steal/Dismantle four-view, and five-seat touch cases reran **4/4**. The repaired copy/selectors and PAC-to-Console geometry follow the pinned UX2 semantics.
- Local three-Bot mobile smoke: **1/1**. AI Staging guard tests: **6/6**. Generated config verifies Worker `three-kingdoms-ai-staging`, isolated Staging D1, production D1 exclusion, `BOT_AI_ENABLED=false`, demo flag and Staging Cron. Wrangler Staging dry-run passed; no deployment occurred.
- Fresh local D1 migrated through `0016`; a separate local DB seeded through AI `0015` applied only additive `0016`. Both used `--local`; no remote D1 migration ran.
- `git diff HEAD --check` passes. The full manual UX diagnostics workflow was not run; standard browser smoke and the task's targeted S3 regressions passed.

### Publication checkpoint

The current remote AI SHA `2255118` is documentation-only and has no check runs. Its latest code-bearing ancestor `c79a6efd1e737f62f20684d2ad81769dc42f78aa` passed [Actions run 41948277563](https://github.com/dmoneyUK/three-kingdoms/actions/runs/41948277563), including the Staging job; production `deploy` was skipped. This is precommit evidence only. The pinned merge has no commit, push, exact-SHA Actions run or Staging deployment yet.

Next: verify both parents and that the remote feature branch remains at `2255118`; create one two-parent merge commit and push non-force to `feature/smart-bot-player` only. Then verify every exact-SHA Actions job, including Staging migration/deploy/mobile smoke and production `deploy` skipped. Do not target production or use OpenAI. Stop at `PENDING_REVIEW`; AIP-MOB-01 still requires real iPhone Safari acceptance before any overlapping AI task.
