# WTK UX2 — Current Handoff

Branch: `ux-v2`  
Mode: `USER-AUTHORIZED AUTONOMOUS UI / LAYOUT`

## Current task

`UX2-8.1-DUEL-SEAT-HISTORY-01` — Implement the §8.1 Duel history using the validated root and response proofs. Preserve every committed physical card and global ordinal, partition by actual actor, and place top-row histories vertically, side-seat histories inward horizontally, and local history horizontally above the Dock. Keep scroll contained, centre reveal stable, and all gameplay/privacy behavior unchanged.

Design reviewed: `docs/UX2-refine.md`, blob `74e3d2bce83cd7ccfa212c82cd5166ce7f6c31e7`.

Source audit: the server-backed projection validates the root and every response event/identity/ordinal. The renderer caused the loss by reducing events to the latest card per actor and deleting prior cards from the same actor.

Current status: implementation in progress. After push, report exact-SHA Actions/deploy evidence and await the user's manual visual acceptance before selecting another task. Do not claim reviewer acceptance or start §8.2.
