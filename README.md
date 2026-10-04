A web implementation of the **WTK Standard** ruleset, built around authoritative server-side game state and semantic capability-driven actions.

## Current stage — UX2.0UI-20 Final UX V2 Integration & Release Gate — 2026-10-03

UI-20 has completed the final contract ledger for the accepted C1–C7 and
UI-01–UI-19 boundaries. The ledger records 14 PASS rows, one intentionally
reserved N/A row for durable per-counter Reaction Chain history, and no
unacknowledged functional GAP. See
[`docs/UX_V2_RELEASE_GATE.md`](docs/UX_V2_RELEASE_GATE.md) for the named
authorities and retained proofs.

UX V2 is a **Feature Complete candidate pending the CI gate and reviewer
confirmation**. This status is not a claim that the whole game, all content,
touch-device certification, full WCAG auditing, subjective art direction, or
production deployment is complete.

### Local Hand navigation

The local Hand stays in one row with 68×102px cards. Spacing compresses to a
30px exposed step; when that no longer fits, native horizontal touch/trackpad
scrolling and focused arrow-key navigation reach the remaining cards. Tapping
an edge card reveals that same physical card, retaining its upward selection
and information control. Panning does not select or submit a card.

Browser coverage exercises 5/10/15/20/25/30 cards at 1440/650/480px, including
both ends of the Hand, native touch pan versus tap, and preserved Dock control
hits. This is browser evidence, not real-device touch certification. Semantic
viewport anchoring across authoritative card additions/removals remains a
separate follow-up.

### UX2.0VIS-05B — Side Column central safe zone — 2026-10-04

For 5–10 players, a transparent positioned container now owns the central
Interaction Stage geometry. Its edges follow the accepted side-seat track,
inset and thumbnail width with an 8px inward clearance budget. The Stage uses
normal flow inside that container, without the legacy viewport-centred
absolute translation. Existing Stage content, Hero Focus, Reaction Chain,
Dying handoff, seat dimensions/mapping, Top Row and local controls are unchanged.
Focused Chromium coverage checks the 6-player interaction/Negation/Dying/group
states and dense 10-player interaction/Negation states at 1440, 650 and 480px,
including every visible Stage/seat descendant and real seat hit targets.
`tests/browser/layout.config.mjs` supports fixture-only layout checks without
starting the Worker/D1; the complete CI configuration remains unchanged.
These checks are not touch-device certification or reviewer acceptance.

### UX2.0VIS-05C — Side Column participant hierarchy — 2026-10-04

Side Column now uses the existing proven viewer projection for a distinct
external Medium Source above the Large primary Hero Focus. The relationship
is vertical; the viewer is never duplicated centrally. Primary portraits use
90x113, 72x90 and 64x80 at desktop/650px/480px; source portraits are smaller.
Semantic selection, unknown/ambiguous fail-closed behavior, Reaction/Dying,
seat geometry, Top Row and private local controls remain unchanged. Browser
regressions verify identities, dimensions, hierarchy and safe-zone containment;
these are implementation evidence, not human visual acceptance.

### UX2.0VIS-07A — neutral Group target-scope density — 2026-10-04

During a proven Group resolution, original external target identities now
appear as neutral secondary cards: medium for small scopes and compact for
4+ external targets. The authoritative primary remains visually dominant;
viewer, primary and already-rendered source are not duplicated. The label
"Original target scope" explicitly denotes historical membership, not current
eligibility. No completed/pending/outcome/order or progress is inferred.
Nested non-Group stages remain unchanged. Public Group progress is deferred
until a separately accepted server-owned contract exists. Focused tests cover
neutral identity/density guards and 4/6/10-player responsive containment.

### BUG-ZHANG-LIAO-ASSAULT-01 — Draw Phase Assault UI fix — 2026-10-03

The real API-backed Draw Phase fixture now keeps the authoritative Assault
`CurrentAction` (including its action revision and one/two legal target
projection) unchanged until the player confirms. The defect was in the shared
operation console: a late card presentation could keep `presentationBusy`
true after local targets were selected, which hid or disabled Confirm; clicking
the active hero skill again also cleared that local target selection. Active
target selection now retains its Confirm/Cancel surface while the same server
action is current, repeated skill clicks do not ambiguously cancel it, and
multi-target Assault submits `{ providerId: "zhang_liao_assault", targetIds }`.
Explicit Cancel remains local and sends no gameplay action. Server-side target,
revision, and replacement authority is unchanged. Coverage includes the real
Worker/D1 API fixture, mounted late-presentation regression, and Playwright
browser flow for one target, two targets, Cancel/reactivation, and exact
submission payload.

