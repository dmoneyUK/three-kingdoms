# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `USER-DIRECTED UX REFINEMENT`

## Latest result

- `UX2-NO-GRAPH-REMOVAL-01` and the manual test-view correction are deployed. The graph renderer and oversized combat panels are removed; manual SWITCH remains available for authorized generated test players. Gameplay legality and private-hand rules are unchanged.
- The user rejected the deployed ordinary Attack/Dodge presentation after iPhone review: the centre card still disappears too soon and the parked rank/suit remains too large. The last deployed implementation is SHA `3c4af2ded58dae0c12e2e845afd25d41c78a0d02`; its Actions run [`38464537472`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/38464537472) and deployment succeeded, but that does not validate the reported visual behavior.
- Run [`38468877536`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/38468877536) for `6a627b0` failed `npm run lint` on synchronous state updates from effects; API and browser smoke passed, deploy was skipped. Run [`38469461201`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/38469461201) for `314c4a2` failed `npm run lint` because render code read the freshness ref (`react-hooks/refs`); API and browser smoke passed, deploy was skipped. The latest phone screenshot therefore still reflects the last deployed UI. The current correction uses guarded room-key state adjustment during render, asynchronously records seen events, restores the design's 60×90 CSS px centre card, and scales the full rank/suit badge with the 48×72 thumbnail. No local automated tests were run; deployment and user visual review remain pending.

## Design checkpoint

Reviewed `docs/UX2-refine.md` at `83ad06cb33c5e959f2d76b5072b0848c17698805` (blob `b3e3d3642534ae97e8aa0c356c48d669f493ac9a`). It replaces the former relationship-graph UX. The design document has not been modified.

## Current boundary

`UX2-CENTRE-REVEAL-SEAT-CARDS-02` — corrective ordinary Attack/Dodge slice only. Acceptance: show each newly committed public card at 60×90 CSS px in the centre for the user-requested four seconds, then move that same card to its actual author's 48×72 CSS px Seat/Dock thumbnail with the complete rank/suit badge scaled proportionally; preserve proof validation, `CurrentAction`, privacy, and one-card ownership. Current correction decouples the journey lifecycle from the legacy event queue and scales the full CardFace badge; CI, deployment, and user visual review are pending. Next: commit/push only this UI correction and handoff, require fresh successful CI and actual deployment, then ask the user to retest. Do not continue into Duel, Negation, AOE, or relationship graphs before acceptance.
