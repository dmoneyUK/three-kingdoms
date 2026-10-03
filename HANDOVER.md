# WTK UX V2 — Current Task Handoff

## REMOTE HANDOVER RULE
HANDOVER.md is tracked remote coordination state. Commit and push it to origin/ux-v2. After implementation append the result, push implementation + HANDOVER, fetch origin, verify the remote HANDOVER contains the result, then STOP.

**CLEANLINESS:** keep only this current task. Read docs/PLANNER_DEVELOPMENT_WORKFLOW.md.

# NEXT TASK — UX2.0C7-03-FIX1: Tighten Source-Owned Trigger Frame Proof

## Objective
The C7-03 direction is correct, but sourceOwnedTriggerDecisionActorId is broader than the real state used to justify it. Tighten the proof to require the exact frame role relationship demonstrated by the Ma Chao fixture. No gameplay, PresentationSnapshot, React, or CSS changes.

## Reviewer finding
The helper already checks typed trigger discriminators, causal links, declaration source/target, checkpoint coherence, and actor == declaration source. It does not explicitly require:
- activeFrame.stage === "ATTACK_RESPONSE";
- activeFrame.current.resolvingPlayerId === declaration targetId.

A causally coherent record with the wrong stage or wrong resolver can therefore satisfy the helper. The real fixture proves both facts, so production authority must require both.

## Production fix
Require all existing predicates plus:
1. activeFrame.stage === "ATTACK_RESPONSE";
2. checkpoint stage/frame exactly match that active frame;
3. activeFrame.current.resolvingPlayerId === declaration targetId.

Retain actor/source equality, origin/current source coherence, origin/current target membership, exact Pending/continuation/declaration causal links, and the exact existing typed event/continuation discriminators.

Do not generalize this helper to other trigger families.

## Negative evidence
Add independent focused cases for:
- correct causal links but wrong active-frame stage;
- correct stage but resolver differs from declared target;
- actor and declaration source substituted together while frame source stays original;
- declaration target substituted while frame target/resolver stays original.

Each must have no semantic decision actor and an identity-free REST boundary. Preserve the existing malformed-link/discriminator/checkpoint cases.

## Positive regressions
Preserve the real Ma Chao proof: source decision actor, target active resolver, coherent CHOICE boundary/snapshot, then Skip resumes the target-owned response.

Also add an explicit assertion in one real existing ordinary target-owned trigger fixture that decisionActorId, activeResolverId, and CHOICE boundary remain correct. Do not count only the full-suite pass as evidence for this requirement.

## Matrix and docs
If all evidence passes, keep the matrix at 102 P / 2 N/A / 0 GAP / 104. Correct the C7 documentation to state the complete frame-role proof including ATTACK_RESPONSE and resolver == declared target.

SPECIAL stays RESERVED/unexercised. settlement stays null and transitionEvents stays empty.

## Validation
Run focused PresentationV2 tests, Ma Chao API, the explicit ordinary target-owned trigger fixture, then npm run test:fast, npm run test:api, npm run build, npm run lint, and git diff --check. Report exact counts.

## Scope exclusions
No gameplay changes, UI work, snapshot-gate changes, CurrentAction public authority, global resolver-rule weakening, support for new trigger families, settlement/transition implementation, or unrelated refactors.

## Execution result
Append only C7-03-FIX1 result with full SHA, files, added predicates, negative cases, explicit ordinary-trigger regression, Ma Chao evidence, matrix totals, reserved status, scope confirmation, validation counts, and closure recommendation. Push and verify remote HANDOVER, then STOP.

## Acceptance
Pass only if the source-owned trigger requires the exact persisted ATTACK_RESPONSE source/target/resolver relationship proven by the real engine state; wrong-stage/wrong-resolver/substituted-role states fail closed; ordinary target-owned behavior has explicit real regression evidence; matrix remains 0 GAP; and no gameplay/UI/snapshot scope creep occurs.
