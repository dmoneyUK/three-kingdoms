# Three Kingdoms

## Hero-selection live-selector fix — 2026-09-23

Fixed the Test Controller/Lord selection path so `choose_hero` authorizes the
freshly loaded current selector and reads and locks that same player's current
candidate pool. This accepts any hero in the current selector's displayed
options, including Liu Bei, without consulting the complete hero catalogue or
changing hero allocation, role privacy, or gameplay rules. Stale and race
failures now return a fresh room projection where applicable; the client action
context was intentionally left unchanged.

API coverage now selects displayed Liu Bei, displayed last candidates, and
unavailable candidates, verifies private non-Lord projections, completion into
playing, and mixed real-player/Test Controller authorization. Local validation
passes: 38 fast tests, 106 API tests, build, lint, and diff check.

Current stage: Stage 7 product polish, hero-selection reliability fix complete.
The next milestone is the GitHub Actions validation and Cloudflare deployment
of this server-side correction.

## Opponent hero artwork and mobile portrait repair — 2026-09-23

Repaired the missing opponent artwork path without changing gameplay. The
checked-in Zhang Liao portrait was an undecodable JPEG; it is now a valid
2:3 portrait, and original project artwork now covers Zhang Fei and Zhen Ji.
All 19 implemented Standard hero IDs are covered by an explicit render audit:
eight have checked-in artwork and the other 11 retain the intentional initials
fallback until approved assets exist. Every mapped hero continues to resolve
through the single shared `HERO_ART_BY_ID` / `HeroPortrait` renderer.

Opponent portrait sizing no longer collapses into the shallow mobile track.
The shared opponent portrait container uses a non-shrinking 4:3 artwork region
that is about 65–78px high at the target mobile width, so mapped artwork
remains visible without changing player state, targeting, projection, or any
gameplay action contract. Render coverage also protects the mapping boundary,
checked-in assets, fallback behavior, shared rendering, and mobile CSS.

The host-seat API regression is deterministic again: its temporary Yue Jin
metadata rehydration mutation is restored to the original Lord candidate pool
before the normal four-seat selection flow continues. Yue Jin gameplay remains
covered by the isolated Dauntless API tests; no production selection or
gameplay rule changed. Local build, full tests, lint, and diff-check all pass.

Current stage: Stage 7 product polish, opponent hero artwork repair complete.
Production review is complete at approximately 320px, 390px, and 430px. The
mapped Sima Yi, Zhen Ji, Zhang Fei, and Cao Cao views render correctly, the
unmapped initials fallback remains readable, and no horizontal or opponent
panel overflow was observed. GitHub Actions run 35897749357 passed both
build-and-test and the Deploy to Cloudflare job. The next milestone is final
graphic/theme polish and separately approved artwork intake for any remaining
fallback heroes.

## Final hero selection card correction — 2026-09-23

Completed the follow-up General Selection correction from the replaced mobile
specification. Candidate cards now use a content-first responsive layout with a
near-2:3 portrait proportion, a growing artwork track, compact name/HP/skill
rows, and no auto-margin gap before the SELECTED/CHOOSE state. Selection-only
artwork uses `object-fit: cover` with top framing, so portraits fill the card
without the dark side bars from the intermediate `contain` treatment.

The mobile and tablet confirmation rail now matches the hero grid width, the
centred 3+2 Lord layout remains intact, normal vertical scrolling is allowed,
and Zhang Liao now resolves through the shared `HeroPortrait` mapping. Zhou Yu
continues to use the initials fallback until an approved asset exists. Role
privacy, candidate allocation, Quick Test behavior, information dialogs, and
the existing `choose_hero` contract are unchanged.

Current stage: Stage 7 product polish, final hero-selection card correction
complete. The next milestone is deployed review at 390px, 430px, and 768px,
followed by final graphic/theme polish.

## Hero selection portrait readability refinement — 2026-09-23

Refined the mobile General Selection redesign after deployed review. Candidate
cards now reserve a larger selection-only portrait area, keep the faction and
information controls clear of the artwork, and use the dynamic mobile viewport
height. The <=900px breakpoint also gives the portrait an explicit height so
tablet card metadata cannot collapse it. The available-width six-track grid
still renders three cards per row, centres the Lord's second pair, and leaves
confirmation in normal vertical flow so readable artwork is preferred over
compressing the page.

This remains presentation-only: hero allocation, role privacy, candidate
counts, information dialogs, Quick Test perspective, shared `HeroPortrait`
mapping, and the existing `choose_hero` contract are unchanged.

Current stage: Stage 7 product polish, mobile hero-selection portrait
readability refinement complete. The next milestone is deployed review at
390px, 430px, and 768px, followed by final graphic/theme polish.

## Hero selection portrait redesign — 2026-09-23

The mobile General Selection page now gives each hero a proper portrait-card
silhouette with a substantially larger artwork area. Selection artwork uses
its own non-destructive framing rule, so the supplied character illustrations
remain recognisable instead of being compressed into a shallow 54px strip.
The Lord layout remains three cards plus a centred pair, the grid uses more of
the available phone width, and normal vertical scrolling is allowed when the
larger cards need more room. Selection state, private candidate data,
information dialogs, and the existing `choose_hero` contract are unchanged.

Current stage: Stage 7 product polish, mobile hero-selection portrait redesign
complete. The next milestone is deployed review at 390px, 430px, and 768px,
followed by final graphic/theme polish.

## Hero selection artwork sizing fix — 2026-09-23

Corrected the supplied hero artwork sizing in General Selection cards. The
image now anchors to the full portrait container instead of rendering only its
intrinsic-height strip. This is presentation-only; hero selection and artwork
mapping are unchanged.

## Supplied hero artwork skin — 2026-09-23

The five supplied hero images are now the shared artwork for Cao Cao, Liu Bei,
Sun Quan, Sima Yi, and Xiahou Dun. The same public assets render in private
General Selection cards, the locked-in selection state, the local hero card,
and opponent hero cards on the game board. Heroes without supplied artwork
retain the initials fallback, while the centre draw pile remains the ordinary
108-card game deck.

This is presentation-only: hero IDs, private projections, selection rules,
board targeting, and card-deck logic are unchanged. Render coverage checks the
asset files and cross-surface hero artwork paths.

Current stage: Stage 7 product polish, supplied hero artwork skin complete. The
next milestone is deployed mobile review, followed by final graphic/theme
polish.

## Yue Jin — Dauntless — 2026-09-23

Yue Jin is now implemented and included in the playable Standard hero
candidate allow-list through the canonical semantic `turn_end` event.
Normal Play completion, Discard completion, and Lu Meng Composure all enter
the same persisted turn-end continuation before the next living seat is
calculated. Dauntless privately offers Yue Jin exactly one eligible Basic card
from hand; the ending character is the automatic target and must choose one
equipped card when Equipment exists. Without Equipment, the cost is discarded
as a skill cost and the shared sourced-damage pipeline deals 1 damage with no
physical damage card. Nested Retaliation, Stauchness, Legacy, Treachery
exclusion, Dying/rescue, reload, stale CAS, and physical card conservation are
covered by Worker/D1 regressions.

Current stage: Stage 6 hero-capability execution — Yue Jin / Dauntless
complete. The next milestone is the next individually verified missing
Standard hero.

## Lobby start flow — 2026-09-23

Waiting Room no longer asks players to set a lobby-ready state. The host can
start the game as soon as 4–8 players have joined; the host-only start guard,
room limit, and below-four-player state remain unchanged. The Ready button and
Ready/Not Ready seat labels are removed, and the start control now says
`Start game`.

Current stage: Stage 7 product polish, lobby start-flow simplification
complete. The next milestone is deployed mobile review, followed by the final
graphic/theme skin.

## Compact mobile home and waiting-room viewport pass — 2026-09-22

The Home page and Waiting Room now use a deliberate compact mobile layout that
targets one normal iPhone portrait viewport. Mobile shells use `100dvh`, the
landing navigation is reduced to 60px, the Home hero and entry form use tighter
spacing and controls, and the four role cards remain on one row. The Waiting
Room uses a compact 58px top bar, a three-column seat grid that still renders
every `room.maxPlayers` seat, and a shared-width action row for test players
and Start/Need-more states. A two-column seat fallback is limited to
very narrow widths below 340px, and error states remain allowed to grow.

This is presentation-only: player/session state, room limits, seat rendering,
clipboard behavior, add-test-player behavior, start guards, polling, and all
other backend/game logic are unchanged. The compact rules are consolidated in
the existing responsive CSS instead of using a second override layer.

Current stage: Stage 7 product polish, mobile Home and Waiting Room viewport
fit complete. The next milestone is deployed review at 360px, 375px, 390px,
393px, and 430px, including the eight-seat lobby and short/keyboard states.

## Compact three-column General selection cards — 2026-09-22

The General Selection page now presents private candidates as compact portrait
cards using the normal 108:154 card ratio. On phone widths the grid uses three
normal-sized cards per row, so non-Lord selections fit on one row and Lord
selections use three cards plus a centred pair on the second row. Tablet cards
remain compact and centred, while desktop cards retain the larger card scale.
Each card keeps faction, portrait/monogram, name, HP, skill names, and
SELECTED/CHOOSE state, with a separate circular information button for the
existing full `HeroInfoDialog`.

Card selection and information viewing are separate presentation actions, and
confirmation still uses the unchanged `choose_hero` path. General allocation,
role privacy, selector sequencing, waiting state, and multiplayer behaviour
were not changed. The mobile confirm control is now in normal document flow so
it cannot cover the final candidate row.

