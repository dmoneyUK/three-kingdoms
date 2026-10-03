# WTK UX V2 — Current Task Handoff

## REMOTE HANDOVER RULE — MANDATORY
HANDOVER.md is tracked remote coordination state. Commit and push it to origin/ux-v2. After implementation append the execution result, push implementation + HANDOVER, fetch origin, verify origin/ux-v2:HANDOVER.md contains the result, then STOP.

**CLEANLINESS:** keep only this current task. Read docs/PLANNER_DEVELOPMENT_WORKFLOW.md.

# NEXT TASK — UX2.0C7-03: Resolve Source-Owned Trigger Stable Boundary

## Objective
C7-02 found one real contradiction in Ma Chao Cavalry's source-owned attack_targeted trigger: interactionScene is PROVEN, but stableBoundary is identity-free REST, so the atomic PresentationSnapshot correctly fails closed. Resolve this at the PresentationV2 stable-boundary/semantic-decision layer using persisted Pending + causal-envelope authority only. Do not weaken PresentationSnapshot. No gameplay or UI work.

## Required authority
First prove the real persisted Ma Chao state. Record/assert pending.kind, pending.actorId, pending.causal interactionId/frameId, continuation kind/event discriminator, envelope interactionId/activeFrameId, active frame stage/source/targets/resolvingPlayerId, checkpoint frame/stage, and interactionScene roles. CurrentAction may corroborate private control only; it is not public proof.

If persisted Pending does not independently prove trigger ownership, STOP and report.

A source-owned trigger may become CHOICE only when:
- scene is PROVEN;
- pending.kind is trigger with non-null actorId;
- pending causal interactionId/frameId exactly match envelope/active frame;
- checkpoint is coherent with active frame;
- continuation/event is an accepted typed trigger discriminator;
- persisted Pending proves that actor owns this trigger decision.

The real model may truthfully have decisionActorId != activeResolverId: the source can own an optional trigger while the attack target remains frame resolver. Do not rewrite activeResolverId.

## Implementation
Add the smallest pure typed proof/helper in game/presentation-v2.ts for this exact class of causally linked source-owned trigger. Do not broadly remove the existing resolver-coherence rule.

Constraints:
- no hero/card-name checks;
- no CurrentAction, timeline, finalResult or resolutionId authority;
- exact causal linkage;
- typed continuation/event allowlist;
- malformed/unlinked records fail closed;
- ordinary target-owned trigger semantics remain unchanged.

When proven, interactionScene.decisionActorId must be the trigger owner, stableBoundary must be coherent CHOICE using the existing interaction/checkpoint/revision, and PresentationSnapshot must pass its existing atomic gate unchanged.

## Negative tests
Prove no false CHOICE for:
1. missing causal link;
2. wrong interactionId;
3. wrong frameId;
4. unsupported trigger continuation/event;
5. arbitrary substituted actor;
6. malformed checkpoint/frame coherence.

Synthetic states are allowed only for negative evidence.

## Real regressions
Prove:
- Ma Chao source-owned pre-Judgement trigger becomes coherent CHOICE snapshot;
- Skip/decline resumes target-owned Attack response correctly;
- Ma Chao Judgement continuation/progression remains correct;
- ordinary Attack/Dodge unchanged;
- at least one ordinary target-owned trigger unchanged;
- Dying, Negation, Group child and Borrowed Sword semantics unaffected.

Reuse existing real fixtures.

## C7 matrix
Update from real evidence only. Expected if fully resolved:
- Attack -> Judgement -> Attack resume: I GAP -> P and B GAP -> P;
- final totals 102 P / 2 N/A / 0 GAP / 0 unclassified = 104.
Keep the two C N/A cells for single-checkpoint Attack/Dodge and independent/root Damage. If any GAP remains, report it; do not claim closure.

SPECIAL remains RESERVED/unexercised unless this work naturally exposes a real accepted SPECIAL path. Do not manufacture one. settlement remains null and transitionEvents remains empty.

