# WTK UX V2 — Current Task Handoff

## Reviewer status

UX2.0C2-FIX remains **PARTIAL**. Do not start C3.

The latest slice materially improves Borrowed Sword runtime causal wiring, but the submitted result itself and repository inspection still show the core C2 acceptance gates are open.

### Accepted from this slice

- Real Borrowed Sword target selection now creates an `ATTACK_RESPONSE` child Frame under a `FORCED_ACTION` parent.
- The child keeps the same `interactionId` and has an explicit `parentFrameId`.
- Borrowed Sword refusal/invalidation has an explicit parent-resume path.
- Root Negation and ordinary Attack response entry have additional envelope persistence coverage.
- No C3 Group classification, Dying barrier, PresentationV2 migration, React/CSS work, or gameplay-rule redesign was introduced.
- Reported validation remains green: causal-context 2/2, focused causal 8/8, fast 107/107, API 212/212, build/lint/diff-check passed.

### Why C2 is still not accepted

Repository review confirms the C2 document still explicitly lists these as open:

1. centralized envelope persistence is not used by every supported automatic Pending/Continuation transition;
2. Group-nested damage and independent nested-damage child Frame runtime wiring are not complete;
3. Damage → Dying causal lifetime lacks the required engine-backed persisted-envelope proof;
4. Judgement lifetime is not fully proven end-to-end;
5. delayed activation / `originRef` lifetime remains UNPROVEN;
6. explicit Interaction settlement / envelope clearing remains unproven;
7. reconnect / second-viewer / stale-double-action assertions are incomplete for the C2 scenario matrix.

The existing `tests/api/presentation-causality.test.mjs` still mainly proves generic D1 persistence/viewer behavior by manually storing an envelope. That is useful C1 evidence but does not replace real-flow C2 engine evidence.

One additional design caution: `recoverCausalEnvelope()` is described as best-effort recovery from a Pending handle. Do not expand this into heuristic mid-flow reconstruction. C2 identity must originate from authoritative root/child creation and persisted state. Recovery may only preserve already-authoritative IDs from an existing typed causal context, and must never infer missing causal structure from card names/logs.

---

# NEXT TASK — UX2.0C2-FIX2: Close Remaining Engine-Backed Causal Gates

## Objective

Finish the remaining C2 gates. Do not add more broad causal-reference plumbing unless it directly closes one of the evidence gaps below.

The goal is to reach a point where C2 can be accepted from **real persisted gameplay flows**, not helper/unit evidence.

## Workflow

Work only on `ux-v2`.

At start:
```
git fetch origin
git checkout ux-v2
git pull --ff-only origin ux-v2
```

Do not modify/merge `main`. Do not self-merge.

The Code Agent only appends its execution result to this HANDOVER. The reviewer will clean and replace the file after review.

## Step 1 — build a failing/passing evidence matrix first

Update `docs/UX_V2_0C2_CAUSAL_PROPAGATION.md` before implementation with this exact matrix and current status:

- Attack → Dodge
- Attack → Damage
- Attack → Damage → Dying
- Duel alternating responders
- Negation → counter-Negation
- Group participant progression
- Group → nested child → parent resume
- Borrowed Sword → forced Attack child → parent resume
- Judgement reveal → replacement → effective result → resume
- independent nested damage trigger → child → parent resume
- redirect/current-target mutation
- delayed future activation
- settlement/clear
- reconnect identity stability
- second-viewer public identity stability
- stale/double-action identity safety
- legacy NULL envelope
- malformed envelope

For each row record:
`PROVEN | PARTIAL | UNPROVEN | NOT IMPLEMENTED IN GAME`

and name the exact API/engine test that proves it.

Do not mark a row PROVEN from helper-only tests.

## Step 2 — centralize atomic semantic writes

Finish the authoritative persistence boundary.

For each supported semantic transition that changes Pending/phase/timeline and causal state, persist the relevant values together:
- `pending_json`
- `causal_envelope_json`
- phase
- timeline/log when that transition changes it.

Use existing D1 batch/CAS/stale-action mechanisms.

Acceptance proof:
- real API test observes no new Pending with old envelope;
- stale/repeated command does not create another checkpoint/frame/revision;
- failed guarded write leaves both gameplay and causal state unchanged.

Do not scatter ad-hoc repair SQL.

## Step 3 — prohibit heuristic envelope reconstruction

Audit every use of `recoverCausalEnvelope()`.

Allowed only when:
- a typed persisted `CausalContext` already contains authoritative `interactionId` + `frameId`;
- the recovery recreates the same known identity after legacy/migration storage absence;
- no parent/child/origin relationship is guessed.

Not allowed:
- deriving root/frame identity from card kind/name;
- timeline/log scan;
- `resolutionId`;
- event ID;
- actionRevision;
- current Pending shape without an authoritative causal handle.

If a safe reconstruction cannot recreate the full frame tree, prefer legacy/null behavior rather than inventing a partial tree that falsely claims authority.

Add tests for this boundary.

## Step 4 — Attack → Damage → Dying engine proof

Add a real lethal Attack API test.

