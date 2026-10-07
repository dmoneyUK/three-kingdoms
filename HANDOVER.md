# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result / CI

§4A Private Draw now has real server-backed browser proof for the normal
two-card draw and an eight-card Equilibrium draw. Large private rows scroll
without page overflow; viewer privacy and timer/menu/Guidance geometry are
covered at 390×844, 480×900, and 1440×900. Build and the focused 14-test
Private Draw/Bumper Harvest browser group passed; targeted ESLint and
`git diff --check` passed. §4A remains open: Harvest choosing has no
server-owned deadline, and the approved duration/expiry behavior is unresolved.

Before this commit, remote HEAD `a9f812835339da7e0df7e4865097932899be3fe6`
had push run `37697746722` completed successfully on that exact SHA. This
commit's Actions state has not yet been checked; check the current remote SHA
before the next commit. Reviewer acceptance is not claimed.

## Design checkpoint

Reviewed the complete current remote `docs/UX2-refine.md`, blob
`58100b7b1f14d2ff0b1b98e6f79ee1701daa74b4`.

## Current task

`UX2.REFINE-REAL-SERVER-TO-BROWSER-PROOF-P1-01` — audit and restore local
real-room creation through the product route, then prove a server-generated
room reaches the production browser page without handcrafted CurrentAction or
PresentationSnapshot state. Build success alone is insufficient. §4A's
Harvest chooser deadline question remains open; resume its active-choice timer
only after the Reviewer resolves that authority. Section 6 remains gated by
§4A, §4.10, §4C.29, P1–P5, and all other §4D prerequisites.
