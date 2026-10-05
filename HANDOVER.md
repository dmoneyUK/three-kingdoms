# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

This file contains only the current execution handoff. Product design is in `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`; execution rules are in `AGENTS.md` and `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`; history is in `docs/AUTONOMOUS_UI_ROADMAP.md`.

## Latest delivery / CI checkpoint — UX2.2-CI-RECOVERY-01

The CI repair is pushed as `8892dff`. Actions run `37305536459` is **in progress**; no green result is claimed yet. It validates the Dying-fixture semantic separation and the corrected browser assertions. The prior run `37302933217` on `4f50311` was cancelled at browser test `[358/429]` after emitting 19 numbered failures; lint/build had succeeded and `npm test` was skipped. The short-Stage overflow fix remains in `b91cbc5`. No gameplay or production UI code changed.

Focused validation passed: CI-failure regressions 41/41; short-portrait Top Row containment matrix 20/20; `npx eslint tests/browser/ui19.spec.mjs` and `git diff --check` passed. Repository ESLint configuration ignores `tests/browser/fixture.jsx`. No full local suite/build/lint was run. Actions run `37305536459` is validating the repair.

## Design checkpoint

Reviewed remote design blob `45430bc62b7c50bcbeef40724408ead94ad27120` at `origin/ux-v2` commit `4f503116ffe9964c5970ff49e79d0c4e2882f6aa`; it matches the previously recorded design revision. No new product-design slice is authorized until this CI recovery task is closed and the latest workflow/design documents are re-read before planning.

## Current task — UX2.2-CI-RECOVERY-01

Status: **PUSHED — WAIT FOR CI RUN `37305536459`**.

Bounded scope: correct the Dying browser fixture's separation of public subject versus rescue actor, and align only the CI-failing UI-19 assertions with the current design's identity deduplication and Negation title. Preserve the remaining VIS-12N screenshot/geometry work. Do not change production UI, game logic, or protocol, and do not begin another UX feature while CI is unresolved.

Acceptance: Inspect run `37305536459` and repair any additional observed failures until a completed successful CI run is recorded. Then re-read the current workflow and remote design document before planning the next bounded task. No gameplay or protocol changes.

Resume point: repair commit `8892dff` is on `origin/ux-v2`; run `37305536459` is in progress. Check its conclusion and logs before planning or editing another task.
