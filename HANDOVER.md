# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result / CI

`UX2.6-PHASE-D-NEGATION-CHAIN-COMPACTION-01` is implemented: real
server-backed single-target and Raining Arrows Group chains each passed at
390×844, 480×900, and 1440×900 (6/6). Assertions cover the stable root,
latest response and source tether, `+4` history/counter relation, scoped Group
branch disposition, public/private separation, containment, and no horizontal
overflow. Production build, targeted ESLint on the changed TSX/browser spec,
`node --check`, and `git diff --check` passed. One earlier combined lint
process hit Node's default heap limit; isolated checks then passed. Screenshots
were captured by Playwright, not manually reviewed. Before-commit parent
`21c055269182590b450e65477cc84ed2d0519d75` passed push Actions run
`37777442409`. This task commit's CI has not yet been checked; check the exact
new remote SHA before the next commit. Reviewer acceptance is not claimed.

## Design checkpoint

Re-fetched `origin/ux-v2`; `docs/UX2-refine.md` is blob
`7feb8af937b6407f3f33c3959325db8d3f188cf4`. Re-read §§6.14–6.26 at the
planning boundary. Phase D still authorizes public Hero-skill/non-card effect
nodes; Section 6.24 requires server-backed semantic and responsive evidence.
Pre-§5 §4D remains closed.

## Current / next task

`UX2.6-PHASE-D-FANJIAN-EFFECT-NODE-01` — project one real Zhou Yu Sowing
Distrust activation from its server-owned continuation into a compact public
Effect node (not a fake physical card), with proven source and target relations
while the target makes the active suit/card choices. Keep all legal/private
choices in the Local Player Dock; expose no hidden card identity or private
eligibility. Require an exact public root-event link and fail closed on missing
or mismatched proof. Add a real server-backed browser path from skill
activation through the target decision, proving node reachability, responsive
geometry, privacy, and stable Seats/Dock. Do not infer causality from log text
or alter gameplay rules.
