# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result / CI

Phase A's real Attack graph now has dense-table proof: 7/7 browser scenarios
passed (4 players at 390×844, 480×900, wide; 6 players at 390×844; 8 players at
390×844, 480×900, wide). The card remains at least 112×78 px, stays inside the
table and clear of Seats/center/system/messages/exit; sampled connectors stay
inside `.game-shell` and avoid unrelated Seats. Seat/Dock bounds shift by at
most 0.5 px, document width does not overflow, and the target's real Dock Skip
works. The test seeder now accepts canonical 4–8 player role sets. Production
build, targeted ESLint, and `git diff --check` passed. Exact parent SHA
`afb0b668fbf65fcf0a3fa2daeb0e96f68ed9ab89`, Actions run `37737075160`:
SUCCESS. Check this task's pushed SHA at the next commit gate. Reviewer
acceptance is not claimed.

## Design checkpoint

Reviewed remote `docs/UX2-refine.md`, blob
`516fc7d673b0dfcc7e1e01ba8572cd97cdcf6784`, through §6.26. Section 6 is active;
no newer design revision was found.

## Current / next task

`UX2.6-PHASE-A-SELF-TARGET-PEACH-PUBLIC-PROOF-01` — add a server-owned public
source/target identity proof for an ordinary wounded-player Play Phase Peach,
then render its root card with a source tether and restrained same-player
emphasis, never a loop arrow or duplicate player. Validate the real gameplay
path, stable Seat/Dock geometry, settlement lifecycle, and fail-closed behavior;
do not infer identity from timeline names or DOM position.
