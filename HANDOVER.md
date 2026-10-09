# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result / CI

`UX2-6.27-8P-390-ATTACK-DODGE-GEOMETRY-01` now fits the server-backed 8-player
390×844 Attack/Dodge graph at the §6.27.1 minimum sizes: Attack 96×144 at
(99,356), Dodge 88×132 at (203,326), with a stable root, direct path
interception, 8px obstacle clearance, and 12px table inset. The dense 6/8-player
390/480 browser matrix passed 4/4; the focused 8p/390 screenshot rerun passed.
Focused ESLint, `git diff --check`, and `npm run build` passed. Remote docs-only
HEAD `7907b5f6937c57f55edd06670bf90441bcc76ecd` has no associated Actions run or
status checks (empty status treated as success per reviewer policy); its
predecessor `81a92dc004bb0b40c629e169d12aa1168cedbae2` passed all five jobs in
run `37934495952`. New task push validation is pending. Reviewer acceptance is
not claimed.

## Design checkpoint

Latest remote `docs/UX2-refine.md` blob:
`d1164425c938e9d68611f43d2dbafa621e17dbc5`. §§6.27.1–6.27.4 and new §6.28
were reviewed; §6.28 Task A is the next P0 task. §4D / §5 prerequisites remain
closed.

## Current task

`UX2-6.28-4P-ATTACK-GRAPH-RELIABILITY-01` — reproduce and fix the §6.28.1
four-player production Attack scene that loses its source/target connectors
during an unsubmitted Dodge choice. Use real server-created games and browser
controls at 390×844 and 480×900, including ordinary and converted Attacks,
selection/unselection, both attacker and defender views, repeated authoritative
polls, and at least ten independently seeded response windows. Record privacy-
safe proof, phase, layout, SVG visibility, and event identity for missing-link
frames. Preserve server authority, fixed Seats/Dock, card sizes, controls, and
fail-closed behavior; keep the separate §6.28.2 three-second hold out of this
task.
