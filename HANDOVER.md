# WTK UX V2 — Current Task Handoff

## REMOTE HANDOVER RULE
HANDOVER.md is tracked remote coordination state. Commit and push it to origin/ux-v2. After implementation append the result, push implementation + HANDOVER, fetch origin, verify the remote HANDOVER contains the result, then STOP.

**CLEANLINESS:** keep only this current task. Read docs/PLANNER_DEVELOPMENT_WORKFLOW.md.

# NEXT TASK — UX2.0UI-01: Introduce a Read-Only Client Presentation Adapter

## Objective
C7 is reviewer-accepted and closed. Begin React migration with the smallest safe client boundary: make the client understand the server-owned PresentationSnapshot through a typed, pure adapter, while preserving the existing visual UI and gameplay behavior.

This task is architecture/scaffolding only. Do not redesign the board yet.

Target path:
server PresentationSnapshot -> typed client adapter -> future Interaction Stage / local console

The current app/page.tsx still contains extensive Pending/timeline-specific presentation logic. Do not replace all of it in one task.

## Accepted baseline
Treat commit 7b21b8f841b99fd44e51e40a3e5e180b1d9d81b1 as accepted C7 closure:
- C7 matrix 102 P / 2 N/A / 0 GAP / 104;
- snapshot public authority is atomic/fail-closed;
- source-owned attack_targeted proof is exact ATTACK_RESPONSE source/target/resolver authority;
- localControl is private entitlement/reference only;
- settlement is null RESERVED;
- transitionEvents is [] RESERVED;
- SPECIAL is RESERVED/unexercised;
- presentationV2 remains compatibility data.

Do not reopen C1-C7.

## Step 1 — inventory current client presentation dependencies
Inspect app/page.tsx and related client helpers/styles/tests. Record in the execution result the existing places that derive presentation state from:
- pending* compatibility fields;
- currentAction;
- timeline/presentation events;
- presentationV2 if any;
- phase/actionPlayerId/actionReason;
- local component state.

Classify each dependency as PUBLIC SEMANTIC, PRIVATE CONTROL, LEGACY ANIMATION/COMPATIBILITY, or GAMEPLAY INPUT.

Do not delete anything during inventory.

## Step 2 — type the snapshot on the client
Update the Room/client protocol shape so presentationSnapshot is explicitly typed from the production snapshot contract rather than unknown/ad-hoc duplication.

Prefer importing/reusing exported types from game/presentation-snapshot.ts. Avoid defining a second divergent snapshot schema in page.tsx.

Keep presentationV2 and all existing compatibility fields available.

## Step 3 — create a pure read-only adapter
Create a small client-facing module outside page.tsx, e.g. game/presentation-client.ts, with a pure function that maps PresentationSnapshot + viewer/meId to a stable view model for future components.

Minimum view model:
- hasInteraction;
- interactionId/checkpointId/presentationRevision;
- stage;
- sourceId;
- originalTargetIds;
- activeTargetIds;
- currentParticipantId;
- decisionActorId;
- activeResolverId;
- participantIds;
- continuity relation / parentFrameId;
- stable kind;
- isLocalDecisionActor;
- hasLocalControl;
- local actionRevision reference.

Authority rules:
- public fields come only from snapshot public fields;
- local booleans/reference come only from snapshot.localControl + meId;
- do not inspect Pending, timeline, CurrentAction payloads, presentationV2 legacy contexts, phase, hero/card names;
- do not invent IDs/revisions;
- REST/identity-free snapshot produces hasInteraction=false and null/empty public view;
- adapter must not mutate input.

Do not copy legal cards/options/providers into this adapter.

## Step 4 — wire the adapter into Home without changing visuals
Compute the adapter view model in Home from room.presentationSnapshot and room.meId.

For this first slice, expose it only to a non-visual semantic boundary suitable for tests/future components. It may be passed to an extracted semantic container/component or used through stable data-* attributes on an existing top-level game container.

Do NOT change layout, colors, labels, target selection, dialogs, card animation, seat positions, local dock, or action behavior.

Do not replace existing legacy animation logic yet.

## Step 5 — tests
Add focused pure adapter tests for:
- coherent CHOICE;
- source-owned decisionActor != activeResolver;
- viewer is decision actor;
- uninvolved viewer;
- localControl entitled vs absent;
- identity-free REST;
- child-frame continuity;
- repeated identical snapshot -> deep-equal adapter output;
- malformed/partial input cannot be reconstructed from any fallback because adapter accepts only typed snapshot authority.

Add/adjust a client/render test proving the current game shell receives the semantic adapter state without changing existing rendered controls.

Do not use synthetic data to claim server semantics; synthetic typed snapshots are fine for adapter transformation tests because C7 already proves server semantics.

## Step 6 — guard against accidental legacy authority
Add a focused test demonstrating that changing legacy Pending/timeline/presentationV2 compatibility data while keeping the same PresentationSnapshot does not change the new adapter output.

The adapter must have no dependency on those legacy values.

## Step 7 — documentation
Add the UI-01 boundary to docs/UX_V2_INTERACTION_STAGE_DESIGN.md and README:
- C7 CLOSED;
- UI migration started;
- adapter is read-only and non-visual;
- legacy UI remains temporarily intact;
- future Interaction Stage must consume adapter/snapshot semantics, not rediscover authority from Pending/timeline;
- settlement/transition animation remains legacy compatibility until separately designed.

Do not claim the Interaction Stage visual redesign is implemented.

## Validation
Run focused adapter/client tests, then:
- npm run test:fast
- npm run test:api
- npm run build
- npm run lint
- git diff --check
Report exact counts.

## Scope exclusions
No gameplay changes; no server projector/causal changes; no PresentationSnapshot semantic changes; no visual redesign; no CSS redesign; no seat/local-dock movement; no target-selection rewrite; no animation rewrite; no settlement/transition protocol; no removal of presentationV2/pending compatibility fields; no duplicate legality engine; no unrelated refactor.

## Execution result
Append only UI-01 result with full SHA, files changed, dependency inventory, exact adapter type/API, authority mapping, tests, proof of legacy-independence, confirmation visuals/gameplay/server semantics unchanged, validation counts, and recommendation for the next bounded UI migration slice. Push and verify remote HANDOVER, then STOP.

## Acceptance
Pass only if the client has one typed pure read-only PresentationSnapshot adapter; public/private authority stays separated; REST fails closed; adapter output is independent of Pending/timeline/presentationV2 compatibility data; Home is wired to it without visual or gameplay behavior changes; C7 semantics remain untouched; and tests make the boundary explicit.
