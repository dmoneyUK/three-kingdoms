# WTK UX V2 — Current Task Handoff

## REMOTE HANDOVER RULE
HANDOVER.md is tracked remote coordination state. Commit and push it to origin/ux-v2. After implementation append the result, push implementation and HANDOVER, fetch origin, verify origin/ux-v2:HANDOVER.md contains the result, then STOP.

**CLEANLINESS:** keep only this current task. Read docs/PLANNER_DEVELOPMENT_WORKFLOW.md.

# NEXT TASK — UX2.0UI-10: Local Operation Console Decision-State Unification

## Objective
UI-09 is accepted and closed. UI-01..09 now provide server-owned semantic presentation plus explicit local Confirm/Cancel boundaries for player targets and private target-card pickers.

The next bounded slice is to make the existing local operation console present one coherent current decision state without changing gameplay actions, legality, payloads, or board topology.

This is a consumer/composition task, not a redesign.

## Authority rules
1. CurrentAction/capabilities and existing local selection helpers remain the only control/legality authority.
2. PresentationSnapshot may describe public interaction context but must not grant controls.
3. Local selection state may describe only the viewer's unsubmitted inputs.
4. Do not derive a control from Pending/timeline/actionPlayerId/public semantic roles when CurrentAction/capabilities do not authorize it.
5. Skip/Decline is authoritative; Cancel is local-only.
6. Preserve every existing action name and payload.
7. Fail closed when decision/control state is incoherent.

## Step 1 — inventory every production console decision surface
Map all controls currently rendered in the local dock/action area:
- turn play / end turn;
- response card / Skip;
- rescue Peach / Skip;
- trigger provider + Confirm / Skip;
- active skill + Confirm;
- normal/converted/Serpent target Confirm/Cancel;
- Borrowed Sword Confirm/Cancel;
- target-card picker Confirm/Cancel/Skip;
- discard;
- judgement/replacement controls if present;
- Duel/Attack response;
- any special continuation controls.

For each record exact authority, local input state, submit action, decline action, busy/disabled rule, and current rendering location.

## Step 2 — introduce a pure console decision display model
Create a bounded pure adapter/model that consumes already-proven control facts and local selection status. It may organize display only; it must not recreate legality.

Model should expose, where applicable:
- decision kind / concise instruction;
- local selection summary/count;
- primary action label + enabled state;
- local Cancel availability;
- authoritative Skip/Decline availability;
- busy/submitting state;
- optional secondary/provider controls.

Do not put callbacks, Room, Pending, PresentationSnapshot, or raw gameplay-rule computation into the pure display model.

## Step 3 — unify guidance hierarchy
Within the existing local operation console:
- show one primary instruction for the current decision;
- show local selection count/context when relevant;
- visually distinguish primary Confirm/Play/Use from local Cancel and authoritative Skip/Decline;
- avoid duplicate/conflicting guidance from multiple decision paths;
- keep existing skills/equipment/hand composition and board topology unchanged.

Do not move gameplay controls into Hero Focus or Interaction Stage.

## Step 4 — fail-closed precedence
When multiple legacy booleans appear true, define explicit precedence based on authoritative decision ownership, not incidental render order.

Add negative tests for contradictory/stale combinations. The console must not expose two unrelated primary submit actions for one current decision.

Do not suppress a legitimate independent control unless the current server contract proves it belongs to a different decision.

## Step 5 — tests
At minimum cover:
1. ordinary turn play;
2. Attack/Dodge response + Skip;
3. Duel response;
4. rescue Peach + Skip;
5. trigger target/card selection + Confirm/Cancel/Skip;
6. active skill selection + Confirm/Cancel;
7. Serpent Spear;
8. Borrowed Sword;
9. pending target-card picker;
10. discard phase;
11. source-owned trigger where public decisionActor and activeResolver differ;
12. REST/no interaction with legal local turn control;
13. stale/incoherent state fails closed;
14. Cancel never replaces Skip/Decline;
15. public PresentationSnapshot mutation alone cannot grant a control;
16. local selection mutation cannot change public semantic presentation;
17. one coherent primary guidance/submit surface for each current decision;
18. <=650px and <=480px console remains contained with no duplicate controls.

Retain UI-01..09 regressions.

## Step 6 — docs
Update README, ROADMAP, and UX design doc with the console authority boundary and decision hierarchy. Document any decision surface intentionally not unified and why.

## Validation
Run focused console tests plus retained UI-01..09 tests, then npm run test:fast, npm run test:api, npm run build, npm run lint, git diff --check. Report exact counts.

## Scope exclusions
No server/game-rule/action payload changes; no projector/snapshot authority expansion; no seat topology/local dock composition redesign; no Hero Focus controls; no animation/settlement/transition work; no private visibility changes; no unrelated refactor.

## Execution result
Append only UI-10 result: SHA, files, complete console inventory, pure model API, authority/precedence proof, migrated display surfaces, contradictory-state evidence, semantic independence, responsive evidence, exact validation counts, remaining GAPs, next bounded recommendation. Push and verify remote HANDOVER, then STOP.

## Acceptance
Pass only if the local operation console has a coherent decision/guidance hierarchy built from existing authoritative control facts, exposes no new legality, preserves action/payload semantics, keeps Cancel distinct from Skip/Decline, fails closed under stale contradictions, and leaves public presentation/topology unchanged.
