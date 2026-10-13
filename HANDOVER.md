# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `USER-DIRECTED UX REFINEMENT`

## Latest result / CI

- SWITCH implementation is at `10c8d49f2e3b060dcae7bbb62813bbdc7e2de4cd`. Exact-SHA run [`38378984142`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/38378984142) passed Lint and fast tests, API tests, Browser startup and room smoke, Worker deploy, and production smoke.
- Focused browser evidence: test-player SWITCH flow 1/1 passed; real Duel long-chain plus Attack/Dodge path-balance 2/2 passed. Four genuine response frames retained one Duel root at 390×844, with additional 440×956, 480×900, and 1440×900 geometry; viewer proofs matched and hidden-hand identity checks reported no leaks. Evidence: `test-results/ux2-6.39-duel-switch-evidence-20261013/`.
- Only generated test-player opponents show `SWITCH`; switching to the legal actor exposes that player's own hand and server-projected `CurrentAction` controls. `HOST` manually returns to the host perspective. Gameplay legality is unchanged.

## Design checkpoint

Reviewed remote `docs/UX2-refine.md` blob `6b9ad6ab83e8e64c185b3fdeed4ca03f40310ccb`, including §4B.12 and §6.39. No design-document edit was made.

## Current task — `UX2-6.34-B1-DUEL-LONG-CHAIN-01` follow-up; awaiting user visual acceptance

Review deployed SHA `10c8d49` on the real test-game path: confirm the §6.39 Duel branch graph and manually switch into a generated player's turn to operate only its legal cards. Keep the root stable, public proof fail-closed, hands viewer-scoped, and legal actions `CurrentAction`-driven. Stop here for user visual acceptance; do not start Negation B2 or Stage C/AOE.
