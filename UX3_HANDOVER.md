# UX3 Handover

## Current state

- Authority: UX3-D18 (`a067415ec9430569c44ed62abe8f6ca43067a138`) and UX3-AUTO-04. Owner resumed the ordered FE-01R → FE-06 batch; no intermediate Manager wait was required.
- Isolated worktree: `/Users/jingedai/.codex/worktrees/ux3-env-01a`, branch `ux3`. UX2 and AI workspaces/branches were not edited.
- **FE-01R through FE-05 reached their technical gates. FE-06 source is pushed at `7b7f54456f18e0e47ea493755ed15ed2cb0a5c25`, but its required Browser Smoke gate remains failing. FE-06 was not deployed. Batch stopped for independent Manager review; no technical completion or Owner acceptance is claimed.**
- Next bounded task: UX3 Manager reviews the FE-06 Browser Smoke failure evidence and releases any recovery scope. No further source changes until that review updates the task boundary.
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
| FE-06 | Source submissions `ef3d0a11ddc56fa36d8c76724d426a5b95e4f05e` and `7b7f54456f18e0e47ea493755ed15ed2cb0a5c25`; final [run 46177226627](https://github.com/dmoneyUK/three-kingdoms/actions/runs/46177226627), attempts 1–6 | **BLOCKED:** see evidence below; deploy skipped |

## FE-06 result and blocker

- Extracted `OpponentPlayerCard`, `LocalPlayerDock` / its existing layout hook, `PublicH4Text`, and `HeroPortrait` plus their small typed/pure dependencies under `app/components/game/`. `app/page.tsx` and `app/public-card-display.tsx` now import the extracted owners; retained direct public re-exports where existing consumers require them. DOM, classes, attributes, ARIA, handlers, CSS, server/game behavior and protocol were not intentionally changed.
- The first source SHA `ef3d0a11…` failed Lint/fast on stale source assertions and an unused type import; its Browser Smoke passed 4/4 and API/staging passed. The second source SHA fixed those assertions/import. On final SHA, focused boundary tests passed 2/2, source-body preservation comparisons passed 4/4, targeted ESLint passed, and `git diff --check` passed. Exact CI Lint/fast, API, and staging jobs subsequently passed.
- Final SHA exact CI: attempts 1–3 and 5–6 had Lint/fast, API, and staging jobs pass; attempt 4 had the same Browser Smoke failure plus API `fetch failed` errors. Browser Smoke failed in all six attempts at `tests/browser/room-creation-real-gameplay.spec.mjs:58`: after `.hero-shell` appeared, `getByRole('button', { name: /^Select / }).first()` was absent; 3/4 smoke tests passed. The Browser Smoke also passed 4/4 on the preceding FE-06 source SHA, before the type-only import/assertion correction. Logs do not establish the failure's root cause; no runtime regression is claimed or ruled out.
- The deployment job was skipped on every final-SHA attempt. No FE-06 shared deployment occurred. Remaining `GameRoom` and `PublicCardDisplay` container decomposition is explicitly unfinished, per FE-06 contract.
