# WTK UX V2 — Current Task Handoff

## REMOTE HANDOVER RULE — MANDATORY

HANDOVER.md is tracked remote coordination state. It MUST be committed and pushed to origin/ux-v2. Never keep it local-only, ignore, untrack, revert, discard, or omit it. After implementation append the execution result, push implementation + HANDOVER, git fetch origin, verify origin/ux-v2:HANDOVER.md contains the result, then STOP.

**HANDOVER CLEANLINESS RULE:** This file contains only the current task. Previous tasks, reviewer verdicts, completion summaries, and historical execution results must be removed when the Planner writes the next task. Git history and architecture docs preserve history; HANDOVER does not.

Read and follow `docs/PLANNER_DEVELOPMENT_WORKFLOW.md`.

---

# NEXT TASK — UX2.0C7-01: Define the Minimal Authoritative PresentationSnapshot Contract

## Objective

C6 is closed. Introduce the first production `PresentationSnapshot` contract that packages the already-proven C1-C6 presentation semantics into one stable server-owned object for future React migration.

This task is **contract + projector composition + server protocol + engine/API characterization**. It is not visual UI work.

The snapshot must compose accepted authority; it must not become a new rules engine and must not invent semantic data that C1-C6 cannot prove.

Target architecture:

`Game Engine -> causal/semantic authority -> PresentationV2/projector -> PresentationSnapshot -> future React`

Do not delete legacy `presentationV2` compatibility fields yet.

## Accepted truth

Use the accepted C6 matrix in `docs/UX_V2_INTERACTION_STAGE_DESIGN.md` section `0.103` as the evidence boundary:
- 13 real interaction families;
- 128 P / 2 genuine N/A / 0 GAP;
- public semantic scene/roles/boundary are viewer-stable;
- CurrentAction remains local legality/control authority;
- projector does not generate causal IDs/revisions;
- reserved SETTLEMENT must not be manufactured from legacy finalResult/control metadata;
- legacy settlement/transitionEvents remain descriptive compatibility, not durable semantic authority.

## Authority contract

The first snapshot must expose the smallest sufficient stable contract.

Required top-level conceptual areas:

```text
PresentationSnapshot
  identity
  stable
  interaction
  decision
  localControl
  settlement
  transitionEvents
```

However, only fields with accepted authority may be populated.

### identity

Derive only from proven typed causal semantics:
- `interactionId`
- `checkpointId`
- `presentationRevision`

When no proven interaction owns the room, identity must be null/identity-free. Do not reconstruct identity from timeline IDs, resolutionId, actionRevision, CurrentAction, finalResult, or legacy compatibility fields.

### stable

Use the accepted `stableBoundary` classification:
- REST
- CHOICE
- SPECIAL
- SETTLEMENT remains reserved unless there is durable accepted authority.

Do not make SETTLEMENT reachable merely because it appears in the type.

### interaction

Compose from proven `interactionScene` / `participantRoles` and accepted causal envelope semantics.

At minimum expose enough typed public data for future Interaction Stage rendering:
- semantic/proven state;
- rootFrameId / activeFrameId / parentFrameId;
- stage;
- sourceId;
- originalTargetIds;
- activeTargetIds;
- currentParticipantId;
- decisionActorId;
- activeResolverId;
- participantIds;
- continuity relation.

Do not copy legacy `activeContext`/`parentContext` heuristics into the authoritative snapshot.

If root event/current effect cannot yet be represented with durable typed authority, keep the field null/absent and document the gap rather than deriving it from card names/timeline scanning.

### decision

Public semantic decision identity comes from the proven scene/boundary only.

It may expose the blocking actor and public reason/stage only where already proven. Do not expose viewer-private legal options/cards/providers.

### localControl

This is viewer-specific and must remain a thin projection/reference of authoritative CurrentAction semantics.

Do not duplicate legality logic inside PresentationSnapshot. Prefer a minimal shape sufficient for a future React consumer to know that local controls come from CurrentAction/actionRevision.

Private controls may differ by viewer while all public snapshot areas remain equal.

### settlement

Do not promote current legacy `presentationV2.settlement` to authoritative snapshot settlement unless a durable public occurrence link exists.

Expected first implementation: null/reserved, with explicit tests preventing legacy finalResult/readyAfterEventId from creating authoritative settlement.

### transitionEvents

Do not promote current legacy `transitionEvents` into a durable animation protocol in this task.

Expected first implementation: empty/reserved or explicitly compatibility-scoped, with documentation that durable occurrence identity remains future work.

Do not create new occurrence IDs.

## Step 1 — inventory existing projection/protocol path

Before coding, identify:
- where `PresentationV2` is built;
- where room/API responses expose it;
- where CurrentAction/actionRevision are projected per viewer;
- all current consumers/types that would be affected by adding `presentationSnapshot`.

Record the inventory in the execution result.

Do not modify React consumers in this task.

## Step 2 — define the TypeScript contract

Add a named typed `PresentationSnapshot` contract in the appropriate game/presentation module.

Prefer composition/reuse of accepted typed structures rather than parallel duplicate semantics.

The contract must clearly distinguish:
- public viewer-stable semantic data;
- viewer-private local control metadata;
- reserved/unimplemented settlement and transition-event semantics.

Do not make optional ambiguity hide authority. Use explicit null/empty values where fail-closed behavior matters.

## Step 3 — implement pure snapshot composition

Implement a pure projector/composer that consumes existing accepted presentation inputs/output and CurrentAction metadata.

