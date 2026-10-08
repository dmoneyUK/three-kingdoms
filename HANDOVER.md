# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result / CI

`UX2.6-PHASE-D-DISMANTLE-SETTLEMENT-LIFECYCLE-01` implementation and focused
validation are complete locally; task commit/push is pending. The exact remote
parent `2398922fc38d56ff3163d69c81ffe3c321ee080a` passed Actions run
`37847604812` (#920), checked before this task's commit. New task CI is not yet
available and must be recorded after push.

## Design checkpoint

Latest remote `docs/UX2-refine.md` blob:
`7feb8af937b6407f3f33c3959325db8d3f188cf4` (unchanged). §§6.9–6.11,
6.17–6.21, and 6.23–6.26 reviewed at the task boundary; §4D and its Section 6
gate were also rechecked. The current task was already active in HANDOVER.

## Current task

`UX2.6-PHASE-D-DISMANTLE-SETTLEMENT-LIFECYCLE-01` — add a server-owned,
fail-closed settlement proof for a real Dismantle target-card resolution, then
hold its exact root graph/result for 0.4–0.8 seconds before exit (shortened
under reduced motion). Preserve the hidden selected-card identity, stable
Seat/Dock geometry, and existing Stage/modal layering. Prove the complete
server-backed play → select → settlement → graph exit path; do not infer the
result from timeline order or private card data. Recheck exact-head CI before
commit; repair any failure with this task's change. No Reviewer acceptance is
claimed.
