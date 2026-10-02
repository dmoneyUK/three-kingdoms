# WTK UX V2 — Current Task Handoff

## Reviewer status

UX2.0C2-FIX7 is **PARTIAL / NOT ACCEPTED**. Do not start C3.

Reviewed implementation commit: `48d2c00656f034130597a6710949bc00b01ed08f`.

Accepted: Group and Duel now use explicit `CausalCreation<T>`; their new roots retain/persist envelopes; Group participant progression and Duel alternation reuse causal context; Duel response Attack is not a child Attack frame; sourced damage inherits Group/Duel context; no production recovery or hidden envelope carrier returned; reported suites pass.

Remaining blockers:
- dedicated Group stale/double causal-ID proof is still PARTIAL;
- dedicated Duel stale/double causal-ID proof is still PARTIAL;
- malformed/missing Group/Duel continuation proof is still PARTIAL;
- current Group evidence captures useful continuity after first-participant damage/trigger progression, but not the exact initial Group causal state before that progression;
- ordinary physical Duel passes through shared Stratagem/Negation orchestration and still lacks direct causal-envelope lifetime proof;
- FIX7 changed `startNegation()` so Group/Duel causal context can be inherited into Negation. We must explicitly decide whether nested Negation is a same-Frame Stage or an independently resolving child Frame. Do not silently treat this as settled architecture.

---

# NEXT TASK — UX2.0C2-FIX8: Group/Duel Safety + Nested Negation Semantics

## Goal

Close FIX7 safety evidence and define one causal rule:

When Negation opens while Group or Duel is active, decide from the existing engine lifecycle whether Negation is:
- `SAME_FRAME_STAGE`, or
- `CHILD_FRAME`.

Use the C0 rule: a child Frame is for an independently resolving nested effect; Stage is semantic progress within one Frame. If Negation suspends its parent, owns its own responder/counter chain, and resumes the parent only after settlement, default to `CHILD_FRAME` unless code inspection proves otherwise.

Do not start C3, Judgement completion, delayed activation, UI, or broad Group child work.

## 1. Inspect and document before coding

Trace real code for:

Group card → Group root → target Negation window → counter-Negation → affected target response → next participant.

Physical Duel → Duel root → Negation window → counter-Negation → Duel exchange → alternating Attack responses.

In `docs/UX_V2_0C2_CAUSAL_PROPAGATION.md` add `FIX8 Negation nesting decision` containing:
- suspended parent owner;
- Pending/Continuation that preserves parent;
- Negation responder/counter lifecycle;
- whether Negation has independent source/effect/resolver;
- chosen `SAME_FRAME_STAGE` or `CHILD_FRAME`;
- exact C0 reason.

Write this decision before implementation.

## 2. Implement the chosen nested-Negation rule

Current FIX7 path can pass inherited Group/Duel causal context directly into `startNegation()`. Do not leave ambiguous identity.

If `CHILD_FRAME`:
- start from the authoritative persisted parent envelope;
- create exactly one child Negation Frame;
- same interactionId, new frameId;
- child.parentFrameId = Group/Duel parent frameId;
- Pending Negation points to child;
- persist child envelope atomically with Negation Pending;
- every Negation and counter-Negation response stays in that same child;
- when the chain settles, resume the exact parent frame using the established parent-resume helper;
- never recreate the parent.

If `SAME_FRAME_STAGE`:
- keep one frameId;
- update authoritative frame stage/current resolver;
- restore Group/Duel stage/current after Negation;
- never create root/child during nested Negation.

For either choice:
- nested Negation never calls `createCausalRoot()`;
- never reconstruct from Pending context;
- never infer causal identity from resolutionId/event/log/card/actionRevision.

Independent top-level Negation may still create its own root.

## 3. Prove initial Group state directly

Use real Raining Arrows or Barbarian Invasion.

Immediately after initial card action reaches its first Group/Negation decision, before participant damage/trigger progression:
- assert public envelope exists;
- prove Group root frame exists;
- verify origin source/effect/original targets;
- verify persisted Pending causal IDs point to the expected active frame;
- capture interactionId, root frameId, checkpointId, presentationRevision;
- repeated read changes none of them;
- second viewer sees same public envelope.

If first decision is a Negation child, assert envelope contains Group parent + active Negation child and child.parentFrameId equals Group root frameId.

## 4. Prove ordinary physical Duel

Do not use Diao Chan Lust for this proof.

Through normal API:
1. play physical Duel;
2. capture Duel root and first Negation decision;
3. resolve/pass Negation normally;
4. prove causal state resumes/preserves the original Duel frame;
5. prove persisted Duel Pending points to Duel frame;
6. responder plays Attack;
7. opponent becomes next responder while interactionId and Duel frameId remain unchanged;
8. prove response Attack did not create a child Attack frame;
9. settle Duel and prove envelope clears.

If nested Negation is CHILD_FRAME, explicitly assert parent/child/resume identities.

## 5. Group stale/double causal proof

At a real Group participant decision capture interactionId, activeFrameId, checkpointId, presentationRevision, Pending causal IDs, and responder card state.

Send intentionally stale actionRevision/request.

Assert:
- 409/stale according to existing contract;
- all captured causal values unchanged;
- Pending unchanged;
- card not consumed;
- participant not advanced;
- no duplicate log/effect.

