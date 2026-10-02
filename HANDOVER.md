# WTK UX V2 — Current Task Handoff

Updated: 2026-10-02
Branch: `ux-v2`

This file is intentionally ephemeral. It contains ONLY:
1. the result of the task that was just reviewed; and
2. the exact next task for the coding agent.

When the next task is reviewed, replace this file completely. Do not append historical handoff entries.

## Reviewed result — UX2.0B-FINAL

The latest engine-backed verification establishes:

- Dying/rescue: the real decision starts with `deadline = 0`; `start_rescue_timer` explicitly arms the deadline; reconnect preserves the armed deadline; timeout advances correctly. No evidence was found that presentation delay consumes rescue time before arm. However, Dying currently exposes no `CurrentAction.presentation.readyAfterEventId`.
- Group/AOE: a real nested damage/trigger path projects the nested effect as ACTIVE and the typed Group continuation as PARENT, then resumes to the next participant. Group execution ordering semantics remain `UNPROVEN`.
- Duel: the real response actor and `actionRevision` alternate while root kind/source remain conceptually stable, but the legacy `resolutionId` changes. Therefore `resolutionId` cannot be Interaction identity.
- Negation/counter-Negation: the original effect remains recoverable, but the directly referenced public event can change and there is no sufficiently typed parent contract for the complete causal relationship.
- Judgement: real reveal, replacement, effective result, delayed parent, and resume are proven.
- Nested damage: Group-trigger parent/resume direction is proven.
- Generic shape probing has been reduced to normalization/unsupported-continuation boundaries.

Review decision: **UX2.0C implementation is NOT READY.**

This does NOT mean to continue adding unlimited projector fixtures. The remaining problem is now architectural: the engine/orchestrator needs a small authoritative causal-semantic contract. The next task is design-only so that those semantics are specified before implementation.

Known remaining gaps:
- universal Interaction/root lifetime;
- authoritative Frame parent/child lifetime;
- Dying presentation-barrier metadata;
- authoritative Group ordering/resolution semantics;
- stable checkpoint/presentation identity distinct from `resolutionId`, `event.id`, and `actionRevision`;
- a small number of flows still lack a complete direct final-projector trace.

## NEXT TASK — UX2.0C0: Minimum Authoritative Causal Contract Design

### Scope

DESIGN/AUDIT ONLY.

Do not implement the new causal contract in this task.

Read completely before editing:
- `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`
- `docs/UX_V2_0A_PRESENTATION_IDENTITY_AUDIT.md`
- this `HANDOVER.md`
- `game/pending.ts`
- `game/protocol.d.ts`
- `game/presentation-v2.ts`
- relevant orchestration code
- `tests/api/presentation-v2-engine.test.mjs`

### Git constraints

Work only on `ux-v2`.

Do NOT:
- modify or merge `main`;
- self-merge `ux-v2`;
- start React/CSS/visual work;
- change gameplay rules;
- introduce production IDs in source code;
- repurpose `resolutionId`;
- use `event.id` as Interaction identity;
- use `actionRevision` as presentation identity;
- add projector heuristics to hide missing engine semantics.

### 1. Treat UX2.0B evidence as constraints

The design must respect:

- `resolutionId` is legacy/reference metadata, not Interaction/Frame/Checkpoint identity.
- Duel can change `resolutionId` while remaining the same player-meaningful Duel.
- `event.id` identifies a persisted public event, not an Interaction.
- Negation can change its current event reference while the original effect remains causal context.
- `actionRevision` remains gameplay command/stale validity only.
- Group nested damage proves ACTIVE child + Group PARENT is representable.
- Judgement proves ACTIVE judgement + delayed PARENT is representable.
- Dying/rescue timer is explicitly armed and survives reconnect.
- Dying currently lacks `readyAfterEventId`.
- Group ordering semantics are not yet authoritative.

Do not propose a contract that contradicts these facts.

### 2. Design four separate identities

Specify exact semantics for:

`interactionId`
`frameId`
`checkpointId`
`presentationRevision`

