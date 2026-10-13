# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `USER-DIRECTED UX REFINEMENT`

## Latest result / CI

- Layout refinement is pushed as `535e9e4ebd57df7b62345d986655d8cbabfc2498`. Actions run [`38368442423`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/38368442423): API and browser smoke passed; lint failed on one unused test variable, so deploy was skipped. A separate CI-only lint repair is in progress.
- Focused browser validation passed 25/25, including real server-backed 390px geometry/privacy checks.
- Evidence: `test-results/ux2-4b12-unified-target-inspect-v2/server-five-line-skill-390.png` and `server-five-line-skill-layout-390.json`.

## Design checkpoint

Reviewed `docs/UX2-refine.md` blob `6b9ad6ab83e8e64c185b3fdeed4ca03f40310ccb`, §4B.12. No design-document edit was made.

## Current task — `UX2-4B.12-UNIFIED-TARGET-INSPECT`

Place public Equipment and Judgement beside the Hero name/HP area, keep Public Skills below HP, and show five lines of a selected skill description. Preserve the single click-to-inspect panel, public-only server projection, target legality, privacy, fixed seats, and 48px-above-center positioning. Deliver the focused geometry/privacy evidence, update exact CI/deployment state, then stop for user visual review.
