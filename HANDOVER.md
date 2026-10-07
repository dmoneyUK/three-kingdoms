# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result and CI

`UX2.REFINE-HUA-TUO-FIRST-AID-SKILLS-BAND-01` now exposes Hua Tuo's First Aid only through the owner's Skills band when authorized `CurrentAction.options` contains `hua_tuo_first_aid`; private eligible-card selection submits through existing `respond`, while Peach/Skip remain intact. Focused browser coverage passed 3/3 across 390×640, 390×844, 480×900, and 1440×900; targeted ESLint and `git diff --check` passed. The exact pre-commit base `e642e80c75d475e99862498856f4e4614565dde3` passed Actions run #841 (`37594013797`), including `build-and-test` and `deploy`. This task's push-triggered run has not yet been observed. No Reviewer acceptance claimed.

## Design checkpoint

Reviewed the full current remote `docs/UX2-refine.md`, blob `347db2e2bc8768620eaf69bbd84191a1a79792d3`. §4A transient-event timer/overlay refinement must close before §6; §6 physical-seat causal graph is part of UX2, and final AOE revalidation plus Reviewer acceptance are required for UX2 completion. §1.8 keeps cross-Hero passive choices in the viewer's Local Dock Action Row.

## Current task

`UX2.REFINE-PRIVATE-DRAW-COUNTDOWN-CLUSTER-01` — move only the viewer-private Private Draw countdown from the full-table content overlay into the existing lower-right `StageSystemCluster`, immediately left of System Menu. Preserve event timing, viewer-only cards/title, and an accessible full timer label; do not change overlay height, server/gameplay semantics, or other event countdowns. Prove 390×844, 480×900, and wide timer/menu placement, privacy, containment, and no horizontal overflow.
