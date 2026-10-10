# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `USER-DIRECTED UX REFINEMENT`

## Latest result / CI

§6.35 completed-graph supersession shipped in `6dd2178d`. Exact-SHA Actions run `38086020572` succeeded: lint/fast, API, browser startup smoke, D1 migration, build, Worker deploy and production smoke all passed. Local Node 22.13.0: build and lint passed; fast 270/270; API 266/266; lifecycle unit 9/9; focused server-backed browser 5/5. Previous run `38080179998` failed lint (unused test bindings, fixed here) and API (generic exit only; exact-SHA Node 22 reruns passed twice; cause not reproduced). No false CI cause claimed.

## Design checkpoint

Latest remote `docs/UX2-refine.md` blob: `2e33ccf6fa9582bb537c490db737653eec926158`. §6.35 reviewed; no newer design change. §6.34 Stage A card sizes remain Hand 68×102px, public 60×90px (compact 54×81px); rank/suit marks scale with the face (9/7px; compact 8/6px). Reviewer visual acceptance remains pending.

## Current task

User review of the deployed §6.35 graph lifecycle; Agent paused at the requested review boundary. §6.34 Stage A still uses Hand 68×102px, public 60×90px (compact 54×81px), with proportional rank/suit marks (9/7px; compact 8/6px). Visual acceptance remains pending; do not expand card-family work before Reviewer acceptance. No Reviewer acceptance is claimed.
