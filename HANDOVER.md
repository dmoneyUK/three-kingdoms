# WTK UX V2 — Current Task Handoff

## Reviewer status

UX2.0C2-FIX3 is **PARTIAL / NOT ACCEPTED**. Do not start C3.

The Agent did improve the lethal Attack → Damage → Dying path, but the submitted slice explicitly leaves most FIX3 acceptance gates open.

### Accepted from this slice

- A real lethal Attack API path now observes one persisted causal Interaction through Attack response into Dying.
- Damage/Dying stage updates operate on an already persisted matching envelope through `causalEnvelopeAtStage()`; absent/mismatched envelopes are not replaced there.
- Dying entry atomically persists phase/Pending/deck/discard/log/envelope through `causalRoomStateWrite()`.
- Successful Peach rescue has an explicit assertion that the settled causal envelope clears.
- `startJudgementNegation()` now demonstrates the desired root pattern: create `causalRoot`, put its context in Pending, and persist `causalRoot.envelope` directly.

### Why FIX3 is still not accepted

1. The requested root-authority refactor is incomplete. Production Attack paths still contain normal-path `recoverCausalEnvelope()` reconstruction, including Attack-targeted entry.
2. `damageTriggerPending()` and `damageSufferedTriggerPending()` can still create a root and retain only `.context`, discarding the newly created envelope. That repeats the ownership problem FIX3 was intended to remove.
3. The lethal test proves Attack→Dying identity and rescue clear, but it does not yet prove the complete requested checkpoint/revision/reconnect/second-viewer/stale invariants.
4. The evidence document still labels Attack→Damage and Attack→Damage→Dying PARTIAL; it has not been updated to the exact FIX3 matrix or exact new boundary claims.
5. Group child/resume remains UNPROVEN.
6. independent nested-damage semantics remain UNPROVEN.
7. Judgement causal-envelope lifetime remains PARTIAL.
8. Duel and counter-Negation causal-envelope lifetime remain PARTIAL.
9. delayed activation/originRef remains UNPROVEN.
10. global settlement/clear remains PARTIAL.
11. malformed real-gameplay row behavior and complete stale/double identity safety remain incomplete.
12. The execution result says implementation commit is “pending commit and push”, so it does not provide a reviewable implementation SHA. The remote code does contain the reported changes, but future results must report the actual pushed commit SHA.

The next task is deliberately smaller than FIX3. Do not attempt all remaining C2 scenarios at once.

---

# NEXT TASK — UX2.0C2-FIX4: Close Envelope Ownership Before More Scenario Work

## Objective

Finish one architectural invariant:

> A supported causal root must create one authoritative `CausalEnvelope`, and that exact envelope must be carried to persistence. A `CausalContext` is only a reference into an existing envelope and must never be sufficient for normal-path root reconstruction.

Do not add Group/Judgement/Duel feature coverage in this slice. First eliminate normal-path envelope reconstruction and context-only root creation.

## Workflow

Work only on `ux-v2`.

At start:
```
git fetch origin
git checkout ux-v2
git pull --ff-only origin ux-v2
```

Do not modify/merge `main`. Do not self-merge.

Append the execution result to this HANDOVER; do not clean/replace it.

## Step 1 — inventory every root creator and recovery call

In `docs/UX_V2_0C2_CAUSAL_PROPAGATION.md`, add two exact inventories:

### Root creators

Find every production `createCausalRoot(...)` call and record:
- function;
- flow;
- whether both envelope + context are retained;
- where the exact envelope is persisted;
- status: `AUTHORITATIVE | CONTEXT_ONLY_BUG | LEGACY_ONLY`.

### Recovery calls

Find every production `recoverCausalEnvelope(...)` call and record:
- function;
- flow;
- why recovery exists;
- whether it is reachable in a newly created supported flow;
- status: `LEGACY_ONLY | REMOVE_FROM_NORMAL_PATH | UNSAFE`.

Do this before implementation.

## Step 2 — introduce an explicit root result through orchestration

Where a helper can create a new root, it must not return/store only `CausalContext`.

Use one explicit pattern, for example a typed structure containing:
- `context`;
- `envelope` when this call created the root.

The exact type/name is up to the implementation, but ownership must be obvious at compile time.

Rules:
- existing causal context passed in => no new root envelope;
- no context passed => create root once and return both context + envelope;
- caller that crosses persistence boundary must persist the returned envelope atomically;
- do not regenerate it later.

Do not put the full envelope into Pending JSON. Pending keeps only causal reference/context.

## Step 3 — fix Attack root ownership completely

Refactor the ordinary Attack path and Attack-targeted path so:
- `attackDeclaration()` does not discard a newly created root envelope;
- the exact root envelope is persisted with the first authoritative Attack Pending/phase transition;
- `causalEnvelopeForAttack()` is removed from the supported normal path, preferably deleted if no legacy-only use remains;
- Attack-targeted entry does not call `recoverCausalEnvelope()` for a newly created Attack;
- checkpointId and presentationRevision from root creation survive unchanged into the persisted envelope.

