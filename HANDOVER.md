# WTK UX V2 — Current Task Handoff

## Completed task result — UX2.0C0

Branch: `ux-v2`  
Design commit: `d7c125a`

Files changed:

- `docs/UX_V2_0C0_CAUSAL_IDENTITY_DESIGN.md`
- `HANDOVER.md`

Design-only work completed. No production gameplay, engine, React, CSS, or
main-branch changes were made.

### Causal identity decisions

- `interactionId`: server-owned lifetime of one continuous causal interaction;
  preserved across synchronous responses, damage, Dying/rescue, Duel,
  Negation, Group progress, and nested child Frames. Delayed future activation
  starts a new Interaction with `originRef`.
- `frameId`: server-owned lifetime of one independently resolving effect.
  Satisfying/modifying responses stay in the current Frame; independently
  resolving effects use a child Frame and `parentFrameId`.
- `Stage`: semantic metadata sourced from typed engine continuations, with
  proposed stages for Attack response, Duel exchange, Group resolution,
  Damage, Dying, Judgement, Negation, Forced Action, and Settlement.
- `checkpointId`: persisted server-owned stable player-facing boundary. It
  changes for responder/participant/decision/child-frame transitions, not for
  `actionRevision`, viewer switching, or cosmetic updates.
- `presentationRevision`: public projected-state revision, independent of
  checkpoint and `actionRevision`; it changes for material public snapshot
  changes but never authorizes gameplay commands.
- `resolutionId`, timeline `event.id`, and `actionRevision` remain separate
  legacy/reference or command-validity identities.
- Immutable origin fields remain separate from mutable current source/effect/
  targets, so redirect cannot rewrite historical root context.
- `parentFrameId`, `causeNodeId`, and `originRef` have distinct synchronous,
  semantic-occurrence, and later-history meanings.

### Group semantics proposal

The authoritative Group owner must expose:

```text
resolutionSemantics: SEQUENTIAL | ORDERED | GROUP
orderedParticipantIds?
currentParticipantId?
remainingParticipantIds
```

The projector must not infer order or simultaneity from arrays, seat sorting,
card names, or timeline order. Explicit effect order must survive seat-topology
changes, including Lust/order-sensitive effects.

### Dying barrier proposal

Reuse `CurrentAction.presentation.readyAfterEventId`. When lethal damage opens
`DyingPending`, persist the generic barrier reference to the essential public
damage/entered-Dying event before persisting the decision. Reconnect preserves
the reference; an already-presented event opens immediately. The existing
explicit `start_rescue_timer` behavior remains unchanged, with fairness tests
required to prove presentation delay cannot consume usable rescue time.

### Unresolved questions / blockers

- authoritative storage location for the causal envelope across old pending
  records and reload;
- canonical lethal-damage/entered-Dying event for every damage path;
- engine classification of effects as `GROUP`, `SEQUENTIAL`, or `ORDERED`;
- durable semantic occurrence identity for Transition Events;
- reconnect behavior when a barrier event has left the bounded log;
- smallest authoritative public settlement-outcome vocabulary;
- whether any Dying-triggered effect requires an independent child Frame.

### Validation performed

- Read and followed the remote `ux-v2` handoff task.
- Read the required UX2.0 design/audit, pending, protocol, projector,
  orchestration, and engine-backed test inputs.
- `git diff --check` passed for the design-only changes.
- No gameplay/UI test suite was run because no production source was changed.

## Awaiting review

Review `docs/UX_V2_0C_CAUSAL_IDENTITY_DESIGN.md`. Do not begin C1 until the
causal contract and unresolved gates are accepted. React/visual migration is
after C7. This handoff contains no historical task entries.
