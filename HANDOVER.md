# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result / CI

`UX2.6-PHASE-D-ATTACK-CONNECTOR-VISIBILITY-01` is implemented locally:
ordinary Attack source/target ribbons are straight, green/red, 4px/7px, with
a 30×22px arrowhead; the successful-Dodge source tether is straight green at
3.5px. Build, targeted ESLint, `git diff --check`, and the focused
server-backed browser matrix passed (12/12), including 10 independently
seeded Attack windows. CI run `37874397541` for remote HEAD
`862158257b5ca913a40517663c7cd826998bd0cd` failed Browser shard 1: an obsolete
112px card assertion, dense cases that wrongly required a graph instead of
the approved geometry-safe fallback, unsupported dense scenes in the
continuous-graph matrix, and one Dodge helper waiting on a response interrupted
by the logged Wrangler disconnect. The assertion/request-observation repairs
are included with this changeset; outgoing SHA and CI are pending. Reviewer
acceptance is not claimed.

## Design checkpoint

Latest remote `docs/UX2-refine.md` blob:
`4c56947d9965cde28a7c888e19f5d5fa0612112e`; reviewed §6.27–6.27.4. This
task changes only connector visibility; the whole-target highlight remains
portrait-only, and Dodge interception placement still needs a separate visual
review.

## Current task

`UX2.6-PHASE-D-ATTACK-WHOLE-SEAT-DOCK-HIGHLIGHT-01` — use the proven Attack
target identity and rendered physical `[data-player-anchor]` geometry to
highlight the complete opponent Seat or local Dock, not only its Hero portrait.
Meet §6.27.1's 3–4px full-perimeter ring and restrained 14–24px halo without
changing Seat/Dock bounds, shifting panels, or obstructing clickable controls.
When authoritative root-effect state proves the Attack was blocked by Dodge,
reduce/neutralize this incoming-target emphasis; do not infer the outcome from
animation or HP. Verify real server-backed local/opponent targets, successful
Dodge, geometry stability, containment, and control hit-testing at 390×844,
480×900, and wide layouts. Preserve fail-closed behavior and existing
server-authored endpoints.