## Documentation
Update docs/UX_V2_INTERACTION_STAGE_DESIGN.md and README with the exact source-owned-trigger authority rule, why decision actor may differ from active resolver, negative guardrails, matrix totals, and C7 closure readiness. Confirm the PresentationSnapshot atomic gate was not weakened.

## Validation
Run focused Ma Chao/source-owned-trigger and affected presentation tests, then npm run test:fast, npm run test:api, npm run build, npm run lint, and git diff --check. Report exact counts.

## Scope exclusions
No gameplay/Ma Chao rule changes, React/CSS, CurrentAction public authority, global resolver-rule removal, hero/card-name authority, timeline/finalResult/resolutionId causal proof, settlement/transition population, or unrelated refactors.

## Execution result
Append only C7-03 result: full SHA, files, persisted proof observed, helper/rule added, negative cases, real regression fixtures, final matrix totals/GAP/N/A, SPECIAL status, confirmation atomic snapshot gate unchanged, gameplay/React/CSS unchanged, validation counts, and closure recommendation. Push and verify remote HANDOVER, then STOP.

## Acceptance
Pass only if the real source-owned trigger becomes coherent public CHOICE from Pending + causal-envelope authority alone; decision actor and active resolver remain truthfully distinct where appropriate; malformed/unlinked/arbitrary trigger states fail closed; ordinary families remain unchanged; snapshot atomic fail-closed behavior is untouched; matrix reaches 0 GAP or honestly reports remaining gaps; and no gameplay/UI scope creep occurs.

## Execution result — UX2.0C7-03 source-owned trigger stable boundary — 2026-10-03

- Implementation SHA: `cfb10e511a180cf828d61afd3a0008c1630008d8`.
- Files changed: `game/presentation-v2.ts`, `tests/presentation-v2.test.mjs`, `tests/api/ma-chao.test.mjs`, `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`, and `README.md`.
- Persisted real proof observed in the Ma Chao fixture: `pending.kind=trigger`, `pending.event=attack_targeted`, `pending.actorId=source`; Pending causal, continuation causal, declaration causal, envelope interaction/active frame, and checkpoint frame/stage all match; continuation is `attack_targeted_event`; declaration source/target match the Attack; active frame is `ATTACK_RESPONSE` with source-owned origin/current source, the original/current target, and `resolvingPlayerId=target`.
- Helper/rule added: pure `sourceOwnedTriggerDecisionActorId` accepts only the typed `attack_targeted` / `attack_targeted_event` proof with exact causal links, coherent checkpoint, source/target frame links, and actor equal to persisted declaration source. It preserves the target as active resolver, while ordinary response and target-owned trigger decisions retain resolver coherence. No CurrentAction, timeline, finalResult, resolutionId, or hero/card name is authority.
- Negative coverage: missing causal link, wrong interaction ID, wrong frame ID, unsupported event/continuation, arbitrary actor, and malformed checkpoint/frame coherence all fail closed to identity-free REST.
- Real regressions: Ma Chao source-owned pre-Judgement trigger now yields a coherent CHOICE snapshot; decline resumes the target-owned Attack response; Judgement continuation/progression remains correct; the existing full API suite covers ordinary Attack/Dodge, target-owned triggers, Dying, Negation, Group child, and Borrowed Sword semantics.
- C7 matrix: **102 P / 2 N/A / 0 GAP / 0 unclassified = 104 cells**. The two C N/A cells remain the single-checkpoint Attack/Dodge and independent/root Damage cells. SPECIAL remains RESERVED/unexercised.
- The `PresentationSnapshot` atomic gate is unchanged. `settlement` remains `null` and `transitionEvents` remains `[]`; no gameplay, React, or CSS changes were made.
- Validation: focused PresentationV2 `34/34`; targeted Ma Chao API `10/10`; `npm run test:fast` `131/131`; `npm run test:api` `239/239`; `npm run build` passed; `npm run lint` passed; `git diff --check` passed.
- Recommendation: C7 is ready for reviewer closure. React migration remains a separate next phase and has not started.
