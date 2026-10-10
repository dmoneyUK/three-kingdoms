# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `USER-DIRECTED TEST INFRASTRUCTURE`

## Latest result / CI

`WTK-TEST-PRESET-HANDS-01` implementation is prepared locally: explicit host-enabled test rooms, persisted server-validated Standard-card presets, and physical-card assignment through the existing post-Hero-selection `beginMatch()` deal. Normal rooms retain random dealing. User directed that this feature have no automated tests; no feature-specific automated tests are retained. Production build and targeted ESLint passed; `db:generate` reports no schema drift. Manual deployed-game verification and exact feature-SHA CI/deploy are pending.

Before commit, latest relevant push CI was run `38087662559`, **success** on `379d14f9d9ba816f23d938ebba945885ad457bfb`. Current remote `ux-v2` is `4c40c1b851d1fce69c5c80ed5db1e0e1e21e7f52` (design-document-only update; no run observed for that SHA).

## Design checkpoint

Latest remote `docs/UX2-refine.md` blob: `d966440b487bcbe172d5ea608704cc6945dfe6df` (reviewed; its §6.36 update does not conflict with this direct testing-infrastructure task). Do not modify `docs/UX2-refine.md`.

## Current task

`WTK-TEST-PRESET-HANDS-01` — commit/push, verify exact-SHA CI/deployment, perform the real four-seat manual acceptance if the deployed browser is accessible, then stop for Reviewer/user review. Do not start §6.36 Task 2/3 or other UX work.
