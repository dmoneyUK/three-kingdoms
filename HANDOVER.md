# WTK UX V2 — Current Task Handoff

## Reviewed result — UX2.0C1

Branch: `ux-v2`
Reviewed implementation commit: `0536efabf4762f2415551dff8eff4f2dcb4de1f0`

### Review decision

**UX2.0C1 is PARTIALLY ACCEPTED, but C2 is NOT authorized yet. Complete UX2.0C1-FIX first.**

Accepted:
- `rooms.causal_envelope_json` is a sensible single optional persisted owner beside `pending_json`.
- migration is additive/nullable.
- shared causal types keep `resolutionId`, timeline `event.id`, and `actionRevision` separate.
- server-side ID constructors exist and projection does not generate them.
- room projection parses the optional envelope independently of viewer-private `CurrentAction`.
- `HANDOVER.md` remains tracked.
- workflow now uses `paths-ignore: HANDOVER.md` for push and pull_request, so HANDOVER-only changes do not trigger CI/deploy while mixed/source changes still do.

### Review gaps

The C1 handoff reported completion against acceptance criteria, but the implementation does not yet contain all required primitives/proofs:

1. **No storage-backed persistence/reload proof was found.**
   `tests/presentation-causality.test.mjs` currently proves JSON serialize/parse in memory. It does not prove a room is written to D1 with `causal_envelope_json`, reloaded through the production storage/read path, and returns the same IDs/revision.

2. **No explicit checkpoint-advance primitive was found.**
   C1 required checkpoint identity to change only through an explicit authoritative helper. Current code creates a checkpoint but does not provide/test semantic checkpoint advancement.

3. **No explicit Frame mutation primitives were found.**
   C1 required helpers/tests for:
   - child Frame creation;
   - Stage change;
   - mutable current target/effect update;
   - preservation of immutable origin during redirect.
   `createCausalFrame` accepts `parentFrameId`, but this alone does not prove these invariants.

4. **Immutable origin is conceptual, not enforced/proven.**
   `CausalFrameOrigin` and its arrays are currently mutable TypeScript structures. At minimum, authoritative update helpers must never rewrite origin and tests must prove redirect/current updates preserve it. Prefer readonly typing/copying where practical without overengineering.

5. **Public/private test is too shallow.**
   Checking that top-level keys `options`, `legalTargets`, and `hand` are absent is useful but does not prove a persisted/reloaded envelope is viewer-independent through the room projection boundary.

6. **The reported C1 focused test count (3/3) matches the three lightweight unit tests, but several acceptance tests requested in the previous handoff are therefore still missing.**

Do not start C2 until these gaps are closed.

---

## NEXT TASK — UX2.0C1-FIX: Complete Causal Envelope Primitives and Persistence Proof

### Scope

Finish only the missing C1 infrastructure/proofs.

Do NOT propagate causal metadata through real Attack/Duel/Negation/Group/Judgement/Dying gameplay yet.

### Git constraints

Work only on `ux-v2`.

Do NOT:
- modify or merge `main`;
- self-merge `ux-v2`;
- start C2 propagation;
- change React/CSS;
- change gameplay rules;
- classify Group effects;
- add the Dying barrier;
- migrate PresentationV2 to the new envelope;
- repurpose `resolutionId`, `event.id`, or `actionRevision`.

### 1. Preserve the accepted storage owner

Keep `rooms.causal_envelope_json` as the single optional persisted owner unless a concrete production-storage defect is discovered.

Do not copy causal IDs into every Pending/Continuation variant.

### 2. Add explicit authoritative checkpoint helper

Add a server/orchestrator-only helper that advances a checkpoint deliberately.

It must:
- create a new `checkpointId`;
- bind it to the intended active Frame/Stage;
- not change `interactionId`;
- not change `frameId`;
- not touch `actionRevision`;
- advance `presentationRevision` only according to the chosen public-state mutation semantics.

Test:
- explicit semantic checkpoint advance changes checkpoint ID;
- repeated read/reconnect does not;
- viewer switch does not;
- presentation revision can advance without checkpoint change.

### 3. Add explicit Frame-state helpers

Provide narrow authoritative helpers for:
- creating a child Frame under an existing active Frame;
- switching the active Frame;
- changing Stage;
- updating mutable `currentSourceId/currentEffect/currentTargetIds/resolvingPlayerId`;
- returning/resuming a parent Frame if needed as a primitive.

Do not build a workflow engine.

Required invariants:
- child uses same `interactionId`;
- child gets new `frameId`;
- child has correct `parentFrameId`;
- parent remains present;
- current-state update never rewrites origin.

