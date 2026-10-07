# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result and CI

`UX2.REFINE-ZHUGE-LIANG-STARGAZING-ACTIVATION-ROUTING-01` completed at `02fa50659ddd1f8e00283613ea070e42996d4d9d`; Actions #826 (`37567687294`) succeeded for that exact SHA, including `build-and-test` and `deploy`. The next active-continuation change is local; focused Playwright coverage passed 1/1 across 320×640, 390×844, 480×900, and 1440×900; targeted ESLint and `git diff --check` passed. CI #817 (`37557990410`, SHA `150ff54`) failed in `npm run test:browser`; the recorded failing case was Diao Chan's `Beauty Outshining the Moon` wrapping to three lines at 320×640. #819 repeated it; condensed-font fallback in `73fa255` addressed it. Actions #824 (`37565028923`) and #825 (`37566520551`) succeeded for exact SHAs `f95ec76…` and `01e2ad9…`.

## Design checkpoint

Fully reviewed current remote `docs/UX2-refine.md`, blob `7e021455c8fdc9e88dc1b3b20d036400da82be44`; Sections 1–6 reviewed and unchanged at this boundary. Current task authority: §4.3, §4.6, and §4.8.

## Current task

`UX2.REFINE-ZHUGE-LIANG-STARGAZING-ACTIVE-CONTINUATION-01` — local implementation uses only actor-owned `privateDeckReorder` to keep Stargazing visibly active and non-actionable during its private continuation; observers/missing payload fail closed, no duplicate activation appears, and replacement of the authoritative action clears active state without geometry movement. Focused Playwright spec passed 1/1 over 320×640, 390×844, 480×900, and 1440×900; targeted ESLint and `git diff --check` passed. Source audit: Stargazing is the only current producer of `deck_reorder`; the server projects reorder cards only to `pending.actorId`. Do not alter server rules or Empty Fortress passive styling. Before commit, re-fetch and verify CI for exact remote HEAD; commit only task files plus this handoff.
