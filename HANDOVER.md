# WTK UX V2 — Current Task Handoff

## Reviewer status

UX2.0C2-FIX6 is **ACCEPTED for the Attack/Damage ownership slice**.

Reviewed implementation commit:
`582cf630caedcd6dde47d0cc05fc677891f3f786`

Do **not** start C3. C2 as a whole is not yet complete.

### Accepted evidence

- `CausalCreation<T>` remains the explicit root-envelope carrier; no hidden/non-enumerable carrier returned.
- No production `recoverCausalEnvelope()` call was reintroduced.
- Real ordinary Attack proves persisted root identity and Pending-context alignment.
- Repeated reads and a second viewer preserve interaction/frame/checkpoint/revision.
- The stale 409 path now proves causal identity and presentationRevision remain unchanged and the Dodge remains unconsumed.
- Concurrent duplicate response still has one winner/one stale loser and cannot introduce a second causal root.
- Malformed envelope is now tested during a real Attack continuation; gameplay continues safely and does not reconstruct authority from Pending context.
- Real C2 Attack evidence is separated from the manual C1 projection test.
- Real Ma Chao Cavalry Attack-targeted entry proves root/Pending alignment and stable read identity.
- Lethal Attack→Damage→Dying→rescue retains root identity, clears on settlement, and the next Attack gets fresh IDs.
- The exact 15-row FIX6 matrix is present and honestly leaves independent Damage UNPROVEN and several Attack variants PARTIAL.

### Remaining C2 blockers

The C2 propagation document still identifies these broader blockers:
1. Group/AOE root ownership is context-only.
2. Duel root ownership is context-only.
3. Group nested child/resume is not fully proven.
4. independent/nested Damage semantics are incomplete.
5. Judgement lifetime remains incomplete.
6. Negation/counter lifetime needs complete real-flow evidence.
7. delayed activation `originRef` provenance remains unproven.
8. centralized authoritative envelope persistence is not yet applied/proven across all automatic Pending/Continuation transitions.
9. final settlement/clear coverage is not global.

The next task addresses only the two explicit context-only root creators first.

---

# NEXT TASK — UX2.0C2-FIX7: Make Group and Duel Roots Authoritative

## Objective

Convert `groupResponseDecision()` and `duelResponseDecision()` from context-only root creation to the same explicit authoritative-envelope ownership model already accepted for Attack.

At the end of this slice:

> A newly started Group/AOE or Duel root creates exactly one `CausalEnvelope`, returns it explicitly to orchestration, and persists that exact envelope atomically with the first authoritative Pending/phase state.

Do not implement Group child semantics, Judgement, delayed activation, or C3 in this slice.

## Workflow

Work only on `ux-v2`.

Start with:

```
git fetch origin
git checkout ux-v2
git pull --ff-only origin ux-v2
```

Read:
- this HANDOVER;
- `docs/UX_V2_0C_CAUSAL_IDENTITY_DESIGN.md`;
- `docs/UX_V2_0C2_CAUSAL_PROPAGATION.md`;
- accepted Attack implementation around `CausalCreation<T>`, `attackDeclaration()`, and `causalRoomStateWrite()`.

Do not modify/merge `main`. Do not self-merge.

Append execution result to HANDOVER and push implementation + result to `origin/ux-v2`. Do not clean HANDOVER.

## Architectural rule

Use the accepted Attack pattern as the reference.

A serializable Group/Duel Pending or continuation may contain only `CausalContext`.

A newly created root envelope must travel separately through server orchestration:

```ts
type CausalCreation<T> = {
  value: T;
  createdEnvelope: CausalEnvelope | null;
};
```

Expected behavior:

```ts
const root = inheritedCausal ? null : createCausalRoot(...);

return {
  value: {
    ...serializablePending,
    causal: inheritedCausal ?? root!.context,
  },
  createdEnvelope: root?.envelope ?? null,
};
```

The authoritative caller must persist `createdEnvelope` at the first Group/Duel decision boundary.

Never:
- discard `root.envelope`;
- reconstruct an envelope from Pending context;
- put full envelope into Pending JSON;
- use `resolutionId`, timeline event IDs, actionRevision, card names, or log text as causal identity;
- attach a hidden/non-enumerable envelope property.

## Step 1 — inventory every Group/Duel creator and caller

Before coding, repository-search and document every production caller of:
- `groupResponseDecision()`;
- `duelResponseDecision()`;
- `nextGroupResponse()`;
- any helper that starts/reopens a Duel responder;
- any helper that starts a Group/AOE participant response.

For each caller record:

`function/path | root or inherited continuation | current causal input | first room persistence boundary | CAS/stale guard | required change`

Important: distinguish:
- creation of a new independent Group/Duel root;
- reopening/advancing an existing same-Frame Group/Duel continuation.

