# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `USER-DIRECTED UX REPAIR`

## Latest result / CI

The 20-second Attack→Dodge graph hold remains the latest implementation result. Added an opt-in, local-only recorder to distinguish server projection/proof, client candidate selection, overlay blockers, geometry, rendered Stage/legacy/SVG composition, and hold timers. It stores a bounded trace in this browser tab and exports by copy/download; it does not upload data. No new tests were added. Local build and focused ESLint for the trace utility and overlay pass; page-level ESLint exhausted the available Node heap. Real-device trace has not yet been captured.

Latest remote `ux-v2` CI before this recorder change: run `38020378208`, exact SHA `b3350a0f7f6e48fda3e294839cc85ac90576ef9d`, success. This does not validate the uncommitted recorder.

## Design checkpoint

Latest `docs/UX2-refine.md` blob `6ad42a6f4522be67bd492a20aa1564e420aeffe2` reviewed. §6.29.7 says 3 seconds; direct user instruction overrides the Attack→Dodge graph hold to 20 seconds. No Reviewer acceptance or real-mobile confirmation is claimed.

## Current task

`UX2-6.29.1-ATTACK-DODGE-REAL-TRACE-01` — get the opt-in recorder through CI/deployment, then capture a real game where Attack root or Dodge is missing from the relationship graph. Use the exported trace to identify the first failing stage and fix that specific production cause. Resume: mobile game System Menu → Start Attack/Dodge trace → reproduce → Stop → Copy/Download UX trace.
