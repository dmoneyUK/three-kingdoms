# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result / CI

`UX2.6-PHASE-D-DISMANTLE-SETTLEMENT-LIFECYCLE-01` was pushed as
`431644d33c077c26119ba7329797ce6617510adb`; Actions run `37849530213` (#921)
completed successfully across API, lint/fast, both browser shards, and deploy.
`UX2.6-PHASE-D-STEAL-SETTLEMENT-LIFECYCLE-01` is implemented and locally
validated; its pre-commit parent was the exact green SHA above. The Steal
commit's Actions result remains to be observed after push.

## Design checkpoint

Latest remote `docs/UX2-refine.md` blob:
`7feb8af937b6407f3f33c3959325db8d3f188cf4` (unchanged). §§6.1, 6.17–6.21,
and 6.23–6.26 reread at the task boundary; §4D / §5 gates and the Roadmap's
remaining settlement evidence were checked.

## Current task

`UX2.6-PHASE-D-ORDINARY-ATTACK-HIT-SETTLEMENT-01` — after a real, direct
single-target Attack applies damage without Dodge or an intervening response,
project a server-owned result tied to the exact Attack root/resolution/source/
target. Show the resolved physical-seat graph for 0.4–0.8 seconds (shorter or
motionless under reduced-motion); keep prevented, zero-damage, Dying, delegated,
and Group cases fail-closed unless independently proven. Prove the real
server-backed no-Dodge path, geometry stability, and exclusions at mobile and
wide viewports. Before commit, inspect CI for the exact current remote `ux-v2`
HEAD; wait if running and repair actual failures before bundling this feature.
No Reviewer acceptance is claimed.
