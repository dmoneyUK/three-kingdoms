# UX2.0C2 — Authoritative causal propagation map

This document records the C2 orchestration boundaries currently implemented.
It intentionally does not classify Group resolution semantics, alter Dying
presentation barriers, or migrate the PresentationV2 projector.

## Authoritative transition map

| Flow | Root / entry | Same-Frame records | Child / resume boundary | Current evidence |
| --- | --- | --- | --- | --- |
| Attack | `attackDeclaration()` at authoritative card/provider acceptance | `attackResponseDecision()`, Dodge/decline response continuation | Damage and Dying remain on the attack reference; nested provider work is still being completed | causal handle and room envelope on ordinary response and Attack-targeted entry |
| Duel | `duelResponseDecision()` | alternating response continuation | response Attack satisfies Duel; it is not a child Frame | explicit root envelope persisted at first response; alternation reuses the Duel frame |
| Negation | `startNegation()` or typed Group/Judgement Negation creation | `advanceNegation()`, `applyNegationResponseOutcome()` | deferred effect resumes through its typed continuation | root Negation identity and counter-window handle |
| Group/AOE | `groupResponseDecision()` / typed Group continuation | `nextGroupResponse()` and `finishGroupStep()` | `beginGroupTarget()` may launch an independently resolving Attack/Damage path | explicit root envelope persisted at first response; participant progression reuses the Group frame |
| Borrowed Sword | `startNegation()` → `resolveDeferredStratagem()` | `BorrowedSwordPending` target choice | `choose_borrowed_sword_target` pushes an Attack child; forced Attack settlement resumes parent | real Worker/D1 child push/pop path |
| Judgement | `beginJudgementResolution()` | reveal, replacement, effective-result continuations | typed response or delayed continuation resumes the owner | causal handle follows the Judgement continuation |
| Damage | `damageTriggerPending()` / `damageSufferedTriggerPending()` | damage trigger and post-damage continuation | nested Group/Damage resume references are typed | causal handle follows damage records |
| Redirect | existing target-card/Deflection continuation | declaration origin remains immutable | current target is changed in the typed continuation | origin/current helper proof; route evidence remains partial |
| Delayed activation | delayed card is persisted in its Judgement Zone | later activation enters `startNegation()` as a new root | historical source is not reopened as a parent | UNPROVEN for complete `originRef` history wiring |

## Persistence strategy

New root Attack responses, Attack-targeted entry, Negation entry, and the real
Borrowed Sword child push update `pending_json` and `causal_envelope_json` in
the same D1 batch or statement that advances the room phase. Existing CAS
predicates remain unchanged, so a stale or double submission cannot create a
causal transition.

The persisted Pending/Continuation handle is optional for legacy rooms. A
malformed or absent envelope remains `null`; C2 does not reconstruct identity
from timeline prose, card names, `resolutionId`, `event.id`, or
`actionRevision`.

## Borrowed Sword child behavior

The Borrowed Sword requirement is the parent `FORCED_ACTION` Frame. Choosing a
legal target creates a child `ATTACK_RESPONSE` Frame with the same
`interactionId`, `parentFrameId` pointing at the forced-action Frame, and an
`originRef` to the parent. The normal forced Attack stores the child handle in
its response continuation. Refusal or invalidation resumes the parent Frame
through `resumeCausalFrame()` in the same guarded settlement write.

## Proven and remaining boundaries

Proven by deterministic helper tests and existing Worker/D1 flows:

- root/child Interaction lifetime and explicit parent resume;
- immutable origin versus mutable current targets;
- causal handle preservation through real response/trigger records;
- legacy `NULL` envelope compatibility and viewer-independent public envelope.

Still open before the C2 acceptance gate can be closed:

- apply the same centralized envelope write helper to every automatic
  Pending/Continuation transition rather than only the current root/child
  boundaries;
- add engine assertions for all scenario-matrix IDs at reconnect and second
  viewer boundaries;
- complete child Frame wiring for Group-nested damage and independent damage
  triggers;
- prove delayed activation `originRef` history and final settlement clearing.

## C2-FIX6 ownership evidence — 2026-10-02

This matrix is intentionally tied to real API/engine evidence. Helper-only
tests never upgrade a row to PROVEN.

### Root creator inventory

| Production creator | Flow | Envelope + context retained | Exact persistence boundary | Status |
| --- | --- | --- | --- | --- |
| `attackDeclaration()` | Attack | explicit `{ value, createdEnvelope }` wrapper | first response/Attack-targeted room write | AUTHORITATIVE |
| `damageTriggerPending()` | independent damage trigger | explicit `{ value, createdEnvelope }` wrapper | response Pending room write | AUTHORITATIVE |
| `damageSufferedTriggerPending()` | independent post-damage trigger | explicit `{ value, createdEnvelope }` wrapper | response Pending room write | AUTHORITATIVE |
| `startNegation()` | card Negation | yes | root response room batch | AUTHORITATIVE |
| `startJudgementNegation()` | delayed Judgement Negation | yes | root response room batch | AUTHORITATIVE |
| `groupResponseDecision()` | Group/AOE | explicit `{ value, createdEnvelope }` wrapper | ordinary Group and Halberd callers persist the exact envelope with first Pending/phase state | AUTHORITATIVE in FIX7 scope |
| `duelResponseDecision()` | Duel | explicit `{ value, createdEnvelope }` wrapper | Lust and ordinary Duel callers persist the exact envelope with first Pending/phase state | AUTHORITATIVE in FIX7 scope |

### Recovery inventory

