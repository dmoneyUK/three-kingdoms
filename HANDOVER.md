# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

Product/UI behavior is defined by `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`; execution rules are in `AGENTS.md` and `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`; durable history is in `docs/AUTONOMOUS_UI_ROADMAP.md`.

## Latest CI checkpoint

Exact pushed revision `40f26b0304bde18ea871f7f3b7776e5cb799bf7c` failed Actions run `37347955306`: lint, build, and browser steps passed, but `npm test` failed because the UI-11 source assertion in `tests/room-safety-render.test.mjs` still required the old literal seat width. Deploy was skipped. Previous exact remote head `89efc45156e4891639d2ecaa899e6f71a2e7f0e9` passed run `37344999603`. Repair this stale assertion only, push a CI-repair-only commit, and do not resume feature delivery until that exact repair SHA passes.

## Design checkpoint

Reviewed latest remote design blob `45430bc62b7c50bcbeef40724408ead94ad27120` at `origin/ux-v2`, unchanged since the prior checkpoint. The next task follows §1.3–1.5.2: mobile Side Column Hero thumbnails should preserve a recognisable portrait at the validated 480px/650px widths without entering the Interaction Safe Zone or Local Player Dock.

## Latest result

Closed `UX2.3-LOCAL-SKILL-PEER-CONSISTENCY-01`: peer Hero-skill controls now share width with a zero flex basis. The new Zhou Yu regression verifies comparable control width at 320/390/480/1440px, ≥44px targets, at most two label lines, no overflow, centre hit targets, and preserved disabled/aria state. The new spec plus the existing UI19 Zhen Ji skill-readability matrix passed 10/10; targeted ESLint and `git diff --check` passed. Exact pushed SHA `89efc45156e4891639d2ecaa899e6f71a2e7f0e9` passed Actions run `37344999603`, including build-and-test and deploy/smoke-test jobs. `tests/browser/ui19.spec.mjs` remains unchanged.

## Current task — CI-REPAIR-SIDE-COLUMN-WIDTH-CONTRACT-01

`UX2.3-SIDE-COLUMN-THUMBNAIL-RECOGNITION-01` was pushed as `40f26b0`, but its exact Actions run failed only on a stale UI-11 CSS-width assertion; its lint, build, and browser steps passed, while deploy was skipped. The new responsive seat sizing and browser regression passed 8/8 across 6/10 players at 320/390/480/650px; existing UI19 Side Column Equipment/crop checks passed 8/8; targeted ESLint and `git diff --check` passed. At 480/650px, side seats are 74px wide and screenshots show a recognisable Hero-art region. The 10-player/650px row budget yields 100px seat height; other checked cases remain ≥108px. `tests/browser/ui19.spec.mjs` is unchanged.

Update only `tests/room-safety-render.test.mjs` so UI-11 verifies Side Column seat width is driven by `--side-safe-thumb-width` and that the same variable feeds safe-zone geometry, including the responsive mobile value. Preserve topology/row-budget assertions; do not change production behavior or bundle feature work. Run only the named UI-11 test and `git diff --check`. The current remote head is failing, so only this CI-repair commit is permitted; after push, record its exact SHA as validation pending and wait for its required Actions run before resuming UX tasks.
