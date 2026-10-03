# WTK UX V2 — Current Task Handoff

## REMOTE HANDOVER RULE
HANDOVER.md is tracked remote coordination state. Commit and push it to origin/ux-v2. After implementation append the result, push implementation and HANDOVER, fetch origin, verify remote HANDOVER contains the result, then STOP.

**CLEANLINESS:** keep only this current task. Read docs/PLANNER_DEVELOPMENT_WORKFLOW.md.

# NEXT TASK — UX2.0UI-05: Semantic Seat Highlight Projection

## Objective
UI-04 is accepted and closed. Add the first board-level semantic highlighting: existing player seats may visually reflect accepted Interaction Stage roles, but seat topology, gameplay targeting, click behavior, and local dock must remain unchanged.

This task is presentation-only. Do not turn semantic highlights into target-selection controls.

## Accepted baseline
Use commit a7991aa88b4344cbb651aa10f8b2e6133e587b97:
- Interaction Stage focus hierarchy is accepted;
- no ordinal target progress is inferred;
- PresentationClientView / InteractionStageView remain the only new public semantic authority;
- existing gameplay controls and legacy animation paths remain intact.

Do not reopen C1-C7 or UI-01..04.

## Step 1 — inventory current seat rendering
Inspect the exact seat/player-card render path and existing turn/selection/defeated/highlight classes.

Record which current classes mean gameplay selection, current turn, animation, defeated state, or other legacy presentation. Do not overload an existing gameplay-selection class with new semantic meaning.

## Step 2 — pure seat semantic projection
Create a pure helper derived only from InteractionStageView/PresentationClientView plus playerId.

Return explicit semantic booleans/role(s), at minimum:
- isInteractionSource;
- isOriginalTarget;
- isActiveTarget;
- isCurrentParticipant;
- isDecisionActor;
- isActiveResolver;
- isViewerDecisionActor only where the local viewer marker is needed.

No Pending/timeline/presentationV2/CurrentAction/phase/actionReason/card/hero-name authority.

A player may hold multiple roles simultaneously. Do not collapse roles into a single winner if that loses truth.

REST/no interaction returns no interaction roles.

## Step 3 — map roles to non-interactive seat classes
Add dedicated presentation classes/data attributes to existing seats. Keep semantic priority visually understandable:
- decision actor: cyan semantic emphasis;
- current affected participant/active target: red semantic emphasis;
- source: restrained source emphasis;
- local unsubmitted target selection remains amber and must stay distinct;
- defeated remains gray;
- existing turn indication remains separate.

Do not change DOM ordering, seat coordinates, seat count/topology, pointer behavior, click handlers, disabled state, target legality, or selection state.

If multiple semantic roles overlap, define deterministic CSS composition without hiding important local selection/defeated state.

## Step 4 — viewer equality
Public seat-role projection must be identical for all viewers given the same public snapshot. Only the local viewer-decision marker may differ.

Do not use localControl to decide public source/target/decision/resolver highlighting.

## Step 5 — tests
Add focused helper/render tests for:
1. ordinary Attack source + target-owned decision;
2. Ma Chao source-owned decision where source is decision actor and target is resolver/current participant;
3. Group/AOE original targets vs active/current participant;
4. CHILD_FRAME role projection;
5. Dying rescue handoff;
6. same public snapshot for acting/uninvolved viewers -> identical public seat roles;
7. REST -> no interaction seat roles;
8. a player with overlapping roles preserves all booleans/classes;
9. changing legacy Pending/timeline/presentationV2/CurrentAction/phase/actionReason with fixed PresentationClientView cannot change semantic seat roles;
10. existing local target-selection class/state remains independent from semantic active-target highlighting.

## Step 6 — bounded CSS
Add only narrowly scoped semantic seat styles. Reuse existing tokens where practical, but do not redesign player cards.

Verify desktop, <=650px, <=480px, and 4–10 players do not change topology or dimensions because of borders/shadows. Prefer outline/inset-shadow approaches that do not alter layout metrics.

No animations in this task.

