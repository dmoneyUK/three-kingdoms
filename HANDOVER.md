# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

This file contains only the current execution handoff. Product design is in `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`; execution rules are in `AGENTS.md` and `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`; history is in `docs/AUTONOMOUS_UI_ROADMAP.md`.

## Latest task result — UX2.0VIS-13C

Status: **IMPLEMENTED — CI UNVERIFIED**.

Borrowed Sword now uses one server-owned complete-path legality result for its primary Weapon-holder projection/validation and forced-Attack target projection/submission. The source may be the forced target when the holder can legally Attack them; no three-player minimum is imposed. Play-phase targets are exposed only in the acting viewer's `CurrentAction`, and React consumes that projection rather than rebuilding Borrowed Sword rules. Deferred resolution revalidates before opening its blocking target choice; an invalidated path settles without a zero-option Pending and preserves the causal continuation.

Focused validation: `npm run build` succeeded; `GAME_TEST_FILES=tests/api/borrowed-sword.test.mjs node tests/run-tests.mjs` passed 7/7; `node --test tests/room-safety.test.mjs` passed 4/4; the focused Borrowed Sword Playwright spec passed 2/2; targeted ESLint and `git diff --check` passed. No full test suite was run. The exact 13C commit checks were inspected once; GitHub displayed the `build-and-test` job as loading/re-running without an observable conclusion. CI remains unverified; do not claim green.

The 13B Actions run `37269808166` was observed **in progress** once before 13C source edits and has not been rechecked. Do not infer its result for 13C.

## Design review checkpoint

Reviewed remote design blob `f52b6134fd62696c71fc3cba86210319e454832b`; 13C implements Reviewer-approved addition C.

## Current task — successor planning checkpoint

Status: **BLOCKED — HUMAN REVIEW REQUIRED**.

The current design revision `f52b6134fd62696c71fc3cba86210319e454832b` contains Reviewer additions A–C; implementation and focused regressions for all three are present in `573ec3d`, `7dbf2bc`, and `4a9814b`. The design explicitly is not a task queue, and no further reviewer-approved bounded implementation requirement is identified. Choosing another UI/gameplay change would require guessing scope.

Smallest required decision: Reviewer updates the design with a new approved requirement or explicitly authorizes one next bounded task. Until then, make no new source/test edits. The 13C CI status remains unverified as recorded above.
