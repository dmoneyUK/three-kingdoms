# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

This file contains only the current execution handoff. Product design is in `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`; execution rules are in `AGENTS.md` and `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`; history is in `docs/AUTONOMOUS_UI_ROADMAP.md`.

## Latest delivery / CI checkpoint — UX2.2-CI-REPAIR-01

Implementation pushed as `b91cbc5`. Actions run `37301912137` was **in progress** when checked; no green result is claimed. The repair compacts proven short Top Row Current Effect/Focus composition, removes only already-visible identity/viewer-decision duplication, keeps open Negation guidance in the neutral Reaction Chain, preserves local-Hero-in-Dock ownership, and replaces stale Inspect source-shape assertions with behavior coverage. No Reviewer acceptance, deployment, or production state is implied.

Focused validation passed: short-portrait UI-19 matrix 20/20; Current Effect + Inspect browser suites 14/14; seat Hero-info behavior 1/1; `node --import tsx --test tests/room-safety-render.test.mjs` 19/19; targeted ESLint and `git diff --check`. No full local test/build/lint suite was run.

## Design checkpoint

Reviewed remote design blob `45430bc62b7c50bcbeef40724408ead94ad27120` at `origin/ux-v2` commit `b91cbc5aaa5ceb130eb65534e5ddabad3ef66ac4`; it matches the previously recorded design revision. The next slice follows §§0.77, 0.89–0.90, 2.7, and 12.7: private Guidance at the Dock top edge below the Stage; Hand/operational regions retain their fixed composition; bottom actions remain separate and reachable.

## Current task — UX2.2-DOCK-GUIDANCE-TOP-01

Status: **IMPLEMENTED LOCALLY — READY FOR PUSH CI CHECKPOINT**.

Bounded scope: move the existing private Local Dock Guidance Strip from below the Hand to a full-width top row directly below the Interaction Stage. Preserve the Hero/Skills/Equipment band, single-layer Hand, fixed bottom Action Row, guidance privacy, and current control semantics. Update contradictory browser geometry assertions and prove the strip/selected-card/action boundaries at representative phone and wide viewports. No legality, server/protocol, or gameplay changes.

Acceptance met: Guidance is above Hero/Skills/Equipment and Hand, appears first in Dock DOM order, remains below the Stage, is not covered by a raised/selected Hand card, and stays separated from bottom actions. Existing thumb-zone, button-order, and no-horizontal-overflow assertions continue to pass.

Focused validation: `npm run test:browser -- tests/browser/ui19.spec.mjs --grep 'VIS-12K|VIS-06A|VIS-06B'` passed 12/12; `npx eslint app/page.tsx tests/browser/ui19.spec.mjs` and `git diff --check` passed. No full local suite/build/lint was run. Roadmap updated; the current implementation has not yet been pushed.

Resume point: inspect the final scoped diff, commit/push this task, then record the exact Actions result. If the run fails, repair that observed failure before planning another feature edit.