Then submit valid response. If practical, send two concurrent valid submissions from one revision: one winner, one stale loser, one effect/card consumption, no second root/frame.

## 6. Duel stale/double causal proof

Repeat the same proof using ordinary physical Duel:
- stale response leaves interaction/frame/checkpoint/revision unchanged;
- Attack card remains;
- valid response advances opponent but retains Duel frame;
- duplicate/concurrent response cannot create another root/frame.

Generic Attack stale evidence is not sufficient.

## 7. Malformed/missing continuation proof

Create named real tests for both Group and ordinary Duel.

While continuation is active:
- corrupt or NULL only `causal_envelope_json` via DB test seam;
- keep Pending causal context untouched;
- room projection must expose causalEnvelope null;
- continue current gameplay action through API;
- no 500;
- do not reconstruct an envelope from Pending;
- do not create a new root mid-continuation;
- no guessed IDs/checkpoint;
- effect/card/log occurs at most once.

If continuing without authority is unsafe, use an existing controlled stale/legacy-safe outcome rather than fabricating identity.

## 8. Counter-Negation proof

Use a real Group or Duel flow with Negation answered by Negation.

Prove:
- interactionId stays constant;
- parent Group/Duel identity is retained;
- no counter card creates a new root;
- CHILD_FRAME choice: all Negation/counter responses remain in one Negation child frame;
- SAME_FRAME choice: one parent frame remains active;
- parent origin stays immutable;
- current resolver follows responder;
- settlement returns to parent exactly once.

Never create one frame per Negation card.

## 9. Exact FIX8 matrix

Add exactly:

| Requirement | Status | Exact evidence | Remaining gap |
| --- | --- | --- | --- |
| Group first root persisted before participant progression | ... | ... | ... |
| Group nested Negation follows FIX8 decision | ... | ... | ... |
| Group Negation resumes/preserves exact parent | ... | ... | ... |
| Group stale request preserves causal identity | ... | ... | ... |
| Group duplicate response cannot duplicate causal transition | ... | ... | ... |
| Group malformed/missing continuation does not fabricate authority | ... | ... | ... |
| ordinary physical Duel root exact persistence | ... | ... | ... |
| Duel nested Negation follows FIX8 decision | ... | ... | ... |
| Duel Negation resumes/preserves exact parent | ... | ... | ... |
| Duel response Attack remains Duel frame | ... | ... | ... |
| Duel stale request preserves causal identity | ... | ... | ... |
| Duel duplicate response cannot duplicate causal transition | ... | ... | ... |
| Duel malformed/missing continuation does not fabricate authority | ... | ... | ... |
| counter-Negation stays in one nested causal unit | ... | ... | ... |
| nested Negation never creates a new Interaction root | ... | ... | ... |

Statuses only: `PROVEN | PARTIAL | UNPROVEN | NOT IMPLEMENTED IN GAME`. PROVEN requires named real API/engine evidence.

## 10. Documentation consistency

Update the transition map to distinguish:
- independent/root Negation;
- nested Negation inside Group/Duel.

Remove any statement implying every Negation is always a new root.

Judgement nested Negation may be documented as intended to follow the same rule, but remains UNPROVEN unless tested in this slice.

## 11. Regression and validation

Keep green:
- FIX6 Attack ownership/stale/malformed;
- Cavalry Attack-targeted;
- lethal Attack→Damage→Dying→rescue;
- Borrowed Sword child/resume;
- existing Group and Duel/Lust gameplay;
- PresentationV2 unit/engine.

Run focused Group, ordinary Duel, Lust, Negation/counter tests, presentation-causality, concurrency, Borrowed Sword, Ma Chao, causal primitive/context/persistence, PresentationV2 unit/engine, full `npm run test:fast`, full canonical API suite, build, lint, and `git diff --check`. Report exact commands/counts.

Before commit summarize results of searches for:
- `startNegation(`;
- `createCausalRoot`;
- child/resume causal helpers;
- `recoverCausalEnvelope`;
- hidden causalEnvelope property patterns.

## Scope exclusions

Do not start C3; do not solve every Group nested Damage case; do not implement independent Damage fixture; do not finish Judgement; do not add delayed provenance; do not change Dying barrier; do not migrate PresentationV2; do not modify React/CSS; do not change gameplay rules.

## Execution result

Append only a `C2-FIX8 execution result` section containing:
- branch and actual pushed full implementation SHA;
- files changed;
- Negation nesting decision;
- Group first-entry proof;
- ordinary Duel proof;
- Group stale/double proof;
- Duel stale/double proof;
- Group/Duel corruption proof;
- counter-Negation proof;
- exact FIX8 matrix;
- documentation consistency;
- validation;
- remaining C2 work.

Push implementation + appended result to `origin/ux-v2` and STOP. Do not clean HANDOVER.

## Acceptance

FIX8 passes only if all five areas are real-test proven: initial Group root, ordinary physical Duel root, Group/Duel stale safety, Group/Duel malformed safety, and chosen nested-Negation semantics including counter-Negation and exact parent return. No nested Negation may create a new Interaction root. No out-of-scope C3/UI/gameplay redesign.
