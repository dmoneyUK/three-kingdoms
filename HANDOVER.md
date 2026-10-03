# WTK UX V2 — Current Task Handoff

## REMOTE HANDOVER RULE
HANDOVER.md is tracked remote coordination state. Commit and push it to origin/ux-v2. After implementation append the result, push implementation and HANDOVER, fetch origin, verify remote HANDOVER contains the result, then STOP.

**CLEANLINESS:** keep only this current task. Read docs/PLANNER_DEVELOPMENT_WORKFLOW.md.

# NEXT TASK — UX2.0UI-02: Migrate Existing Decision Status to PresentationClientView

## Objective
UI-01 is accepted. Make the first real React consumer use PresentationClientView for public interaction and decision semantics while preserving the current layout and gameplay controls. Migrate the existing action/status strip semantically; do not redesign it.

## Baseline
Use commit 6ec79dad38017ab559c145456a2d7fc6870c19ee. The typed pure adapter is accepted. REST fails closed. Legacy Pending/timeline/presentationV2 remain compatibility paths. Do not reopen C1-C7 or UI-01.

## Work
1. Inventory buildDecisionPresentation and every action-strip value. Classify old sources as turn/status compatibility, public interaction semantics, viewer-private control, or display label.

2. Extract a pure decision-status view model/helper. During an active PresentationClientView interaction, choose stage/source/current participant/decision actor/active resolver and local-control state only from the adapter. Resolve selected IDs to player names afterward as display decoration.

3. Do not inspect Pending, timeline, presentationV2, hero/card names, actionReason, phase, or CurrentAction to determine active-interaction ownership.

4. For identity-free REST/no interaction, preserve existing turn/status compatibility behavior. The snapshot does not yet own ordinary turn-phase status.

5. Preserve the existing action-strip DOM/classes and CSS. No Interaction Stage redesign, new highlights, animations, seat movement, or dock changes.

6. Public decision owner must remain viewer-equal. The existing YOU/local marker may differ by viewer and must come only from adapter local entitlement. Never substitute activeResolverId for decisionActorId. In the Ma Chao source-owned shape, source is decision owner while target remains resolver.

## Tests
Add focused pure/render coverage for:
- normal target-owned Attack/Dodge CHOICE;
- source-owned Ma Chao decisionActorId != activeResolverId;
- acting and uninvolved viewers see identical public ownership while only local marker differs;
- child-frame interaction;
- REST retains existing turn/status compatibility;
- missing player lookup fails safely;
- changing Pending/timeline/presentationV2/actionReason with fixed PresentationClientView cannot change active-interaction ownership.

Keep UI-01 adapter tests.

## Regression boundary
No action buttons, legal actions, target selection, dialogs, timers, animation queues, sequence presentation, or gameplay submissions may be migrated to PresentationClientView in this slice.

## Documentation
Update docs/UX_V2_INTERACTION_STAGE_DESIGN.md and README: UI-02 is the first semantic React consumer; active interaction ownership/status uses PresentationClientView; REST turn/phase remains compatibility-driven; controls/animation remain on existing paths; visual Interaction Stage redesign has not started.

## Validation
Run focused decision-status/render and adapter tests, then npm run test:fast, npm run test:api, npm run build, npm run lint, and git diff --check. Report exact counts.

## Scope exclusions
No gameplay/server/projector/snapshot changes, CSS/layout redesign, seat/dock changes, target/control migration, animation rewrite, settlement/transition protocol, compatibility-field removal, CurrentAction public authority, or unrelated refactor.

## Execution result
Append only UI-02 result: SHA, files, old/new authority inventory, helper API, migrated fields, REST fallback, viewer equality/private marker evidence, Ma Chao evidence, legacy-independence evidence, scope confirmation, validation counts, and next bounded UI recommendation. Push and verify remote HANDOVER, then STOP.

## Acceptance
Pass only if the existing status strip uses PresentationClientView for active interaction semantics; public ownership is viewer-equal and never reconstructed from legacy fields; private YOU indication comes only from local entitlement; REST keeps compatibility turn/status behavior; visuals and gameplay controls are unchanged; and tests prove the boundary.

## Execution result — UX2.0UI-02

- Implementation SHA: `9671633` (`feat(ux-v2): migrate decision status to presentation view`).
- Files changed: `game/presentation-client.ts`, `app/page.tsx`, `tests/presentation-client.test.mjs`, `tests/room-safety-render.test.mjs`, `README.md`, and `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`.
- Authority inventory: `PresentationClientView` now owns active proven interaction `stage`, `sourceId`, `currentParticipantId`, `decisionActorId`, `activeResolverId`, stable boundary, and local entitlement. Player names are resolved only after the selected IDs. `turnSeat`/`phase` remain compatibility display values; `Pending`, timeline, `presentationV2`, `actionReason`, and `CurrentAction` remain outside active-interaction ownership for legacy controls and animation paths.
- Helper API: `buildPresentationDecisionStatus(view)` is a pure semantic slice that derives the active CHOICE decision marker, public role IDs, and local decision entitlement without reconstructing authority from room compatibility fields.
- Migrated fields: the existing action/status strip's active decision owner, stage/status copy, current participant decoration, public interaction metadata, and local `YOU` marker now consume the adapter. Existing DOM/classes/CSS are unchanged.
- REST fallback: identity-free REST/no-interaction continues to use the previous turn/action status compatibility behavior, including safe missing-player fallbacks.
- Viewer equality/private marker: tests cover target-owned and source-owned decisions from acting and uninvolved viewers; public `decisionActorId`/action owner is identical while only adapter local entitlement changes `YOU`.
- Ma Chao/source-owned evidence: the semantic fixture preserves `decisionActorId=source` while `activeResolverId=target`; the existing `tests/api/ma-chao.test.mjs` source-owned Cavalry coverage remains green, and the UI path never substitutes the resolver for the decision actor.
- Legacy independence: with a fixed adapter view, mutating `actionPlayerId`, `actionReason`, `CurrentAction`, `Pending`, timeline, and `presentationV2` leaves active decision ownership/status unchanged. Child-frame continuity remains covered by the retained UI-01 adapter tests.
- Scope confirmation: no gameplay/server/projector/snapshot changes, CSS/layout redesign, seat/dock changes, target/control migration, animation rewrite, settlement/transition protocol, compatibility-field removal, or provider-specific route/UI was added.
- Validation: focused adapter/decision-status/render tests `23/23`; `npm run test:fast` `140/140`; `npm run test:api` `239/239`; `npm run build` passed; `npm run lint` passed; `git diff --check` passed.
- Next bounded UI recommendation: migrate one separately reviewed non-visual Interaction Stage status consumer, keeping controls, target selection, animation, and settlement/transition presentation on their current paths until their own handoff is authorized.
