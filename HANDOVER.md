# Current Handover

Branch: `ux-v2` (working branch `codex/ux2-h2-g1-inspect-affordance`)

Latest design reviewed: `docs/UX2-refine.md` at `9df03464cdb8602cec6ca066f3a1394f8bf9c6ae`, including the 2026-10-24 phone scope decision (4/6/8 players only for this task).

## Current task: `UX2-10.8.2.2-H2-G1-F` — separate target and Inspector touch areas

**Local implementation complete; exact-SHA CI, deployment and user phone review pending.** Hero portraits render independently at full size. While target selection is active, the legal portrait button ends before the transparent 44px Inspector hit region; the accepted player-name strip is the Inspector button label. Target legality, selection/cost state, TEST SWITCH and public Inspector projection are unchanged. Global player-count rules and desktop behavior are out of scope.

**Focused validation:** mobile touch/browser tests for 4/6/8 players at ten 390–480px phone viewports passed; `play-target-eligibility.spec.mjs` passed 5/5; real four-player Diao Chan Lust selection/Inspector regression passed 1/1; `room-safety-render.test.mjs` passed 21/21; production build passed; targeted ESLint had 0 errors and 3 existing Hook warnings; `git diff --check` passed. No real-phone acceptance is claimed.

**CI gate:** remote `ux-v2` head `9df03464…` adds documentation only and is excluded by the workflow’s `paths-ignore: "**/*.md"`; its source ancestor `2b99e7b4…` has a successful push run with lint/fast, API, browser smoke and deploy jobs. Commit/push the bounded implementation to `ux-v2`, then wait for that exact SHA’s required jobs and production smoke. If green, mark H2-G1-F **IMPLEMENTED / DEPLOYED — PENDING USER PHONE REVIEW** in the design document, re-read the latest design to select one next bounded task, and replace this handover with that task only.