At stable boundaries assert persisted/public envelope:
- root Attack creates one interactionId/frameId;
- response boundary preserves them;
- Damage Stage uses same Interaction/Frame;
- Dying Stage uses same Interaction/Frame unless actual independent child work starts;
- Attack origin source/effect/original target remain unchanged;
- current resolver/target reflects current Dying decision;
- reconnect preserves IDs/checkpoint;
- rescue/survival or defeat reaches correct settlement;
- final causal envelope clears only after synchronous Interaction work is done.

Do not alter rescue timer behavior.
Do not implement Dying `readyAfterEventId` in this task.

## Step 5 — Group nested child runtime proof

Use the real Group continuation path already present in the engine.

Prove from persisted envelope:
1. parent Group Frame active;
2. participant progression remains same Interaction + parent Frame;
3. independently resolving nested effect creates a child Frame;
4. child.parentFrameId = Group Frame;
5. child becomes active;
6. child settles;
7. parent Group Frame resumes exactly once;
8. checkpoint changes at the actual resume boundary;
9. no premature Interaction clearing.

Do not classify Group ordering semantics.

If the engine path does not actually represent an independent child effect, document that evidence and select a real independent nested effect instead.

## Step 6 — independent nested-damage trigger proof

Use an existing real damage-trigger flow.

If it independently resolves:
- push child Frame;
- same Interaction;
- explicit parent;
- settle child;
- resume parent.

If it is only a modifier/same-effect continuation:
- keep same Frame;
- document why.

Do not force child Frames just to satisfy the design.

## Step 7 — Judgement end-to-end proof

Use a real Judgement flow and prove:
- Judgement entry identity;
- reveal;
- replacement/modifier decision where available;
- effective result;
- delayed parent resume.

All internal same-effect Judgement decisions keep the Judgement Frame.

If Judgement is itself nested under another active effect, it must have a real parent Frame and resume that parent after settlement.

Test persisted/public envelope at each stable boundary.

## Step 8 — Duel and Negation regression identity proofs

Add/extend engine-backed assertions:

### Duel
- alternating responder changes actionRevision/checkpoint as appropriate;
- interactionId and frameId stay stable;
- response Attack does NOT create child Frame;
- legacy `resolutionId` changes do not define causal identity.

### Negation
- original root origin remains immutable;
- Negation and counter-Negation stay in the correct causal Frame unless engine evidence shows independent child effect;
- changing public event references does not rewrite interaction/frame/root origin.

## Step 9 — delayed activation

Use a real delayed effect if available.

Required:
- original Interaction is settled/cleared;
- later activation starts new interactionId + new root frameId;
- `originRef` links provenance only when authoritative historical identity was persisted;
- no parentFrameId crosses Interaction lifetime.

If the engine does not persist enough provenance, mark this row UNPROVEN and document the exact missing authoritative field. Do not add speculative reconstruction.

## Step 10 — explicit settlement/clear rule

Centralize the rule that clears active causal state.

Clear `causal_envelope_json` only when:
- root + descendants are settled;
- no synchronous continuation remains;
- no blocking decision remains.

Test:
- not cleared while child active;
- not cleared when parent resumes;
- cleared after root completion;
- unrelated next action gets a fresh interactionId;
- stale/double action after settlement cannot resurrect old envelope.

Do not solve final UI settlement retention here.

## Step 11 — reconnect / viewer / corruption proof

Real-flow API tests must cover:
- reconnect during Attack/Dying or another active flow keeps identity;
- acting and waiting viewers see identical public envelope;
- private CurrentAction options differ without changing public envelope;
- legacy NULL remains functional;
- malformed stored envelope does not crash;
- malformed/missing envelope is not heuristically reconstructed into fake authority.

## Step 12 — Borrowed Sword regression

Keep the new Borrowed Sword child Frame behavior and add enough assertion to ensure later fixes do not regress it:
- parent FORCED_ACTION;
- child ATTACK_RESPONSE;
- same Interaction;
- explicit parentFrameId;
- child response/damage remains child Frame;
- child completion resumes parent;
- root settlement eventually clears.

## Step 13 — exact evidence requirement

A scenario can be marked PROVEN only when an engine/API test observes the real persisted/public envelope through the relevant transition.

Helper tests prove helper semantics only.

For every PROVEN row, the C2 document must name the test file + test name.

Any still-PARTIAL row must explain exactly what is missing.

## Step 14 — validation

Run and report:
- causal primitive tests;
- causal-context tests;
- causal persistence tests;
- all new C2 engine-backed tests;
- `tests/presentation-v2.test.mjs`;
- `tests/api/presentation-v2-engine.test.mjs`;
- full fast suite;
- full API suite;
- build;
- lint;
- `git diff --check`.

Do not report a suite as passed unless it was actually run after the final code change.

## Scope exclusions

Do NOT:
- start C3;
- classify Group SEQUENTIAL/ORDERED/GROUP;
- add Group ordering metadata;
- implement Dying presentation barrier;
- migrate PresentationV2 to causal envelope;
- modify React/CSS;
- change gameplay rules merely to make tests pass;
- repurpose `resolutionId`, event IDs, or `actionRevision`.

