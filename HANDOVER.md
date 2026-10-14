# WTK UX2 — Current Handoff

Branch: `ux-v2`

Latest remote design reviewed: `docs/UX2-refine.md` blob `5ae58543cdf9125ca4739bf245e6d00a9a694896`; merged design tree with UI-4 progress note is blob `659db2cd3066d95e9690c07bda69029d40ef675c`.

## Latest result

- UI-3 remains delivered at `946f6f697b938a87e78708e0bf5b52199b8544b5`; run [38650930258](https://github.com/dmoneyUK/three-kingdoms/actions/runs/38650930258) passed API, lint/fast, browser smoke, Cloudflare deploy and production smoke. `/api/health` returned HTTP 200. No Reviewer acceptance is claimed.
- UI-4 implementation is committed locally as `604c15a` and merged with the new Planner design commit in local merge `6848c41`; push-CI/deployment is pending. Focused API (8/8), authenticated Worker/D1 browser checks (2/2), production build, and `git diff --check` passed. Targeted ESLint passed on route/game/test files; `app/page.tsx` ESLint exhausted Node heap at 2 GB and 4 GB. `npx tsc --noEmit` still reports the repository's unrelated baseline diagnostics.

## Current task — §10.6.1 UI-4 (U3)

Push the merged UI-4 implementation and Planner design update, then verify exact-SHA Actions jobs and deployment. Preserve rules/privacy and do not modify product design details. After closure, start one bounded §10.7.1/R1 task from the new design: allow server-authorized, time-sensitive defensive responses during the Policy-B reveal without letting visual readiness block legal controls.
