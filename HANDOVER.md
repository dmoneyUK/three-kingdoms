# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result / CI

Prior result `63ae1abcb72aaa972199e26ac7bd2bdf2811e22a` is pushed. Exact
Actions run `37805584866` failed in Browser shard 2 (shard 1 cancelled; Lint/
fast and API passed). GitHub logs return 403. Exact-SHA local shard 2 passed
412 tests with one flaky first attempt in the 650px Hand-anchor test. Its
scroll-to-mutation event race is fixed by waiting for the real scroll event;
30/30 focused repetitions passed without weakening geometry assertions. This
repair will ship with the active feature change per the current commit cadence.
The active §6.20 graph narration composes only the proven root, submitted
responses, and collapsed public history. Local evidence: build, targeted
ESLint, diff check, and real-gameplay Browser tests 9/9 passed; the Hand
membership-change group passed 4/4 with the repaired event barrier.

## Design checkpoint

Latest `origin/ux-v2:docs/UX2-refine.md` remains blob
`7feb8af937b6407f3f33c3959325db8d3f188cf4`. Section 6 Phase D is active;
Reviewer acceptance has not been asserted.

## Current / next task

`UX2.6-PHASE-D-PUBLIC-GRAPH-SCREENREADER-NARRATION-01` — provide one concise
accessible description from the visible graph's proven root, submitted
responses, and collapsed public-history count. Keep private responder/legal
data out, fail closed with the visual graph, and prove real Attack→Dodge,
Negation-chain, and Sowing Distrust paths. These changes and the focused CI
test-race repair are ready for the same commit and push.
