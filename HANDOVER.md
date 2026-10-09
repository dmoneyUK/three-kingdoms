# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result / CI

`UX2.6-PHASE-D-ATTACK-GRAPH-ROUTING-CONSISTENCY-01` found no ordinary Attack
production-routing regression. With public root proof and measured anchors, the
physical-seat graph owns the Stage composition; Inspect and unavailable-anchor
states intentionally fail back. Real Attack browser coverage passed 26/26,
including 4/6/8-player layouts, Attack→Dodge, direct-hit settlement, and
390×844 / 480×900 / 1440×900. The focused post-assertion matrix passed 14/14.
Measured ordinary Attack paths are straight; source tether 4.8px, target arrow
6.5px, marker 20px, target halo 4.5px. Graph handoff is bounded to 250ms.

Remote parent HEAD `bf5313d486c47b3e6fb04dbbbe797010913b4778`, Actions run
`37865225311`, completed **FAILED**: fast test had a stale partial
`PresentationClientView` fixture; Browser shard 2 did not observe the explicit
lost-pointer-capture event before another native pointer input. API and Browser
shard 1 succeeded. The fixture now starts from the canonical client view, and
the browser regression flushes the pending capture transition with a real
pointer move. Local proof: fast 254/254, Stargazing 3/3, Attack 14/14,
`git diff --check`. These repairs and this task are prepared together; outgoing
CI has not run. Reviewer acceptance is not claimed.

## Design checkpoint

Latest remote `docs/UX2-refine.md` blob `7feb8af937b6407f3f33c3959325db8d3f188cf4`
is unchanged. At the task boundary, §6.1–6.9, §6.18–6.26 were reviewed.

## Current task

`UX2.6-PHASE-D-ATTACK-GRAPH-CONNECTOR-EMPHASIS-01` — after the outgoing
repair-and-task SHA is green, refine only the ready ordinary Attack graph's
source/target line, arrowhead, and active-target emphasis in response to the
Reviewer’s readability report. Keep ordinary Attack paths straight, target
relation stronger than source, physical Seats/Dock fixed, and Stage fallback
semantics untouched. Prove computed geometry/style and screenshots at
390×844, 480×900, and wide; no horizontal overflow or Seat/Dock movement.
