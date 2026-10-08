# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result / CI

`UX2.4A-BUMPER-HARVEST-60S-REAL-GAMEPLAY-PROOF-01` is complete. The
server-backed browser path played Bumper Harvest through the real chooser
sequence and verified a fresh server deadline and visible compact timer for
each active chooser. Geometry assertions passed at 390×844, 480×900, and
1440×900, including an isolated timer visibility delta, menu/Guidance stability,
no timer overlap, and no horizontal page overflow. The timer implementation
already existed; this adds production-path proof. `node --check`, targeted
ESLint, the focused browser spec (1/1), and `git diff --check` passed. Exact
pre-commit remote head `3486caee8e7555aa979d676ef4e06f318658118b` passed Actions
run `37782474909`. The task commit's CI is pending verification after push.
Reviewer acceptance is not claimed.

## Design checkpoint

Re-fetched `origin/ux-v2`; `docs/UX2-refine.md` remains blob
`7feb8af937b6407f3f33c3959325db8d3f188cf4`. Re-read §§4.10, 4A.7–4A.10, and
the §4D Section 6 gate. Section 6 remains deferred until the listed pre-§5
requirements close. During the real timer path, the active choice panel measured
459px wide at a 390px viewport and extends beyond the right edge.

## Current / next task

`UX2.4A-BUMPER-HARVEST-MOBILE-CHOOSER-FIT-01` — contain the real active
Bumper Harvest choice panel and its cards within 390×844 and 480×900 portrait
viewports (include a narrow-width check), with no clipping or horizontal
overflow. Preserve the compact timer beside the System Menu, stable Guidance
and Dock geometry, and prove the production server-backed chooser path.

Previously started Fanjian/§6 changes remain uncommitted and preserved in the
worktree; keep them out of pre-§5 commits. Resume §6 only after the §4D gate is
actually closed. Do not discard or overwrite those local changes.
