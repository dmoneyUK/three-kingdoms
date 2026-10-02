# WTK UX V2 — Current Task Handoff

## Reviewer status

The submitted UX2.0C2 result is **PARTIAL**. Do not start C3.

Confirmed from the submitted result:
- causal handles now propagate through several Pending/Continuation paths;
- server-owned causal-context helpers were added;
- Attack/Attack-targeted, Group, Duel, Negation, Damage, Judgement and Borrowed Sword received partial propagation;
- no React/CSS, Group-classification, Dying-barrier or PresentationV2 migration was started;
- reported validation: causal-context 2/2, focused causal 8/8, fast 107/107, API 212/212, build/lint/diff-check passed.

The submitted result explicitly leaves two C2 acceptance gates open:
1. room causal envelope + Pending/phase/timeline are not yet updated through one consistent authoritative atomic/CAS boundary for all supported transitions;
2. complete runtime child-Frame creation/resume wiring is not yet finished.

These gaps block C3.

---

# NEXT TASK — UX2.0C2-FIX: Close Runtime Causal Propagation

## Objective

Finish C2. Convert the current partial causal-reference propagation into authoritative persisted Interaction/Frame lifetime across the supported real gameplay flows.

Do not expand into C3.

## Branch / workflow

Work only on `ux-v2`.

At start:
```
git fetch origin
git checkout ux-v2
git pull --ff-only origin ux-v2
```

Do not merge or modify `main`. Do not self-merge `ux-v2`.

The Code Agent does **not** clean or replace HANDOVER. When finished, append a concise execution-result section to the bottom of this file and push it with the implementation. The reviewer will clean and replace HANDOVER after review.

## 1. Audit the partial C2 implementation first

Before editing, inspect:
- `game/causal-context.ts`
- `game/presentation-causality.ts`
- `app/api/causal-envelope.ts`
- all Pending/Continuation causal-reference additions
- every room SQL write touched by the supported flows
- existing C1/C2 causal tests
- `docs/UX_V2_0C2_CAUSAL_PROPAGATION.md`

Create a short table in the C2 doc for each flow:
- root envelope created?
- same Frame preserved?
- child Frame actually created in persisted envelope?
- parent actually resumed?
- checkpoint updated?
- envelope + gameplay state atomic?
- settlement clears envelope?
- engine-backed test?

Do not rely on the previous handoff claim; verify code paths.

## 2. Centralize authoritative room causal persistence

Implement the smallest reusable server/orchestrator persistence boundary needed so a semantic transition writes the relevant authoritative state together:

```
pending_json
causal_envelope_json
phase
log_json / timeline state when changed by the same transition
```

Requirements:
- successful semantic transition cannot persist new Pending with stale envelope;
- cannot persist new envelope with stale Pending;
- failed/stale/double action must not advance checkpoint/revision or create a Frame;
- preserve existing stale-command protection;
- legacy `NULL` envelope remains supported;
- avoid raw causal-envelope SQL duplicated across many branches.

Use D1 batch/CAS patterns already used by this route. Do not invent a second rules engine.

## 3. Finish authoritative root creation

For every C2-supported independent root, the envelope must be created at authoritative root acceptance, not repaired later by presentation/projector logic.

At minimum verify real supported roots for:
- Attack;
- Duel;
- Negation-capable stratagem root where applicable;
- Group/AOE root;
- Borrowed Sword;
- Judgement/deferred judgement entry where applicable.

If a path is intentionally unsupported in C2, mark it UNPROVEN. Do not synthesize identity from card name, log text, `resolutionId`, or timeline event ID.

## 4. Finish same-Frame runtime propagation

Engine-backed tests must prove same Interaction + same Frame through:
- Attack response;
- Duel alternating response actors;
- Negation and counter-Negation;
- ordinary Group participant advancement when no independent nested effect starts;
- Judgement reveal/replacement/effective-result steps that belong to one Judgement Frame.

Checkpoint may change at stable player-facing decisions. `actionRevision` may change independently.

Do not create a child Frame merely because a response uses an Attack card inside Duel.

## 5. Finish REAL child-Frame wiring

This is a hard acceptance gate.

For each real independently resolving nested effect that exists in current gameplay:

### Group nested effect
- parent Group Frame remains stored;
- nested effect creates a new child `frameId`;
- child `parentFrameId` = parent Group Frame;
- same `interactionId`;
- child becomes active;
- after child settlement, parent becomes active again exactly once;
- new parent checkpoint is created only at the real resume boundary.

### Borrowed Sword
Expected unless engine evidence disproves it:
- Borrowed Sword = parent Frame;
- forced normal Attack = child Frame;
- child Attack keeps its Frame through Dodge/Damage/Dying;
- child settlement resumes Borrowed Sword parent;
- one Interaction across both.

### Nested damage trigger
If the existing trigger launches an independently resolving effect:
- create child Frame;
- preserve parent;
- resume parent after child settlement.

If engine evidence shows a candidate is not independently resolving, document that and keep it same Frame rather than forcing the design.

Tests must inspect the persisted/public `causalEnvelope`, not only causal handles embedded in Pending.

## 6. Finish Damage → Dying lifetime

For a real lethal Attack path prove:
- Attack root Interaction survives;
- Frame remains the same unless an independently resolving child actually starts;
- Stage moves to DAMAGE then DYING at semantic boundaries;
- immutable Attack origin survives;
- current resolver/target reflects Dying/rescue state;
- reconnect does not regenerate identity;
- rescue/survival or defeat resumes/settles correctly.

Do NOT change rescue timer semantics.
Do NOT implement the separate Dying presentation-barrier task yet.

