# Smart Bot Player — Current Coding Agent Handover

Branch: `feature/smart-bot-player`
Design: `docs/AI_PLAYER_DESIGN.md` — AIP-D18
Workflow: `docs/AI_PLAYER_AGENT_WORKFLOW.md` — AIP-AUTO-1

## Current task: IN_PROGRESS — owner-authorized repeat UX2 → AI sync (AIP-SYNC-01)

The Product Owner authorized this one-way sync on 2026-11-20 and directed that AI Player experiments may proceed after it. Integration worktree: `/private/tmp/WTK-AIP-SYNC-04-20261119`, local branch `codex/aip-sync-04-20261119`; intended destination is `feature/smart-bot-player`. Never write to `main` or `ux-v2`.

### Pinned state

- AI destination before merge: `509f0ba73fa8693e0616be42050c6a401a34238c`; latest validated code ancestor: `63c40f6317c0848e3aebded8b91ff6c628356211`, [Actions 43848297264](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43848297264) succeeded including isolated Staging; production `deploy` skipped. The current destination SHA is docs-only and has no run.
- UX2 merge base: `bcc2a72e5b56db674700acf1775890522832caaa`. Code-bearing UX2 revision: `75382e28366ca20a869e02a709a80ec9c847629a`, [Actions 44173403218](https://github.com/dmoneyUK/three-kingdoms/actions/runs/44173403218) succeeded. Latest UX2 tip: `94381f44163c2158301294396a6cf1b9e6e17b22`; commits after `d36f52a` change only `docs/UX2-refine.md` (211 lines; no source or `HANDOVER.md` delta).
- Local merge commits: `d17c807b` merges `d36f52a`; `bb144221` merges the latest UX2 tip. Both AI base `509f0ba` and UX2 tip `94381f4` are verified ancestors. The remote AI feature branch is still at `509f0ba`; a non-force fast-forward push is safe if it remains unchanged. No unresolved conflicts remain.

### Validation and boundaries

- Default build passed; fast suite **471/471**; API suite **390/390**; browser smoke **4/4**.
- Isolated local three-deterministic-bot browser smoke passed **1/1** earlier in this task. It used local D1 only; no remote Cloudflare operation occurred.
- Staging-target build and `verify-ai-staging-config.mjs` passed: Worker `three-kingdoms-ai-staging`, isolated Staging D1 UUID, production D1 excluded, `BOT_AI_ENABLED=false`, `BOT_DEMO_ENABLED=true`; config tests **6/6**.
- Pending sync-fix commit contains: bind conversion H4 copy to the exact physical root event and display presentation narration only when it owns the current copy; update the public Treachery outcome expectation; pass the server's current shared rescue `windowId` in the First Aid browser setup. Focused ESLint reports **0 errors, 14 Hook warnings**; targeted God of War/Braveheart browser regressions passed **4/4**.
- Focused W4 First Aid browser test remains a local failure: after its 12-second animation wait it observes the already parked historical card. The attempted priority/fresh-event change was reverted. The UX code-bearing baseline has the same First Aid candidate selection and event freshness logic; do not claim this test is fixed. Recheck or report this timing-sensitive gap with exact CI evidence.
- Full local lint has a known macOS ARM React Hooks stack overflow also reproduced on the clean UX baseline; do not weaken lint. Exact feature-branch Actions is required.
- No production Worker/D1 change, no live OpenAI call, no real-player data transfer. AIP-MOB-01 remains `PENDING_REVIEW` for physical iPhone Safari review.

### Next checkpoint

Commit only the validated integration compatibility fixes plus this handover and AIP-SYNC-01 evidence; inspect `git diff --check` and deployment guards, then push the final sync to `origin/feature/smart-bot-player`. Verify lint/build/fast, API, browser, Staging target and isolated smoke jobs for the exact pushed SHA; confirm production `deploy` is skipped. Only after that sync gate passes, continue the owner's explicitly requested non-overlapping offline/mock AIP-02A; do not start AIP-02B or implement gameplay.
