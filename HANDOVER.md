# WTK UX V2 — Current Task Handoff

## Reviewer status

UX2.0C2-FIX10 is **ACCEPTED for the scoped Negation decision-actor gate**.

Reviewed implementation: `39f960491c537dbbcf45a993b994930563c907a6`.

Do not start C3. C2 remains open.

Accepted from FIX10:
- eligibility scanning now selects the real Negation blocker before publishing state;
- Pending and causal resolver are updated together on decline/timeout handoff;
- real actor changes preserve Interaction/Frame and advance one checkpoint/revision;
- Group/Duel nested Negation remains SAME_FRAME;
- independent Negation, NULL/malformed compatibility and documentation corrections are covered;
- reported validation passed: fast 108/108, API 228/228 and focused suites green.

The remaining PARTIAL FIX10 rows are honest evidence gaps, not blockers to this scoped acceptance.

## Why the next task is Judgement

Actual code review shows Judgement is still largely legacy continuation state. `beginJudgementResolution()` can write trigger Pending/phase/deck/discard/log without a complete causal transition. Delayed activation may create a Negation root only when a responder exists, while the delayed activation itself is not consistently an authoritative Interaction. Cavalry and other synchronous Judgements do not yet prove one causal lifetime through reveal, replacement, result and resume.

The UX design requires Judgement reveal -> modifier -> result continuity, SAME_FRAME Judgement-card modification, synchronous continuation in the same Interaction, and a NEW Interaction for a future delayed activation after the placement Interaction has settled.

---

# NEXT TASK — UX2.0C2-FIX11: Make Judgement Causal Lifetime Authoritative

## Objective

Make real Judgement flows carry server-owned causal identity through reveal, optional replacement, effective result, resume and settlement.

Mandatory rules:

1. Judgement inside an unresolved parent Interaction stays in that Interaction.
2. Judgement-card modification is SAME_FRAME unless the engine genuinely launches an independent effect.
3. A delayed effect activating in a later turn starts a NEW Interaction. It must never reopen its old placement interactionId.
4. Historical delayed provenance may use `originRef`, but provenance is not parenthood.
5. Automatic reveal/evaluation/eligibility scans do not create fake blocking checkpoints.

Do not start C3.

## Workflow

Work only on `ux-v2`. Fetch/pull it first. Read this HANDOVER, the Judgement and deferred-activation sections of `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`, the C0 causal design, C2 propagation document, all Judgement continuation types, and all production Judgement entry/resume functions.

Do not modify/merge `main`. Append execution result only.

## Step 1 — complete Judgement path inventory

Audit every production Judgement entry/resume, including:
- Overindulgence;
- Rations Depleted;
- Lightning;
- Cavalry;
- Stauchness/Ganglie;
- Luo River;
- response/provider Judgement;
- every other `JudgementContinuation.resume.kind`.

For each record entry function, source/target, whether a parent Interaction is unresolved, NEW vs INHERIT Interaction rule, blocking decisions, resume destination, current causal handle, and envelope write/clear site.

Do not omit untested paths.

## Step 2 — typed causal transport

Extend Judgement continuation/resume types minimally so they carry `CausalContext` when authority exists.

Constraints:
- no full envelope in Pending;
- server owns IDs;
- no identity inferred from resolutionId, event ID, card ID/name or logs;
- no normal-path `recoverCausalEnvelope()`;
- NULL/malformed envelope is never reconstructed from a Judgement handle;
- legacy records remain readable;
- a new Judgement root returns/persists its exact envelope explicitly.

## Step 3 — meaningful Judgement checkpoints

Use the minimum existing/required Judgement causal stage. Do not model engine microsteps as presentation states.

No checkpoint for top-card draw, suit/rank calculation, eligibility scan or deck/discard movement.

A real replacement decision must satisfy:
- Pending.actorId = actual replacement actor;
- envelope resolver = same actor;
- correct Interaction/Frame;
- one semantic checkpoint for that blocking decision.

No legal replacement actor means no fake decision checkpoint.

## Step 4 — delayed activation starts a fresh Interaction

For each delayed card activation:
- prove the old placement Interaction is settled;
- create a fresh root for later activation;
- root origin describes the activation and target;
- interactionId/frameId differ from placement IDs;
- persist root with first authoritative activation state;
- root creation must not depend on whether a Negation responder exists;
- automatic resolution may settle without a fake response Pending.