C7 is reviewer-accepted and closed: the server-owned `PresentationSnapshot`
remains the atomic, fail-closed public authority, with source-owned
`attack_targeted` proof requiring the exact `ATTACK_RESPONSE` source/target/
resolver relationship. `SPECIAL`, settlement, and transition occurrences
remain reserved; `presentationV2` and Pending compatibility projections remain
available to the existing UI.

UI-04 refines that consumer into a concise semantic focus summary. The
underlying `InteractionStageView` retains the full public identity and
continuity model, while a pure display model prioritises stage/effect, source,
and current participant/active target context. Current participant and active
target scopes are shown only as proven facts; no ordinal progress is inferred
from array order or length because no accepted authoritative progress field
exists. Decision ownership remains
explicit for CHOICE; source-owned resolver and child-frame context appear only
when useful; redundant original-target and resolver detail is demoted. REST,
controls, target selection, dialogs, timers, animation, seats, dock, gameplay,
and the final visual Interaction Stage redesign remain unchanged. The next
milestone is a separately bounded readability or focus slice, not a board
redesign.

UI-05 adds presentation-only interaction-role highlights to the existing
opponent seats and the existing local hero/player dock surface. The pure role
projection reads only the accepted `PresentationClientView`: source,
original/active target, current participant, decision actor, active resolver,
and the local viewer marker. Dedicated seat/dock classes and data attributes do
not change target legality, click behavior, local amber selection, turn/
defeated state, dock composition, seat topology, or dimensions. Hero Focus,
final seat topology, and control migration remain future work.

UI-06 adds a compact, read-only Hero Focus inside the existing Interaction
Stage. Its pure `HeroFocusView` selects the current participant first, or the
sole active target when no current participant is proven; ambiguous multi-target
states remain unfocused. Source and decision ownership stay separate, CHILD_FRAME
context remains proven context, and public hero/name/HP decoration is resolved
only after semantic ID selection. REST, private cards, controls, target
selection, seat/dock topology, animation, and the full Hero Focus redesign
remain unchanged. The next milestone is a separately bounded presentation
slice, not a gameplay or topology migration.

UI-07 makes the existing deferred target-selection boundary explicit in the
client. Normal card targeting (including Sky-Piercing Halberd multi-target
Attack), active hero-skill targets, trigger/response targets, and Serpent Spear
targets remain local amber selections until the existing Confirm submission is
pressed. Cancel now clears the complete active local selection for the flow:
normal card/conversion choice, Halberd targets, Serpent Spear cost cards and
mode, active-skill card/target state, or trigger provider/input state. It sends
no gameplay, Skip, or Decline action; existing click order is preserved in the
Halberd and generic trigger payloads. Existing provider-owned Cancel controls
remain the single surface where they already own complete cancellation. Public
Interaction Stage/Hero Focus roles remain derived only from the server
presentation projection, so local selection does not create public roles.

UI-08 extends that local boundary to Borrowed Sword's forced-Attack target:
eligible seat clicks remain unsubmitted until Confirm, while Cancel clears the
local target and sends no action. Confirm preserves the existing
`choose_borrowed_sword_target` action and `{ targetId }` payload exactly once;
server-projected `eligibleTargetIds` remain the only target authority, and an
authoritative action revision or eligibility change clears stale local choice.
UI-09 closed the private target-card picker boundary without changing server
rules or payloads. Dismantle/Steal target-card continuations now keep the
opaque hand/equipment/Judgement selection local until Confirm; Cancel clears
only local picker state. Semantic `target_cards` trigger pickers retain their
existing `eligibleKeys` and Confirm payload, gain a local Cancel where no
provider-owned cancel already exists, and keep Skip/Decline separate. Hidden
hand choices remain `?`/opaque keys; public PresentationSnapshot,
InteractionStage, Hero Focus, seat roles and timeline text do not receive the
local selection. Action-revision and live eligibility changes clear stale
choices.