## Agent execution-result format

Append only:

```
---

## C2-FIX2 execution result — <date>

Branch:
Implementation commit:
Files changed:

### Evidence matrix
<all rows and statuses>

### Atomic persistence completed
...

### Attack/Damage/Dying proof
...

### Child Frame proofs
...

### Judgement/Duel/Negation proof
...

### Settlement/clear proof
...

### Reconnect/viewer/stale/corruption proof
...

### Validation
...

### Remaining PARTIAL / UNPROVEN
...
```

Do not clean or replace HANDOVER.
Push to `ux-v2` and STOP.

## Acceptance criteria

C2-FIX2 is accepted only if:
- supported semantic transitions keep gameplay state + causal envelope atomically consistent;
- real Attack→Damage→Dying identity is engine-backed;
- real Group/nested-effect child push/resume is engine-backed where applicable;
- independent nested damage semantics are proven rather than assumed;
- Judgement end-to-end lifetime is engine-backed;
- Duel/Negation identity invariants are engine-backed;
- Borrowed Sword child behavior remains proven;
- settlement/clear is explicit and engine-backed;
- reconnect/viewer/stale/corruption behavior is tested;
- no heuristic causal authority is invented;
- all remaining UNPROVEN items are explicit and justified;
- no C3/Dying-barrier/PresentationV2/React work begins.

## Execution result — C2-FIX slice — 2026-10-02

Implemented and validated the Borrowed Sword runtime child-frame slice:

- `docs/UX_V2_0C2_CAUSAL_PROPAGATION.md` now maps the authoritative route
  boundaries and records the supported/UNPROVEN flows.
- Root Negation and ordinary Attack response entry persist the causal envelope
  with the Pending/phase transition.
- Real Borrowed Sword target selection creates an `ATTACK_RESPONSE` child
  Frame under the `FORCED_ACTION` parent in the persisted envelope.
- Borrowed Sword refusal/invalidation resumes the parent Frame in the guarded
  room write; the Interaction remains stable.
- API evidence asserts the persisted child Frame, parent reference, and parent
  resume. No C3, Dying-barrier, PresentationV2, or React work was added.

Validation:

- C2 causal-context tests: 2/2
- focused causal tests: 8/8
- full fast suite: 107/107
- full API/D1 suite: 212/212
- `npm run build`: passed
- `npm run lint`: passed
- `git diff --check`: passed

C2-FIX remains partial. The remaining acceptance gates are centralized
envelope/CAS propagation for every supported automatic transition, Group and
nested-damage child-frame runtime proofs, engine-backed Damage→Dying identity,
Judgement/delayed activation lifetime, explicit settlement clearing, and full
legacy/reload/viewer/stale identity assertions. Do not start C3.

---
## C2-FIX execution result — 2026-10-02

Branch: `ux-v2`

Implementation commit: rebased implementation commit; final pushed hash is
recorded by the branch tip after this rebase.

Files changed:

- `app/api/rooms/route.ts`
- `tests/api/presentation-causality.test.mjs`
- `docs/UX_V2_0C2_CAUSAL_PROPAGATION.md`
- `README.md`
- `HANDOVER.md` (this append-only result)

Completed:

- Added one authoritative room-state write helper for audited root entries;
  it commits phase, Pending, log, causal envelope, and deck/discard fields
  together in one D1 statement and remains batchable with player writes.
- Wired ordinary Attack response, Attack-targeted entry, root Negation, and
  Judgement Negation entry through that boundary.
- Added a real API assertion that ordinary Attack Pending and the persisted
  public envelope share the same Interaction/Frame, including reload/viewer
  projection checks.
- Added the per-flow C2-FIX audit matrix to
  `docs/UX_V2_0C2_CAUSAL_PROPAGATION.md`.

Evidence matrix:

- Attack root/same-frame: PASS for the audited response entries.
- Negation root: PASS for root entry; automatic continuation coverage remains
  PARTIAL.
- Borrowed Sword child push/pop: PASS from the prior slice and retained.
- Duel, Group/AOE nested child, Damage→Dying, Judgement lifetime, delayed
  activation, and complete settlement clearing: PARTIAL or UNPROVEN as marked
  in the audit table; no unsupported completion claim is made.

Atomic persistence: PASS for the four audited root entry paths; the helper is
not yet applied to every legacy automatic transition, so overall C2 remains
PARTIAL.

Child Frame runtime proof: Borrowed Sword PASS; Group/nested damage remains
UNPROVEN.

Settlement/clear proof: Borrowed Sword refusal/invalidation PASS; global
automatic settlement clearing remains PARTIAL.

Tests:

- `npm run build`: passed
- `npm run test:fast`: 107/107 passed
- `node tests/run-api-suite.mjs`: 212/212 passed after the corrected
  single-file causal assertion; an earlier concurrent rerun was invalidated
  by a stale port-occupying test process and was rerun cleanly.
- `npm run lint`: passed
- `git diff --check`: passed

Remaining PARTIAL / UNPROVEN: see the audit matrix and the reviewer gates
above. Do not start C3.
