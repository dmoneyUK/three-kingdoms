# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result / CI

`UX2.6-PHASE-D-ATTACK-CARD-FACE-SCALE-01` is implemented: real Attack and
Dodge `CardFace` artwork now uses responsive 2:3 sizing, preserves the root
position as Dodge appears, and fails closed when dense geometry cannot fit.
Build, focused ESLint, `git diff --check`, Wrangler supervisor tests (3/3),
and the real-gameplay browser matrix (7/7 at 390×844, 480×900, wide, and dense
6/8-player layouts) passed. Latest Actions run `37869008461` failed on exact
HEAD `ecda777e7983198d181c81a04552e3890c185a91`: Browser shard 1's ready
Wrangler ProxyWorker exited on its known client-abort disconnect; 71 later
tests cascaded from port 3137 being refused. The bounded CI worker-restart
repair is included with this task; outgoing SHA and CI are pending. Reviewer
acceptance is not claimed.

## Design checkpoint

Latest remote `docs/UX2-refine.md` blob:
`4c56947d9965cde28a7c888e19f5d5fa0612112e`; reviewed §6.27–6.27.4. The
Attack root and target paths are straight; the successful-Dodge source tether
currently uses a curved route. Connector colors remain cream/yellow and the
whole-target highlight remains a separate open visual gap.

## Current task

`UX2.6-PHASE-D-ATTACK-CONNECTOR-VISIBILITY-01` — refine only the ordinary
Attack/Dodge connector treatment: keep source authorship distinct (green,
no arrowhead, 3.5–4.5px visible stroke), make Attack direction unmistakable
(red, 6–8px, 26–32px arrowhead), and remove unnecessary curvature where a
direct collision-free path communicates the proven relation more clearly.
Preserve server-proven endpoints and fail-closed behavior. Measure path shape,
stroke, marker, containment, and inspect real Attack/Dodge screenshots at
390×844, 480×900, wide, and supported dense layouts. Do not change the
whole-Seat/Dock highlight in this task.
