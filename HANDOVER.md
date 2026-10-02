# WTK UX V2 — Current Task Handoff

## Reviewed result — UX2.0C0

Branch: `ux-v2`
Reviewed design commit: `d7c125a`

The C0 design is accepted as the direction for implementation.

Key accepted decisions:

- `interactionId` is the server-owned lifetime of one continuous synchronous causal interaction. It survives responses, Duel exchanges, Negation/counter-Negation, damage, Dying/rescue, Group progress, and synchronous child Frames. A later delayed activation creates a new Interaction linked by `originRef`.
- `frameId` represents an independently resolving effect inside an Interaction. Responses that merely satisfy/modify/cancel the current effect remain in the Frame; independently resolving effects create child Frames with `parentFrameId`.
- `checkpointId` is a server-owned stable semantic boundary and is not `actionRevision`.
- `presentationRevision` is public presentation-state revision and has no gameplay command authority.
- `resolutionId`, timeline `event.id`, and `actionRevision` remain separate existing concepts.
- immutable origin and mutable current effect/target state must be distinct.
- `parentFrameId`, `causeNodeId`, and `originRef` have distinct meanings.
- Group ordering/semantics must be engine-owned.
- Dying should reuse `CurrentAction.presentation.readyAfterEventId`; rescue timer-arm semantics must remain unchanged.

Review corrections/constraints for implementation:

1. C0's conceptual contract is accepted, but C1 must NOT immediately spread these fields across every Pending union member. First identify one authoritative persisted causal-envelope owner and keep domain Pending/Continuation types from becoming duplicated identity stores.
2. Do not create `presentationRevision` from viewer-specific/private projection. The same authoritative public state must have the same revision for all viewers.
3. C0 mentions `causeNodeId` and `transitionId`, but their durable occurrence identity remains unresolved. C1 must define TYPE SHAPES only where safe; do not manufacture occurrence IDs until ownership/creation is proven.
4. The proposed Stage vocabulary is provisional. C1 may define the enum/type, but must not infer stages from card names or timeline text.
5. The Group enum is also provisional until C3. C1 may define its semantic type, but must not classify existing effects yet.
6. C1 must preserve old persisted rooms/pending JSON. New metadata must be optional/read-compatible during migration.
7. No React/CSS/visual migration is authorized.

Decision: proceed to **UX2.0C1**, but keep C1 deliberately narrow: shared semantic types + authoritative envelope ownership/storage design/prototype + compatibility tests. Do NOT start broad propagation (C2).

---

## NEXT TASK — UX2.0C1: Semantic Types + Causal Envelope Ownership

### Objective

Introduce the minimum shared TypeScript contract and one authoritative persisted location for causal identity metadata WITHOUT yet propagating it through all gameplay flows.

C1 is infrastructure only.

At the end of C1 we must know:

- exactly where the unresolved causal envelope lives;
- how it survives room persistence/reload;
- how old rooms without it remain readable;
- how one public causal state is represented independent of viewer;
- that existing gameplay behavior is unchanged.

### Git / scope constraints

Work only on `ux-v2`.

Do NOT:
- modify/merge `main`;
- self-merge `ux-v2`;
- change React or CSS;
- redesign visual UX;
- broadly propagate identities through Attack/Duel/Group/etc. yet;
- classify current Group effects as SEQUENTIAL/ORDERED/GROUP;
- add Dying barrier behavior yet;
- change gameplay rules;
- replace `resolutionId`;
- replace timeline `event.id`;
- replace `actionRevision`;
- derive semantic identity from card names/timeline text;
- use random client-generated IDs.

### Step 0 — CI hygiene for HANDOVER

The HANDOVER must remain tracked on GitHub because review depends on it.

Do NOT add `HANDOVER.md` to `.gitignore`.

Update the Cloudflare workflow so a push that changes ONLY `HANDOVER.md` does not trigger CI/deploy.

Use GitHub Actions path filtering such as `paths-ignore` on the relevant push/pull_request triggers, while preserving normal CI/deploy for source/docs changes.

Acceptance:
- HANDOVER remains tracked.
- source-code commits still trigger normal ux-v2 CI/deploy.
- HANDOVER-only commit does not.
- do not weaken CI for production/source changes.

### Step 1 — audit persisted room ownership before coding

