# Smart Bot Player — Current Coding Agent Handover

Branch: `feature/smart-bot-player`
Design: `docs/AI_PLAYER_DESIGN.md` — AIP-D18 (2026-11-04)
Workflow: `docs/AI_PLAYER_AGENT_WORKFLOW.md` — AIP-AUTO-1

## Current task: PENDING_REVIEW — AIP-SYNC-01 UX2 → AI integration

The Product Owner authorized this one-way sync. The implementation is complete and awaits the combined human iPhone Safari review below. Do not write `ux-v2` or `main`, start AIP-02A or other overlapping work, self-accept, deploy production, migrate production D1, or make OpenAI calls. Keep AIP-MOB-01 `PENDING_REVIEW` until the human review is recorded.

### Merge and exact-SHA evidence

- Two-parent merge commit: `c79a6efd1e737f62f20684d2ad81769dc42f78aa`; parents are AI `3e76d0ea0ad5f0c479991534b3357aa575779c46` and pinned UX2 `587d00f50204716ec1151d23881e838b9052bbc2`. Merge base: `93f51e609f1f01742c1428c1c6f1f8a3469ff91e`; seven conflicts were resolved semantically. `origin/ux-v2` later advanced to `89ae33507cf176b425090d087f23f2c4896a61f9`; the approved pin was retained. The dirty primary UX2 worktree was not changed.
- Exact [GitHub Actions run 41948277563, attempt 1](https://github.com/dmoneyUK/three-kingdoms/actions/runs/41948277563) on the merge SHA completed successfully: lint/build/fast, API, browser smoke, Staging target guard, D1 migration step, Worker deployment and Staging mobile smoke succeeded; production `deploy` was `SKIPPED`. The Staging D1 step reported “No migrations to apply.”
- Staging Worker `three-kingdoms-ai-staging`, deployed version `7aac7c41-e2d6-495d-b0a7-6a5c266f5b50`, uses D1 `62616495-59ea-4a9c-b669-2d3267a83cab`; production D1 `3151997a-f69e-4a45-ab51-9e4fd062aeb3` was excluded. `BOT_AI_ENABLED=false`, `BOT_DEMO_ENABLED=true`, Staging Cron enabled. Exact build SHA `c79a6efd1e737f62f20684d2ad81769dc42f78aa` was checked by the passing smoke. Staging `/api/health` returned `{"ok":true,"worker":"available"}`.
- GitHub mobile smoke passed 1/1 in 4.2 minutes: one host plus three genuine bots, Hero selection, a human turn, three bot turns, return of human control and refresh/rejoin. It is Chromium mobile emulation, not real iPhone acceptance. [Uploaded Staging evidence](https://github.com/dmoneyUK/three-kingdoms/actions/runs/41948277563/artifacts/13380665251).

### Local validation and boundaries

- Default and Staging builds passed; lint 0 errors / 15 React Hook warnings; fast 404/404; API 350/350 across two unique shards and all 30 API files once; room-safety render 24/24; focused six-path Steal/Burning Bridges mobile regression 6/6; normal browser smoke 1/1; local Staging Bot-demo-on and legacy demo-off mobile smoke 1/1 each. Demo-off local D1 ended with three `is_test_player` seats and zero bot seats. Staging config guards passed 6/6; generated config/dry-run and clean/existing-schema local D1 migrations through `0015` passed.
- The merged browser test now confirms the UX2 end-turn panel before waiting for `end_turn`. Bot principal/host authorization/revision guards/scheduler, migrations `0013`–`0015`, Staging-only config/deploy and UX2 public board/game presentation remain integrated.
- Full `git diff --check` reports one inherited trailing space at `docs/UX2-refine.md:827`. The upstream UX2 design file is preserved unchanged; checks excluding that upstream file pass, and no conflict markers remain. Reports/screenshots are retained at `/private/tmp/WTK-AIP-SYNC-01-evidence-20261105/`.
- No production Worker/D1 mutation or OpenAI request occurred. The only remote write was the authorized AI feature-branch push, whose Actions deployed to isolated AI Staging.

### Human reviewer handoff

On iPhone Safari, open the AI Staging URL, create a room, add three bots, start the game, select a Hero, take a human turn, observe each bot act, refresh/rejoin and confirm human control returns. Review the integrated UX2 public board and response presentations, and confirm no private role/hand data is exposed. Record acceptance or findings in `docs/AI_PLAYER_DESIGN.md`; do not treat the automated Staging pass as phone acceptance. After that review, re-read the latest design before selecting any next task.

The deterministic Bot pilot remains bounded: unsupported response/Negation/Dying/trigger/target families fail closed. Live OpenAI calls, external real-player data, production deployment and production migrations remain unauthorized.