Current stage: Stage 7 product polish, compact General selection sizing pass
complete. The next milestone remains deployed mobile review at 320px, 390px,
and 430px, followed by the final graphic/theme skin.

## Final mobile LocalPlayerDock structure — 2026-09-23

The presentation-only dock refinement is complete. Mobile keeps a narrow Hero
column and a full-width right-side dock whose top row contains equal-height
Status, Equipment, and Judgement panels; the Hand spans the right side below
them and the Action panel remains full width. Status is responsive and ordered
HP, hearts, Role. At <=480px the Hero column is 64px and the top panels use a
responsive 72–92px Status width; below 360px the Hero is 58px and Status 64px.

The Hero panel renders every name from `hero.skills`, including passive and
currently unavailable skills as disabled buttons. Existing semantic trigger
IDs and the Guan Yu/Zhao Yun response controls still own enablement and clicks;
React does not infer hero legality. Equipment has exactly four compact slots in
Weapon, Armour, +1 Horse, -1 Horse presentation order while retaining the
`defensiveHorse`/`offensiveHorse` semantic mapping. Empty slots show their
labels without a plus glyph; occupied slots show only the shared `CardFace`.
Judgement is a separate dynamic area with no fake empty slots.

Opponent summaries now show vertical `HP x/x`, heart icons, and `Hand cards: x`
lines; their equipped cards use the shared compact `CardFace` with suit/rank
graphics. The local Status panel is wider than before, Judgement reserves room
for two compact cards without fake slots, and Play/Skip/End controls use wider
touch targets. Hand placement measures the actual rail with `ResizeObserver`, distributes
cards across the available width when they fit, and applies only calculated
overlap. Selection keeps the same physical slot, reveals the full card above
the top panels, and moves the card plus centred info control as one visual
unit while remaining below the Action panel. Hand corner markers are smaller,
and all three visible opponent panels use a canonical portrait/card silhouette
without hiding their mini zones.

All LocalPlayerDock geometry remains consolidated in
`app/sequence-overrides.css`; no duplicate dock layout was restored to
`app/globals.css`. Focused render coverage verifies skill counts/names, the
three top panels, slot order/labels, dynamic Judgement spacing, selected-card
structure, smaller corners, portrait opponents, and Quick Test perspective switching. Gameplay rules, semantic
actions, private projections, equipment/Judgement behavior, and animation
events are unchanged.

Current stage: Stage 7 product polish, final dock structure and local responsive
review complete. The next milestone is deployed mobile review followed by the
final graphic/theme skin.

## Standard hero selection is implementation-gated — 2026-09-22

Hero selection now follows the implementation statuses in
`docs/STANDARD_HERO_REFERENCE.md`. New Standard games show and accept only
the 19 heroes whose complete skill sets are implemented. The full metadata
roster remains available for saved-room readability, but stale or forged
candidate lists cannot make an unimplemented hero selectable.

## Cao Cao Treachery during staged AOE — 2026-09-22

Cao Cao's Treachery now obtains damage-causing cards from either the discard
pile or an in-progress Group/AOE continuation. When the card is still staged,
it is removed from `heldCards` and added to Cao Cao's hand without cancelling
the remaining Barbarian Invasion or duplicating the card into discard.

Group continuations now separate `damageCards` (the physical card(s) that
caused the damage) from accumulating `heldCards` (the AOE card plus staged
Attack, Dodge, or Negation responses). Treachery therefore cannot take an
earlier response card. Regression coverage reproduces an earlier successful
Attack before Cao Cao and separately covers an earlier successful Negation;
both assert exact card conservation and normal completion of the remaining
AOE targets.

Group resolutions now carry a stable `sequenceStartCardId` independent of
physical staging, and `damage_suffered` validates card ownership and other
semantic selections before claiming the response. An invalid/stale Treachery
submission therefore leaves the exact response decision available for a
successful decline. Integration coverage includes the full four-player
Barbarian Invasion continuation, card conservation, normal Attack windows,
and the no-stranded-`resolving` safety case. The current stage remains Stage 6
hero-capability execution active; the next milestone is the next individually
verified missing Standard hero capability.

## Local dock refinement — 2026-09-22

The focused dock refinement keeps the hero identity visually primary while
compacting the four equipment slots and Judgement row. On narrow mobile
layouts the hero card is larger, the zone cards are fixed at 34×51px (half the
68×102px hand-card footprint), labels are smaller, and all five zone types
remain visible on one row without stretching across the dock.
The compact card buttons keep a small transparent hit-area expansion beyond
the visible face for mobile tapping.

The hand now renders each physical card once. Unselected cards retain their
full aspect ratio while their slot clips the lower half; a single selected
card stays in its original rail slot and rises to full height in place. Multi-
select modes remain compact and raised only modestly. Each info button belongs
to its own card slot, is hidden on an unselected peek card, and follows the
card into its lower half when it rises. Selected card faces keep their normal
surface with a gold border/glow only. Local equipment and Judgement slots now
reuse the shared CardFace artwork at the compact zone scale, while the
contextual prompt and buttons share a compact two-column action row.

The shared CardFace corner marker is also scaled down for the central discard
pile, keeping the same embedded top-left language without dominating the
small pile card. No gameplay, animation, response, equipment, Judgement, or
test-harness behavior changed. The next milestone remains Step 4: review the
deployed mobile UI before applying the final graphic/theme pass.

The final dock polish uses one identity/zones divider, keeps the equipment
information control visually small while retaining a touch-safe hit area, and
uses the same artwork-preserving gold-border selection language for equipment
costs. Selected-hand overlap remains bounded above the action row and does not
add dock height.

The hand and action controls now occupy explicit sibling regions in a
three-row dock grid. The hand has its own bounded, top-and-bottom-lined rail
(58px at the narrow-mobile breakpoint), while the opaque action row sits above
hand painting in the stack and keeps prompt text and buttons independent. A
single selected card may rise into the equipment row, but its bottom remains
above the action region, so selecting a card cannot cover the prompt or
buttons.

The mobile dock now uses a three-row, two-column structure in which the
identity column spans the zone and hand rows. The right column reserves a
56px compact five-slot equipment/Judgement strip above a 58px hand window;
the action row remains a 30px full-width region. Hand cards overlap
horizontally within the right column, larger hands scroll in the rail, and a
single selected card paints upward without enlarging its layout slot. A
narrower <=360px breakpoint scales only the compact zones and overlap so the
320px layout remains contained.

## DOM-aligned card animations — 2026-09-22

Step 3 aligns resolution presentation with the rendered game shell. The local
dock, each visible opponent panel, the local hand, and the central draw and
discard piles expose stable DOM anchors keyed by authoritative player/card
IDs. `TableResolutionSequence` measures those anchors relative to the actual
play table and uses them for card origins, player settlement stacks,
equipment, Judgement, and direct-discard destinations.

Measurements refresh through `ResizeObserver` for the table and active
source/destination anchors, so responsive layout changes do not reuse stale
page coordinates. The hidden circular Judgement/info overlays are removed;
the visible opponent mini-cards are now the flight destinations. Gameplay
state, event payloads, response logic, and Step 2 selection behavior are
unchanged.

The next milestone is Step 4: review the deployed mobile UI, then apply the
final graphic/theme pass. No graphic skin or official artwork is included in
this step.

## Compact local dock, peek hand, and centre piles — 2026-09-22

Step 2 keeps the Step 1 controlled-seat dock and compresses it into one player
area on portrait mobile. The hero/name/role/HP line shares space with the four
portrait-shaped equipment slots and Judgement stack. There is exactly one
private hand presentation: a layered peek rail keeps each physical card at its
normal aspect ratio while exposing roughly its top half; a selected single card
stays in its original rail slot and rises to full height without changing dock
height.
The JSX, keyboard, and screen-reader order is hand rail followed by the
contextual action row. Discard and
semantic/hero selection modes retain their existing state and controls;
multi-select cards remain in the rail with a modest lift and visible selection
state.

The central draw pile remains count-backed by `room.deckCount`. The discard pile
now uses the existing static `CardFace` for `visibleDiscardTop`, with no invented
discard count and a safe empty state. The pile z-order remains below opponent
panels, settled cards, active reveals, and dialogs.

The hero portrait is an image-ready neutral placeholder rather than official
card artwork; tapping it opens the existing private Hero Information dialog.

The board now shows the three opponents for a four-player room: relative seat
2 is high at the top, while relative seats 1 and 3 are explicitly translated
lower on the left and right. Targeting, distances, `myTableIndex`, Quick Test perspective switching,
semantic actions, and privacy projections are unchanged. The decorative board
ellipse was removed, while the central deck/discard play-center and existing
resolution animation geometry remain unchanged for the next layout pass.

Current stage: Step 3 plus the focused local dock refinement are complete.
Step 4 is next: review the deployed mobile UI, then implement the final
graphic/theme pass.

Test commands are split without reducing coverage: `npm run test:fast` runs
pure/unit/render tests without Wrangler, `npm run test:api` owns the API
Worker/D1 lifecycle, `npm run test:all` runs the production build plus both
suites, and `npm test` remains the complete alias. Both runners print elapsed
timing; the API runner also prints its ten slowest tests.

The API integration harness now lives in `tests/api/harness.mjs`, separate
from the eight concern-focused API test files under `tests/api/`. It owns
request/state helpers, fixture mutation and inspection, room setup, and
shared response settlement helpers; the 98 API assertions remain unchanged.

