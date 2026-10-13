# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `USER-DIRECTED UX REFINEMENT`

## Latest result

- Graph removal and manual authorized test-player switching are deployed. The ordinary Attack/Dodge centre-to-seat journey, four-second reveal, and proportional 48×72 thumbnail are deployed in `9d00b03c54833a4337b35be521c290a61ce21fc1`; push run [`38470554615`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/38470554615) passed browser smoke, Lint/fast, API and deploy, including production root/health checks. No local automated tests were run. The user reported earlier screenshots still showed the old result; the corrected deployed build has not yet been manually accepted.

## Design checkpoint

Reviewed `docs/UX2-refine.md` at `83ad06cb33c5e959f2d76b5072b0848c17698805` (blob `b3e3d3642534ae97e8aa0c356c48d669f493ac9a`). It replaces relationship graphs with one centre reveal and actor-seat thumbnails. The design document is unchanged.

## Current boundary

`UX2-CENTRE-REVEAL-SEAT-CARDS-02 — Duel slice`, continuing on the user's direct “可以继续” after the Attack/Dodge review stop: reveal the proven Duel root and each committed Duel Attack at centre, then park the same physical card at its proven actor's Seat/Dock; retain the Duel root through its Negation opportunity and exchange transition; keep only each duelist's latest Attack visible with a compact earlier-count. Preserve `CurrentAction`, public proof, manual test switching and privacy. Do not animate Negation responses or enter Group/AOE. After deploy, stop for the user's manual visual review.
