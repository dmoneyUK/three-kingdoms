# WTK UX V2 — Current Task Handoff

## Reviewed result — UX2.0C1-FIX

Branch: `ux-v2`
Reviewed implementation commit: `9b3d1df`

### Review decision

**ACCEPTED. UX2.0C2 is authorized.**

Repository inspection confirms the missing C1 gates are now materially covered:

- explicit checkpoint advancement exists;
- presentation revision can advance independently of checkpoint identity;
- child Frame creation, active Frame switching, Stage update, current-state update, and parent resume primitives exist;
- child Frames preserve Interaction identity and explicit parent relationship;
- origin fields are readonly at the shared type boundary and constructors/helpers defensively copy target arrays;
- redirect/current-target tests preserve immutable original targets;
- parser rejects duplicate Frame IDs, missing/self parents, missing active/checkpoint Frames, checkpoint-stage mismatch, malformed Frames, and invalid revisions;
- D1/API test persists `causal_envelope_json`, reloads through production room state, and verifies stable Interaction/Frame/Checkpoint/revision;
- acting vs waiting viewer receives different private CurrentAction options but identical public causal envelope;
- legacy NULL envelope projects as null;
- no broad gameplay propagation or React/CSS migration was started.

The Agent reports:
- focused causal primitives 6/6;
- D1/API persistence 2/2;
- PresentationV2 17/17;
- engine-backed PresentationV2 8/8;
- fast 105/105;
- API 212/212;
- build/lint/diff-check passed.

These reported command results were not re-run by the reviewer; the implementation and test definitions were inspected directly.

### C2 implementation constraints discovered during review

1. `CausalEnvelope` is now persisted independently from `pending_json`. C2 MUST update envelope + pending/phase/timeline atomically whenever they represent one semantic transition. Never write one and leave the other stale.
2. Do not use generic helper calls mechanically on every internal engine step. Identity/checkpoint changes occur only at semantic boundaries defined by C0.
3. `updateCausalFrameStage` currently updates checkpoint.stage in-place rather than creating a checkpoint. C2 must explicitly choose whether a Stage transition is a new semantic checkpoint. Do not assume the helper itself makes that decision.
4. `resumeCausalParentFrame` creates a new checkpoint via active-frame switch. Use it only when child→parent return is a real semantic boundary.
5. C2 must not infer causal metadata from card names/timeline prose. It must propagate metadata from authoritative orchestration entry/resume points.
6. Keep legacy/no-envelope compatibility during incremental propagation.
7. C2 is NOT permission for Group semantic classification, Dying barrier work, projector migration, or React work.

---

## NEXT TASK — UX2.0C2: Propagate Interaction and Frame Identity Through Authoritative Orchestration

### Objective

Connect the accepted causal envelope to real gameplay orchestration so Interaction/Frame/Checkpoint identity survives authoritative execution and resume boundaries.

C2 is about **identity propagation**, not PresentationV2 rendering.

At completion, engine-backed tests must prove causal lifetime through representative real flows without projector heuristics.

### Scope strategy

Do this incrementally in small slices. Do not modify every route branch at once.

Required C2 flows:

1. Attack → Dodge/decline → Damage
2. Attack → Damage → Dying → rescue/survive or defeat
3. Duel alternating responders
4. Negation → counter-Negation
5. Group/AOE participant progress + nested child effect/resume
6. Borrowed Sword → forced normal Attack child Frame
7. Judgement reveal/replacement/effective result/resume
8. nested damage trigger
9. redirect/current-target mutation if a real implemented redirect path exists
10. delayed future activation must start a NEW Interaction linked by `originRef` rather than reopening a settled one

If a required scenario has no real implemented gameplay path, document it as UNPROVEN rather than synthesizing gameplay behavior.

### Git constraints

Work only on `ux-v2`.

Do NOT:
- modify/merge `main`;
- self-merge `ux-v2`;
- change React/CSS;
- change gameplay rules;
- classify Group effects as SEQUENTIAL/ORDERED/GROUP yet;
- implement Dying `readyAfterEventId` changes yet;
- migrate PresentationV2 to depend on the envelope yet;
- repurpose `resolutionId`, timeline `event.id`, or `actionRevision`;
- create client-generated causal IDs;
- reconstruct missing identity from timeline prose/card names.

### Step 1 — map authoritative transition boundaries

Before broad editing, inventory the real orchestration functions that:
- accept an independent root effect;
- create Pending/Continuation;
- resume a Pending/Continuation;
- launch an independently resolving nested effect;
- settle a child and return to parent;
- finish an Interaction;
- schedule/activate delayed effects.

