# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `USER-DIRECTED UX REFINEMENT`

## Latest result / CI

- Remote `ux-v2` base is `9296fbbbedb7789996c655500b6832b037eca6e0`; exact-SHA run [`38376451849`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/38376451849) passed Lint and fast tests, API tests, Browser startup and room smoke, deploy, and production smoke.
- Current worktree focused browser evidence: test-player SWITCH flow 1/1 passed; real Duel long-chain plus Attack/Dodge path-balance 2/2 passed. The real four-response Duel graph was ready at 390×844, 440×956, 480×900, and 1440×900; all four viewer proofs matched and hidden-hand identity checks reported no leaks. Evidence: `test-results/ux2-6.39-duel-switch-evidence-20261013/`.
- In the SWITCH path, only remote generated test players receive a `SWITCH` control; selecting the legal actor exposes that player's own hand and `CurrentAction` controls. The host perspective has a manual `HOST` return control. Normal server legality remains unchanged.

## Design checkpoint

Reviewed remote `docs/UX2-refine.md` blob `6b9ad6ab83e8e64c185b3fdeed4ca03f40310ccb`, including §4B.12 and §6.39. No design-document edit was made.

## Current task — `UX2-6.34-B1-DUEL-LONG-CHAIN-01` follow-up; awaiting visual review

Keep the approved §6.39 server-backed Duel graph and its measured screenshots available for user review. Rename opponent `VIEW` controls to `SWITCH`, show them only for generated test-player opponents, and provide a manual return to the host perspective. Perspective selection stays manual; private hands stay viewer-scoped; legal actions remain exclusively `CurrentAction`-driven. Preserve the stable Duel root, fail-closed public proof, and accepted Attack/Dodge path behavior. Record the feature SHA and exact Actions/deploy result after push, then stop for user visual acceptance. Do not start Negation B2 or Stage C/AOE.