UI-10-FIX1 makes the existing local operation console consume the pure
`buildConsoleDecisionDisplay` result for the actual footer controls. The model
consumes only CurrentAction-authorized control facts and viewer-local selection
summaries; it selects the single rendered primary by ID, and gates local
Cancel plus authoritative Skip/Decline by the same coherent authority result.
Stale legacy booleans cannot expose a footer primary, and equal-priority or
incoherent states fail closed. Dialog-owned submissions (target-card,
target-card triggers, Harvest, private distribution, deck reorder, and
mandatory choices) remain their sole submit surfaces and are not duplicated in
the footer. Existing action names, payloads, server legality,
hand/equipment composition, and board topology remain unchanged.
PresentationSnapshot, Interaction Stage, and Hero Focus remain descriptive
only; they do not grant controls. Touch-width wrapping is limited to the
existing console. UI-10-FIX1 is accepted and closed.

UI-11 hardens the existing responsive geometry without redesigning the board.
The rendered `GameRoom` now exposes a deterministic topology contract: 2–4
players retain the established top-row relative seat classes, while 5–10 use
the established side-column grid in relative DOM order. Every supported count
renders exactly N−1 opponent anchors plus one persistent local dock anchor;
semantic Interaction Stage/Hero Focus classes decorate those anchors without
moving or replacing them. At the <=650px and <=480px boundaries, the stage and
Hero Focus text wrap safely, the side-column cards stay contained, the local
hand rail retains its physical-card contract (including the larger-hand
navigation described above), and the existing
footer console wraps in place. Dialogs remain dialog-owned with bounded scroll;
no gameplay, payload, legality, projector, snapshot, or visibility behavior
changed.

UI-11 is proven by deterministic SSR DOM/style contracts and the full fast/API
validation suite. This checkout has no browser/screenshot harness, so
pixel-level desktop/650px/480px appearance remains a visual-only GAP for later
manual or browser validation.

UI-12 adds a strictly local, read-only scope preview for Oath of the Peach
Garden, Bumper Harvest, Barbarian Invasion, and Raining Arrows. A selected
legal card decorates only the already-public recipients calculated by the same
living-player/turn-order rules used by the play route: Oath previews wounded
living characters, Bumper Harvest every living character, and the two group
attacks every other living character. Preview is not an event or resolution:
it creates no target selection, no Confirm, no public semantic role, and no
action before Play. Play retains its existing `{ cardId }` payload; server
participant order and subsequent PresentationSnapshot remain authoritative.
The distinct teal dashed decoration clears on deselection, busy presentation,
or a changed authoritative action. No conditional/immune recipient exclusion
exists in the current four supported group play paths; other multi-target
effects such as Sky Piercing Halberd remain explicit target selection.

UI-13 closes the Duel response focus and handoff regression. Alternating Duel
responses now persist the existing causal frame and checkpoint while the server
continuation advances the current participant, decision actor, and resolver;
the public projector exposes those proven roles equally to every viewer, while
CurrentAction keeps private cards and controls with the acting seat. Mounted
GameRoom coverage proves stable seat anchors, semantic Hero Focus, local
revision cleanup on handoff, legacy-field resistance, and no client-derived
next responder. Duel failure enters the existing DAMAGE child frame, preserves
the parent Duel context through Dying, and clears the child after Peach rescue.
No new protocol, rule, projector authority, or client sequencing was added.

UI-14 hardens the existing Judgement/replacement presentation contract without
changing rules, actions, payloads, or visibility. Engine-backed regressions cover
Lightning, Overindulgence, and Rations Depleted initial checkpoints, Sima Yi
replacement options, viewer-equal public source/subject/focus roles, public
revealed-card identity, exact `cardIds` submission, stale actor/revision cleanup,
causal checkpoint/frame continuity, root clear, and malformed-authority fail
closed behavior. Mounted GameRoom coverage confirms replacement selection stays
local until Confirm and that legacy owner/turn fields cannot grant controls or
move Hero Focus. Rations Depleted is exercised only as a direct test fixture;
the active new-game deck remains WTK Standard.

UI-15 adds a compact, read-only Reaction Chain within the existing Interaction
Stage for a proven `NEGATION` scene. It renders only the causally proven root
effect/source/original targets and one current response window, so its public
content is viewer-equal and no provider, card candidate, `CurrentAction`,
timeline, `actionPlayerId`, resolution ID, or revision becomes chain authority.
Counter-Negation advances the existing same causal frame and preserves the
original root; Group and Duel resume through their existing continuations.
Declines create no public pass node. Private response selection and the exact
existing `respond` payload remain in the local console until Confirm, while
Skip remains authoritative. The snapshot has no durable, independently proven
per-counter contributor history, so UI-15 intentionally shows a bounded root
plus active node rather than inventing nested history; that is the remaining
Reaction Chain GAP.

