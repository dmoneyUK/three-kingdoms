# UX2.0A — Presentation Identity Audit

Status: audit only. No gameplay, protocol, or UX implementation changes are
included in this document.

Branch: `ux-v2`  
Audit baseline: `origin/main` at `2cb87d5`  
Design source of truth: [`UX_V2_INTERACTION_STAGE_DESIGN.md`](UX_V2_INTERACTION_STAGE_DESIGN.md)

## Executive conclusion

The existing identities must not be renamed or directly promoted into the
UX2.0 semantic contract yet.

`resolutionId` is currently the closest identity to a causal interaction: it
is carried by Attack, Group, Negation, Judgement, and damage continuations in
many paths, and is projected consistently to all viewers for a current
response. It is not a complete `interactionId`, however. Card and card-group
events can create a fresh UUID through `addCardEvent` / `addCardGroupEvent`
when no explicit metadata is supplied, while informational events inherit the
latest marker and `latestResolutionId()` falls back to a new random UUID for
legacy or marker-free state. Nested effects also have continuation-specific
propagation rather than one verified lifetime contract.

Therefore:

- do not equate `resolutionId` with `interactionId` or `frameId`;
- do not use it as `checkpointId`;
- retain it as an existing presentation grouping hint during UX2.0B;
- add a pure projector and scenario tests before finalising Interaction,
  Frame, or Checkpoint identities.

Timeline `event.id` values are UUID-backed and are retained in the persisted
log, so they are suitable as stable references to already-emitted public
events and as the current `readyAfterEventId` barrier. They are not yet a
complete Transition Event contract: the timeline is bounded to the latest 200
entries, event identity and causal identity are separate, and the React client
still reconstructs sequences by scanning pending state, card names, phase, and
timeline order.

`actionRevision` is appropriate for command freshness and local selection
reset. It is derived by `actionRevisionFor()` from room status/phase, projected
actor, pending JSON, skill state, and a private-hand hash. It must remain
distinct from presentation identity: it can change while the causal scene is
stable, and a presentation checkpoint can change without requiring a new local
selection session.

## Evidence and current contracts

The design requires an audit of `resolutionId`, `readyAfterEventId`, timeline
event IDs, and `actionRevision` before introducing `interactionId`/`frameId`/
`checkpointId` (design sections 0.58–0.63).

Current implementation anchors:

| Identity | Current owner and lifetime | Audit result |
| --- | --- | --- |
| `resolutionId` | Engine pending/continuation fields and presentation metadata; propagated explicitly in many continuation transitions | Causal grouping hint, but creation and propagation are not uniform enough to be a stable Interaction identity |
| `readyAfterEventId` | Pending decision metadata; bound to the public event that explains a newly opened decision | Correctly models a visual gate, but its timer interaction needs an explicit usable-time guarantee |
| `event.id` | UUID in `@event`, `@card`, and `@cards` timeline records; deduplicated by the client | Stable persisted event reference; not by itself a causal frame or idempotent transition identity |
| `actionRevision` | Server projection hash from live room/decision state plus hand hash | Correct stale-submission boundary; not a scene/render key |

The server’s `presentationMeta()` assigns an explicit resolution when one is
provided and otherwise calls `latestResolutionId()`. Card/card-group helpers
currently default an omitted resolution to `crypto.randomUUID()`. The room
projection exposes the pending/current decision’s resolution and barrier, while
private capability options remain viewer-projected through `CurrentAction`.

## Scenario trace

The table records the current static contract. “Verified” means the existing
types and orchestration explicitly carry the identity. “Gap” means the path
needs a focused runtime fixture/projector test before UX2.0C.

