# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `USER-DIRECTED CI GATE TASK`

## Latest result / CI

`UX2-CI-MINIMAL-6MIN-01` is implemented in `1bd8854`. Required push CI keeps lint/build/fast tests and the full API suite, and uses one server-backed room creation/game startup browser smoke. The complete Playwright collection remains available in `.github/workflows/ux-browser-diagnostics.yml` for manual diagnostics.

Three ordinary push workflows passed, including deployment and production smoke:

- [37999850459](https://github.com/dmoneyUK/three-kingdoms/actions/runs/37999850459): 2:56 wall; jobs lint/fast 1:25, API 1:55, browser 1:04, deploy 0:54.
- [38000232966](https://github.com/dmoneyUK/three-kingdoms/actions/runs/38000232966): 2:43 wall; jobs lint/fast 1:48, API 1:46, browser 1:23, deploy 0:48.
- [38000573876](https://github.com/dmoneyUK/three-kingdoms/actions/runs/38000573876): 2:48 wall; jobs lint/fast 1:56, API 1:53, browser 1:03, deploy 0:44.

The previous [full gate run 37934495952](https://github.com/dmoneyUK/three-kingdoms/actions/runs/37934495952) took 11:58. Aggregate runner time for the three minimal runs was 5:18, 5:45, and 5:36. Node setup retains npm caching; no forced cold-cache run was performed. Playwright CI still allows one retry; public run summaries confirm successful jobs but do not expose attempt counts.

The manual workflow is currently only on `ux-v2`. GitHub requires a `workflow_dispatch` file on the default branch (`main`) before it can be manually triggered, so the Actions manual entry will appear after that workflow reaches `main`. No `main` changes were made in this task.

## Design checkpoint

Latest `docs/UX2-refine.md` blob reviewed: `6ad42a6f4522be67bd492a20aa1564e420aeffe2`, §6.30. This was a CI-only change; no gameplay presentation was changed and green CI is not visual acceptance.

## Current task

Stop after `UX2-CI-MINIMAL-6MIN-01` and await the user's next instruction. Keep the manual workflow on `ux-v2` unless directed to promote it to `main`; do not begin another UX task. Unrelated uncommitted work in `app/page.tsx` and `app/interaction-root-overlay.tsx` remains untouched.