UI-16 hardens the existing Dying/Peach handoff inside the Interaction Stage.
The proven public `currentParticipantId` is presented as the DYING PLAYER and
the proven `CHOICE` actor/resolver is shown as the current rescue decision;
child Damage/Duel context remains a compact `CHILD_FRAME` relation. The new
handoff is viewer-equal and read-only: it contains no hand card, provider,
CurrentAction, rescue-order, timer, or terminal prediction. The local console
alone consumes the existing `give_peach`, `skip_rescue`, and trigger/provider
capabilities. Peach selection remains local until the existing submit boundary,
while actor/revision changes clear stale controls and public focus continues to
follow the server snapshot. No Dying rule, rescue order, action, payload,
projector authority, seat topology, or animation contract changed. Engine/API
fixtures already cover root and Duel child rescue, handoff, recovery/resume,
terminal settlement, and viewer privacy; mounted coverage covers the player-
facing boundary. Pixel-level responsive appearance remains the existing
browser/manual GAP.

UI-17 adds a pure `buildPresentationTransition(previous, next)` classifier
over consecutive accepted `PresentationClientView` snapshots. It is strictly
semantic: `INTERACTION_TRANSITION` outranks `FRAME_TRANSITION`, which outranks
`FOCUS_UPDATE`, `CONTENT_UPDATE`, and `NONE`; interaction, frame/parent
continuity, public focus, and checkpoint identities are the only authorities.
The existing `GameRoom` and Interaction Stage expose the bounded result through
`data-presentation-transition` without adding CSS animation, timers, gameplay
side effects, server history, or client legality. REST boundaries and malformed
or unproven pairs fail closed, while private CurrentAction/options, timeline,
turn/action-player, HP, and compatibility fields cannot promote a transition.
Animation is explicitly not implemented in UI-17.

UI-18 consumes that accepted semantic hook with restrained, non-blocking
feedback inside the existing Interaction Stage. `CONTENT_UPDATE` uses a 180ms
stage border refresh, `FOCUS_UPDATE` uses a 240ms stage/hero-focus emphasis,
`FRAME_TRANSITION` uses a 280ms frame emphasis, and
`INTERACTION_TRANSITION` uses a 320ms stage emphasis. `NONE` remains visually
stable. These effects change only border and shadow inside the existing stage;
they do not move seats, the local dock, the hand, controls, or the table, and
they never delay gameplay or mutate authority. `prefers-reduced-motion: reduce`
removes the keyframes while preserving the same semantic markup and labels.
The focused DOM/CSS contract covers kind mapping, viewer-equal markers,
repeated `NONE`, fixed topology, private/legacy isolation, control usability,
and reduced-motion behavior. Pixel-level browser appearance remains a manual
GAP.

UI-19 adds a real Chromium browser validation harness at
`tests/browser/ui19.spec.mjs`, launched with `npm run test:browser`. The
test-only Vite fixture mounts the existing `GameRoom` and consumes the existing
`PresentationSnapshot`/`CurrentAction` contracts; it does not add a production
route, gameplay shortcut, or authority path. The executed matrix contains 17
tests: 10 layout cases (1440x900 with 2/4/6/10 players, 650x900 with 4/6/10,
and 480x900 with 4/6/10) plus seven semantic/accessibility cases covering
Interaction Stage/Hero Focus, multi-target preview, Duel response, Negation
Reaction Chain, Dying/Peach handoff, retained target-card picker, and reduced
motion/native focus.
Assertions cover anchor counts and topology, visible local dock/hand/console,
horizontal overflow, severe seat overlap, bounded semantic labels, public AOE
preview recipients, non-NONE transition markers, reduced-motion animation
removal, pointer access, keyboard focus, and a picker dialog bounded to the
480px viewport with a scroll-safe card row. CI installs Chromium with
`npx playwright install --with-deps chromium` before this suite. This proves
the listed DOM/geometry/accessibility behavior only; it is not a full WCAG
audit, screenshot/pixel comparison, or touch/device certification.

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
