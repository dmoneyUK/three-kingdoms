# WTK UX V2 — Current Task Handoff

## Reviewer status

UX2.0C2-FIX5 is **PARTIAL / NOT ACCEPTED**. Do not start C3.

Reviewed implementation commit:
`2df83a012f97ef43dcb3c15fc9facdd32db1aa0f`

### Accepted

- The temporary non-enumerable/hidden `causalEnvelope` carrier was removed.
- `CausalCreation<T> = { value, createdEnvelope }` now explicitly separates serializable gameplay state from server orchestration authority.
- `attackDeclaration()`, `damageTriggerPending()`, and `damageSufferedTriggerPending()` use the explicit wrapper.
- Normal Attack, Serpent Spear, Influencing Attack and Attack-targeted root paths explicitly carry `createdEnvelope` to persistence.
- Production `app/api/rooms/route.ts` no longer calls `recoverCausalEnvelope()`.
- A real ordinary Attack test now checks persisted Pending causal IDs against the real persisted root envelope and checks the real root's interactionId/frameId/checkpointId/presentationRevision across subsequent reads and another viewer.
- The lethal Attack→Damage→Dying path still preserves root identity and clears on rescue; a subsequent real Attack proves fresh interaction/frame IDs.
- The implementation SHA is real and pushed.

### Why FIX5 is not fully accepted

1. The required stale/double **causal identity** assertions are missing. The concurrency test proves one gameplay winner/one stale loser and single Dodge consumption, but it does not capture/assert interactionId, frameId, checkpointId, or presentationRevision before/after the stale/concurrent submission. Therefore the execution result overstates this row as PROVEN.
2. The malformed-envelope test only writes malformed envelope into a room and performs a read. FIX5 explicitly required corruption **during a real supported continuation followed by continuing gameplay**, proving Pending context does not reconstruct authority. That proof is missing.
3. The evidence matrix in the execution result/document does not use the exact required 14 FIX5 rows. It collapses several requirements into seven broad rows, so individual gaps are hidden.
4. “Attack entry variants PROVEN” is too strong. The Agent audited callers and the full API suite passed, but the task explicitly said compilation/caller audit alone is not sufficient to mark a variant PROVEN without real API evidence. Variants without real causal-envelope assertions must remain PARTIAL.
5. The real Attack viewer/read test is much better, but the file still contains a later manual C1 envelope overwrite in the same test. That manual section may remain for C1 projection coverage, but the C2/FIX5 documentation must cite only the first real-Attack portion as ownership evidence.
6. Independent Damage is honestly UNPROVEN, which is acceptable for FIX5 if documented precisely.
7. Group/Duel context-only ownership remains a known C2 blocker, intentionally deferred.

The next slice is a small proof/correction task. Do not refactor ownership again unless a failing test exposes a defect.

---

# NEXT TASK — UX2.0C2-FIX6: Close the Missing Attack Ownership Proofs

## Objective

Finish the evidence gaps left by FIX5 without expanding scenario scope.

The explicit `CausalCreation<T>` architecture is accepted provisionally. FIX6 should add the missing real API assertions, correct overclaimed documentation, and leave Attack/Damage ownership in a reviewable PASS state.

Do not start Group/Duel/Judgement work in this slice.

## Workflow

Work only on `ux-v2`.

At start:
```
git fetch origin
git checkout ux-v2
git pull --ff-only origin ux-v2
```

Do not modify/merge `main`. Do not self-merge.

Append execution result only. Reviewer cleans/replaces HANDOVER.

## Step 1 — strengthen the real stale/double Attack response test

Use the existing test:
`tests/api/concurrency.test.mjs` — `stale and concurrent response submissions claim each transition once`.

Do not create a separate synthetic envelope.

Before any response submission:
- capture the real Attack `causalEnvelope`;
- assert non-null;
- capture:
  - `interactionId`;
  - `activeFrameId`;
  - `checkpoint.checkpointId`;
  - `presentationRevision`.

