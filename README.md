A web implementation of the **WTK Standard** ruleset, built around authoritative server-side game state and semantic capability-driven actions.

## Current stage — UX2.0C6-02 evidence closure — 2026-10-03

C6-02 re-audits the accepted 13 real interaction families × 10 invariants
matrix using direct Worker/D1/API assertions: 128 cells are proven and 2
remain bounded GAPs. The remaining gaps are Attack/Dodge checkpoint
progression and independent/root Damage checkpoint progression; both real
fixtures settle after one semantic checkpoint and therefore do not expose a
second checkpoint transition to compare. The full cell-level ledger and exact
fixture/assertion mapping are in section `0.103` of the interaction-stage
design document.

No production gameplay, authority, React/CSS, animation, or
PresentationSnapshot code was added. C6 remains PARTIAL and is not ready for
reviewer closure; C7 remains out of scope.

## UX2.0C4-01 — atomic Dying/Peach rescue handoff — 2026-10-02

C4-01-FIX2 completes the atomic Dying/Peach rescue handoff boundary. Initial
entry, skip, timeout, continued rescue, and automatic resume all select the
next semantic rescue blocker before committing a stable `phase='dying'`
checkpoint; no raw candidate is published. Pending actor, active resolver,
causal frame, and checkpoint remain coherent, while `dyingBarrier` and
`interactionScene` retain their shared fail-closed proof. React/CSS migration,
animation timing, and C4-02 are not started.

C2 is closed and accepted. C3-01 now projects Group/AOE public semantics from
the authoritative causal envelope: source, ordered affected targets, current
participant, decision actor, stable Group frame, nested Damage child, and
parent-frame resume. Real Raining Arrows and Barbarian Invasion paths retain
the same Interaction/Frame identity through Damage and Dying/rescue, while
NULL/malformed envelopes remain non-authoritative.

C3-01-FIX1 corrects the role boundary: `currentParticipantId` remains the
Group target being processed across Damage and Dying child frames, while
`decisionActorId` and `activeResolverId` identify the live decision/resolver.
Real three-participant progression, nested Damage, Peach rescue, same-frame
Negation, viewer equivalence, and malformed-envelope behavior are covered.

C3-02 formalizes these public semantics as the typed `interactionScene`
snapshot. It is envelope-owned, excludes private CurrentAction controls, and
characterizes root/same-frame/child-frame structure without inferring visual
transitions or migrating React.

C3-02-FIX1 closes the authority gate: a scene is `PROVEN` only when the active
frame and checkpoint share both frame ID and stage. Cross-frame or cross-stage
stored authority fails closed as `UNPROVEN`.

C3-03 generalizes the typed public scene beyond Group for real Attack/Duel,
independent Damage, inherited delayed-Lightning Damage, Judgement (including
delayed activation), and root Negation causal frames. Real viewer/reconnect,
repeated-read, malformed-state, and Group `SAME_FRAME` regressions remain
covered; delayed-origin history and Attack-response-to-Judgement child
continuity remain explicitly partial.

C3-04 closes the actionable Attack -> Judgement characterization using the
real Ma Chao Cavalry path. Cavalry re-stages the same Attack frame through
Judgement and resumes the original Attack response; it does not create a child
frame. Engine-backed tests prove stage/checkpoint progression, stable causal
identity, exact Dodge resume, viewer-equivalent public scenes, and settlement
clearing. The final C3 audit finds no legacy compatibility contradiction and
recommends **C3 READY TO CLOSE**.

This is a projector/model/test change only. No React/CSS migration, gameplay
rule change, Dying presentation barrier, historical `originRef`, or C4/C5 work
is included. Historical delayed `originRef`, snapshot-only transition
direction, and the Dying presentation barrier remain explicit later
boundaries. The next authorized milestone is C4's Dying presentation barrier;
visual UX consumers remain out of scope until then.

## UX2.0C2 — causal propagation round — 2026-10-02

C2 propagation is implemented as a backward-compatible causal handle carried by
real Pending and Continuation records. Root Attack, Group, Duel, Negation, and
Damage decisions now receive explicit Interaction/Frame references; Judgement,
Attack-targeted, Damage, and Borrowed Sword continuations preserve those
references through response and trigger boundaries. Borrowed Sword forced
Attack records retain the parent reference. The real Borrowed Sword target
selection now pushes an `ATTACK_RESPONSE` child Frame under the
`FORCED_ACTION` parent and its refusal path resumes the parent in the same
guarded room write. Root Negation and ordinary Attack response entry also
persist their envelope with the Pending/phase transition.

