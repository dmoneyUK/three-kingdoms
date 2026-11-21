# HANDOVER — UX2-DISMANTLE-SETTLEMENT-RETIRE-01

**Updated:** 2026-11-21 23:41 UTC
**Status:** Implemented and locally verified. Remote delivery and Owner iPhone review are pending.

## Current result

Dismantle settlement lifecycle now binds a visible result to its committed public event, room, source root/turn, action revision and public sequence. A proven later public event or turn handoff retires the centre result and old root ownership, including when the next `rootAction` is null. Temporary H4 occlusion pauses readable time; it does not retire the current result. A valid Dismantle result retains the 3-second read period. Steal privacy and unrelated Duel/Attack history are unchanged.

Changed files: `app/page.tsx`, `game/public-target-card-settlement-lifecycle.ts`, `tests/public-target-card-settlement-lifecycle.test.mjs`, `tests/browser/hero-active-skills-real-gameplay.spec.mjs`, `tests/run-fast-tests.mjs`, and this handover.

## Verification

2026-11-21 (individual test command timestamps were not captured):

- Lifecycle unit tests: 9 passed.
- Focused Gan Ning conversion → Negation pass → Shadowrunner discard → next-turn/discard browser regression: 1 passed after a fresh build.
- `npm run build`, focused test-file ESLint, and `git diff --check`: passed.
- `app/page.tsx` ESLint still hits a React Hooks stack overflow; the same failure reproduces on the unmodified base, so this run does not establish a task-specific lint failure or pass for that file.

## Delivery state and next step

Implementation is committed locally on `codex/ux2-1057-card-pool-footer`, based on `origin/ux-v2` at `d5e0e4984dfceb4be8f0a21b17b28f08dfc8e222`; the task worktree is clean. It has not been pushed. No exact-implementation-SHA GitHub Actions run, remote deployment, or production smoke check has been performed.

The `ux-v2` branch is checked out in `/Users/jingedai/.codex/worktrees/neg-a1/WTK` and that worktree contains local changes in `HANDOVER.md`, `app/page.tsx`, and `tests/browser/bumper-harvest-real-timer-gameplay.spec.mjs`. Do not overwrite or discard them. Reconcile a safe `ux-v2` delivery boundary, then run the exact-SHA workflow and required deployment/smoke checks. Owner iPhone re-review remains pending; do not mark user-accepted.

**Only current task:** finish remote delivery and hand off `UX2-DISMANTLE-SETTLEMENT-RETIRE-01` for Owner iPhone review. Do not start another task before that boundary is resolved.