Ordinary API scenarios use the test-only, typed `seedPlayingGame` Worker
fixture instead of replaying lobby setup. Dedicated lobby, readiness, hero
selection, privacy, and persistence cases still exercise the real setup
workflow. `request` performs one action request; callers that intentionally
want provider inference or empty-decision progression use the explicit
`requestAndSettle` helper. The API suite runs four balanced, isolated shards;
each shard owns a Wrangler process, port, and temporary D1 directory.

## Negation reaction UX — 2026-09-21

Stratagems now open a public Negation waiting state before their effects
settle. The public projection identifies only the effect and target, such as
“Waiting for Negation · Barbarian Invasion's effect on Guan Yu”; it never
reveals which seats were checked, skipped, or found without a response.

Eligibility is capability-based through the shared semantic response-provider
registry, so physical Negation cards, legal conversions, and future hero
providers can use the same window. Ineligible seats are advanced silently;
eligible seats receive the private Negation/Pass decision, an expired or
disconnected decision advances as a silent Pass, and a played Negation creates
the next public card event and counter-window. Only after the chain finishes
does the normal target Attack/Dodge response open. The same privacy boundary
applies to ordinary multiplayer and Quick Test/shared-controller views.

Regression coverage now includes empty windows, target and non-target
capabilities, reaction order, hidden skip state, chained Negation, capability
providers, timeout advancement, AOE cancellation, and the subsequent target
response. The current stage remains Stage 6 hero-capability execution active;
the next milestone is the next individually verified Standard hero capability.

## Hero-selection role visibility — 2026-09-21

The Standard hero-selection screen now clearly shows the effective viewer's
private role before a general is chosen. This includes Quick Test: when the
controller switches seats, the role banner follows that seat's projected
`myRole`; it does not reveal any other player's hidden role. The canonical
Standard setup and private candidate projection are unchanged. The next
milestone remains the next individually verified Standard hero capability.

## Guo Jia — Jealousy of God + Legacy — 2026-09-21

Guo Jia is implemented through the semantic trigger architecture. Jealousy of
God opens after the final Judgment card is established and its result is fixed,
after any Necromancy replacement but before the card's normal destination. The
persisted continuation holds that exact physical card until Guo Jia accepts or
declines; accepted replacement cards move to Guo Jia's hand without duplication.

Legacy uses a reusable per-damage-point continuation: a 2-damage event remains
one HP/Dying event but creates two independent optional Legacy opportunities.
Each accepted opportunity privately holds the next two deck cards and lets Guo
Jia assign them atomically, one card at a time, to any living character. The
source is optional, so the same path covers Lightning's source-less damage.
Reload, stale decisions, private projections, Bared Bodied, Judgement
replacement, and exact card conservation are covered by Worker/D1 regressions.

The current stage is Stage 6 hero-capability execution complete for Guo Jia's
three-step round. The next milestone is the next individually verified missing
Standard hero, with the semantic `currentAction` protocol and Quick Test
privacy preserved.

Dying/rescue preserves a damage continuation only when a post-damage reaction
or nested continuation is pending; ordinary Dying resolution remains unchanged.

## Liu Bei — Benevolence + Influencing — 2026-09-21

Liu Bei is complete through the semantic response architecture. Benevolence
transfers exact hand cards, counts repeated gifts cumulatively across recipients,
recovers once when the two-card threshold is reached, and spends that threshold
even when Liu Bei is already at full HP. Influencing is Lord-only and keeps the
semantic attacker/requester (Liu Bei) separate from the Shu provider who pays
the Attack cost. Physical Attack, God of War, Braveheart, and Serpent Spear
providers reuse the normal Attack pipeline, including Duel, Borrowed Sword,
range, equipment, damage, Dying, privacy, stale safety, and Attack-use history.

The next milestone is the next individually verified missing Standard hero.

## Xu Zhu Bared Bodied — 2026-09-21

Xu Zhu's optional Bared Bodied decision now opens only at the canonical normal
Draw Phase boundary, after delayed Judgements. It uses the shared semantic
`trigger` / `decline_trigger` protocol and the reusable Draw Phase modifier
outcome: accepting draws one fewer card than the normal amount and stores a
turn-scoped flag, while declining preserves the normal two-card draw.

The central sourced-damage boundary applies the active flag only to damage
whose semantic cause is an Attack or Duel and whose source is Xu Zhu. The
bonus is folded into the single damage event before HP, post-damage triggers,
and Dying are resolved; group, judgement, equipment-forced, and other damage
remain unchanged. API coverage includes decline/accept, reload and stale
safety, Attack and Duel source ownership, Dying, and next-turn reset. The next
milestone is the next individually verified missing Standard hero.

## Zhang Liao Assault — 2026-09-21

Zhang Liao's optional Assault now opens only at the canonical normal Draw Phase
boundary, after delayed Judgements. It uses the shared semantic `trigger` /
`decline_trigger` protocol and a reusable Draw Phase outcome distinction:
Zhou Yu's Heroic remains a normal-draw modifier, while Assault is a replacement
that transfers one server-selected opaque hand card from each of one or two
eligible living characters. The deck is not drawn when Assault is accepted;
declining draws the normal two cards.

Target IDs are projected without hand contents, revalidated for aliveness,
non-self ownership, non-empty hands, uniqueness, and the two-target limit, and
settled as exact physical transfers. Zhang Liao sees each received card only
after ownership changes; public history names the source characters but never
reveals card identity. API coverage includes decline, one/two targets, invalid
targets, privacy, reload/stale safety, no eligible targets, conservation, and
delayed-Judgement ordering. The next milestone is the next individually
verified missing Standard hero.

## Standard hero reconciliation — 2026-09-21

Existing player-facing hero skills now use the printed English names from
`docs/STANDARD_HERO_REFERENCE.md` while persisted provider/effect IDs remain
unchanged. Composure uses generic turn history to track every semantic Attack
produced during the current turn, including physical, virtual, and response
Attack paths. At the normal Play-to-Discard boundary, it offers the optional
canonical Discard Phase decision only when the hand actually exceeds current
HP; accepting skips Discard and declining follows the ordinary hand limit.
Influencing now has an active Play Phase path: Liu Bei selects an in-range
target, asks living Shu characters in action order, and any willing delegate
enters the normal Attack pipeline with Liu Bei as semantic source while paying
only the provider cost. Physical Attack, God of War, Braveheart, and Serpent
Spear materials are supported; all-decline recovery leaves Liu Bei's normal
Attack allowance available. Equilibrium now projects Hand and Equipment cards,
removes selected Equipment from its zone, discards the exact physical cards,
and draws one replacement per discarded card. Ambushment remains hand-scoped
under Standard use/play zone rules and still uses the shared Burning Bridges
Negation and target-card pipeline.

API regressions cover canonical projected labels, Composure accept/decline,
Dodged and lethal Attack blocking, no-discard boundaries, reload/stale safety,
and turn reset behavior, alongside Influencing range/order/privacy/settlement
and Equilibrium card conservation. The next milestone remains the next
individually verified missing Standard hero, with semantic currentAction,
Quick Test privacy, stale safety, and exact card conservation preserved.

## Hosted games and test-player flow — 2026-09-21

The landing page now has one product path: enter a player name and choose
Host Game, or enter a room code and choose Join Game. The separate Quick Game
and visible Rejoin game controls are gone. A saved room/token is resumed
automatically when valid, while a stale session is cleared and returns to the
normal landing form; submitting Join Game for that same saved room also tries
the existing session before creating a new seat.

Normal game flow is Host Game → lobby → real players Join Game → Start Game.
Test game flow is Host Game → lobby → Add Test Players → Start Game. The
host-only test-player action fills the room to four seats and names generated
seats by position. The shared-controller implementation
remains available only for seats owned by the host token, including mixed
human/test rooms; another human's private hand, role, hero choice, and action
are never projected through the host view. Production no longer accepts the
separate `quickStart` create path.

The current stage remains Stage 6 hero-capability execution complete. The next
milestone is the next individually verified Standard hero capability, while
preserving canonical semantic decisions, hosted test-seat privacy, and exact
card conservation.

## Gan Ning Qixi browser contract repair — 2026-09-21

Gan Ning's Qixi now follows the real `currentAction` client contract for
black hand-card selection and target selection. The browser no longer shares
Serpent Spear's local card state with active hero skills; Qixi selection is
keyed to the current action revision and effect ID, and its submission is
derived from the same server-projected option that enabled the button. The
room normalizer preserves card-option `targetIds`, fixing the production K♣
Borrowed Sword stale-selection failure.

Qixi targets are projected server-side only when a living opponent has at
least one affectable hand, equipment, or Judgement card. All pre-claim Qixi
checks run before entering `resolving`, with deterministic recovery retained
for impossible post-claim failures. Qixi continues through the ordinary
Burning Bridges Negation and shared target-card picker pipeline. Normal
multiplayer and Quick Test interaction-contract coverage now passes in the
full 110-test suite.

The current stage remains Stage 6 hero-capability execution complete. The next
milestone is the next individually verified Standard hero capability, while
preserving canonical semantic decisions, Quick Test privacy, and exact card
conservation.

## CardFace shield scale audit — 2026-09-21

The shared rank/suit shield now has explicit physical-size variants for every
`CardFace` surface instead of inheriting one fixed size. The centre reveal is
34×46, hand and private-draw shields are 27×38, settled cards are 13×18
(12×17 below 480px), and picker, harvest, discard, sequence, and graphical
judgement cards each use smaller proportional dimensions. Permanent equipment
and judgement zones remain compact rank+suit text rather than gaining a large
shield. Red shields keep their dark filled pointed shape but no longer draw a
visible red border. This remains a presentation-only change.