Rules:
- no DB access;
- no ID generation;
- no mutation;
- no gameplay legality;
- no timeline search to invent causal authority;
- no Pending heuristic that bypasses C1-C6 proof;
- no fallback from unproven typed semantics to legacy contexts.

For a proven interaction, snapshot identity/public interaction must correspond exactly to the accepted typed scene.

For unproven/no interaction, public semantic identity must fail closed.

## Step 4 — expose snapshot in server room/API projection

Expose the new snapshot alongside existing `presentationV2`.

Do not remove or rename existing protocol fields.

Ensure per-viewer local control is projected only for the entitled viewer while public semantic portions are identical across viewers at the same authoritative checkpoint.

## Step 5 — engine-backed positive characterization

Use real existing C6 fixtures. Add snapshot assertions to representative families rather than duplicating setup.

Minimum required real families:
- Attack / Dodge;
- Attack -> Judgement -> Attack resume;
- Duel;
- Group/AOE;
- Group -> Damage child/resume;
- Group -> Damage -> Dying/rescue;
- root Negation/counter;
- standalone Judgement replacement;
- delayed Lightning Judgement -> Damage;
- Borrowed Sword.

For each representative assertion set prove as applicable:
- snapshot identity equals proven scene identity;
- frame/stage/participant roles equal accepted typed semantics;
- stable kind equals accepted stableBoundary;
- acting and uninvolved viewers have deep-equal public snapshot semantic portions;
- localControl differs only where CurrentAction entitlement differs;
- repeated reads do not create/change identity;
- terminal clear produces identity-free REST snapshot.

Do not require a second checkpoint for the two C6 N/A single-checkpoint cases.

## Step 6 — negative/fail-closed tests

Add focused tests proving:
- malformed checkpoint/active-frame coherence cannot create authoritative snapshot identity;
- unlinked Borrowed Sword Pending cannot create SPECIAL/public semantic authority;
- Dying actor/resolver mismatch fails closed;
- viewer-sensitive CurrentAction/finalResult cannot create public SETTLEMENT;
- legacy settlement/transitionEvents cannot resurrect snapshot identity after causal clear;
- projector/composer creates no new IDs/revisions.

Synthetic invalid states are acceptable for negative evidence only.

## Step 7 — public/private equality helper

Define a test-level way to compare the public portion of PresentationSnapshot separately from localControl.

Use it across at least Attack, Group/Dying, Negation, Judgement, and Borrowed Sword.

Do not solve equality by omitting useful public semantics for the acting viewer.

## Step 8 — reconnect/repeated-read stability

At minimum prove for:
- Attack;
- Group child/resume;
- Judgement;
- Dying.

Same authoritative checkpoint read twice must preserve:
- identity;
- public interaction;
- stable classification.

Projection must not increment revision or generate IDs.

## Step 9 — documentation

Update `docs/UX_V2_INTERACTION_STAGE_DESIGN.md` with a C7 section containing:
- exact implemented snapshot type;
- authority source for every field/group;
- public vs private classification;
- reserved fields and why they remain reserved;
- compatibility relationship with `presentationV2`;
- real fixture evidence;
- remaining work before React migration.

Update README to say C7 snapshot contract implementation is in progress/implemented as appropriate. Do not claim visual UX changed.

## Step 10 — stop before React

This task must end with server-side snapshot contract/evidence only.

Do not migrate `app/page.tsx`, seat layout, local dock, Interaction Stage, target selection, animations, or CSS.

A later reviewer-approved task will decide whether C7 needs another closure slice before UI-01.

## Evidence ledger

For each snapshot field/group record:

`snapshot field/group -> authoritative source -> exact production composer -> exact real fixture/assertion -> PUBLIC / PRIVATE / RESERVED -> PASS / GAP`

Rules:
- PUBLIC requires viewer-equality evidence.
- PRIVATE requires entitlement separation evidence.
- RESERVED must not be populated by compatibility heuristics.
- GAP remains visible; do not invent authority to eliminate it.

## Validation

Run focused snapshot tests, then:
- `npm run test:fast`
- `npm run test:api`
- `npm run build`
- `npm run lint`
- `git diff --check`

Report exact counts.

## Scope exclusions

Do not:
- modify React/CSS;
- implement visual UX;
- change gameplay;
- redesign C1-C6 causal semantics;
- remove legacy PresentationV2;
- reconstruct public authority from CurrentAction;
- promote legacy settlement/finalResult to authoritative SETTLEMENT;
- invent durable transition occurrence IDs;
- replay timeline to reconstruct snapshot identity;
- duplicate legality rules;
- perform unrelated refactors.

## Execution result

Append only the C7-01 result to this HANDOVER.

Include:
- full implementation SHA;
- files changed;
- exact PresentationSnapshot type/shape;
- production projection path;
- field authority ledger;
- real fixtures extended;
- viewer public/private evidence;
- reconnect/repeated-read evidence;
- fail-closed evidence;
- RESERVED/GAP fields;
- confirmation whether gameplay/React/CSS changed;
- exact validation counts;
- whether C7 is ready for reviewer closure or needs another bounded slice.

Push implementation + appended HANDOVER to `origin/ux-v2`, fetch, verify remote HANDOVER contains the result, then STOP.

## Acceptance

C7-01 passes only if PresentationSnapshot is a thin, typed composition of accepted C1-C6 authority; public semantics are viewer-stable; private CurrentAction-derived controls remain local; identity fails closed; no IDs/revisions are generated by projection; settlement/transition semantics are not fabricated; representative real engine/API fixtures prove the contract; legacy PresentationV2 remains compatible; and no React/gameplay scope creep occurs.
