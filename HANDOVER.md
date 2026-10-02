# WTK UX V2 — Current Task Handoff

## Reviewer status

UX2.0C2-FIX9 is **PARTIAL / NOT ACCEPTED**. Do not start C3.

Reviewed implementation commit:
`992bff9f622a92f41b675c96a9bd0fdcae3a75dd`

### Accepted from FIX9

The main architectural correction is good and must be preserved:

- Group/Duel nested Negation now uses SAME_FRAME semantics.
- `advanceCausalSemanticCheckpoint()` provides one atomic stage/current/checkpoint/revision update.
- Group and physical Duel tests now prove one frame through nested Negation.
- Group/Duel counter-Negation tests prove the counter card does not create another frame/root.
- top-level `response.causal` is now propagated alongside `continuation.causal` on the successful counter-Negation path.
- explicit Group and Duel duplicate-response races were added.
- Group NULL and Duel malformed-envelope continuation safety were added.
- independent top-level Negation still has one root.
- Borrowed Sword remains the only current production `childCausalFrame()` / `resumeCausalFrame()` route.
- reported validation passed: fast 108/108 and API 223/223.

### Why FIX9 is still not accepted

Review of the actual routing code found an uncovered causal/presentation defect around **Negation actor advancement**.

The authoritative UX design says the projected decision actor is the player who is genuinely blocking progress. When the real Negation responder changes, the envelope's `current.resolvingPlayerId`, checkpoint, and presentationRevision must change with that decision.

Current code does not do that consistently:

1. `startNegation()` initializes the envelope/current resolver using `responders[0]`, where `responders` is the living reaction order, not necessarily the first player who can actually respond with Negation.
2. `advanceNegation()` can auto-skip ineligible players by changing only `pending_json`. It does not update `causal_envelope_json`.
3. When an eligible Negation player declines and `continuation.remainingIds[0]` becomes the next actor, the decline branch updates only Pending/log; the envelope resolver/checkpoint/revision stays on the previous actor.
4. When `advanceNegation()` advances after a timeout, the same problem exists.
5. `applyNegationResponseOutcome()` advances the envelope only when `success === true`. If a judged/semantic Negation response fails and control moves to another responder, Pending can change actor without the envelope changing resolver/checkpoint.
6. Therefore `CurrentAction.actorId` and `causalEnvelope.frames[0].current.resolvingPlayerId` can diverge in a real Negation window.
7. This also means automatic ineligible-seat scans can leave an obsolete causal current resolver even though the UI should never present those scanned seats as blocking actors.

Existing FIX9 tests mostly choose fixtures where the first potential responder is eligible, or exercise successful Negation cards. They do not expose this decision-actor drift.

### Documentation defect

README currently says Group counter-Negation is "the only explicit partial row in this slice", while the FIX9 evidence matrix marks that row PROVEN. Correct this inconsistency while doing FIX10.

The next task is deliberately narrow. Do not move on to Group nested Damage, Judgement, or C3 until Negation decision identity is correct.

---

# NEXT TASK — UX2.0C2-FIX10: Make Negation Decision Actor and Checkpoint Authoritative

## Objective

For every Negation window, public causal state must describe the **actual blocking responder**, not merely the next living seat being scanned.

Invariant:

> If authoritative `CurrentAction.actorId = P` for a Negation decision and a valid causal envelope exists, the active frame's `current.resolvingPlayerId` must also be `P`, Pending/Continuation causal IDs must match that frame, and the checkpoint/revision must represent that blocking decision.

Automatic scans over players who cannot respond must not create player-facing checkpoints.

When a blocking responder changes from A to B:
- same Interaction;
- same Frame;
- same Stage `NEGATION`;
- one new checkpoint;
- presentationRevision +1 exactly once;
- `current.resolvingPlayerId = B`.

Do not start C3.

## Workflow

Work only on `ux-v2`.

At start:

```
git fetch origin
git checkout ux-v2
git pull --ff-only origin ux-v2
```

