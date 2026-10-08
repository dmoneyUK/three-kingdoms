# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result / CI

§4A now projects a fresh server-owned 60-second deadline for each active
Bumper Harvest chooser; expiry only changes the displayed countdown and never
selects, skips, or settles. Engine-backed API proof, compact timer geometry at
390×844 / 480×900 / wide, production build, targeted lint, and diff check
passed. The previous exact remote HEAD `6489817cba5d628678203e0a568158a357bc4ba3`
Actions run `37701079914` failed in browser shard 2 on the P5 seat/safe-zone
geometry regression. This change corrects the board/safe-zone movement and
includes the failed geometry scenarios in a 29/29 focused browser pass. The
new commit's exact-SHA Actions state is not yet observed. Reviewer acceptance
is not claimed.

## Design checkpoint

Reviewed current `docs/UX2-refine.md`, blob
`516fc7d673b0dfcc7e1e01ba8572cd97cdcf6784` (including the user-directed
60-second §4A rule). Pre-§5 refinements and §4D P1–P5 are otherwise closed;
Section 6 is now authorized under §5.4.

## Current / next task

`UX2.6-PHASE-A-ROOT-ACTION-PROJECTION-01` — add the first typed, public,
fail-closed root-action proof for one ordinary single-target card interaction,
linking authoritative interaction/frame identity, source, root-card identity,
and target. Do not derive semantics from timeline order, `actionPlayerId`, or
DOM/seat position. Prove a real server-generated case and mismatched/missing
proof rejection. This task establishes Phase A's semantic input contract; the
top-level physical-seat overlay and graph rendering remain for a later bounded
task. Section 6 must continue one bounded task at a time.
