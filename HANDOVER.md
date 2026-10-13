# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `USER-DIRECTED UX REFINEMENT`

## Latest result

- `UX2-NO-GRAPH-REMOVAL-01` and the manual test-view correction are deployed. The graph renderer and oversized combat panels are removed; manual SWITCH remains available for authorized generated test players. Gameplay legality and private-hand rules are unchanged.
- The user reported that Attack still appeared only as a brief seat thumbnail and its rank/suit shield remained too large. The intervening correction commits had not deployed because of React lint failures, so the submitted screenshot was still on the older release. Commit `9d00b03c54833a4337b35be521c290a61ce21fc1` now decouples journey freshness from the legacy event queue, uses the design's 60×90 CSS px centre card for the requested four-second reveal, and scales the full rank/suit badge with the 48×72 thumbnail. Push run [`38470554615`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/38470554615) passed Lint/fast, API, browser smoke, and deploy; the deployment job also confirmed production `/` and `/api/health` checks. No local automated tests were run. The user has not yet visually accepted the deployed result.

## Design checkpoint

Reviewed `docs/UX2-refine.md` at `83ad06cb33c5e959f2d76b5072b0848c17698805` (blob `b3e3d3642534ae97e8aa0c356c48d669f493ac9a`). It replaces the former relationship-graph UX. The design document has not been modified.

## Current boundary

`UX2-CENTRE-REVEAL-SEAT-CARDS-02` — corrective ordinary Attack/Dodge slice only. Deployed at `9d00b03`; run `38470554615` and production health checks passed. Await the user's manual check that a new Attack/Dodge stays centred for four seconds, then parks at the actual author's Seat/Dock with rank/suit proportionally scaled. Preserve proof validation, `CurrentAction`, privacy, and one-card ownership. Do not continue into Duel, Negation, AOE, or relationship graphs before user visual acceptance.
