# UX2.0C2 — Authoritative causal propagation map

This document records the C2 orchestration boundaries currently implemented.
It intentionally does not classify Group resolution semantics, alter Dying
presentation barriers, or migrate the PresentationV2 projector.

## Authoritative transition map

| Flow | Root / entry | Same-Frame records | Child / resume boundary | Current evidence |
| --- | --- | --- | --- | --- |
| Attack | `attackDeclaration()` at authoritative card/provider acceptance | `attackResponseDecision()`, Dodge/decline response continuation | Damage and Dying remain on the attack reference; nested provider work is still being completed | causal handle and room envelope on ordinary response and Attack-targeted entry |
| Duel | `duelResponseDecision()` | alternating response continuation | response Attack satisfies Duel; it is not a child Frame | causal handle on Duel continuation |
| Negation | `startNegation()` or typed Group/Judgement Negation creation | `advanceNegation()`, `applyNegationResponseOutcome()` | deferred effect resumes through its typed continuation | root Negation identity and counter-window handle |
| Group/AOE | `groupResponseDecision()` / typed Group continuation | `nextGroupResponse()` and `finishGroupStep()` | `beginGroupTarget()` may launch an independently resolving Attack/Damage path | Group identity is carried; final C3 semantics are intentionally absent |
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

## C2-FIX2 evidence matrix — 2026-10-02

This matrix is intentionally tied to real API/engine evidence. Helper-only
tests never upgrade a row to PROVEN.

| Flow | Status | Exact API/engine evidence | Missing boundary |
| --- | --- | --- | --- |
| Attack → Dodge | PARTIAL | `tests/api/presentation-causality.test.mjs` — `D1 causal envelope survives production room reload and stays public across viewers` | same-frame persisted envelope through Dodge settlement |
| Attack → Damage | PARTIAL | `tests/api/concurrency.test.mjs` — `lethal damage trigger exhaustion enters shared Dying and Peach rescue exactly once` | damage-stage envelope assertion |
| Attack → Damage → Dying | PARTIAL | same lethal API test | persisted same Interaction/Frame and final clear |
| Duel alternating responders | PARTIAL | `tests/api/presentation-v2-engine.test.mjs` — `engine-backed Duel alternates response actors without changing the root context` | causalEnvelope, not only PresentationV2 |
| Negation → counter-Negation | PARTIAL | `tests/api/presentation-v2-engine.test.mjs` — `engine-backed Negation/counter-Negation keeps the original effect recoverable` | persisted envelope assertions |
| Group participant progression | PARTIAL | `tests/api/presentation-v2-engine.test.mjs` — `engine-backed Group damage trigger resumes the Group parent and next participant` | persisted Frame/checkpoint assertions |
| Group → nested child → parent resume | UNPROVEN | same Group test proves typed continuation only | real persisted child Frame |
| Borrowed Sword → forced Attack child → parent resume | PROVEN | `tests/api/borrowed-sword.test.mjs` — first Borrowed Sword test and CAS matrix | root settlement clear |
| Judgement reveal → replacement → effective result → resume | PARTIAL | `tests/api/presentation-v2-engine.test.mjs` — `engine-backed Judgement replacement exposes reveal and resume evidence` | persisted causalEnvelope at each boundary |
| Independent nested damage trigger → child → parent resume | UNPROVEN | no real child Frame evidence | determine independent-vs-same-frame semantics |
| Redirect/current-target mutation | PARTIAL | `tests/causal-context.test.mjs` — `C2 keeps immutable origin while current targets redirect` | real API envelope evidence |
| Delayed future activation | UNPROVEN | no authoritative historical `originRef` API proof | persisted provenance |
| Settlement/clear | PARTIAL | Borrowed Sword refusal/invalidation asserts parent resume | root clear after synchronous work |
| Reconnect identity stability | PARTIAL | `tests/api/presentation-causality.test.mjs` reload/viewer persistence test | real-flow reconnect matrix |
| Second-viewer public identity stability | PROVEN | same presentation-causality API test | none for generic envelope |
| Stale/double-action identity safety | PARTIAL | `tests/api/borrowed-sword.test.mjs` CAS matrix | envelope/checkpoint unchanged assertion |
| Legacy NULL envelope | PROVEN | `tests/api/presentation-causality.test.mjs` — `legacy room without causal envelope remains null through production room state` | none |
| Malformed envelope | PROVEN | `tests/presentation-causality.test.mjs` — `parser rejects structurally impossible envelopes` | real gameplay malformed-row API test |

The centralized room write helper currently covers audited root Attack and
Negation entries. C2-FIX2 must extend it only along transitions represented in
this matrix; remaining rows stay PARTIAL/UNPROVEN until real persisted
evidence exists.

C3 Group semantics, C4 Dying barrier work, C5 projector migration, and React
presentation changes remain explicitly out of scope.
