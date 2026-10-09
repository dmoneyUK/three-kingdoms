# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result / CI

`UX2.6-PHASE-D-ATTACK-DODGE-CARD-INTERCEPTION-01` is implemented locally.
The real server-proven Dodge card now intercepts the red Attack path; its
source tether remains green and arrowless, with no Dodge-to-target arrow or
triangle. The root stays fixed; placements use measured collision checks and
fail closed when they cannot fit. Browser geometry passed 7/7 across
390×844, 480×900, 1440×900, and dense 6/8-player cases (unsupported dense
placements safely fall back). The 10-window Attack stability browser test also
passed 1/1 on this working tree, including two viewers, 13.0-second RAF
sampling, repeated server polls, and the three 4-player viewports. Build,
targeted ESLint, and `git diff --check` passed; screenshots were reviewed.
Pre-commit Actions run `37877388977` for exact parent SHA
`60357aa48da4f9927a6c562f25b040296e609e3e` completed successfully, including
API, both Browser shards, Lint/fast tests, and deploy. This task's push CI is
pending. Reviewer acceptance is not claimed.

## Design checkpoint

Latest remote `docs/UX2-refine.md` blob:
`4c56947d9965cde28a7c888e19f5d5fa0612112e`; unchanged from the prior
checkpoint. Reviewed §6.27.1–§6.27.4 at this boundary.

## Next task

`UX2.6-PHASE-D-ATTACK-MOBILE-GEOMETRY-REMEASURE-01` — use a real
server-backed ordinary Attack at 390×844 and 480×900 to measure graph behavior
through mobile scroll and viewport/visual-viewport size changes. Keep the same
proven root identity, source tether and target arrow when geometry remains
valid; prove accurate remeasurement and recovery, or fail closed with a
classified reason when anchors are genuinely invalid. Add a focused production
fix only if the real path demonstrates a defect; do not infer or retain stale
geometry. Assert no stale graph, duplicate Stage, or horizontal overflow.
