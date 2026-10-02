# WTK UX V2 — Current Task Handoff

## Reviewer status

UX2.0C2-FIX2 is **PARTIAL / NOT ACCEPTED**. Do not start C3.

The latest implementation commit reported by the Agent is `ca7a037`.

### Accepted

- A reusable `causalRoomStateWrite()` now writes phase, Pending, log, causal envelope, and optional deck/discard in one room UPDATE.
- Ordinary Attack response/targeted entry and root Negation/Judgement-Negation have more consistent atomic entry writes.
- Real Attack API evidence now checks that persisted Pending causal IDs match the persisted/public envelope at root response entry.
- Borrowed Sword child Frame work from the prior slice remains useful.
- The Agent correctly did not claim C2 completion.

### Review findings that still block C2

1. The new atomic helper is only applied to selected entry paths. The Agent explicitly reports automatic continuations are still PARTIAL.
2. `Attack → Damage → Dying` remains UNPROVEN.
3. Group nested child push/resume remains UNPROVEN.
4. independent nested-damage child semantics remain UNPROVEN.
5. Judgement end-to-end lifetime remains UNPROVEN.
6. Duel and counter-Negation full identity lifetime remain insufficiently engine-backed.
7. delayed activation/originRef remains UNPROVEN.
8. global Interaction settlement/envelope clear remains PARTIAL.
9. reconnect/viewer/stale/corruption evidence is not complete across real C2 flows.
10. The current generic persistence test still manually overwrites `causal_envelope_json` after opening a real Attack. That proves C1 projection behavior, not the remaining C2 lifetime.
11. `attackDeclaration()` creates a causal root but retains only its small context; `causalEnvelopeForAttack()` can later recreate an envelope through `recoverCausalEnvelope()`. This means the authoritative envelope/checkpoint is not necessarily carried intact from root creation to persistence. Repeated or partial recovery must not become the architecture.
12. `recoverCausalEnvelope()` can only rebuild a single Frame from a context. It cannot safely reconstruct an existing parent/child frame tree. It must not be used to manufacture authority for nested flows.

The next task is intentionally narrower. Do not add another broad slice. Close the causal ownership model first, then prove the highest-value real lifetimes.

---

# NEXT TASK — UX2.0C2-FIX3: Make the Persisted Envelope the Runtime Authority

## Objective

Remove the remaining “causal handle first, reconstruct envelope later” ambiguity.

For supported C2 flows, authoritative root/child/checkpoint creation must update and carry the real `CausalEnvelope` through runtime persistence. Pending/Continuation `CausalContext` is only a reference into that envelope.

Then close the core real-flow evidence: Attack→Damage→Dying, Group child/resume, Judgement, settlement/clear, and stale/reconnect stability.

Do not start C3.

## Workflow

Work only on `ux-v2`.

At start:
```
git fetch origin
git checkout ux-v2
git pull --ff-only origin ux-v2
```

Do not merge/modify `main`. Do not self-merge.

The Code Agent appends its result to this file. The reviewer cleans/replaces HANDOVER after review.

## Step 1 — audit every recoverCausalEnvelope call

List every production call to `recoverCausalEnvelope()` in `docs/UX_V2_0C2_CAUSAL_PROPAGATION.md`.

For each call classify:
- LEGACY COMPATIBILITY ONLY;
- SAFE AUTHORITATIVE REHYDRATION;
- UNSAFE/PARTIAL RECONSTRUCTION.

Rules:
- never infer IDs from card names/log/timeline/resolutionId/event.id/actionRevision;
- never rebuild a child tree from only a child handle;
- never silently replace a malformed/missing multi-Frame envelope with a one-Frame envelope;
- never generate a new checkpoint merely because a room read/reconnect occurred.

If a typed context cannot reconstruct the complete authoritative envelope, return/use legacy null behavior rather than inventing structure.

## Step 2 — preserve the actual root envelope

Refactor supported root creation so the envelope created by `createCausalRoot()` is not immediately discarded.