## Step 7 — documentation
Update docs/UX_V2_INTERACTION_STAGE_DESIGN.md and README:
- UI-05 projects accepted interaction roles onto existing seats;
- semantic highlight is presentation only, not legality/selection;
- local amber selection remains independent;
- final seat topology/Hero Focus/control migration remains future work.

## Validation
Run focused seat projection/render tests plus retained UI-01..04 tests, then npm run test:fast, npm run test:api, npm run build, npm run lint, and git diff --check. Report exact counts.

## Scope exclusions
No gameplay/server/projector/snapshot changes; no target legality or click changes; no seat topology/layout redesign; no Hero Focus enlargement; no local dock redesign; no action/control migration; no animation rewrite; no settlement/transition work; no compatibility removal; no unrelated refactor.

## Execution result
Append only UI-05 result: SHA, files, seat-render inventory, helper API, role composition, CSS mapping, viewer-equality proof, local-selection independence proof, responsive/topology confirmation, tests, validation counts, and next bounded UI recommendation. Push and verify remote HANDOVER, then STOP.

## Acceptance
Pass only if existing seats gain truthful semantic interaction-role highlighting solely from the accepted client presentation view; overlapping roles remain representable; public roles are viewer-equal; local selection and gameplay legality remain independent; REST adds no semantic roles; and topology/controls/gameplay remain unchanged.

## Execution result — UX2.0UI-05

- Implementation SHA: `6c4f216f5615118b1ad9acb81bfed7cb829549b5` (`feat(ux-v2): project interaction roles onto seats`).
- Files: `game/presentation-client.ts`, `app/page.tsx`, `app/globals.css`, `tests/presentation-client.test.mjs`, `tests/room-safety-render.test.mjs`, `README.md`, `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`.
- Seat-render inventory: existing `player-square` seats retain `turn-square`, `action-square`, `selected-target`, and `defeated-square`; local target selection remains controlled by `isSelectedTarget` and its existing state. New semantic classes are separate and do not overload gameplay-selection classes.
- Helper API: `projectInteractionSeatRoles(view: PresentationClientView, playerId)` returns independent `isInteractionSource`, `isOriginalTarget`, `isActiveTarget`, `isCurrentParticipant`, `isDecisionActor`, `isActiveResolver`, and `isViewerDecisionActor` booleans. REST returns all false; local entitlement affects only the viewer-decision marker.
- Role composition: overlapping roles are preserved as simultaneous classes and data attributes; decision actor uses cyan emphasis, active/current target uses red inset emphasis, source uses restrained gold, original-only target uses a dashed outline, active resolver uses a distinct purple border, and the local viewer marker uses a separate gold outline. Existing turn/defeated classes remain present.
- CSS mapping: only scoped `player-square.interaction-seat-*` outlines, borders, and inset shadows were added. No seat width, height, grid coordinates, DOM order, pointer behavior, animation, or responsive topology rules changed at desktop, <=650px, or <=480px.
- Viewer equality: focused helper tests compare acting and uninvolved viewers with identical public role booleans; only `isViewerDecisionActor` changes with local entitlement. Legacy Pending/timeline/presentationV2/CurrentAction/phase/actionReason changes do not alter roles.
- Local-selection independence: render regression proves semantic active-target highlighting does not add `selected-target`; source assertions retain the separate `isSelectedTarget` and `interaction-seat-active-target` branches. No target legality or click handler changed.
- Evidence: focused display/render tests `41/41` cover ordinary Attack, Ma Chao source-owned ownership, Group/AOE, CHILD_FRAME, Dying, overlapping roles, viewer equality, REST, legacy independence, role classes, and local-selection separation.
- Validation: `npm run build` passed; `npm run test:fast` `158/158`; `npm run test:api` final rerun `239/239` after one unrelated transient first-run failure; full `npm test` passed with build/fast/API counts; `npm run lint` passed; `git diff --check` passed.
- Scope confirmation: presentation-only; no gameplay/server/projector/snapshot, target legality, controls, seat topology, local dock, Hero Focus, animation, settlement, transition, compatibility, or unrelated refactor changes.
- Closure recommendation: this UI-05 implementation is ready for reviewer verification. Keep Hero Focus or final seat-topology work as a separately authorized next slice.
