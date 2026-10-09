# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result / CI

`UX2.6-PHASE-D-ATTACK-WHOLE-SEAT-DOCK-HIGHLIGHT-01` is implemented locally.
Attack now highlights the authoritative target's entire physical Seat/Dock
with a 3.5px red ring and 18px glow; proof-backed Dodge block reduces it to a
2px neutral ring/8px glow at 40% opacity. Six real server-backed browser cases
passed across 390×844, 480×900, and 1440×900, covering opponent Seat, local
Dock, normal control hit-testing, and active-to-blocked state. Build, targeted
ESLint, and `git diff --check` passed; fresh screenshots were visually
reviewed. Pre-commit Actions run `37876511767` for exact parent SHA
`b28a80041cb8b773462c3470078ed05ba988085f` completed successfully, including
Lint/fast, API, both Browser shards, and deploy. The current changeset is not
covered by that parent-SHA run; its outgoing Actions result is pending.
Reviewer acceptance is not claimed.

## Design checkpoint

Latest remote `docs/UX2-refine.md` blob:
`4c56947d9965cde28a7c888e19f5d5fa0612112e`; compared with the previous
checkpoint and unchanged. Reviewed §6.27.1–6.27.2 for the completed
whole-target emphasis and next Dodge-interception work.

## Next task

`UX2.6-PHASE-D-ATTACK-DODGE-CARD-INTERCEPTION-01` — make the real, proven
Dodge card physically intercept the red Attack path, preferably with its
centre 35–70% along the open root-card-to-target segment (45–55% in open
390px 4-player scenes). Keep it outside every interactive Seat/Dock and system
control; terminate/break the active Attack path at the Dodge, preserve the
actual Dodge actor's green no-arrow tether, and avoid a misleading triangle.
Keep the Attack root stable and fail closed when a collision-free placement
cannot be proven. Measure real server-backed geometry and review screenshots
at 390×844, 480×900, and wide; cover supported dense layouts or prove their
safe fallback.