### 4. Make origin structurally immutable enough for C1

Use readonly fields/readonly target arrays where compatible, or defensive copying in constructors/helpers, so authoritative mutation APIs cannot accidentally rewrite origin while updating current state.

Required redirect primitive test:

```
origin.originalTargetIds = [B]
current.currentTargetIds = [B]

update current target -> [D]

origin.originalTargetIds remains [B]
current.currentTargetIds becomes [D]
interactionId unchanged
frameId unchanged
```

Do not implement an actual gameplay redirect if none exists; this is a causal primitive test.

### 5. Add REAL persistence/reload proof

Use the repository's existing D1/API test harness.

Prove through the production persisted owner:

1. create or prepare a room row;
2. store a valid `causal_envelope_json`;
3. read/reload the room through the real storage/room-state boundary;
4. verify the same:
   - `interactionId`
   - active `frameId`
   - `checkpointId`
   - `presentationRevision`
5. read as a second viewer where practical and verify public causal identity is identical;
6. verify viewer-private `CurrentAction` differences do not alter the envelope;
7. verify a legacy room with NULL/missing envelope projects `causalEnvelope: null` without reconstruction.

Do not satisfy this requirement with JSON stringify/parse alone.

If the current test harness cannot safely write the envelope without a test-only route, use the smallest existing DB fixture/helper pattern. Do not add a production debug endpoint solely for the test.

### 6. Strengthen parser structural validation

Review `parseCausalEnvelope` for internal consistency.

At minimum validate/document decisions for:
- checkpoint.frameId references an existing Frame;
- checkpoint Stage is consistent with the referenced checkpoint Frame, unless the contract intentionally permits a difference;
- parentFrameId references an existing Frame when non-null;
- duplicate frame IDs are rejected;
- active Frame exists (already checked);
- presentationRevision remains non-negative integer.

Do not silently accept structurally impossible envelopes.

Keep legacy/malformed data safe: invalid envelope -> `null`, never crash the room.

### 7. Public/private invariant

Add a focused proof at the room projection boundary, not only object-key inspection.

The persisted causal envelope must be the same public causal data for different viewers of the same authoritative room state.

No private:
- hand identities;
- legal target lists;
- response choices/options;
- viewer capability data;
may enter the envelope.

### 8. CI workflow

The current workflow `paths-ignore: HANDOVER.md` behavior is accepted.

Do not remove it.

No further workflow change is required unless tests prove the syntax/behavior is invalid.

### 9. Documentation

Update `docs/UX_V2_0C1_CAUSAL_ENVELOPE_IMPLEMENTATION.md` with:
- the added primitives;
- parser invariants;
- exact D1 persistence/reload evidence;
- viewer-independence evidence;
- any deviation from C0/C1.

Do not rewrite C0 history.

### 10. Validation

Run and report exact results for:
- focused causal tests;
- new D1/API persistence/reload tests;
- `tests/presentation-v2.test.mjs`;
- `tests/api/presentation-v2-engine.test.mjs`;
- full fast suite;
- full API suite;
- build;
- lint;
- `git diff --check`.

If any fail, report the failure. Do not claim completion.

### 11. HANDOVER replacement

When complete, replace `HANDOVER.md` completely with ONLY:

```
# WTK UX V2 — Current Task Handoff

## Completed task result — UX2.0C1-FIX

Branch:
Commit:
Files changed:

### Primitives added
...

### Parser invariants
...

### D1 persistence/reload proof
...

### Viewer-independence proof
...

### Compatibility
...

### Tests
...

### Remaining blockers for C2
...

## Awaiting review
```

No history.
Do not write the next task yourself.

Commit and push the result to `ux-v2`.

### STOP CONDITION

After C1-FIX is committed/pushed and HANDOVER contains only its result:

**STOP.**

Do NOT start C2.
Do NOT propagate identities into gameplay flows.
Do NOT modify React/CSS.
Wait for review.

## Acceptance criteria

C1-FIX passes only if:
- authoritative checkpoint advancement primitive exists and is tested;
- child/active/stage/current Frame primitives exist and are tested;
- origin survives redirect/current mutation unchanged;
- structurally impossible envelopes are rejected safely;
- real D1 persistence/reload is proven;
- second-viewer/public identity stability is proven through the room boundary where practical;
- legacy NULL/no-envelope room remains compatible;
- `presentationRevision` remains independent from checkpoint and `actionRevision`;
- no C2 propagation has started;
- no gameplay/React/CSS changes;
- requested validation passes or failures are explicitly reported;
- HANDOVER contains only the C1-FIX result.
