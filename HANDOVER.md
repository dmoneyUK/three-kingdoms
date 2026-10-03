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

## Execution result — UX2.0UI-03

- Implementation SHA: `c078952bd604131087dc0e186342bcc09b52dfb0` (`feat(ux-v2): add read-only interaction stage consumer`).
- Files changed: `game/presentation-client.ts`, `app/page.tsx`, `app/globals.css`, `tests/presentation-client.test.mjs`, `tests/room-safety-render.test.mjs`, `README.md`, and `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`.
- Helper/component API: `buildInteractionStageView(view, resolvePlayerName)` is pure and accepts only `PresentationClientView` plus a display-name resolver; `InteractionStage` renders that view read-only and returns nothing when `visible` is false.
- Rendered semantic fields: active interaction/checkpoint/revision data attributes; stage label; source; original and active targets; current participant; decision owner; active resolver; stable boundary; viewer-local decision marker; continuity relation; and parent frame reference.
- Authority inputs: all semantic IDs and continuity come from `PresentationClientView`; names are resolved only after ID selection. Missing names use neutral labels without changing IDs. No cards, legal options, buttons, timers, Pending, CurrentAction, timeline, presentationV2, phase, actionPlayerId, or actionReason are accepted by the helper/component.
- Fixture/test coverage: target-owned Attack/Dodge, source-owned Ma Chao decision versus resolver, Group/AOE participant context, child Damage frame, Dying rescue handoff, full component render assertions, REST hidden state, missing-name safety, and legacy-field independence are covered. Existing UI-01/UI-02 tests remain green.
- Viewer equality/private marker: acting and uninvolved viewers receive identical public stage IDs/names/continuity; only adapter entitlement can render `YOUR DECISION`.
- Legacy independence: fixed `PresentationClientView` output remains identical while Pending, timeline, presentationV2, CurrentAction, phase, actionPlayerId, and actionReason fixtures change. The component has no legacy fallback path.
- Scope confirmation: no gameplay/server/projector/snapshot changes, CSS overhaul, seat topology, local dock, target/control, dialog, timer, animation, settlement/transition protocol, compatibility-field removal, or CurrentAction public authority was added. The panel is a bounded read-only overlay using existing table primitives.
- Validation: focused adapter/Interaction Stage/render tests `29/29`; `npm run test:fast` `146/146`; `npm run test:api` `239/239`; `npm test` passed (`build` + `146/146` Fast + `239/239` API); `npm run lint` passed; `git diff --check` passed.
- Next bounded UI recommendation: review one responsive/readability slice for this semantic panel, keeping controls, target selection, animation, settlement/transition presentation, seats, and dock unchanged until separately authorized.
