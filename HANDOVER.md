# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result and CI

CI-only repair `8dd57375a3e02b24a03528449d2c68c52d662036` raises the `build-and-test` timeout to 20 minutes after prior SHA `40f295d` run #832 was cancelled at the 10-minute limit despite successful lint, build, browser tests, and all 96 API tests. Exact repair run #833 (`37587750886`) passed both `build-and-test` and `deploy`. Triumphant feature/repair evidence remains as recorded in the roadmap. No Reviewer acceptance claimed.

## Design checkpoint

Reviewed the full remote `docs/UX2-refine.md`, blob `ae314707494f48e80c24e18e1a9a186ebb6c37c1`. Since prior blob `7e021455c8fdc9e88dc1b3b20d036400da82be44`, §1.8 added the direct user decision that cross-Hero passive choices belong in the current viewer's Local Dock Action Row, not the viewer's Skills band. §5 keeps UX3 deferred until active refinement §§1–4 close.

## Current task

`UX2.REFINE-PAN-FENG-AXE-PASSIVE-PRESENTATION-01` — represent metadata-declared automatic Axe of Insanity as a stable non-actionable Local Skills tile and include it in the roster geometry/no-action matrix. Focused `local-skill-control-consistency.spec.mjs` passed 6/6; targeted ESLint and `git diff --check` passed. Preserve its mandatory authoritative CurrentAction continuation; no server/gameplay change or continuation redesign. After this task commit is pushed, await that exact SHA's full CI before planning the next task.
