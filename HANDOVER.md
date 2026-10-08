# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result / CI

`UX2.6-ATTACK-ROOT-GRAPH-ROUTING-LEGIBILITY-01` was pushed as
`d124878089c27a5baa3f5e94410d85249e62c8e6`. Actions run `37844615401`
(#919) attempt 1 failed browser shard 1 after Wrangler/Miniflare logged
`Network connection lost` and the local Worker port closed; 397/418 browser
tests passed before 21 failures cascaded from that disconnect. Attempt 2
passed all five jobs, including both browser shards, API, lint/fast, deploy,
and production smoke, on that exact SHA. No code change was needed for the
transient worker disconnect.

## Design checkpoint

Latest remote `docs/UX2-refine.md` blob:
`7feb8af937b6407f3f33c3959325db8d3f188cf4` (unchanged). §§6.9–6.11,
6.17–6.21, and 6.23–6.26 reviewed at the task boundary.

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