If authoritative placement provenance exists, preserve it only as historical `originRef`. If current persistence cannot represent it safely, document the schema gap before adding the smallest typed server-owned field. Never encode provenance in logs.

A transferred delayed card must not keep an old envelope alive. Its later activation is another fresh Interaction.

## Step 5 — Cavalry Judgement inherits Attack

Cavalry Judgement occurs while Attack-targeted work is unresolved.

Required real API evidence:
- Attack root exists first;
- Judgement keeps the same interactionId;
- no fresh root and no resolutionId reconstruction;
- replacement decision is causally attached;
- use SAME_FRAME unless actual engine semantics prove an independent child effect;
- after result, Attack-targeted flow resumes with the correct causal identity;
- Attack authority is not cleared/recreated by Judgement.

## Step 6 — Necromancy replacement is SAME_FRAME

Drive a real replacement flow from reveal through effective result and resume.

Assert:
- same Interaction/Frame;
- immutable origin;
- current result/context may change;
- replacement Pending causal IDs match envelope;
- Pending actor equals envelope resolver;
- replacement card creates no new root/child;
- checkpoint changes only at meaningful decision/result boundaries;
- final resume restores parent stage or settles the root exactly once.

## Step 7 — Judgement Negation must reuse Judgement authority

Integrate FIX10 Negation with Judgement.

- delayed activation root must exist before optional Negation;
- `startJudgementNegation()` must not create a second root inside that Judgement;
- synchronous parent Judgement reuses its context;
- Negation/counter-Negation remains SAME_FRAME;
- after Negation, restore the Judgement semantic context through explicit checkpoint transition.

Preserve the real WTK rule ordering. Do not alter gameplay to fit presentation.

## Step 8 — Damage-related Judgement and response resume

For Stauchness/Ganglie and response-Judgement paths:
- inherit unresolved parent context;
- replacement stays in same Interaction;
- effective result resumes exact parent continuation;
- do not clear authority while parent work remains;
- do not create a new root on resume;
- any next blocking choice must update resolver/checkpoint.

Add real evidence for at least one Damage-related Judgement if a stable fixture exists; otherwise mark PARTIAL with exact code evidence.

## Step 9 — Luo River lifetime

Determine its lifetime from actual continuation semantics, not card name. Repeated Judgements must not accidentally recreate roots or strand an envelope. Replacement must remain attached and loop end must settle correctly.

If the current engine does not make the boundary authoritative enough to decide, mark PARTIAL instead of guessing.

## Step 10 — delayed Lightning lifecycle

Cover both resolution branches.

For a damaging result:
- delayed activation is a fresh Interaction;
- Judgement/result stays attached;
- resulting synchronous Damage stays causally attached according to the established Frame rule;
- do not clear before synchronous damage work finishes.

For a transfer result:
- activation Interaction settles;
- no envelope survives into a future turn;
- transferred card remains in Judgement Zone;
- later activation gets a fresh interactionId.

Do not solve the Dying presentation barrier in this task.

## Step 11 — settlement, reconnect and stale safety

Envelope clears only when the root and all synchronous work are settled.

Prove where practical:
- ordinary delayed Judgement clears at completion;
- Cavalry does not clear Attack on resume;
- Damage-related Judgement does not clear unresolved Damage parent;
- Luo River does not strand authority;
- delayed damaging resolution does not clear prematurely;
- future activation never revives a cleared Interaction.

For at least one delayed and one synchronous Judgement:
- repeated GET preserves interaction/frame/checkpoint/revision;
- second viewer sees the same public envelope;
- private choices stay private through CurrentAction;
- stale/duplicate replacement cannot duplicate causal transition or consume a replacement twice;
- reads do not advance presentationRevision.

## Step 12 — legacy/malformed safety

Reach a real Judgement continuation, then set only `causal_envelope_json` to NULL/malformed via test DB seam.

Continue and assert:
- no 500;
- public envelope remains null;
- no identity is reconstructed from continuation/resolution/event/card/log data;
- legacy gameplay resumes where supported;
- a later genuinely new delayed activation can create a fresh root.

SQL mutation is allowed only for corruption/legacy evidence, never normal root proof.

## Step 13 — exact FIX11 evidence matrix

Add exactly these rows:

