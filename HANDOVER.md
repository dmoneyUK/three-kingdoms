# WTK UX V2 — Current Task Handoff

## Completed task result — UX2.0C1-FIX

Branch: `ux-v2`  
Commit: `9b3d1df` (`feat: complete causal envelope primitives`)  
Files changed:

- `app/api/causal-envelope.ts`
- `game/presentation-causality.ts`
- `docs/UX_V2_0C1_CAUSAL_ENVELOPE_IMPLEMENTATION.md`
- `tests/presentation-causality.test.mjs`
- `tests/api/presentation-causality.test.mjs`
- `tests/run-api-suite.mjs`

### Primitives added

- Explicit checkpoint advancement creates a new `checkpointId`, preserves `interactionId` and the active `frameId`, and advances `presentationRevision` without touching `actionRevision`.
- Presentation revision can advance without changing the checkpoint.
- Child Frame creation, active Frame switching, Stage changes, mutable current-state updates, and parent Frame resume are authoritative server/orchestrator helpers.
- Child Frames preserve the Interaction and parent Frame; current-state redirect updates preserve immutable origin data.
- Origin fields and target arrays are readonly in the shared types and defensively copied by constructors/helpers.

### Parser invariants

`parseCausalEnvelope()` safely returns `null` for missing, malformed, legacy, or structurally impossible data. It rejects duplicate Frame IDs, missing or self-referencing parents, missing active/checkpoint Frames, checkpoint Stage mismatches, invalid Frame shapes, and negative/non-integer presentation revisions.

### D1 persistence/reload proof

`tests/api/presentation-causality.test.mjs` writes a valid envelope to `rooms.causal_envelope_json`, reloads it through production `GET /api/rooms`, and verifies the same `interactionId`, active `frameId`, `checkpointId`, `presentationRevision`, and persisted JSON. A legacy `NULL` envelope remains `causalEnvelope: null`.

### Viewer-independence proof

The persistence test reads the same active Attack response as acting and waiting viewers. Private response options differ by viewer, while the public causal envelope is identical. No hand identities, legal targets, response options, or capability choices enter the envelope.

### Validation

- focused causal primitives: 6/6
- D1/API persistence proof: 2/2
- `tests/presentation-v2.test.mjs`: 17/17
- `tests/api/presentation-v2-engine.test.mjs`: 8/8
- full fast suite: 105/105
- full API suite: 212/212
- `npm run build`: passed
- `npm run lint`: passed
- `git diff --check`: passed

### Scope boundary

C2 is not started. Causal metadata is not propagated through real Attack, Duel, Negation, Group, Judgement, Damage, or Dying gameplay. No React/CSS changes, gameplay-rule changes, PresentationV2 migration, Group classification, or Dying barrier work was made. `resolutionId`, timeline `event.id`, and `actionRevision` remain unchanged.

Awaiting reviewer verification. Do not begin C2 until explicitly authorized.