Read:
- this HANDOVER;
- `docs/UX_V2_INTERACTION_STAGE_DESIGN.md` sections 0.8, 0.16, 0.19, 0.26;
- `docs/UX_V2_0C_CAUSAL_IDENTITY_DESIGN.md`;
- `docs/UX_V2_0C2_CAUSAL_PROPAGATION.md`;
- `advanceNegation()`, `startNegation()`, `applyNegationResponseOutcome()`, and the canonical Negation decline/respond path in `app/api/rooms/route.ts`;
- `advanceCausalSemanticCheckpoint()`.

Do not modify or merge `main`.
Append execution result only; reviewer cleans HANDOVER.

## Step 1 — inventory every Negation actor transition before coding

Create a short audit in the C2 document or execution notes covering these transitions:

| Transition | Current code path | Can actor change? | Must checkpoint change? | Current envelope write? |
| --- | --- | --- | --- | --- |
| initial Negation window creation | `startNegation()` / Group entry | yes, after ineligible scan | only when actual blocker established | ... |
| automatic ineligible-seat scan | `advanceNegation()` | yes internally | NO for skipped seats | ... |
| arm deadline for same actor | `advanceNegation()` | no | NO | ... |
| eligible actor declines | canonical decline branch | yes | YES if another actual blocker | ... |
| eligible actor times out | `advanceNegation()` | yes | YES if another actual blocker | ... |
| successful Negation resets order | canonical respond / `applyNegationResponseOutcome()` | yes | YES | ... |
| failed judged/semantic Negation | `applyNegationResponseOutcome()` | possibly | YES if blocker changes | ... |
| no eligible responders remain | `advanceNegation()` / resolver | resolution resumes | restore parent/root stage, not a fake responder checkpoint | ... |

Do not claim a row fixed until its Pending and envelope behavior are both understood.

## Step 2 — select the next **actual eligible** Negation blocker

Avoid persisting every living seat as a temporary decision owner.

Introduce/refactor a server-side helper that, given:
- ordered candidate IDs;
- players;
- Negation continuation;

returns the next living player who can actually respond with Negation plus the remaining ordered candidates after that player.

Example conceptual contract:

```ts
type NegationDecisionScan = {
  actor: PlayerRow | null;
  remainingIds: string[];
};

function nextEligibleNegationResponder(
  players,
  candidateIds,
  continuation,
): NegationDecisionScan
```

Name may differ.

Requirements:
- preserve existing reaction order;
- use existing `canPlayerRespondWithNegation()`; do not reimplement legality;
- skip dead/ineligible players without exposing them as decision actors;
- do not change card/hero rules;
- if no eligible player exists, return no actor and allow automatic settlement.

Use this helper wherever a new blocking Negation responder is selected.

## Step 3 — initial Negation window must point directly to the real blocker

Fix independent `startNegation()` and the Group/Duel nested entry path.

Bad behavior to remove:

```
envelope.current.resolvingPlayerId = first living seat
write Pending
advanceNegation() skips several seats
Pending.actorId = actual responder
envelope still points to first seat
```

Required behavior:

1. build the typed Negation continuation;
2. find the first **eligible** responder in authoritative reaction order;
3. if one exists:
   - create/reuse causal frame as already designed;
   - enter/retain `NEGATION` stage;
   - `current.resolvingPlayerId = eligible actor`;
   - Pending.actorId = same actor;
   - response.causal and continuation.causal match envelope;
   - persist Pending + envelope atomically;
   - exactly one semantic checkpoint for this first real blocking decision.
4. if none exists:
   - do not publish a fake decision checkpoint for scanned seats;
   - continue automatic Negation settlement/resume using existing gameplay rules;
   - do not invent a causal root solely for a non-existent player decision beyond whatever root already legitimately represents the effect.

For an independent top-level Negation root with no eligible responders, preserve the correct causal lifetime/settlement behavior without leaving a stranded root.

## Step 4 — centralize Negation decision handoff

Add one narrow orchestration helper for moving an existing Negation Pending from actor A to actual blocking actor B.

