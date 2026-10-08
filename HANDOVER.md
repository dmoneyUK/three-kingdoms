# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result / CI

`UX2.6-PHASE-D-ORDINARY-ATTACK-HIT-SETTLEMENT-01` is implemented and locally
validated. The exact pre-commit remote HEAD `0e5546ef800d345256f6024b631169cd1da6b605`
failed Actions run `37851251438` (#922): both browser shards lost the Wrangler
ProxyWorker connection; the API and lint/fast jobs succeeded. A bounded
CI-only recovery for that exact worker failure is included with this task's
changeset; the outgoing SHA has not yet been validated by Actions.

## Design checkpoint

Latest remote `docs/UX2-refine.md` blob:
`7feb8af937b6407f3f33c3959325db8d3f188cf4` (unchanged); §4.10 was reread at
the planning boundary.

## Current task

`UX2.4.10-STARGAZING-DRAG-DROP-ACCEPTANCE-CLOSURE-01` — close the single
reopened §4.10 refinement against real server-backed play. Preserve the current
three-zone implementation; add or fix the missing production proof for
cross-zone drag/reassignment and return to Revealed Cards, stale-revision
rejection, and keyboard operation of the accessible Move menu. Recheck the
existing §4.10 acceptance matrix (exact ordering/submission, conservation,
privacy, cancellation, 390×844/480×900/320px-class/wide layout and Dock/Seat
stability). Do not change Stargazing rules/API or Interaction Stage geometry.
Before each commit, inspect the latest relevant CI for the exact remote HEAD;
repair a real failure without weakening coverage. Reviewer acceptance remains
human-owned.
