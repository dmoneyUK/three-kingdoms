# WTK UX2 — Current Handoff

Branch: `ux-v2`  
Design: `docs/UX2-refine.md`, blob `b36ce07d38f63f97a01407ae6f9270633a0add0f`

## Current task

`UX2-8.2-HIDE-CENTRAL-PILES-01` — remove the persistent battlefield DECK/DISCARD visuals while retaining game data and any nonvisual measured anchors needed by card flights. Preserve actual discard motion, Judgement, private Draw, Bumper Harvest, Stargazing and legal selection zones. Acceptance: no permanent piles or dead hitboxes at 390, ~440, 480 and desktop layouts; no gameplay/privacy changes. Follow CI for validation; do not run local automated suites.

§8.1 Duel history implementation is deployed on `15f0c0a53fb22bdb1a24bd79b3d995da68feb4f1`; Actions `38527792209` and production deploy/smoke passed. It is marked complete for aggregate user/Reviewer review; no authenticated multiplayer screenshots were captured by the agent. Docs-only status commit `b6c66c0a168e5c5467ec1ff597a6a00715037776` triggered no Actions because Markdown paths are ignored.