Add a concise mapping to `docs/UX_V2_0C2_CAUSAL_PROPAGATION.md`.

For every required scenario identify:
- root creation function;
- same-Frame response points;
- Stage/checkpoint boundaries;
- child-Frame creation points;
- parent resume point;
- interaction settlement point.

Do not infer this mapping from card name alone; use typed Pending/Continuation and authoritative orchestration behavior.

### Step 2 — centralize persisted causal writes

Add the smallest server/orchestrator persistence helpers needed to update:

```
pending_json
causal_envelope_json
phase
log/timeline when relevant
```

in the same D1 statement/batch/CAS boundary for a semantic transition.

Avoid scattering raw `causal_envelope_json = ?` SQL through dozens of unrelated branches.

Requirements:
- no envelope/pending torn state after a successful transition;
- stale/double command protection remains unchanged;
- failed transaction/action must not advance causal identity;
- legacy room with NULL envelope can still run.

### Step 3 — independent root Interaction creation

At authoritative acceptance of a new independently resolving root effect:

- create one `interactionId`;
- create root `frameId`;
- write immutable origin;
- initialize mutable current state;
- assign typed Stage;
- create initial checkpoint;
- persist atomically with the corresponding gameplay transition.

Do this only for real roots included in the C2 evidence matrix.

Do not create a new Interaction merely because `resolutionId` changes.

### Step 4 — same-Frame response propagation

Prove responses that satisfy/modify the current effect keep the same Interaction and Frame.

At minimum:
- Attack ↔ Dodge decision;
- Duel alternating Attack requirements;
- Negation/counter-Negation;
- ordinary Group participant response where no independent child effect launches;
- Judgement replacement/modification when it does not launch an independent effect.

Responder/current participant changes should create a new checkpoint only when they are a new stable player-facing boundary.

### Step 5 — child Frame propagation

Create a child Frame only for independently resolving nested effects.

Required real candidates:
- Group participant launches nested damage/trigger effect;
- Borrowed Sword launches a normal forced Attack;
- independently resolving nested damage trigger.

Requirements:
- same `interactionId`;
- new `frameId`;
- `parentFrameId` points to active parent;
- parent Frame remains in envelope;
- child has its own origin/current/stage/checkpoint;
- on settlement resume authoritative parent Frame exactly once.

Do not create child Frames for Duel response Attacks that merely satisfy Duel.

### Step 6 — Damage and Dying

For the proven direct Attack→Damage→Dying path, follow C0 semantics:

- remain in the same Interaction;
- keep the same Frame unless real engine evidence demonstrates an independently resolving effect;
- move Stage through DAMAGE → DYING;
- create checkpoints at meaningful damage/Dying/rescuer/settlement boundaries;
- preserve root origin.

Do NOT implement the Dying presentation barrier in C2.

Do NOT change rescue timer semantics.

If a trigger during Dying independently resolves, use a child Frame and document evidence.

### Step 7 — Group/AOE propagation WITHOUT classification

Carry Interaction/Frame identity through existing typed Group continuation and nested resume.

C2 may record that a Frame is in `GROUP_RESOLUTION` Stage.

C2 must NOT yet assign the final `resolutionSemantics` enum or invent ordered participant metadata. That is C3.

Prove:
- participant A→B keeps same Interaction and Group Frame;
- nested independent effect gets child Frame;
- child settles;
- parent Group Frame resumes;
- defeated/no-longer-applicable participant handling does not create a new Interaction merely because topology changes.

### Step 8 — Borrowed Sword

Use the real Borrowed Sword orchestration.

Expected model:
- Borrowed Sword requirement/effect = parent Frame;
- forced normal Attack = child Frame;
- Attack response/damage/Dying follows ordinary child Attack semantics;
- child settles and parent resumes;
- one Interaction across parent + child.

If actual engine semantics contradict this, STOP that slice and document evidence rather than forcing the design.

### Step 9 — Judgement

Propagate one Interaction/Frame through:
- judgement opens;
- reveal;
- replacement/modifier decision;
- effective result;
- delayed parent resumes.

If Judgement itself is already a nested independently resolving effect under another active Frame, represent it as child of that parent while keeping its own internal reveal/replacement in the same Judgement Frame.

### Step 10 — delayed future activation

Identify at least one real delayed/persistent effect path if implemented.

Prove:
- original Interaction settles;
- later activation creates a new `interactionId`;
- new root Frame;
- `originRef` links historical provenance where authoritative source data exists;
- no `parentFrameId` to the settled Interaction.

If no suitable real path exists, mark delayed activation UNPROVEN and do not fake one.

