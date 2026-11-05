# Smart Bot Player — Current Coding Agent Handover

Branch: `feature/smart-bot-player`
Design: `docs/AI_PLAYER_DESIGN.md` — AIP-D18 (2026-11-04)
Workflow: `docs/AI_PLAYER_AGENT_WORKFLOW.md` — AIP-AUTO-1

## Current task: IN_PROGRESS — AIP-SYNC-01 guarded UX2 → AI merge

The Product Owner authorized this one-way synchronization. Follow AIP-D18 §AIP-SYNC-01 S0–S5. Do not write `ux-v2` or `main`, start overlapping AI work, self-accept, deploy production, migrate production D1, or make OpenAI calls. Finish at `PENDING_REVIEW` after exact-SHA Staging CI, or `BLOCKED` if a safety gate fails. Human iPhone Safari review remains pending for both the sync and AIP-MOB-01.

### Current integration checkpoint (2026-11-05)

- Isolated worktree: `/private/tmp/WTK-AIP-SYNC-01-20261105`; local integration branch `codex/aip-sync-01-20261105`. Destination AI base and current `origin/feature/smart-bot-player` are both `3e76d0ea0ad5f0c479991534b3357aa575779c46`. UX2 source is pinned at `587d00f50204716ec1151d23881e838b9052bbc2` (latest code-bearing ancestor `bf327e76b11efcfefae2f14bc0f7ccfa8090d521`, exact [Actions 41935465005](https://github.com/dmoneyUK/three-kingdoms/actions/runs/41935465005) success). `origin/ux-v2` has since advanced to `89ae33507cf176b425090d087f23f2c4896a61f9`; keep the approved pin and do not chase it. Merge base `93f51e609f1f01742c1428c1c6f1f8a3469ff91e`; 64 AI-only / 516 UX2-only commits, 127 paths. The no-commit merge is resolved in the isolated worktree; seven conflicts were reconciled semantically. It is not yet committed or pushed. The primary UX2 worktree's existing dirty changes remain untouched.
- Preserved the genuine bot principal/controller, host authorization, revision/replay checks, scheduler, `0013`–`0015`, isolated Staging Worker/D1/Cron and feature-branch deploy guard alongside the pinned UX2 room, public-stage, gameplay and presentation code. The API runner has two unique shards and discovers each of its 30 API files once. The AI bot lobby-capacity fixture follows UX2's six-seat cap. `tests/browser/staging-room-reconnect.spec.mjs` now waits for the UX2 end-turn confirmation before expecting the authoritative `end_turn` request.
- Local evidence: default and AI Staging builds passed; lint passed with 0 errors and 15 existing React Hook warnings; fast suite 404/404; API 350/350 across two shards; room-safety rendering 24/24; focused six-path UX2 Steal/Burning Bridges mobile regression 6/6; normal browser smoke 1/1; AI Staging-configured Bot demo smoke 1/1; Bot-demo-disabled legacy Test Player smoke 1/1. The disabled run's local D1 shows a playing room with three `is_test_player` seats and zero bot seats. AI Staging guard tests passed 6/6; generated config and Wrangler dry-run verified Worker `three-kingdoms-ai-staging`, D1 `62616495-59ea-4a9c-b669-2d3267a83cab`, production D1 excluded, `BOT_AI_ENABLED=false`, `BOT_DEMO_ENABLED=true`, and Staging Cron. Clean and existing-schema migrations applied only to isolated local D1s through `0015`. No remote Cloudflare write has occurred.
- Full `git diff --check` found one inherited upstream trailing space at `docs/UX2-refine.md:827`. That UX2 design file is preserved unchanged per task scope; diff checks excluding that upstream file pass, and the seven conflict paths contain no markers. Browser reports/screenshots are retained outside the repository at `/private/tmp/WTK-AIP-SYNC-01-evidence-20261105/`.
- The existing Bot pilot's exact source run [41820787078](https://github.com/dmoneyUK/three-kingdoms/actions/runs/41820787078) succeeded on `8b49e13ea00870ad9a96438b8c92bb07a17ca05d`, including guarded Staging deploy and mobile-emulated bot/rejoin smoke; production `deploy` was skipped. This is not real iPhone acceptance.

### Required next steps

1. Reconfirm the remote AI destination is still `3e76d0ea0ad5f0c479991534b3357aa575779c46`; finish staged diff/ancestry review and create one proper two-parent merge commit.
2. Non-force push only `feature/smart-bot-player`. Verify exact merge-SHA GitHub Actions, including full validation, guarded Staging D1 migration/deploy and mobile room/rejoin smoke; production `deploy` must be `SKIPPED`. Confirm the deployed Staging build SHA and the new UX2 + Bot behavior.
3. Update only this handover and AIP-SYNC-01 implementation evidence/status in the design to `PENDING_REVIEW` after all gates pass. Preserve AIP-MOB-01 as `PENDING_REVIEW`; stop for the combined human iPhone Safari review. Do not start AIP-02A or another task.

### AIP-MOB-01 review boundary

The deterministic pilot uses server-owned bot identities and canonical room action handlers; unsupported response/Negation/Dying/trigger/target families fail closed. Its live Staging evidence is documented above. No OpenAI calls, production deployment or production D1 migration are authorized. Human review still needs to create a Staging room, add three bots, select a Hero, take a human turn, observe all three bot turns, refresh/rejoin, and inspect the integrated UX2 presentation on iPhone Safari.
