# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `USER-DIRECTED UX REFINEMENT`

## Latest result

- `064b30801cd11b5dad523c82599a95e123e39175` highlights the current player's existing Seat/Local Dock in place. Local emphasis follows the active Local Dock decision state; remote response emphasis follows validated Presentation decision ownership. The shared Negation window does not identify pending intent owners on other seats. Run [`38476099724`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/38476099724) passed API tests, Lint/fast, Browser smoke and deploy. Production `/` and `/api/health` returned HTTP 200 (`{"ok":true,"worker":"available"}`). No local automated tests were run; awaiting the user's manual visual check.
- The earlier Duel reveal slice remains on `25a2f6512113e2189f3f79939b0f8776bd6159ed`; its independent visual acceptance is still unreported.

## Design checkpoint

Reviewed `docs/UX2-refine.md` at `33bbeeaef1f7e419c55e8c61062540cf02b735f1` (blob `9786393fb4ffc2e0b2144c00a5672b53a0f6c01e`), including §§2.3, 4.2–4.3 and 9. The approved shared Negation window is not a task queue; no design document was changed for the current-action highlight.

## Current boundary

`UX2-CURRENT-ACTION-PLAYER-HIGHLIGHT-01` is deployed and awaits the user's manual visual check. Stop here; do not start shared Negation implementation or further Duel presentation work without a new user instruction.
