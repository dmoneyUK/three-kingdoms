# WTK UX V2 — Current Task Handoff

## REMOTE HANDOVER RULE
HANDOVER.md is tracked remote coordination state. Commit and push it to origin/ux-v2. After implementation append the result, push implementation and HANDOVER, fetch origin, verify origin/ux-v2:HANDOVER.md contains the result, then STOP.

**CLEANLINESS:** keep only this current task. Read docs/PLANNER_DEVELOPMENT_WORKFLOW.md.

# NEXT TASK — UX2.0UI-06: Semantic Hero Focus Projection

## Objective
UI-05 is accepted and closed. Add a bounded read-only Hero Focus consumer that makes the currently relevant character easier to read from the accepted Interaction Stage semantics, without enlarging/replacing seats or changing gameplay controls.

Hero Focus is presentation context, not a new authority and not an opponent-card redesign.

## Accepted baseline
Use commit c269150b58d6d765bccc1e5281d91e7f9a9a0ea7:
- semantic roles project to every visible player representation, including local dock;
- public roles are viewer-equal;
- local viewer marker is private;
- target selection and gameplay legality remain separate;
- Interaction Stage focus summary is accepted.

Do not reopen C1-C7 or UI-01..05.

## Step 1 — define pure HeroFocusView
Create a pure helper outside page.tsx derived only from InteractionStageView/PresentationClientView plus display-name/hero-display lookup.

The focus identity must be selected from accepted semantic IDs before display lookup.

Required focus rules:
1. if currentParticipantId exists, it is the primary focused character;
2. otherwise, if exactly one activeTargetId exists, that target is primary;
3. otherwise no primary character focus — do not guess from decision actor, resolver, source, turn, actionPlayerId, Pending, timeline, card/hero names, or array order;
4. source may be exposed separately as context, but must never replace an absent primary focus by inference;
5. CHILD_FRAME may expose parent/nested context already proven by InteractionStageView;
6. REST/no interaction -> hidden.

Do not invent target progress or causal meaning.

## Step 2 — minimal read-only Hero Focus component
Add a small Hero Focus surface inside the existing Interaction Stage area or immediately associated with it.

When a primary focus exists, show only public information already available for that player, for example:
- hero/player display identity;
- public hero portrait/art if already available through existing public player data;
- public HP/max HP if available;
- concise semantic role label such as CURRENT TARGET / CURRENT PARTICIPANT derived from the rule above.

Requirements:
- responsive, compact, and clearly subordinate to the stable board topology;
- do not clone the full opponent card;
- do not show hand contents/private cards;
- no buttons, click handlers, target selection, legal-action hints, timers, or controls;
- missing hero/name/art must degrade safely without changing focus identity.

If exposing HP/hero display requires passing public room display data into a rendering resolver, keep semantic identity selection pure: the resolver may decorate an already-selected playerId but cannot choose who is focused.

## Step 3 — preserve source-owned semantics
Ma Chao/source-owned decision case must keep:
- primary Hero Focus = current participant/target;
- decision owner remains source in Interaction Stage;
- active resolver may remain target;
- Hero Focus must not switch to source merely because source owns the decision.

## Step 4 — Group/AOE and child frames
For Group/AOE:
- focus only the proven currentParticipant when present;
- do not cycle or infer next/previous target;
- if no currentParticipant and multiple active targets, show no single Hero Focus.

For CHILD_FRAME:
- focus the child frame current participant/sole active target only if proven;
- retain compact nested context; do not replace it with parent target inference.

## Step 5 — tests
Add focused pure/render tests for:
1. ordinary Attack/Dodge target focus;
2. Ma Chao source-owned decision keeps target/current participant as Hero Focus;
3. Group/AOE current participant focus;
4. Group/AOE multiple active targets with no current participant -> no guessed Hero Focus;
5. single active target fallback when current participant absent;
6. CHILD_FRAME focus and nested context;
7. Dying rescue current participant;
8. acting vs uninvolved viewers -> identical Hero Focus public content;
9. missing player/hero display data -> safe neutral fallback with same selected ID;
10. REST -> no Hero Focus;
11. legacy Pending/timeline/presentationV2/CurrentAction/phase/actionPlayerId/actionReason changes cannot change selected focus with fixed PresentationClientView;
12. no private hand/card/control data is rendered.

Use typed synthetic PresentationClientView for transformation tests; do not claim new server semantics.

## Step 6 — bounded styling
Add only Hero Focus scoped CSS. Verify <=650px and <=480px containment and long names. Do not change player-board coordinates, local dock dimensions/composition, seat dimensions, or Interaction Stage authority.

No animations in this task.

## Step 7 — documentation
Update README and docs/UX_V2_INTERACTION_STAGE_DESIGN.md:
- UI-06 adds read-only semantic Hero Focus;
- primary focus authority is currentParticipant, else sole active target;
- no focus is guessed for ambiguous multi-target state;
- source/decision owner remain distinct concepts;
- full target-selection/control/animation/topology redesign remains future work.

## Validation
Run focused Hero Focus/Interaction Stage/seat render tests plus retained UI-01..05 tests, then npm run test:fast, npm run test:api, npm run build, npm run lint, and git diff --check. Report exact counts.

## Scope exclusions
No gameplay/server/projector/snapshot changes; no new authority; no seat topology redesign; no opponent-card enlargement; no local dock redesign; no target legality/selection/control migration; no animation; no settlement/transition changes; no compatibility removal; no unrelated refactor.

## Execution result
Append only UI-06 result: SHA, files, HeroFocusView API, focus-selection rules, display resolver boundary, Ma Chao/Group/child/Dying evidence, viewer equality, privacy proof, responsive containment, validation counts, and next bounded UI recommendation. Push and verify remote HANDOVER, then STOP.

## Acceptance
Pass only if Hero Focus selects a character solely from accepted semantic focus rules; ambiguous multi-target states do not guess; source-owned decisions keep target focus distinct from decision owner; public focus is viewer-equal and privacy-safe; REST hides it; and board/dock/controls/gameplay remain unchanged.
