# UX2.0C2 — Authoritative causal propagation map

This document records the C2 orchestration boundaries currently implemented.
It intentionally does not classify Group resolution semantics, alter Dying
presentation barriers, or migrate the PresentationV2 projector.

## Authoritative transition map

| Flow | Root / entry | Same-Frame records | Child / resume boundary | Current evidence |
| --- | --- | --- | --- | --- |
| Attack | `attackDeclaration()` at authoritative card/provider acceptance | `attackResponseDecision()`, Dodge/decline response continuation | Damage and Dying remain on the attack reference; nested provider work is still being completed | causal handle and room envelope on ordinary response and Attack-targeted entry |
| Duel | `duelResponseDecision()` | alternating response continuation | response Attack satisfies Duel; it is not a child Frame | explicit root envelope persisted at first response; alternation reuses the Duel frame |
| Negation | independent `startNegation()` root or nested Group/Duel Negation entry | `advanceNegation()`, `applyNegationResponseOutcome()` | independent root settles directly; nested Group/Duel restores its typed same-frame stage | independent roots create one Interaction; nested Group/Duel keeps one Frame and changes stage/checkpoint |
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
| independent Damage exact root persistence | PROVEN | source-less Lightning/Legacy engine-backed API evidence | no gap for the covered Lightning root; other source-less damage variants remain unseparated |
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

## C2-FIX9 same-frame correction — 2026-10-02

Nested Negation that modifies an active Group or Duel is `SAME_FRAME`. The
authoritative Group/Duel frame remains active, its stage/current resolver moves
to `NEGATION` at one semantic checkpoint, and settlement moves the same frame
back to `GROUP_RESOLUTION` or `DUEL_EXCHANGE` at one further checkpoint.

- Independent top-level Negation creates its own root Interaction/Frame.
- Nested Group/Duel Negation keeps the existing `interactionId` and `frameId`;
  it does not set `parentFrameId` or create a child/root ID.
- `Pending.causal` and `NegationContinuation.causal` carry the same frame
  context through every counter-Negation window.
- `advanceCausalSemanticCheckpoint()` changes stage/current, checkpoint, and
  presentation revision atomically; automatic ineligible-seat scans do not
  create visible checkpoints.
- Borrowed Sword's forced Attack remains the canonical legitimate child-frame
  case because it launches an independently resolving Attack effect.

## C2-FIX9 evidence matrix — 2026-10-02

| Requirement | Status | Exact evidence | Remaining gap |
| --- | --- | --- | --- |
| Group root remains one frame during nested Negation | PROVEN | `FIX9 persists the Group root and keeps nested Negation in the same Frame` | none for covered Raining Arrows entry |
| Group Negation uses NEGATION stage on same frame | PROVEN | same named Group engine/API test | none |
| Group Negation settlement restores GROUP_RESOLUTION on same frame | PROVEN | same test asserts stage after pass | none |
| Group counter-Negation stays same interaction/frame | PROVEN | `FIX9 Group counter-Negation stays in one frame and restores Group resolution` | none |
| Group stale request preserves identity/checkpoint/revision | PROVEN | `FIX9 Group stale response preserves causal identity and card state` | none for covered response |
| Group duplicate response race cannot duplicate transition | PROVEN | `FIX9 Group duplicate response race advances one participant once` | none |
| Group missing envelope does not fabricate authority | PROVEN | `FIX9 Group NULL and ordinary Duel malformed envelopes stay non-authoritative` | no malformed Group variant; NULL is covered |
| physical Duel root remains one frame during nested Negation | PROVEN | `FIX9 ordinary Duel Negation stays in one Frame and restores the Duel stage` | none |
| Duel Negation uses NEGATION stage on same frame | PROVEN | same named physical Duel test | none |
| Duel Negation settlement restores DUEL_EXCHANGE on same frame | PROVEN | same test asserts stage after pass | none |
| Duel response Attack remains same Duel frame | PROVEN | same test asserts one frame after Attack | none |
| Duel counter-Negation stays same interaction/frame | PROVEN | `FIX9 physical Duel counter-Negation stays in one frame and restores the Duel` | none |
| Duel stale request preserves identity/checkpoint/revision | PROVEN | `FIX9 ordinary Duel stale response preserves causal identity before valid progression` | none |
| Duel duplicate response race cannot duplicate transition | PROVEN | `FIX9 ordinary Duel duplicate response race advances one exchange once` | none |
| Duel malformed envelope does not fabricate authority | PROVEN | named FIX9 Group NULL/Duel malformed API test | none |
| response.causal and continuation.causal align through counter-Negation | PROVEN | physical Duel counter-Negation test plus route propagation assertions | none for covered Duel path |
| independent top-level Negation still creates its own root | PROVEN | engine-backed independent Dismantle Negation assertions | delayed Judgement remains out of scope |
| no nested Group/Duel Negation creates child/root IDs | PROVEN | Group/Duel tests assert one frame and stable activeFrameId | Group counter-card path not separately covered |