The current stage remains Stage 6 hero-capability execution complete. The next
milestone is the next individually verified Standard hero capability, while
preserving the canonical semantic response protocol and Quick Test privacy.

## Xiahou Dun Stauchness private discard choice — 2026-09-21

Mandatory own-hand choices now resolve eligible `hand:N` keys against the
acting player's private `myHand` projection and render those cards with the
shared card-face UI. Xiahou Dun's Stauchness discard-two choice therefore shows
the real card name, suit, rank, artwork, and selected state while preserving the
existing submitted hand keys and server resolution. Opponent-hand selections
through `TargetCardPicker` remain concealed. Rendered coverage now verifies
Stauchness with Dodge 7♠ and Peach Q♥, Yin-Yang Swords own-hand presentation,
and opponent privacy; the full Worker/D1 suite passes 105 tests.

The current stage remains Stage 6 hero-capability execution complete. The next
milestone is the next individually verified Standard hero capability, while
preserving the canonical semantic response protocol and Quick Test privacy.

## Responsive rank/suit shield variants — 2026-09-21

Rank and suit shields are now embedded against the top-left edge of hand and
normal revealed cards. Private draws use an explicit hand-scale shield, while
settled or equipped table cards use compact 20×28 shields, reducing to 18×25
at the smallest breakpoint so the miniature card artwork remains visible.
Red and black suit contrast is preserved. This is a presentation-only change;
card data, rules, and the semantic gameplay protocol are unchanged.

The current stage remains Stage 6 hero-capability execution complete. The next
milestone is the next individually verified Standard hero capability, while
preserving the canonical semantic response protocol and Quick Test privacy.

## Visible suit card graphics — 2026-09-21

Hand cards and revealed card graphics now show the rank and suit together in a
slim pointed corner shield that matches the reference card design. Red suits
use a red outlined shield, while black suits use a light shield with dark
symbols so suit identity remains readable without covering the artwork.

The current stage remains Stage 6 hero-capability execution complete. The next
milestone is the next individually verified Standard hero capability, while
preserving the canonical semantic response protocol and Quick Test privacy.

## Standard hero card metadata — 2026-09-21

All 30 selectable Standard hero cards now use the printed skill names and
descriptions recorded in `docs/STANDARD_HERO_REFERENCE.md`. Candidate data is
also rehydrated from the canonical hero IDs when rooms are read, so existing
hero-selection rooms do not keep stale persisted names or descriptions. This
reconciles the previously coarse or placeholder cards, including the official
printed names for Xu Zhu, Lv Meng, and Lv Bu. This is a presentation and
metadata update only; unimplemented hero mechanics remain clearly documented
as such.

The current stage remains Stage 6 hero-capability execution complete. The next
milestone is the next individually verified Standard hero capability, while
preserving the canonical semantic response protocol and Quick Test privacy.

## Private draw card sizing — 2026-09-21

The private opening-hand reveal now uses the same responsive card dimensions,
typography, padding, and overlapping layout as the normal drawing hand. Four
cards remain visible together on narrow screens without the centre cards being
stretched or oversized.

The current stage remains Stage 6 hero-capability execution complete. The next
milestone is the next individually verified Standard hero capability, while
preserving the canonical semantic response protocol and Quick Test privacy.
## Clear selection states — 2026-09-21

Selected cards, heroes, player targets, equipment costs, and response-picker
items now use one high-contrast selection treatment: a bright wide outline,
gold glow, lifted position, and stronger selected background. This keeps the
selected object obvious across the hand, hero-selection screen, target board,
and semantic response pickers without changing the underlying action rules.

The current stage remains Stage 6 hero-capability execution complete. The next
milestone is the next individually verified Standard hero capability, while
preserving the canonical semantic response protocol and Quick Test privacy.

## Lu Xun Modesty — 2026-09-21

Lu Xun now exposes the official Standard skill metadata: Modesty and Second
Wind. This step implements Modesty as a shared semantic target-legality
capability: Lu Xun cannot be targeted by Steal or Overindulgence, while Duel,
Burning Bridges, and unrelated targets remain legal. The server rejects an
illegal target before card consumption, discard, Negation, or Judgement Zone
mutation, and the client hides Lu Xun as a clickable target for those cards.
Second Wind is a private semantic `hand_lost` trigger: it opens only after a
non-empty Lu Xun hand becomes empty, draws exactly one card on acceptance, and
restores the interrupted continuation on decline.

The current stage remains Stage 6 hero-capability execution, with Lu Xun's
Modesty and Second Wind verified through API regressions. The next milestone is the next
individually scoped Standard hero capability, preserving the canonical
semantic response protocol and Quick Game privacy.

## Private opening-hand presentation — 2026-09-21

Each player now receives four private opening-deal events, so their own
browser presents those cards in the centre as a private draw. The events are
filtered by player before projection and do not enter the public presentation
queue. Quick Game applies the same behavior to the currently projected human
seat. The first player waits for that private presentation, then the normal
Draw Phase automatically draws two more cards.

The current stage remains Stage 6 hero-capability execution complete for the
implemented Standard heroes. The next milestone is the next individually
verified Standard hero capability, preserving the canonical semantic response
protocol and Quick Test privacy.

## Public Judgement reveal timing — 2026-09-21

Public Judgement reveals now stay in the centre presentation for four seconds,
about two seconds longer than ordinary card reveals. The server marks delayed,
Luoshen, response, Guicai replacement, and Ganglie Judgement reveals with
shared presentation metadata; the client uses that marker for both the public
timer and flight animation. Fanjian and ordinary card reveals remain at the
normal two-second duration.

The current stage remains Stage 6 hero-capability execution complete for the
implemented Standard heroes. The next milestone is the next individually
verified Standard hero capability, preserving the canonical semantic response
protocol and Quick Test privacy.

## Cao Cao Hujia delegation correction — 2026-09-21

Cao Cao's Entourage / Hujia now asks every living Wei character in action
order based on faction eligibility, even when that character has no Dodge or
other Dodge provider. The delegate receives a private semantic response
decision with Skip response available and no fabricated card option. When all
delegates decline, control returns to Cao Cao with Hujia disabled for that
Attack, so he can still play his own Dodge or decline normally. The same
generic eligibility fix applies to Liu Bei's Jijiang / Influencing delegation.
API coverage now includes empty delegates, successful delegated responses,
multiple delegates, all-decline fallback, private prompt projection, and
Jijiang action order. The full Worker/D1 suite passes 103 tests.

The current stage remains Stage 6 hero-capability execution complete for the
implemented Standard heroes. The next milestone is the next individually
verified Standard hero capability, preserving the canonical semantic response
protocol and Quick Test privacy.

## Zhou Yu Yingzi correction — 2026-09-21

Yingzi now follows the optional WTK Standard wording: after required Draw
Phase Judgements and before the normal draw, Zhou Yu privately chooses whether
to draw one additional card. Use draws three normal Draw Phase cards; Skip
draws two. The modifier is scoped to that canonical Draw Phase only, so card
effects and other draws are unchanged. Multiplayer and Quick Game use the
same private semantic trigger, with server-side stale-action protection.

## Zhou Yu Fanjian correction — 2026-09-21

Fanjian now follows the WTK Standard sequence exactly: Zhou Yu selects only
another living character, that target privately commits Heart, Diamond, Club,
or Spade, and only then chooses one anonymous position from Zhou Yu's hand.
The server transfers and reveals the selected physical card after the opaque
selection, keeps it in the target's hand, compares the committed suit, and
routes a mismatch through canonical sourced damage and Dying handling.

The target projection exposes only the number of available hidden positions;
card IDs, kinds, ranks, and suits are withheld until the reveal. Fanjian is
marked used when committed, resets at Zhou Yu's next turn, and stale or
duplicate submissions cannot repeat the transfer. The initial UI has no
Fanjian hand-card selection step. Full Worker/D1 validation now passes 97 tests.

## Hosted test-seat shared-controller setup — 2026-09-21

The former single-player Quick Game setup is now reached through the hosted
lobby: the host creates a normal room, adds test players, and starts through
the same `beginMatch()` path as multiplayer. Generated
seats share the host token and retain normal Lord-first hero selection and
shuffled Standard opening hands. This exercises the same setup path as a
hosted multiplayer game, with deterministic hero/card fixtures confined to
test helpers.

## Standard setup parity — 2026-09-20

Normal multiplayer and Quick Game now use one Standard setup state machine:
random role assignment, Lord-first general selection, private 5/3 candidate
deals, hidden non-Lord selections with readiness-only projection, simultaneous
general reveal, hero HP application, four-card opening hands, and the Lord's
first turn. Quick Game uses one shared controller across four human-style seats;
multiplayer retains the full role set. Preferred heroes, the full Standard
roster, and special opening cards are never injected into production setup
logic.

The current stage is Standard setup/privacy parity complete, with Quick Game
now using one shared controller across four seats; the next milestone remains
the next individually verified Standard hero capability. Full Worker/D1
validation currently passes 118 tests.

The next Wu/Qun hero batch is now playable: Gan Ning (Ambushment), Lü Meng
(Composure), Huang Gai (Self Sacrifice), Zhou Yu (Heroic/Sowing Distrust),
and Lü Bu (Wushuang). Ambushment uses the canonical Burning Bridges Negation
and target-card flow; Composure, Self Sacrifice, Heroic, and Sowing Distrust
are wired into the normal turn/trigger transitions;
and Wushuang changes the server-side response count for Attack and Duel. The
capabilities are available in normal multiplayer and Quick Test through the
shared `trigger` / `respond` protocol.