Added runtime proofs and an engine-backed Borrowed Sword proof for root
identity, nested child identity, typed parent resume, immutable origin, and
redirected current targets. The full C2 migration is not yet a release gate:
generic room-envelope CAS updates for every automatic transition, Group and
nested-damage child wiring, settlement clearing, and delayed `originRef`
evidence remain open. Dying barrier work remains explicitly deferred to C4.

See `docs/UX_V2_0C2_CAUSAL_PROPAGATION.md` for the authoritative transition map.

C2-FIX now centralizes the audited Attack and Negation root room writes and
records an explicit per-flow audit matrix. The acceptance gate remains
PARTIAL pending automatic-transition coverage, nested damage/Dying lifetime,
Judgement lifetime, and settlement-clear proofs.

C2-FIX3 adds real lethal Attack → Damage → Dying envelope evidence: the same
Interaction/Frame is retained through `DYING`, and successful rescue clears
the settled envelope. The broader C2 gate remains PARTIAL.

C2-FIX4 removes normal-path causal envelope reconstruction from Attack,
Attack-targeted, Borrowed Sword, and Damage routing. Root creators now carry
their exact envelope separately from Pending references; the broader C2 gate
remains PARTIAL while Group/Duel ownership and other scenario evidence stay
outstanding.

C2-FIX5 replaces the temporary hidden runtime envelope carrier with explicit
`{ value, createdEnvelope }` wrappers for Attack and Damage root creators. The
ordinary Attack path now has read/reconnect/viewer, stale/double, settlement,
fresh-root, legacy-null, and malformed-envelope regression evidence. The
independent Damage-root scenario remains explicitly UNPROVEN; Group/Duel and
other C2 work remain outside this round.

C2-FIX6 closes the missing real Attack ownership proofs: stale response identity
is checked before settlement, malformed envelope corruption is exercised during
a real Dodge continuation, and real Attack evidence is separated from manual
C1 projection coverage. Attack-targeted Cavalry is proven; other entry variants
remain individually PARTIAL where no dedicated causal-envelope assertion exists.

C2-FIX7 makes Group/AOE and Duel roots authoritative: each new root returns and
persists one explicit causal envelope, while participant progression stays in
the same interaction/frame. Group child semantics, independent Damage,
Judgement, delayed activation provenance, and the broader automatic-transition
audit remain open C2 work.

C2-FIX9 corrects nested Group/Duel Negation to `SAME_FRAME`: the existing
Interaction/Frame enters `NEGATION` at one semantic checkpoint and restores
`GROUP_RESOLUTION` or `DUEL_EXCHANGE` on the same frame. Dedicated Group/Duel
stale, duplicate-race, NULL/malformed, same-frame, counter-Negation, and
independent-root proofs are now present, including the Group counter-Negation
flow. C2-FIX10 now selects only the actual Negation blocker and advances the
same causal frame exactly once on real actor handoff; initial ineligible-seat,
decline, timeout, and independent-root evidence is present. The broader C2
gate remains partial for the explicitly listed Judgement, delayed-activation,
Damage, and Dying boundaries.

C2-FIX11 now carries Judgement causal handles through reveal, Necromancy,
effective-result, resume, delayed Lightning damage, Luo River repetition, and
settlement. Delayed activation creates a fresh root before optional responses;
Cavalry inherits the unresolved Attack Interaction; malformed envelopes are
never reconstructed. The broader C2 gate remains partial for delayed
`originRef`, Judgement-Negation runtime evidence, nested Damage, and the Dying
barrier.

C2-FIX13 now proves the same physical Lightning card can transfer from A to B,
settle A's activation, and later create a fresh B interaction without a parent
frame or duplicate card. Judgement Negation/counter-Negation, no-responder
settlement, Necromancy races, delayed placement-to-activation, and Stauchness
Damage-parent evidence remain covered. C2 is still partial for historical
delayed `originRef`, runtime synchronous Judgement-Negation parent construction,
and the Dying presentation barrier. C2-FIX14 now proves the real Raining Arrows
Group failure path: one Damage child frame preserves the Group Interaction,
blocks on the real Damage resolver, resumes the exact Group parent once, and
continues the next participant before clearing at final settlement. Repeated
viewer reads, stale/duplicate trigger commands, and malformed envelope storage
are covered; nested Damage-to-Dying remains PARTIAL by scope. The next milestone
is reviewer validation of FIX14 and the remaining C2 gaps; do not start C3.

## UX2.0B-FINAL verification — 2026-10-02

On `ux-v2`, real engine-backed PresentationV2 checks now cover Dying/rescue
timer arming and reconnect, Group nested resume, Duel alternation,
Negation/counter-Negation, Judgement replacement/resume, and viewer privacy.
The focused projector suite is 17/17 and the API suite is 210/210. The
projector remains additive and pure; no final Interaction/Frame/Checkpoint IDs,
React migration, CSS, or gameplay-rule changes were made.

