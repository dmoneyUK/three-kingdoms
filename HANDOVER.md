# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `USER-DIRECTED UX REPAIR`

## Latest result / CI

`UX2-AUTO-GAME-TRACE-AND-BUILD-SHA-01` is implemented locally: automatic bounded per-game trace, privacy-safe public hero/skill context, and a persistent build SHA badge sourced from `github.sha`. Focused tests (22), targeted ESLint, build-SHA config check, and `git diff --check` pass. The latest relevant remote CI is run `38061870954`, success for `f10351c`; current remote `e3072a0` is docs-only. This change is not yet pushed or deployed.

## Design checkpoint

Latest remote `docs/UX2-refine.md` blob `6ad42a6f4522be67bd492a20aa1564e420aeffe2` reviewed; unchanged since `27bee56`.

## Current task

`UX2-AUTO-GAME-TRACE-AND-BUILD-SHA-01` — commit and push only this feature; verify exact-SHA Actions and deployment. Then stop for Reviewer to play a full game, download `UX trace`, and confirm the on-screen build SHA matches the deployment run. Do not claim real-device acceptance before that review.
