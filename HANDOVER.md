# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result and CI

`UX2.REFINE-STAGE-SYSTEM-CLUSTER-01` completed in `b0a74fa43b7f0ee8a5f847357505720217f67f1a`. At 480×900, 650×900, and 1440×900 the Top Row REST System Menu is 8–12px above Guidance; active Stage content overlap is 0. Focused browser, timer, lint, and diff checks passed. Current remote HEAD matches this commit; Actions #823 (`37563754349`) succeeded for `build-and-test` and `deploy`. Earlier Actions #817 (`37557990410`, SHA `150ff54`) failed; subsequent repair/validation runs completed, and #823 is the current green gate.

## Design checkpoint

Fully reviewed remote `docs/UX2-refine.md`, blob `7e021455c8fdc9e88dc1b3b20d036400da82be44`; unchanged at this planning boundary. Current task authority: §3.3, with §3.9 acceptance.

## Current task

`UX2.REFINE-RAINING-ARROWS-TAKE-DAMAGE-01` — label the viewer-local authoritative `decline_response` control `TAKE DAMAGE` only when viewer-owned `CurrentAction` is a Dodge response and the proven public Group projection identifies the current participant as resolving Raining Arrows. Preserve the same server action; fail closed to `Skip` for all other or incomplete proof. Validation: focused browser spec 5/5; ESLint passed for `app/page.tsx` and the new spec; `git diff --check` passed. The browser cases cover no legal Dodge provider (no Confirm), a legal provider, generic-response fallback, and no private-control leakage into the public Stage. Before commit, verify the latest run for the exact current remote `ux-v2` HEAD; push only task files and this handoff, then verify the exact pushed SHA's CI.