### Step 11 — Interaction settlement

Define one central/explicit rule for clearing or closing `causal_envelope_json` after:
- root Frame and descendants settle;
- no synchronous causal work remains;
- no blocking decision remains.

Do not clear it between same-Interaction checkpoints.

Do not retain a completed envelope into an unrelated next action.

If the final public settlement needs to remain visible after gameplay work ends, document how C7 will retain presentation settlement without falsely keeping the gameplay Interaction unresolved. Do not solve C7 here.

### Step 12 — legacy incremental behavior

During C2 migration, some flows may still enter with `causal_envelope_json = NULL`.

Requirements:
- they continue functioning;
- do not synthesize an envelope halfway through a legacy continuation using card/timeline guesses;
- new supported roots create envelopes authoritatively;
- unsupported/legacy paths may remain NULL until their next independent supported root.

### Step 13 — engine-backed tests

Extend real API/orchestrator tests.

For each proven scenario assert relevant identities at every stable boundary:

```
interactionId
activeFrameId
frame parent
stage
checkpointId
presentationRevision
origin
current
```

Required invariants:
- reconnect/read does not change IDs;
- second viewer sees same public IDs;
- actionRevision may change independently;
- Duel resolutionId changes do not change interactionId/frameId;
- Negation event/reference changes do not rewrite root origin;
- child Frame push/pop behaves correctly;
- root origin survives redirect/current mutation;
- envelope clears only at real Interaction settlement;
- stale/double action does not create extra Frame/checkpoint/revision.

Do not assert exact UUID values; assert equality/inequality/lifetime.

### Step 14 — compatibility tests

Keep all C1 tests.

Add explicit tests for:
- legacy NULL envelope gameplay path remains functional;
- room reload during active causal flow preserves envelope;
- malformed stored envelope safely falls back to legacy behavior without crashing.

Do not silently persist heuristic reconstruction for malformed envelopes.

### Step 15 — documentation

Create/update:

`docs/UX_V2_0C2_CAUSAL_PROPAGATION.md`

Include:
- authoritative transition map;
- exact functions modified;
- per-scenario Interaction/Frame/Stage/checkpoint behavior;
- atomic persistence strategy;
- settlement/clear rule;
- proven vs UNPROVEN scenarios;
- deviations from C0;
- remaining gates for C3.

Do not rewrite C0/C1 documents to hide differences.

### Step 16 — validation

Run and report exact results:
- causal primitive tests;
- causal API persistence tests;
- new C2 engine-backed tests;
- existing PresentationV2 tests;
- existing PresentationV2 engine tests;
- full fast suite;
- full API suite;
- build;
- lint;
- `git diff --check`.

### Step 17 — HANDOVER replacement

When C2 is complete, replace `HANDOVER.md` entirely with ONLY:

```
# WTK UX V2 — Current Task Handoff

## Completed task result — UX2.0C2

Branch:
Commit:
Files changed:

### Authoritative transition map implemented
...

### Root Interaction behavior
...

### Same-Frame behavior
...

### Child Frame behavior
...

### Damage/Dying behavior
...

### Group behavior
...

### Borrowed Sword behavior
...

### Judgement behavior
...

### Delayed activation behavior
...

### Settlement/clear rule
...

### Engine-backed evidence
...

### Tests
...

### Proven / UNPROVEN
...

### Remaining blockers for C3
...

## Awaiting review
```

No history.
Do not write the next task.

Commit and push to `ux-v2`.

### STOP CONDITION

After C2 is committed/pushed and HANDOVER contains only the C2 result:

**STOP.**

Do NOT start C3.
Do NOT classify Group resolution semantics.
Do NOT implement Dying barrier.
Do NOT migrate PresentationV2/React.
Wait for review.

## Acceptance criteria

C2 passes only if:
- new supported roots create authoritative Interaction/Frame identity;
- same-effect responses preserve Interaction/Frame;
- independently resolving nested effects use child Frames;
- parent resume is explicit and tested;
- direct Damage→Dying preserves causal root according to proven semantics;
- Group nested resume preserves identity without inventing order semantics;
- Borrowed Sword child Attack is proven or explicitly marked UNPROVEN from engine evidence;
- Judgement lifetime is proven;
- delayed activation is proven or explicitly UNPROVEN;
- envelope/pending semantic transitions are persisted atomically;
- reconnect/viewer switch do not regenerate identity;
- stale/double actions do not duplicate causal boundaries;
- settlement clears/closes active causal state at the correct boundary;
- legacy NULL/malformed envelope remains safe;
- no C3/C4/C5/React work has started;
- requested validation passes or failures are explicitly reported.
