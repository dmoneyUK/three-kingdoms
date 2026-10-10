# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `USER-DIRECTED UX REPAIR`

## Latest result / CI

The 20-second Attack→Dodge graph hold remains; the opt-in local trace now records projection/proof, candidate selection, overlay blockers, geometry, rendered Stage/legacy/SVG composition, and timers. The existing Judgement assertion was narrowed to an actual Dodge card face (45/45 tests in that file locally); no tests were added. Latest remote CI run `38035821193` for exact SHA `faba3633ffef13082990a47b85f0778794c25100` succeeded across browser smoke, API, lint/fast tests, deploy, and production smoke. The recorder is deployed. Real gameplay trace and device confirmation remain outstanding.

The user-directed 20-second hold remains in force. No Reviewer acceptance or real-mobile visual acceptance is claimed.

## Design checkpoint

Latest `docs/UX2-refine.md` blob `6ad42a6f4522be67bd492a20aa1564e420aeffe2` reviewed. §6.29.7 says 3 seconds; direct user instruction overrides the Attack→Dodge graph hold to 20 seconds. No Reviewer acceptance or real-mobile confirmation is claimed.

## Current task

`UX2-6.29.1-ATTACK-DODGE-REAL-TRACE-01` — use the deployed recorder in a real game where Attack root or Dodge is missing from the relationship graph; inspect the export, identify the first failing stage, and fix that specific production cause. Resume: mobile game System Menu → Start Attack/Dodge trace → reproduce → Stop → Copy/Download UX trace.
