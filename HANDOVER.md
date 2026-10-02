# WTK UX V2 — Current Task Handoff

## Reviewer status

UX2.0C2-FIX4 is **PARTIAL / NOT ACCEPTED**. Do not start C3.

Reviewed implementation commit:
`04abf5bb28b12656ff66b1598921a3f650e09413`

### Accepted

- All production routing imports/calls to `recoverCausalEnvelope()` were removed from `app/api/rooms/route.ts`.
- Attack root creation now retains the exact created envelope separately from the serializable Pending causal context.
- Attack-targeted uses the existing room envelope or the exact runtime root envelope; it no longer reconstructs a normal root from a context handle.
- Damage root helpers now retain a newly created envelope instead of immediately discarding it.
- Attack-derived Damage continues to reuse Attack causal identity.
- Borrowed Sword no longer reconstructs a missing parent envelope from Pending context.
- The lethal Attack→Damage→Dying regression remains intact.
- The Agent supplied a real pushed implementation SHA.

### Remaining blockers

FIX4 cannot pass its own acceptance criteria yet because the Agent explicitly left these required FIX4 proofs PARTIAL:

1. root checkpointId/presentationRevision stability across repeated reads/reconnect;
2. second-viewer identity proof for the refactored real Attack root rather than generic manually stored C1 evidence;
3. stale/double response cannot duplicate root/checkpoint/revision;
4. settlement followed by unrelated supported root produces a fresh interactionId;
5. independent Damage root exact-envelope persistence lacks real API evidence;
6. malformed envelope during a real continuation lacks API evidence;
7. the requested FIX4 evidence matrix was not actually replaced with the narrower FIX4 rows; the document still carries the older broad flow matrix and labels several ownership claims indirectly.

### Additional code-review concern

The implementation uses non-enumerable runtime properties such as `declaration.causalEnvelope` and `pending.causalEnvelope` to transport the created envelope without serializing it into Pending JSON. This is acceptable as a temporary server-runtime carrier, but it is fragile across object copying/serialization boundaries. FIX5 must prove every relevant persistence caller receives the exact envelope before serialization and must not assume the hidden field survives a persisted/reloaded Pending.

Group and Duel are still explicitly documented as `CONTEXT_ONLY_BUG`; that is outside FIX4 scope but must be fixed before C2 can be accepted.

---

# NEXT TASK — UX2.0C2-FIX5: Prove Root Ownership and Remove Hidden-Carrier Ambiguity

## Objective

Do not expand to Group/Judgement/Duel yet.

Finish the proof for the Attack/Damage ownership architecture introduced by FIX4 and make the runtime envelope carrier explicit and safe.

This slice should either PASS the Attack/Damage ownership gate or expose a concrete architectural defect. Do not add more scenario breadth.

## Workflow

Work only on `ux-v2`.

At start:
```
git fetch origin
git checkout ux-v2
git pull --ff-only origin ux-v2
```

Do not modify/merge `main`. Do not self-merge.

Append execution result only. Reviewer will clean HANDOVER after review.

## Step 1 — replace hidden ad-hoc envelope properties with an explicit orchestration result

Do not attach `causalEnvelope` as a non-enumerable property to objects whose domain type is a serializable Pending/AttackDeclaration.

Introduce an explicit server-only result type, for example:

```
type CausalPendingResult<T> = {
  value: T;
  createdEnvelope: CausalEnvelope | null;
};
```

and an equivalent Attack declaration result if needed.

Requirements:
- serializable gameplay object remains pure;
- server-only envelope carrier is a separate wrapper;
- existing inherited causal context => `createdEnvelope: null`;
- newly created root => exact root envelope returned separately;
- persistence caller consumes wrapper before serializing gameplay value;
- no envelope is placed in Pending JSON;
- no normal-path recovery.

Names may differ; architecture must be explicit.

## Step 2 — Attack root exact-envelope proof

For a normal real Attack API flow, prove:
- one root is created;
- persisted envelope has one Frame;
- interactionId/frameId/checkpointId/presentationRevision are captured at first authoritative response boundary;
- repeated `state` reads do not change any of those four values;
- reconnect/reload does not change them;
- another viewer sees exactly the same public envelope;
- Pending causal context points to the same interactionId/frameId.

Use the real persisted Attack root, not manual SQL envelope injection.

## Step 3 — stale/double response proof

Use a real Attack response.

Submit the same response command twice or otherwise exercise the existing stale-action guard.

Assert after the stale attempt:
- no new interactionId;
- no new frameId;
- no duplicate checkpoint;
- presentationRevision did not advance a second time;
- gameplay effect did not execute twice;
- stale request returns the established stale/conflict behavior.

Do not weaken CAS/stale protection to make the test pass.

## Step 4 — settlement then fresh root

Complete one Attack Interaction to settlement.

