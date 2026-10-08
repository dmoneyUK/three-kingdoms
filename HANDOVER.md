# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result / CI

`UX2.6-PHASE-C-GROUP-TARGET-EFFECT-SCOPE-AUTHORITY-01` is implemented. The
server-backed API suite passed 34/34; PresentationV2, Snapshot, and Client
tests passed 114/114; build, targeted ESLint, and `git diff --check` passed.
This was an authority-only change; no new browser geometry was introduced.
Exact pre-commit parent `c0e7921b2ac29ddb34847dd16227c853a6b0c3cd` passed all
five Actions jobs in run `37770799050`. Inspect this task commit's exact-SHA CI
before the next commit. Reviewer acceptance is not claimed.

## Design checkpoint

Re-fetched remote `docs/UX2-refine.md`, blob
`7feb8af937b6407f3f33c3959325db8d3f188cf4`; it is unchanged from the last
reviewed revision. Re-read §§6.10, 6.13, and 6.24–6.26, including the §4D gate
and its completed P1–P5 / §4A / §4.10 roadmap evidence. The new typed scope now
identifies one proven Group target-effect branch; the existing physical-seat
graph still renders only during Group resolution, so committed Group Negation
and counter-Negation have no branch-attached graph yet.

## Current / next task

`UX2.6-PHASE-C-GROUP-TARGET-EFFECT-COUNTER-GRAPH-01` — keep the authoritative
Group root and target branches visible during a proven Group Negation chain;
render only committed public Negation nodes, tether each to its proven actor,
and attach the first counter relation to the exact target-effect branch named
by `groupTargetEffectScope`, with later counter-Negations attached to the
preceding Negation. Only that branch may appear blocked/reactivated; preserve
the root and unaffected branches, fail closed on missing/mismatched proof, and
show no private responder placeholder. Extend the typed projection with
branch effect state only as required to represent authoritative `negated` /
`chainDepth` coherently. Prove real Raining Arrows and Barbarian Invasion open,
first-Negation, and counter-Negation browser paths with branch/root geometry,
containment, and no horizontal overflow; retain ordinary single-target graph
regressions. Do not change gameplay rules or globally cancel the Group root.
