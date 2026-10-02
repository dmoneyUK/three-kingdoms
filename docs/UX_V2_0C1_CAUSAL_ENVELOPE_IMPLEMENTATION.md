# UX2.0C1-FIX — Causal Envelope Implementation Notes

This document records the narrow C1 infrastructure and proof work. It does
not authorize C2 propagation into gameplay flows.

## Persisted owner

Candidate locations were:

- `pending_json`: rejected because it would duplicate causal identity across
  every Pending/Continuation variant and would disappear whenever automatic
  resolution has no Pending object;
- `skill_state_json`: rejected because it is gameplay hero/turn state and has
  private/domain ownership semantics;
- `log_json`: rejected because the timeline is bounded public history, not
  current unresolved state;
- a separate `rooms.causal_envelope_json`: selected as the single optional
  Room-level owner beside phase, turn, Pending, and public timeline state.

The additive nullable column is read by the production `roomState()` boundary
and parsed independently from viewer-private `CurrentAction`. Future C2
orchestrator transitions must update this column with the corresponding
Pending/timeline mutation in the same D1 statement, batch, or CAS boundary.
No real gameplay root creates an envelope in C1.

## Primitives

`app/api/causal-envelope.ts` contains server/orchestrator-only constructors and
defensive-copy helpers for:

- explicit checkpoint advancement;
- public revision advancement without a checkpoint change;
- child Frame creation under the active Frame;
- active Frame switching;
- Stage changes;
- mutable current source/effect/target/resolver updates;
- parent Frame resume.

All child operations preserve `interactionId`, create a new child `frameId`,
and retain the parent Frame. Origin fields and target arrays are readonly in
the shared type and are defensively copied. Current-target redirect mutation
therefore cannot rewrite `originalTargetIds`.

## Parser invariants

`parseCausalEnvelope()` returns `null` safely for missing, malformed, legacy,
or structurally impossible JSON. It rejects duplicate Frame IDs, missing or
self-referencing parents, missing active/checkpoint Frames, checkpoint Stage
mismatches, negative/non-integer presentation revisions, and invalid Frame
origin/current shapes.

No identity is reconstructed from card names, timeline text, `resolutionId`,
`event.id`, `actionRevision`, or viewer-private state.

## D1 persistence/reload evidence

`tests/api/presentation-causality.test.mjs` writes a complete envelope into
`rooms.causal_envelope_json`, then reads it through the production
`GET /api/rooms` room-state boundary for both the acting and waiting viewers.
The test verifies unchanged `interactionId`, active `frameId`,
`checkpointId`, and `presentationRevision`, plus exact persisted JSON after
reload. A separate test verifies a legacy `NULL` envelope projects as `null`.

## Viewer-independence evidence

The D1 proof uses an active Attack response so the acting viewer receives
private response options while a waiting viewer does not. Both receive the
same public causal envelope byte-for-byte. The envelope type has no hand,
legal-target, response-option, or capability-choice fields.

## Deviation and remaining boundary

The C1 envelope remains optional and is not propagated through real Attack,
Duel, Negation, Group, Judgement, Damage, or Dying flows. Group semantics and
Dying barriers remain deferred. `resolutionId`, timeline `event.id`, and
`actionRevision` remain unchanged.
