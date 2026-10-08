# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result / CI

`UX2.6-PHASE-C-BARBARIAN-INVASION-SETTLEMENT-HOLD-01` is implemented locally.
The shared server-authored settlement proof now covers ordered terminal
Raining Arrows and Barbarian Invasion outcomes, with exact root/resolution
binding, viewer-equal public projection, privacy sanitization, and a measured
root-graph hold. CI repair for parent `07c2d5dd8e0f827d0b3e6d7408cf15ffbb0def0f`
is included: two stale `groupSettlements` fixture/assertions and a lost-pointer-
capture cancellation handler. Parent Actions run `37860968183` (#925) completed
failed in fast tests and browser shard 2; API and browser shard 1 succeeded.
Focused local checks passed; outgoing Actions are pending. Reviewer acceptance
is not claimed.

## Design checkpoint

Latest remote `docs/UX2-refine.md` blob:
`7feb8af937b6407f3f33c3959325db8d3f188cf4` (unchanged). At this boundary,
§6.9, §6.17, §6.19–6.26 were re-read. The Phase C multi-target criteria remain
active; Bumper Harvest has ordered root/branch proof but no final root-graph
settlement hold.

## Current task

`UX2.6-PHASE-C-BUMPER-HARVEST-SETTLEMENT-HOLD-01` — add a fail-closed,
server-authoritative terminal settlement proof for one real Bumper Harvest,
bound to its exact root event/resolution/frame and ordered participant
outcomes. Keep the physical-seat root graph visible for the designed brief
settlement interval, then remove it; preserve viewer-equal public facts,
private-card privacy, stale/malformed fail-closed behavior, fixed Seats,
Dock containment, and reduced-motion behavior through real API/browser proof.
Reuse existing Bumper Harvest progress authority; do not expand to Oath or
other card/gameplay semantics. Before the next commit, verify the exact current
remote `ux-v2` CI state and follow the commit-time CI gate.
Reviewer acceptance remains human-owned.