For EACH specify:
- authoritative owner;
- creation point;
- lifetime;
- persistence;
- public/private status;
- what changes it;
- what must NOT change it;
- reconnect behavior;
- Quick Test viewer-switch behavior;
- nested-child behavior.

No UI-generated/random identity may be authoritative.

### 3. Interaction contract

Interaction represents one continuous player-understood causal event.

Pressure-test the proposed lifetime against:

- Attack -> Dodge -> Damage -> Dying -> Peach -> survive/defeat;
- Duel with alternating Attack requirements;
- stratagem -> Negation -> counter-Negation -> resume/cancel;
- Group/AOE -> participant resolution -> nested damage -> resume Group;
- Borrowed Sword -> forced Attack -> Dodge/damage -> return;
- Judgement;
- nested damage trigger;
- redirect;
- delayed future activation.

Default design rule: synchronous child effects remain inside the same Interaction unless real engine semantics require otherwise.

A delayed/persistent effect activating in a later turn/time must be a NEW Interaction linked by `originRef`; do not reopen the old Interaction.

### 4. Frame contract

Frame means an independently resolving effect inside an Interaction.

Define creation/boundary rules from effect semantics, not implementation call stack or card names.

Explicitly decide and justify:
- Attack response/Dodge: same Attack frame;
- Duel response Attacks used only to satisfy Duel: same Duel frame;
- ordinary Negation modifying/cancelling current effect: same frame unless evidence requires otherwise;
- Group participant response: same Group frame;
- Group child effect that independently resolves: child frame;
- Borrowed Sword forced normal Attack: expected child Attack frame if it runs ordinary Attack/Dodge/Damage/Dying semantics;
- Damage -> Dying: decide same frame/stage versus child frame using player-meaningful semantics.

### 5. Immutable origin vs mutable current state

Design immutable frame origin fields such as:

`originSourceId`
`originEffect`
`originalTargetIds`

and mutable authoritative current fields such as:

`currentSourceId`
`currentEffect`
`currentTargetIds`
`resolvingPlayerId`

Redirect must support:

original target = B
current target = D

without rewriting historical origin.

Never derive origin from current target as a fallback.

### 6. Parent/child/history links

Specify distinct meanings for:

`parentFrameId?`
`causeNodeId?`
`originRef?`

Required distinction:
- `parentFrameId`: synchronous nested-resolution parent;
- `causeNodeId`: semantic/public occurrence that caused the child frame;
- `originRef`: historical link from a NEW later Interaction to an earlier source.

Do not overload one field for all three.

### 7. Stage

Stage is semantic state, not an identity.

Propose the smallest vocabulary justified by existing authoritative engine states. Possible concepts include ATTACK_RESPONSE, DUEL_EXCHANGE, GROUP_RESOLUTION, DAMAGE, DYING, JUDGEMENT, NEGATION, FORCED_ACTION, but do not adopt names mechanically.

For every proposed Stage identify the authoritative engine evidence that determines it.

Reject any Stage that requires React/timeline/card-name guessing.

### 8. Checkpoint contract

Checkpoint is a stable player-facing semantic boundary inside a Stage/Frame.

Specify when it changes.

Pressure-test:
- Duel responder changes -> new checkpoint, same Duel frame/Interaction;
- Dying rescuer changes -> new checkpoint;
- Group advances participant A -> B -> new checkpoint;
- Negation decision actor changes -> new checkpoint;
- pure cosmetic/HP rendering changes should not automatically create a checkpoint.

Do NOT derive `checkpointId` from `actionRevision`.

Specify how checkpoint identity is authoritatively created/persisted/reconstructed.

### 9. presentationRevision

Define `presentationRevision` independently from checkpoint and action revision.

It may change when the authoritative projected public presentation materially changes even if checkpoint remains the same.

It must never replace `actionRevision` for gameplay stale-command protection.

Explain with at least two concrete scenarios why both revisions are required.

### 10. Group semantics

Locate where the ENGINE actually owns participant execution order.

