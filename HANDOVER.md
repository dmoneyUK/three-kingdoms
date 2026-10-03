# WTK UX V2 — Current Task Handoff

## REMOTE HANDOVER RULE
HANDOVER.md is tracked remote coordination state. Commit and push it to origin/ux-v2. After implementation append the result, push implementation and HANDOVER, fetch origin, verify origin/ux-v2:HANDOVER.md contains the result, then STOP.

**CLEANLINESS:** keep only this current task. Read docs/PLANNER_DEVELOPMENT_WORKFLOW.md.

# NEXT TASK — UX2.0UI-05-FIX1: Project Semantic Roles Onto the Local Player Seat Too

## Objective
UI-05 is only partially complete. The semantic role helper is sound, but production rendering applies it only to opponent seats because the player-board filters out room.meId. The accepted design requires the same public semantic seat projection for every visible seat, including the local player's persistent hero/dock seat.

Fix only this coverage gap. Do not redesign the dock or topology.

Use implementation commit 6c4f216f5615118b1ad9acb81bfed7cb829549b5.

## Reviewer finding
Production currently calls projectInteractionSeatRoles(clientPresentation, player.id) only inside:
room.players.filter(player => player.id !== room.meId).map(... OpponentPlayerCard ...)

Therefore when the local player is:
- interaction source;
- active/original target;
- current participant;
- public decision actor;
- active resolver;
the semantic role is not projected onto their visible local hero/player surface.

This creates viewer-dependent board semantics: another viewer can see that player's public role highlight on an opponent seat, while the player viewing themselves has no equivalent public role projection.

The viewer-private decision marker may differ, but public role projection must not disappear merely because the player is local.

## Required fix
1. Inventory the actual local-player hero/seat surface in the persistent local console/dock.
2. Compute projectInteractionSeatRoles(clientPresentation, room.meId) for that surface.
3. Apply the same public semantic role data/classes, or a clearly equivalent local-seat class mapping, without changing dock structure, dimensions, ordering, controls, hand area, skills, equipment, or click behavior.
4. Preserve all overlapping roles.
5. Preserve local viewer-decision marker as the only entitlement-dependent role.
6. REST applies no interaction semantic roles.
7. Do not duplicate the local player into player-board. The existing topology remains unchanged.

## CSS
Reuse the UI-05 semantic visual language for the local hero/player surface:
- source restrained emphasis;
- active/current affected red;
- decision cyan;
- resolver distinct only as already defined;
- viewer-private marker separate;
- defeated/local existing states remain independent.

Use outline/inset-shadow or equivalent non-layout-affecting styling. Do not change dock geometry.

## Tests
Add focused render/helper evidence:
1. local player as ordinary target-owned decision actor receives original/active/current/decision roles on the local visible surface;
2. local player as Ma Chao source-owned decision actor receives source + decision roles while remote target keeps active/current/resolver;
3. local player as active target/current participant without decision still receives public target roles;
4. overlapping local roles remain simultaneous;
5. acting vs uninvolved viewer projections preserve the same public roles for the same player identity; only viewer marker differs;
6. REST local surface has no interaction role classes/data;
7. local semantic active-target role does not mutate local target selection, controls, buttons, hand, skills, equipment, or gameplay state;
8. legacy Pending/timeline/presentationV2/CurrentAction/phase/actionReason changes cannot change local semantic roles with fixed PresentationClientView.

Retain all UI-05 opponent-seat tests.

## Documentation
Correct README and docs/UX_V2_INTERACTION_STAGE_DESIGN.md: UI-05 semantic role projection covers both remote seats and the local player's existing visible hero/player surface; it does not alter the persistent dock composition or topology.

## Validation
Run focused seat/local-surface render tests and retained UI-01..05 tests, then npm run test:fast, npm run test:api, npm run build, npm run lint, and git diff --check. Report exact counts.

## Scope exclusions
No server/projector/snapshot/gameplay changes; no local dock redesign; no hand/skill/equipment movement; no seat topology change; no target legality/click/control changes; no Hero Focus enlargement; no animation/settlement/transition work; no unrelated refactor.

## Execution result
Append only FIX1 result: SHA, files, identified local surface, local role mapping, viewer-equality evidence, overlap/REST evidence, dock/control independence proof, retained opponent evidence, validation counts, and closure recommendation. Push and verify remote HANDOVER, then STOP.

## Acceptance
Pass only if every visible player representation, including the local player's existing hero/player surface, receives the truthful accepted semantic interaction roles; public roles remain viewer-equal; only the viewer marker is private; REST is empty; and topology/dock/controls/gameplay remain unchanged.

## Execution result — UX2.0UI-05-FIX1

- **Status:** COMPLETE / reviewer-ready. Implementation commit: `c269150b58d6d765bccc1e5281d91e7f9a9a0ea7`.
- **Files:** `app/page.tsx`, `app/globals.css`, `tests/room-safety-render.test.mjs`, `README.md`, and `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`.
- **Local surface:** the existing `.local-player-dock` is the persistent local hero/player seat; no local player was duplicated into `.player-board`. `GameRoom` now computes `projectInteractionSeatRoles(clientPresentation, room.meId)` for that dock.
- **Role mapping:** the dock receives the same source, original-target, active-target, current-participant, decision-actor, active-resolver, and viewer-decision classes/data attributes as remote seats. Public roles come only from the fixed `PresentationClientView`; the viewer marker remains the only entitlement-dependent role.
- **Evidence:** focused render coverage proves ordinary local target-owned decision roles, local Ma Chao source-owned decision with remote target active/current/resolver roles, local target/current without decision, simultaneous overlap, legacy-field independence, and viewer-equal public projection. REST local rendering has no semantic role classes or data.
- **Independence:** active-target semantics remain outline/inset presentation only; tests retain the existing local hero card, hand anchor, skills, equipment, buttons, selection behavior, and one-anchor-per-visible-player topology. Existing UI-05 opponent-seat assertions remain green.
- **Validation:** focused presentation/render tests `41/41`; `npm run test:fast` `158/158`; `npm run test:api` `239/239`; full `npm test` passed; `npm run build` passed; `npm run lint` passed; `git diff --check` passed.
- **Closure recommendation:** close UI-05-FIX1. No server, projector, snapshot, gameplay, legality, dock-composition, topology, or control migration work was included.
