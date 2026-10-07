# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result and CI

`UX2.REFINE-RAINING-ARROWS-TAKE-DAMAGE-01` completed in `f95ec76483b72e08066e7af47ca9b3e096af25cc`; focused browser spec 5/5, targeted ESLint, and `git diff --check` passed. Actions #817 (`37557990410`, SHA `150ff54`) failed at `npm run test:browser`; Actions #824 (`37565028923`) succeeded for exact SHA `f95ec76…`, including `build-and-test` and `deploy`.

## Design checkpoint

Fully reviewed current remote `docs/UX2-refine.md`, blob `7e021455c8fdc9e88dc1b3b20d036400da82be44`; Sections 1–6 reviewed, unchanged from the previous checkpoint. Active refinement task authority: §3.4 and §3.9.

## Current task

`UX2.REFINE-RAINING-ARROWS-PROVIDER-DISCOVERABILITY-01` — local implementation completed: during a proven viewer-owned Raining Arrows → Dodge response, mark the Hand only when an authoritative eligible Dodge card is present; emphasize enabled response providers and subdue disabled unrelated cards without changing selection/action behavior. Equipment/Hero provider surfaces and Stage/player geometry remain unchanged. Focused Playwright specs passed 9/9; targeted ESLint and `git diff --check` passed. Geometry/overflow assertions cover 390×844, 480×900, and 1440×900; generic and absent-proof states fail closed. Before commit, re-fetch and check the latest push-triggered CI for exact remote `ux-v2` HEAD; wait if incomplete and repair CI first if failed. Push only task files plus this handoff, then verify CI for the exact pushed SHA.