For a new supported root:
- create root envelope once;
- persist that exact envelope with the corresponding Pending/phase transition;
- Pending stores only its reference context;
- no later helper recreates the root envelope/checkpoint for the normal path.

Required proof:
- checkpointId created at root remains identical after persistence/read/reconnect;
- presentationRevision remains unchanged by reads;
- no duplicate root/checkpoint on repeated/stale command.

Keep legacy compatibility separate and explicit.

## Step 3 — make child creation operate only on persisted authoritative parent

For Borrowed Sword, Group nested effects, and nested damage:
- parse/use the authoritative persisted parent envelope;
- create child from that envelope;
- persist child envelope + child Pending atomically;
- do not recover a fake parent tree from a child/pending handle;
- resume the stored parent exactly once after child settlement.

If parent envelope is absent/malformed in a legacy room, keep gameplay functional using legacy behavior, but do not claim/project a fabricated child tree.

## Step 4 — finish semantic atomic-write coverage

Use `causalRoomStateWrite()` or a clearly equivalent centralized guarded helper for all supported C2 semantic transitions.

Do not mechanically convert unrelated SQL.

At minimum cover transitions exercised by:
- Attack response → Dodge/decline → Damage;
- Damage → Dying;
- Dying rescue/settlement;
- Duel responder advance;
- Negation/counter advance;
- Group participant advance;
- Group child push/resume;
- Borrowed Sword child push/resume/settlement;
- Judgement reveal/replacement/effective/resume.

Where player writes must accompany room writes, use the existing D1 batch/guard pattern so room causal state cannot advance independently.

## Step 5 — real Attack → Damage → Dying proof

Add one engine/API scenario using a lethal Attack.

Observe the real persisted/public envelope at each stable boundary.

Must prove:
- one root interactionId;
- one Attack frameId through response/Damage/Dying unless an actual independent child starts;
- checkpoint changes only at semantic boundaries;
- immutable Attack origin remains;
- mutable current resolver/target updates;
- reconnect does not regenerate IDs;
- second viewer sees same public identity;
- rescue/survive or defeat completes correctly;
- envelope clears only after the causal Interaction is actually finished.

No Dying presentation-barrier changes.

## Step 6 — real Group child/resume proof

Use an existing engine path that genuinely launches an independent nested effect.

Prove:
- persisted Group parent;
- child has new frameId + same interactionId + parentFrameId;
- parent remains in envelope;
- child active during nested work;
- child settlement resumes parent once;
- resumed parent gets appropriate semantic checkpoint;
- envelope not cleared while parent work remains.

Do not classify Group order semantics.

If no current Group path truly launches an independent effect, mark NOT IMPLEMENTED/UNPROVEN with concrete code evidence and do not fake one.

## Step 7 — nested damage semantics

Use a real damage-trigger path.

Determine from engine behavior whether it is:
- same Frame modifier/continuation, or
- independently resolving child.

Test the real result. Do not force a child because the design expected one.

## Step 8 — Judgement end-to-end

Prove real:
- entry;
- reveal;
- replacement/modifier where implemented;
- effective result;
- resume.

If Judgement is nested, prove parent linkage/resume. If it is root in that scenario, prove root lifetime.

Internal same-effect Judgement steps must not create arbitrary new Interactions.

## Step 9 — Duel and Negation lifetime regression

Duel engine test:
- alternating actors;
- same interactionId/frameId;
- response Attack is not child;
- actionRevision/resolutionId changes do not redefine causal identity.

Negation engine test:
- counter window preserves root origin;
- event/reference changes do not change interaction/frame identity;
- same-effect counter remains same Frame unless actual engine semantics prove independent child.

## Step 10 — settlement/clear as one explicit rule

Implement one authoritative helper/rule for closing causal state.

It may clear `causal_envelope_json` only when:
- root and descendants are settled;
- no synchronous continuation remains;
- no blocking decision remains.

Prove:
- child active => not clear;
- parent resumed => not clear;
- root complete => clear;
- unrelated next root => new interactionId;
- stale command cannot resurrect old envelope.

