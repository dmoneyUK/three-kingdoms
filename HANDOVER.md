# WTK UX V2 — Current Task Handoff

## Reviewer status

UX2.0C2-FIX8 is **REJECTED AS AN ARCHITECTURAL DIRECTION / PARTIALLY USEFUL IMPLEMENTATION**. Do not start C3.

Reviewed implementation commit: `cfe36348e6f5bd47f7dcade4bb98276a9d704e75`.

The Agent followed FIX8, but review found that FIX8 itself conflicted with the established UX V2 design source of truth.

### Authoritative design conflict

`docs/UX_V2_INTERACTION_STAGE_DESIGN.md` section **0.26 Causal Frame boundary** explicitly says:
- responses that modify/satisfy/cancel/redirect the current effect normally stay in the SAME FRAME;
- Negation/counter-Negation modifying the current trick effect is a typical SAME-FRAME case;
- Child Frame is for a response/trigger that launches a genuinely independent resolving effect.

The C0 scenario matrix in `docs/UX_V2_0C_CAUSAL_IDENTITY_DESIGN.md` is consistent with this.

Therefore FIX8's new rule `Group/Duel nested Negation = CHILD_FRAME` is rejected. Group/Duel Negation modifies/cancels the already-active Group/Duel effect, so it must be represented as a **same-frame NEGATION stage/checkpoint**.

This is a reviewer/task-spec correction, not an Agent failure.

### Useful FIX8 work to preserve

Adapt rather than discard:
- real initial Group causal entry fixture;
- ordinary physical Duel fixture;
- Group stale identity test;
- Duel stale identity test;
- Group/Duel missing-envelope continuation fixture.

### Additional code-review defect

`applyNegationResponseOutcome()` creates the next counter-Negation `ResponsePending` without copying/setting top-level `causal`, while `continuation.causal` survives. This breaks the intended propagation invariant. FIX9 must correct this and prove it with a real counter-Negation flow.

### Remaining gaps

- Group duplicate/two-request race remained PARTIAL;
- Duel duplicate/two-request race remained PARTIAL;
- nested counter-Negation API proof remained PARTIAL;
- only NULL/missing envelope was proven; structural malformed continuation coverage is still needed.

---

# NEXT TASK — UX2.0C2-FIX9: Align Nested Negation with SAME_FRAME Semantics

## Objective

Correct Group/Duel nested Negation to match the authoritative design:

> Negation and counter-Negation that modify/cancel the current Group or Duel effect stay in the SAME causal Frame. They temporarily change the Frame Stage/checkpoint to NEGATION, then restore the same Frame to GROUP_RESOLUTION or DUEL_EXCHANGE.

Independent top-level Negation may still create its own root Interaction/Frame.

Do not start C3.

## Workflow

Work only on `ux-v2`.

Start:
```text
git fetch origin
git checkout ux-v2
git pull --ff-only origin ux-v2
```

Read before coding:
- this HANDOVER;
- `docs/UX_V2_INTERACTION_STAGE_DESIGN.md` section 0.26;
- `docs/UX_V2_0C_CAUSAL_IDENTITY_DESIGN.md` scenario matrix;
- `docs/UX_V2_0C2_CAUSAL_PROPAGATION.md`;
- `app/api/causal-envelope.ts`;
- Group/Duel/Negation orchestration in `app/api/rooms/route.ts`.

Do not modify/merge `main`. Do not self-merge. Append execution result only.

## Step 1 — correct the C2 design note before coding

Replace the incorrect active FIX8 CHILD_FRAME decision in `docs/UX_V2_0C2_CAUSAL_PROPAGATION.md`.

The corrected rule:
- independent top-level Negation => new root Interaction/Frame;
- nested Negation directly modifying Group/Duel => SAME FRAME;
- enter Stage `NEGATION` on existing Group/Duel frame;
- keep same `interactionId` and `frameId`;
- advance checkpoint/current resolver only at meaningful blocking decisions;
- restore same frame to `GROUP_RESOLUTION` or `DUEL_EXCHANGE`;
- counter-Negation remains same frame/stage;
- no Negation card creates a child frame by itself.

Do not edit the main UX design to justify the rejected FIX8 implementation.

## Step 2 — remove only incorrect Group/Duel Negation child creation

Rework FIX8 code that creates Negation child frames in:
- `startNegation(... inheritedCausal ...)`;
- `beginGroupTarget()`;
- `resolveDeferredStratagem()` parent-resume logic that exists only because of those child frames.