## C2-FIX10 Negation decision-actor invariant — 2026-10-02

For a valid causal envelope, `CurrentAction.actorId`, `Pending.actorId`, the
Negation continuation's causal frame, and
`activeFrame.current.resolvingPlayerId` describe one actual blocking responder.
The engine may scan living seats internally, but an ineligible seat is never
persisted as a player-facing decision checkpoint.

`nextEligibleNegationResponder()` owns the ordered capability scan and returns
the first living player for whom `canPlayerRespondWithNegation()` is true,
plus the unscanned ordered candidates after that player. The initial
`startNegation()`, delayed Judgement entry, and nested Group entry use that
selection before publishing their first Pending/envelope state.

`advanceNegationDecision()` is the guarded handoff boundary for an existing
Negation Pending. It preserves Interaction/Frame and `NEGATION`, aligns the
top-level and continuation causal handles, updates the resolver to the next
actual blocker, and calls `advanceCausalSemanticCheckpoint()` once. Its CAS
write commits Pending and causal envelope together. A NULL or malformed
envelope remains non-authoritative and is never reconstructed.

The `advanceNegation()` scheduler has three explicit cases: arming a deadline
for the same actor is Pending-only; an expired/ineligible actor scans directly
to the next actual blocker; and no eligible blocker settles the chain without
creating a fake responder checkpoint. Successful Negation reset and failed
judged/semantic responses use the same eligibility rule before opening another
window. Timeout is therefore the same semantic decline/handoff transition.

### Negation actor-transition inventory

| Transition | Production path | Envelope behavior | Evidence status |
| --- | --- | --- | --- |
| initial Negation window | `startNegation()`, delayed Judgement, nested Group entry | choose actual blocker before root/same-frame write | PROVEN for independent root; Group/Duel same-frame paths remain covered |
| ineligible-seat scan | `advanceNegation()` → `nextEligibleNegationResponder()` | no checkpoint/revision for skipped seats | PROVEN |
| same-actor deadline arm | `advanceNegation()` / `start_response_timer` | Pending-only, no presentation revision | PROVEN |
| eligible decline | canonical `decline_response` → `advanceNegationDecision()` | one CAS handoff checkpoint when another blocker exists | PROVEN |
| eligible timeout | `advanceNegation()` → `advanceNegationDecision()` | same one-checkpoint handoff as decline | PROVEN |
| successful Negation reset | canonical response and `applyNegationResponseOutcome()` | scan first eligible reset responder; checkpoint only for a real next blocker | PARTIAL: no dedicated real fixture with skipped post-reset seats |
| failed judged/semantic Negation | `applyNegationResponseOutcome()` | failed response can hand off with aligned causal state | PARTIAL: production path fixed; no real Standard judged-Negation provider fixture |
| no eligible responders | `advanceNegation()` / deferred settlement | settle or restore parent; no fake responder checkpoint | PROVEN for covered independent and nested flows |

## C2-FIX10 evidence matrix — 2026-10-02

