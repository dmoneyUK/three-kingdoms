# HANDOVER — UX2 §10.67 STARGAZING-COMPACT-TWO-ZONE-POOL-01

**Updated:** 2026-11-22 10:16 UTC

**Status:** IN PROGRESS — SHARED MINIATURE SIZE / BOTTOM VISIBILITY CORRECTION

**Design reviewed:** `docs/UX2-refine.md` at `158d559445012f1bc4faf9263c9646943a1f82ff`, §10.67 (Owner iPhone verdict 2026-11-22 09:08 UTC).

## Current task

Correct the original §10.67 only. Replace Stargazing's oversized custom face with the same reusable 50×75 CSS px, 2:3 CardFace miniature used by the Steal/Dismantle public target pool. Make four cards in a two-Top/two-Bottom arrangement, both zone labels, and the single Confirm fully visible together without clipping or required scrolling. Preserve accepted zones, copy, card order/identity, drag, keyboard, privacy, and submission behavior.

## Resume / verification point

Worktree `/Users/jingedai/.codex/worktrees/ux2-1057-card-pool-footer` safely fast-forwarded from `2ad140fc` to `origin/ux-v2` at `158d5594`. Implemented shared `CardPoolMiniFace` presentation and switched both public target Equipment/Judgement faces and Stargazing faces/drag preview to it; retired Stargazing's conflicting large-face geometry and adjusted the two-zone/footer sizing. Updated the existing focused gameplay scenario to compare computed shared-face presentation and verify full 2+2 layout, drag/keyboard and submitted order. Focused render/reorder checks PASS (31/31); Stargazing API checks PASS (9/9); build PASS (only existing chunk-size/route-classification warnings); targeted ESLint, `node --check`, and `git diff --check` PASS. The 440×894 browser scenario PASS in 9.1s: shared Equipment/Stargazing faces match at 50×75px and 2:3; stable 2+2 geometry keeps all cards, both labels, and Confirm inside their intended areas; touch/keyboard reorder and one authorized submission pass. The geometry helper waits for the existing 170ms FLIP movement before checking stable bounds. Latest pre-commit Actions for `ux-v2` (`61c5a6a6`) fully passed, including lint/fast, API, browser startup, D1 migration, Worker deployment and production smoke; remote `ux-v2` remains at `158d5594`. Next: commit and push only this §10.67 correction, verify exact-SHA Actions/deployment/production smoke, then record actual delivery evidence in HANDOVER. Final status target: IMPLEMENTED / DEPLOYED — PENDING OWNER iPHONE RE-REVIEW.