| Requirement | Status | Exact evidence | Remaining gap |
| --- | --- | --- | --- |
| delayed activation starts fresh Interaction | ... | ... | ... |
| delayed activation never reuses placement Interaction | ... | ... | ... |
| delayed provenance/originRef is historical only | ... | ... | ... |
| delayed Judgement root exists before optional modifier | ... | ... | ... |
| no replacement actor creates no fake decision checkpoint | ... | ... | ... |
| replacement Pending actor matches envelope resolver | ... | ... | ... |
| Necromancy replacement stays same Judgement frame | ... | ... | ... |
| effective result preserves Judgement causal lifetime | ... | ... | ... |
| Judgement Negation does not create a second root | ... | ... | ... |
| counter-Negation remains same Judgement frame | ... | ... | ... |
| Cavalry Judgement preserves Attack interaction | ... | ... | ... |
| Cavalry resume returns to Attack causal context | ... | ... | ... |
| Damage-related Judgement preserves parent interaction | ... | ... | ... |
| Luo River repeated Judgement lifetime is authoritative | ... | ... | ... |
| delayed damaging result keeps synchronous damage attached | ... | ... | ... |
| delayed transfer settles activation Interaction | ... | ... | ... |
| transferred delayed card later activation gets fresh Interaction | ... | ... | ... |
| Judgement settlement clears only at true root settlement | ... | ... | ... |
| repeated read/reconnect preserves Judgement identity | ... | ... | ... |
| second viewer sees same public Judgement envelope | ... | ... | ... |
| stale/duplicate replacement cannot duplicate causal transition | ... | ... | ... |
| NULL/malformed Judgement does not reconstruct authority | ... | ... | ... |

Statuses: `PROVEN | PARTIAL | UNPROVEN | NOT IMPLEMENTED IN GAME`.

PROVEN requires named real API/engine evidence. Synthetic/manual envelope injection is not proof.

## Step 14 — documentation and audit

Add `### Judgement causal lifetime` to the C2 document. Document stable checkpoints, SAME_FRAME replacement, synchronous inheritance, delayed NEW Interaction, provenance-only originRef, settlement, and honest gaps.

Add one concise FIX11 README status paragraph.

Search every production occurrence of:
- Judgement continuation/entry/resume;
- causal root/child/resume/checkpoint helpers;
- resolutionId/revealedEventId around Judgement;
- `recoverCausalEnvelope`.

List every Judgement root creation, inherited entry, semantic transition, resume and clear site in the execution result.

## Step 15 — validation

Preserve FIX10 Negation, FIX9 Group/Duel, Attack ownership, Cavalry gameplay, Borrowed Sword, lethal Attack->Damage->Dying->rescue, existing Necromancy/Luo River/delayed-card behavior, and PresentationV2 tests.

Run focused Judgement, Ma Chao, Xiahou Dun/Sima Yi/Zhen Ji where available, Negation, causal, concurrency and PresentationV2 tests, then full:

```
npm run test:fast
npm run test:api
npm run build
npm run lint
git diff --check
```

Report exact commands/counts.

## Scope exclusions

Do NOT:
- start C3;
- redesign Judgement gameplay;
- solve Dying presentation barrier;
- solve unrelated Group nested Damage;
- migrate PresentationV2;
- modify React/CSS;
- create client causal IDs;
- infer causal identity from card names/logs/resolution/event IDs.

## Execution result format

Append only a `C2-FIX11 execution result` containing:
- branch and actual pushed full implementation SHA;
- files changed;
- Judgement path inventory;
- causal transport;
- delayed activation/provenance;
- Cavalry;
- Necromancy/replacement;
- Judgement Negation;
- Damage-related Judgement;
- Luo River;
- delayed-card lifecycle;
- settlement/reconnect/stale;
- legacy/malformed;
- exact FIX11 matrix;
- documentation/search audit;
- exact validation commands/counts;
- remaining C2 work.

Push implementation + appended result to `origin/ux-v2` and STOP.

## Acceptance criteria

FIX11 passes only if:
- delayed activation starts a fresh authoritative Interaction before optional responses;
- old placement Interaction is never reopened;
- provenance is not causal parenthood;
- synchronous Judgement preserves unresolved parent Interaction;
- replacement modifies the same Judgement Frame/context;
- Judgement Negation cannot create a second root;
- replacement/Negation actor aligns with envelope resolver;
- internal scans do not create fake checkpoints;
- Cavalry resumes Attack without losing/recreating identity;
- delayed damage/transfer cannot strand or incorrectly reuse an Interaction;
- settlement happens only at true root completion;
- reconnect/viewer/stale behavior is stable;
- legacy/malformed state never fabricates authority;
- evidence is honest and real-flow based;
- validation passes;
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

