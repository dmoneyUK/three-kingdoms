# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

This file contains only the current execution handoff. Product design is in `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`; execution rules are in `AGENTS.md` and `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`; history is in `docs/AUTONOMOUS_UI_ROADMAP.md`.

## Latest task result — UX2.0VIS-13C

Status: **IMPLEMENTED — CI PENDING**.

Borrowed Sword now uses one server-owned complete-path legality result for its primary Weapon-holder projection/validation and forced-Attack target projection/submission. The source may be the forced target when the holder can legally Attack them; no three-player minimum is imposed. Play-phase targets are exposed only in the acting viewer's `CurrentAction`, and React consumes that projection rather than rebuilding Borrowed Sword rules. Deferred resolution revalidates before opening its blocking target choice; an invalidated path settles without a zero-option Pending and preserves the causal continuation.

Focused validation: `npm run build` succeeded; `GAME_TEST_FILES=tests/api/borrowed-sword.test.mjs node tests/run-tests.mjs` passed 7/7; `node --test tests/room-safety.test.mjs` passed 4/4; the focused Borrowed Sword Playwright spec passed 2/2; targeted ESLint and `git diff --check` passed. No full test suite was run. The 13C push-triggered CI run has not been checked; CI remains pending.

The 13B Actions run `37269808166` was observed **in progress** once before 13C source edits and has not been rechecked. Do not infer its result for 13C.

## Design review checkpoint

Reviewed remote design blob `f52b6134fd62696c71fc3cba86210319e454832b`; 13C implements Reviewer-approved addition C.

## Current task — UX2.0VIS-13C delivery checkpoint

Commit and push only `HANDOVER.md`, `docs/AUTONOMOUS_UI_ROADMAP.md`, `app/api/rooms/route.ts`, `app/page.tsx`, `game/capabilities/borrowed-sword.ts`, `game/protocol.d.ts`, `game/room-safety.js`, `tests/api/borrowed-sword.test.mjs`, `tests/browser/borrowed-sword-targets.spec.mjs`, `tests/browser/fixture.jsx`, and `tests/room-safety.test.mjs`. Then fetch and verify the exact remote revision. Before any successor source edit, reread the complete current workflow and remote HANDOVER, compare the latest remote design against this checkpoint, inspect the relevant code/tests, and check the 13C push-triggered Actions run once. Do not wait or repeatedly poll; keep CI pending if queued/in progress or unavailable, and diagnose a relevant failure before new feature work.
