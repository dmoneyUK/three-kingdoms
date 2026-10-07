# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result and CI

`UX2.REFINE-ZHUGE-LIANG-STARGAZING-ACTIVE-CONTINUATION-01` completed at `c83f95445f4af13100840f333aaed8ae672b333a`; Actions #827 (`37568943484`) succeeded for that exact SHA, including `build-and-test` and `deploy`. The Empty Fortress passive-tile change is local; focused Playwright coverage passed 6/6 with the Hero-skill consistency suite at 320×640, 390×844, 480×900, and 1440×900; targeted ESLint and `git diff --check` passed. Previous Stargazing activation task completed at `02fa506` with #826 green. CI #817 (`37557990410`, SHA `150ff54`) failed in `npm run test:browser`; the recorded failing case was Diao Chan's `Beauty Outshining the Moon` wrapping to three lines at 320×640. #819 repeated it; condensed-font fallback in `73fa255` addressed it. Actions #824 (`37565028923`) and #825 (`37566520551`) were green for their exact SHAs.

## Design checkpoint

Fully reviewed current remote `docs/UX2-refine.md`, blob `7e021455c8fdc9e88dc1b3b20d036400da82be44`; Sections 1–6 reviewed and unchanged at this boundary. Current task authority: §4.3, §4.6, and §4.8.

## Current task

`UX2.REFINE-ZHUGE-LIANG-EMPTY-FORTRESS-PASSIVE-01` — local implementation renders Empty Fortress Strategem as a stable, neutral, non-actionable passive group with an accessible passive name; it matches Stargazing's outer geometry and has no button, pressed state, hover cursor, or bottom action. The focused browser specs passed 6/6 across 320×640, 390×844, 480×900, and 1440×900; targeted ESLint and `git diff --check` passed. Existing all-roster geometry assertions were updated to preserve disabled-action checks while explicitly verifying the passive role. Do not infer Empty Fortress's in-force state from Hand count. Before commit, re-fetch and verify CI for exact remote HEAD; include only this task plus handoff.
