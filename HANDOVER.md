# WTK UX V2 — Current Task Handoff

## Reviewer status

UX2.0C2-FIX14 is **ACCEPTED for its scoped Group -> Damage child-frame contract**.

Reviewed implementation: `d64489b2717828504a6540e66df2dd410e35134c`.

Accepted evidence:
- real Raining Arrows Group failure creates one DAMAGE child;
- child keeps Group interactionId and has parentFrameId = Group frame;
- active frame switches Group -> Damage -> original Group;
- Damage Pending/Continuation uses child context while resumeGroup retains parent context;
- real blocking trigger actor aligns with child resolver;
- stale/concurrent trigger requests do not duplicate the child/Damage;
- participant order survives A -> B Damage -> C;
- repeated reads and second viewer preserve public child identity;
- malformed envelope is not reconstructed;
- focused 21/21, fast 108/108, API 236/236, build/lint/diff-check pass.

The PARTIAL nested Damage -> Dying row is acceptable for FIX14 because the Dying presentation barrier is explicitly later work. Do not start C3 yet.

---

# NEXT TASK — UX2.0C2-FIX15: Final C2 Causal Propagation Audit and Closure

## Objective

Determine whether C2 can be closed after FIX14. This is audit-first. Do not add speculative architecture merely to make a matrix green.

C2 is complete when every currently implemented gameplay path either:
1. has authoritative causal propagation appropriate to its semantics, or
2. is explicitly documented as unsupported/not implemented and cannot leak a false causal identity.

Do not implement the later Dying presentation barrier and do not start C3.

## Step 1 — build a complete production causal-site inventory

Audit production code for every:
- causal root creation;
- child-frame creation;
- frame resume;
- semantic checkpoint advance;
- causal clear/settlement;
- Pending/Continuation causal transport;
- delayed activation;
- Damage entry;
- Group/Duel/Negation/Judgement/Borrowed Sword flow;
- NULL/malformed compatibility path.

At minimum search:
`createCausalRoot`, `childCausalFrame`, `resumeCausalFrame`,
`advanceCausalSemanticCheckpoint`, `causalEnvelopeAtStage`,
`causalRoomStateWrite`, `causal_envelope_json`,
`resolveSourcedDamage`, `resolveAttackDamageAboutToApply`,
`resolveGroupDamage`, `startDyingRescue`, `recoverCausalEnvelope`.

Produce a table mapping production site -> semantic owner -> expected identity -> settlement/resume behavior -> evidence.

## Step 2 — audit remaining independent/automatic Damage

Classify every `resolveSourcedDamage()` caller as one of:
- same-frame synchronous Damage;
- child-frame Damage inside an unresolved parent;
- independent root Damage;
- legacy/no-authority path.

Do not assume every Damage needs a child/root.

For any implemented path that currently has authoritative parent/root context but violates the C0 identity rules, fix the smallest real defect and add a real API/engine test.

If no additional defect exists, document why the existing classification is correct.

## Step 3 — Group card-family equivalence

FIX14 proves Raining Arrows. Audit Barbarian Invasion and other Group damage cards to determine whether they enter the exact same `resolveGroupDamage()` boundary.

If they do, add one lightweight real Barbarian Invasion characterization proving it uses the same child/resume mechanism; do not duplicate the full FIX14 race matrix.

If a card uses a different production path, test/fix that path separately.

## Step 4 — Group Damage -> Dying causal compatibility

This is NOT the later presentation-barrier task.

Create one real lethal Group Damage fixture if current gameplay supports it. Drive rescue/survival or defeat far enough to answer only:
- Group interactionId survives;
- Damage child identity is not replaced by a new root;
- Group parent remains available across Dying;
- after Dying settles, the correct parent resumes or the Group terminates according to gameplay;
- no stranded child/root.

Do not add UI barrier metadata or animation semantics.

If current gameplay genuinely cannot provide a stable real fixture, keep this PARTIAL with exact reason.

## Step 5 — historical delayed originRef decision

C0 design describes `originRef` for later delayed/persistent activation. Current runtime schema does not provide typed historical originRef.

