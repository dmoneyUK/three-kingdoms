# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `USER-DIRECTED UX REPAIR`

## Latest result / CI

Attack-root projection diagnostics are deployed (`9f188540ac6f14ece031939468fd33c647d39c40`). Exact public Dodge-to-Attack correlation is implemented (`4a34c8478b4a9bbe1e621da776063f6b5ba5415e`); the CI lint repair is current HEAD `9c2bfccb7c61a5c53a20be5461a8eff6713f6403`. Actions run `38055057432` succeeded for this exact HEAD, including lint/fast, API, browser startup/room smoke, and deploy/production smoke. Focused presentation tests: 44/44 passed. No timer or graph-geometry change; public-card display remains 20 seconds.

## Design checkpoint

Latest remote `docs/UX2-refine.md` blob `6ad42a6f4522be67bd492a20aa1564e420aeffe2` reviewed; no intervening design change. Direct user timing remains 60-second response / 20-second public-card display.

## Current task

`WAITING FOR REVIEWER — REAL-GAME ATTACK/DODGE VALIDATION`: On the deployed `9c2bfcc` build, play four Attack → Dodge exchanges in one game with trace enabled. Return the exported trace JSON and phone screenshots showing each public response and whether its exact Dodge card, relationship graph, and 20-second display appear. Report any missing root, response card, connector, or timer. Do not change timers or graph layout until this evidence is reviewed; CI/deployment is not visual acceptance.