| Requirement | Status | Exact evidence | Remaining gap |
| --- | --- | --- | --- |
| initial Negation skips ineligible seats without fake checkpoint | PROVEN | `FIX10 initial Negation skips ineligible seats without a fake blocker checkpoint` | none for the real DrawTwo root |
| initial real blocker matches Pending and envelope resolver | PROVEN | same FIX10 initial test | none |
| decline handoff updates Pending + resolver atomically | PROVEN | `FIX10 Negation decline skips an ineligible seat and advances one causal checkpoint` | none for covered root |
| decline A → skip B → block C advances one checkpoint | PROVEN | same FIX10 decline test asserts stable IDs, one revision, and C resolver | no alternate seat-count fixture |
| timeout handoff updates Pending + resolver atomically | PROVEN | `FIX10 Negation timeout skips an ineligible seat and advances one causal checkpoint` | none for covered root |
| timeout with skipped ineligible seats advances one checkpoint | PROVEN | same FIX10 timeout test | no alternate seat-count fixture |
| deadline arming for same actor does not advance presentation revision | PROVEN | FIX10 initial test arms the blocker and compares revision | none |
| successful Negation reset selects first eligible counter-responder | PARTIAL | production canonical and judged paths call `nextEligibleNegationResponder()` | no dedicated real reset fixture with an ineligible seat before the counter |
| counter Pending/continuation/envelope actor context stays aligned | PARTIAL | independent counter test plus FIX9 Group/Duel counter frame assertions | Group/Duel counter tests do not each assert resolver actor after every window |
| failed judged/semantic response handoff is causally correct | PARTIAL | `applyNegationResponseOutcome()` now scans and advances causal state on actor change | no real Standard judged-Negation provider fixture |
| independent Negation decline updates resolver correctly | PROVEN | strengthened `engine-backed Negation/counter-Negation keeps the original effect recoverable` | none |
| nested Group Negation handoff preserves Group interaction/frame | PROVEN | `FIX10 nested Group Negation handoff skips an ineligible target in the same frame` | none for covered Group path |
| nested Duel Negation handoff preserves Duel interaction/frame | PROVEN | `FIX10 nested Duel Negation handoff skips an ineligible target in the same frame` | none for covered Duel path |
| no ineligible scan creates new Interaction/Frame | PROVEN | FIX10 initial/decline/timeout tests assert one root and stable IDs | none for covered root |
| NULL/malformed handoff never reconstructs authority | PROVEN | FIX9 Group NULL/Duel malformed non-authoritative test plus null-preserving handoff code | no separate malformed timeout fixture |
| README/C2 documentation no longer contradicts FIX9 evidence | PROVEN | README and this document now describe Group counter-Negation as proven and preserve explicit gaps | none |

C3 Group semantics, C4 Dying barrier work, C5 projector migration, and React
presentation changes remain explicitly out of scope.

## C2 independent Damage root evidence — 2026-10-02

The covered Lightning fixture is a delayed Judgement activation whose current
Damage source is null; it is not an independent root once FIX11 attaches the
Damage to the delayed Judgement Interaction. Its `DAMAGE` stage retains the
activation owner in historical origin/current provenance while exposing null as
the actual Damage source. The same envelope is retained through private Legacy
distribution and repeated damage-point reaction windows, then cleared at final
settlement. The fixture proves this delayed Judgement -> Damage inheritance;
standalone source-less Damage remains unproven.

## Judgement causal lifetime — 2026-10-02

Judgement continuations carry only the server-owned `CausalContext`; Pending
records carry the same handle, while `causal_envelope_json` remains the public
authority. `beginJudgementResolution()` uses `JUDGEMENT` as the minimum stable
stage. Reveal, card/effect evaluation, deck movement and eligibility scans do
not create checkpoints. A real Necromancy actor advances the current resolver
once, and replacement stays in the same Interaction/Frame. Effective-result,
response, Cavalry and Damage-related resumes preserve that handle.

Delayed Draw activation first creates a fresh root in `startJudgementNegation()`
before checking whether a Negation actor exists. `beginDelayedJudgement()` then
uses that exact root for reveal and optional replacement; no placement
interaction is recovered. Historical `originRef` is not currently persisted in
the room schema, so provenance beyond the fresh activation origin is an honest
gap. Delayed Lightning passes the Judgement context into synchronous Damage and
does not clear it before Damage/Legacy settlement.

Luo River repeats Judgements in the same active Judgement Interaction, carries
causal identity through its turn-start continuation, and clears the envelope
when the loop ends. NULL/malformed room envelopes remain null during resume;
continuation handles never reconstruct public authority.

### FIX11 path inventory

