# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `USER-DIRECTED UX REFINEMENT`

## Latest result

- `UX2-NO-GRAPH-REMOVAL-01` and the manual test-view correction are deployed. The graph renderer and oversized combat panels are removed; the static presenter has now been extended for proof-backed ordinary Attack/Dodge centre-to-seat reveals. Manual SWITCH remains available for authorized generated test players; no gameplay legality or private-hand rules changed.
- `UX2-CENTRE-REVEAL-SEAT-CARDS-02` first slice is implemented in `app/public-card-display.tsx`, `app/page.tsx`, and `app/globals.css`: fresh public Attack and Dodge cards reveal at 60×90 CSS px in the battlefield, move to 48×72 at the actual actor's Seat/Dock, and retain the Attack while a proven Dodge is revealed. A verified Attack response window can show the compact public notice and accent the Local Dock only when `CurrentAction` authorizes that viewer to Dodge. Public damage/Dodge result notices remain proof-backed. Duel, Negation, AOE, and relationship graphs are out of scope.
- Code SHA `8f7a1a339fe669ebf499df4587c0a693adfd0268` passed Actions run [`38454082445`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/38454082445): API tests, lint/fast tests, browser startup smoke, D1 migrations, Worker deploy, and production smoke all succeeded. The user requested no local automated tests; none were run.
- Deployment is complete. Real multiplayer/iPhone visual validation and reviewer acceptance have not yet occurred; wait for the user's manual review before further UX work.

## Design checkpoint

Reviewed `docs/UX2-refine.md` at `83ad06cb33c5e959f2d76b5072b0848c17698805` (blob `b3e3d3642534ae97e8aa0c356c48d669f493ac9a`). It replaces the former relationship-graph UX. The design document has not been modified.

## Current boundary

`UX2-CENTRE-REVEAL-SEAT-CARDS-02` — first ordinary Attack/Dodge slice is deployed and awaiting the user's manual/visual acceptance. Resume only for issues found in that review or a new direct instruction. Preserve manual test-player switching, server-owned legality, and private-hand boundaries; do not continue into Duel, Negation, AOE, or relationship graphs before acceptance.