There are no remaining production routing calls to `recoverCausalEnvelope()`.
Normal Attack, Attack-targeted, Borrowed Sword, and Damage paths
now keep legacy/missing envelopes as `null` instead of reconstructing a frame
tree from a context handle. The helper remains available only to isolated
legacy compatibility/unit code and is not a normal supported-flow authority.

### Exact FIX6 matrix

| Requirement | Status | Exact evidence | Remaining gap |
| --- | --- | --- | --- |
| normal Attack exact root persistence | PROVEN | `real Attack causal envelope is stable across room reads and viewers` | none |
| Attack-targeted exact root persistence | PROVEN | `Cavalry is an optional source-owned attack_targeted trigger and Skip preserves Dodge` | this proves Cavalry only |
| Attack Pending context matches envelope | PROVEN | real Attack test and Cavalry API test | none for covered entries |
| repeated reads preserve IDs/checkpoint/revision | PROVEN | real Attack test; Cavalry test | none |
| reconnect/read-after-persistence preserves IDs/checkpoint/revision | PROVEN | real Attack test's repeated production reads | no browser reconnect harness beyond API reads |
| second viewer sees same real Attack envelope | PROVEN | real Attack test | none |
| stale request leaves causal identity unchanged | PROVEN | `stale and concurrent response submissions claim each transition once` | none |
| concurrent duplicate response cannot duplicate causal transition | PROVEN | same concurrency test and Borrowed Sword CAS matrix | none |
| Attack settlement clears envelope | PROVEN | lethal Attack → Damage → Dying → Peach rescue test | none |
| next independent root gets fresh IDs | PROVEN | lethal rescue test's subsequent ordinary Attack | none |
| Attack-derived Damage reuses root | PROVEN | lethal Damage/Dying test | none |
| independent Damage exact root persistence | UNPROVEN | no isolated authoritative scenario | requires a real source-less Damage root fixture |
| malformed mid-continuation does not fabricate authority | PROVEN | `malformed room envelope remains non-authoritative` | none for ordinary Dodge continuation |
| legacy NULL continuation remains null | PROVEN | `legacy room without causal envelope remains null through production room state` | none |
| no production normal-path recoverCausalEnvelope | PROVEN | route search audit | helper remains only for isolated compatibility code |

### Attack variant audit

| Variant | Status | Evidence / boundary |
| --- | --- | --- |
| ordinary card Attack | PROVEN | real ordinary Attack persistence/read/viewer test |
| Attack-targeted | PROVEN | real Ma Chao Cavalry Attack-targeted API test |
| Halberd / virtual Attack | PARTIAL | caller audit and existing gameplay tests; no dedicated envelope assertion |
| Serpent Spear | PARTIAL | caller audit and existing gameplay tests; no dedicated envelope assertion |
| Influencing Attack | PARTIAL | caller audit and delegated gameplay tests; no dedicated envelope assertion |
| Borrowed Sword inherited Attack | PARTIAL | real child identity/CAS tests, but no dedicated root-transport assertion for this FIX6 row |
| follow-up / inherited Attack | PARTIAL | caller audit and continuation tests; no dedicated envelope assertion |

The centralized room write helper now covers the audited Attack, Damage,
Group, and Duel root boundaries. Group/Duel participant progression reuses the
existing interaction/frame; this slice does not claim Group child semantics,
Judgement, delayed activation provenance, or global automatic-transition
coverage.

## C2-FIX7 Group/Duel evidence matrix — 2026-10-02

| Requirement | Status | Exact evidence | Remaining gap |
| --- | --- | --- | --- |
| Group new root exact-envelope persistence | PROVEN | real Raining Arrows and Barbarian Invasion API flow | none for covered Group entries |
| Group Pending context matches envelope | PROVEN | persisted `pending_json` interaction/frame assertions | none |
| Group participant advance preserves interaction/frame | PROVEN | Xiahou Dun continuation reaches the next AOE responder with the same root | no Group child semantics claimed |
| Group repeated read/second viewer stable | PROVEN | repeated room read and second viewer assertions in the real AOE flow | no browser reconnect harness |
| Group stale/double cannot duplicate root | PARTIAL | existing action CAS and stale-response coverage | no dedicated causal-ID assertion on the Group stale row |
| Group settlement clears root | PROVEN | final AOE responder assertion | none |
| Duel new root exact-envelope persistence | PROVEN | real Diao Chan Lust API flow | none for covered Duel entries |
| Duel Pending context matches envelope | PROVEN | persisted `pending_json` interaction/frame assertions | none |
| Duel alternating responders preserve interaction/frame | PROVEN | real Lust response progression and root identity assertions | no alternate multi-Attack fixture beyond covered flow |
| Duel response Attack creates no child Frame | PROVEN | Duel continuation asserts one root frame after response progression | none |
| Duel repeated read/second viewer stable | PROVEN | repeated room read and second viewer assertions | no browser reconnect harness |
| Duel stale/double cannot duplicate root | PARTIAL | existing Lust stale/duplicate rejection and CAS | no dedicated causal-ID assertion on the stale row |
| Duel settlement clears root | PROVEN | completed Lust exchange assertion | none |
| Group/Duel missing envelope does not reconstruct authority | PARTIAL | shared legacy-null/non-reconstruction rule and route audit | no dedicated malformed Group and Duel fixtures |
| no Group/Duel normal-path `recoverCausalEnvelope` | PROVEN | production route search has no call site | compatibility helper remains isolated in `game/causal-context.ts` |

C3 Group semantics, C4 Dying barrier work, C5 projector migration, and React
presentation changes remain explicitly out of scope.