| Flow | `resolutionId` lifecycle | Barrier and deadline | `actionRevision` | Timeline identity |
| --- | --- | --- | --- | --- |
| Attack → Dodge | The Attack declaration can carry the initiating resolution into `ResponsePending` and `AttackContinuation`; the Dodge event must preserve it when orchestration supplies it. Initial card-event creation otherwise defaults to a new ID. | The Dodge response is bound to the latest matching essential event where available. `nextResponseDeadline()` is created when the response is opened. | Changes with pending/phase/actor and hand changes; changes for the Dodge decision and subsequent continuation. | Attack/Dodge event IDs are stable UUIDs; no explicit transition-node identity exists. |
| Attack → Damage | Attack continuation carries the resolution into damage orchestration in the normal path. Damage-related card/message events can inherit or accidentally create a new marker depending on the call site. | Damage-about-to-apply and damage-suffered triggers can bind to the essential Attack/damage event; client waits for the barrier before controls. | Changes as response/trigger actor and pending continuation change. | Stable event IDs, but causal parentage is inferred rather than projected. |
| Damage → Dying → rescue | Damage-suffered continuation types include `resolutionId` and can carry nested resume data; Dying is a separate pending decision and does not have a documented universal interaction identity. | Rescue deadline is authoritative and can coexist with a damage/Dying presentation barrier. This is a usable-time risk until measured. | Changes for the rescue actor/pending state and stale protection. | Events remain reloadable, but the client’s active scene is reconstructed from pending fields and phase. |
| Group/AOE → response → damage → resumeGroup | Group continuation and its Negation/response paths explicitly carry a resolution in the main path; nested damage uses `resumeGroup`/`resumeDamageSuffered`, but the full identity matrix is not asserted. | Per-target response barriers may be derived from the latest matching event. Group advancement uses timeline scanning for a barrier in at least one path. | Changes for each target response/trigger; must be proven not to remount one group scene. | Stable IDs exist, but participant status and parent/child frame meaning are not projected. |
| Duel exchange | Duel continuation preserves domain resume data, but the reviewed type does not itself guarantee a resolution field across every exchange transition. | Response deadlines are opened by the current response pending state; barrier binding requires a Duel-specific fixture. | Changes as the active Duel responder changes. | Card events are stable; exchange and parent relationship are not explicit. |
| Negation → counter-Negation | Negation base/continuation and subsequent response transitions explicitly reuse `response.resolutionId`; this is the strongest current reuse case. | The first window can use the latest matching essential event; counter-Negation transitions can clear/rebind barriers. Deadline is created before the client gate is necessarily satisfied. | Changes for each counter actor and stale command boundary. | Negation card event IDs are stable; chain-node identity and parity are not a separate presentation record. |
| Borrowed Sword → forced Attack | The forced Attack continuation shown in the reviewed path has domain origin/holder/target resume data but no universal resolution propagation contract. | Target selection is hidden while `presentationBusy`; the forced Attack response needs a specific barrier/deadline fixture. | Changes between target choice and forced Attack response. | Client still uses `pendingBorrowedSword` and timeline scanning to determine the scene. |
| Judgement → modifier → result | Judgement continuations and final-result events explicitly reuse the Judgement resolution in the principal paths. Modifier/replacement branches need coverage for every card/provider. | Judgement reveal is an essential card presentation; optional modifier decisions retain a barrier in tested paths. Deadline usability remains unproven for delayed reveal plus response. | Changes for modifier choice and resumed result; reload preserves the same revision for an unchanged decision. | Reveal/result IDs are stable, but settlement and transition-event identities are not separately projected. |
| Damage trigger → secondary effect → nested damage | Damage trigger continuation types carry `resolutionId` plus `resumeDamageSuffered`; nested provider effects can create another domain continuation. The full parent/child reuse rule is not explicit. | Trigger decision may be bound to Attack/damage presentation; nested damage may bind a later event. This is the highest-risk barrier chain. | Must change for each real trigger/secondary decision; stale tests cover command safety, not a scene/checkpoint contract. | Stable event IDs, but parent causality is inferred from continuation fields and timeline order. |

### Reuse conclusion

There is evidence of intentional reuse of one `resolutionId` across a causal
card effect, especially Attack, Group, Negation, and Judgement. There is not
yet evidence that every nested independent effect either deliberately keeps
that ID or deliberately gets a child identity. The correct UX2.0C decision is
therefore an explicit parent/child rule, not a mechanical rename:

```text
existing resolutionId -> legacy causal grouping input
interactionId         -> stable public causal lifetime, to be defined
frameId               -> active effect / nested child lifetime, to be defined
checkpointId          -> stable rendered snapshot boundary, to be defined
actionRevision        -> command validity only
event.id              -> persisted public event reference
```

## Barrier and timer findings

The barrier intent is implemented: `readyAfterEventId` is bound by
`withPresentationBarrier()` to the exact event created at the decision
transition, and the client’s `responseDecisionReady` remains false until the
referenced essential event is presented. Informational messages are explicitly
non-blocking, consistent with the design.

The timer contract is not yet sufficient for UX2.0:

1. The server creates response/trigger/rescue deadlines when the pending
   decision is created (`nextResponseDeadline()` and pending constructors).
2. The client separately waits for `readyAfterEventId` before enabling the
   decision and before starting its response-timeout effect.
3. A slow poll, reconnect, long card/judgement presentation, or a long nested
   queue can therefore consume part of the authoritative response window
   before the player has usable controls. The current `responseCountdownVisibleAt`
   is a display offset, not proof that usable time is preserved.
4. `presentationBusy` also blocks ordinary controls and selected skill actions
   during visual presentation. That is appropriate for cosmetic sequencing
   only if an actionable choice cannot be delayed past its safe deadline.

UX2.0B must add tests that measure: barrier-open time, server deadline,
first-enabled-control time, timeout submission, reconnect, and reduced-motion /
fast-forward behaviour. The acceptance rule should be that cosmetic
presentation never silently removes the player’s usable authoritative choice
window; where necessary, the presentation must settle immediately or the
server must start the deadline at a defined usable boundary.

## Current client causal reconstruction

The first Projector should replace these client interpretations incrementally;
they are not gameplay legality rules, but they are duplicated presentation
causality:

- `pendingTimelineSequence()` chooses a root by scanning `pendingX` fields,
  source name, card name, and timeline order.
- `timelineSequenceFrom()` scopes the visible sequence from a chosen event ID.
- `effectiveSequenceStartId`, `scopedTimelineEvents`, and
  `sequenceEvents` combine pending state with timeline scans and card identity
  de-duplication.
- `coalescePresentationQueue()` groups visible events by the latest
  `resolutionId`, retaining essential/final-result events.
- `responsePresentationReady` searches the timeline for the barrier event and
  interprets its importance.
- `seatCountdown` derives display ownership from phase, pending fields, and
  deadlines; `Countdown` renders wall-clock time locally.
- `buildDecisionPresentation` correctly projects decision copy from
  authoritative fields, but it is not a causal Presentation Projector.

This confirms the design’s migration order: build a pure server-side
Presentation Projector over the existing Game/Pending/CurrentAction/events,
test it independently, then expose a stable projection. Do not make React a
second rules engine, and do not use `actionRevision` as the whole-stage React
key.

## UX2.0B blockers and recommended work

UX2.0B is not blocked from starting as a pure audit-to-projector step, but the
following must be resolved before UX2.0C identity finalisation:

- Add deterministic fixtures for all nine required flows and assert creation,
  propagation, replacement, and loss of `resolutionId`.
- Add a server-side projector test for stable root/active-frame/parent meaning
  without React or legality duplication.
- Define whether nested damage, Judgement modifiers, and Borrowed Sword forced
  Attacks are child Frames under one Interaction or independent Interactions.
- Define a bounded, idempotent Transition Event identity separate from
  persisted timeline event identity where their lifetimes differ.
- Prove that every real blocking decision changes `actionRevision`, while
  scene continuity does not depend on it.
- Add barrier/deadline tests for delayed presentation, reconnect, polling,
  timeout, Quick Test viewer switching, and reduced motion.
- Preserve private CurrentAction projection and existing semantic actions;
  `presentationV2` must remain descriptive and must not add legality fields or
  provider-specific HTTP actions.

No source/gameplay files were changed for UX2.0A. Per the task gate, UX2.0B
should wait for review of this audit.