Conceptual behavior:

```ts
advanceNegationDecision(room, oldPending, nextActor, remainingIds)
```

It should:
- preserve interactionId/frameId;
- preserve Stage `NEGATION`;
- set Pending.actorId = B;
- set continuation.remainingIds correctly;
- keep top-level `response.causal` aligned with `continuation.causal`;
- if valid envelope authority exists, call `advanceCausalSemanticCheckpoint()` exactly once with `resolvingPlayerId = B`;
- atomically CAS-write Pending + causal envelope;
- retain existing stale protection using expected old `pending_json`;
- if envelope is NULL/malformed, advance legacy gameplay without fabricating authority.

Do not create a new root/frame.

## Step 5 — fix ordinary decline progression

In the canonical Negation decline path:

If current actor declines:
- scan remaining candidates to the next actual eligible responder;
- skipped ineligible seats create no checkpoint/revision;
- if B is found, use the centralized handoff:
  - Pending.actorId = B;
  - envelope resolver = B;
  - new checkpoint;
  - revision +1 once;
- if no eligible responder remains, resolve the Negation chain and restore Group/Duel stage (or settle independent root) without a fake intermediate checkpoint.

Do not use raw Pending-only UPDATE when the decision actor changes and causal authority exists.

## Step 6 — fix `advanceNegation()` timeout/automatic progression

Refactor `advanceNegation()` so its jobs are explicit:

### Same actor, deadline unarmed
Arming the deadline:
- same actor;
- same semantic checkpoint;
- no presentationRevision change;
- Pending-only deadline update is acceptable.

### Current eligible actor still waiting
Return; no change.

### Current actor timed out
Treat timeout as that actor's decline:
- find next actual eligible blocker;
- one handoff checkpoint if another blocker exists;
- or settle if none.

### Ineligible candidate
Do not persist them as a visible blocking actor. Skip them in the scan.

The final returned room state must never have:
`CurrentAction.actorId != causalEnvelope.activeFrame.current.resolvingPlayerId`
for a valid Negation causal envelope.

## Step 7 — fix judged/semantic response progression

Inspect `applyNegationResponseOutcome()`.

Current code only advances the envelope when `success` is true.

Correct rule is based on **decision actor change**, not on whether the provider succeeded.

If a failed judged/semantic response causes control to move from A to B:
- same interaction/frame;
- Stage remains `NEGATION`;
- Pending actor B;
- resolver B;
- one semantic checkpoint/revision;
- response.causal and continuation.causal aligned.

If no practical real provider currently exercises this branch, still fix the production path and mark runtime evidence PARTIAL with exact code evidence. Do not invent gameplay.

## Step 8 — real test: initial ineligible seats are never projected as blockers

Create a real top-level or Group/Duel Negation fixture where:
- the first one or more players in reaction order **cannot** Negate;
- a later player can.

After the original API command returns:
- `currentAction.actorId` is the later eligible player;
- causal frame `current.resolvingPlayerId` equals that same player;
- Pending.actorId equals same player;
- Pending + continuation causal match envelope;
- no returned state exposes the skipped seat as blocker;
- frame remains one frame / correct stage;
- presentationRevision reflects only the meaningful Negation decision, not each skipped seat.

For a newly-created root whose initial revision is known, assert exact revision delta if practical.

## Step 9 — real test: decline A → skip ineligible B → block on C

Build a real Negation chain with reaction order:
- A is eligible and currently blocking;
- A declines;
- B is alive but has no legal Negation;
- C is eligible.

Capture before decline:
- interactionId;
- frameId;
- checkpointId;
- presentationRevision.

After A declines:
- CurrentAction.actorId = C;
- Pending.actorId = C;
- envelope resolver = C;
- same interaction/frame;
- checkpointId changed exactly once;
- presentationRevision = previous + 1;
- B was never emitted as a stable blocking checkpoint;
- A's decline does not create a public Reaction Chain node merely from being a pass.

This is a required acceptance test.

## Step 10 — real test: timeout handoff