UX2.0C remains **NOT READY**: universal root/parent lifetime and Dying
barrier metadata are still open. The next milestone is review of this evidence,
not visual implementation.

## UX2.0B-FIX — engine-backed PresentationV2 verification — 2026-10-02

Hardened the additive pure server-side `presentationV2` projection: root
targets are explicit-only, Group detection requires a typed Group
continuation, and active/transition references are causally bounded. Added
engine-backed API tests for Attack/Dodge, Borrowed Sword forced Attack,
viewer privacy, response timer arming/reconnect, and the single-target Group
negative case. No final Interaction, Frame, Stage, or Checkpoint identities
were introduced.

The complete A-I flow matrix remains partly projector-only, rescue timer
reconnect evidence remains open, and Group ordering remains `UNPROVEN`.
Next milestone is review of this UX2.0B-FIX gate; do not start UX2.0C or React
presentation migration yet.

## Hero artwork update — 2026-10-01

Replaced the supplied portraits through the shared `HERO_ART_BY_ID` /
`HeroPortrait` renderer: Photo 1 is Zhao Yun and Photo 2 is Ma Chao. The
shared renderer applies the artwork in hero selection, locked-in selection,
the local hero dock, and opponent cards.

This is a presentation-only update: gameplay rules, projections, selection
legality, layout dimensions, and semantic actions are unchanged.

## Functional UX — minimized event log — 2026-10-01

The foldable Game Messages event log now starts minimized by default, keeping
the board and decision controls clear on entry. The existing expand/collapse
button and public message history remain unchanged.

## Hero artwork update — 2026-10-01

Replaced the supplied portraits through the shared `HERO_ART_BY_ID` /
`HeroPortrait` renderer: Photo 1 is Hua Xiong, Photo 2 is Pan Feng, Photo 3
is Lü Bu, and Photo 4 is Diao Chan. Hua Xiong now also uses the shared portrait
renderer instead of the initials fallback. The artwork applies in hero
selection, locked-in selection, the local hero dock, and opponent cards.

This is a presentation-only update: gameplay rules, projections, selection
legality, layout dimensions, and semantic actions are unchanged.

## Hero artwork update — 2026-10-01

Replaced the supplied portraits through the shared `HERO_ART_BY_ID` /
`HeroPortrait` renderer: Photo 1 is Cao Cao, Photo 2 is Xiahou Dun, and Photo
3 is Sima Yi. The shared renderer applies the artwork in hero selection,
locked-in selection, the local hero dock, and opponent cards.

This is a presentation-only update: gameplay rules, projections, selection
legality, layout dimensions, and semantic actions are unchanged.

## Hero artwork update — 2026-10-01

Replaced the supplied portraits through the shared `HERO_ART_BY_ID` /
`HeroPortrait` renderer: Photo 1 is Lu Xun and Photo 2 is Sun Shangxiang. The
shared renderer applies the artwork in hero selection, locked-in selection,
the local hero dock, and opponent cards.

This is a presentation-only update: gameplay rules, projections, selection
legality, layout dimensions, and semantic actions are unchanged.

## Functional UX — action and decision clarity — 2026-10-01

Added one pure `buildDecisionPresentation` model for projected room state.
The game screen now presents turn owner, phase, decision owner, one primary
live decision/status message, and supporting instructions without deriving
legality in React. Acting viewers see `YOUR DECISION`; other viewers see
`WAITING FOR <actor>`, while normal turns keep phase ownership separate from
response/trigger ownership. Existing semantic controls and payloads are
unchanged, including Quick Test, rescue, Negation, Judgement, Harvest, and
target-card decisions.

Focused mounted/render regressions cover normal turns, private and shared
responses/triggers, rescue, Negation, target selection, resolving state,
action revisions, ownership differences, and Quick Test perspective.

Current stage remains Stage 7 product polish. UX 1 is complete after the full
validation gate; the next active milestone is UX 2 — selection and control
feedback. No gameplay rules, artwork, board graphics, or UX 2 work was added.

## Gameplay correctness — cross-phase active-skill target selection — 2026-09-30

Fixed the shared opponent targeting UI so semantic active hero skills can
select projected character targets outside the Play Phase. Zhang Liao Assault
now enters generic target-selection mode during its Draw Phase trigger: only
server-projected live targets are selectable, selected opponents use the
existing target treatment, and the generic `trigger` payload carries one or
two character IDs. Ordinary Play Phase targeting and inactive opponent hero
inspection remain unchanged. Assault continues to resolve hidden Hand cards
server-side without exposing opponent Hand identities.

