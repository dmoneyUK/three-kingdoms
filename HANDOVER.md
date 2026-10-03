# WTK UX V2 — Current Task Handoff

## REMOTE HANDOVER RULE
HANDOVER.md is tracked remote coordination state. Commit and push it to origin/ux-v2. After implementation append the result, push implementation and HANDOVER, fetch origin, verify origin/ux-v2:HANDOVER.md contains the result, then STOP.

**CLEANLINESS:** keep only this current task. Read docs/PLANNER_DEVELOPMENT_WORKFLOW.md.

# NEXT TASK — UX2.0UI-07-FIX1: Cancel Must Clear the Complete Deferred Local Selection

## Objective
UI-07 is partially accepted. The new local target-selection view and explicit Confirm boundary are directionally correct, but Cancel currently clears only target IDs for several composite deferred flows. That can leave selected cost cards/provider/mode active, so Cancel does not yet mean “cancel the unsubmitted local selection”.

Fix the Cancel semantics without changing server actions, legality, payloads, or public presentation.

Use implementation commit e062f5f9802b8ed33a526bb67dc4a99d86ba7eab.

## Reviewer finding
Current cancelLocalTargetSelection:
- clears targetIds;
- clears activeSkillSelectionState.targetIds when current;
- does NOT generally clear other local state participating in the same deferred selection.

Examples that must be audited:
- Serpent Spear can retain serpentSelected cost cards and serpentMode;
- active skill card-plus-target can retain selected cardIds/provider state;
- trigger card-plus-target can retain triggerSelectedKeys/selected provider state;
- normal selected card/mode may remain active after target Cancel.

A UX “Cancel” control must have a truthful bounded meaning. It must either clear the complete unsubmitted selection for that flow, or be explicitly named/defined as target-only. The accepted UX V2 intent is complete local selection cancellation where this shared Cancel is shown.

## Step 1 — inventory Cancel state per migrated path
For every UI-07 migrated deferred path, enumerate all local state that forms the pending selection:
- selected hand/card ID or conversion mode;
- targetIds / activeSkill targetIds;
- activeSkill cardIds/effect revision;
- responseProviderId;
- triggerSelectedKeys / Serpent selected cards;
- serpentMode;
- any other local-only selection state.

Identify which state is flow identity versus selected input. Do not clear server-owned state.

## Step 2 — implement flow-aware local Cancel
Replace the target-only shared cancel behavior with flow-aware cancellation.

Required semantics:
- normal card target flow: clear the selected card/conversion selection and target IDs as appropriate so no stale pending selection remains;
- Serpent Spear: clear target IDs, selected two-card cost, and exit/cancel the local Serpent selection mode;
- active skill target/card+target: clear the active local skill selection state for that unsubmitted attempt, including selected card/target IDs, without sending a trigger action;
- trigger/response target/card+target: clear the local provider/input selection needed to return to the pre-selection state; do not call decline_trigger/decline_response;
- preserve any state proven to be unrelated to the active selection.

If an existing provider-toggle Cancel already owns complete cancellation for a path, avoid creating conflicting duplicate Cancel semantics.

## Step 3 — one clear Cancel surface
For an active deferred selection, render one clear local Cancel action for that flow. Avoid simultaneous provider “Cancel X” plus generic “Cancel” controls that perform materially different partial resets.

Skip/Decline remains separate and authoritative.

## Step 4 — semantic separation
Cancel must not mutate PresentationSnapshot, InteractionStageView, HeroFocusView, or semantic seat-role inputs. It only clears local unsubmitted state.

## Step 5 — tests
Add mounted regressions proving:
1. normal card target Cancel returns to no selected card/no selected target and sends zero actions;
2. converted Attack mode Cancel clears conversion selection plus targets where applicable;
3. Halberd multi-target Cancel clears card + all ordered targets and sends zero actions;
4. Serpent Spear Cancel clears mode, both selected cost cards, and target, sends zero actions;
5. active skill card+target Cancel clears the complete local active-skill attempt and sends zero actions;
6. active skill target-only Cancel clears the complete attempt;
7. trigger card+target Cancel clears provider/card/target local state and sends no decline;
8. trigger target-only Cancel clears provider/target local state and sends no decline;
9. after Cancel, the user can start the same flow again cleanly;
10. Skip/Decline remains visible/functional where authoritative and is not invoked by Cancel;
11. public semantic rendering is unchanged before/after local Cancel;
12. only one local Cancel affordance exists for each active deferred flow.

Retain the ordered Confirm regression and all UI-01..07 tests.

## Step 6 — docs
Correct README/docs wording so “Cancel clears local selection” means the complete active unsubmitted selection, not merely targetIds. Keep the explicit Borrowed Sword immediate-action and opaque picker GAPs truthful.

## Validation
Run focused UI-07/FIX1 mounted tests plus retained semantic tests, then npm run test:fast, npm run test:api, npm run build, npm run lint, and git diff --check. Report exact counts.

## Scope exclusions
No server/projector/snapshot/game-rule/legality changes; no new action payloads; no conversion of Skip/Decline; no Borrowed Sword immediate-flow migration; no opaque target-card picker migration; no board/dock/Hero Focus redesign; no animation/settlement work; no unrelated refactor.

## Execution result
Append only FIX1 result: SHA, files, per-flow Cancel state inventory, flow-aware reset behavior, one-Cancel proof, zero-authoritative-action proof, restart-after-cancel evidence, semantic independence, retained GAPs, validation counts, and closure recommendation. Push and verify remote HANDOVER, then STOP.

## Acceptance
Pass only if every migrated deferred flow’s displayed Cancel returns that flow to a clean pre-selection local state, sends no gameplay/decline action, leaves public presentation unchanged, preserves authoritative Skip/Decline, and avoids conflicting duplicate Cancel affordances.