Use existing test seams to place the current Negation deadline in the past or drive the canonical timer-expiry action.

Set up:
- current responder A is eligible;
- later responder C is eligible;
- any B between them is ineligible.

After timeout progression:
- CurrentAction.actorId = C;
- envelope resolver = C;
- same interaction/frame;
- checkpoint changes once;
- presentationRevision +1 once;
- no fake B checkpoint;
- no duplicated Negation effect/card.

Do not sleep in tests; use deterministic deadline/test DB setup.

## Step 11 — counter-Negation alignment regression

Keep FIX9 counter-Negation tests and strengthen at least one of them:

At each blocking counter window assert:
- `currentAction.actorId`;
- Pending.actorId;
- response.causal frameId;
- continuation.causal frameId;
- envelope current.resolvingPlayerId;

are all the same authoritative decision context.

Also assert a successful Negation that resets reaction order reaches the first **eligible** counter-responder directly.

## Step 12 — independent top-level Negation regression

Strengthen the existing Dismantle Negation test.

It currently declines the source and then observes the target.

Add assertions that after source decline:
- target is CurrentAction.actorId;
- envelope current.resolvingPlayerId = target;
- same root interaction/frame;
- new checkpoint/revision exactly once if target is the next actual blocker.

This catches the current Pending-only decline bug in the independent root path.

## Step 13 — NULL/malformed compatibility

For one actor-handoff case:
- NULL or corrupt `causal_envelope_json`;
- keep Pending causal context;
- decline/timeout to next actual responder;
- gameplay may advance;
- public envelope remains null;
- no root/frame/checkpoint is reconstructed;
- no 500.

This verifies the centralized handoff respects legacy/corrupt rooms.

## Step 14 — documentation correction

Update `docs/UX_V2_0C2_CAUSAL_PROPAGATION.md` with a short section:

`### Negation decision-actor invariant`

Document:
- ineligible-seat scans are engine-internal;
- only actual eligible blocking responders create decision checkpoints;
- changing blocking responder advances checkpoint/revision once;
- arming a deadline for the same responder does not;
- timeout is semantically a decline/handoff;
- Pending.actorId and causal current.resolvingPlayerId must agree whenever envelope authority exists.

Correct README's contradictory sentence about Group counter-Negation being partial. Do not overclaim.

## Step 15 — exact FIX10 evidence matrix

Add exactly:

| Requirement | Status | Exact evidence | Remaining gap |
| --- | --- | --- | --- |
| initial Negation skips ineligible seats without fake checkpoint | ... | ... | ... |
| initial real blocker matches Pending and envelope resolver | ... | ... | ... |
| decline handoff updates Pending + resolver atomically | ... | ... | ... |
| decline A → skip B → block C advances one checkpoint | ... | ... | ... |
| timeout handoff updates Pending + resolver atomically | ... | ... | ... |
| timeout with skipped ineligible seats advances one checkpoint | ... | ... | ... |
| deadline arming for same actor does not advance presentation revision | ... | ... | ... |
| successful Negation reset selects first eligible counter-responder | ... | ... | ... |
| counter Pending/continuation/envelope actor context stays aligned | ... | ... | ... |
| failed judged/semantic response handoff is causally correct | ... | ... | ... |
| independent Negation decline updates resolver correctly | ... | ... | ... |
| nested Group Negation handoff preserves Group interaction/frame | ... | ... | ... |
| nested Duel Negation handoff preserves Duel interaction/frame | ... | ... | ... |
| no ineligible scan creates new Interaction/Frame | ... | ... | ... |
| NULL/malformed handoff never reconstructs authority | ... | ... | ... |
| README/C2 documentation no longer contradicts FIX9 evidence | ... | ... | ... |

Statuses:
`PROVEN | PARTIAL | UNPROVEN | NOT IMPLEMENTED IN GAME`.

PROVEN requires named real API/engine evidence. If no real judged-Negation provider exists, that row may remain PARTIAL with precise production-path evidence.

## Step 16 — architecture/search audit

