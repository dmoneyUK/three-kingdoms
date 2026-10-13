# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `USER-DIRECTED UX REFINEMENT`

## Latest result

- `UX2-NO-GRAPH-REMOVAL-01` and the manual test-view correction are deployed. The graph renderer and oversized combat panels are removed; manual SWITCH remains available for authorized generated test players. Gameplay legality and private-hand rules are unchanged.
- The user rejected the deployed ordinary Attack/Dodge presentation after iPhone review: the centre card still disappears too soon and the parked rank/suit remains too large. The last deployed implementation is SHA `3c4af2ded58dae0c12e2e845afd25d41c78a0d02`; its Actions run [`38464537472`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/38464537472) and deployment succeeded, but that does not validate the reported visual behavior.
- Corrective implementation is in progress: decouple journey freshness from the legacy two-second event queue, start response reveals from authenticated public proof, use a 92×138 CSS px centre card and proportionally smaller 48×72 thumbnail marks. No local automated tests are being run, per the user's instruction; commit CI/deployment and manual review remain pending.

## Design checkpoint

Reviewed `docs/UX2-refine.md` at `83ad06cb33c5e959f2d76b5072b0848c17698805` (blob `b3e3d3642534ae97e8aa0c356c48d669f493ac9a`). It replaces the former relationship-graph UX. The design document has not been modified.

## Current boundary

`UX2-CENTRE-REVEAL-SEAT-CARDS-02` — corrective ordinary Attack/Dodge slice only. Acceptance: show each newly committed public card at 92×138 CSS px in the centre for four seconds, then move the same card to its actual author's 48×72 CSS px Seat/Dock thumbnail with rank/suit scaled to the card; preserve proof validation, `CurrentAction`, privacy, and one-card ownership. User will perform visual review after successful CI/deployment. Do not continue into Duel, Negation, AOE, or relationship graphs before acceptance.