## 7. Finish Group runtime behavior without C3 classification

Do not set final `resolutionSemantics`.

Prove:
- participant progression keeps parent Group Interaction/Frame;
- nested child push/resume works;
- topology/defeat changes do not create a new Interaction by themselves;
- envelope and Group continuation cannot become torn.

Participant ordering semantics remain C3.

## 8. Judgement runtime lifetime

Prove through the real engine:
- judgement entry;
- reveal;
- replacement/modifier decision if available;
- effective result;
- resume to delayed parent.

If Judgement is a nested independent effect, make it a child Frame of its actual parent. Internal Judgement decisions stay within that Judgement Frame unless engine semantics require another independent effect.

## 9. Delayed activation

Use a real implemented delayed/persistent effect if available.

Required semantics:
- old Interaction settles;
- later activation starts a NEW `interactionId`;
- new root Frame;
- use `originRef` only when authoritative provenance is available;
- never use `parentFrameId` across two settled/separate Interactions.

If no real path can prove this safely, record `UNPROVEN`; do not fake a test fixture and call it engine evidence.

## 10. Settlement / clear rule

Implement and test one explicit authoritative rule:

Clear/close `causal_envelope_json` only when:
- root and all child Frames have settled;
- no synchronous causal work remains;
- no blocking decision remains.

Do not clear between checkpoints in one Interaction.
Do not leak a completed Interaction into the next unrelated action.

C2 does not need to solve later UI settlement display; document that as later presentation work.

## 11. Compatibility and corruption behavior

Prove:
- legacy `NULL` envelope gameplay still works;
- malformed envelope does not crash gameplay;
- do not reconstruct malformed/missing causal identity from logs/card names;
- reconnect/read does not mutate identity;
- different viewers receive identical public causal identity.

## 12. Required engine-backed evidence matrix

At minimum report each as `PROVEN`, `PARTIAL`, `UNPROVEN`, or `NOT IMPLEMENTED IN GAME`:

- Attack → Dodge
- Attack → Damage
- Attack → Damage → Dying
- Duel alternating responses
- Negation → counter-Negation
- Group participant progression
- Group → nested child → parent resume
- Borrowed Sword → forced Attack child → parent resume
- Judgement reveal/replacement/effective/resume
- nested damage trigger
- redirect/current-target mutation
- delayed future activation
- settlement/clear
- stale/double command identity safety
- reconnect/viewer stability

C2-FIX is accepted only when all scenarios required by existing implemented engine behavior are proven, or a concrete engine limitation is documented. Do not hide PARTIAL items.

## 13. Tests

Add/extend real API/orchestrator tests. Do not rely only on unit helper tests.

For stable boundaries assert as relevant:
```
interactionId
activeFrameId
parentFrameId
stage
checkpointId
presentationRevision
origin
current
```

Also assert:
- identity equality/inequality across boundaries;
- persisted envelope after reload;
- parent resume;
- envelope clearing;
- stale action does not duplicate identities;
- second viewer stability.

Do not assert literal random UUID values.

## 14. Documentation

Update:
`docs/UX_V2_0C2_CAUSAL_PROPAGATION.md`

Include:
- authoritative transition map;
- persistence strategy;
- exact root/child/resume/settlement functions;
- evidence matrix;
- remaining UNPROVEN items;
- deviations from C0/C1.

Do not rewrite C0/C1 history.

## 15. Scope exclusions

Do NOT:
- start C3;
- classify Group as SEQUENTIAL/ORDERED/GROUP;
- implement Group order metadata;
- implement Dying `readyAfterEventId` barrier changes;
- migrate PresentationV2 to the envelope;
- modify React/CSS;
- change game rules to make a causal test pass;
- repurpose `resolutionId`, event IDs, or `actionRevision`.

## 16. Validation

Run and report exact results:
- causal primitive tests;
- causal persistence tests;
- C2/C2-FIX engine-backed tests;
- `tests/presentation-v2.test.mjs`;
- `tests/api/presentation-v2-engine.test.mjs`;
- full fast suite;
- full API suite;
- build;
- lint;
- `git diff --check`.

Any failure must be reported.

## 17. Execution-result handoff

The Code Agent must **append only** a concise section at the bottom of this HANDOVER:

```
---

## C2-FIX execution result — <date>

Branch:
Implementation commit:
Files changed:

### Completed
...

### Evidence matrix
...

### Atomic persistence
...

### Child Frame runtime proof
...

### Settlement/clear proof
...

### Tests
...

### Remaining PARTIAL / UNPROVEN
...
```

Do not delete/rewrite the task. The reviewer will clean HANDOVER after reviewing the result.

Commit and push implementation + appended result to `ux-v2`.

## STOP CONDITION

After C2-FIX is pushed:

**STOP.**

Do not start C3.
Do not perform additional architecture work.
Wait for reviewer inspection.

## Acceptance criteria

C2-FIX passes only if:
- persisted envelope is authoritative, not merely Pending causal references;
- semantic gameplay state + causal envelope are atomically consistent;
- real child Frames are created/resumed in persisted envelope;
- same-Frame flows preserve Frame identity;
- Damage/Dying lifetime is engine-backed;
- Group nested resume is engine-backed without premature order classification;
- Borrowed Sword child Attack is proven or concretely UNPROVEN;
- Judgement lifetime is proven;
- settlement/clear is explicit and tested;
- reconnect/viewer/stale-command identity safety is tested;
- legacy NULL/malformed state remains safe;
- no C3/Dying-barrier/PresentationV2/React work is included;
- validation passes or failures are explicitly reported.
