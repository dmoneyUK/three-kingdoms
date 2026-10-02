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

## C2-FIX5 ownership evidence — 2026-10-02

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
| `groupResponseDecision()` | Group/AOE | context only | existing Group persistence callers | CONTEXT_ONLY_BUG; out of FIX4 scenario scope |
| `duelResponseDecision()` | Duel | context only | existing Duel persistence callers | CONTEXT_ONLY_BUG; out of FIX4 scenario scope |

### Recovery inventory

There are no remaining production routing calls to `recoverCausalEnvelope()`.
Normal Attack, Attack-targeted, Borrowed Sword, and Damage paths
now keep legacy/missing envelopes as `null` instead of reconstructing a frame
tree from a context handle. The helper remains available only to isolated
legacy compatibility/unit code and is not a normal supported-flow authority.

| FIX5 row | Status | Exact evidence |
| --- | --- | --- |
| Normal Attack root survives read/reconnect/second viewer | PROVEN | `tests/api/presentation-causality.test.mjs` production reload/public projection test |
| Attack → Damage → Dying retains root identity | PROVEN | `tests/api/concurrency.test.mjs` lethal Damage/Dying test |
| Stale/double response creates one transition | PROVEN | `tests/api/concurrency.test.mjs` and `tests/api/borrowed-sword.test.mjs` CAS tests |
| Settlement clears the root | PROVEN | lethal rescue and Borrowed Sword refusal tests |
| Independent Damage root | UNPROVEN | no isolated API scenario currently proves a fresh independent Damage root |
| Legacy NULL envelope remains null | PROVEN | `tests/api/presentation-causality.test.mjs` legacy-room test |
| Malformed continuation cannot fabricate authority | PROVEN | parser rejection tests; real gameplay corruption row remains a follow-up |
| Attack entry variants retain explicit root transport | PROVEN | route audit for ordinary, Influencing, Serpent Spear, Halberd, follow-up, and Borrowed Sword callers |

The centralized room write helper now covers the audited Attack and Damage
root boundaries. Group/Duel context-only creators remain explicit known bugs
outside this ownership slice; no Group/Judgement/Duel scenario expansion is
claimed here.

C3 Group semantics, C4 Dying barrier work, C5 projector migration, and React
presentation changes remain explicitly out of scope.