---

## C2 independent Damage root execution result — 2026-10-02

Branch: `ux-v2`
Implementation commit: `8c690095fcea31faa4103c0c922b22fe6ec6f7ef`
Files changed: `app/api/rooms/route.ts`, `tests/api/lobby-heroes-wei.test.mjs`, `README.md`, `docs/UX_V2_0C2_CAUSAL_PROPAGATION.md`

### Scope executed

The next unfinished C2 item was the independent Damage exact-root evidence.
The implementation is limited to source-less Lightning `damage_suffered`
continuations; no Judgement lifetime, delayed activation provenance, nested
Damage, Dying barrier, C3, React, or CSS work was started.

### Implementation

- `damageSufferedTriggerPending()` now creates a real `DAMAGE` root when no
  inherited causal context exists, including `originSourceId = null` for
  source-less damage.
- Reopened post-damage reaction Pending records carry the continuation causal
  handle and persist Pending, phase, deck/discard, log, and envelope through the
  shared causal room write.
- Private Legacy distribution preserves the same envelope while holding its
  private cards.
- Final post-damage settlement clears the Damage envelope atomically with the
  resumed Draw/Play transition.
- Missing/malformed legacy envelopes remain non-authoritative; this change does
  not reconstruct authority from a continuation handle.

### Real API proof

The existing `source-less Lightning damage can open three independent Legacy
opportunities` fixture now asserts:

- one independent `DAMAGE` Interaction/Frame with a null source and Guo Jia as
  the actual resolver;
- Pending actor, Pending causal handle, continuation causal handle, and the
  envelope all agree at the initial reaction boundary;
- another viewer observes the same interaction/checkpoint/revision;
- private Legacy distribution and the next two damage-point windows retain the
  same Interaction/Frame and revision;
- final settlement clears the causal envelope.

### Exact matrix

| Requirement | Status | Evidence | Remaining gap |
| --- | --- | --- | --- |
| source-less Damage creates an independent root | PROVEN | `source-less Lightning damage can open three independent Legacy opportunities` | covered by Lightning fixture only |
| root stage/current target/resolver are authoritative | PROVEN | same test asserts `DAMAGE`, Guo Jia target/resolver, and null source | none for covered fixture |
| Pending and continuation causal IDs match envelope | PROVEN | same test reads persisted Pending and both causal handles | none for covered fixture |
| repeated post-damage windows retain root identity | PROVEN | same test asserts interaction/frame/revision across Legacy re-entry | other automatic transitions remain outside this task |
| second viewer sees identical public root | PROVEN | same test compares viewer envelope IDs/checkpoint/revision | none for covered fixture |
| final settlement clears the independent root | PROVEN | same test asserts `causalEnvelope === null` after third damage point | none for covered fixture |
| no source-less damage rule changes | PROVEN | full API/fast regressions and existing Lightning/Legacy behavior | other source-less variants are not separately classified |

### Documentation and validation

README and `docs/UX_V2_0C2_CAUSAL_PROPAGATION.md` now mark the covered
independent Damage root as PROVEN while keeping the broader C2 gate partial.

Validation passed:

- `npm run build`
- `GAME_TEST_FILES=tests/api/lobby-heroes-wei.test.mjs node tests/run-tests.mjs`: `22/22`
- `npm test`: fast `108/108`, API `228/228`
- `npm run lint`
- `git diff --check`

### Remaining C2 work

Judgement lifetime/provenance, delayed activation `originRef`, Group-nested
Damage child semantics, broader automatic-transition coverage, and Dying
barrier work remain open or explicitly deferred. Stop here after pushing this
validated task; do not start C3/UI.

## C2-FIX11 execution result — 2026-10-02

Branch: `ux-v2`
Implementation commit: `PENDING — fill with the full source/docs/tests commit SHA before push`
Handover commit: appended after the implementation commit
Files changed in this round: `app/api/rooms/route.ts`, `game/pending.ts`, `tests/api/lobby-heroes-wei.test.mjs`, `tests/api/ma-chao.test.mjs`, `tests/api/presentation-v2-engine.test.mjs`, `tests/api/stratagems.test.mjs`, `README.md`, `docs/UX_V2_0C2_CAUSAL_PROPAGATION.md`

### Judgement path inventory

