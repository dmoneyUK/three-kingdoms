# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

This file contains only the current execution handoff. Product design is in `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`; execution rules are in `AGENTS.md` and `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`; history is in `docs/AUTONOMOUS_UI_ROADMAP.md`.

## Latest delivery / CI checkpoint — UX2.2-CI-RECOVERY-01

The CI repair commit `8892dff` was validated by Actions run `37305536459`: lint/build passed, but browser tests ended **415 passed / 14 failed**, so `npm test` was skipped. All 14 failures were older VIS-02/03 assertions that expected a Meta region for Interaction/Negation despite the current Hero/Reaction composition already presenting the relevant facts. The earlier run `37302933217` on `4f50311` was cancelled at browser test `[358/429]` after emitting 19 failures. No gameplay or production UI code changed.

Focused validation passed: CI-failure regressions 41/41; short-portrait Top Row containment matrix 20/20; VIS-02/03 Stage geometry cases 21/21; targeted `npx eslint tests/browser/ui19.spec.mjs` and `git diff --check` passed. Repository ESLint configuration ignores `tests/browser/fixture.jsx`. No full local suite/build/lint was run. A second assertion-only repair is local and awaits CI.

## Design checkpoint

Reviewed remote design blob `45430bc62b7c50bcbeef40724408ead94ad27120` at `origin/ux-v2` commit `31df760adfb72328a3a65be38baa0443df454cc8`; it matches the previously recorded design revision. No new product-design slice is authorized until this CI recovery task is closed and the latest workflow/design documents are re-read before planning.

## Current task — UX2.2-CI-RECOVERY-01

Status: **SECOND ASSERTION FIX IMPLEMENTED LOCALLY — READY TO COMMIT/PUSH**.

Bounded scope: finish correcting only the UI-19 tests that still assume an Interaction Stage Meta region is always mounted. Preserve geometry checks for mounted regions and all VIS-12N screenshot/geometry work. Do not change production UI, game logic, or protocol, and do not begin another UX feature while CI is unresolved.

Acceptance: Commit and push the assertion-only correction; inspect the new Actions run and repair any additional observed failures until a completed successful CI run is recorded. Then re-read the current workflow and remote design document before planning the next bounded task. No gameplay or protocol changes.

Resume point: Actions run `37305536459` failed only the 14 VIS-02/03 Meta-region assertions. The local correction passed 21/21 targeted browser tests and targeted ESLint/diff-check; review it with the existing CI-fix diff, commit/push, then await CI.