Mounted GameRoom coverage protects activation, inspection-vs-selection button
semantics, one/two-target selection, invalid-target rejection, exact semantic
submission, and cancel/re-entry reset behavior.

## Current status — 2026-09-30

The Standard gameplay foundation is implemented:

- **30 / 30 Standard heroes** are implemented and selectable.
- **46 / 46 printed Standard hero skills** are implemented.
- **28 / 28 verified Standard card identities** are playable.
- The canonical **108-card Standard deck** is implemented.
- Core turn flow, responses, triggers, damage, Dying/rescue, recovery, Judgement, delayed Stratagems, equipment interactions, match outcome, private projections, stale-action rejection, and Quick Test infrastructure are implemented.

The hero-implementation milestone is closed. Remaining Standard work is interaction correction and hardening of already implemented rules rather than adding more Standard heroes.

See:

- `ROADMAP.md` for the active priorities.
- `HANDOVER.md` for implementation details and known remaining defects.
- `docs/STANDARD_HERO_REFERENCE.md` for the complete Standard hero/skill reference.
- `docs/OFFICIAL_CARD_REFERENCE.md` for the verified Standard card reference.
- `docs/STANDARD_108_DECK_MANIFEST.md` for the physical deck manifest.

## Active work

The confirmed Standard gameplay-correction phase is complete, including
Cao Cao/Sun Quan Lord-role correctness, Lü Bu/Unrivaled semantic multi-response,
Sima Yi/Retaliation server-random Hand acquisition, and Huang Gai/Self Sacrifice
timing.

The next active phase is **functional UX improvement**, beginning with action
and decision clarity on the current game screen. Larger integration and
end-to-end/release testing remain future TODO phases.

The Standard completion count remains **30/30 heroes and 46/46 skills**.

## Gameplay architecture

The supported gameplay protocol is semantic and capability-driven.

- `currentAction` is the authoritative client decision contract.
- Responses use generic `respond` / `decline_response` actions.
- Triggered and active capabilities use generic `trigger` / `decline_trigger` actions.
- Persisted continuations resume interrupted Attack, Duel, group-card, damage, Dying, recovery, Judgement, equipment-loss, and hero-skill flows.
- Legality is owned and revalidated by the server.
- Private Hand/provider choices are projected only to the acting seat.
- Stale and replayed decisions are rejected.
- Physical card identity and conservation are preserved through conversions and continuations.
- Quick Test uses the same human-style game rules and seat ownership as normal multiplayer.

New rules should extend these generic boundaries rather than introduce hero/card-specific HTTP actions or a second rules engine.

## Standard rules scope

The active ruleset is **WTK Standard**. Expansion sets such as Endless Legends and Kingdom Wars are outside the active gameplay roadmap unless scope is explicitly changed.

The project uses the official WTK Standard rulebook/card references recorded in the repository as the rules and terminology basis. Where a wording interpretation remains unresolved, do not silently change the implementation without explicit WTK evidence.

One currently parked interpretation concerns the source zone for cards used by Guan Yu God of War, Zhen Ji Empress Dowager, Gan Ning Ambushment, Da Qiao Captivating, and Hua Tuo First Aid. Their existing Hand-zone interpretations should remain until an explicit ruling/source resolves them.

## Development

Requirements:

- Node.js **22.13.0 or newer**
- npm

Install dependencies:

```bash
npm install
```

Run locally:

```bash
npm run dev
```

Build:

```bash
npm run build
```

Run the fast tests:

```bash
npm run test:fast
```

Run the API suite:

```bash
npm run test:api
```

Run the complete validation test command:

```bash
npm test
```

Lint:

```bash
npm run lint
```

Before release, run:

```bash
npm run build
npm test
npm run lint
git diff --check
```

## Deployment

Production deployment is handled through the repository's GitHub Actions / Cloudflare workflow. The repository instructions in `AGENTS.md` are authoritative for contribution, validation, and deployment requirements.

Pushes to `main` and `ux-v2` run the full validation gate and, when successful, apply remote D1 migrations, deploy the Cloudflare Worker, and run production smoke tests. Pull requests targeting either branch run validation only.

Do not deploy through ChatGPT Sites.

## Project documentation

`README.md` is intentionally a **current-state overview**, not a chronological implementation log. Historical hero-by-hero milestones, intermediate completion counts, completed UI task briefs, artwork intake notes, and old “next hero” instructions should not be re-added here.

Detailed current work belongs in `HANDOVER.md` and `ROADMAP.md`. Stable rule/reference material belongs under `docs/`.