- Overindulgence, Rations Depleted, and Lightning now enter the shared delayed
  path from `startJudgementNegation()` to `beginDelayedJudgement()` and the
  typed delayed resume. The activation root is created before the optional
  Negation scan; no responder is required for root creation.
- Cavalry enters `beginCavalryJudgement()` while the Attack-targeted parent is
  unresolved and resumes through the original Attack declaration.
- Stauchness/Ganglie enters from `damage_suffered` and resumes the exact
  damage continuation; the Judgement handle is inherited rather than rebuilt.
- Luo River enters through `resolveTurnStartLuoshen()`. Repeated Judgements
  carry the same causal handle through the turn-start continuation until the
  loop settles.
- Response/provider Judgement enters through `applyResponseOutcome()` and
  resumes the typed Attack, Group, Duel, or Negation continuation. Every
  `JudgementContinuation.resume.kind` is covered: `delayed`, `attack_targeted`,
  `damage_suffered`, `luoshen`, and `response`.

### Causal transport and checkpoints

`JudgementContinuation` already had the minimal `CausalFields` shape; FIX11
now populates it consistently. `TurnStartTriggerContinuation` also carries
the optional `CausalContext` needed by repeated Luo River Judgements. Reveal,
deck movement, result calculation, and capability scans do not create fake
checkpoints. `beginJudgementResolution()` writes top-level Pending causal,
continuation causal, and the public envelope together. A real replacement
actor advances the `JUDGEMENT` resolver once; malformed or missing envelopes
remain non-authoritative and are never recovered from a handle.

### Delayed activation and provenance

`startJudgementNegation()` now creates a fresh `JUDGEMENT` root before looking
for a Negation actor. `beginDelayedJudgement()` receives that exact root, so a
later delayed activation cannot reopen its placement Interaction. The current
room schema has no typed historical `originRef`; this is documented as a
PARTIAL provenance boundary rather than encoded in logs or IDs. The earlier
independent-Damage wording is corrected here: the real source-less Lightning
fixture is delayed Judgement -> Damage inheritance, with null current Damage
source and the delayed activation owner retained in origin history.

### Cavalry and Necromancy

Cavalry copies the Attack declaration's causal context into its Judgement,
keeps one Interaction/Frame through reveal and replacement, and restores the
Attack stage before canonical continuation. Necromancy replacement/effective
result Pending records align actor, continuation handle, and envelope resolver;
the replacement card creates no root or child frame. The engine-backed
Judgement replacement and Ma Chao tests prove this real path.

### Judgement Negation and Damage-related resume

Judgement Negation uses the activation root created before the eligibility
scan; it no longer creates a `NEGATION` root that displaces Judgement. When a
real blocker exists, the frame advances to `NEGATION`; when none exists,
resolution continues without a fake decision. Stauchness/Ganglie effective
result Pending and continuation carry the inherited Damage handle, and resume
uses the `DAMAGE` stage. Delayed Lightning passes the Judgement handle into
synchronous source-less Damage and holds the envelope through Legacy windows.

### Luo River and settlement

Luo River repeated Judgements remain in one active Judgement Interaction and
Frame, and its turn-start continuation keeps the same resolver context. Loop
completion, decline, and no-card completion clear the envelope atomically.
Delayed Judgement settlement clears only after the delayed card's synchronous
work completes; Cavalry restores Attack authority; Damage-related paths return
to the parent damage event. Transfer gameplay remains covered but lacks a
dedicated causal ID assertion.

### Reconnect, stale, and malformed safety

The real Judgement replacement test reads reveal and effective states from
different viewers and asserts stable Interaction/Frame identity. Existing CAS
claims reject stale/replayed Pending submissions. The added malformed test
corrupts only `causal_envelope_json`, declines the real Judgement continuation,
and proves a 200 response, null public envelope, and no stranded response.
The Judgement-specific duplicate-race ID assertion remains PARTIAL.

### Exact FIX11 matrix

