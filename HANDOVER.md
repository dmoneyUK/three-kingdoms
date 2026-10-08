# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result / CI

`UX2.6-PHASE-C-GROUP-TARGET-BRANCH-GRAPH-01` is implemented locally. Real
server-backed Raining Arrows and Barbarian Invasion graphs passed at
390×844, 480×900, and 1440×900, including participant advancement, stable
root/Seat geometry, source/branch endpoints within 1.5px of their authoritative
physical anchors, no card/Seat/Dock overlap or horizontal overflow, private-Hand
exclusion, and fail-closed fallback. Eight focused production-path browser
cases, 18 root/Duel regression cases, build, targeted ESLint, and
`git diff --check` passed. Before-commit parent `3fe0592c56b861138ccfc05ba14f8f2b97bb634e`
passed all five Actions jobs in run `37767512338`; the task commit's run is
pending verification at the next commit boundary. Reviewer acceptance is not
claimed.

## Design checkpoint

Re-fetched remote `docs/UX2-refine.md`, blob
`7feb8af937b6407f3f33c3959325db8d3f188cf4`, and reviewed §§6.9–6.11,
6.16–6.20, and 6.24–6.26. The public Group graph now keeps one root fixed and
switches only the proven active target branch. Group Negation currently has a
server-owned `effectTargetId`, but the public reaction-chain contract does not
explicitly link that chain to its target-effect branch.

## Current / next task

`UX2.6-PHASE-C-GROUP-TARGET-EFFECT-SCOPE-AUTHORITY-01` — add a typed public
presentation proof associating an in-progress Group Negation/counter-Negation
chain with exactly one target-effect instance, only when the existing
server-owned `effectTargetId`, Group root frame/current target, interaction,
checkpoint, and presentation revision agree. Carry and revalidate the proof
through PresentationV2, Snapshot, and Client; fail closed on mismatch and keep
it viewer-equal without exposing private response options. Prove real
Raining Arrows and Barbarian Invasion API chains, including counter-Negation,
malformed target mismatch, and ordinary single-target Negation compatibility.
Do not change gameplay rules or render new counter geometry in this task; stop
after the authoritative contract and focused proof are complete.