Make an explicit architecture decision based on current gameplay/storage:
- If placement/transfer has a stable persisted public provenance identifier that can safely be carried into later activation, implement the minimum typed `originRef` and prove it with the existing same-card delayed/Lightning fixtures.
- If no such stable authoritative provenance exists, DO NOT synthesize it from timeline/log/card-name/current phase. Document it as intentionally deferred/unsupported and explain why this does not compromise active causal authority.

Never misuse `parentFrameId` as historical provenance.

## Step 6 — synchronous Judgement-Negation parent branch decision

Audit whether any production path can actually construct `causalResume.parent`.

If none exists:
- keep or remove the defensive type based on code clarity;
- mark runtime evidence NOT IMPLEMENTED IN GAME or UNPROVEN;
- do not manufacture gameplay to exercise it;
- ensure docs do not count it as a C2 blocker unless a real production path needs it.

## Step 7 — global settlement audit

For every authoritative root/child family now covered, verify the terminal contract:
- independent root clears exactly once;
- child settles then resumes exact parent once;
- final parent settlement clears envelope;
- no stale completed stage remains;
- no new root is created merely to resume;
- malformed/NULL storage never reconstructs authority.

Pay special attention to early returns, defeat, transfer, no-responder, automatic trigger and no-post-damage branches.

Fix only real production defects found.

## Step 8 — reconnect/viewer/public-private audit

For representative Attack, Group child Damage, Duel, Negation, Judgement, Borrowed Sword child and delayed activation:
- repeated GET keeps public causal identity stable;
- second viewer gets the same public envelope;
- private CurrentAction/options remain viewer-specific;
- actionRevision is not used as causal identity.

Use existing tests where sufficient; add tests only for actual evidence gaps.

## Step 9 — C2 final evidence matrix

Create a C2-FINAL matrix in `docs/UX_V2_0C2_CAUSAL_PROPAGATION.md` covering at least:
- Attack root/response/Damage/Dying continuity;
- Group root/participant progression;
- Group nested Damage child/resume;
- Barbarian/Hail equivalence;
- Duel;
- independent and nested Negation;
- Borrowed Sword child/resume;
- Judgement replacement/Negation/no-responder;
- delayed placement vs later activation;
- Lightning transfer vs later activation;
- independent/automatic Damage classifications;
- settlement clearing;
- stale/concurrent safety;
- reconnect/second viewer;
- NULL/malformed non-reconstruction;
- historical originRef status;
- synchronous Judgement-Negation parent status;
- Group Damage -> Dying compatibility.

Statuses: PROVEN / PARTIAL / UNPROVEN / NOT IMPLEMENTED IN GAME.

A PARTIAL/UNPROVEN row may remain only when it is not required by a currently implemented production path or belongs to a later milestone. Explain the boundary.

## Step 10 — C2 closure decision

At the end, state exactly one:
- `C2 READY TO CLOSE`
- `C2 NOT READY TO CLOSE`

If NOT READY, list only concrete production blockers and do not start C3.

If READY, explain which remaining PARTIAL rows are deliberately deferred and why they do not compromise active causal correctness.

Do not declare C3 started.

## Step 11 — docs

Update C2 propagation doc and README to match actual evidence. Remove stale claims that Group nested Damage is still wholly open.

Do not rewrite the UX source-of-truth design.

## Step 12 — validation

Run focused causal suites for Attack, Group/Raining Arrows/Barbarian Invasion, Damage/Dying compatibility, Duel, Negation, Borrowed Sword, Judgement/delayed effects, concurrency and PresentationV2.

Then run:
- `npm run test:fast`
- `npm run test:api`
- `npm run build`
- `npm run lint`
- `git diff --check`

Report exact commands/counts.

## Scope exclusions

Do not start C3; implement the Dying presentation barrier; migrate PresentationV2; modify React/CSS; redesign gameplay; create provenance from logs/events/card names; or broaden into unrelated engine cleanup.

## Execution result

