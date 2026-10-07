# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result and CI

`UX2.REFINE-ZHUGE-LIANG-STARGAZING-ACTIVATION-ROUTING-01` is implemented locally; focused Playwright coverage passed 1/1 across 320×640, 390×844, 480×900, and 1440×900. Targeted ESLint passed for production code and the spec; fixture JSX is not in the ESLint config. `git diff --check` passed. Pre-commit remote HEAD `01e2ad9b480421ddc650fa165263e0521f90ca95` is green on Actions #825 (`37566520551`), including `build-and-test` and `deploy`. CI #817 (`37557990410`, SHA `150ff54`) failed in `npm run test:browser`; the recorded failing case was Diao Chan's `Beauty Outshining the Moon` wrapping to three lines at 320×640. #819 repeated it; condensed-font fallback in `73fa255` addressed it. Actions #824 (`37565028923`) succeeded for exact SHA `f95ec76…`.

## Design checkpoint

Fully reviewed current remote `docs/UX2-refine.md`, blob `7e021455c8fdc9e88dc1b3b20d036400da82be44`; Sections 1–6 reviewed, unchanged from the previous checkpoint. Current task authority: §4.3, §4.6, and §4.8.

## Current task

`UX2.REFINE-ZHUGE-LIANG-STARGAZING-ACTIVATION-ROUTING-01` — local implementation ready to commit: the authoritative `zhuge_liang_stargazing` CurrentAction option enables the existing Skills-band tile, click submits that provider, missing authority leaves it disabled, and no duplicate bottom activation appears. Focused browser proof passed at 320, 390, 480, and wide widths. Empty Fortress passive styling and deck-reorder active-state presentation are out of scope. Re-fetch and verify current remote HEAD/CI immediately before commit; commit only task files plus this handoff, push, and verify CI for the exact pushed SHA.
