# WTK UX V2 — Current Task Handoff

## Completed task result — UX2.0C1

Branch: `ux-v2`  
Implementation commit: `0536efabf4762f2415551dff8eff4f2dcb4de1f0`

### Files changed

- `game/presentation-causality.ts`
- `app/api/causal-envelope.ts`
- `db/schema.ts`
- `drizzle/0010_salty_cobalt_man.sql`
- `drizzle/meta/0010_snapshot.json`
- `drizzle/meta/_journal.json`
- `app/api/rooms/route.ts`
- `.github/workflows/deploy.yml`
- `tests/presentation-causality.test.mjs`
- `tests/run-fast-tests.mjs`
- `HANDOVER.md`

### Persisted ownership decision

The single authoritative optional owner is `rooms.causal_envelope_json`,
alongside `pending_json`, phase, turn, and public timeline state in the same
Room row. This avoids duplicating identity fields across the Pending union.
Future C2 transitions can update the envelope and Pending in the same D1
statement/batch/CAS boundary. The additive nullable migration preserves old
rooms and old Pending JSON unchanged.

The current C1 implementation does not create envelopes for real gameplay
roots yet. C2 owns that propagation decision.

### Semantic types and boundaries

Added shared public types for `InteractionId`, `FrameId`, `CheckpointId`,
`PresentationRevision`, provisional `PresentationStage`, and provisional
`ResolutionSemantics`, plus immutable origin, mutable current Frame state,
parent/cause/origin links, checkpoint, frame list, active frame, and envelope.

`causeNodeId` and Transition Event identity remain optional/unresolved. The
envelope contains no hand cards, private response options, legal targets, or
viewer-specific capability data. `CurrentAction` remains separate.

Server-only constructors create opaque Interaction/Frame/Checkpoint IDs. They
are not called by the projector, client, or any C1 gameplay root.

`presentationRevision` is persisted in the public envelope, defaults to zero
for a newly constructed fixture, and advances only through the authoritative
server helper. Private viewer differences do not affect it.

### Compatibility and CI

- Missing, malformed, or legacy `causal_envelope_json` parses as `null` without
  reconstructing identity from cards, timeline text, or viewer state.
- Room projection exposes only the parsed public envelope; private
  `CurrentAction` remains viewer-specific.
- `HANDOVER.md` remains tracked.
- `.github/workflows/deploy.yml` now ignores `HANDOVER.md` for both push and
  pull-request triggers, while mixed source changes still trigger normal CI.

### Validation performed

- C1 focused tests: 3/3 passed.
- Fast suite: 102/102 passed.
- API suite: 210/210 passed.
- `npm run build` passed.
- `npm run lint` passed.
- `git diff --check` passed.

No React/CSS, gameplay rules, broad Pending propagation, Group classification,
Dying barrier behavior, or C2 implementation was started.

## Awaiting review

Review the C1 envelope ownership and type contract. The next authorized slice
is C2 propagation through the orchestrator only after review. Do not classify
Group effects, add Dying barriers, or migrate PresentationV2/React yet.