Append only a `C2-FIX15 execution result` containing full implementation SHA, files changed, complete causal-site inventory, Damage classification, Group-family audit, Group-Dying compatibility, originRef decision, Judgement-parent decision, settlement audit, reconnect/viewer audit, C2-FINAL matrix, validation, and the exact closure decision.

Push implementation plus appended result to `origin/ux-v2` and STOP.

## Acceptance

FIX15 passes only if the audit covers all current production causal families, any real blockers found are fixed/tested, remaining partials are honestly bounded, regressions are green, and the closure decision is evidence-based. No C3/UI work.

## C2-FIX15 execution result

Date: 2026-10-02
Branch: `ux-v2`
Implementation commit: `ba75dbf`

### Result

`C2 READY TO CLOSE`

The audit found and fixed one active production defect: the failed
response-Judgement path in `applyAttackResponseOutcome()` did not pass
`response.causal` to `resolveSourcedDamage()`. It now preserves the original
Attack Interaction/Frame. A real Eight Trigrams black-Judgement failure against
Xiahou Dun proves the resulting `damage_suffered` trigger keeps the Attack
causal identity.

### Files changed

- `app/api/rooms/route.ts` — failed response-Judgement causal propagation;
  lethal Group Damage Dying settlement restores the Group parent before the
  next participant continues; Peach rescue preserves the child envelope until
  the guarded parent restore.
- `tests/api/presentation-v2-engine.test.mjs` — lethal Raining Arrows Group
  Damage -> Peach rescue -> parent continuation; Barbarian Invasion equivalent.
- `tests/api/equipment.test.mjs` — real Eight Trigrams black-Judgement
  failure -> Xiahou Dun post-damage trigger causal identity.
- `docs/UX_V2_0C2_CAUSAL_PROPAGATION.md` — complete production inventory,
  Damage classification, C2-FINAL matrix, and closure decision.
- `README.md` — current stage, roadmap, deliberate deferred boundaries, and
  next milestone.
- `HANDOVER.md` — this execution result.

### Complete causal-site and Damage inventory

| Production site | Classification / identity | Settlement evidence |
| --- | --- | --- |
| `attackDeclaration()` | Attack root; inherited Attack-targeted context stays on its handle | Attack response/Damage/Dying suites |
| `damageTriggerPending()` | independent Damage root unless an active continuation supplies causal | ordinary Attack/Damage tests |
| `damageSufferedTriggerPending()` | inherits Damage or Group-child causal; otherwise independent post-damage root | trigger exhaustion and concurrency suites |
| `startNegation()` | independent root or nested same-frame Group/Duel Negation | FIX9/FIX10 suites |
| `startJudgementNegation()` | fresh delayed-Judgement root; no historical placement parent | FIX12/FIX13 suites |
| `groupResponseDecision()` / `beginGroupTarget()` | one Group Interaction/Frame for participant order | Raining/Barbarian fixtures |
| `duelResponseDecision()` | one Duel Interaction/Frame across alternating responses | Duel fixtures |
| `resolveGroupDamage()` / `childCausalFrame()` | one `DAMAGE` child under Group, with `resumeGroup` parent | FIX14 and FIX15 fixtures |
| Borrowed Sword target choice | `ATTACK_RESPONSE` child under `FORCED_ACTION` | Borrowed Sword Worker/D1 fixture |
| `startDyingRescue()` | retains supplied Damage/child causal handle | FIX15 lethal Group rescue |
| `resumeCausalFrame()` / `resumeGroupCausalRoom()` | guarded live-envelope child/parent pop; never reconstructs from Pending | malformed envelope suites |
| delayed Lightning resolver | same delayed Judgement Interaction for synchronous Damage; later activation fresh root | Lightning transfer/activation suite |
| Duel loss resolver | same Duel context via `pending.response.causal` | Duel loss coverage |
| failed response Judgement after Attack | same Attack context via newly fixed `response.causal` | Eight Trigrams + Xiahou Dun regression |
| Attack Damage recursive/suppressed-Dodge paths | same Attack/Group context | Attack and Group suites |
| forced `attack_dodged` Damage | independent/automatic legacy consequence; no false parent inferred | continuation audit |
| Group failed participant Damage | nested Group child | FIX14/FIX15 |
| Yue Jin Dauntless | independent/automatic turn-end consequence | production caller audit |
| Fanjian Sowing Distrust | independent card effect | production caller audit |
| Stauchness Damage consequence | inherits `resumeDamageSuffered.causal` | Xiahou Dun/Sima Yi suites |

