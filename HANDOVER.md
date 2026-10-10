# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `USER-DIRECTED UX REPAIR`

## Latest result / CI

The 20-second Attack→Dodge graph hold remains the latest implementation result. Added an opt-in local recorder for projection/proof, candidate selection, overlay blockers, geometry, rendered Stage/legacy/SVG composition, and timers. Recorder commit `e0ae2e4406773bc142703115c636c2ae3cd532cc` first failed Hooks lint; repair `41303f501cb15c574b9c0d54b208b60b92e17136` cleared lint but run `38035633330` failed one stale fast assertion that matched the new menu text “Attack/Dodge” instead of checking a rendered card. Browser smoke/API passed; deployment was skipped. The existing assertion now checks for an actual Dodge card face; its test file passes 45/45 locally. No tests were added. CI REPAIR PUSHED — VALIDATION PENDING.

Latest failed CI is run `38035633330` for SHA `41303f501cb15c574b9c0d54b208b60b92e17136`; the test-only assertion repair is pushed and its exact-SHA validation is pending. No recorder deployment or real-device trace is confirmed.

## Design checkpoint

Latest `docs/UX2-refine.md` blob `6ad42a6f4522be67bd492a20aa1564e420aeffe2` reviewed. §6.29.7 says 3 seconds; direct user instruction overrides the Attack→Dodge graph hold to 20 seconds. No Reviewer acceptance or real-mobile confirmation is claimed.

## Current task

`UX2-6.29.1-ATTACK-DODGE-REAL-TRACE-01` — get the opt-in recorder through CI/deployment, then capture a real game where Attack root or Dodge is missing from the relationship graph. Use the exported trace to identify the first failing stage and fix that specific production cause. Resume: mobile game System Menu → Start Attack/Dodge trace → reproduce → Stop → Copy/Download UX trace.