Assert:
- old envelope is cleared at the authoritative completion boundary;
- then play/start another unrelated supported causal root;
- new interactionId differs from old;
- new frameId differs from old;
- no parentFrameId or originRef incorrectly links the two independent Interactions.

This is lifetime identity, not presentation retention.

## Step 5 — independent Damage root real API proof

Find one existing gameplay route that starts Damage without inheriting an Attack/Group/Duel causal context.

If a real route exists:
- execute it through API/engine;
- prove exact created DAMAGE root envelope is persisted;
- Pending context matches it;
- repeated reads preserve IDs/checkpoint/revision;
- settlement clears it.

If no practical route exists in current game:
- mark `NOT IMPLEMENTED IN GAME` or `UNPROVEN` with exact code evidence;
- do not invent gameplay or synthetic SQL to claim PROVEN.

## Step 6 — malformed envelope mid-continuation

Create/drive a real supported continuation, then corrupt only the stored envelope to a structurally malformed value using the test DB seam.

Continue gameplay.

Assert:
- API does not crash;
- gameplay follows legacy-safe behavior;
- malformed envelope is projected as null;
- continuation does not reconstruct/fabricate an envelope from Pending context;
- no guessed interaction/frame/checkpoint appears.

This SQL mutation is allowed only to test corruption handling; it is not evidence of normal causal creation.

## Step 7 — verify wrapper survives all Attack entry variants

Audit real callers for:
- normal Attack;
- Attack-targeted trigger entry;
- Serpent Spear Attack;
- Influencing Attack;
- any other path calling `attackDeclaration()`.

For each:
- newly created root envelope reaches the first authoritative persistence boundary;
- inherited causal Attack does not create another root;
- no wrapper is accidentally dropped by spread/copy/barrier helpers.

Add focused tests where current API coverage is missing and practical.

## Step 8 — exact FIX5 evidence matrix

Replace the stale ownership evidence section with exactly these rows:

- normal Attack exact root persistence
- Attack-targeted exact root persistence
- Attack Pending context matches envelope
- repeated reads preserve IDs/checkpoint/revision
- reconnect preserves IDs/checkpoint/revision
- second viewer sees same envelope
- stale/double response does not duplicate causal transition
- Attack settlement clears envelope
- next independent root gets fresh IDs
- Attack-derived Damage reuses root
- independent Damage exact root persistence
- malformed mid-continuation does not fabricate authority
- legacy NULL continuation remains null
- no production normal-path recoverCausalEnvelope

Statuses:
`PROVEN | PARTIAL | UNPROVEN | NOT IMPLEMENTED IN GAME`.

Every PROVEN row must name the exact real API/engine test.

## Step 9 — do not hide remaining C2 bugs

Keep a separate short “Remaining after FIX5” section naming:
- Group context-only root ownership;
- Duel context-only root ownership;
- Judgement lifetime;
- Group/nested child;
- independent nested damage semantics;
- delayed activation provenance;
- global settlement coverage.

Do not work on those in this slice.

## Step 10 — validation

Run after final change:
- causal primitive tests;
- causal-context tests;
- causal persistence tests;
- lethal Attack/Dying test;
- all new FIX5 API tests;
- PresentationV2 unit;
- PresentationV2 engine;
- full fast suite;
- full API suite;
- build;
- lint;
- `git diff --check`.

Report exact counts.

## Scope exclusions

Do NOT:
- start C3;
- fix Group/Duel ownership in this slice;
- expand Judgement/Negation scenarios;
- add delayed activation provenance;
- change Dying presentation barrier;
- migrate PresentationV2;
- modify React/CSS;
- change gameplay rules;
- add client causal IDs.

## Execution-result format

Append only:

```
---

## C2-FIX5 execution result — <date>

Branch:
Implementation commit:
Files changed:

### Explicit orchestration carrier
...

### Attack identity proof
...

### Stale/double proof
...

### Settlement/fresh-root proof
...

### Independent Damage proof
...

### Corruption/legacy proof
...

### Entry-variant audit
...

### FIX5 evidence matrix
...

### Validation
...

### Remaining C2 work
...
```

Report the actual pushed full implementation SHA.

Push implementation + appended result to `origin/ux-v2` and STOP.

## Acceptance criteria

FIX5 passes only if:
- no non-enumerable/ad-hoc envelope property is used as the orchestration carrier;
- exact root envelope transport is explicit and separate from serializable gameplay objects;
- normal real Attack proves stable interaction/frame/checkpoint/revision across reads/reconnect/viewer;
- stale/double response cannot duplicate causal transition;
- settlement then fresh root proves lifetime separation;
- independent Damage is honestly PROVEN or explicitly UNPROVEN/NOT IMPLEMENTED;
- malformed continuation cannot fabricate authority;
- Attack entry variants do not drop or recreate root authority;
- evidence matrix exactly reflects real tests;
- no out-of-scope C3/UI work begins.
