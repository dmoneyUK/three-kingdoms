# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `USER-DIRECTED UX REFINEMENT`

## Latest implementation / validation

- Task 1 implementation is in the local worktree: the graph renderer and oversized combat panels are removed; one static presenter now owns validated public CardFaces and short public messages. `CurrentAction`, typed proofs, private choice modals, timers, settlement retirement and SWITCH authorization remain in their existing paths.
- Local automated tests were not run at the user's direction. `git diff --check` is clean. Implementation commit, exact-SHA CI and deployment are pending.
- Latest successful code baseline is `507b82682506a9f2f5b67da0adf1f2ba49d66296`, Actions run [`38399482708`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/38399482708); it does not validate this implementation.
- No authenticated live gameplay screenshots are available in this session; device and multiplayer visual acceptance remain with the user after deployment.

## Design checkpoint

Reviewed the complete `docs/UX2-refine.md` at `83ad06cb33c5e959f2d76b5072b0848c17698805` (blob `b3e3d3642534ae97e8aa0c356c48d669f493ac9a`). It retires all visible relationship graphs and supersedes the previous B1 graph task. Task 1 is a static, proof-backed public-card display; centre-reveal/seat-card animation remains a separate later task.

## Current task — `UX2-NO-GRAPH-REMOVAL-01`

Finish delivery of `UX2-NO-GRAPH-REMOVAL-01`: commit and push only its files, verify the exact SHA's CI and deployment, then stop for user visual acceptance. Do not start `UX2-CENTRE-REVEAL-SEAT-CARDS-02` until explicitly authorized.