Design the minimum authoritative semantic addition required to expose:

`resolutionSemantics: SEQUENTIAL | ORDERED | GROUP`

and where relevant:

`orderedParticipantIds`
`currentParticipantId`
`remainingParticipantIds`

The projector must never infer this from:
- array iteration;
- seat sorting;
- card names;
- timeline order.

Explicitly pressure-test Lust/order-sensitive effects: effect order must survive independently of seat topology.

If `GROUP` means simultaneous semantics, define exactly what that means. Do not introduce it merely because there are multiple targets.

### 11. Dying presentation barrier

Design the minimum authoritative fix for Dying's missing barrier metadata WITHOUT changing the proven timer-arm behavior.

Prefer reusing:

`CurrentAction.presentation.readyAfterEventId`

rather than introducing a Dying-specific field.

Specify:
- which essential public event should supply the ID;
- when it is assigned;
- reconnect behavior;
- behavior if already presented;
- relationship to `start_rescue_timer`;
- why presentation delay cannot silently consume the intended rescue window.

### 12. Transition Event contract

Define the relationship among:
- persisted timeline `event.id`;
- Interaction;
- Frame;
- Checkpoint;
- Transition Event.

Transition Events are NOT the Game Log.

Prefer references to authoritative semantic occurrences rather than duplicated prose.

Specify:
- event identity;
- causal association;
- bounded lifetime;
- reconnect/idempotency;
- whether replay is required (expected: latest stable snapshot must render without replay).

### 13. Scenario matrix

The design document MUST contain a table with rows:

- Attack/Dodge
- Attack/Damage/Dying/Peach
- Duel
- Negation/counter-Negation
- AOE normal participant
- AOE nested damage
- Borrowed Sword forced Attack
- Judgement
- nested damage trigger
- redirect
- delayed future activation
- defeat during Group

Columns:

Interaction lifetime
Frame(s)
Parent frame
Stage(s)
Checkpoint changes
Root preserved?
Group semantics
Barrier
Evidence / unresolved issue

Do not mark an unresolved item as proven.

### 14. Migration plan

Design, but do not execute, these implementation slices:

C1 — semantic identity metadata/types
C2 — propagate Interaction/Frame through orchestrator
C3 — authoritative Group semantics
C4 — Dying barrier metadata
C5 — update PresentationV2 projector
C6 — engine-backed architecture tests
C7 — expose final stable PresentationSnapshot contract

React migration occurs only after C7.

Visual UX implementation occurs after the presentation contract is accepted.

### 15. Deliverable

Create:

`docs/UX_V2_0C_CAUSAL_IDENTITY_DESIGN.md`

Do NOT modify `docs/UX_V2_INTERACTION_STAGE_DESIGN.md` during C0. The C0 proposal must be reviewed before it becomes source-of-truth design.

When finished, replace this HANDOVER.md completely again so it contains ONLY:

1. `# WTK UX V2 — Current Task Handoff`
2. `## Completed task result — UX2.0C0`
3. branch + commit SHA
4. files changed
5. concise design decisions for Interaction/Frame/Stage/Checkpoint/presentationRevision
6. Group semantics proposal
7. Dying barrier proposal
8. unresolved questions/blockers
9. exact validation performed
10. `## Awaiting review`

Do not include older handoff history.

Commit and push to `ux-v2`.

STOP after C0.

Do NOT start C1 implementation.

## Acceptance criteria

C0 is complete only if:
- no production gameplay/UI implementation was changed;
- all four identities have precise non-overlapping lifetimes;
- `resolutionId`, `event.id`, and `actionRevision` are explicitly kept separate;
- root/origin cannot mutate with active target;
- parent/cause/origin links are differentiated;
- Group order comes from proposed engine authority, not projector inference;
- Dying barrier has a concrete authoritative proposal;
- all required scenarios are pressure-tested;
- implementation is split into C1-C7;
- unresolved questions are explicitly listed rather than guessed.

## Awaiting agent execution

After completing the task, STOP and wait for review.
