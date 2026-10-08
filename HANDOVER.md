# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result / CI

`UX2.6-PHASE-C-DUEL-EXCHANGE-GRAPH-01` is implemented locally: the physical-seat
graph keeps one stable Duel root and renders only the latest authoritative
Attack response, with the actual card submitter tether distinct from the
semantic decision actor/target arrow. Server-backed physical and delegated
browser flows passed 5/5 across 390×844, 480×900, and 1440×900; the existing
Attack/Dodge graph regression passed 13/13. Build, targeted ESLint, and
`git diff --check` passed. Exact pre-commit parent
`e2761413c5f60f78ffdbb6285f752509a063963f` Actions run `37762264558`: attempt 1
failed one synthetic-touch Stargazing assertion; exact-SHA attempt 2 completed
all five jobs successfully. The new task commit's CI is pending after push.
Reviewer acceptance is not claimed.

## Design checkpoint

Re-fetched and reviewed remote `docs/UX2-refine.md`, blob
`7feb8af937b6407f3f33c3959325db8d3f188cf4`, including §4.10, §4A–§4D, and
§6.1–§6.26. The pre-Section-6 gates and Phase A/B work are complete. Duel root
and exchange-graph work in Phase C is now implemented; the next bounded item
is the authoritative multi-target active-branch graph.

## Current / next task

`UX2.6-PHASE-C-GROUP-TARGET-BRANCH-GRAPH-01` — for proven `GROUP` semantic
continuations only, render one persistent root card with physical-seat-anchored
branches for authoritative participants; only the server-proven current
participant is strongly active, and the root/seats stay fixed as progress
advances. Preserve only projection-proven statuses/outcomes and fail closed to
the existing safe Stage when proof or anchors are incomplete. Exclude ordered
Halberd progress, Negation branches, and target-specific counter/effect graphs.
Prove real server-backed Raining Arrows participant advancement (and Barbarian
Invasion where supported), 390×844 / 480×900 / wide geometry, no Seat/Dock
movement or overlap/overflow, privacy, and safe fallback. Do not infer active
branches from participant-array order, timeline, HP, or DOM position.