Do not keep an unresolved gameplay envelope merely for future UI animation. Presentation settlement retention is later work.

## Step 11 — delayed activation

Only after settlement rule is reliable, inspect a real delayed/persistent effect.

If authoritative provenance exists:
- old interaction clears;
- future activation gets new interactionId/frameId;
- originRef links provenance;
- no parentFrameId crosses interactions.

If provenance is not stored, mark UNPROVEN and state exactly what future authoritative field is needed. Do not invent it in C2-FIX3 unless it is a minimal server-owned addition with direct engine evidence.

## Step 12 — replace weak evidence with real-flow evidence

Keep C1 manual-storage tests if still useful, but they cannot be cited as C2 proof.

For every C2 PROVEN row, documentation must name a real engine/API test that:
- executes gameplay;
- observes persisted/public causalEnvelope;
- asserts lifetime across the transition.

Helper-only tests must be labelled helper evidence.

## Step 13 — required evidence matrix

Update the C2 document with these rows:

- root envelope preserved without normal-path reconstruction
- Attack → Dodge
- Attack → Damage
- Attack → Damage → Dying
- Duel alternating responders
- Negation → counter-Negation
- Group participant progression
- Group → child → parent resume
- Borrowed Sword → child Attack → parent resume
- Judgement reveal/replacement/effective/resume
- nested damage semantics
- redirect/current-target mutation
- delayed activation
- settlement/clear
- reconnect
- second viewer
- stale/double command
- legacy NULL
- malformed envelope

Status must be one of:
`PROVEN | PARTIAL | UNPROVEN | NOT IMPLEMENTED IN GAME`.

A row is PROVEN only with named engine/API test evidence.

## Step 14 — compatibility

Legacy NULL/malformed rooms must remain safe.

Important:
- legacy gameplay may continue without causal envelope;
- do not fabricate public causal authority halfway through an unsupported legacy continuation;
- a new independent supported root may start a fresh authoritative envelope normally.

## Step 15 — validation

Run after final code change:
- causal primitive tests;
- causal-context tests;
- causal persistence tests;
- all C2 engine/API tests;
- PresentationV2 unit tests;
- PresentationV2 engine tests;
- full fast suite;
- full API suite;
- build;
- lint;
- `git diff --check`.

Report exact counts.

## Scope exclusions

Do NOT:
- start C3;
- classify Group resolution semantics/order;
- implement Dying readyAfterEventId/barrier changes;
- migrate PresentationV2 to causal envelope;
- modify React/CSS;
- change gameplay rules just to satisfy tests;
- repurpose resolutionId/event.id/actionRevision;
- add client causal IDs.

## Execution-result format

Append only:

```
---

## C2-FIX3 execution result — <date>

Branch:
Implementation commit:
Files changed:

### Envelope authority changes
...

### recoverCausalEnvelope audit
...

### Evidence matrix
...

### Attack/Damage/Dying proof
...

### Child/resume proofs
...

### Judgement/Duel/Negation proof
...

### Settlement/clear proof
...

### Compatibility/stale/reconnect proof
...

### Validation
...

### Remaining PARTIAL / UNPROVEN
...
```

Push to `ux-v2` and STOP.

## Acceptance criteria

C2-FIX3 passes only if:
- supported normal roots persist the actual created envelope instead of recreating it later;
- Pending causal handles are references, not the authority;
- nested child Frames require an authoritative parent envelope;
- automatic semantic transitions exercised by supported C2 flows persist gameplay + causal state consistently;
- Attack→Damage→Dying is engine-backed;
- Group child/resume is proven where the engine actually supports an independent nested effect;
- Judgement lifetime is engine-backed;
- Duel/Negation invariants are engine-backed;
- settlement/clear is explicit and engine-backed;
- reconnect/viewer/stale behavior does not regenerate identity;
- legacy/corrupt state remains safe without fabricated causal structure;
- remaining UNPROVEN items are explicit;
- no C3/Dying-barrier/PresentationV2/React work begins.
