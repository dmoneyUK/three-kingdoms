# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result and CI

Remote `ux-v2` HEAD `dc30a4caf6e3b21de37d065b7b83ac4e6da6e696` passed Actions #828 (`37570332190`), including `build-and-test` and `deploy`. The current passive-skill change is local and not covered by CI yet; its focused browser specs passed 7/7, targeted ESLint passed, and `git diff --check` passed. The earlier CI #817 browser failure was addressed by the condensed-font fallback in `73fa255` and later exact-SHA runs #824–#828 succeeded.

## Design checkpoint

Reviewed remote `docs/UX2-refine.md`, blob `7e021455c8fdc9e88dc1b3b20d036400da82be44`; current task authority: §§1.4–1.10. No remote design change since the prior review.

## Current task

`UX2.REFINE-PASSIVE-SKILL-STATIC-PRESENTATION-01` — implementation uses an explicit Hero/skill registry to render Battle Cry, Horse Riding, Wizardry, Deliverance, Modesty, Unrivaled, and Militia as accessible non-actionable passive tiles alongside Empty Fortress. Tests verify no action on click, preserve authoritative Ma Chao Cavalry activation, and cover roster geometry at 320×640, 390×844, 480×900, and 1440×900. Triumphant's voluntary choice and Axe of Insanity's mandatory continuation are out of scope. No gameplay/domain changes. Recheck Actions for exact remote HEAD before committing this task and handoff.
