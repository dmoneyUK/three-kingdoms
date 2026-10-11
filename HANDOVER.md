# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `USER-DIRECTED UX2 TASK`

## Latest result / CI

`UX2-6.36-02-DODGE-WITHOUT-STABLE-ROOT-RECOVERY` shipped as `41187a4cc65fa8e9d2265dcd575f64fca2a0c173`. A real server-backed late-entry case reproduced a valid committed Dodge without a local root-layout cache. The overlay now lets that exact public proof use the existing collision-safe layout solver and records root/frame/source/target/response identity. At 440×766, late observer/attacker/observer rebuild the graph; the defender orientation with no collision-free placement remains explicitly fail-closed. Local build, targeted ESLint, syntax/diff checks, and five focused browser regressions passed. Exact-SHA Actions run `38098403261`: **success** (Lint/fast, API, browser startup smoke, deploy). Production `/api/health` returned `{"ok":true,"worker":"available"}` and the deployed page bundle contains the exact `41187a4` build SHA.

## Design checkpoint

Latest remote `docs/UX2-refine.md` blob: `d966440b487bcbe172d5ea608704cc6945dfe6df` (reviewed; §6.36.3 Task 2 governs this bounded recovery).

## Current task

STOP — Task 2 is shipped and deployed; await Reviewer/user visual review. Do not start §6.36 Task 3.
