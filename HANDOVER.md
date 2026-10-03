# WTK UX V2 — Current Task Handoff

## REMOTE HANDOVER RULE
HANDOVER.md is tracked remote coordination state. Commit and push it to origin/ux-v2. After implementation append the result, push implementation and HANDOVER, fetch origin, verify remote HANDOVER contains the result, then STOP.

**CLEANLINESS:** keep only this current task. Read docs/PLANNER_DEVELOPMENT_WORKFLOW.md.

# NEXT TASK — UX2.0UI-03: Add the First Read-Only Interaction Stage Semantic Consumer

## Objective
UI-02 is accepted. Add the first dedicated Interaction Stage semantic consumer driven only by PresentationClientView, while keeping the existing board layout, controls, target selection, animation path, and local dock unchanged.

This is a bounded semantic rendering slice, not the full visual redesign.

## Baseline
Use commit 9671633cbd2708ba0d3208bc0611650db267f063 as accepted:
- active interaction decision/status ownership now comes from PresentationClientView;
- REST keeps turn/status compatibility;
- public owner is viewer-equal;
- local YOU marker comes from adapter entitlement;
- controls and animation still use their existing paths.

Do not reopen C1-C7, UI-01, or UI-02.

## Step 1 — define a pure InteractionStageView
Create a pure client semantic view/helper outside page.tsx, built only from PresentationClientView plus a player-name lookup/display resolver.

Minimum semantic output:
- visible/hidden;
- interactionId/checkpointId/revision;
- stage label;
- source display identity;
- original target identities;
- active target identities;
- current participant identity;
- decision actor identity;
- active resolver identity;
- continuity relation and parent frame reference;
- stable boundary kind;
- viewer-local decision marker.

IDs must be selected from PresentationClientView before resolving names. Missing names must degrade to safe neutral labels, never change authority.

Do not include cards, legal options, buttons, timers, animation events, Pending payloads, or CurrentAction payloads.

## Step 2 — add a minimal dedicated semantic component
Add a small read-only Interaction Stage component to the existing play-table using the new view.

Requirements:
- render only when hasInteraction is true;
- expose source, current participant/target context, and decision owner;
- preserve decisionActorId != activeResolverId;
- distinguish child-frame continuity semantically;
- local marker may show viewer responsibility, but no action control belongs here yet.

Keep markup intentionally minimal and use existing styling primitives where possible. Do not restructure seats/table/dock.

## Step 3 — no legacy fallback
The component/helper must not accept or inspect:
- room.pending*;
- timeline;
- presentationV2;
- currentAction;
- phase/actionPlayerId/actionReason;
- hero/card names as authority.

If PresentationClientView has no interaction, render nothing. Do not reconstruct an Interaction Stage from compatibility data.

## Step 4 — tests
Add focused helper/render tests for:
1. target-owned Attack/Dodge;
2. source-owned Ma Chao where decision actor != resolver;
3. Group/AOE participant context;
4. child Damage frame continuity;
5. Dying rescue handoff;
6. acting vs uninvolved viewers: identical public stage content, only local marker differs;
7. missing player-name lookup safe fallback;
8. REST renders no Interaction Stage;
9. changing Pending/timeline/presentationV2/currentAction/phase/actionReason with fixed PresentationClientView cannot change Interaction Stage output.

Use typed synthetic PresentationClientView data for client transformation tests; do not claim new server semantics from them.

## Step 5 — preserve existing behavior
Do not migrate/remove the existing action strip in this task. It remains alongside the new semantic component.

Verify no changes to:
- action buttons/legal actions;
- card selection;
- target selection;
- dialogs;
- timers;
- sequence/resolution animation;
- seat positions;
- local player dock;
- gameplay submissions.

## Step 6 — documentation
Update docs/UX_V2_INTERACTION_STAGE_DESIGN.md and README:
- UI-03 introduces the first dedicated read-only Interaction Stage semantic consumer;
- it is snapshot/adapter driven;
- it is not yet the final visual design;
- controls, target selection, animation, settlement/transitions, and seat/dock redesign remain future slices.

## Validation
Run focused Interaction Stage/helper/render tests plus adapter/status tests, then:
- npm run test:fast
- npm run test:api
- npm run build
- npm run lint
- git diff --check
Report exact counts.

## Scope exclusions
No gameplay/server/projector/snapshot changes; no CSS overhaul; no seat topology redesign; no local dock redesign; no target/control migration; no animation rewrite; no settlement/transition protocol; no compatibility-field removal; no CurrentAction public authority; no unrelated refactor.

## Execution result
Append only UI-03 result: implementation SHA, files, helper/component API, rendered semantic fields, authority inputs, fixture/test coverage, viewer-equality/private-marker evidence, legacy-independence proof, scope confirmation, validation counts, and next recommended bounded UI slice. Push and verify remote HANDOVER, then STOP.

## Acceptance
Pass only if a dedicated read-only Interaction Stage renders active semantic context solely from PresentationClientView; REST renders none; public content is viewer-equal; source-owned and child-frame distinctions survive; no legacy fallback exists; and gameplay/controls/animation/layout remain unchanged.