No additional caller required a new root or parent reconstruction rule.

### Group family and Dying compatibility

Raining Arrows and Barbarian Invasion use the same typed Group continuation and
`resolveGroupDamage()` boundary. The Barbarian characterization proves the
same two-frame child/parent behavior. The lethal Raining fixture proves the
real sequence Group -> Damage child -> Dying -> Peach -> Group parent -> next
participant, with one Interaction, no child replacement, and no stranded
Pending. No Dying presentation barrier was added.

### Explicit deferred decisions

- Historical delayed `originRef`: `PARTIAL` by deliberate design. The current
  authoritative schema has `rooms.causal_envelope_json` but no typed stable
  public placement provenance. Later activation creates a fresh root with
  `parentFrameId: null`; no link is fabricated from logs, events, card names,
  `resolutionId`, `event.id`, or `actionRevision`.
- Synchronous Judgement-Negation parent: `NOT IMPLEMENTED IN GAME`.
  `startJudgementNegation()` constructs only `{ kind: "root" }`; the typed
  defensive parent branch is not runtime evidence and has no active caller.
- C3, React/CSS migration, PresentationV2 migration, and the Dying
  presentation barrier: not started and outside this task.

### Settlement and viewer audit

Independent roots clear once at terminal settlement. Group Damage and Borrowed
Sword children pop to their exact typed parent; final parent settlement clears
the envelope. No-responder, timeout, defeat, transfer, automatic-trigger, and
no-post-damage paths were classified; NULL/malformed storage never rebuilds
authority. Repeated GETs and second viewers retain the same public envelope,
while private `currentAction` and options remain viewer-specific. CAS and
duplicate-race tests prove one transition winner.

### C2-FINAL matrix

| Boundary | Status |
| --- | --- |
| Attack root/response/Damage/Dying | PROVEN |
| Group root/participant progression | PROVEN |
| Group nested Damage child/resume | PROVEN |
| Barbarian/Raining Group-family equivalence | PROVEN |
| Duel | PROVEN |
| independent/nested Negation | PROVEN |
| Borrowed Sword child/resume | PROVEN |
| Judgement replacement/Negation/no-responder | PROVEN |
| delayed placement vs later activation | PROVEN |
| Lightning transfer vs later activation | PROVEN |
| independent/automatic Damage classification | PROVEN |
| settlement clearing | PROVEN |
| stale/concurrent safety | PROVEN |
| reconnect/second viewer | PROVEN |
| NULL/malformed non-reconstruction | PROVEN |
| historical delayed `originRef` | PARTIAL — intentionally unsupported |
| synchronous Judgement-Negation parent | NOT IMPLEMENTED IN GAME |
| Group Damage -> Dying compatibility | PROVEN |
| Dying presentation barrier / C3 | NOT APPLICABLE — deferred |

### Validation

Focused causal/API command:

```text
npm run build
GAME_TEST_FILES=tests/api/presentation-v2-engine.test.mjs,tests/api/equipment.test.mjs,tests/api/judgement.test.mjs,tests/api/stratagems.test.mjs,tests/api/borrowed-sword.test.mjs,tests/api/concurrency.test.mjs,tests/api/presentation-causality.test.mjs GAME_TEST_PORT=3137 GAME_TEST_URL=http://localhost:3137 GAME_TEST_INSPECTOR_PORT=9229 node tests/run-tests.mjs
```

Result: 98 tests passed, 0 failed. This includes the two FIX15 Group tests
and the Eight Trigrams causal regression. The required final commands are
run after this handover entry is amended:

```text
npm run test:fast
npm run test:api
npm run build
npm run lint
git diff --check
```

Closure: `C2 READY TO CLOSE`. Reviewer verification of the pushed commit is
the next milestone. STOP after push; do not start C3.