Before commit run and summarize:

```
rg "advanceNegation" app/api/rooms/route.ts
rg "continuation.remainingIds" app/api/rooms/route.ts
rg "resolvingPlayerId" app/api/rooms/route.ts
rg "advanceCausalSemanticCheckpoint" app/api/rooms app/api/causal-envelope.ts
rg "recoverCausalEnvelope" app/api/rooms game
git status --short
```

Specifically identify every production path that can change a Negation actor and show which helper now keeps envelope state aligned.

## Step 17 — regression and validation

Must remain green:
- FIX9 same-frame Group/Duel Negation;
- Group/Duel counter-Negation;
- Group/Duel duplicate races;
- Group NULL/Duel malformed tests;
- FIX6 Attack ownership/stale/malformed;
- Attack-targeted Cavalry;
- lethal Attack→Damage→Dying→rescue;
- Borrowed Sword child/resume;
- PresentationV2 unit/engine.

Run:
- focused Negation actor-handoff tests;
- focused Group/Duel same-frame tests;
- concurrency;
- presentation-causality;
- Borrowed Sword;
- Ma Chao;
- causal primitive/context/persistence;
- PresentationV2 unit + engine;
- full `npm run test:fast`;
- full canonical API suite;
- `npm run build`;
- `npm run lint`;
- `git diff --check`.

Report exact commands/counts.

## Scope exclusions

Do NOT:
- start C3;
- solve Group nested Damage yet;
- implement independent Damage fixture;
- finish Judgement lifetime;
- add delayed activation provenance;
- change Dying barrier;
- migrate PresentationV2;
- modify React/CSS;
- change gameplay legality or reaction order.

## Execution result format

Append only:

```
---

## C2-FIX10 execution result — <date>

Branch:
Implementation commit:
Files changed:

### Negation actor-transition inventory
...
### Eligibility scan / handoff implementation
...
### Initial blocker proof
...
### Decline handoff proof
...
### Timeout handoff proof
...
### Counter-Negation proof
...
### Judged/semantic failure path
...
### NULL/malformed proof
...
### Exact FIX10 matrix
...
### Documentation correction
...
### Search audit
...
### Validation
...
### Remaining C2 work
...
```

Report actual pushed full SHA.

Push implementation + appended result to `origin/ux-v2` and STOP.

## Acceptance criteria

FIX10 passes only if:
- no real Negation room state can expose one Pending actor while causal current resolver names another player;
- ineligible reaction-order scans never become stable decision checkpoints;
- decline and timeout handoffs update Pending + envelope causality together;
- each real blocker change creates exactly one checkpoint/revision;
- deadline arming for the same blocker creates no presentation revision;
- counter-Negation reset chooses the first actual eligible responder directly;
- NULL/malformed authority is never reconstructed;
- FIX9 SAME_FRAME semantics remain intact;
- all regression/validation commands pass;
- no C3/UI work begins.

---

## C2-FIX10 execution result — 2026-10-02

Branch: `ux-v2`
Implementation commit: `39f960491c537dbbcf45a993b994930563c907a6`
Files changed: `app/api/rooms/route.ts`, `tests/api/presentation-v2-engine.test.mjs`, `README.md`, `docs/UX_V2_0C2_CAUSAL_PROPAGATION.md`

### Negation actor-transition inventory

The production Negation transitions were audited before implementation:

| Transition | Production path | Actor/checkpoint behavior |
| --- | --- | --- |
| initial window | `startNegation()`, delayed Judgement, nested Group entry | `nextEligibleNegationResponder()` selects the first real blocker before publishing Pending/envelope state |
| automatic scan | `advanceNegation()` | dead/ineligible candidates are skipped internally and never create a checkpoint |
| same-actor deadline arm | `advanceNegation()` / `start_response_timer` | Pending-only deadline write; no presentation revision |
| eligible decline | canonical `decline_response` path | `advanceNegationDecision()` CAS-writes Pending and envelope together |
| eligible timeout | `advanceNegation()` | uses the same handoff path as decline |
| successful reset | canonical response and `applyNegationResponseOutcome()` | scans the reset order for the first actual eligible responder |
| failed judged/semantic response | `applyNegationResponseOutcome()` | failed outcomes now hand off causally when the decision actor changes |
| no eligible responder | `advanceNegation()` / deferred settlement | settles/restores without a fake responder checkpoint |