Do NOT disturb legitimate child behavior such as Borrowed Sword forced Attack.

For nested Group/Duel Negation:
- authoritative envelope already contains Group/Duel frame;
- Pending uses same `CausalContext`;
- no new frameId/parentFrameId/interactionId;
- missing/malformed envelope stays legacy/null and is never reconstructed.

## Step 3 — atomic semantic checkpoint update

Entering/exiting Negation changes stage/current/checkpoint/revision as one player-meaningful boundary.

If existing helpers would cause multiple artificial `presentationRevision` increments, add a narrow server helper in `app/api/causal-envelope.ts`, e.g. `advanceCausalSemanticCheckpoint(envelope, frameId, {stage,current})`.

Required behavior:
- same interactionId/frameId;
- origin unchanged;
- update stage/current atomically;
- exactly one new checkpointId;
- checkpoint.frameId = same frame;
- checkpoint.stage = new stage;
- presentationRevision += exactly 1;
- no new frame.

Add helper unit tests if introduced.

## Step 4 — Group nested Negation same-frame behavior

When a real Group target Negation window becomes blocking:
- same Group interactionId/frameId;
- Group origin remains original source/effect/targets;
- stage becomes `NEGATION`;
- current target is the affected participant;
- resolvingPlayerId is the real Negation responder;
- one semantic checkpoint/revision;
- `Pending.causal` and `Pending.continuation.causal` both equal the Group frame context.

Automatic ineligible-seat scans must not create visible checkpoints.

After Negation settles:
- same frame stage returns to `GROUP_RESOLUTION`;
- same interactionId/frameId;
- current resolver returns to the affected Group participant;
- one semantic checkpoint/revision;
- continue existing Group resolution.

## Step 5 — Duel nested Negation same-frame behavior

For ordinary physical Duel:
- Duel root frame starts as `DUEL_EXCHANGE`;
- while its Negation window blocks, same frame stage = `NEGATION`;
- origin stays Duel;
- resolvingPlayerId tracks actual Negation responder;
- Pending + continuation use same Duel context.

After Negation:
- same frame stage returns `DUEL_EXCHANGE`;
- same frameId;
- current Duel responder restored;
- Duel response Attack remains same Duel frame and never creates Attack child.

Diao Chan Lust remains correct; do not invent Negation where Lust does not open one.

## Step 6 — counter-Negation propagation bug

Fix `applyNegationResponseOutcome()`.

Every Negation/counter Pending with causal authority must have:
- `response.causal`;
- `response.continuation.causal`;
- both equal envelope interactionId/frameId.

When a successful Negation resets responder order:
- remain same interaction/frame;
- remain stage `NEGATION`;
- update resolvingPlayerId to next actual blocking responder;
- advance semantic checkpoint exactly once.

Do not create checkpoints for automatic ineligible scans.

## Step 7 — adapt Group initial-entry proof

Update the FIX8 Group test. Correct expected state:
- envelope exists;
- `frames.length === 1`;
- root/origin is Group;
- activeFrameId = Group frame;
- stage = `NEGATION` while the real Negation decision blocks;
- Pending causal IDs match Group frame;
- repeated read preserves interaction/frame/checkpoint/revision;
- second viewer sees same public envelope;
- after Negation settles, same frame returns to `GROUP_RESOLUTION`.

No parent/child assertions.

## Step 8 — adapt ordinary physical Duel proof

Required real API sequence:
1. play physical Duel;
2. envelope has exactly one Duel frame;
3. while Negation choice is open, same frame stage = `NEGATION`;
4. Pending + continuation causal IDs match Duel frame;
5. settle/pass Negation;
6. same frame stage returns `DUEL_EXCHANGE`;
7. responder plays Attack;
8. next responder changes but same Duel frame persists;
9. frames.length remains 1;
10. Duel settlement clears envelope.

## Step 9 — dedicated counter-Negation API proof

Create a reliable real Group or physical Duel fixture:
- effect opens Negation;
- responder A plays Negation;
- responder B plays counter-Negation.

Assert after each:
- same interactionId;
- same frameId;
- `frames.length === 1`;
- stage remains `NEGATION`;
- response.causal and continuation.causal match envelope;
- root origin remains immutable Group/Duel;
- resolvingPlayerId follows actual responder;
- no new Interaction/root/frame.

After chain settles, same frame returns to Group/Duel stage.

