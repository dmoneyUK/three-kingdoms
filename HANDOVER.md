# HANDOVER

Target branch: `ux-v2` (working branch: `codex/quick-test-modes`). Phone-first; no desktop review.

## Latest execution state

**T3-F1 · R2 — IMPLEMENTED LOCALLY / CI AND DEPLOYMENT PENDING / PENDING USER PHONE RE-REVIEW.** Reviewed `docs/UX2-refine.md` §10.10.3.1 at `origin/ux-v2` `c4411a6`; intervening changes only add W3-F2-R1 design instructions and do not alter T3-F1 R2.

The proven local Steal/Burning Bridges root now keeps one `single-target` renderer and room/viewer/root/card/author ownership through Negation, target choice and settlement wrappers. Local authored roots prefer the actual Local Player Dock. Same-geometry observer callbacks are no-ops; an in-flight MOVE keeps its painted position and remaining duration through reflow, while unsafe missing author geometry retries without a synthetic centre miniature. Server legality, settlement, card identity and private-hand projections are unchanged.

**Focused validation:** `npm run build` passed; `node --import tsx --test tests/public-card-announcement.test.mjs` passed 5/5; focused ESLint passed with 0 errors and 16 existing Hook-dependency warnings; one authenticated mobile Playwright regression passed 1/1 (4-seat seed, 390×844, two viewer sessions, real local Steal and hidden-Hand privacy); `git diff --check` passed. This covered unchanged-geometry resize during MOVE and all-pass Steal settlement. Local/opponent Dismantle, counter-Negation, real viewport resize mid-MOVE, TEST SWITCH, Inspector interaction, and 6/8-seat layouts remain unverified and are not claimed as passes.

The last observed successful pushed Actions run was `40142844364` on `f954d67390ae3a548429addf5d8be39fb96c497f`; it is baseline evidence only. This implementation has not yet been pushed, and no exact-SHA CI, Worker deployment or production health is claimed.

## Exactly one current bounded task

Finish T3-F1 R2 delivery: commit and push only this task's implementation, focused regressions, design-status and handoff updates to `ux-v2`; verify all required Actions jobs and deployed Worker/production smoke on the exact pushed SHA. Then leave T3-F1 **IMPLEMENTED / DEPLOYED — PENDING USER PHONE RE-REVIEW**, preserving the earlier passed opponent Dismantle/continuation checks and requesting review of local Steal, Negation/counter and 6/8-seat switching.
