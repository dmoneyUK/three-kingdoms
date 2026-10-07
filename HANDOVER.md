# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result and CI

Remote `ux-v2` HEAD `e5c59532ceaae5681b56ac23d0dce1452e5acef4` passed run #831 (`37584932814`), including `build-and-test` and `deploy`. Triumphant feature commit `6025be2` passed its focused browser spec 8/8; its first full run #830 exposed a stale passive-skill test matrix (692 passed, 1 failed). Test-only repair `e5c5953` added Triumphant to that matrix; the focused matrix passed 6/6, and targeted ESLint/`git diff --check` passed. No Reviewer acceptance claimed.

## Design checkpoint

Reviewed the full remote `docs/UX2-refine.md`, blob `ae314707494f48e80c24e18e1a9a186ebb6c37c1`. Since prior blob `7e021455c8fdc9e88dc1b3b20d036400da82be44`, §1.8 added the direct user decision that cross-Hero passive choices belong in the current viewer's Local Dock Action Row, not the viewer's Skills band. §5 keeps UX3 deferred until active refinement §§1–4 close.

## Current task

`UX2.REFINE-PAN-FENG-AXE-PASSIVE-PRESENTATION-01` — represent Pan Feng's metadata-declared automatic Axe of Insanity as a stable, non-actionable passive tile in the Local Skills band, matching §1.6 and the existing passive registry. Add the Hero to the focused geometry/no-action matrix. Preserve its authoritative mandatory CurrentAction continuation exactly; no server/gameplay change and no continuation redesign. Prove 320/390/480/wide geometry, passive semantics, and no action submission from the tile.