Use real cards/rules. Do not change gameplay legality merely to expose the fixture.

## Step 10 — explicit Group duplicate race

At a real Group participant response:
- capture valid actionRevision and root IDs;
- submit same valid response twice concurrently;
- exactly one success, one stale/conflict;
- card/effect/log occurs once;
- participant advances once;
- no second root/frame;
- if envelope remains, same interactionId/frameId.

Do not weaken CAS.

## Step 11 — explicit Duel duplicate race

At ordinary physical Duel response Attack:
- same valid request twice concurrently;
- one success, one stale loser;
- Attack consumed once;
- Duel advances once;
- same interactionId/frameId;
- `frames.length === 1`;
- no Attack child frame.

## Step 12 — NULL + malformed continuation safety

Preserve useful FIX8 missing-envelope tests and strengthen them.

Required named evidence:
- Group continuation with `causal_envelope_json = NULL`;
- physical Duel continuation with structurally malformed persisted envelope.

For each:
- Pending causal context untouched;
- public `causalEnvelope` = null;
- continuation does not 500;
- no envelope reconstructed from Pending;
- no new root mid-continuation;
- no guessed IDs/checkpoint;
- effect/card/log at most once.

DB mutation is allowed only for corruption setup.

## Step 13 — independent top-level Negation regression

Add/retain a focused test proving a genuinely independent top-level Negation flow still creates one root envelope with stage `NEGATION`.

This ensures the correction does not remove legitimate Negation roots.

## Step 14 — exact FIX9 evidence matrix

Replace the incorrect FIX8 child-frame matrix with exactly:

| Requirement | Status | Exact evidence | Remaining gap |
| --- | --- | --- | --- |
| Group root remains one frame during nested Negation | ... | ... | ... |
| Group Negation uses NEGATION stage on same frame | ... | ... | ... |
| Group Negation settlement restores GROUP_RESOLUTION on same frame | ... | ... | ... |
| Group counter-Negation stays same interaction/frame | ... | ... | ... |
| Group stale request preserves identity/checkpoint/revision | ... | ... | ... |
| Group duplicate response race cannot duplicate transition | ... | ... | ... |
| Group missing envelope does not fabricate authority | ... | ... | ... |
| physical Duel root remains one frame during nested Negation | ... | ... | ... |
| Duel Negation uses NEGATION stage on same frame | ... | ... | ... |
| Duel Negation settlement restores DUEL_EXCHANGE on same frame | ... | ... | ... |
| Duel response Attack remains same Duel frame | ... | ... | ... |
| Duel counter-Negation stays same interaction/frame | ... | ... | ... |
| Duel stale request preserves identity/checkpoint/revision | ... | ... | ... |
| Duel duplicate response race cannot duplicate transition | ... | ... | ... |
| Duel malformed envelope does not fabricate authority | ... | ... | ... |
| response.causal and continuation.causal align through counter-Negation | ... | ... | ... |
| independent top-level Negation still creates its own root | ... | ... | ... |
| no nested Group/Duel Negation creates child/root IDs | ... | ... | ... |

Statuses: `PROVEN | PARTIAL | UNPROVEN | NOT IMPLEMENTED IN GAME`.
PROVEN requires named real API/engine evidence.

## Step 15 — documentation cleanup

Update:
- `docs/UX_V2_0C2_CAUSAL_PROPAGATION.md`;
- README C2 status.

Remove/correct active statements saying Group/Duel nested Negation is CHILD_FRAME. Do not leave contradictory active documentation. Git history preserves the rejected experiment.

Keep Borrowed Sword child Attack as the canonical valid child-frame example.

## Step 16 — search/regression audit

Before commit:
```text
rg "childCausalFrame" app/api/rooms/route.ts
rg "resumeCausalFrame" app/api/rooms/route.ts
rg "startNegation\\(" app/api/rooms/route.ts
rg "recoverCausalEnvelope" app/api/rooms game
rg "Object\\.defineProperty.*causalEnvelope" app game
git status --short
```

Explain every remaining Group/Duel-related child/resume hit. Borrowed Sword or genuinely independent effects may remain.

Must keep green:
- FIX6 Attack ownership/stale/malformed;
- Attack-targeted Cavalry;
- lethal Attack→Damage→Dying→rescue;
- Borrowed Sword child/resume;
- Group gameplay;
- Duel/Lust gameplay;
- PresentationV2 unit/engine.

## Step 17 — validation

