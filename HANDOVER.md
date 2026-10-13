# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `USER-DIRECTED UX REFINEMENT`

## Latest result

- `UX2-NO-GRAPH-REMOVAL-01` and the manual test-view correction are deployed. The graph renderer and oversized combat panels are removed; manual SWITCH remains available for authorized generated test players. Gameplay legality and private-hand rules are unchanged.
- `UX2-CENTRE-REVEAL-SEAT-CARDS-02` ordinary Attack/Dodge slice is deployed: fresh public cards reveal at battlefield centre at 60×90 CSS px for 4 seconds, then move to 48×72 at their actual author's Seat/Dock. The Attack remains while a proven Dodge is revealed. The thumbnail's rank and suit mark scale to 80% with the card. A verified Attack response window can show the compact public notice and accent the Local Dock only when `CurrentAction` authorizes that viewer to Dodge; public settlement notices remain proof-backed. Duel, Negation, AOE, and relationship graphs are out of scope.
- Code SHA `3c4af2ded58dae0c12e2e845afd25d41c78a0d02` passed Actions run [`38464537472`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/38464537472): API tests, lint/fast tests, browser startup smoke, D1 migrations, Worker deploy, and production smoke all succeeded. The user requested no local automated tests; none were run.
- Deployment is complete. Real multiplayer/iPhone visual validation and reviewer acceptance have not yet occurred; wait for the user's manual review before further UX work.

## Design checkpoint

Reviewed `docs/UX2-refine.md` at `83ad06cb33c5e959f2d76b5072b0848c17698805` (blob `b3e3d3642534ae97e8aa0c356c48d669f493ac9a`). It replaces the former relationship-graph UX. The design document has not been modified.

## Current boundary

`UX2-CENTRE-REVEAL-SEAT-CARDS-02` — ordinary Attack/Dodge first slice, including the four-second centre hold and proportional thumbnail corner marks, is deployed and awaiting the user's manual/visual acceptance. Resume only for issues found in that review or a new direct instruction. Preserve manual test-player switching, server-owned legality, and private-hand boundaries; do not continue into Duel, Negation, AOE, or relationship graphs before acceptance.
