# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result / CI

Attack graph task commit `fb8556b44190dbbda29b0a6f586c566e7785c55c` is on
`origin/ux-v2`. Exact Actions run `37832882294` (#914) failed Browser shard 1:
four Bumper Harvest Negation-layout cases lacked `publicNodeEventLinks` and
their matching public Negation timeline events in the browser fixture. This is
a stale fixture contract, not a production failure. The fixture now carries
those exact links/events and the browser regression checks their identity and
resolution mapping. `bumper-harvest-composition.spec.mjs` passed 10/10 locally;
`git diff --check` passed. Repair changes are not yet committed or pushed.

Attack’s ordinary server-backed graph proof passed 10/10 across 4/6/8 players
and 390×844, 480×900, 1440×900. Its exact-push CI was not green because of the
fixture failures above; reviewer acceptance is not claimed.

## Design checkpoint

Latest `origin/ux-v2:docs/UX2-refine.md` is unchanged at blob
`7feb8af937b6407f3f33c3959325db8d3f188cf4`. Re-read §§6.7, 6.9, 6.24–6.26.

## Current task

`UX2-CI-REPAIR-BUMPER-NEGATION-EVENT-PROOF-01` — keep the existing branch,
geometry, and pile-clearance assertions; repair only the browser fixture’s
public Negation event proof; commit/push the focused repair; then require the
exact repair SHA’s Actions result before resuming feature work.
