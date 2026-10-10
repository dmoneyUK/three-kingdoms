# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `USER-DIRECTED UX REFINEMENT`

## Latest result / CI

§6.34 Stage A implementation: server-backed Attack/Dodge browser matrix passed 4/4 (1m36s) at 390×844, 440×956, 480×900 and 1440×900, across source, target and observer views. Measured Hand CardFaces are 68×102 CSS px; public Attack/Dodge faces are 60×90, with 54×81 compact fallback. Rank/suit corners scale with the face (9/7px; compact 8/6px). `npm run build` and `git diff --check` passed. Reviewer visual acceptance remains pending. Pre-commit CI gate: latest relevant Actions run `38074092482` succeeded on `3739cec`; current remote `5b5a160` only updates design docs and has no matching run.

## Design checkpoint

Reviewed latest remote `docs/UX2-refine.md` blob `2e33ccf6fa9582bb537c490db737653eec926158`, including changes since `1108283`: §6.35 now prioritizes immediate retirement of completed graphs on authoritative new-action/turn boundaries; its lifecycle rule does not cancel the in-flight Stage A. Stage A visual acceptance is still open.

## Current task

`UX2-6.35-COMPLETED-GRAPH-SUPERSESSION-01` (P0) — reproduce a real server-backed Attack→Dodge result whose 20s graph remains after accepted End Turn/discard/next turn; capture authoritative action, phase/turn, root/response IDs and held-overlay diagnostics; then implement one small server-authoritative supersession predicate that clears the entire completed graph on independent action/turn/session boundaries without clearing same-root continuations. Focused browser proof at 390×844, ~440px and 480×900; do not change card sizing/placement, timers or CI selection. Stop for user review. Stage A screenshots/evidence are ready for Reviewer visual acceptance; no acceptance is claimed.
