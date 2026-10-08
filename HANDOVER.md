# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result / CI

Closed `UX2.6-PHASE-C-BUMPER-HARVEST-ORDERED-ROOT-GRAPH-01`: the real
server-backed Bumper Harvest root, ordered branches, target-scoped Negation,
counter-Negation, and chooser advancement remain spatially stable. The failed
parent run `37824882092` (`936c8b2`) was Browser shard 2/2: two §12.9 Oath
cases crashed because `fixture.jsx` referenced out-of-scope `negationNodeCount`.
The fixture now derives parity from its projected public Negation nodes; both
Oath cases pass locally. Current task validation: Oath browser 11/11; Bumper /
Group root-graph browser 13/13; Presentation 122/122; engine/API 36/36; build,
targeted ESLint, and `git diff --check` passed. CI for the combined repair and
Bumper task commit is pending. Reviewer acceptance is not claimed.

## Design checkpoint

Latest `origin/ux-v2:docs/UX2-refine.md` blob reviewed at the task boundary:
`7feb8af937b6407f3f33c3959325db8d3f188cf4`. §6.7, §6.9, §6.18–§6.26 reviewed.

## Current / next task

`UX2.6-ATTACK-ROOT-GRAPH-LEGACY-ROUTING-01` — reproduce the reported
old/new Attack composition difference on the real server-backed path. Trace
whether legacy HeroFocus/Current Effect remains after authoritative Attack
root proof is available versus the intentional reveal/readiness transition;
keep fail-closed behavior when proof is absent. Prove the state transition and
containment in a focused browser regression; do not widen to other card or
skill families.