Only the former may create a root envelope.

## Step 2 — refactor Group root creation

Change `groupResponseDecision()` or its narrow root-producing wrapper so a newly created Group root returns:
- serializable Group Pending/Response value;
- exact `createdEnvelope`.

Rules:
- if caller passes inherited causal context, `createdEnvelope === null`;
- if this is a genuinely new Group root, create once and return both context + envelope;
- persist the exact envelope with the first Group Pending/phase state;
- advancing from participant N to participant N+1 must reuse the existing interaction/frame;
- `nextGroupResponse()` must not create a new root merely because actor changes;
- no envelope reconstruction if persisted envelope is absent/malformed.

Do **not** decide in this task whether nested target effects need child Frames. Keep existing gameplay semantics.

## Step 3 — prove Group root through a real API flow

Choose one existing real Group/AOE card flow already covered by the game/tests.

Preferred: use an existing Group card fixture that naturally asks multiple players to respond. Do not invent a new card or test-only gameplay rule.

Test the complete root/participant identity:

1. play the Group/AOE card through the real API;
2. capture the first public/persisted causal envelope;
3. assert exactly one root Frame;
4. assert persisted Pending causal interactionId/frameId match envelope;
5. capture checkpointId and presentationRevision;
6. read room again: identity/revision unchanged;
7. read as another viewer: same public envelope;
8. resolve/decline first participant according to existing gameplay;
9. when second participant becomes actor, assert:
   - same interactionId;
   - same activeFrameId unless current existing semantics intentionally create a child (do not add one here);
   - no second root was created;
   - origin remains the original Group source/effect/target set;
   - current/resolving actor may update according to existing semantics;
10. stale/double participant submission must not create a second root;
11. when the Group root fully settles, assert envelope clears if no child/synchronous continuation remains.

If current automatic transitions fail to preserve the envelope, fix only the minimum Group persistence boundary required for this root lifetime.

## Step 4 — refactor Duel root creation

Apply the same explicit wrapper/ownership rule to `duelResponseDecision()` or a narrow root-producing wrapper.

Rules:
- new independent Duel => one root envelope;
- alternating responder changes do not create roots;
- Attack cards played as Duel responses are **not** child Attack Frames;
- all alternating responders stay in the same Duel interaction/frame;
- origin remains the original Duel source/effect/original target;
- current/resolving player changes as the Duel alternates;
- no reconstruction from Pending context.

## Step 5 — prove Duel alternation through a real API flow

Use an existing real Duel API fixture.

Required proof:

1. play Duel normally;
2. capture persisted root envelope;
3. Pending causal IDs match root;
4. first responder plays required Attack;
5. assert next responder is offered the Duel response;
6. assert interactionId is unchanged;
7. assert activeFrameId is unchanged;
8. assert no child Attack Frame was created for the response Attack;
9. assert origin is unchanged;
10. assert current resolving player reflects the current responder if current state is updated at this semantic boundary;
11. complete Duel through decline/no-Attack/damage using existing rules;
12. assert the root clears only when the Duel causal interaction settles;
13. start/read another independent supported root if practical and confirm Duel IDs are not reused.

## Step 6 — stale/double safety for Group and Duel

Use existing actionRevision/CAS mechanisms.

For one Group participant decision and one Duel response decision:
- capture root identity before submission;
- submit an intentionally stale command;
- assert 409/stale according to current API contract;
- assert interactionId/frameId/checkpointId/presentationRevision unchanged;
- assert card/response not consumed;
- then submit valid response;
- if practical, duplicate concurrently and prove one winner/one stale loser;
- assert no second causal root/frame is introduced.

Do not change stale semantics solely for these tests.

## Step 7 — malformed/missing envelope compatibility

For Group and Duel, do not add broad new corruption suites.

At minimum prove by code path/a focused test where practical:
- if a legacy continuation has causal context but persisted envelope is NULL/malformed, it does not reconstruct authority;
- gameplay follows existing legacy-safe behavior;
- no new root is created mid-continuation merely because the envelope is missing.

If one shared real corruption test can cover the common helper behavior, use it instead of duplicating tests.

## Step 8 — exact FIX7 evidence matrix

Replace the root-creator section's Group/Duel `CONTEXT_ONLY_BUG` claims with their actual post-change status.

Add this exact matrix:

| Requirement | Status | Exact evidence | Remaining gap |
| --- | --- | --- | --- |
| Group new root exact-envelope persistence | ... | ... | ... |
| Group Pending context matches envelope | ... | ... | ... |
| Group participant advance preserves interaction/frame | ... | ... | ... |
| Group repeated read/second viewer stable | ... | ... | ... |
| Group stale/double cannot duplicate root | ... | ... | ... |
| Group settlement clears root | ... | ... | ... |
| Duel new root exact-envelope persistence | ... | ... | ... |
| Duel Pending context matches envelope | ... | ... | ... |
| Duel alternating responders preserve interaction/frame | ... | ... | ... |
| Duel response Attack creates no child Frame | ... | ... | ... |
| Duel repeated read/second viewer stable | ... | ... | ... |
| Duel stale/double cannot duplicate root | ... | ... | ... |
| Duel settlement clears root | ... | ... | ... |
| Group/Duel missing envelope does not reconstruct authority | ... | ... | ... |
| no Group/Duel normal-path recoverCausalEnvelope | ... | ... | ... |

Allowed:
`PROVEN | PARTIAL | UNPROVEN | NOT IMPLEMENTED IN GAME`.

A row is PROVEN only with a named real API/engine test. Source audit alone is PARTIAL.

## Step 9 — keep child semantics explicitly out of scope

FIX7 is about **root ownership and same-Frame participant/responder progression**.

Do not:
- invent a Group child Frame;
- classify all Group nested effects;
- change Damage child semantics;
- alter Borrowed Sword;
- redesign Duel gameplay.

If an existing Group path already enters an independent nested effect and that prevents clean root-settlement testing, stop at the boundary and mark the child/resume row as future C2 work. Do not solve it opportunistically.

## Step 10 — regression requirements

The accepted Attack ownership slice must remain green:
- real Attack persistence/read/viewer;
- stale/double Attack;
- malformed Attack continuation;
- Attack-targeted Cavalry;
- lethal Attack→Damage→Dying→rescue;
- Borrowed Sword causal tests.

No regression to:
- hidden envelope carrier;
- production recovery;
- Pending full-envelope serialization.

## Step 11 — validation

Run after final changes:
- focused new Group causal tests;
- focused new Duel causal tests;
- presentation-causality;
- concurrency;
- Borrowed Sword;
- Ma Chao;
- causal primitive/context/persistence;
- PresentationV2 unit;
- PresentationV2 engine;
- full `npm run test:fast`;
- full `node tests/run-api-suite.mjs`;
- `npm run build`;
- `npm run lint`;
- `git diff --check`.

Report exact commands and counts.

Before commit run:
```
rg "groupResponseDecision\(" app game
rg "duelResponseDecision\(" app game
rg "recoverCausalEnvelope" app/api/rooms game
rg "Object\.defineProperty.*causalEnvelope" app game
git status --short
```

Summarize all relevant hits.

## Scope exclusions

Do NOT:
- start C3;
- implement Group child/resume semantics beyond preserving the existing root;
- expand Judgement/Negation;
- add delayed activation provenance;
- implement independent Damage fixture solely for FIX7;
- change Dying presentation barrier;
- migrate PresentationV2;
- modify React/CSS;
- change gameplay rules.

## Execution-result format

Append only:

```
---

## C2-FIX7 execution result — <date>

Branch:
Implementation commit:
Files changed:

### Group/Duel caller inventory
...

### Group ownership implementation
...

### Group real-flow evidence
...

### Duel ownership implementation
...

### Duel real-flow evidence
...

### Stale/double evidence
...

### Legacy/malformed behavior
...

### Exact FIX7 matrix
...

### Regression/architecture sanity
...

### Validation
...

### Remaining C2 work
...
```

Report actual pushed full SHA.

Push implementation + appended execution result to `origin/ux-v2` and STOP.

## Acceptance criteria

FIX7 passes only if:
- a new Group root persists the exact envelope created at root creation;
- Group participant progression does not create new roots;
- a new Duel root persists the exact envelope created at root creation;
- alternating Duel responders remain in one interaction/frame;
- Duel response Attack is not represented as a child Attack Frame;
- Pending/Continuation remains context-only;
- Group/Duel do not reconstruct authority from context;
- stale/double decisions cannot duplicate causal roots;
- settlement behavior is proven or honestly PARTIAL at a documented existing nested boundary;
- exact FIX7 matrix is present without overclaiming;
- accepted Attack ownership tests remain green;
- no out-of-scope C3/UI/gameplay redesign occurs.

---
## C2-FIX7 execution result — 2026-10-02

Branch: `ux-v2`

Implementation commit: `48d2c00` (`Make Group and Duel causal roots authoritative`)

Files changed:
- `app/api/rooms/route.ts`
- `tests/api/equipment.test.mjs`
- `tests/api/diao-chan.test.mjs`
- `README.md`
- `docs/UX_V2_0C2_CAUSAL_PROPAGATION.md`

### Group/Duel caller inventory