The standard Attack card now uses the supplied red-and-black battle artwork
across hand, reveal, and played-card surfaces. A readability gradient keeps
the physical rank/suit and Attack label legible; gameplay semantics and the
remaining Standard card presentation are unchanged.

The standard Dodge card now uses the supplied blue moonlit artwork across the
same shared surfaces. Its cool readability treatment keeps the physical
rank/suit and Dodge label legible without changing card semantics.

The standard Peach card now uses the supplied blossom artwork across the same
shared surfaces. Its warm readability treatment keeps the physical rank/suit
and Peach label legible without changing card semantics.

The standard Duel card now uses the supplied red-and-gold battle artwork across
the same shared surfaces. Its warm contrast treatment keeps the physical
rank/suit and Duel label legible without changing card semantics.

The standard Lightning card now uses the supplied storm artwork across the same
shared surfaces. Its electric gold/blue contrast treatment keeps the physical
rank/suit and Lightning label legible without changing card semantics.

The standard Oath in Peach Garden card now uses the supplied blossom-oath
artwork across the same shared surfaces. Its warm pink/gold contrast treatment
keeps the physical rank/suit and Oath label legible without changing card
semantics.

The standard Raining Arrows card now uses the supplied arrow-storm artwork
across the same shared surfaces. Its slate/gold contrast treatment keeps the
physical rank/suit and Raining Arrows label legible without changing card
semantics.

The standard Zhuge Crossbow card now uses the supplied crossbow artwork across
the same shared surfaces. Its dark gold contrast treatment keeps the physical
rank/suit and equipment label legible without changing card semantics.

The Zhuge Crossbow artwork has been updated to the latest supplied close-up
crossbow graphic. Its existing dark-gold treatment remains shared across hand,
reveal, equipment, and settled-card surfaces without changing card semantics.

The standard Yin-Yang Swords card now uses the supplied dual-blade artwork
across the same shared surfaces. Its red/blue contrast treatment keeps the
physical rank/suit and equipment label legible without changing card semantics.

The standard Eight Trigrams Formation card now uses the supplied shield artwork
across the same shared surfaces. Its gold/black contrast treatment keeps the
physical rank/suit and equipment label legible without changing card semantics.

The standard Burning Bridges card now uses the supplied collapsing-bridge
artwork across the same shared surfaces. Its ember/gold contrast treatment
keeps the physical rank/suit and Burning Bridges label legible without changing
card semantics.

The standard Steal card now uses the supplied card-taking artwork across the
same shared surfaces. Its ember/gold contrast treatment keeps the physical
rank/suit and Steal label legible without changing card semantics.

The standard Bumper Harvest card now uses the supplied harvest artwork across
the same shared surfaces, including the revealed choice cards. Its bright
ember/gold contrast treatment keeps the physical rank/suit and Bumper Harvest
label legible without changing card semantics.

The standard Green Dragon Blade card now uses the supplied jade-blade artwork
across the same shared surfaces. Its teal/green contrast treatment keeps the
physical rank/suit and equipment label legible without changing card semantics.

The outgoing minus-one-distance horse cards now use the supplied fiery horse
artwork across the same shared surfaces. Red Hare, Purple Bay, and Fergana
Steed share the red/ember contrast treatment, while defensive plus-one-distance
horses remain unchanged.

The defensive plus-one-distance horse cards now use the supplied spectral horse
artwork across the same shared surfaces. Shadowrunner, Hex Mark, and
Yellow-Hoofed Flying-Lightning share the blue/silver contrast treatment, while
outgoing minus-one-distance horses remain unchanged.

The Rock Cleaving Axe and Blue Steel Sword cards now use their supplied weapon
artwork across the same shared surfaces. Rock Cleaving Axe uses a stone/ember
treatment and Blue Steel Sword uses a blue-steel treatment; both preserve their
physical rank/suit and equipment labels without changing card semantics.

The Blue Steel Sword artwork has been updated to the supplied close-up blade
artwork. Its existing blue-steel contrast treatment remains shared across hand,
reveal, equipment, and settled-card surfaces without changing card semantics.

The standard Serpent Spear, Kirin Bow, and Nio Shield cards now use their
supplied artwork across the same shared surfaces. Their teal, gold, and
gold/black contrast treatments preserve physical rank/suit and equipment labels
without changing weapon or Armor semantics.

The standard Sky Piercing Halberd, Barbarian Invasion, and Negation cards now
use their supplied artwork across the same shared surfaces. Their ivory/gold,
red/brown, and purple/gold contrast treatments preserve physical rank/suit and
card labels without changing their multi-target, Group, or Negation semantics.

The Negation artwork has been updated to the latest supplied purple-and-gold
formation graphic. Its existing contrast treatment remains shared across hand,
reveal, played, and settled-card surfaces without changing Negation semantics.

The standard Frost Sword, Something Out of Nothing, and Borrowed Sword cards
now use their supplied artwork across the same shared surfaces. Their icy blue,
gold/black, and red/black contrast treatments preserve physical rank/suit and
card labels without changing their weapon, draw, or forced-Attack semantics.

The standard Overindulgence card now uses the supplied banquet artwork across
the same shared surfaces. Its purple/gold contrast treatment keeps the physical
rank/suit and Overindulgence label legible without changing its delayed
Judgement semantics.

The standard Attack card artwork has been updated to the supplied red-and-black
slash artwork across the same shared surfaces. Its existing readability
treatment keeps the physical rank/suit and Attack label legible without
changing card semantics.

The Eight Trigrams Formation, Nio Shield, Sky Piercing Halberd, Blue Steel
Sword, Serpent Spear, Kirin Bow, Frost Sword, Rock Cleaving Axe, Green Dragon
Blade, and Yin-Yang Swords artwork has been updated with the latest supplied
graphics. Existing shared card treatments and card semantics remain unchanged.

Card faces now keep one shared footprint even when a card name is long. Names
such as Overindulgence, Eight Trigrams Formation, and Something Out of Nothing
wrap within the card and are limited to two readable lines across hand, reveal,
played, and compact table surfaces.

The hero start phase now uses the supplied Standard English card metadata for
Cao Cao (Treachery, Entourage), Liu Bei (Benevolence, Influencing), Sun Quan
(Equilibrium, Deliverance), Sima Yi (Retaliation, Necromancy), Xiahou Dun
(Stauchness), Guan Yu (God of War), Zhang Fei (Battle Cry), Zhao Yun
(Braveheart), and Zhen Ji (Empress Dowager, Goddess of Luo River). The full
skill text is shared by the selection cards and each private in-game hero
information dialog.

Quick Game enters the same authoritative `heroes` start phase as normal rooms
with one Lord seat. The player receives five private Lord candidates, chooses
one general, and then starts through the normal `beginMatch` path. Multiplayer
rooms retain the full Lord-first, non-Lord selection flow.

In-game player cards now show hero names at a larger, more readable size while
remaining responsive on smaller screens.

Shared played-card faces now colour only their rank and suit from the physical
card suit across centre, reveal, Harvest, equipment, Judgement, and settled
table surfaces. Gameplay and rules are unchanged; the render regression covers
all four suits through a real `GameRoom` CardFace consumer.

Semantic trigger controls now retain their player-facing action labels while a
request is in flight. Busy state disables the controls without replacing
Luoshen, Skip reaction, or trigger-dialog labels with transient Resolving /
Skipping text.

In-game player hero cards now include an accessible info icon. The public card
keeps the hero presentation uncluttered, while the icon opens the authoritative
ability explanation.

Hand cards now use standard suit colours: Hearts and Diamonds are red, while Spades and Clubs remain black.

Zhen Ji's Luoshen is now a real repeated Judgement at the canonical beginning
of her turn. Black final results enter her hand and reopen a fresh optional
Luoshen trigger; the first red result is discarded and only then does the
existing Judgement Zone and Draw Phase processing begin. Luoshen and delayed
cards consume separate Judgement cards, use the shared Judgement mechanism,
and Qingguo remains unchanged.

Sima Yi's Guicai now opens the canonical `judgement_revealed` trigger before
every supported Judgement result. It can replace the revealed card with one
card from Sima Yi's hand through the existing `trigger` / `decline_trigger`
protocol; the replacement becomes the final Judgement card and all downstream
Luoshen, Overindulgence, Rations Depleted, Lightning, and Eight Trigrams rules
use that final card. His printed Standard skill Retaliation (Fankui) now uses
the same semantic `damage_suffered` event as Stauchness: after qualifying
nonlethal damage, Sima Yi can obtain one server-selected card from the source's
hand, Equipment Zone, or Judgement Zone. Hidden-hand choices remain index/key
based until resolution and are revealed only privately to Sima Yi.

The P1 sourced-damage correction now routes nonlethal Raining Arrows and
Barbarian Invasion damage through the same generic `damage_suffered` transition
as Attack damage. The suspended `GroupContinuation` preserves held cards,
remaining targets, resolution identity, presentation barriers, and the single
final discard while Stauchness/Ganglie resolves. Failed Eight Trigrams
responses, Duel losses, Rock Cleaving Axe forced damage, and sourced damage
caused by Stauchness use the same post-damage boundary; source-less Lightning
does not invent a source.

