# UX3 Handover

## Current state

- Authority: UX3-D18 (`a067415ec9430569c44ed62abe8f6ca43067a138`) and UX3-AUTO-04. Owner resumed the ordered FE-01R → FE-06 batch; no intermediate Manager wait was required.
- Isolated worktree: `/Users/jingedai/.codex/worktrees/ux3-env-01a`, branch `ux3`. UX2 and AI workspaces/branches were not edited.
- **FE-01R through FE-06 reached their technical gates. FE-06 exact-SHA CI and the authorized shared deployment passed on attempt 7 of run `46177226627`. The batch is complete and awaits independent UX3 Manager acceptance; no Owner visual/device acceptance is claimed.**
- Next bounded task: independent UX3 Manager review and acceptance of the completed FE-01R → FE-06 batch. No additional implementation task is selected.
- The Agent did not run local UI, browser, screenshot, or device checks. CI Browser Smoke remained enabled. No D1 migration was run.

## Batch evidence

| Unit | Source / evidence | State |
| --- | --- | --- |
| BASELINE-02 | `899fa260529ff10af98c960e3c43803c139f7318`; [run 46141762056](https://github.com/dmoneyUK/three-kingdoms/actions/runs/46141762056), 4/4 jobs passed; no deploy | Technical gate passed |
| DEPLOY-01A | `a097c9c0262928cb208cfe31008716a30092f87d`; [run 46146234137](https://github.com/dmoneyUK/three-kingdoms/actions/runs/46146234137), 4/4 jobs; staging 52/52, target guard 17/17 | Technical gate passed |
| DEPLOY-01B | `206067a3414c53cd434bc21ba7a92c287eb3a2af`; [run 46149030209](https://github.com/dmoneyUK/three-kingdoms/actions/runs/46149030209), 5/5 jobs; shared Worker `three-kingdoms`, D1 `three-kingdoms-db`, version `af796e96-3a20-4bb7-ac9d-e43985ee86fe`; root and `/api/health` smoke passed | Shared auto-deploy enabled |
| FE-01 / FE-01R | Initial source `e40ca429` → `a20742db` → `6d003811`; recovery source `b33eed6e5c6b2c81c5f1af2aff8e1701000c193d`; [recovery run 46159494582](https://github.com/dmoneyUK/three-kingdoms/actions/runs/46159494582), exact SHA, 5/5 jobs green; Worker `228bcfe6-8011-48b0-a353-35cad63af793` and smoke passed | Recovery gate passed; initial browser regression superseded |
| FE-02 | `8c1a3d1b` → `ec13b90c72bcd961f589d52c3f6db9eb9efb7b26`; [run 46163604806](https://github.com/dmoneyUK/three-kingdoms/actions/runs/46163604806), exact SHA, 5/5 jobs; fast 630/630, staging 52/52, API 397/397, Browser Smoke 4/4; Worker `f49caf8b-dd4c-487d-aaf7-16ad9573bc8e`, smoke passed | Technical gate passed |
| FE-03 | Final source `e48c2fc1010915b6c6009e8438769fa6994fb6b8`; [run 46171689203](https://github.com/dmoneyUK/three-kingdoms/actions/runs/46171689203), attempt 3, exact SHA, 5/5 jobs; fast 637/637, staging 52/52, API 397/397, Browser Smoke 4/4; Worker `880a2b69-663a-43b3-865d-3ea8da2a8c8c`, smoke passed | Technical gate passed |
| FE-04 | No source change. Existing canonical owners were confirmed for discard, Judgement, and shared Negation/Duel/AOE; no duplicate selector migration was justified. Focused owner/projection tests passed (discard 32/32, Judgement 28/28, projection/routing 61/61, Duel owner 4/4). | Canonical skip; reused exact `e48c2fc` CI evidence |
| FE-05 | `00750dd02f3d98d6c0aec30b844d564a447a80ed`; [run 46174892141](https://github.com/dmoneyUK/three-kingdoms/actions/runs/46174892141), exact SHA, 5/5 jobs; focused measurement tests 5/5 and stage-layout tests 40/40; shared Worker version `a82199ea-b204-46d1-8e30-c241409895d5`, smoke passed | Technical and authorized shared-deploy gate passed; no migration |
| FE-06 | Source submissions `ef3d0a11ddc56fa36d8c76724d426a5b95e4f05e` and `7b7f54456f18e0e47ea493755ed15ed2cb0a5c25`; [run 46177226627](https://github.com/dmoneyUK/three-kingdoms/actions/runs/46177226627), attempt 7 exact SHA, 5/5 jobs green; Worker `three-kingdoms`, D1 `three-kingdoms-db`, version `b34e8067-7dc0-46d8-9fd7-cd8188aa7a13`; root and `/api/health` smoke passed, no migration | Technical gate and authorized shared deploy passed; pending Manager review |

## FE-06 result and blocker

- Extracted `OpponentPlayerCard`, `LocalPlayerDock` / its existing layout hook, `PublicH4Text`, and `HeroPortrait` plus their small typed/pure dependencies under `app/components/game/`. `app/page.tsx` and `app/public-card-display.tsx` now import the extracted owners; retained direct public re-exports where existing consumers require them. DOM, classes, attributes, ARIA, handlers, CSS, server/game behavior and protocol were not intentionally changed.
- The first source SHA `ef3d0a11…` failed Lint/fast on stale source assertions and an unused type import; its Browser Smoke passed 4/4 and API/staging passed. The second source SHA fixed those assertions/import. On final SHA, focused boundary tests passed 2/2, source-body preservation comparisons passed 4/4, targeted ESLint passed, and `git diff --check` passed. Exact CI Lint/fast, API, and staging jobs subsequently passed.
- Final SHA exact CI attempts 1–6 had intermittent Browser Smoke failures; attempt 4 also had API `fetch failed` errors. The Browser Smoke issue is pre-existing on FE-03 SHA `e48c2fc` (run `46171689203`, attempt 1) at the same test line; that SHA later passed on attempt 3. On final SHA, attempt 7 passed all five jobs. Counts: lint/fast 644/644, staging guard 52/52, API 397/397, Browser Smoke 3 passed plus 1 flaky test that passed on retry. The exact test is `tests/browser/room-creation-real-gameplay.spec.mjs:58`; logs show the `Select` button absent on its first try. This supports an intermittent test failure, not a proven source cause.
- Attempt 7 deployed the shared Worker from exact source SHA `7b7f54456f18e0e47ea493755ed15ed2cb0a5c25`, returning version `b34e8067-7dc0-46d8-9fd7-cd8188aa7a13`; Worker binding was `three-kingdoms-db`, root and `/api/health` smoke requests succeeded, and no migration ran. The page exposed no build-SHA marker, so no independent live-SHA readback is claimed.
- Remaining `GameRoom` and `PublicCardDisplay` container decomposition is explicitly unfinished, per FE-06 contract.
