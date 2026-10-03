# WTK UX V2 — Current Task Handoff

## REMOTE HANDOVER RULE
HANDOVER.md is tracked remote coordination state. Commit and push it to origin/ux-v2. After implementation append the result, push implementation and HANDOVER, fetch origin, verify origin/ux-v2:HANDOVER.md contains the result, then STOP.

**CLEANLINESS:** keep only this current task. Read docs/PLANNER_DEVELOPMENT_WORKFLOW.md.

# NEXT TASK — UX2.0UI-07: Local Target Selection Confirm / Cancel Semantics

## Objective
UI-06 is accepted and closed. Migrate the existing local, unsubmitted target-selection experience toward the UX V2 rule: selection is explicitly local and amber, and submission occurs only through clear Confirm / Cancel semantics where the existing gameplay flow already supports deferred target selection.

This is a client interaction/presentation migration over existing legal actions. Do not change server legality, card rules, target counts, or action payload semantics.

## Accepted baseline
Use commit 197bccef17de6ac68f965eef6c86589154c20720:
- Interaction Stage + Hero Focus are read-only semantic consumers;
- public semantic target/current focus is red/cyan/source context;
- local unsubmitted target selection is separate from public semantic roles;
- Hero Focus does not become a control surface.

Do not reopen C1-C7 or UI-01..06.

## Step 1 — inventory every local target-selection path
Before editing, enumerate actual production paths that set targetIds/setTarget or equivalent, including:
- normal card targeting;
- multi-target cards/effects;
- active hero skill target selection;
- trigger/response target selection;
- Serpent/equipment-related selection if applicable;
- Borrowed Sword or other special target flows if applicable.

For each path record:
- authority that determines eligible targets;
- min/max/exact target count;
- whether selection is currently submitted immediately or deferred;
- existing submit action/payload;
- existing cancel/reset path.

Do not generalize across paths unless code proves they share semantics.

## Step 2 — define a pure local selection display model
Create a pure helper for presentation of local selection state. It may consume only already-computed local selection facts/constraints from existing client gameplay logic; it must not recompute legality from public PresentationSnapshot.

Required display facts:
- selectionActive;
- selected target IDs in user selection order;
- minimum/maximum or exact count only when existing gameplay logic already proves it;
- canConfirm based on existing proven local constraints;
- canCancel when unsubmitted local state exists;
- concise instruction text.

This helper is local/private UI state, NOT public Interaction Stage authority.

## Step 3 — explicit Confirm / Cancel for deferred selections
For selection paths that already defer submission:
- clicking eligible seats toggles/updates amber local selection only;
- do not submit the action from seat click;
- render clear Confirm and Cancel controls in the existing local command/guidance area;
- Confirm invokes the existing submit action with the existing payload and selected target order;
- Cancel clears only local unsubmitted selection and must not send decline/skip/gameplay actions.

Do not convert a server-authoritative decline into Cancel. Skip/Decline remains a distinct authoritative action.

If any existing path intentionally submits immediately and cannot safely be migrated without gameplay-semantic changes, leave it unchanged and document it as a GAP for a later bounded task rather than inventing behavior.

## Step 4 — preserve semantic separation
- amber = local unsubmitted selection;
- red = public active/current affected target;
- cyan = public decision actor;
- gray = defeated;
- public Interaction Stage/Hero Focus must not change merely because the user locally selects/deselects an unsubmitted target;
- local selection must not create public semantic seat roles.

## Step 5 — selection order
Where existing gameplay payload semantics preserve target order, keep selected target IDs in click order and Confirm must submit that exact order.

Where order is not semantically meaningful, do not claim an effect order.

Do not infer effect resolution order from public target arrays.

## Step 6 — tests
Add focused tests for each migrated deferred path and at minimum:
1. selecting an eligible target adds amber local state but sends no action;
2. deselecting before Confirm sends no action;
3. Cancel clears local selection and sends no gameplay/decline action;
4. Confirm disabled until existing minimum/exact constraint is satisfied;
5. Confirm submits exactly once with existing action name/payload;
6. ordered multi-target path preserves selected order if payload semantics require it;
7. public semantic active-target/current-target classes remain independent from amber selection;
8. local selection changes do not change InteractionStageView/HeroFocusView/public seat roles;
9. defeated/ineligible target remains unselectable under existing legality;
10. response/trigger decline remains separate from local Cancel;
11. REST/public presentation absence does not break local turn target selection;
12. mobile/desktop render contains one clear Confirm and Cancel surface for the active deferred selection, not duplicate controls.

Retain UI-01..06 semantic tests.

## Step 7 — bounded UX/CSS
Use the existing local guidance/action area. Do not create a floating modal over the board unless an existing flow already uses one.

Make selected count/instruction readable and keep amber selection visually distinct from red public target state.

Verify <=650px and <=480px without changing seat topology or local dock composition.

## Step 8 — documentation
Update README and docs/UX_V2_INTERACTION_STAGE_DESIGN.md with:
- local unsubmitted selection is private amber state;
- Confirm is the submission boundary;
- Cancel clears local state only;
- Skip/Decline is authoritative and distinct;
- list any immediate-submit path intentionally left for later.

## Validation
Run focused target-selection tests plus retained UI-01..06 tests, then npm run test:fast, npm run test:api, npm run build, npm run lint, and git diff --check. Report exact counts.

## Scope exclusions
No server/projector/snapshot/game-rule changes; no legality rewrite; no target-count changes; no new action payloads; no public authority derived from local selection; no Hero Focus controls; no seat topology/local dock redesign; no animation/settlement/transition work; no unrelated refactor.

## Execution result
Append only UI-07 result: SHA, files, complete target-path inventory, which deferred paths were migrated, any truthful GAPs, local selection model API, Confirm/Cancel behavior, selection-order evidence, semantic-separation evidence, responsive evidence, tests and validation counts, and next bounded recommendation. Push and verify remote HANDOVER, then STOP.

## Acceptance
Pass only if migrated deferred target selections remain local until explicit Confirm; Cancel sends no authoritative action; existing legality/payload semantics are unchanged; ordered payloads preserve proven selection order; public semantic presentation remains independent; and any unsafe immediate-submit path is left unchanged and reported rather than guessed.