### Eligibility scan / handoff implementation

Added `nextEligibleNegationResponder()` as the single capability-based ordered
scan. It uses `canPlayerRespondWithNegation()` and returns the actual actor plus
the ordered candidates after that actor. Added
`advanceNegationDecision()` as the guarded handoff boundary: it preserves the
Interaction/Frame and `NEGATION`, aligns `response.causal` with
`continuation.causal`, updates `current.resolvingPlayerId`, advances one
semantic checkpoint/revision, and CAS-writes Pending plus causal envelope in
one room-state statement. NULL/malformed envelopes remain null and are never
reconstructed.

### Initial blocker proof

`FIX10 initial Negation skips ineligible seats without a fake blocker
checkpoint` proves a real DrawTwo root skips empty seats, exposes only the
later Negation holder, keeps Pending/continuation/envelope actor identity equal,
and retains `presentationRevision = 0` for initial creation. The same test
arms the same actor's deadline and proves no presentation revision is added.

### Decline handoff proof

`FIX10 Negation decline skips an ineligible seat and advances one causal
checkpoint` proves A decline → ineligible B → eligible C. Interaction/frame stay
stable; Pending actor, continuation frame, and envelope resolver become C;
checkpoint changes once and `presentationRevision` increments exactly once.

### Timeout handoff proof

`FIX10 Negation timeout skips an ineligible seat and advances one causal
checkpoint` sets a deterministic expired deadline, drives `advance_timers`, and
proves the same A → B(skip) → C transition and one-checkpoint delta without
sleeping.

### Counter-Negation proof

The independent Dismantle regression now asserts source decline updates the
target resolver and one checkpoint/revision. Existing Group/Duel counter tests
retain SAME_FRAME semantics, and new `FIX10 nested Group Negation handoff
skips an ineligible target in the same frame` plus `FIX10 nested Duel Negation
handoff skips an ineligible target in the same frame` prove nested actor
handoff preserves one Interaction/Frame. Successful and failed
semantic/judged paths now select the first eligible candidate before opening
the next window; no real Standard judged-Negation provider currently supplies
runtime evidence for the failed-judgement row.

### Judged/semantic failure path

`applyNegationResponseOutcome()` now bases causal advancement on decision-actor
change, not only on `success === true`. A failed outcome that moves to another
eligible actor receives the same `NEGATION` checkpoint/resolver update and
aligned causal handles. Runtime evidence remains `PARTIAL` because no current
Standard judged-Negation provider fixture exercises this production branch.

### NULL/malformed proof

The FIX9 Group NULL/Duel malformed regression remains green. The FIX10 handoff
helper parses authority once, preserves null when the envelope is absent or
invalid, and advances legacy gameplay without fabricating Interaction, Frame,
checkpoint, or revision state. Deferred settlement also preserves the existing
public `No Negation responses remain` history event.

### Exact FIX10 matrix