The Ganglie source consequence is presented as a mandatory generic choice: the
damage source sees the complete non-Heart Judgement rule and must either
discard exactly two cards from their hand or take 1 damage from Xiahou Dun;
Equipment and Judgement Zone cards are not eligible. Xiahou Dun's hero
information dialog now includes the skill name **Stauchness / Ganglie** and
the complete hand-only rule text.

Zhang Fei's Paoxiao is now a locked passive capability. The shared Attack-use-limit capability discovers Paoxiao and Zhuge Crossbow from `{ hero, equipment }`, so normal Attacks, Serpent Spear Attacks, and the projected `canDeclareAttack`/resume phase all share one authoritative unlimited-Attack result. Borrowed Sword forced Attacks remain outside the Play Phase limit. Existing Attack range, horse, weapon trigger, Dodge, damage, Dying, and Borrowed Sword behavior is unchanged.

When Yin-Yang Swords lets the attacker draw, the drawn card now appears in the attacker's normal private centre-card presentation and remains hidden from the other seats.

Quick Test opening-deal parity: production uses the same shuffled four-card
deal as normal multiplayer. Special hero/card allocations remain test-helper
fixtures and are not part of game rules.

Concurrent canonical response submissions now retain the compare-and-set
single-winner claim. If a valid earlier Attack, Duel, Group, Negation,
Borrowed Sword or secondary Judgement response loses because the live decision
has advanced, the loser receives HTTP 409 with `stale: true` and a fresh
private room projection. Same-state wrong-seat and ordinary invalid-cost
errors remain normal validation errors. The Worker/D1 regression verifies one
winner, one stale loser, one card/effect/log result, no resolving-room stall,
and no private-hand leakage.

Current Stage 6 milestone: Hero capability execution — Guan Yu's Wusheng, Zhao Yun's Longdan, Zhang Fei's Paoxiao, Zhen Ji's Luoshen, Sima Yi's Guicai/Retaliation, Xiahou Dun's Stauchness/Ganglie, and the three faction lords are implemented through the semantic capability architecture. The Standard setup/privacy parity pass is complete: normal multiplayer and Quick Game share one role, candidate, reveal, HP, opening-hand, and starting-turn path; Quick Game projects the current seat through one shared controller token. No provider-specific protocol or client hero branch was added. The next milestone is the next individually verified Standard hero capability.

The three Standard faction lords are now playable through the same semantic layer. Cao Cao has Jianxiong, which can reclaim the exact physical damage card(s), and Entourage, which delegates a Dodge request to Wei characters in action order. Liu Bei has Benevolence card-gifting with cumulative threshold/recovery semantics, plus Lord-only Influencing delegation to Shu characters for Attack responses and active Attacks. Sun Quan has once-per-Play-Phase Equilibrium and the Jiuyuan rescue modifier for another Wu character's Peach. These abilities project private legal choices through `currentAction` and use only the canonical `respond`, `decline_response`, `trigger`, and `decline_trigger` commands; deterministic Worker/D1 coverage exercises normal multiplayer and the shared multi-seat test fixture. The next milestone is the next individually verified Standard hero capability; the start phase and Quick Game selection contract are now complete.

An English online implementation of WTK Standard, the classic hidden-role Three Kingdoms card game, built for small private groups of friends.

- Play: https://three-kingdoms.dai-jinge.workers.dev
- Source: https://github.com/dmoneyUK/three-kingdoms
- Development handover: [HANDOVER.md](HANDOVER.md)
- Roadmap: [ROADMAP.md](ROADMAP.md)
- Official card reference: [docs/OFFICIAL_CARD_REFERENCE.md](docs/OFFICIAL_CARD_REFERENCE.md)
- Current stage: **playable four-player alpha — 28 / 28 verified Standard card identities and the physical Standard 108-card deck complete; Stage 5 match-rule correctness COMPLETE; Stage 6 Round 1 roster reconciliation, Guan Yu Wusheng hardening and final UI cleanup, Step 4.3 response-helper cleanup, single-controller bot-surface removal, Step 5E response-builder typing, Step 6B Negation canonicalization, Step 7B.1 legacy persisted-response rejection, Step 7C direct response construction, Step 7D response architecture documentation closure, Sima Yi Guicai Judgement continuation, Xiahou Dun Stauchness/Ganglie, and the three faction lords COMPLETE**

## Current multiplayer lobby milestone — COMPLETE

Normal human multiplayer now starts from a named host or a five-character room
code join flow. The host becomes seat 0 and receives the shareable room code,
but roles remain unassigned until Start Game. The Waiting Room enables the
host's Start Game for 4–8 joined players without a readiness step. Stale Starts
after the lobby return HTTP 409.

Role allocation remains shuffled independently of host or seat with the
existing one-Spy Standard sets for 4, 5, 6, 7, and 8 players. Before and during
General selection, only the Lord is publicly revealed; each player sees their
own identity and non-Lord General choices remain private. The Lord receives
five candidates and chooses first, other seats receive three in seat order,
and the final confirmation still enters Playing automatically with Lord +1 HP
and the Lord's first turn. Alternative selectable two-Spy variants remain a
future milestone. Quick Game remains a separate single-controller experience.

The next milestone is the next individually verified Standard hero capability,
while continuing mobile polish and production multiplayer smoke testing.

Step 7D closes the semantic response architecture cleanup. `ResponsePending` is the sole semantic Attack, Duel,
Group, and Negation decision shape. Attack, ordinary AOE, Halberd, and Duel
creation now return canonical responses directly; DeferredStratagem stores
canonical Duel and Group responses; continuations are explicit domain types;
and `serializePending()` performs serialization only. No response-family
conversion helpers, builder conversions, or legacy response decision types
remain. `TriggerPending` is the only persisted semantic trigger decision, and
old saved Attack/Duel/Group/Negation response states are unsupported. The next
milestone is the next individually verified Standard hero.

Stage 6 architecture cleanup is canonical-only: supported gameplay commands are `respond`, `decline_response`, `trigger`, and `decline_trigger`, and `currentAction` is the authoritative client decision contract. Old clients and persisted in-progress legacy decisions are unsupported. Future cards and heroes must expose provider capabilities through this semantic contract, never concrete provider-specific HTTP actions. Wusheng conversion is explicit via `playAs: "attack"`; absent that field, the physical card performs its native action. Step 3.5 test cleanup, Step 4 Duel canonicalization, Step 4.3 response-helper cleanup, Step 5A Group/AOE response canonicalization, Step 5B `advanceGroup()` canonicalization, Step 5C canonical Dying Group resume, removal of inactive bot gameplay, Step 6A canonical Negation responses, the Step 6A.1 continuation boundary, Step 6B Negation canonicalization, Step 7A response expansion compatibility removal, Step 7B.1 rejection of legacy persisted Attack/Duel/Group/Negation response states, Step 7C direct response construction, and Step 7D documentation closure are complete. Audit/state validation, room projections, and response timers now read canonical `ResponsePending` and `TriggerPending` records directly; old response-family states never become actionable `currentAction` values or legacy response DTOs. Quick Game is a single-player human-style room with one shared controller switching across four seats. The next milestone is the next individually verified Standard hero.

The current deterministic suite has 103 tracked test declarations while retaining
the required human multiplayer, Quick Test perspective, setup privacy, and
capability invariants. The Worker/D1 runner executes all 103 tests.

Step 5E completed the response-builder typing cleanup: the former
response-builder compatibility union
contained only the four legacy builder shapes and the then-remaining
Attack/Duel/Negation compatibility shapes, and
`GroupResponsePending` narrows canonical Group responses for Halberd triggers
and Dying resumes. Runtime behavior is unchanged and Negation remains untouched.

Step 5D.1 completed the Group canonical cleanup: the former transitional Group
response shape was accepted only for initial builders, while Halberd `attack_targeted`
continuations store the complete canonical Group response, and canonical Group
sequence projection returns `GroupContinuation`. Actor and deadline metadata
remain in `currentAction`; the Negation-embedded Group boundary is unchanged.

Step 5D carries canonical `ResponsePending` plus `GroupContinuation` through
all normal Group/AOE helpers, including held-card accounting and Dying resume.
The former transitional Group response shape is no longer used for initial
deferred card construction, the Negation-embedded effect boundary, or bounded
public projection. Negation
response execution remains unchanged.

The latest architecture pass routes every Attack origin, including physical, Serpent Spear, triggered follow-up, Borrowed Sword, and human-controlled Quick Test Attacks, through the shared target, Dodge, Armor, damage, and Dying pipeline. Borrowed Sword is fully hardened in Standard games: after canonical Negation, its user chooses a live legal target, the Weapon holder receives a private semantic Attack decision with an idempotent human response timer, and refusal/no-provider transfer revalidates the persisted Weapon ID. Worker/D1 regressions cover races, stale targets/actions, physical and Serpent Spear providers, Dodge, and Yin-Yang Swords continuation.

Virtual Wusheng Attacks retain the physical source card while carrying the narrow presentation marker `playedAs: "attack"`. This keeps red Equipment and delayed cards in the ordinary played/consumed path, and makes Game Messages and history describe “used as Attack” rather than their physical card effect. Canonical `attack_targeted` and `choice` trigger selections survive room normalization. The server-owned `currentAction.canDeclareAttack` projection is shared with validation for physical, Wusheng and Serpent Spear Attacks.

Successful Judgement-based Negation now applies one transitioned parity/depth state before either opening a counter-window or resolving the effect.

