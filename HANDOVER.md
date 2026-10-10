# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `USER-DIRECTED UX REPAIR`

## Latest result / CI

The 20-second Attack→Dodge graph hold remains the latest implementation result. Added an opt-in local recorder for projection/proof, candidate selection, overlay blockers, geometry, rendered Stage/legacy/SVG composition, and timers. The recorder is browser-local and exports by copy/download; no new tests were added. Recorder commit `e0ae2e4406773bc142703115c636c2ae3cd532cc` failed run `38035383250`: `react-hooks/set-state-in-effect` at `app/page.tsx:2019`; browser smoke and API passed, deployment was skipped. CI repair replaces the effect with an external-store subscription. CI REPAIR PUSHED — VALIDATION PENDING. Real-device trace has not yet been captured.

The failed recorder SHA is `e0ae2e4406773bc142703115c636c2ae3cd532cc` (run `38035383250`). The repair is pushed; wait for CI on its exact new SHA before using the recorder in a real game.

## Design checkpoint

Latest `docs/UX2-refine.md` blob `6ad42a6f4522be67bd492a20aa1564e420aeffe2` reviewed. §6.29.7 says 3 seconds; direct user instruction overrides the Attack→Dodge graph hold to 20 seconds. No Reviewer acceptance or real-mobile confirmation is claimed.

## Current task

`UX2-6.29.1-ATTACK-DODGE-REAL-TRACE-01` — get the opt-in recorder through CI/deployment, then capture a real game where Attack root or Dodge is missing from the relationship graph. Use the exported trace to identify the first failing stage and fix that specific production cause. Resume: mobile game System Menu → Start Attack/Dodge trace → reproduce → Stop → Copy/Download UX trace.