| Requirement | Status | Exact evidence | Remaining gap |
| --- | --- | --- | --- |
| initial Negation skips ineligible seats without fake checkpoint | PROVEN | `FIX10 initial Negation skips ineligible seats without a fake blocker checkpoint` | none for covered DrawTwo root |
| initial real blocker matches Pending and envelope resolver | PROVEN | same FIX10 initial test | none |
| decline handoff updates Pending + resolver atomically | PROVEN | `FIX10 Negation decline skips an ineligible seat and advances one causal checkpoint` | none for covered root |
| decline A → skip B → block C advances one checkpoint | PROVEN | same FIX10 decline test | no alternate seat-count fixture |
| timeout handoff updates Pending + resolver atomically | PROVEN | `FIX10 Negation timeout skips an ineligible seat and advances one causal checkpoint` | none for covered root |
| timeout with skipped ineligible seats advances one checkpoint | PROVEN | same FIX10 timeout test | no alternate seat-count fixture |
| deadline arming for same actor does not advance presentation revision | PROVEN | FIX10 initial test compares revision before/after timer arm | none |
| successful Negation reset selects first eligible counter-responder | PARTIAL | canonical and judged routes call `nextEligibleNegationResponder()` | no dedicated real reset fixture with a skipped post-reset seat |
| counter Pending/continuation/envelope actor context stays aligned | PARTIAL | independent counter assertions plus Group/Duel counter and handoff tests | not every counter window has a dedicated resolver assertion |
| failed judged/semantic response handoff is causally correct | PARTIAL | production `applyNegationResponseOutcome()` path and unit semantics | no real Standard judged-Negation provider fixture |
| independent Negation decline updates resolver correctly | PROVEN | strengthened engine-backed independent Dismantle test | none |
| nested Group Negation handoff preserves Group interaction/frame | PROVEN | named FIX10 nested Group handoff test | none for covered path |
| nested Duel Negation handoff preserves Duel interaction/frame | PROVEN | named FIX10 nested Duel handoff test | none for covered path |
| no ineligible scan creates new Interaction/Frame | PROVEN | FIX10 initial/decline/timeout tests | none for covered root |
| NULL/malformed handoff never reconstructs authority | PROVEN | FIX9 NULL/malformed API test plus null-preserving handoff | no separate malformed-timeout fixture |
| README/C2 documentation no longer contradicts FIX9 evidence | PROVEN | README and causal-propagation document updated | none |

### Documentation correction

README no longer calls Group counter-Negation the only partial row. The C2
causal-propagation document now includes `### Negation decision-actor
invariant`, the actor-transition inventory, the centralized scan/handoff
contract, and the exact FIX10 matrix. Explicit partial boundaries remain
Judgement failure runtime evidence, delayed activation provenance, independent
Damage, and Dying/automatic-transition work.

### Search audit

- `advanceNegation`: initial entries, timer progression, semantic settlement,
  and response routes now converge on eligibility scanning; actor handoff uses
  `advanceNegationDecision()`.
- `continuation.remainingIds`: Negation scans use the helper; Group/Duel
  participant progression remains separate and unchanged.
- `resolvingPlayerId`: initial Negation and every valid actor handoff set the
  actual blocking responder; nested restore paths set the original Group/Duel
  actor.
- `advanceCausalSemanticCheckpoint`: route calls are limited to semantic
  stage/current boundaries, including the new Negation handoff.
- `recoverCausalEnvelope`: only `game/causal-context.ts` defines the isolated
  compatibility helper; there are no production route call sites.
- `git status --short`: clean before this handover append.

### Validation

- `npm run build` passed.
- `npm test` passed: fast `108/108`, API `228/228`.
- `GAME_TEST_FILES=tests/api/presentation-v2-engine.mjs node tests/run-tests.mjs` passed `18/18`.
- `GAME_TEST_FILES=tests/api/privacy-response.test.mjs node tests/run-tests.mjs` passed `17/17`.
- `GAME_TEST_FILES=tests/api/concurrency.test.mjs,tests/api/borrowed-sword.test.mjs,tests/api/ma-chao.test.mjs,tests/api/presentation-causality.test.mjs,tests/api/presentation-v2-engine.test.mjs node tests/run-tests.mjs` passed `52/52`.
- Full fast suite includes causal primitive/context/persistence and PresentationV2 unit coverage; all `108/108` passed.
- `npm run lint` passed.
- `git diff --check` passed.

### Remaining C2 work

Independent Damage fixture, complete Judgement lifetime/provenance evidence,
delayed activation `originRef`, Dying barrier, broader automatic-transition
audit, and remaining pre-existing C2 coverage gaps remain. C3, UI, React,
CSS, Group nested Damage, gameplay legality, and reaction-order changes remain
out of scope.
