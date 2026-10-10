# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `USER-DIRECTED UX REFINEMENT`

## Latest result / CI

§6.36 Task 1 fix: a new Attack now selects its newly authored causal envelope instead of a completed Negation frame retained for history. API regression covers declined and countered/restored DrawTwo Negation; three-view 440×766 browser flow proves the Attack root and source/target paths are visible before Dodge. Focused checks: API 24/24 + engine/projection API 39/39, browser 1/1, targeted ESLint and `git diff --check` passed. Pre-commit latest code-push Actions run `38086020572` succeeded for `6dd2178`; later remote commits through `5c60728` are docs-only. This task's exact-SHA CI/deploy is pending.

Known residual: after a real Dodge at 440×766, the same root/proof remains identified, but all three browser perspectives report `geometry-unavailable`; the Dodge face and response connectors are not visible. Captured screenshots/geometry are local Playwright artifacts. This is outside Task 1's root-envelope fix; do not silently begin another repair.

## Design checkpoint

Latest remote `docs/UX2-refine.md` blob: `5fc5e771143dc460109aa1868e79cf5986815d9b`; §6.36 Task 1 reviewed. Reviewer acceptance remains pending.

## Current task

STOP — request independent Reviewer/user review of §6.36 Task 1 evidence after exact-SHA CI/deploy verification. Do not start §6.36 Task 2/3 or other UX work without the next explicit authorization.