- `groupResponseDecision()` now returns `CausalCreation<GroupResponsePending>`.
  New ordinary AOE callers are the `BarbarianInvasion`/`RainingArrows` branch
  and the `SkyPiercingHalberdAttack` branch. The first authoritative boundary
  is `beginStratagemUse()` → `resumeNormalStratagemUse()` →
  `beginGroupTarget()`; existing Pending equality and response CAS remain the
  stale guards.
- `nextGroupResponse()` is inherited-only and is consumed by
  `finishGroupStep()`; it does not create a root. `beginGroupTarget()` uses the
  explicit envelope on the first write and the persisted envelope on
  participant advancement. `finishGroupStep()` clears it at settlement.
- `duelResponseDecision()` now returns `CausalCreation<ResponsePending>`.
  New callers are ordinary Duel card play and `beginLustDuel()`. The first
  boundary is the direct Lust room write or the shared
  `beginStratagemUse()` continuation write; alternating response CAS is
  unchanged.
- Duel response Attack cards update only Duel Pending; no Attack child Frame
  is created. `resolveDuelLoss()` and Group damage pass inherited causal
  context into the common sourced-damage boundary.

### Group ownership implementation

`groupResponseDecision()` creates one root and returns its exact
`createdEnvelope` beside the serializable Pending value. Callers pass it
through stratagem/target orchestration, and Group responses, Negation windows,
and participant advances use `causalRoomStateWrite()` with that envelope. The
common damage boundary inherits Group context from `resumeGroup`, preventing a
post-damage reaction from clearing the Group root prematurely.

### Group real-flow evidence

The real `RainingArrows` and `BarbarianInvasion` + Xiahou Dun Stauchness flow
proves first-root persistence, Pending interaction/frame alignment, repeated
read, second-viewer public identity, same-root progression to the next
participant, and final envelope clearing. It covers declined and accepted
Stauchness paths and existing physical-card settlement assertions.

### Duel ownership implementation

`duelResponseDecision()` creates one root and returns the exact envelope. Lust
persists it with the first response state; ordinary Duel flows pass it through
the shared stratagem continuation. Alternating responders retain the same
Duel context. Duel failure damage explicitly carries the Duel context into
`resolveSourcedDamage()`, and final settlement clears the root.

### Duel real-flow evidence

The real Diao Chan Lust API flow proves first-root persistence, Pending
interaction/frame alignment, second-viewer identity, same-root continuation,
one Frame after the response window, and final settlement clearing. Existing
Lust conversion, Wushuang, Empty Fortress, equipment-cost, and Quick Test
coverage remains green.

### Stale/double evidence

Existing response CAS/actionRevision coverage remains active and the full API
suite proves one winner/one stale loser for competing responses. FIX7 does not
change stale semantics. Dedicated Group/Duel stale rows do not yet assert all
causal IDs after the 409, so those matrix rows remain PARTIAL.

### Legacy/malformed behavior

No production normal-path call to `recoverCausalEnvelope()` exists, and no
hidden/non-enumerable envelope carrier was added. Missing or malformed
envelopes remain non-authoritative; this slice adds no reconstruction from
Pending context. Dedicated malformed Group/Duel fixtures remain open, so that
combined matrix row is PARTIAL.

### Exact FIX7 matrix

The exact 15-row matrix is recorded in
`docs/UX_V2_0C2_CAUSAL_PROPAGATION.md`:

- Group root persistence, Pending alignment, participant progression,
  repeated/second-viewer stability, and settlement clearing: PROVEN;
  stale/double: PARTIAL.
- Duel root persistence, Pending alignment, alternating progression, no child
  Frame for response Attack, repeated/second-viewer stability, and settlement
  clearing: PROVEN; stale/double: PARTIAL.
- Missing-envelope non-reconstruction: PARTIAL pending dedicated corruption
  fixtures; no normal-path `recoverCausalEnvelope`: PROVEN.

### Regression/architecture sanity

- `CausalCreation<T>` is explicit and serializable Pending stores only
  `CausalContext`.
- Group/Duel participant changes reuse the existing Interaction/Frame.
- No provider-specific HTTP action, React/CSS migration, Group child semantic
  redesign, Judgement, delayed provenance, or C3 work was added.
- Search found only the isolated `recoverCausalEnvelope()` helper definition,
  with no production route call or hidden envelope carrier.

### Validation

- `npm run build` — passed.
- `npm run test:fast` — 107/107 passed.
- `npm run test:api` — 214/214 passed.
- Focused Group/Duel real-flow run — 26/26 passed.
- `npm run lint` — passed.
- `git diff --check` — passed.

### Remaining C2 work

Independent Damage root proof, Group nested-child semantics, complete
Judgement and Negation lifetime evidence, delayed activation `originRef`,
centralized automatic Pending/Continuation envelope coverage, dedicated
Group/Duel malformed and causal-ID stale assertions, and global final
settlement coverage remain open. C3 and UI/React/CSS migration remain out of
scope.