| Requirement | Status | Exact evidence | Remaining gap |
| --- | --- | --- | --- |
| delayed activation starts fresh Interaction | PARTIAL | shared draw path creates the root before optional response scan | no dedicated placement-to-activation ID comparison |
| delayed activation never reuses placement Interaction | PARTIAL | explicit fresh-root argument to `beginDelayedJudgement()` | no end-to-end two-ID fixture |
| delayed provenance/originRef is historical only | PARTIAL | activation origin is separate from placement state | no typed room `originRef` |
| delayed Judgement root exists before optional modifier | PROVEN | engine-backed delayed Judgement replacement test | no-responder revision assertion absent |
| no replacement actor creates no fake decision checkpoint | PARTIAL | immediate no-actor branch in `beginJudgementResolution()` | no dedicated unchanged-revision fixture |
| replacement Pending actor matches envelope resolver | PROVEN | engine-backed Judgement and Cavalry replacement tests | provider breadth |
| Necromancy replacement stays same Judgement frame | PROVEN | `engine-backed Judgement replacement exposes reveal and resume evidence` | none for covered path |
| effective result preserves Judgement causal lifetime | PROVEN | same test observes `judgement_effective_event` on same frame | no separate provider matrix |
| Judgement Negation does not create a second root | PARTIAL | shared activation root passed through `startJudgementNegation()` | no real Judgement-Negation fixture |
| counter-Negation remains same Judgement frame | PARTIAL | FIX10 handoff plus Judgement causal integration | no real Standard counter fixture |
| Cavalry Judgement preserves Attack interaction | PROVEN | `Cavalry uses the shared Judgement replacement continuation` | none for covered path |
| Cavalry resume returns to Attack causal context | PROVEN | same test verifies resumed red-result Attack behavior | no separate stale replacement row |
| Damage-related Judgement preserves parent interaction | PARTIAL | Stauchness/Ganglie typed continuation and resume code | no per-provider envelope assertion |
| Luo River repeated Judgement lifetime is authoritative | PROVEN | `Luoshen repeats real Judgements...` same Interaction/Frame and clear | no alternate seat-count fixture |
| delayed damaging result keeps synchronous damage attached | PROVEN | delayed Lightning + three Legacy windows test | no Group-nested Damage claim |
| delayed transfer settles activation Interaction | PARTIAL | existing Lightning transfer gameplay test | no causal settlement assertion |
| transferred delayed card later activation gets fresh Interaction | PARTIAL | shared delayed draw path | no cross-turn ID comparison |
| Judgement settlement clears only at true root settlement | PROVEN | delayed Lightning, Luo River, and replacement evidence | transfer branch assertion absent |
| repeated read/reconnect preserves Judgement identity | PROVEN | reveal/effective viewer reads in engine-backed test | no browser reconnect harness |
| second viewer sees same public Judgement envelope | PROVEN | Sima/Guo projected reads share the public envelope | broader private-choice matrix absent |
| stale/duplicate replacement cannot duplicate causal transition | PARTIAL | existing Pending CAS replay protection | no dedicated Judgement race assertion |
| NULL/malformed Judgement does not reconstruct authority | PROVEN | `malformed Judgement envelope stays non-authoritative through legacy resume` | none for transfer corruption |

### Documentation and search audit

Updated `README.md` and `docs/UX_V2_0C2_CAUSAL_PROPAGATION.md` with the FIX11
state, path inventory, delayed NEW Interaction rule, SAME_FRAME replacement,
Luo River lifetime, delayed Lightning inheritance, and explicit PARTIAL rows.
The production search covered every `JudgementContinuation` constructor,
`beginJudgementResolution()`, `beginDelayedJudgement()`,
`resolveJudgementContinuation()`, `resolveTurnStartLuoshen()`, causal root/
checkpoint helpers, `resolutionId`/`revealedEventId`, and
`recoverCausalEnvelope()`. No normal route calls `recoverCausalEnvelope()`.

### Validation

- `npm run test:fast` — `108/108` passed.
- `npm run test:api` — `229/229` passed across four shards (`55 + 29 + 52 + 93`).
- Focused FIX11 suite — `78/78` passed:
  `GAME_TEST_FILES=tests/api/stratagems.test.mjs,tests/api/presentation-v2-engine.test.mjs,tests/api/judgement.test.mjs,tests/api/ma-chao.test.mjs,tests/api/lobby-heroes-wei.test.mjs node tests/run-tests.mjs`.
- `npm run build` passed.
- `npm run lint` passed.
- `git diff --check` passed.

### Remaining C2 work

Delayed historical `originRef` storage and real placement-to-activation ID
proof, real Judgement-Negation/counter-Negation runtime fixtures, delayed
Lightning transfer causal proof, duplicate-replacement causal race evidence,
standalone source-less Damage classification, Group-nested Damage, broader
automatic-transition coverage, and the Dying presentation barrier remain
PARTIAL or open. C3, PresentationV2 migration, React, and CSS remain out of
scope. Push only this `ux-v2` implementation plus this handover result, then
stop.
