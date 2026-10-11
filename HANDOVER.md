# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `USER-DIRECTED TEST INFRA TASK`

## Latest result / CI

`WTK-TEST-ROOM-HERO-SELECTION-01` shipped in `9f4b93c7ec90dad316c0c66f0d254ec254181bea`: in an explicitly enabled TEST GAME, the host controller can choose any unused implemented Standard hero for each controlled seat during the existing hero-selection stage. Choices use the existing server-authorized `choose_hero` flow; duplicate heroes remain rejected. Unmarked Quick Test and ordinary multiplayer keep their existing role-specific candidate pools. No migration or gameplay-rule change.

Focused validation: `npm run build`; `GAME_TEST_FILES=tests/api/lobby-heroes-wei.test.mjs node tests/run-tests.mjs` (23/23); `git diff --check`. Scoped ESLint was attempted but the local Node process exhausted its heap; this is not a passing lint result.

Exact-SHA Actions run `38128467454` for `9f4b93c7ec90dad316c0c66f0d254ec254181bea`: **success** (Lint/fast, API, browser smoke, deploy, production smoke). Production `/api/health` returned `{"ok":true,"worker":"available"}`. Local focused API file passed 23/23; `npm run build` and `git diff --check` passed. Scoped ESLint was attempted locally but Node exhausted its heap; the Actions lint job passed.

## Design checkpoint

Latest remote `docs/UX2-refine.md` blob: `d966440b487bcbe172d5ea608704cc6945dfe6df` (reviewed; not changed for this testing-infrastructure task).

## Current task

`WTK-TEST-ROOM-HERO-SELECTION-01` — implementation, validation, push and deployment checks are complete. Stop for user review; do not start adjacent work without authorization.
