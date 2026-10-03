# WTK UX V2 — Current Task Handoff

## REMOTE HANDOVER RULE
HANDOVER.md is tracked remote coordination state. Commit and push it to origin/ux-v2. After implementation append the result, push implementation and HANDOVER, fetch origin, verify remote HANDOVER contains the result, then STOP.

**CLEANLINESS:** keep only this current task. Read docs/PLANNER_DEVELOPMENT_WORKFLOW.md.

# NEXT TASK — UX2.0UI-04: Make Interaction Stage a Semantic Focus Summary, Not a Debug Matrix

## Objective
UI-03 is accepted as the first dedicated read-only Interaction Stage consumer. Refine that new panel into a bounded, readable semantic focus summary while preserving the existing table topology, seats, local dock, controls, target selection, and animation.

This is still not the full UX redesign. Do not expand authority or gameplay.

## Baseline
Use commit c078952bd604131087dc0e186342bcc09b52dfb0 as accepted:
- InteractionStage is driven only by PresentationClientView;
- REST renders no stage;
- source/targets/current participant/decision actor/resolver/continuity are preserved;
- public content is viewer-equal except local decision marker;
- no legacy fallback exists.

Do not reopen C1-C7 or UI-01..03.

## Reviewer observation
UI-03 intentionally rendered nearly every semantic field in a compact grid. That is useful proof but is too close to a diagnostic matrix for the eventual game surface. The next slice should establish information hierarchy without changing board geometry.

Do not remove semantic data from the underlying InteractionStageView merely because it is not always displayed.

## Step 1 — define display hierarchy from existing semantics
Create a pure display model derived only from InteractionStageView.

Primary public focus:
- stage/effect label;
- source;
- current affected participant/active target context.

Decision context:
- decision owner when a CHOICE exists;
- viewer-local YOUR DECISION marker only from existing local entitlement.

Secondary/debug semantics:
- original target list when it materially differs from active/current target context;
- active resolver only when it differs from decision actor or clarifies nested resolution;
- child-frame/parent relationship as compact context;
- interaction/checkpoint/revision remain data attributes/test diagnostics, not prominent player-facing copy.

Do not infer whether something is “materially different” from legacy room state. Compare only fields already in InteractionStageView.

## Step 2 — refine the component
Refactor InteractionStage markup so the normal case reads as a concise game-state sentence/summary rather than six equal diagnostic cells.

Requirements:
- source and current affected target/participant are visually primary;
- decision owner is explicit for CHOICE;
- Ma Chao source-owned case visibly preserves decision owner != resolver without making resolver look like the decision owner;
- Group/AOE can show current participant plus compact target progress/context using existing target arrays only;
- CHILD_FRAME shows compact nested-effect context;
- missing names remain neutral and retain IDs internally;
- no interaction -> render nothing.

Do not add card art, hero portraits, arrows, new controls, buttons, timers, or animations yet.

## Step 3 — responsive containment
Keep the panel inside the existing play-table and ensure it does not cover or block controls.

Add only narrowly scoped InteractionStage CSS needed for:
- desktop;
- <=650px;
- <=480px;
- long player names;
- 4–10 player target lists without horizontal overflow.

No global CSS rewrite and no seat/dock geometry changes.

## Step 4 — semantic tests
Add pure tests for the display hierarchy:
1. ordinary target-owned CHOICE hides redundant resolver detail;
2. Ma Chao source-owned CHOICE exposes distinct decision owner/resolver correctly;
3. Group/AOE current participant and multi-target context;
4. CHILD_FRAME compact parent/nested context;
5. original targets equal active targets do not create redundant copy;
6. changed/filtered active targets preserve truthful original-vs-active context;
7. long/missing names remain safe;
8. viewer change alters only local marker, not public display model;
9. REST hidden.

Add render assertions that interaction/checkpoint/revision remain data attributes and are not rendered as prominent visible labels.

## Step 5 — legacy independence and regression
Keep the UI-03 legacy-independence proof. Confirm the refined component still cannot accept Pending, timeline, presentationV2, CurrentAction, phase, actionPlayerId, or actionReason.

Verify no behavior change to action strip, buttons, legal actions, target selection, dialogs, timers, sequence/resolution animation, seats, local dock, or submissions.

## Step 6 — documentation
Update docs/UX_V2_INTERACTION_STAGE_DESIGN.md and README:
- UI-04 establishes Interaction Stage information hierarchy;
- semantic IDs remain in the underlying view even when not prominently rendered;
- public focus vs viewer-local marker separation;
- final Hero Focus, target highlighting, controls, animation, and topology migration remain future slices.

## Validation
Run focused Interaction Stage/helper/render tests and retained UI-01..03 tests, then:
- npm run test:fast
- npm run test:api
- npm run build
- npm run lint
- git diff --check
Report exact counts.

## Scope exclusions
No gameplay/server/projector/snapshot changes; no new semantic authority; no hero/card assets; no seat topology or local dock redesign; no target-selection/control migration; no animation rewrite; no settlement/transition protocol; no compatibility-field removal; no unrelated refactor.

## Execution result
Append only UI-04 result: SHA, files, display-model API, hierarchy rules, Ma Chao/Group/child-frame behavior, responsive containment changes, tests, legacy-independence proof, scope confirmation, validation counts, and next bounded UI recommendation. Push and verify remote HANDOVER, then STOP.

## Acceptance
Pass only if InteractionStage becomes a concise semantic focus summary derived solely from the accepted view; redundant diagnostic detail is demoted without losing underlying semantics; source-owned/group/child-frame cases remain truthful; responsive containment is bounded; public content remains viewer-equal; and gameplay/layout/control behavior is unchanged.
