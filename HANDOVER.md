# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result

`UX2.REFINE-REAL-SERVER-TO-BROWSER-PROOF-P1-01` removes the duplicate
`CausalCreation` declaration that blocked `vinext dev`. Local product-route
`POST /api/rooms` now returned HTTP 201. The production Worker browser test
created a room through Host Game, added server-backed test players, started the
match, completed hero selection, and reached `.game-shell` with server-generated
CurrentAction/action revision: 1/1 passed. `npm run build`, targeted ESLint,
and `git diff --check` passed. No fixture CurrentAction/PresentationSnapshot
was substituted. Reviewer acceptance is not claimed.

Pre-commit CI: run `37669875927` on exact parent SHA
`2a4ed5f94c6694d8e0095f28f8e7c3d19a9103a4` completed SUCCESS across all five
jobs. The P1 task commit's CI state is not yet observed.

## Design checkpoint

Re-fetched and reviewed remote `docs/UX2-refine.md`, blob
`9b53efac347e1186eb7195346e3ea2c51f8d17b6`; no newer design changes. Re-read
§§4C.1–4C.28 and §4D P1–P5. Section 6 remains gated on §4.10, §4A, and all
§4D tasks.

## Current task

`UX2.REFINE-UNIFIED-TARGET-CARD-MODAL-REAL-GAME-P2-01` — finish §4C's
production routing for Steal, Dismantle, Retaliation, Frost Sword, and Kirin
Bow.

Acceptance: remove presentation-only routing dependencies that send valid
CurrentAction decisions to unrelated pickers; keep grouped `hand` fallback
inside the shared modal; preserve opaque Hand privacy and public Equipment /
Judgment choices; prove all five real server-generated flows, including a
mixed-zone case, reach the unified modal without normal supported flows reaching
the legacy picker. Keep fixture tests as supplementary evidence only.