Run focused FIX9 Group same-frame tests, physical Duel tests, counter-Negation, Group/Duel races, corruption tests, presentation-causality, concurrency, Borrowed Sword, Ma Chao, causal primitive/context/persistence, PresentationV2 unit/engine, full `npm run test:fast`, full canonical API suite, build, lint, and `git diff --check`.

Report exact commands and counts.

## Scope exclusions

Do NOT:
- start C3;
- change the main UX design to match rejected FIX8;
- solve Group nested Damage in this slice;
- implement independent Damage fixture;
- finish Judgement;
- add delayed provenance;
- change Dying barrier;
- migrate PresentationV2;
- modify React/CSS;
- change gameplay rules.

## Execution result format

Append only:

```text
---

## C2-FIX9 execution result — <date>

Branch:
Implementation commit:
Files changed:

### Same-frame Negation correction
...
### Semantic checkpoint helper
...
### Group proof
...
### Physical Duel proof
...
### Counter-Negation proof
...
### Group race proof
...
### Duel race proof
...
### Missing/malformed proof
...
### Exact FIX9 matrix
...
### Documentation cleanup
...
### Search audit
...
### Validation
...
### Remaining C2 work
...
```

Report actual pushed full SHA. Push implementation + appended result to `origin/ux-v2` and STOP.

## Acceptance criteria

FIX9 passes only if:
- ordinary nested Group/Duel Negation creates no child Frame;
- same Group/Duel frame changes to NEGATION stage and restores original stage;
- interactionId/frameId stay stable through Negation and counter-Negation;
- top-level Pending causal stays aligned with continuation causal;
- no counter card creates a new Interaction/frame;
- dedicated Group and Duel duplicate races prove one causal transition;
- NULL/malformed continuation does not reconstruct authority;
- independent top-level Negation still creates a root;
- documentation matches the authoritative main UX design;
- Attack/Borrowed Sword regressions remain green;
- no C3/UI work begins.

---

## C2-FIX9 execution result — 2026-10-02

Branch: `ux-v2`
Implementation commit: `992bff9f622a92f41b675c96a9bd0fdcae3a75dd`
Files changed: `app/api/causal-envelope.ts`, `app/api/rooms/route.ts`, `tests/presentation-causality.test.mjs`, `tests/api/presentation-v2-engine.test.mjs`, `tests/api/concurrency.test.mjs`, `docs/UX_V2_0C2_CAUSAL_PROPAGATION.md`, `README.md`

### Same-frame Negation correction

Nested Group/Duel Negation now reuses the active Group/Duel `interactionId` and
`frameId`. Entry changes the existing frame to `NEGATION`; settlement restores
`GROUP_RESOLUTION` or `DUEL_EXCHANGE`. No Group/Duel Negation path calls the
child-frame helper. Independent top-level Negation still creates one root.

### Semantic checkpoint helper

Added `advanceCausalSemanticCheckpoint()` to atomically update one frame's
stage/current values, create exactly one checkpoint, and increment
`presentationRevision` exactly once while preserving origin, interaction, and
frame identity. The existing stage transition path now uses this helper rather
than two artificial revisions.

### Group proof

`FIX9 persists the Group root and keeps nested Negation in the same Frame`
proves one Group frame, `NEGATION` stage, immutable Group origin, matching
Pending/continuation causal IDs, stable repeated/second-viewer identity, and
same-frame restoration to `GROUP_RESOLUTION`.

### Physical Duel proof

`FIX9 ordinary Duel Negation stays in one Frame and restores the Duel stage`
proves one physical Duel frame, `NEGATION` stage while blocked,
`DUEL_EXCHANGE` after settlement, same-frame response Attack, and envelope
settlement without an Attack child frame.

### Counter-Negation proof

`FIX9 Group counter-Negation stays in one frame and restores Group resolution`
and `FIX9 physical Duel counter-Negation stays in one frame and restores the
Duel` prove real Negation/counter-Negation card flows keep one interaction and
frame, preserve the Group/Duel origin, align `response.causal` with
`continuation.causal`, and restore the original stage. The counter path now
copies top-level `response.causal` as well as continuation causal context.

### Group race proof

`FIX9 Group duplicate response race advances one participant once` proves two
concurrent valid Group responses produce exactly one success and one stale
loser, consume the physical card once, advance once, and retain one causal
frame/interaction.

### Duel race proof