After the intentionally stale request that returns 409:
- assert the room still has the same interactionId;
- assert the same activeFrameId;
- assert the same checkpointId;
- assert the same presentationRevision;
- assert Pending still refers to the same causal interaction/frame;
- assert the Dodge is still in the responder's hand / not in discard if the existing projection/test seam permits this safely.

Then run the two concurrent valid response submissions.

Required outcome:
- exactly one 200;
- exactly one stale/conflict loser;
- Dodge consumed/discarded exactly once;
- gameplay log records the Dodge once.

Because a successful response may legitimately advance/settle the causal state, do **not** blindly require the final checkpoint/revision to equal the pre-response values. Instead prove:
- both concurrent submissions started from the same captured root;
- loser cannot create a second interaction/frame/checkpoint;
- after both settle there is no second causal root;
- if envelope remains, its interactionId must still equal the original until settlement;
- if envelope is cleared because Attack settled, assert null and document that as expected settlement.

If the stale response payload contains a room projection, assert its envelope exactly matches the authoritative DB/public envelope at that moment.

## Step 2 — add real malformed-mid-continuation proof

Use a real ordinary Attack response continuation.

Procedure:
1. create game and start real Attack;
2. assert real root envelope exists;
3. capture persisted Pending and its causal interactionId/frameId;
4. using the test DB seam only, replace `causal_envelope_json` with a structurally malformed JSON object;
5. read room state and assert public `causalEnvelope === null`;
6. submit the real responder action (Dodge or decline) through the API;
7. assert the request does not crash/500;
8. assert gameplay resolves according to existing legacy-safe behavior;
9. assert the continuation does **not** recreate an envelope from the Pending causal context;
10. assert no new guessed interactionId/frameId/checkpointId appears;
11. assert no duplicate gameplay effect/log/card consumption.

Important:
- do not null or rewrite Pending;
- do not call causal helper functions from the test to manufacture expected identity;
- direct SQL corruption is allowed only for Step 4 above;
- the test proves corruption tolerance, not normal root creation.

If current code recreates an envelope after the responder action, FIX6 must fix that bug with the smallest server-side change. Do not reintroduce `recoverCausalEnvelope()`.

## Step 3 — separate the real C2 proof from the old manual C1 projection proof

In `tests/api/presentation-causality.test.mjs`, the current first test does two conceptually different things:
- opens a real Attack and checks the real envelope;
- later manually writes `persisted-interaction/persisted-frame` for generic projection behavior.

Split these into two named tests if practical:

A. `real Attack causal envelope is stable across room reads and viewers`
- only real gameplay;
- no manual envelope replacement;
- this is C2 evidence.

B. `manually persisted valid causal envelope projects identically across viewers`
- retains the existing C1/manual persistence check;
- clearly labelled C1/helper/projection evidence;
- never cited as C2 ownership proof.

This avoids future reviewers confusing manual storage with real-flow evidence.

## Step 4 — Attack-targeted real envelope evidence

Find an existing test fixture/path that genuinely opens an Attack-targeted trigger.

If a practical real API path already exists:
- start the Attack normally;
- enter Attack-targeted;
- assert the first persisted/public envelope is non-null;
- Pending causal interactionId/frameId match it;
- repeated read does not regenerate checkpoint/revision;
- mark the exact matrix row PROVEN and cite the test.

If there is no practical existing real path:
- mark `PARTIAL`;
- cite the caller audit/code path;
- do not invent a fake hero/card/gameplay rule merely to make it PROVEN.

## Step 5 — correct entry-variant claims

For each variant:
- ordinary Attack;
- Attack-targeted;
- Halberd/virtual Attack;
- Serpent Spear;
- Influencing Attack;
- Borrowed Sword inherited Attack;
- follow-up/inherited Attack;

classify evidence separately.

Rules:
- real API envelope assertion => PROVEN;
- caller audit + general API suite only => PARTIAL;
- inherited Attack must explicitly state that it must not create a new root;
- do not label the entire set PROVEN from a source audit.

No new gameplay rules/tests are required solely to upgrade every variant in FIX6. Honest PARTIAL is acceptable.

## Step 6 — replace the evidence matrix with the exact required rows

In `docs/UX_V2_0C2_CAUSAL_PROPAGATION.md`, create exactly this FIX6 matrix:

| Requirement | Status | Exact evidence | Remaining gap |
| --- | --- | --- | --- |
| normal Attack exact root persistence | ... | ... | ... |
| Attack-targeted exact root persistence | ... | ... | ... |
| Attack Pending context matches envelope | ... | ... | ... |
| repeated reads preserve IDs/checkpoint/revision | ... | ... | ... |
| reconnect/read-after-persistence preserves IDs/checkpoint/revision | ... | ... | ... |
| second viewer sees same real Attack envelope | ... | ... | ... |
| stale request leaves causal identity unchanged | ... | ... | ... |
| concurrent duplicate response cannot duplicate causal transition | ... | ... | ... |
| Attack settlement clears envelope | ... | ... | ... |
| next independent root gets fresh IDs | ... | ... | ... |
| Attack-derived Damage reuses root | ... | ... | ... |
| independent Damage exact root persistence | ... | ... | ... |
| malformed mid-continuation does not fabricate authority | ... | ... | ... |
| legacy NULL continuation remains null | ... | ... | ... |
| no production normal-path recoverCausalEnvelope | ... | ... | ... |

Allowed status only:
`PROVEN | PARTIAL | UNPROVEN | NOT IMPLEMENTED IN GAME`.

PROVEN rules:
- name the exact test;
- source audit alone is not enough for runtime behavior;
- manual SQL-created valid envelope is not C2 proof;
- malformed SQL corruption test is valid only for corruption behavior.

Keep a separate Attack variant audit table below the matrix.

## Step 7 — preserve accepted architecture

Do not undo FIX5.

Verify:
- `CausalCreation<T>` remains explicit;
- no hidden/non-enumerable envelope carrier;
- no production `recoverCausalEnvelope()`;
- Pending JSON contains causal context only, never full envelope;
- missing/malformed authoritative envelope is not rebuilt from Pending context.

If a bug fix is required by Step 2, make the smallest change consistent with these rules.

## Step 8 — validation

Run:
- focused presentation-causality API tests;
- focused concurrency API tests;
- Borrowed Sword API tests;
- causal primitive/context tests;
- PresentationV2 unit + engine tests;
- full `npm run test:fast`;
- full `node tests/run-api-suite.mjs`;
- `npm run build`;
- `npm run lint`;
- `git diff --check`.

Report exact counts and commands.

Before commit:
- `rg "recoverCausalEnvelope" app/api/rooms game`;
- `rg "Object\.defineProperty.*causalEnvelope" app game`;
- `git status --short`.

Explain any search hits.

## Scope exclusions

Do NOT:
- start C3;
- fix Group/Duel context-only ownership;
- expand Judgement/Negation;
- implement Group child semantics;
- add delayed activation provenance;
- change Dying presentation barrier;
- migrate PresentationV2;
- modify React/CSS;
- change gameplay rules.

## Execution-result format

Append only:

```
---

## C2-FIX6 execution result — <date>

Branch:
Implementation commit:
Files changed:

### Stale/double causal proof
...

### Malformed mid-continuation proof
...

### Real Attack read/viewer proof
...

### Attack-targeted proof
...

### Entry-variant evidence
...

### Exact FIX6 matrix
...

### Architecture sanity
...

### Validation
...

### Remaining C2 work
...
```

Report actual pushed full SHA.

Push implementation + appended result to `origin/ux-v2` and STOP.

## Acceptance criteria

FIX6 passes if:
- stale 409 leaves the real Attack causal identity/checkpoint/revision unchanged;
- concurrent duplicate response cannot create a duplicate causal transition;
- malformed envelope during a real Attack continuation does not fabricate authority and gameplay remains safe;
- real Attack read/viewer evidence is separated from manual C1 projection evidence;
- Attack-targeted is honestly PROVEN or PARTIAL with concrete evidence;
- exact 15-row matrix is present and does not overclaim;
- Attack variants are individually classified;
- accepted `CausalCreation<T>` architecture remains intact;
- no normal production recovery/hidden carrier returns;
- all required validation passes;
- no out-of-scope C3/UI work begins.