| Path | Entry/resume | Lifetime rule | Evidence/boundary |
| --- | --- | --- | --- |
| Overindulgence / Rations Depleted | `startJudgementNegation()` -> `beginDelayedJudgement()` -> delayed resume | fresh delayed root | shared delayed path; no dedicated originRef fixture |
| Lightning | same delayed path -> `resolveSourcedDamage()` | fresh Judgement root, Damage inherits synchronously | delayed damaging branch is real-tested |
| Cavalry | `beginCavalryJudgement()` -> Attack-targeted resume | inherits Attack Interaction/Frame | real Ma Chao replacement test |
| Stauchness / Ganglie | `damage_suffered` trigger -> `beginJudgementResolution()` | inherits Damage context | real Xiahou Dun/Sima Yi tests; effective actor fixture partial |
| Luo River | `resolveTurnStartLuoshen()` loop | same active Judgement Interaction until loop settlement | real repeated-loop test |
| response/provider Judgement | `applyResponseOutcome()` -> response resume | inherits response parent context | typed transport and existing response tests |

### Exact FIX11 evidence matrix

| Requirement | Status | Exact evidence | Remaining gap |
| --- | --- | --- | --- |
| delayed activation starts fresh Interaction | PARTIAL | draw path always creates `startJudgementNegation()` activation root before optional response scan | no dedicated real placement-to-activation ID comparison |
| delayed activation never reuses placement Interaction | PARTIAL | delayed activation root is created independently of placement Pending/envelope | no end-to-end real fixture compares both IDs |
| delayed provenance/originRef is historical only | PARTIAL | code keeps activation origin separate from placement state | room schema has no typed `originRef` |
| delayed Judgement root exists before optional modifier | PROVEN | delayed Judgement engine test observes `JUDGEMENT` root and replacement actor resolver | no dedicated no-responder public checkpoint fixture |
| no replacement actor creates no fake decision checkpoint | PARTIAL | `beginJudgementResolution()` resolves immediately when no actor; no separate real assertion of unchanged revision |
| replacement Pending actor matches envelope resolver | PROVEN | engine-backed Judgement replacement and Cavalry replacement assertions | none for every provider |
| Necromancy replacement stays same Judgement frame | PROVEN | `engine-backed Judgement replacement exposes reveal and resume evidence` | none for covered path |
| effective result preserves Judgement causal lifetime | PROVEN | same test asserts `judgement_effective_event` keeps Interaction/Frame | no separate post-effective provider matrix |
| Judgement Negation does not create a second root | PARTIAL | shared activation root is passed through `startJudgementNegation()` | no dedicated real Judgement-Negation fixture |
| counter-Negation remains same Judgement frame | PARTIAL | FIX10 handoff helper and Judgement integration share `CausalContext` | no real Standard counter fixture |
| Cavalry Judgement preserves Attack interaction | PROVEN | `Cavalry uses the shared Judgement replacement continuation` | none for covered path |
| Cavalry resume returns to Attack causal context | PROVEN | same test asserts resumed settlement and red-result Dodge suppression | no separate stale replacement row |
| Damage-related Judgement preserves parent interaction | PARTIAL | Stauchness continuation carries causal Damage handle and existing API path passes | no dedicated envelope assertion after every provider |
| Luo River repeated Judgement lifetime is authoritative | PROVEN | `Luoshen repeats real Judgements...` asserts same Interaction/Frame and final clear | none for alternate seat counts |
| delayed damaging result keeps synchronous damage attached | PROVEN | `source-less Lightning...Legacy opportunities` asserts inherited root through Damage windows | no Group-nested Damage claim |
| delayed transfer settles activation Interaction | PARTIAL | Lightning transfer gameplay remains covered | no causal envelope assertion at transfer settlement |
| transferred delayed card later activation gets fresh Interaction | PARTIAL | later delayed activation uses shared fresh-root draw path | no end-to-end ID comparison across two turns |
| Judgement settlement clears only at true root settlement | PROVEN | delayed Lightning, Luo River, and replacement tests assert settlement boundaries | transfer branch needs causal assertion |
| repeated read/reconnect preserves Judgement identity | PROVEN | Judgement engine test reads projected state across reveal/replacement | no browser reconnect harness |
| second viewer sees same public Judgement envelope | PROVEN | engine-backed Judgement projection uses Sima/Guo viewer reads | no private-choice expansion beyond covered fixture |
| stale/duplicate replacement cannot duplicate causal transition | PARTIAL | existing Pending CAS rejects replay; Judgement-specific causal-ID race not isolated | add dedicated duplicate-replacement fixture |
| NULL/malformed Judgement does not reconstruct authority | PROVEN | `malformed Judgement envelope stays non-authoritative through legacy resume` | none for transfer corruption |

C3, UI/React/CSS, Group-nested Damage, and the Dying presentation barrier
remain out of scope.