`FIX9 ordinary Duel duplicate response race advances one exchange once` proves
two concurrent physical Duel Attack responses produce exactly one success and
one stale loser, consume the Attack once, advance one exchange, and retain one
Duel frame/interaction.

### Missing/malformed proof

`FIX9 Group NULL and ordinary Duel malformed envelopes stay non-authoritative`
proves Group `causal_envelope_json = NULL` and a structurally malformed Duel
envelope both project as `causalEnvelope: null`, do not reconstruct authority
from Pending, do not create guessed IDs/checkpoints, do not 500, and continue
the card flow safely.

### Exact FIX9 matrix

| Requirement | Status | Exact evidence | Remaining gap |
| --- | --- | --- | --- |
| Group root remains one frame during nested Negation | PROVEN | named FIX9 Group same-frame API/engine test | none for covered entry |
| Group Negation uses NEGATION stage on same frame | PROVEN | named FIX9 Group same-frame test | none |
| Group Negation settlement restores GROUP_RESOLUTION on same frame | PROVEN | named FIX9 Group same-frame test | none |
| Group counter-Negation stays same interaction/frame | PROVEN | named FIX9 Group counter-Negation test | none |
| Group stale request preserves identity/checkpoint/revision | PROVEN | named FIX9 Group stale API test | none for covered response |
| Group duplicate response race cannot duplicate transition | PROVEN | named FIX9 Group duplicate-race API test | none |
| Group missing envelope does not fabricate authority | PROVEN | named FIX9 Group NULL continuation test | malformed Group variant not added |
| physical Duel root remains one frame during nested Negation | PROVEN | named FIX9 physical Duel same-frame test | none |
| Duel Negation uses NEGATION stage on same frame | PROVEN | named FIX9 physical Duel same-frame test | none |
| Duel Negation settlement restores DUEL_EXCHANGE on same frame | PROVEN | named FIX9 physical Duel same-frame test | none |
| Duel response Attack remains same Duel frame | PROVEN | named FIX9 physical Duel same-frame test | none |
| Duel counter-Negation stays same interaction/frame | PROVEN | named FIX9 Duel counter-Negation test | none |
| Duel stale request preserves identity/checkpoint/revision | PROVEN | named FIX9 Duel stale API test | none for covered response |
| Duel duplicate response race cannot duplicate transition | PROVEN | named FIX9 Duel duplicate-race API test | none |
| Duel malformed envelope does not fabricate authority | PROVEN | named FIX9 malformed Duel API test | none |
| response.causal and continuation.causal align through counter-Negation | PROVEN | Group/Duel counter-Negation assertions | no Judgement nested proof; out of scope |
| independent top-level Negation still creates its own root | PROVEN | independent Dismantle Negation engine/API assertions | delayed Judgement remains out of scope |
| no nested Group/Duel Negation creates child/root IDs | PROVEN | Group/Duel tests assert one frame and stable activeFrameId | none for covered paths |

### Documentation cleanup

`docs/UX_V2_0C2_CAUSAL_PROPAGATION.md` and `README.md` now describe
same-frame Group/Duel Negation and retain Borrowed Sword as the legitimate
child-frame example. No main UX design, React, CSS, gameplay rule, or C3 work
was changed.

### Search audit

- `childCausalFrame` in `app/api/rooms/route.ts`: Borrowed Sword forced Attack only.
- `resumeCausalFrame` in `app/api/rooms/route.ts`: Borrowed Sword parent resume only.
- `startNegation(`: independent roots plus typed Duel continuation entry; nested Duel reuses the existing frame.
- `recoverCausalEnvelope`: no production route call site; helper remains isolated in `game/causal-context.ts`.
- `Object.defineProperty.*causalEnvelope`: no matches in `app` or `game`.

### Validation

- `npm run build` passed.
- `npm test` passed: fast `108/108`, API `223/223`.
- `GAME_TEST_FILES=tests/api/presentation-v2-engine.test.mjs node tests/run-tests.mjs` passed `13/13`.
- `GAME_TEST_FILES=tests/api/presentation-v2-engine.test.mjs,tests/api/concurrency.test.mjs node tests/run-tests.mjs` passed `29/29`.
- `npm run lint` passed.
- `git diff --check` passed.

### Remaining C2 work

Independent Damage fixture, Judgement completion, delayed activation provenance,
Dying barrier, broader automatic-transition audit, and any pre-existing C2
coverage gaps remain. C3, UI, React, CSS, and gameplay-rule changes remain out
of scope.
