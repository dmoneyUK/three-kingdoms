# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `USER-DIRECTED TEST INFRA TASK`

## Latest result / CI

`WTK-TEST-ROOM-HERO-SELECTION-01` implementation is ready: in an explicitly enabled TEST GAME, the host controller can choose any unused implemented Standard hero for each controlled seat during the existing hero-selection stage. Choices use the existing server-authorized `choose_hero` flow; duplicate heroes remain rejected. Unmarked Quick Test and ordinary multiplayer keep their existing role-specific candidate pools. No migration or gameplay-rule change.

Focused validation: `npm run build`; `GAME_TEST_FILES=tests/api/lobby-heroes-wei.test.mjs node tests/run-tests.mjs` (23/23); `git diff --check`. Scoped ESLint was attempted but the local Node process exhausted its heap; this is not a passing lint result.

Before this task commit, remote `ux-v2` HEAD was `6640a7ab1d8796cb2bc29264a965b4c0c5665e7e` with no combined status entries. The latest push-triggered run observed for the branch was `38124908539` on `2bfdc5b1632c1406571ad523cba05d5b92d718c2`, completed successfully. Per the user's CI rule, the empty current-HEAD status is treated as success. Post-push validation for this task SHA is pending observation.

## Design checkpoint

Latest remote `docs/UX2-refine.md` blob: `d966440b487bcbe172d5ea608704cc6945dfe6df` (reviewed; not changed for this testing-infrastructure task).

## Current task

`WTK-TEST-ROOM-HERO-SELECTION-01` — commit and push only the scoped hero-selection implementation, regression proof, and this handoff; then report the exact SHA and observed Actions state and stop for user review.
