# WTK UX2 — Current Handoff

Branch: `ux-v2`

Latest reviewed remote design: `docs/UX2-refine.md` blob `67db4dbe3cb1f224d35b835dfbc62ab072524849` (remote head `e1c2355beca6faaec24a62d79e880147bf5e96d0`).

## Latest result

- R1 delivered at `2d1556600d53199f59e3d7e5cddbc3dc9968a8d5`; authenticated Worker/D1 browser regression passed 7/7 at 390/440/480px, with focused Negation checks 2/2 and targeted static/build validation. Exact-SHA Actions run [38656810105](https://github.com/dmoneyUK/three-kingdoms/actions/runs/38656810105) passed browser smoke, API, lint/fast, deploy and production smoke. Later `ux-v2` commits are documentation-only and excluded from `deploy.yml`; deployed code remains R1 pending the next implementation push. Reviewer acceptance remains pending.
- R2 implementation is committed locally as `520cc5ebcc4ffacebe135adade7fb43651b303f9` on `codex/r2-causal-envelope-audit`, based on current `origin/ux-v2` `e1c2355beca6faaec24a62d79e880147bf5e96d0`. Worker/D1 API regression 41/41, full local fast 276/276 and API 283/283, authenticated real-browser chain 1/1, targeted ESLint, syntax, production build and diff checks passed. The D1 reproduction confirmed a stale persisted envelope could be selected for a fresh independent root; the server now keeps fresh-root proof with its new context. R2 is not yet pushed; exact-SHA CI/deploy remains pending.

## Current task — publish and verify §10.7.2 R2

Push the fast-forward R2 commit to `ux-v2`, verify its exact-SHA Actions jobs and deployment/production smoke, then record R2 as **PENDING REVIEW**. The latest relevant pre-push workflow is run `38656810105` for deployed code SHA `2d1556600d53199f59e3d7e5cddbc3dc9968a8d5` (success); later Markdown-only remote commits do not trigger the workflow. Reviewer preapproval is not a deployment gate under the latest design. Preserve Negation rules/privacy and do not enter UX3.