Locate the exact persisted room/state shape and all read/write boundaries for:
- `pending_json`;
- room phase/status/turn;
- timeline/public events;
- any existing metadata JSON suitable for causal envelope ownership.

Document in the C1 implementation notes:
- candidate locations considered;
- chosen owner;
- why it avoids duplicating identity across Pending union members;
- how transaction/atomicity works when pending and causal state change together.

Preferred architecture:

```
Persisted Room / authoritative orchestration state
    causalEnvelope?
    pending
    timeline
    ...
```

rather than adding interaction/frame/checkpoint IDs independently to every Pending variant.

If the current DB schema makes a separate persisted field unsafe or unnecessarily invasive, stop and document the smallest alternative before implementing a large migration.

### Step 2 — define shared semantic types

Create a narrowly scoped shared module in the engine/game layer, e.g. a sensible name such as:

`game/presentation-causality.ts`

Choose naming consistent with repository conventions.

Define types/interfaces for the accepted C0 concepts, approximately:

```ts
type InteractionId = string;
type FrameId = string;
type CheckpointId = string;
type PresentationRevision = string | number;

type PresentationStage =
  | "ATTACK_RESPONSE"
  | "DUEL_EXCHANGE"
  | "GROUP_RESOLUTION"
  | "DAMAGE"
  | "DYING"
  | "JUDGEMENT"
  | "NEGATION"
  | "FORCED_ACTION"
  | "SETTLEMENT";

type ResolutionSemantics =
  | "SEQUENTIAL"
  | "ORDERED"
  | "GROUP";
```

Exact representation may differ if repository conventions support a better form.

Also model:
- immutable Frame origin;
- mutable current Frame state;
- causal envelope;
- parent frame link;
- optional historical `originRef`;
- checkpoint;
- public presentation revision.

Important:
- do not make `causeNodeId` mandatory;
- do not make `transitionId` mandatory;
- unresolved occurrence identity must not force fake IDs;
- do not include viewer-private `CurrentAction.options` in the causal envelope;
- do not encode gameplay legality in these types.

### Step 3 — define the minimum persisted causal envelope

Design/implement ONE authoritative optional envelope for unresolved interaction state.

Conceptually:

```ts
interface CausalEnvelope {
  interactionId: InteractionId;
  activeFrame: ...
  frameStack / frames: ...
  checkpoint: ...
  presentationRevision: ...
}
```

But choose the smallest representation that supports:
- one root Frame;
- active Frame;
- parent/child relationship;
- immutable origin;
- mutable current state;
- current Stage;
- current checkpoint;
- future C2 propagation.

Do NOT build a generic workflow engine.

Do NOT duplicate the engine Pending stack.

The envelope describes causal/presentation identity; Pending/Continuation still owns gameplay execution.

### Step 4 — choose server ID ownership

Define server-only constructors/helpers for new IDs.

Requirements:
- created only by authoritative server/orchestrator code;
- opaque;
- persisted;
- never regenerated during projection;
- never regenerated on reconnect;
- Quick Test viewer switching cannot change them.

For C1, IDs may be exercised by isolated unit/fixture tests. Do NOT yet insert them into every real gameplay root.

Document exactly which layer will call each constructor in C2.

### Step 5 — backward compatibility

Old rooms/persisted pending data without `causalEnvelope` must continue to load.

Required behavior in C1:
- missing envelope is valid legacy state;
- no projector/client crash;
- no automatic heuristic reconstruction persisted from card name/timeline;
- existing PresentationV2 may continue using the current legacy characterization path until C2/C5 replaces it.

If a DB migration is necessary:
- make it additive/nullable;
- no destructive rewrite;
- old records remain valid.

### Step 6 — public vs private boundary

Prove by types/tests that the causal envelope contains only public semantic state.

It must not contain:
- private hand identities;
- private response options;
- viewer-specific legal targets;
- viewer-specific capability choices.

`CurrentAction` remains viewer-projected separately.

Document this invariant in code comments and tests.

### Step 7 — presentationRevision semantics

Implement only the primitive ownership/update mechanism, not broad flow propagation.

Required properties:
- server-owned;
- persisted/reproducible;
- viewer-independent;
- monotonic or otherwise deterministic according to chosen representation;
- does not change merely because a different viewer requests state;
- does not replace `actionRevision`.

Add a focused test demonstrating:
- same authoritative causal state projected for two viewers -> same presentation revision;
- private CurrentAction differences do not mutate it.