The foldable Game Messages window is the sole public textual event-history surface and derives its latest 10 entries from the authoritative server timeline. The centre presentation displays cards only: informational text never enters the sequential visual presentation queue, so response availability and timers still wait only for the exact `readyAfterEventId` card or essential visual event while card settlement animations now use a synchronized 2-second duration. Damage-trigger decisions bind the latest essential card/cards presentation belonging to the current Attack when one exists, and otherwise carry no barrier; the browser also treats any legacy informational barrier as already ready.

The game table now uses a responsive four-seat player board with no in-game top bar. Each player square keeps the hero name, HP, hand count, compact equipment and Judgement cards together; active and self seats remain visually identifiable, and distance is no longer shown in player UI cards. Both normal multiplayer and Quick Game apply each selected hero's real maximum HP, including the Lord's +1 bonus.

Raining Arrows is covered through the current semantic response path: each living target receives a Dodge decision, and declining or timing out that decision applies its 1 damage before the next target is processed.

The game surface keeps Exit available independently of the hidden top bar. Game Messages is the foldable event window and can be folded away to free table space; no separate popup history window is used, and the turn-status strip is intentionally omitted from the board.

Recent UX fixes complete four reported flows: a defensive horse can replace an equipped Hex Mark through the normal equipment-slot path; Borrowed Sword now exposes live Weapon holders as selectable targets before opening the forced Attack response; its `choose_target` stage no longer exposes Play Dodge or Skip response controls and its picker waits for presentation to finish; and resolved hero/equipment reactions, including passive Nio Shield prevention, emit a server-authored Game Messages entry plus a brief on-table “Effect Triggered” notice. These notices are informational and never delay decisions, timers, or card presentation barriers. Wusheng-supplied Play Phase cards now enter virtual-Attack mode only through the dedicated Hero Skills control.

Player squares show a secret-role badge only for the local player. Negation skip controls keep a stable label while a request is in flight, avoiding transient status flicker. Equipment and Judgement tiles use a uniform compact card ratio, with taller player squares allowing the zone contents to remain readable.

## Source of knowledge

### Semantic execution status

The semantic response/trigger architecture is complete. All 28 / 28 verified Standard card identities and the exact physical Standard 108-card reconciliation are complete. Match-rule correctness, including delayed Stratagem/Judgement lifecycle, is complete; Stage 6 hero abilities is active.

The official **War of the Three Kingdoms (WTK) Game Card catalogue** is the primary source of truth for card names, product membership, categories and card rule meaning:

- **WTK Game Card catalogue:** https://wtkgames.com/gameCard/

For this project, always filter the catalogue to **Standard**. Endless Legends and Kingdom Wars cards are out of scope unless expansion development is explicitly enabled. When implementation behaviour, older project documentation, community translations or remembered rules conflict with the official WTK Standard catalogue, verify against the official catalogue and treat it as authoritative. The project's captured Standard reference is maintained in [`docs/OFFICIAL_CARD_REFERENCE.md`](docs/OFFICIAL_CARD_REFERENCE.md).

## Current Stage

Stage 6 Round 1 is complete. The latest UI pass adds the supplied Attack card
artwork to the shared hand/reveal/played presentation path without changing
the semantic card protocol. Step 3.5 test cleanup is complete, with behavioural coverage retained in the API/integration suite and brittle source-regex checks removed. Step 4 Duel canonicalization is complete: Duel uses `ResponsePending` plus `DuelContinuation` directly. Step 5A Group/AOE response canonicalization, Step 5B `advanceGroup()` canonicalization, and Step 6B Negation canonicalization are complete. New Standard games use the single 30-general
`STANDARD_HEROES` registry (Wei, Shu, Wu, Qun), including Yue Jin,
Zhuge Liang, Lady Gan, Gongsun Zan, and Pan Feng. Yuan Shao, Yan Liang & Wen
Chou, and Pang De remain readable only through bounded legacy metadata.

Guan Yu's verified Wusheng rule is implemented through the semantic Attack
provider `guan_yu_red_card_attack`: one red-suited hand card can be used or
played as Attack in Play Phase and in existing Attack requirements. The acting
seat privately receives `currentAction.playPhaseActions` mappings such as
`cardId -> canPlayAs: "attack"`; the browser uses that projection for target,
range, Halberd and button state while the server remains authoritative. An
Attack requirement provider is not automatically a Play Phase virtual Attack
source: active use is explicitly declared by `playPhaseUse: "attack"`.

Borrowed Sword now uses canonical semantic Dodge discovery after its Nio
Shield passive check, so Zhen Ji and Eight Trigrams alternatives are treated
like ordinary Attack responses.
Step 7B and Step 7D now treat persisted response decisions as canonical-only:
`pending_json` readers accept `kind: "response"` exclusively, and room
projection derives response DTOs only from `ResponsePending.continuation`.
Legacy persisted response-family states are unsupported; response expansion and
builder-conversion compatibility are removed.

The project has moved beyond the initial table prototype. A complete
four-player match loop runs in normal human multiplayer rooms, while Quick
Game provides a single-player controller switching across four seats using the
same card and turn engine. Turn ownership, ordered responses, death rewards and victory checks are working.
Human card and weapon responses use a 30-second action window. Bot gameplay is
not supported.

The architecture milestone is complete. Normal Attack cards, Serpent Spear-formed Attacks, Green Dragon Blade follow-ups, and all verified card identities use the established semantic engine; Stage 5 match-rule correctness is complete and Stage 6 hero abilities is active.

The Cloudflare deployment workflow now performs a post-deploy smoke test against `/` and the Worker-only `/api/health` endpoint. A successful Wrangler upload is not considered production-ready unless both checks return successfully.

Room reads are now deliberately read-only: they do not refresh presence, progress gameplay, or run schema DDL. The browser polls every 8 seconds while idle, every second during an active response, and every 60 seconds in a hidden tab. Normal multiplayer presence uses a separate 60-second throttled heartbeat; Quick Game's shared controller writes no per-seat presence rows. Timer-driven Bumper Harvest transitions use an explicit action at the authoritative deadline rather than GET polling. An active match with no game-state event for five minutes is closed as finished by the next one-minute inactivity check; opening a saved room also performs that check. Presentation events now carry a resolution identity separate from action revisions, plus explicit importance/final-result metadata, so informational response chatter can collapse without hiding essential outcomes. `currentAction` publishes the private semantic response or trigger decision and its legal providers. `ResponsePending` is requirement-centric, while `TriggerPending` persists the domain event and a small continuation for the supported reactions. New decision transitions pass their exact event ID directly; the barrier helper no longer scans logs, and log scanning is not part of the semantic decision contract. The client submits the generic `respond`/`decline_response` or `trigger`/`decline_trigger` protocol, and the server revalidates every provider against live state before the canonical continuation resumes. The semantic execution layer now advances Negation passes correctly, safely resumes secondary Judgement across response continuations, and resumes exhausted trigger events semantically (including deferred damage and Dying). The next work is the next scoped Standard hero.

Human response timing is now tied to the visible decision, rather than the server transition that created it. A response's providers, decline control, card/cost selectors and countdown remain unavailable while the preceding public presentation is active; all become interactive together once that presentation settles. Human decisions begin unarmed, and the first client timer request arms one fixed 30-second deadline; reloads and duplicate requests preserve it. The response UI renders the server-projected provider list directly: a provider first identifies itself, then the player supplies only the card cost permitted by that provider. Generic submission validates every provider's `min`/`max` card constraints and supports one or many cards; Play Phase Serpent Spear remains a separate weapon action. Response selection is reset whenever the authoritative action revision changes, so chained decisions cannot inherit a prior provider or card cost. Any former bot timing path is inactive legacy code.

Response providers now return semantic results—what requirement was satisfied, whether cards are consumed, or whether provider-owned secondary resolution is required—instead of selecting an HTTP action themselves. Eight Trigrams now requests a generic Judgement effect and owns the red-result rule; the route resolves the Judgement and resumes the stored Attack/AOE continuation without treating every Judgement as Eight Trigrams. The response registry also enforces one implicit (ordinary physical-card) provider at most for each requirement; all alternatives are explicit. Zhen Ji's Qingguo remains the first live hero proof: one black hand card can satisfy any Dodge requirement through generic `respond`, including the normal Attack pipeline, without adding a Zhen Ji branch to that resolver.

The regression runner now applies the tracked D1 migrations into an isolated `.wrangler/test-state` database before starting its Worker and explicitly registers the synthetic capability fixture only in that test Worker. This makes fresh CI checkout tests reproducible without modifying the developer's local game database while keeping production registries limited to real gameplay providers. Green Dragon Blade and Rock Cleaving Axe execute through provider-owned `attack_dodged` triggers, while Frost Sword and Kirin Bow share the `damage_about_to_apply` trigger: each equipment module owns availability and live selection validation rather than route code inspecting a weapon. Response decisions now carry a `readyAfterEventId`; the client waits only for that decision's required public event, not for an unrelated presentation queue to drain, and informational messages never block a decision. Human Attack-dodged triggers and initial/counter Negation windows capture the exact event ID returned by event creation. Every Attack origin now enters the same damage-about-to-apply discovery path, including physical, Serpent Spear, and triggered follow-up Attacks. The Worker/D1 tests exercise unknown Attack, zero-card Dodge, zero-card Negate, both synthetic trigger chains, and the Kirin Bow essential-versus-informational barrier through the existing registration/API paths; cleanup unregisters synthetic capabilities when the isolated test Worker shuts down.

