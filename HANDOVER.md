# WTK UX V2 — Current Task Handoff

## REMOTE HANDOVER RULE
HANDOVER.md is tracked remote coordination state. Commit and push it to origin/ux-v2. After implementation append the result, push implementation and HANDOVER, fetch origin, verify origin/ux-v2:HANDOVER.md contains the result, then STOP.

**CLEANLINESS:** keep only this current task. Read docs/PLANNER_DEVELOPMENT_WORKFLOW.md.

# NEXT TASK — UX2.0UI-13: Duel Response Focus & Handoff Regression

## Objective
UI-12 is accepted and closed. Harden the existing Duel UX as a special-flow semantic regression: the visible Interaction Stage/Hero Focus and local response console must follow the server-owned Duel responder handoff across alternating responses, without creating client-owned participant sequencing.

This is not a Duel rules rewrite. Preserve all gameplay actions, payloads, damage resolution, response legality, and causal identities.

## Authority rules
1. CurrentAction/capabilities own whether the local viewer may respond and which cards/providers are legal.
2. PresentationSnapshot owns public Duel source/targets/current participant/decision actor/active resolver only where already proven.
3. Pending/continuation owns authoritative Duel execution/handoff; UI must not calculate “next responder”.
4. Timeline/actionPlayerId/turn owner/card selection are not responder authority.
5. Hero Focus follows accepted semantic IDs only; never infer responder from Duel alternation.
6. Cancel remains local-only; Skip/Decline remains authoritative.
7. No new Duel-specific server state, action, payload, projector authority, or gameplay rule.

## Step 1 — trace the real Duel lifecycle
Inventory exact production functions/files for:
- Duel play submission and initial target;
- initial responder CurrentAction;
- accepted Attack response;
- responder handoff;
- response provider/conversion support;
- decline/no-Attack path and damage;
- nested damage/dying child frame if applicable;
- resume/terminal clear.

Record which layer owns each transition: gameplay Pending/continuation, CurrentAction, causal envelope, PresentationSnapshot.

## Step 2 — verify semantic projection at each checkpoint
Using real engine/API-backed fixtures where available, prove:
- source and original Duel target remain stable;
- current participant/decision actor changes only when server state hands off;
- active resolver follows the proven contract;
- interactionId remains continuous across responder handoff;
- checkpoint/revision advances as appropriate;
- nested Damage/Dying uses existing child-frame semantics and returns/resumes correctly;
- terminal Duel clears/rests correctly.

Do not manufacture missing semantic fields from turn order or previous responder.

## Step 3 — local console integration
For a viewer who currently owns the Duel response:
- existing response card/provider controls remain available from CurrentAction;
- one response primary surface;
- authoritative Skip/Decline remains distinct;
- stale local card/provider selection clears when actionRevision/responder changes.

For every other viewer:
- no Duel response control may appear merely because public Hero Focus points at the responder.

## Step 4 — Hero Focus / seat behavior
At each authoritative responder checkpoint:
- Hero Focus primary is the proven current participant;
- public seat roles update on stable seat anchors;
- source context remains separate;
- no enlarged/replaced opponent seat;
- responder handoff must not move seat topology;
- local amber selection must not overwrite public red/cyan semantic roles.

## Step 5 — tests
At minimum cover:
1. initial Duel target/responder;
2. target responds with Attack and server hands response to source;
3. source responds and server hands back where rules require;
4. source-owned and target-owned viewer perspectives expose controls only to CurrentAction actor;
5. public snapshot is viewer-equal while private controls differ;
6. stale actionRevision clears local response/provider selection;
7. decline/no-Attack follows existing action/payload and enters existing damage path;
8. nested Duel damage/Dying preserves causal parent/child semantics;
9. Hero Focus changes only from authoritative semantic checkpoint;
10. mutating timeline/actionPlayerId/turn owner cannot change Duel responder controls/focus;
11. no client “next responder” calculation exists;
12. seat anchor count/order remains unchanged through handoffs;
13. console has one coherent response primary + authoritative Skip;
14. UI-07..12 retained regressions stay green.

Prefer real API/engine fixtures for handoff authority; mounted GameRoom tests for actual controls/focus.

## Step 6 — docs
Update README, ROADMAP, and docs/UX_V2_INTERACTION_STAGE_DESIGN.md with the Duel authority/handoff contract and any truthful remaining GAP.

## Validation
Run focused Duel API/presentation/mounted UI tests plus retained UI-01..12 tests, then npm run test:fast, npm run test:api, npm run build, npm run lint, git diff --check. Report exact counts.

## Scope exclusions
No Duel rule changes; no new action/payload; no Pending/continuation rewrite; no projector/snapshot authority expansion; no topology redesign; no animation/settlement work; no attempt to close UI-11 pixel visual GAP.

## Execution result
Append only UI-13 result: SHA, files, complete Duel lifecycle trace, authority mapping, real handoff evidence, console/focus evidence, nested damage/dying evidence, negative stale/inference tests, exact validation counts, remaining GAPs, next bounded recommendation. Push and verify remote HANDOVER, then STOP.

## Acceptance
Pass only if Duel responder/focus/control handoff is demonstrably server-owned end to end, UI exposes controls only from CurrentAction authority, public semantic focus follows PresentationSnapshot without client alternation inference, causal continuity survives nested damage/dying, and gameplay actions/payloads remain unchanged.