Add a real API assertion comparing the root object before persistence if accessible through a test seam, or otherwise prove no recovery call is used and that the persisted checkpoint remains stable across first response read/reconnect.

## Step 4 — fix Damage root ownership

Refactor:
- `damageTriggerPending()`;
- `damageSufferedTriggerPending()`;
- any directly related helper that creates a DAMAGE root.

They must not do:
`createCausalRoot(...).context`
without retaining/persisting the envelope.

For Attack-derived damage:
- reuse the existing Attack envelope/context;
- do not create a Damage root.

For genuinely independent root damage:
- create one DAMAGE root envelope;
- persist that exact envelope at its first Pending/phase boundary.

If a helper cannot persist itself, return the root envelope to the authoritative caller.

## Step 5 — restrict recoverCausalEnvelope to legacy-only compatibility

After Steps 2–4:
- no newly created supported Attack/Damage root may depend on `recoverCausalEnvelope()`;
- no nested child path may reconstruct a parent from only a child/context handle;
- recovery may remain only for a clearly documented legacy/migration case where the complete authoritative identity is known safe.

If there is no safe legacy use, remove the helper from production routing.

Add a regression test proving a supported new root works with recovery unavailable/not invoked by architecture. Do not use brittle source-text assertions if a behavioral test can prove it.

## Step 6 — preserve current lethal Attack → Dying behavior

The new ownership refactor must retain the accepted behavior from the previous slice:
- same interactionId/frameId through Attack→Damage→Dying;
- stage reaches DYING;
- immutable original target remains;
- successful rescue clears envelope;
- gameplay/log counts remain exactly once.

Do not broaden Dying behavior.

## Step 7 — root identity stability tests

Add real API tests for the refactored Attack root:
- first persisted envelope has one frame;
- repeated room reads do not change interactionId/frameId/checkpointId/presentationRevision;
- second viewer sees identical public envelope;
- stale/double response does not create a second root or advance causal revision twice;
- after settlement, a later unrelated supported root gets a fresh interactionId.

For independent root Damage, add equivalent root-persistence assertions if the engine has a straightforward real API path. Otherwise document the missing route and do not fake it.

## Step 8 — legacy/corrupt behavior

Test:
- legacy NULL room can continue its existing continuation without fabricated envelope;
- malformed envelope does not crash;
- malformed envelope is not replaced with a reconstructed one mid-continuation;
- a later genuinely new supported root may create a fresh authoritative envelope.

Do not infer causal identity from gameplay prose/state.

## Step 9 — update evidence documentation accurately

Replace the stale FIX2 matrix heading with FIX4 ownership evidence.

For this slice, the required rows are only:
- Attack root exact-envelope persistence;
- Attack-targeted exact-envelope persistence;
- Attack→Damage reuse;
- independent Damage root exact-envelope persistence;
- no normal-path recovery for supported roots;
- read/reconnect identity stability;
- second-viewer identity stability;
- stale/double identity safety;
- settlement then fresh root;
- legacy NULL;
- malformed envelope.

Use:
`PROVEN | PARTIAL | UNPROVEN | NOT IMPLEMENTED IN GAME`.

PROVEN requires a named real API/engine test.

Do not upgrade Group/Judgement/Duel/delayed activation in this slice.

## Step 10 — validation

Run after the final code change:
- causal primitive tests;
- causal-context tests;
- causal persistence tests;
- lethal concurrency test;
- all new FIX4 API tests;
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
- add Group child work;
- add Judgement/Duel/Negation scenario expansion;
- add delayed activation provenance;
- implement Dying presentation barrier;
- migrate PresentationV2;
- modify React/CSS;
- change gameplay rules;
- add client causal IDs.

## Execution-result format

Append only:

```
---

## C2-FIX4 execution result — <date>

Branch:
Implementation commit:
Files changed:

### Root creator inventory
...

### Recovery inventory
...

### Attack ownership changes
...

### Damage ownership changes
...

### Evidence matrix
...

### Identity/legacy/corruption tests
...

### Validation
...

### Remaining C2 work
...
```

**Implementation commit must be the actual pushed full SHA, not “pending”.**

Push implementation + appended result to `origin/ux-v2` and STOP.

## Acceptance criteria

FIX4 passes only if:
- newly created supported Attack roots persist the exact created envelope;
- Attack-targeted does not reconstruct a normal root from context;
- Damage root creators do not discard a newly created envelope;
- Attack-derived Damage reuses Attack authority;
- normal supported roots do not rely on `recoverCausalEnvelope()`;
- Pending remains reference-only;
- root checkpoint/revision are stable across reads/reconnect/viewers;
- stale/double submission cannot duplicate root/revision;
- legacy/corrupt continuation does not fabricate authority;
- lethal Attack→Dying regression remains green;
- actual pushed implementation SHA is reported;
- no out-of-scope C3/UI work occurs.
