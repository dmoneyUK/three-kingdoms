# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `USER-DIRECTED UX2 TASK`

## Latest result / CI

`UX2-6.36-02-DODGE-WITHOUT-STABLE-ROOT-RECOVERY`: the real server-backed late-entry case reproduced a valid committed Dodge without a local root-layout cache. The overlay now lets that exact public proof use the existing collision-safe layout solver and records the root/frame/source/target/response identity. Browser evidence shows the late observer can rebuild the same graph; a viewer with no collision-free placement remains explicitly fail-closed. Local build, targeted ESLint, syntax/diff checks, and five focused browser regressions passed. Latest relevant Actions run before this change: `38090086059`, SHA `896938e`, success. Exact change-SHA CI/deployment: pending push.

## Design checkpoint

Latest remote `docs/UX2-refine.md` blob: `d966440b487bcbe172d5ea608704cc6945dfe6df` (reviewed; §6.36.3 Task 2 governs this bounded recovery).

## Current task

Verify the exact pushed Task 2 SHA's Actions/deployment, then stop for Reviewer/user visual review. Do not start §6.36 Task 3.