Room payloads are normalized at the API and client boundary: malformed timeline entries, null players, incomplete cards, nullable equipment/Judgement collections, and stale pending states are discarded or defaulted before React renders. Public projected pending DTOs retain their kind discriminator, so valid Negation, Harvest, target-card and Dying responses survive this safety boundary and keep their controls. Presentation events now carry a separate resolution identity plus explicit essential/informational and final-result metadata; the client can collapse stale audit chatter while preserving the meaningful result before enabling the next action. An incompatible restored session is cleared with a recovery message, and a game-screen error boundary prevents one corrupt room from taking down the whole application.

The trigger registry now evaluates every provider that can react to a domain event, rather than selecting a weapon-specific option in the route. Canonical `trigger` requests are revalidated against that complete live set, while old trigger request names are translated once at the API boundary for saved clients. Trigger providers can therefore use the same event context whether their costs are in Hand, Equipment, or the target's zones; Rock Cleaving Axe is the first provider migrated to this fully live context.

Triggered providers also declare a strongly typed semantic outcome instead of asking the route to recognize their identity: follow-up Attack, forced damage, damage prevention, or a non-terminal reaction that keeps the current event open. Attack-dodged and damage-about-to-apply trigger decisions are event-shaped: after a provider resolves, the engine applies its semantic outcome and resumes the effect without constructing a weapon-specific pending decision. Selected provider labels are carried as generic presentation metadata, so history remains player-readable without provider-specific rule branches. Target-card selections now use opaque keys and a target reference, preserving hidden-hand privacy. A non-terminal provider is excluded after it resolves; if no option remains, its continuation resumes immediately rather than leaving an empty response window. The trigger decision module now exposes lifecycle helpers for creation, human choice, continuation reopening and semantic resumption.

The semantic response and trigger protocol is the only supported gameplay
surface; provider-specific legacy action compatibility is removed. The current
browser renders only canonical response/trigger decisions. Canonical
target-card triggers—including Frost Sword and Kirin Bow—use one generic
picker: hidden hand positions and named Equipment cards are rendered only when
their opaque keys appear in the server's `selection.eligibleKeys`; hidden cards
remain opaque while eligible Equipment cards stay named.

Negation response prompts now track the latest Negation in a counter-chain while retaining the original Stratagem as the root effect. Event History records each Negation window opening, pass, counter-window opening and closure, making Quick Test response transitions diagnosable instead of appearing to skip silently.

AOE resolves one target at a time. Each target's initial Negation round starts at the current turn owner; a counter round starts after its latest Negation player and includes that player last. After all passes, an effective AOE asks for the required Attack/Dodge capability, including implemented alternatives with their normal costs. Response countdowns appear after five elapsed seconds (the deadline is unchanged). Eight Trigrams Formation is the first alternative Dodge provider. The semantic response architecture cleanup is complete; the next milestone is the next scoped Standard hero.

The playable alpha includes:

- automatic roles and hero assignment;
- Lord bonus HP and the Zhang Fei test hero;
- Draw, Play, Discard and Ending phases;
- turn ownership, seat order, distance and attack range;
- public equipment with authoritative equip, replacement and defeat cleanup;
- ordered Attack, Dodge, Duel and global-card responses;
- Peach healing and turn-ordered Dying rescue;
- death, role reveal, Rebel defeat rewards and the Lord's Loyalist-kill penalty;
- human multiplayer and human-controlled Quick Test drawing, card play, responses, rescue and discard;
- table-based card-resolution presentation;
- event history and detailed rule-audit trail; and
- deterministic quick-test setups for card and response-chain development.
- a single-player Quick Game controller that follows the authoritative Lord-first general-selection order across four seats, deals normal shuffled opening hands, and keeps deterministic hero/card scenarios confined to test helpers.
- generic `target_cards` reactions open in one centred `.play-table` picker. The picker renders only server-projected `selection.targetId`, `eligibleKeys`, `min`, and `max`; it keeps hidden hand positions private, derives every `hand:N` card directly from `eligibleKeys`, shows only matching eligible equipment as readable faces, and places Skip reaction and the selected effect action below the cards.

### Implemented Standard cards

- Attack
- Dodge
- Peach
- Something Out of Nothing
- Burning Bridges
- Steal
- Duel
- Oath of the Peach Garden
- Barbarian Invasion
- Raining Arrows
- Bumper Harvest
- Negation
- Overindulgence
- Lightning
- Borrowed Sword
- Zhuge Crossbow
- Blue Steel Sword
- Green Dragon Blade
- Serpent Spear
- Rock Cleaving Axe
- Sky Piercing Halberd
- Frost Sword
- Kirin Bow
- Yin-Yang Swords
- Nio Shield
- Eight Trigrams Formation
- Fergana Steed
- Shadowrunner

### Standard card roadmap

All 28 / 28 verified Standard card identities are implemented and playable. Physical Standard 108-card deck — COMPLETE.

The official catalogue and `docs/OFFICIAL_CARD_REFERENCE.md` take precedence over older roadmap/card lists.

### Current stage and next milestone

The shared turn and response engine now uses effective horse-adjusted distance consistently in both UI and API, and keeps Quick Test at three HP with named mounts in the deck. Attack, AOE, Negation, and Dying response windows preserve private capability projections while exposing only generic public waiting state. The Attack card artwork is now part of the shared presentation layer; the next milestone remains the next individually verified Standard hero capability. Attack cards, Duel, AOE, Lightning, and forced damage converge on authoritative negative-HP and ordered Dying rules. After an unrescued defeat, outcome is calculated before exactly one legal continuation: finish, resume the interrupted effect, continue the AOE sequence, or advance to the next living turn owner. The dead saved-room trigger adapters and provider-specific Green Dragon Blade, Rock Cleaving Axe, and Frost Sword continuation branches have now been removed; `TriggerPending` is now the only trigger decision in the persisted `Pending` model, Attack responses now resolve directly from canonical `ResponsePending` plus `AttackContinuation`, Duel responses now resolve directly from `ResponsePending` plus `DuelContinuation`, `advanceGroup()` now reads canonical `ResponsePending` plus `GroupContinuation`, Dying Group resume storage now persists canonical `ResponsePending` as well, and Negation runtime now uses capability-driven canonical `ResponsePending` plus `NegationContinuation`. Response architecture cleanup — COMPLETE. Dying / multi-damage — COMPLETE. Death / continuation / match outcome — COMPLETE. Stage 5 delayed Stratagem/Judgement lifecycle — COMPLETE. Stage 6 hero abilities — ACTIVE.

## Roadmap

Negation now resolves each target separately in the established reaction order. The public window opens before the Stratagem settles, while the server silently skips seats without a capability and privately prompts only eligible providers. A played Negation becomes a public centre reveal and starts a fresh counter-window; only after the chain ends does the normal semantic Dodge/Attack/Serpent Spear response open. Public projections never expose skipped seats or another player's private options, and expired eligible windows advance as silent Passes. Eight Trigrams can now provide an optional Judgement-based Dodge for both physical and Serpent Spear-formed Attacks. The reusable `attack_targeted` event now supports target-owned decisions and Yin-Yang Swords before Armor/Dodge resolution. Semantic response/trigger architecture, Dying/multi-damage, death/continuation/match outcome, and delayed Stratagem/Judgement lifecycle are complete. Stage 5 is complete; Stage 6 hero abilities is active.

Equipment presentation now uses a single centre-to-slot animation: the rack copy is hidden until the public reveal finishes, and no numbered sequence copy is retained. This covers both the optimistic player action and incoming events for other viewers. Eight Trigrams Formation now uses the same equipment rack and presentation path. Equipment and Judgement Zone cards retain an info button that opens their existing card explanation dialog. Informational gameplay messages appear only in the foldable Game Messages window, which retains the latest 10 public events in chronological order and does not hold cards, decisions, turns, timers, or later animations. Passive equipment prevention notices use the same non-blocking informational metadata as optional reactions, with `effectNotice` preserved through room normalization for the on-table “Effect Triggered” presentation. The canonical equipment card event supplies rank, suit, and name; the redundant semantic equipment history event is removed.

See [ROADMAP.md](ROADMAP.md) for the active implementation roadmap and per-card implementation requirements.

The broad stages are:

1. Stabilise the turn loop.
2. Strengthen the general rules engine.
3. Complete the verified WTK Standard card set.
4. Complete equipment and distance modifiers.
5. Complete match rules and edge cases.
6. Add hero-specific abilities.
7. Continue product polish.

## Development

Prerequisite: Node.js `>=22.13.0`.

```bash
npm install
npm run dev
npm test
npm run lint
```

The application uses React, TypeScript, vinext, Cloudflare Workers and D1. GitHub `main` is the authoritative source. A push to `main` runs lint and the full test suite in GitHub Actions, applies remote D1 migrations, builds the Worker and deploys it to Cloudflare.

For phone testing on the same Wi-Fi, start the local server with `VINEXT_LAN_TEST=1 npm run dev -- --hostname 0.0.0.0 --port 3000`. This retains live reload but disables Vite's development overlay for that session, so a transient development WebSocket reconnect cannot cover the game while the local game and D1 runtime remain unchanged.

## Contributing

1. Create a feature or bug-fix branch.
2. Keep card names and rules aligned with the official WTK Standard catalogue and `docs/OFFICIAL_CARD_REFERENCE.md`.
3. Run the tests and lint checks.
4. Open a pull request into `main`.

Do not add official card artwork, card scans, logos, frames or other YOKA visual assets without confirming usage rights. Create original visual assets for the playable site.