If no real flow owns an envelope yet, use an authoritative persisted fixture/helper rather than client/projector-generated revision.

### Step 8 — checkpoint primitive

Implement the primitive for advancing checkpoint identity only through an explicit orchestrator helper.

Do not connect every decision flow yet.

Tests must show:
- explicit semantic checkpoint advance changes checkpoint;
- ordinary read/reconnect does not;
- presentation revision can change without changing checkpoint;
- actionRevision remains independent.

### Step 9 — Frame primitive

Provide explicit helpers for:
- create root Frame;
- create child Frame with `parentFrameId`;
- change Stage;
- update mutable current targets/effect;
- preserve immutable origin.

Test redirect semantics:

```
originalTargetIds = [B]
currentTargetIds = [B]

update current target -> [D]

assert originalTargetIds still [B]
assert currentTargetIds == [D]
```

Test child Frame:
- same interactionId;
- new frameId;
- correct parentFrameId;
- parent remains available for resume.

Do not implement gameplay redirect if it does not already exist. This is a causal-state primitive test only.

### Step 10 — storage/reload proof

Add the smallest engine/storage-backed test proving:

1. create/store a room with an optional causal envelope;
2. reload/read authoritative room state;
3. same interaction/frame/checkpoint/presentationRevision survives;
4. second viewer/read does not regenerate IDs;
5. old room without envelope still reads successfully.

Prefer existing D1/test-support patterns.

Do not fake this solely with an in-memory object if the production owner is persisted in DB.

### Step 11 — PresentationV2 boundary

Do NOT migrate the projector fully.

Only make the minimum type/boundary adjustment necessary so:
- it can accept/read the optional authoritative envelope in the future;
- legacy state without it still works exactly as before.

If no projector change is required for C1, leave it unchanged.

Do not mix C1 with C5.

### Step 12 — tests

Add focused tests for:
- semantic type/helper behavior;
- immutable origin vs mutable current;
- child Frame parent relationship;
- checkpoint explicit advance;
- presentationRevision independence;
- persistence/reload;
- legacy no-envelope compatibility;
- public/private separation.

Then run:
- focused new tests;
- existing `tests/presentation-v2.test.mjs`;
- existing `tests/api/presentation-v2-engine.test.mjs`;
- full fast suite;
- full API suite;
- build;
- lint;
- `git diff --check`.

Report exact counts.

### Step 13 — documentation

Create:

`docs/UX_V2_0C1_CAUSAL_ENVELOPE_IMPLEMENTATION.md`

Record:
- exact storage owner;
- schema/type shape;
- ID ownership;
- compatibility strategy;
- what C1 actually implemented;
- what remains intentionally unconnected until C2;
- any migration;
- test evidence.

Do not rewrite the C0 design to hide differences. If implementation evidence changes C0 assumptions, record the difference explicitly.

### Step 14 — HANDOVER replacement

At completion, completely replace `HANDOVER.md`.

It must contain ONLY:

```
# WTK UX V2 — Current Task Handoff

## Completed task result — UX2.0C1

Branch:
Commit:
Files changed:

### Storage owner
...

### Types/identity primitives implemented
...

### Compatibility result
...

### Persistence/reconnect proof
...

### Public/private proof
...

### Tests
...

### Deviations from C0
...

### Remaining blockers for C2
...

## Awaiting review
```

No old history.
No next task written by the Agent.

### STOP CONDITION

After committing/pushing C1 to `ux-v2` and replacing HANDOVER:

STOP.

Do NOT begin C2.

Do NOT propagate causal metadata through gameplay flows.

Do NOT modify React/CSS.

Wait for review.

## Acceptance criteria

C1 passes only if:

- HANDOVER remains tracked but HANDOVER-only pushes are excluded from CI/deploy;
- one authoritative persisted causal-envelope owner is chosen and justified;
- semantic identity types exist without becoming a second rules engine;
- IDs are server-owned and reconnect-stable;
- old rooms without envelope remain valid;
- immutable origin cannot be overwritten by current target changes;
- child Frame has explicit parent relationship;
- checkpoint changes only through explicit semantic advancement;
- presentationRevision is public/viewer-independent and distinct from actionRevision;
- no private legality/options enter the envelope;
- no broad C2 propagation has started;
- no React/CSS changes;
- full requested validation passes or failures are explicitly reported;
- HANDOVER contains only the C1 result when finished.
