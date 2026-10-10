# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `USER-DIRECTED UX REFINEMENT`

## Latest result / CI

§6.35 completed-graph supersession is implemented locally: a completed Attack/Dodge graph retires on server-authoritative public action, End Turn/discard, turn/game/room boundary, or its server-issued 20s deadline; same-root continuations remain intact. Current Node 22.13.0 checks: build passed, lint passed, fast tests 270/270, API tests 266/266, lifecycle unit tests 9/9, focused server-backed browser tests 5/5. Latest remote HEAD before this change `814b4e5`; Actions run `38080179998` failed. Its lint failure (`_local`/`_id` unused) is fixed here. API job exposed only a generic exit code; exact-SHA Node 22 API reruns passed twice, and current API suite passed. New pushed-SHA CI/deployment pending.

## Design checkpoint

Latest remote `docs/UX2-refine.md` blob: `2e33ccf6fa9582bb537c490db737653eec926158`. §6.35 reviewed; no newer design change. §6.34 Stage A card sizes remain Hand 68×102px, public 60×90px (compact 54×81px); rank/suit marks scale with the face (9/7px; compact 8/6px). Reviewer visual acceptance remains pending.

## Current task

`UX2-6.35-COMPLETED-GRAPH-SUPERSESSION-01` — implementation and focused evidence complete locally; commit/push, verify exact-SHA CI and deployment, then stop for Reviewer/user inspection. Do not start §6.34 expansion before visual acceptance. No Reviewer acceptance is claimed.
