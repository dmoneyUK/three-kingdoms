# HANDOVER — Current Task Only

Repository: `dmoneyUK/three-kingdoms` · target: `origin/ux-v2`

## Current task

**PUBLIC-INSPECT-REVEAL-01 · §10.28 — IN PROGRESS.** Fix the owner-reported mobile overlap where an open Hero Inspector causes a real, committed Steal CardFace reveal to move down into the PAC area.

**Design reviewed:** Current `docs/UX2-refine.md` §10.28, Tables A/B and sequencing notes at `069bd59247b0fbaf8e8a531108cba7a0d0de4bcd`; execution follows `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`. Public REVEAL has priority only when its genuine measured position conflicts with the optional local Inspector. Suspend and restore the Inspector presentation while preserving its selected Hero/state; keep the one authentic public card, PAC, countdown, private Console, actions, and Negation timer correct. Never use a candidate, response timer, or guessed event state as proof of active REVEAL.

**Acceptance:** Reproduce one real four-player ~390–440px mobile Steal plus server-authentic Negation window with Inspector open during REVEAL. Measure the genuine CardFace, Inspector, table safe bounds, PAC, countdown, Seats and Dock; prove the CardFace stays large/central and does not overlap protected content. Verify Inspector restoration after PARKED without card replay and ordinary private response remains usable. Local UI/browser testing has a five-minute cumulative cap; no desktop or viewport matrix.

**Current state (2026-11-01 20:47 UTC):** Remote and worktree were synchronized at `069bd59247b0fbaf8e8a531108cba7a0d0de4bcd`. Source diagnosis in §10.28 identifies an unsafe fallback when `singleTargetBattlefieldRevealCard()` rejects a candidate; exact runtime geometry still needs one focused reproduction. No source or test edits have been made for this task yet. Latest source-triggered exact-SHA Actions `41347877134` on `66d0e89f7f11498ba6c172bdf85172012d46d918` succeeded; this newer task has not been pushed. Preserve untracked generated `tsconfig.tsbuildinfo`; do not include it.
