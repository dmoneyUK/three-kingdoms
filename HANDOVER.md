# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result / CI

Phase A now renders the proven ordinary Attack as a `.game-shell` overlay with
one source tether and one target arrow. Root event identity is carried through
the public projection; ambiguous, missing, duplicate, or zero-size anchors keep
the existing Stage visible. Real Attack → response → Dock Skip browser proof
passed at 390×844, 480×900, and 1440×900 with fixed Seat/Dock geometry and no
overflow. Engine API tests 33/33, Presentation client/snapshot tests 65/65,
production build, targeted ESLint, browser tests 3/3, and `git diff --check`
passed. Pre-commit Actions run `37734608981` on exact parent SHA
`a8432b27a221544009761e50fbcee6a459631deb` succeeded; validate this task's push
at the next commit gate. Reviewer acceptance is not claimed.

## Design checkpoint

Reviewed remote `docs/UX2-refine.md`, blob
`516fc7d673b0dfcc7e1e01ba8572cd97cdcf6784`, through §6.26. Section 6 is active;
no newer design revision was found.

## Current / next task

`UX2.6-PHASE-A-DENSE-ANCHOR-GEOMETRY-01` — extend the real server-backed
ordinary Attack overlay proof to 6–8 player tables. Measure card/connector
containment, Seat/Dock geometry stability, system/center/Seat overlap, overflow,
and normal Dock control hit behavior at representative mobile and wide sizes.
Keep physical player layout unchanged; fail closed when the overlay cannot fit.
