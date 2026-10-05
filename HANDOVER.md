# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

This file contains only the current execution handoff. Product design is in `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`; execution rules are in `AGENTS.md` and `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`; history is in `docs/AUTONOMOUS_UI_ROADMAP.md`.

## Latest delivery / CI checkpoint — UX2.2-CI-RECOVERY-01

Latest implementation is pushed as `4f50311`. Actions run `37302933217` was **cancelled** at browser test `[358/429]`; it emitted 19 numbered failures before cancellation, so it is not a pass. Lint and build succeeded; `npm test` was skipped. The failures group into a Dying fixture that conflated `currentParticipantId` with the rescue `decisionActorId`, plus stale assertions for deduplicated role metadata and the player-facing Negation title. The short-Stage overflow fix remains in `b91cbc5`. The current local repair is limited to browser fixture/tests; no gameplay or production UI code changed.

Focused validation passed: CI-failure regressions 41/41; short-portrait Top Row containment matrix 20/20; `npx eslint tests/browser/ui19.spec.mjs` and `git diff --check` passed. Repository ESLint configuration ignores `tests/browser/fixture.jsx`. No full local suite/build/lint was run. CI for the local repair is pending push.

## Design checkpoint

Reviewed remote design blob `45430bc62b7c50bcbeef40724408ead94ad27120` at `origin/ux-v2` commit `4f503116ffe9964c5970ff49e79d0c4e2882f6aa`; it matches the previously recorded design revision. No new product-design slice is authorized until this CI recovery task is closed and the latest workflow/design documents are re-read before planning.

## Current task — UX2.2-CI-RECOVERY-01

Status: **FOCUSED REPAIR IMPLEMENTED LOCALLY — READY TO COMMIT/PUSH FOR CI**.

Bounded scope: correct the Dying browser fixture's separation of public subject versus rescue actor, and align only the CI-failing UI-19 assertions with the current design's identity deduplication and Negation title. Preserve the remaining VIS-12N screenshot/geometry work. Do not change production UI, game logic, or protocol, and do not begin another UX feature while CI is unresolved.

Acceptance: Commit and push the scoped fixture/test correction; inspect the new Actions run and repair any additional observed failures until a completed successful CI run is recorded. Then re-read the current workflow and remote design document before planning the next bounded task. No gameplay or protocol changes.

Resume point: focused regressions pass locally. Review the final diff (including the roadmap note), commit only `HANDOVER.md`, `docs/AUTONOMOUS_UI_ROADMAP.md`, `tests/browser/fixture.jsx`, and `tests/browser/ui19.spec.mjs`, then push `ux-v2` to trigger CI.
