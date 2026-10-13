# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `USER-DIRECTED UX REFINEMENT`

## Latest result / CI

- Layout refinement is at `535e9e4ebd57df7b62345d986655d8cbabfc2498`; separate lint-only cleanup is at `fb3f9e4f3b09dffc65c4ba1a173a07a9e16f868e`. Exact-SHA Actions run [`38368879532`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/38368879532) passed lint/fast, API, browser smoke, D1 migrations, Worker deploy, and production smoke.
- Focused browser validation passed 25/25, including real server-backed 390px geometry/privacy checks. Evidence: `test-results/ux2-4b12-unified-target-inspect-v2/server-five-line-skill-390.png` and `server-five-line-skill-layout-390.json`.

## Design checkpoint

Reviewed `docs/UX2-refine.md` blob `6b9ad6ab83e8e64c185b3fdeed4ca03f40310ccb`, §4B.12. No design-document edit was made.

## Current task — `UX2-4B.12-UNIFIED-TARGET-INSPECT`

Place public Equipment and Judgement beside the Hero name/HP area, keep Public Skills below HP, and show five lines of a selected skill description. Preserve the single click-to-inspect panel, public-only server projection, target legality, privacy, fixed seats, and 48px-above-center positioning. Implementation and CI evidence are delivered; stop here and await user visual acceptance.
