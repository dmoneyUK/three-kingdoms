# Three Kingdoms project handover

## Wu/Qun hero batch — 2026-09-20

Gan Ning, Lü Meng, Huang Gai, Zhou Yu, and Lü Bu are now executable Standard
heroes in normal multiplayer and Quick Test. Qixi uses a black hand card as
Burning Bridges and preserves the existing Negation and target-card picker
continuations. Keji skips only the over-limit Discard Phase when no Attack was
used. Kurou loses 1 HP and draws 2, including the shared Dying/rescue boundary.
Yingzi changes normal draw to three cards, while Fanjian gives a concealed card
and opens a mandatory private suit guess; a wrong guess uses the shared 1-damage
transition. Wushuang changes the semantic response requirement to two Dodges
against Lü Bu's Attacks and two Attacks for his Duel opponents.

No provider-specific HTTP action was added. The five skills use currentAction
projections and the existing `trigger`, `decline_trigger`, `respond`, and
`decline_response` protocol. Deterministic capability and metadata coverage was
added; the full suite is now 93 tests.

Known boundary: the remaining Standard heroes in the registry are still
metadata-only and remain the next scoped work.

## Overindulgence artwork and Attack artwork update — 2026-09-20

The supplied Overindulgence artwork is now stored at
`public/overindulgence-card.jpg` and applied to the shared
`.game-card.overindulgence` and `.played-card.overindulgence` presentation
classes. The supplied Attack replacement is stored at
`public/attack-card.jpg`. Hand cards, centre reveals, private draws,
delayed-Judgement previews, and settled table cards share the respective
visuals. Purple/gold and red/black contrast treatments preserve physical
rank/suit, card names, and category labels while the existing suit-colour
corner rules remain authoritative.

No gameplay protocol, Overindulgence Judgement lifecycle, or Attack/Dodge
response semantics changed. Recommended next work remains the next
individually verified Standard hero capability.

## Burning Bridges card artwork — 2026-09-20

The supplied collapsing-bridge artwork is now stored at
`public/burning-bridges-card.jpg` and applied to the existing shared
`.game-card.dismantle` and `.played-card.dismantle` presentation classes.
Because the Standard card kind is `Dismantle` while its official display name
is Burning Bridges, this keeps the artwork on the canonical card identity.
Hand cards, centre reveals, private draws, target-card previews, and settled
table cards share the same Burning Bridges visual. An ember/gold contrast
gradient preserves the physical rank/suit, card name, and category labels
while the existing suit-colour corner rules remain authoritative.

No gameplay protocol, card identity, Negation flow, or target-card picker
semantics changed. Recommended next work remains the next individually
verified Standard hero capability.

## Steal card artwork — 2026-09-20

The supplied card-taking artwork is now stored at `public/steal-card.jpg` and
applied to the shared `.game-card.steal` and `.played-card.steal` presentation
classes. Hand cards, centre reveals, private draws, target-card previews, and
settled table cards share the same Steal visual. An ember/gold contrast
gradient preserves the physical rank/suit, card name, and category labels
while the existing suit-colour corner rules remain authoritative.

No gameplay protocol, card identity, target-distance validation, or target-card
picker semantics changed. Recommended next work remains the next individually
verified Standard hero capability.

## Bumper Harvest card artwork — 2026-09-20

The supplied harvest artwork is now stored at
`public/bumper-harvest-card.jpg` and applied to the shared
`.game-card.bumperharvest` and `.played-card.bumperharvest` presentation
classes. Hand cards, centre reveals, private draws, the multi-card Bumper
Harvest choice stage, and settled table cards share the same visual. A bright
ember/gold contrast gradient preserves the physical rank/suit, card name, and
category labels while the existing suit-colour corner rules remain
authoritative.

No gameplay protocol, card identity, Negation order, choice ownership, or
deadline transition semantics changed. Recommended next work remains the next
individually verified Standard hero capability.

## Green Dragon Blade card artwork — 2026-09-20

The supplied jade-blade artwork is now stored at
`public/green-dragon-blade-card.jpg` and applied to the shared
`.game-card.greendragonblade` and `.played-card.greendragonblade` presentation
classes. Hand cards, centre reveals, private draws, equipment previews, and
settled table cards share the same Green Dragon Blade visual. A teal/green
contrast gradient preserves the physical rank/suit, weapon name, and equipment
category labels while the existing suit-colour corner rules remain
authoritative.

No gameplay protocol, card identity, Attack Range 3 behavior, or
`attack_dodged` follow-up semantics changed. Recommended next work remains the
next individually verified Standard hero capability.

## Offensive horse card artwork — 2026-09-20

The supplied fiery horse artwork is now stored at
`public/offensive-horse-card.jpg` and applied to the shared
`.game-card.redhare`, `.game-card.purplebay`, `.game-card.ferganasteed`, and
their `.played-card` counterparts, with the legacy `.offensivehorse` alias
covered for saved-room compatibility. These cards represent the outgoing
minus-one-distance horse effect. Hand cards, centre reveals, private draws,
equipment previews, and settled table cards share the same visual. A
red/ember contrast gradient preserves the physical rank/suit, horse name, and
equipment category labels while the existing suit-colour corner rules remain
authoritative.

No gameplay protocol, distance calculation, equipment-slot behavior, or
defensive plus-one-distance horse presentation changed. Recommended next work
remains the next individually verified Standard hero capability.

## Defensive horse card artwork — 2026-09-20

The supplied spectral horse artwork is now stored at
`public/defensive-horse-card.jpg` and applied to the shared
`.game-card.shadowrunner`, `.game-card.hexmark`,
`.game-card.yellowhoofedflyinglightning`, and their `.played-card` counterparts,
with the legacy `.defensivehorse` alias covered for saved-room compatibility.
These cards represent the incoming plus-one-distance horse effect. Hand cards,
centre reveals, private draws, equipment previews, and settled table cards
share the same visual. A blue/silver contrast gradient preserves the physical
rank/suit, horse name, and equipment category labels while the existing
suit-colour corner rules remain authoritative.

No gameplay protocol, distance calculation, equipment-slot behavior, or
offensive minus-one-distance horse presentation changed. Recommended next work
remains the next individually verified Standard hero capability.

## Rock Cleaving Axe and Blue Steel Sword artwork — 2026-09-20

The supplied weapon artwork is now stored at
`public/rock-cleaving-axe-card.jpg` and `public/blue-steel-sword-card.jpg`.
They are applied to the shared `.game-card.rockcleavingaxe` /
`.played-card.rockcleavingaxe` and `.game-card.bluesteelsword` /
`.played-card.bluesteelsword` presentation classes. Hand cards, centre reveals,
private draws, equipment previews, and settled table cards share the respective
visuals. Stone/ember and blue-steel contrast gradients preserve the physical
rank/suit, weapon names, and equipment category labels while the existing
suit-colour corner rules remain authoritative.

No gameplay protocol, Rock Cleaving Axe `attack_dodged` continuation, or Blue
Steel Sword Armor-suppression behavior changed. Recommended next work remains
the next individually verified Standard hero capability.

## Blue Steel Sword update, Serpent Spear, Kirin Bow, and Nio Shield artwork — 2026-09-20

The supplied Blue Steel Sword replacement is stored at
`public/blue-steel-sword-card.jpg`. New artwork is stored at
`public/serpent-spear-card.jpg`, `public/kirin-bow-card.jpg`, and
`public/nio-shield-card.jpg`. They are applied to the shared
`.game-card`/`.played-card` classes for `bluesteelsword`, `serpentspear`,
`kirinbow`, and `nioshield`. Hand cards, centre reveals, private draws,
equipment previews, target-card previews, and settled table cards share the
respective visuals. Their blue, teal, gold, and gold/black contrast treatments
preserve physical rank/suit, equipment names, and category labels while the
existing suit-colour corner rules remain authoritative.

No gameplay protocol, Blue Steel Sword Armor suppression, Serpent Spear Attack
provider, Kirin Bow damage trigger, or Nio Shield passive prevention behavior
changed. Kirin Bow remains presentation-only compatibility artwork because its
existing deck/status boundaries are unchanged. Recommended next work remains
the next individually verified Standard hero capability.

## Sky Piercing Halberd, Barbarian Invasion, and Negation artwork — 2026-09-20

The supplied artwork is now stored at
`public/sky-piercing-halberd-card.jpg`, `public/barbarian-invasion-card.jpg`,
and `public/negation-card.jpg`. It is applied to the shared
`.game-card`/`.played-card` classes for `skypiercinghalberd`,
`barbarianinvasion`, and `negation`. Hand cards, centre reveals, private draws,
equipment previews, Group/AOE response cards, and settled table cards share the
respective visuals. Ivory/gold, red/brown, and purple/gold contrast treatments
preserve physical rank/suit, card names, and category labels while the existing
suit-colour corner rules remain authoritative.

No gameplay protocol, Sky Piercing Halberd multi-target continuation,
Barbarian Invasion Group response, or Negation parity/counter-chain semantics
changed. Recommended next work remains the next individually verified Standard
hero capability.

## Frost Sword, Something Out of Nothing, and Borrowed Sword artwork — 2026-09-20

The supplied artwork is now stored at `public/frost-sword-card.jpg`,
`public/something-out-of-nothing-card.jpg`, and
`public/borrowed-sword-card.jpg`. It is applied to the shared
`.game-card`/`.played-card` classes for `frostsword`, `drawtwo`, and
`borrowedsword`. Hand cards, centre reveals, private draws, equipment previews,
target-card previews, and settled table cards share the respective visuals.
Icy blue, gold/black, and red/black contrast treatments preserve physical
rank/suit, card names, and category labels while the existing suit-colour
corner rules remain authoritative.

No gameplay protocol, Frost Sword damage trigger, Something Out of Nothing draw
flow, or Borrowed Sword target/forced-Attack continuation changed. This leaves
Overindulgence as the only Standard card without custom graphic artwork.
Recommended next work remains the next individually verified Standard hero
capability.

## Eight Trigrams Formation card artwork — 2026-09-20

The supplied shield artwork is now stored at
`public/eight-trigrams-card.jpg` and applied to the shared
`.game-card.eighttrigrams` and `.played-card.eighttrigrams` presentation
classes. Hand cards, centre reveals, private draws, target-card previews,
Judgement/equipment-sized faces, and settled table cards share the same Eight
Trigrams visual. A gold/black contrast gradient preserves the physical
rank/suit, shield name, and equipment category labels while the existing
suit-colour corner rules remain authoritative.

No gameplay protocol, card identity, or non-Eight-Trigrams card presentation
changed. The artwork is intentionally scoped to the normal Standard Eight
Trigrams Formation identity; its Judgement-based Dodge and Armor behavior
remain unchanged. Recommended next work remains the next individually verified
Standard hero capability.

## Yin-Yang Swords card artwork — 2026-09-20

The supplied dual-blade artwork is now stored at
`public/yin-yang-swords-card.jpg` and applied to the shared
`.game-card.yinyangswords` and `.played-card.yinyangswords` presentation
classes. Hand cards, centre reveals, private draws, target-card previews,
Judgement/equipment-sized faces, and settled table cards share the same
Yin-Yang Swords visual. A red/blue contrast gradient preserves the physical
rank/suit, weapon name, and equipment category labels while the existing
suit-colour corner rules remain authoritative.

No gameplay protocol, card identity, or non-Yin-Yang card presentation changed.
The artwork is intentionally scoped to the normal Standard Yin-Yang Swords
identity; its target-owned `attack_targeted` trigger and continuation semantics
remain unchanged. Recommended next work remains the next individually verified
Standard hero capability.

## Zhuge Crossbow card artwork — 2026-09-20

The supplied crossbow artwork is now stored at
`public/zhuge-crossbow-card.jpg` and applied to the shared
`.game-card.zhugecrossbow` and `.played-card.zhugecrossbow` presentation
classes. Hand cards, centre reveals, private draws, target-card previews,
Judgement/equipment-sized faces, and settled table cards share the same Zhuge
Crossbow visual. A dark gold contrast gradient preserves the physical rank/suit,
Crossbow name, and equipment category labels while the existing suit-colour
corner rules remain authoritative.

No gameplay protocol, card identity, or non-Crossbow card presentation changed.
The artwork is intentionally scoped to the normal Standard Zhuge Crossbow
identity; its unlimited-Attack capability remains unchanged. Recommended next
work remains the next individually verified Standard hero capability.

## Raining Arrows card artwork — 2026-09-20

The supplied arrow-storm artwork is now stored at
`public/raining-arrows-card.jpg` and applied to the shared
`.game-card.rainingarrows` and `.played-card.rainingarrows` presentation
classes. Hand cards, centre reveals, private draws, target-card previews,
Judgement/equipment-sized faces, and settled table cards share the same Raining
Arrows visual. A slate/gold contrast gradient preserves the physical rank/suit,
Raining Arrows name, and category labels while the existing suit-colour corner
rules remain authoritative.

No gameplay protocol, card identity, or non-Raining-Arrows card presentation
changed. The artwork is intentionally scoped to the normal Standard Raining
Arrows identity; its Group response and Dying continuation semantics are
unchanged. Recommended next work remains the next individually verified
Standard hero capability.

## Oath in Peach Garden card artwork — 2026-09-20

The supplied blossom-oath artwork is now stored at `public/oath-card.jpg` and
applied to the shared `.game-card.oath` and `.played-card.oath` presentation
classes. Hand cards, centre reveals, private draws, target-card previews,
Judgement/equipment-sized faces, and settled table cards share the same Oath
visual. A warm pink/gold contrast gradient preserves the physical rank/suit,
Oath name, and category labels while the existing suit-colour corner rules
remain authoritative.

No gameplay protocol, card identity, or non-Oath card presentation changed.
The artwork is intentionally scoped to the normal Standard Oath in Peach Garden
identity; its all-player effect semantics are unchanged. Recommended next work
remains the next individually verified Standard hero capability.

## Lightning card artwork — 2026-09-20

The supplied storm artwork is now stored at `public/lightning-card.jpg` and
applied to the shared `.game-card.lightning` and `.played-card.lightning`
presentation classes. Hand cards, centre reveals, private draws, target-card
previews, Judgement/equipment-sized faces, and settled table cards share the
same Lightning visual. An electric gold/blue contrast gradient preserves the
physical rank/suit, Lightning name, and category labels while the existing
suit-colour corner rules remain authoritative.

No gameplay protocol, card identity, or non-Lightning card presentation
changed. The artwork is intentionally scoped to the normal Standard
`Lightning` identity; its delayed Judgement and damage semantics are unchanged.
Recommended next work remains the next individually verified Standard hero
capability.

## Duel card artwork — 2026-09-20

The supplied red-and-gold battle artwork is now stored at `public/duel-card.jpg`
and applied to the shared `.game-card.duel` and `.played-card.duel` presentation
classes. Hand cards, centre reveals, private draws, target-card previews,
Judgement/equipment-sized faces, and settled table cards share the same Duel
visual. A warm contrast gradient preserves the physical rank/suit, Duel name,
and category labels while the existing suit-colour corner rules remain
authoritative.

No gameplay protocol, card identity, or non-Duel card presentation changed.
The artwork is intentionally scoped to the normal Standard `Duel` identity;
the Duel response continuation retains its existing semantics. Recommended
next work remains the next individually verified Standard hero capability.

## Peach card artwork — 2026-09-20

The supplied blossom artwork is now stored at `public/peach-card.jpg` and
applied to the shared `.game-card.peach` and `.played-card.peach` presentation
classes. Hand cards, centre reveals, private draws, target-card previews,
Judgement/equipment-sized faces, and settled table cards share the same Peach
visual. A warm pink/gold readability gradient preserves the physical rank/suit,
Peach name, and category labels while the existing suit-colour corner rules
remain authoritative.

No gameplay protocol, card identity, or non-Peach card presentation changed.
The artwork is intentionally scoped to the normal Standard `Peach` identity;
Peach rescue and other effects retain their existing semantics. Recommended
next work remains the next individually verified Standard hero capability.

## Dodge card artwork — 2026-09-20

The supplied blue moonlit artwork is now stored at `public/dodge-card.jpg` and
applied to the shared `.game-card.dodge` and `.played-card.dodge` presentation
classes. Hand cards, centre reveals, private draws, target-card previews,
Judgement/equipment-sized faces, and settled table cards share the same Dodge
visual. A blue readability gradient preserves the physical rank/suit, Dodge
name, and category labels while the existing suit-colour corner rules remain
authoritative.

No gameplay protocol, card identity, or non-Dodge card presentation changed.
The artwork is intentionally scoped to the normal Standard `Dodge` identity;
cards that create or require Dodge responses retain their own physical-card
presentation and semantics. Recommended next work remains the next
individually verified Standard hero capability.

## Attack card artwork — 2026-09-20

The supplied red-and-black battle artwork is now stored at
`public/attack-card.jpg` and applied to the shared `.game-card.attack` and
`.played-card.attack` presentation classes. Hand cards, centre reveals,
private draws, target-card previews, Judgement/equipment-sized faces, and
settled table cards therefore share the same Attack visual. A dark readability
gradient preserves the physical rank/suit, Attack name, and category labels.
No gameplay protocol, card identity, or non-Attack card presentation changed.

Known boundary: the artwork is intentionally scoped to the normal Standard
`Attack` identity; other cards that may create or require Attacks retain their
own physical-card artwork and semantics. Recommended next work remains the
next individually verified Standard hero capability.

## Standard hero metadata and Quick Test start phase — 2026-09-20

The shared Standard hero registry now carries the supplied English skill names
and descriptions for Cao Cao, Liu Bei, Sun Quan, Sima Yi, Xiahou Dun, Guan Yu,
Zhang Fei, Zhao Yun, and Zhen Ji. Selection cards and the private in-game hero
information dialog render this same multi-skill metadata; persisted hero
payloads are normalized before React receives them.

Quick Test no longer calls the match-deal path directly. It creates four
human-style seats, enters `status: 'heroes'`, projects the next unchosen seat
to the shared controller, and accepts one unique Standard hero per seat through
the existing `choose_hero` action. The match starts only after all four choices
are locked, then uses the established deterministic equipment/opening fixture.
Normal multiplayer selection remains unchanged and still uses private options
per player. No provider-specific protocol or hero-specific HTTP action was
added.

The deterministic suite now contains **90 tests**. It covers the nine supplied
hero metadata sets, Quick Test's selection-to-deal transition, and the existing
lord/capability, privacy, stale-action, and card-conservation paths. Known
boundary: hero selection is complete for the Standard roster, but only the
already implemented hero capabilities are executable; metadata-only generals
remain selectable without new rules behavior.

Recommended next work: the next individually verified Standard hero capability.

## Three faction lords — 2026-09-20

Cao Cao, Liu Bei, and Sun Quan are now implemented through the completed
semantic response/trigger architecture. Cao Cao's Jianxiong is a target-owned
`damage_suffered` trigger that returns the exact physical damage card(s) before
discard; Hujia is a delegated Dodge response offered to living Wei characters
in action order. Liu Bei's Rende is a Play Phase `trigger` with private hand
card and living-target projections, one recovery after two cards in the phase,
and Jijiang delegates an Attack response to living Shu characters. Sun Quan's
Zhiheng is a once-per-Play-Phase discard-and-draw action, and Jiuyuan is part of
the canonical Peach rescue transition for another Wu rescuer.

No hero-specific HTTP action, provider-specific client branch, or public
private-hand projection was added. Active skills use the generic `trigger`
command; Hujia/Jijiang use `respond` and the existing response continuation.
Attack, Group, and Duel damage continuations preserve their physical card
identity for Jianxiong. Quick Test now opens the shared hero-selection phase
before preserving the established Guan Yu / Sima Yi / Zhao Yun / Xiahou Dun
choices as the first deterministic options. The shared controller and private
actor projection are covered by the Quick Test API fixture.

The deterministic Worker/D1 suite now contains **90 tests** and includes
Rende, Zhiheng, Jianxiong, Hujia, Jijiang, card conservation, private
projection, and delegated multi-seat response assertions. The next milestone
is the next individually verified Standard hero; keep the lord state and
canonical protocol boundaries intact.

## Ganglie source-choice prompt and hero information — 2026-09-20

The mandatory Stauchness/Ganglie consequence now carries a generic trigger
description into `currentAction`: after a non-Heart Judgement, the damage
source must choose between discarding exactly two cards from their hand or
taking 1 damage from Xiahou Dun. Equipment and Judgement Zone cards are
explicitly excluded, and the shared choice dialog renders both the rule text
and the legal choices. The API still owns the eligibility and card-count
validation.

Xiahou Dun's hero information now identifies the skill as **Stauchness /
Ganglie** and shows the complete rule wording, including the exact discard
count and hand-only source. Regression rendering covers the hero dialog and
the mandatory trigger prompt; the existing API Ganglie source-choice tests
remain green.

## P1 sourced-damage / Group continuation correction — 2026-09-20

The post-damage `damage_suffered` event is now applied consistently after
nonlethal damage from a living player source. Raining Arrows and Barbarian
Invasion no longer finish a damaged target directly: the shared transition
updates HP, resolves Dying first when lethal, and persists a generic
`TriggerPending` for Stauchness/Ganglie. Its serializable continuation carries
the suspended canonical Group response, so declining or resolving the reaction
advances to the next living target and preserves held cards, `remainingIds`,
`resolutionId`, presentation barriers, and the one final AOE discard.

The same boundary now covers failed Eight Trigrams Attack Judgements, Duel
losses, Rock Cleaving Axe forced damage, and sourced damage caused by
Stauchness, including nested post-damage provider discovery. Source-less
Lightning remains source-less and cannot invent a Ganglie source. No AOE-card
or Xiahou-specific route branch was added. API coverage covers both Group
cards, decline and Judgement acceptance, next-target resumption, discard-once
conservation, and Quick Test perspective/privacy.

The clean Worker/D1 validation now passes **88 / 88**. The next milestone
remains the next individually verified Standard hero; do not begin it until
this correction has been merged and its exact-head CI/deployment verification
is green.

## Sima Yi — Retaliation / Fankui — 2026-09-20

The current official Standard General Card catalogue prints Sima Yi's first
skill as **Retaliation**: “After you take damage, you may obtain 1 card from
the character that inflicted the damage.” The official Standard rulebook puts
this after damage is taken, distinguishes one injury/damage event from damage
points, and defines the source's Playing Area as Hand, Equipment Zone, and
Judgement Zone. The implementation therefore offers it once after qualifying
nonlethal damage, with a random/index-key hand choice or a selected public
Equipment/Judgement card. A source with no eligible card produces no trigger;
an unavailable source or stale selected card ends/rejects the reaction through
the normal continuation boundary.

Retaliation is a `TriggeredEffect` provider for the shared `damage_suffered`
event. The event is now provider-agnostic: it discovers live options from the
post-play state, records `resolvedEffectIds`, reopens the same event for any
remaining provider with a fresh presentation barrier and response timer, and
resumes the stored continuation once all reactions finish or are declined. The
semantic outcome is provider-neutral `gain_target_card`; there is no Fankui
HTTP action, `pendingFankui` DTO, or Sima Yi branch in `app/page.tsx`.

The generic `target_cards` projection exposes only the source ID, hidden-hand
keys, public card IDs, and a one-card min/max. Hidden source cards remain
private until resolution; public cards are logged/presented normally. Tests
cover decline, hidden/public acquisition, empty and disappearing sources,
stale and concurrent submissions, card conservation, privacy, Quick Test
perspective, provider exhaustion, and Stauchness regressions. Guicai is
unchanged, and the default four Quick Test heroes remain unchanged.

The full clean Worker/D1 validation now passes **85 / 85**. Recommended next
work is the next individually verified Standard hero; Cao Cao, delegated Lord
skills, a general active-skill framework, and compatibility DTO cleanup remain
outside this round.

## Quick Test Xiahou Dun fixture — 2026-09-20

The default four-seat Quick Test now assigns Xiahou Dun to Player4, replacing
the former Zhen Ji assignment so the newly implemented Stauchness/Ganglie
ability is immediately available in the product test game. Guan Yu, Sima Yi,
and Zhao Yun remain in Players 1–3 with their existing seeded cards and
capability coverage. Luoshen tests explicitly reassign the deterministic
Player4 fixture to Zhen Ji, so that coverage remains available without
changing the default Quick Test roster again.

## Hero name presentation — 2026-09-20

Hero names on the in-game player cards are now displayed larger and with
stronger visual emphasis, while retaining compact responsive sizes on mobile.
The hero-selection screen, hero information dialog, gameplay semantics, and
currentAction contract are unchanged.

## Xiahou Dun — Stauchness / Ganglie — 2026-09-20

The official Standard Xiahou Dun card was re-opened before implementation. The
current printed English skill name is **Stauchness**; the runtime keeps the
established `Ganglie` identity for the Chinese skill. The verified wording is:
after Xiahou Dun takes damage, he may enter Judgement phase; if the Judgement
card is not a Heart, the damage source must choose to discard exactly two hand
cards or take 1 damage from Xiahou Dun. The official Standard rulebook's
0-HP defeat rule establishes the timing boundary used here: lethal damage
enters the existing Dying flow before the optional post-damage reaction.
The correction and source links are recorded in
`docs/STANDARD_HERO_REFERENCE.md`.

Ganglie and Retaliation now share the reusable `damage_suffered` semantic
trigger provider. The damage transition applies nonlethal damage, persists the
generic post-damage continuation, discovers all live providers from the
post-play state, and offers the damaged character an optional `TriggerPending`.
Acceptance starts a real shared Judgement; `judgement_revealed` therefore gives
Sima Yi's Guicai its normal replacement window. The final card, not merely the
original reveal, determines the result. A qualifying final card opens a
mandatory source-owned generic choice with server-projected `cardCountByChoice`
metadata; the discard-two and damage consequences use ordinary discard, damage,
and Dying primitives. If the source is no longer available, the continuation
resumes safely without a bespoke action.

No Xiahou-specific HTTP action, public `pendingGanglie` DTO, client hero-rule
branch, or new protocol action was added. The UI reads `currentAction` and the
existing generic trigger/choice components. API coverage now includes decline,
Heart/non-Heart results, Guicai replacement in both directions, insufficient
discard cards, source disappearance, source-choice privacy, Dying caused by
the consequence, card conservation, presentation barriers, and four repeated
concurrent acceptance races. The full Worker/D1 suite passes **79 / 79**.
The exact-head response-race commit and its rerun Cloudflare deployment/smoke
checks are green. The next work remains the next individually verified
Standard hero; Cao Cao, a general active-skill framework, compatibility
projection removal, and route/page refactors are outside this round.

## Canonical response race stale contract — 2026-09-20

The exact-head CI blocker was traced to the canonical response execution race:
two identical submissions can pass the submitted context/action revision before
either reaches the atomic `phase = 'response' -> phase = 'resolving'` claim.
The compare-and-set claim remains the single-winner boundary. Attack, Duel,
Group, Negation, Borrowed Sword forced-Attack, and secondary Judgement paths now
distinguish an advanced live decision from a same-state wrong-seat validation
error. An advanced or claim-losing submission returns HTTP 409 with
`stale: true` and a fresh private room projection; ordinary validation errors do
not receive the stale contract.

The API regression now checks exactly one successful response, exactly one stale
loser, one consumed card/effect/log result, no `resolving` stall, and private
hand isolation. A clean local Worker/D1 run passed all 75 tests. The first
post-change rerun also exposed the known persisted `.wrangler/test-state`
contamination in an unrelated Quick Test assertion; moving that state aside and
rerunning from a clean isolated database restored 75/75. Exact-head CI and the
Cloudflare deployment/smoke checks were completed before this hero work and are
green for the response-race commit.

Recommended next work is the next individually verified Standard hero. Preserve
`ResponsePending`, `TriggerPending`, provider-owned semantic
capabilities, `currentAction`, presentation barriers, and the shared Judgement
pipeline.

## Player hero-card information dialog — 2026-09-19

In-game player hero cards now have an accessible info icon. The public card
stays concise, while the private hero-information dialog shows the general's
faction, HP, skill name, and authoritative ability explanation; the Sima Yi
dialog therefore shows Guicai and its Judgement-replacement explanation.
The icon is a sibling control rather than a nested target button, so it does
not alter targeting. Escape and backdrop/close actions dismiss the dialog.
Render coverage verifies the player-card icon, Guicai label, and explanation.
The next milestone remains the next individually verified Standard hero.

## Semantic trigger label stability — 2026-09-19

Semantic trigger controls now retain their player-facing action labels while a
request is in flight. Busy state disables the controls without replacing
Luoshen, Skip reaction, or trigger-dialog labels with transient Resolving /
Skipping text. The generic inline controls, target-card picker, and mandatory
choice dialog use stable wording; the server `resolving` phase, TriggerPending,
actionRevision, stale-action handling, presentation barriers, and request
deduplication are unchanged. Render coverage verifies Luoshen and both dialog
families in ready and busy states. The next milestone remains the next
individually verified Standard hero.

## Played-card suit colours — 2026-09-19

The shared `CardFace` now includes the existing physical-suit class used by
hand cards. A late CSS override makes the rank/suit corner red for Hearts and
Diamonds and dark for Spades and Clubs, after all card-kind rules, while card
names and categories retain their existing kind styling. This covers centre
plays and reveals, private draw cards, Judgement, Bumper Harvest, equipment,
and settled table cards because they share `CardFace`. The render safety
regression now exercises all four suits through the real `GameRoom` Judgement
surface. No gameplay, rules, or state handling changed. Full validation is
required before commit and push. The next milestone remains the next
individually verified Standard hero.

## Sima Yi — Guicai — 2026-09-19

Guicai is implemented through the generic `judgement_revealed` trigger. Every
supported Judgement now reveals its card, persists a serializable purpose and
continuation, offers Sima Yi exactly one hand-card replacement decision, and
then evaluates the selected final card. The original reveal is discarded when
replaced; the replacement leaves Sima Yi's hand and remains the real final
Judgement card for Luoshen, Overindulgence, Rations Depleted, Lightning, and
Eight Trigrams. Declining preserves the revealed card as final. The existing
`trigger` / `decline_trigger` protocol is used, with no Guicai-specific action,
and the public log names Sima Yi's replacement while keeping the original
reveal visible.

Quick Test now assigns Guan Yu to Player1, Sima Yi to Player2, Zhao Yun to
Player3, and Zhen Ji to Player4. Existing Luoshen, Overindulgence, and Eight
Trigrams API declarations cover red-to-black and black-to-red replacement,
decline, hand-only selection, final-card evaluation, and exact card
conservation. Qingguo and Luoshen behavior remain unchanged. Fankui is not
implemented and is the explicit boundary of this round. Full validation is
75 / 75. The next milestone is the next individually verified Standard hero.

## Zhen Ji — Luoshen — 2026-09-18

Luoshen is implemented as the first canonical `turn_start` capability. The
new `zhen_ji_luoshen` provider is available only for Zhen Ji, exposes the
optional `Luoshen` trigger option, and uses the existing `trigger` /
`decline_trigger` protocol. A canonical beginning-of-turn transition now
offers turn-start capabilities once when the turn actually begins; it is not
re-created merely because the room remains in a draw-prefixed phase.

Luoshen uses the shared Judgement mechanism in `game/decisions/judgement.ts`.
The final Judgement card is obtained on black and stays out of discard, then a
fresh turn-start decision is persisted. A red final card is discarded once and
the room enters the existing Draw path, where delayed cards such as
Overindulgence perform a new independent Judgement. The normal central reveal
event and exact presentation barrier are retained, and turn ownership,
stale-action protection, deck reshuffling, and privacy remain server-authored.

Quick Test keeps Guan Yu in Player1 and Zhao Yun in Player3, and now assigns
Zhen Ji deterministically to the unused Player4 seat. The API regression covers
the 7♠ / 4♣ / Q♥ / J♣ sequence, immediate decline, black-then-decline,
red-first termination, no draw-phase re-offer, and exact card conservation.
Qingguo was not modified. Full validation is 75 / 75. The shared Judgement
helper exposes a final-card replacement boundary for future Judgement-changing
skills; Guicai itself remains outside this round. The next milestone is the
next individually verified Standard hero.

## Zhang Fei — Paoxiao — 2026-09-18

Paoxiao now uses the small shared Attack-use-limit capability rather than a
direct Zhang Fei branch in `game/rules.ts`. The capability context is
`{ hero, equipment }` and has two providers: Zhang Fei / Paoxiao and Zhuge
Crossbow. `playPhaseAfterAttack()` and `canDeclareAttack()` consume the
capability result, so ordinary heroes become `play-struck`, while Zhang Fei
and Crossbow users remain in Play Phase and may use repeated Attacks. The
providers are OR-composed, so Zhang Fei with Crossbow has one boolean result;
removing Crossbow from another hero restores the normal limit.

Paoxiao is locked/passive: it has no Hero Skills button, response provider,
HTTP action, or trigger decision. Borrowed Sword forced Attacks continue to
resume from the original turn owner's stored phase, so they do not consume or
alter the Weapon holder's normal Play Phase Attack limit. Normal Attack range,
horses, weapons, Dodge, weapon triggers, damage, Dying, and Borrowed Sword
continuations remain on the existing semantic paths. Existing capability and
API test declarations now cover ordinary second-Attack rejection, Zhang Fei
second/third Attacks, Crossbow repetition, Crossbow removal, and the combined
provider result. Full validation passes 74 / 74. The next milestone is the
next individually verified Standard hero.

## Zhao Yun — Longdan — 2026-09-18

Zhao Yun's Longdan is implemented through two registered semantic response
providers: a hand Dodge can satisfy Attack as `zhao_yun_dodge_as_attack`, and a
physical hand Attack can satisfy Dodge as `zhao_yun_attack_as_dodge`. Both
providers reject equipped-card costs, preserve canonical `respond` semantics,
and carry the narrow `playedAs: "attack" | "dodge"` presentation marker through
response options, execution, room normalization, timeline events, and the
client GameEvent type. The Play Phase projection exposes only eligible hand
Dodge cards through `playPhaseActions`; the dedicated LONGDAN Hero Skills
control enters that mode and submits the existing `play_card` with
`playAs: "attack"`. Response Longdan choices use the existing `respond` plus
`providerId`, while native physical cards remain the implicit default and the
dedicated control suppresses duplicate generic Longdan buttons. Longdan mode
clears on every `actionRevision` and when its projected capability disappears.
Existing capability, room-safety/render, and API declarations now cover both
directions, native-card fallback, marker preservation, and Borrowed Sword's
forced Attack requirement. Full validation passes 74 / 74. The next milestone
is the next individually verified Standard hero.

Quick Test now assigns Zhao Yun to Player3 and seeds that opening hand with
Blue Steel Sword, Dodge, and Attack, so both Longdan directions are available
immediately from the single-controller test table. Player1 remains Guan Yu
with the Wusheng opening hand; the existing random Yin-Yang Swords and
Borrowed Sword allocation still uses the remaining seats with opening capacity.

## Yin-Yang attacker draw presentation — 2026-09-18

The Yin-Yang Swords attacker-draw outcome now writes a privacy-filtered draw
card event. The attacker receives the actual card in the existing private
centre-card presentation, while other seats receive no card details. API
coverage verifies both the attacker view and the target privacy boundary. The
next milestone is the next individually verified Standard hero.

## Hand-card suit colours — 2026-09-18

Hand cards now receive explicit suit-colour classes during rendering. Hearts
and Diamonds show their rank and suit in red; Spades and Clubs remain black.
The render safety regression now covers a red Heart in a player's hand. The
next milestone is Zhao Yun — Longdan.

## Yin-Yang Swords mandatory timeout fallback — 2026-09-18

Yin-Yang Swords now projects the optional `timeoutChoiceId: "draw"` metadata
through the generic TriggerOption, `currentAction.triggerOptions`, and room
normalization. When its mandatory trigger reaches the existing response
deadline, the browser first uses a legal `decline_trigger` if one exists;
otherwise it submits the existing `trigger` action with the provider ID and
the projected timeout choice. This defaults Yin-Yang to attacker draw without
discarding a random hidden card. Manual draw/discard behavior, the centred
choice dialog, and the no-Skip contract remain unchanged. Existing Yin-Yang
capability, API, normalization, and render coverage was extended without a
new test declaration; the next milestone is Zhao Yun — Longdan.

## Random Quick Test Yin-Yang and Borrowed Sword opening cards — 2026-09-18

Quick Test now removes one physical Yin-Yang Swords card and both physical
Borrowed Sword cards from the shuffled Standard deck and deals them to three
distinct randomly selected seats that still have opening-hand capacity. The
existing fixed Player1–Player3 seeds remain unchanged, every seat still
receives exactly four opening cards, and the cards cannot remain duplicated in
the deck. The existing Quick Test API regression now verifies the exact
one-plus-two card counts in opening hands, absence from the remaining deck,
distinct seats, and four-card hands. Normal multiplayer openings are
unchanged. Recommended next work is the next individually verified Standard
hero.

## Centre card presentation timing — 2026-09-18

The shared centre card and card-group presentation now lasts 2 seconds, reduced
by one second from the previous 3-second duration. React's optimistic/incoming
presentation timeout and the shared `--played-card-display` CSS animation are
now synchronized at 2 seconds, so the centre display and card flight settle
together. Response barriers, decision timers, informational messages, and
private-draw timing are unchanged. The next work remains the next individually
verified Standard hero.

## Yin-Yang Swords choice UI — 2026-09-18

Mandatory semantic trigger choices now open directly when their projected
decision is ready instead of rendering a provider activation button. The
centred table dialog shows the projected choices, uses the player-facing
“Keep hand — attacker draws 1 card” wording, and has no Skip reaction. The
discard branch shows exactly the server-projected `eligibleHandKeys` as
readable concealed card backs, accepts exactly one `hand:N` key, and confirms
through the existing `trigger` action with `providerId`, `choice`, and optional
`cardKeys`. A no-hand projection therefore renders only the attacker-draw
choice. Existing render coverage was extended without adding a test
declaration; the server capability and protocol are unchanged. Full
validation remains required before commit and push. Recommended next work is
the next individually verified Standard hero.

## Passive equipment effect notices — 2026-09-18

Passive Attack prevention now uses a shared server presentation helper. When
Nio Shield blocks a black Attack, the authoritative timeline receives a public
informational message such as “Nio Shield blocks Host's black Attack. No damage
is dealt.” with `effectNotice: true`; the same path covers normal, Halberd,
Borrowed Sword, Yin-Yang continuation, and weapon follow-up Attacks. The room
normalizer now preserves `effectNotice`, so each viewer gets the brief on-table
“EFFECT TRIGGERED” notice as well as the foldable Game Messages entry. These
messages never become presentation barriers and do not delay decisions, timers,
or card animations. The existing Nio Shield API regression now verifies the
notice for normal and Halberd black Attacks; the full suite remains 74 / 74.
Recommended next work is the next individually verified Standard hero.

## Borrowed Sword Attack ownership — 2026-09-18

Borrowed Sword now records the forced Attack as `origin: "borrowed_sword"`
while keeping the Weapon holder as the authoritative Attack source. A separate
`resumePlayerId` carries the original turn owner through Attack response,
`attack_targeted`, Dodge, `attack_dodged`, `damage_about_to_apply`, weapon
follow-ups, and Dying, so an out-of-turn holder reaction is accepted without
turning the Borrowed Sword user into the damage source and control returns to
the original turn owner after resolution. The existing Borrowed Sword API
coverage now verifies those persisted identities and the damage/Dying path;
the suite remains 74 declarations and passes 74/74. Recommended next work is
the next individually verified Standard hero.

## Frost Sword concealed-card CSS fix — 2026-09-18

The generic target-card picker now uses `concealed-card` for hidden Hand
buttons instead of the global `hidden` class, which Tailwind defines as
`display: none`. The semantic `item.hidden` property and authoritative
`eligibleKeys` projection are unchanged. Existing render coverage now checks
the four hidden Hand buttons' labels and picker-specific class and rejects the
standalone Tailwind class. The existing Frost Sword API projection assertions
still verify four `hand:N` keys, the eligible equipment ID, and preservation
through `normalizeRoomData()`. Temporary Quick Test diagnostics were removed.
Recommended next work is the next
individually verified Standard hero.

## Frost Sword picker eligibility source of truth — 2026-09-17

The centred generic `target_cards` picker no longer reconstructs hidden Hand
choices from `target.handCount`. It now sorts and renders every `hand:N` key
provided by authoritative `selection.eligibleKeys`, keeping `handCount` as
presentation information only. Equipment remains limited to cards in the
target's Equipment Zone whose IDs appear as eligible non-hand keys, so Kirin
Bow still shows only eligible Mounts and Frost Sword shows its eligible hidden
Hand cards plus eligible Equipment. Existing stale-key filtering and min/max
enforcement remain unchanged. Existing render coverage now proves that four
server-projected Hand keys render even when the presentation count is zero;
the full Worker/D1 suite remains 74 / 74. Recommended next work is the next
individually verified Standard hero.

## Centred generic target-card picker — 2026-09-17

The inline trigger `target_cards` controls have been replaced by one shared
picker inside `.play-table`. It is centred over a roughly 72% dimmed table so
the player seats remain visible behind it, uses a dark gold-bordered panel, and
keeps 104x146 card faces readable on desktop and mobile. Hidden Hand positions
render as large `?` cards; eligible Equipment renders through the existing card
face; selection is limited to the server's opaque `selection.eligibleKeys` and
shows a checked gold selection plus the `selected / max` count. The picker
derives its title and generic subtitle from the projected effect label, target,
eligible cards, and min/max values, with no Kirin Bow or Frost Sword checks in
React. Skip reaction and `Use <effect label>` are now inside the picker, and
the footer renders no `target_cards` controls. Trigger selection state now also
resets with every `actionRevision`; stale selected keys are filtered before
rendering, counting, max/min validation, and submission, so an old key cannot
block a current eligible card. The subtitle remains generic: `Choose 1
eligible card` or `Choose 1–2 eligible cards`. The existing server protocol and
trigger outcomes are unchanged. Recommended next work is the next individually
verified Standard hero.

## Quick Test shuffled opening hands — 2026-09-17

Quick Test now deals every opening hand from one proper Fisher-Yates-shuffled
Standard deck. Player1 receives Frost Sword, Red Hare, Peach and Attack so
Guan Yu's Wusheng capability remains available; Player2 receives Kirin Bow and
Nio Shield; Player3 receives Blue Steel Sword; all unspecified slots, including
Player4's hand, are filled from the remaining shuffled deck. The allocator is
generic and uses physical card identity, so the seeded cards cannot also remain
in the deck or another hand. The existing Quick Test API regression now checks
the opening-hand contract. Recommended next work is the next individually
verified Standard hero.

## Yin-Yang Swords mandatory choice — 2026-09-17

Generic trigger options now support optional `allowDecline` semantics, defaulting
to allowed. Yin-Yang Swords sets `allowDecline: false`, and the server projects
that flag through `currentAction.triggerOptions`, removes `decline_trigger` and
`declineAction` from the target's legal decision, and rejects a direct
`decline_trigger` request. The browser hides Skip reaction from the generic
trigger UI and does not auto-submit a decline when the decision is mandatory.
The existing Yin-Yang Swords regression covers attacker draw, selected-card
discard, no-hand draw-only projection, and decline rejection. No new protocol
verb, provider-specific route, or test declaration was added. Recommended next
work is the next individually verified Standard hero.

## Generic target-card picker eligibility — 2026-09-17

The browser's generic `target_cards` picker now derives hidden Hand indexes
from `selection.eligibleKeys` and renders the Hand section only when at least
one eligible `hand:N` key exists. It renders only those eligible positions;
non-eligible hidden placeholders are omitted. Equipment choices remain
filtered by the same server-projected keys, so Kirin Bow shows only eligible
Mounts while Frost Sword retains eligible hidden Hand and Equipment choices.
No provider-specific React logic, protocol action, or test declaration was
added. Recommended next work is the next individually verified Standard hero.

## Centre card presentation timing — 2026-09-17

The shared centre card display duration is now 3 seconds, reduced by 1 second
from 4 seconds. This applies to both optimistic local card plays and incoming
essential card/card-group presentations; response barriers and server timing
contracts are unchanged.

## Kirin Bow damage-trigger presentation barrier — 2026-09-17

The shared `resolveAttackDamageAboutToApply()` path no longer binds a damage
trigger to its informational “would damage” message. It now asks
`latestDecisionPresentationEventId()` for the latest essential card/cards
presentation in the current Attack resolution, and leaves
`readyAfterEventId` absent when no qualifying presentation exists.
`latestDecisionPresentationEventId()` no longer falls back to informational
events. The browser defensively treats a legacy message/informational barrier
as already ready while continuing to wait for card/cards presentations.

The existing Kirin Bow API regression now verifies the trigger kind, both
Mount IDs, the essential Attack-or-absent barrier, and rejection of the
informational damage message as a barrier. The existing Frost Sword regression
passes through the same shared damage trigger path. No provider-specific
workaround, protocol action, or test declaration was added; the Worker/D1
suite remains 74 declarations and passes 74/74. Recommended next work is the
next individually verified Standard hero.

## Final Wusheng and Borrowed Sword cleanup — 2026-09-17

Borrowed Sword `choose_target` is now a dedicated browser decision: it is
excluded from the generic response discriminator and controls, so Play Dodge
and Skip response cannot appear while the source player chooses the forced
Attack target. The target picker is also withheld while `presentationBusy`.
Wusheng-supplied Play Phase cards no longer use the old card-level “Use as
Attack” / “Play natively” toggle; Guan Yu enters virtual-Attack mode only
through the dedicated Hero Skills button, while the existing `play_card` plus
`playAs: "attack"` contract remains unchanged. The initial Borrowed Sword
route now uses `borrowedSwordEligibleTargetIds()` before accepting the card and
rejects an empty target set, while submission-time target validation remains
unchanged. Existing API coverage was extended without adding test
declarations; the tracked suite remains at 74 declarations. Recommended next
work is the next individually verified Standard hero.

## Wusheng state lifecycle and Borrowed Sword browser flow — 2026-09-17

Wusheng local mode now clears on every `actionRevision` change and whenever
its server-projected capability disappears. Its dedicated button requires the
response presentation barrier for response use and the existing Play Phase
projection plus a clear presentation for play use; Guan Yu's Wusheng response
provider is omitted from the generic explicit-provider list. Borrowed Sword
room projection now includes server-computed `eligibleTargetIds` during
`choose_target`. The browser shows a dedicated prompt, highlights only those
projected targets, and submits the existing
`choose_borrowed_sword_target` action. The resulting holder perspective,
canonical Attack response, exact-Weapon refusal transfer, and normal Dodge
pipeline remain server-owned. No protocol verbs or tests were added; the
tracked suite remains at 74 declarations.

## Hero skill button UI and Wusheng timeline normalization — 2026-09-17

Guan Yu now has a visible Hero Skills area with a Wusheng control. The browser
enters local Play Phase or response selection mode from the server's existing
`playPhaseActions` and `currentAction.options` projections, highlights only the
projected eligible cards, and submits the existing `play_card` with
`playAs: "attack"` or canonical `respond` request. No hero-specific protocol
verb or server branch was added; Borrowed Sword remains a separate card
decision. The room safety normalizer now explicitly preserves
`playedAs: "attack"` on virtual-Attack timeline events. Future triggered hero
skills remain server-projection work; passive or locked skills should remain
status text. Next work is the next individually verified Standard hero.

## Step 7D close response architecture documentation — 2026-09-17

The semantic response architecture cleanup is complete. `ResponsePending` is
the only persisted semantic response decision and `TriggerPending` is the only
persisted semantic trigger decision. Old saved Attack, Duel, Group, and Negation
response states are unsupported; legacy-shaped `ResponseContinuation`
compatibility, response expansion, and builder-conversion compatibility are
removed. `serializePending()` only serializes, and `DeferredStratagem` stores
canonical Duel and Group responses. The next Stage 6 milestone is selecting and
implementing the next scoped Standard hero. No tests or production-code changes
were made for this documentation closure.

## Step 7C remove response builder conversion — 2026-09-17

`ResponsePending` is now the sole semantic Attack, Duel, Group, and Negation
decision shape. Attack, normal AOE, Halberd, and Duel creation build canonical
responses directly; DeferredStratagem stores canonical Duel and Group
responses; and explicit continuation types contain only effect-resumption
data. `serializePending()` now performs JSON serialization only. No tests were
added; the existing Worker/D1 suite remains 74 declarations and all 74 pass.
The next work is the next roadmap item.

## Step 7B.1 reject legacy persisted response kinds — 2026-09-17

Persisted response reads now accept only `kind: "response"`; during the
Response phase, saved top-level Attack, Duel, Group, and Negation decisions
now fail the state-safety check instead of being treated as valid decisions.
Room projection also keeps these unsupported states out of actionable
`currentAction` and returns no legacy response DTO fallback.
Room projection derives `pendingAttack`, `pendingDuel`, `pendingGroup`, and
`pendingNegation` only from `ResponsePending.continuation`, and legacy barrier
recovery was removed. Response construction is canonical at every in-memory
builder boundary, and DeferredStratagem builders store canonical responses.

No tests were added; the existing test count must remain unchanged or lower.
The next cleanup is removal of the remaining builder conversions.

## Step 7A response expansion compatibility removal — 2026-09-17

The four remaining canonical-response expansion consumers are migrated. Audit
recording, playing-state validation, room normalization, and the response timer
now read `ResponsePending`, `TriggerPending`, and other non-response `Pending`
records directly. Room normalization derives the existing public
`pendingAttack`, `pendingDuel`, `pendingGroup`, and `pendingNegation` DTOs from
the canonical response continuation where applicable; `currentAction` and
public field shapes are unchanged.

The old response expansion helper and compatibility types are deleted,
including the route import. The remaining builder conversion boundary was
removed by Step 7C. No tests were added; the existing test count must remain
unchanged or lower. The next cleanup is the Step 7B persisted response
boundary.

## Step 6B Negation canonicalization — 2026-09-17

Negation runtime now uses only canonical `ResponsePending` plus
`NegationContinuation`. `advanceNegation()` reads actor ownership from the
response wrapper and passes only continuation state to deferred resolution.
Initial `startNegation()`, Group/AOE Negation, and Bumper Harvest Negation
windows now persist canonical wrappers, preserving responder order, parity and
depth, held cards, effect target, response target, resolution identity,
presentation barriers, and deferred effects. A no-responder `startNegation()`
path creates the continuation in memory and calls `resolveDeferredStratagem()`
without serializing a Negation decision.

The production route had zero legacy Negation response-shape references and exactly four
generic response expansion calls remained for Step 7. No new tests
were added; the existing suite remains 74 declarations and all 74 pass through
the Worker/D1 runner. Build, lint, and final diff checks are the release gate.
The next milestone is Step 7 generic response-helper cleanup; stop this round
here.

## Step 6A.1 Negation continuation boundary — 2026-09-17

`resolveDeferredStratagem()` now accepts `NegationContinuation`, so deferred
resolution cannot depend on response actor, reason, deadline, or presentation
metadata. When a Negation Judgement leaves no responder, the room persists the
existing canonical `ResponsePending` wrapper with the transitioned continuation
before resolving the deferred effect; a continuation is never serialized as a
standalone legacy Negation response shape. `applySuccessfulNegation()` discards any legacy
`readyAfterEventId`, keeping presentation metadata solely on `ResponsePending`.

Human Negation and Negation Judgement paths still have zero expansion calls.
`advanceNegation()` remains the intentional Step 6B compatibility boundary.
No test declarations were added; the suite remains 74 tracked tests. Stop this
round here.

## Step 6A canonical Negation responses — 2026-09-17

Normal human Negation respond/decline and Negation Judgement outcomes now read
the canonical `ResponsePending` wrapper directly through `negationResponse()`;
they no longer expand it with the old response helper. `applySuccessfulNegation()`
now operates on `NegationContinuation`, and successful counter-Negation opens
the next canonical `ResponsePending` directly. Chain depth/parity, latest card
and player, remaining responder order, held cards, response target, resolution
identity, presentation barrier, and deferred Stratagem state are preserved.

`advanceNegation()` and `resolveDeferredStratagem()` remain the deliberate
Step 6B compatibility boundary. No new test declarations were added; existing
Negation unit and Worker/D1 coverage is the validation target. The tracked
suite remains 74 declarations. The next milestone is Step 6B compatibility
cleanup; stop this round here.

## Step 5E final response-builder typing — 2026-09-17

`game/pending.ts` then separated a response-builder compatibility union (the four legacy
builder shapes) from the remaining Attack/Duel/Negation compatibility-expansion
shapes. Neither old-shape union
contains canonical `ResponsePending`. `GroupResponsePending` narrows canonical
Group continuations for Halberd target triggers and Dying resumes. Runtime
behavior and tests are unchanged; Negation was not started.

## Step 5D.1 finish Group canonical cleanup — 2026-09-17

The former transitional Group response shape was accepted only as an initial
builder input, while the old response helper still never expanded Group.
Halberd `attack_targeted` continuations now store the complete canonical Group response and resume it directly. Canonical Group sequence
projection returns `GroupContinuation`; actor and deadline metadata remain in
`currentAction`. The Negation-embedded Group effect boundary is unchanged.
No new test declaration was added; existing Group assertions now verify
`currentAction` for actor and timing.

## Step 5D remove transient legacy Group response shape compatibility — 2026-09-17

Normal Group/AOE execution now carries `ResponsePending` plus
`GroupContinuation` through target advancement, response outcomes, held-card
accounting, damage, and Dying resume. The former transitional Group response
shape is no longer used for initial deferred card construction, the
Negation-embedded effect boundary, or bounded public compatibility projection.
The old response helper no longer
expands Group responses, and Negation response execution was not changed.
No tests were added; the existing suite remains the validation target.

## Step 5C canonical Group resume after Dying — 2026-09-17

Dying Group/AOE interruptions now store their resumed decision as canonical
`ResponsePending` with `continuation.kind: "group"`. Rescue, Peach holding,
defeat continuation, and final Group discard preserve the existing target
sequence, held cards, resolution ID, and ordering. Group compatibility shapes
remain only as transient views for existing sequence helpers and public DTOs;
they are never persisted after rescue. No tests were added and Negation was not
changed. The next cleanup is the separate Negation response expansion; stop
after Step 5C.

## Step 5B `advanceGroup()` canonicalization — 2026-09-17

`advanceGroup()` now reads canonical `ResponsePending` through
`groupResponse(stored)`. Actor ownership comes from
`response.actorId`, and Group effect state comes from `GroupContinuation`.
The existing downstream helpers still receive a temporary expanded
`legacy Group response shape` compatibility shape, preserving skip-dead-target handling,
automatic impossible-response resolution, semantic Attack/Dodge and Judgement
providers, held cards, and ordered target advancement.

No tests were added; the tracked suite remains 74 tests and is green at 74/74.
The remaining cleanup boundary is Negation response expansion. Negation was
not changed.

## Step 5A Group/AOE response canonicalization — 2026-09-17

Normal Group/AOE response execution now reads `ResponsePending` through the
new `groupResponse()` accessor and uses `GroupContinuation` for effect-resume
data. Both the human Group respond/decline branch and the Group Judgement
outcome no longer called the old response helper; actor, reason, and
deadline come from the canonical response wrapper, while card kind, source,
remaining targets, requirement, resume phase, held cards, and resolution ID
come from the continuation.

The existing Group lifecycle remained intentionally bounded during Step 5A;
Step 5B subsequently migrated `advanceGroup()`, and Step 5C migrated Dying
Group resume storage. Negation was not touched.

Group expansion references for the two migrated paths went from 2 to 0. The
tracked test count stayed at 74 before and after this migration, and the full
Worker/D1 suite is green at 74/74.

## Step 4.3 response helper cleanup — 2026-09-17

The dead pre-canonical response helper layer is removed. The Group response
branch uses its canonical response execution result directly, and the existing
Game Messages test is now included in the Worker/D1 runner. No new tests were
added. The suite remains at 74 tracked declarations and now executes all 74.

The remaining response expansion calls were intentionally limited
to the current Group/AOE and Negation compatibility boundaries. Step 5A has
removed the two normal Group response/Judgement expansions; `advanceGroup()`
and the Dying Group resume storage remain for Step 5B, and Negation remains
unchanged.

## Step 4.2 response-capability legacy-test cleanup — 2026-09-17

The inactive bot surface is now removed. Quick Test seats use the shared human
controller token, hero selection remains explicit for every seat, and the API,
client, trigger helpers, pending schema, and CSS no longer expose bot behavior.
There are no existing rooms or saved games requiring bot-token compatibility.
Bot-only API flows and appended bot scenarios were deleted while retaining the
listed equipment, hero, response, trigger, Dying, privacy, stale-safety, and
human multiplayer invariants.

This pass reduced the suite from 82 executed tests after the prior consolidation
to 73 executed tests (74 tracked declarations). The deleted tests covered bot
turn scheduling, autonomous responses, bot Negation/Harvest/Duel behavior, and
duplicate bot variants of human capability tests.

Removed the pre-canonical helper-selection regression and the redundant generic
Negation provider-extension regression. Current response-decision tests now use
`ResponsePending` for Attack, Duel, and Qingguo/other Dodge provider resolution.
`canRespondWithAttack` and `canRespondWithDodge` query `getResponseOptions()`
directly, and the browser's Serpent Spear availability check uses the canonical
provider projection. The bounded Group/AOE compatibility adapter now uses the
canonical response execution result directly; Group/AOE and Negation migration
were intentionally untouched.
The response-capabilities file is 24 tests before this cleanup and 22 after.

The follow-on test consolidation groups the pure Dying, private-hand,
Game Messages, room-safety, and render assertions without dropping their
coverage, and removes redundant response-capability cases plus inactive bot
coverage. The tracked test declarations are now 74. Human multiplayer,
required equipment and hero capability proofs, canonical provider resolution,
and trigger continuation regressions remain.

Recommended next work: proceed to the planned Group/AOE cleanup only after
reviewing its compatibility boundary.

## Stage 6 architecture cleanup — canonical protocol only (2026-09-17)

The semantic gameplay protocol is now the only supported protocol. Response and trigger requests use only `respond`, `decline_response`, `trigger`, and `decline_trigger`; old clients and persisted in-progress legacy decisions are unsupported. `currentAction` is the authoritative client decision contract. The deleted compatibility action module, dead saved-room `advanceFrostSword` / `advanceRockCleaving` / `advanceGreenDragon` adapters, and provider-specific HTTP branches must not return. `TriggerPending` is now the only trigger decision in the persisted `Pending` union; `asTriggerPending()` accepts only `kind: "trigger"`. Attack responses use `ResponsePending` and its `AttackContinuation` directly for human, Judgement, timer, trigger-after-Dodge, damage, stale, and privacy paths. Duel responses use `ResponsePending` and its `DuelContinuation` directly for human, Judgement, loss, actor-switch, and next-decision paths. `advanceGroup()` and Dying Group resume now use canonical `ResponsePending` plus `GroupContinuation`, and Negation uses canonical `ResponsePending` plus `NegationContinuation`. Old Attack/Duel/Group/Negation saved response states, response expansion, and builder-conversion compatibility are unsupported. Canonical semantic trigger continuations remain unchanged.

Domain continuation data remains because the canonical engine uses it to resume Attack, Duel, Group, Negation, and trigger effects. `serializePending()` only serializes the canonical pending value; `DeferredStratagem` stores canonical Duel and Group responses, while browser decision controls come from `currentAction`.

Guan Yu Wusheng separates eligibility from intent. Native card behavior is the default; `playAs: "attack"` is required for an explicit red-card virtual Attack and is validated against live authoritative state. The physical card ID is conserved and only virtual use receives `playedAs: "attack"`. Hero #2 is outside this round.

## Stage 6 Round 1 complete — Standard roster reconciliation and Guan Yu (2026-09-16)

The runtime Standard roster now has one authoritative source in
`game/heroes.ts`: `STANDARD_HEROES` contains the owner-verified 31-general
roster using official Wei/Shu/Wu/Qun names. Normal multiplayer and Quick Test
both use this registry. Yue Jin, Yu Jin, Zhuge Liang, Lady Gan, Gongsun Zan,
and Pan Feng are metadata-only. Yuan Shao, Yan Liang & Wen Chou, and Pang De
remain in `LEGACY_HEROES` for saved-room readability and gender projection but
are excluded from new Standard selection.

The official current Guan Yu Standard card reads, “You may use or play a Red
suited card as an [Attack].” Wusheng is implemented as the explicit semantic
`guan_yu_red_card_attack` provider. It discovers/revalidates red-suited hand
cards, keeps the physical source card ID and suit, supports Play Phase virtual
Attack use and all existing semantic Attack requirements, and flows through
the canonical target, Dodge, Armor, damage, Dying, and continuation paths.
Equipped cards are not eligible because they are not in the acting hand zone.
Quick Test now names the four human-style seats Player1 through Player4 and
assigns Guan Yu plus a guaranteed red Wusheng-capable opening card to Player1.

The Play Phase projects provider-owned `currentAction.playPhaseActions` only to
the acting seat. The browser consumes those `cardId` / `canPlayAs` mappings for
Attack target, range, Halberd, one-Attack-per-turn and button state; it does not
duplicate Wusheng eligibility. `playPhaseUse: "attack"` explicitly separates
active virtual Attack use from a response-only Attack requirement provider.
Borrowed Sword preserves its Nio Shield passive point, then uses canonical
semantic Dodge discovery rather than checking only for a physical Dodge card.

No universal hero framework, Guan-Yu-specific pending type, or central
Attack/Duel/AOE/Borrowed Sword hero branch was added. The deterministic
capability and roster regressions cover selectable membership, exclusions,
legacy projection, provider eligibility, non-Guan-Yu/black-card rejection,
stale card revalidation, and semantic execution. Full release validation and
the exact pushed SHA are recorded in the final task report.

The architecture review is complete. Play Phase Wusheng, response parity, and
the browser projection are included in the completed hardening scope. The next
milestone is selecting and implementing the next scoped Standard hero.

### Final closure notes (2026-09-17)

### Reported gameplay fixes (2026-09-17)

Quick Test now derives assigned seats' HP from their selected hero definitions and applies the Lord +1 maximum-HP rule. Guan Yu is a 4-HP hero, so the seeded Player1/Lord test seat correctly starts at 5/5 HP instead of the old hardcoded 3/3.

Raining Arrows was rechecked through the canonical browser response action: the acting target can consume a Dodge, while declining applies 1 damage and advances the global sequence to the next living target. A dedicated API regression covers both outcomes.

Borrowed Sword target selection now reaches the existing canonical `choose_borrowed_sword_target` route: the browser marks opponents with Weapons as selectable, so the card is not optimistically rolled back because no target was submitted. Defensive-horse replacement remains slot-based, allowing Yellow-Hoofed Flying-Lightning to replace Hex Mark and preserving the replaced card in the discard path. Triggered equipment/hero-capability outcomes now append an informational `effectNotice` timeline message containing the resolved provider label; Game Messages retains it and the board briefly shows the same notice. The message is outside the sequential presentation queue and cannot block a response, timer, turn, or exact `readyAfterEventId` barrier.

The final presentation/client-parity pass adds `playedAs: "attack"` to virtual
Attack card events and semantic response outcomes. Physical Card.kind and card
identity remain unchanged for conservation, colour, history and stale checks;
the marker drives the user-facing description and prevents equipment-flight or
Judgement settlement inference from misclassifying the source. Attack-use
availability is projected as `currentAction.canDeclareAttack` from the shared
server helper, rather than inferred from `play-struck` in React. Normalization
preserves canonical `attack_targeted` triggers and `choice` selections without
provider-specific knowledge. The closure regressions cover Quick Test,
Wusheng card variants, Halberd, repeat Attack, Duel/AOE/Borrowed Sword,
Yin-Yang Swords choice submission, semantic Dodge alternatives, privacy,
stale/double submission and conservation.

## Stage 5 complete — delayed Stratagem / Judgement lifecycle (2026-09-16)

Stage 5 is complete and Stage 6 hero abilities is active. Delayed Judgement Zone cards now resolve last-placed-first through one shared selector used by both Judgement-phase Negation discovery and resolution. Lightning and Overindulgence enter their Judgement Zones immediately without a placement-time Negation window; Negation remains available for the delayed effect before its Judgement card is drawn. Lightning's verified Negated-effect exception transfers directly to the next eligible living character's Judgement Zone, or is discarded only when no eligible zone remains. Standard-card Worker/D1 regressions cover ordering, transfer, placement timing, pre-draw Negation, intact neighboring delays, stale/duplicate draws, and conservation through the lifecycle. The shared resolver emits one cancellation-history entry per delayed effect, and the stale-action regression now submits a captured pre-resolution revision after the first delay has resolved.

The narrow Stage 5 audit found no remaining shared Standard-rule correctness gap in this scope. Do not redesign ResponsePending/TriggerPending, add bot functionality, or begin broad hero abilities in the completed Stage 5 paths.

## Borrowed Sword hardening (2026-09-16)

Borrowed Sword now persists Stage 2 as the canonical `ResponsePending` attack requirement. Current execution uses only `respond`/`decline_response`; legacy names are ingress aliases. The Worker/D1 regressions cover actor ownership and private provider projection, duplicate target/response/decline races, stale action revisions, exact Weapon-ID transfer, disappearance/replacement safety, physical Attack and Serpent Spear providers, ordinary Dodge, and Yin-Yang Swords `attack_targeted` continuation. The shared Attack, Dodge, damage, and Dying pipelines remain authoritative. Re-run `npm test`, `npm run lint`, `npm run build`, and `git diff --check` before the next milestone.

Stage 2 human response timing is also covered: `start_response_timer` arms canonical response decisions, including non-legacy continuations, with the normal 30-second deadline and remains idempotent on repeated requests. The stale-revision regression submits the captured Stage-1 revision after the actor changes to the Weapon holder.

Use this file to continue development in a new chat. Start from the latest `main` branch, then read `AGENTS.md`, `README.md`, and `ROADMAP.md` before changing code.

## Completed architecture invariants

The semantic execution architecture milestone is **complete**. Borrowed Sword is implemented through the existing deferred-Stratagem Negation boundary and normal Attack continuation. Its Stage 2 decision now re-discovers semantic Attack providers from live holder state, including Serpent Spear, and transfer verifies the persisted Weapon ID before moving any card.

Completed architecture guarantees:

1. Negation scheduling discovers all legal `negate` providers, preserves seat order, advances declines correctly, toggles parity on successful Negation, and opens the correct counter-window.
2. Judgement is resolved once into a semantic satisfied/unsatisfied outcome and then enters the shared canonical response-continuation path for Attack, Group, Duel, and Negation.
3. Secondary-response prerequisites are validated before an atomic room claim, or every claimed path deterministically restores/continues state without a resolving no-op.
4. Human seats use the same semantic trigger continuation executor for `attack_dodged_event` and `damage_about_to_apply_event`.
5. Exhausted damage reactions apply exactly one original damage and enter Dying/rescue when necessary; exhausted Attack reactions finish without adding damage.
6. End-to-end regressions prove Negation order/parity, Judgement success/failure, damage/Attack trigger exhaustion, and human-seat guarantees across ordinary responses and trigger chains: authoritative actor ownership, correct perspective switching, private hand/provider projection, wrong-seat rejection, stable resolution identity, stale/double-submission safety, and no room left in `resolving`.
7. Synthetic providers are isolated to explicit test-Worker registration and are absent from production registries.

All seven guarantees are green. The final compatibility isolation, canonical-client, direct-event-ID, and synthetic-provider isolation round is complete for this milestone; the canonical response/trigger protocol is now the only supported architecture while card work resumes.

## Current baseline

Successful Judgement-based Negation now uses one transitioned parity/depth state for both counter-window and no-responder resolution. The no-responder branch persists that transitioned pending state in the same resolving update before invoking the deferred resolver.

Group/AOE target advancement now creates a fresh public presentation event and assigns that exact event ID to the next response barrier. Canonical pending projections do not infer missing barriers from history; only legacy persisted pending shapes use that migration fallback.

As of 2026-09-16 the working baseline includes the coherent semantic architecture package and the complete Physical Standard 108-card deck. Damage now preserves actual resulting HP across Attack, Duel, AOE, Lightning, and semantic forced damage. Dying begins at hp <= 0; each Peach restores 1 HP; Dying ends only after hp >= 1 or rescue is exhausted. Each Dying event has one fixed action-order rescue pass: a player may use multiple Peaches consecutively, while passing or exhausting the opportunity advances permanently to the next remaining actor. Partial rescue keeps the same interruption, private rescue projection, zones, role secrecy, rewards, penalties, victory, and continuation unchanged; defeat cleanup remains exactly once. Recommended next work is fresh full validation and production multiplayer smoke testing for this milestone.

Repository and service:

- Workspace: `/Users/jingedai/Documents/ChatGPT/WTK`
- GitHub: <https://github.com/dmoneyUK/three-kingdoms>
- Branch: `main`
- Live Worker: <https://three-kingdoms.dai-jinge.workers.dev/>
- Cloudflare config: `wrangler.jsonc`
- Production workflow: `.github/workflows/deploy.yml`

The active ruleset is **WTK Standard only**. Use `docs/OFFICIAL_CARD_REFERENCE.md`, the official WTK Standard rulebook, and YOKA/WTK official English terminology. Do not add Endless Legends or Kingdom Wars cards unless the owner changes scope. Do not ship official artwork without permission.

## Product state

The game is a playable browser alpha for small private groups. Normal human multiplayer and Quick Test both support the main four-player loop, ordered responses, equipment, Dying/Peach rescue, death cleanup, role reveal, rewards/penalties, and core victory paths.

Quick Test is a single-controller table: one token controls four human-style seats and the UI follows the current legal actor while exposing only that actor's private hand. Keep this deliberate perspective-switching model when adding response or trigger decisions. Bot gameplay is legacy/inactive and is not required for new cards.

## Latest presentation work

The foldable Game Messages window is the sole public textual event-history surface. It uses the existing room timeline without an extra request or D1 state, retains the latest 10 public events in chronological order, and deduplicates by authoritative event ID; private draw events remain excluded. Informational message events remain history only and are filtered out of the blocking presentation queue. Essential card and card-group events retain their existing centre card-only presentation and settlement animations; `readyAfterEventId` remains the exact event gate for response controls and response timers. Quick Test and normal multiplayer therefore wait for the card presentation, not for informational history visibility or queue emptiness. Equipment uses its canonical rich card event for the public message, with no redundant semantic equipment history event.

The active game table now presents all four seats in a responsive board, with the in-game top bar removed. Each player square groups hero name, HP, hand count, compact equipment and Judgement cards; active and self seats remain visually identifiable, and distance is intentionally omitted from player cards. Legacy radial seat markup remains hidden for compatibility while the new board owns the visible layout.

The leave-game Exit control now lives on the game surface, so it remains available with the top bar hidden. The Game Messages panel remains the foldable event window; the separate popup Event History window and its top-bar control were removed. The redundant turn-status strip was removed to give the player board more room.

Secret roles are rendered only in the local player square. The Negation skip button retains its final action label during submission instead of exposing transient “Skipping” text, preventing visible button flicker. Compact equipment and Judgement tiles now share a fixed card aspect ratio, and player squares have additional vertical room for their zones.

Equipment cards in the Equipment Zone and delayed cards in each Judgement Zone retain an info button linked to the existing card explanation dialog. The controls are separate from equipment response-cost selection and do not change gameplay state.

Fresh validation for this change: `npm test` passed all 80 tests (including the latest-ten, rolling-retention, deduplication, and private-message projection tests); final `npm run lint`, `npm run build`, and `git diff --check` also passed.

Room GETs are read-only. Presence uses a throttled heartbeat. Tests use an isolated Miniflare D1 under `.wrangler/test-state`, not the normal local development database. Human response clocks are armed only after the visible decision becomes available; duplicate timer starts are idempotent.

## Architecture that is now established

### 1. Canonical semantic response decisions

`game/pending.ts` persists `ResponsePending` as the canonical wrapper for Attack/Dodge/Negation response periods:

```ts
type ResponsePending = {
  kind: "response";
  actorId: string;
  requirement: ActionRequirement;
  reason: string;
  deadline?: number;
  resolutionId?: string;
  continuation: ResponseContinuation;
};
```

The continuation remains domain-shaped (Attack, Group, Duel, or Negation)
because the canonical engine needs effect-resumption data. `serializePending()`
writes only the canonical wrapper; old persisted response decisions are
unsupported.

`currentAction` v3 is the private authoritative action view. For semantic responses it exposes the requirement, canonical `respond` / `decline_response`, provider options, deadline, actor, and presentation barrier. The browser must not infer legal response options from hero/equipment state.

### 2. Response providers own capability semantics

`game/responses.ts` owns semantic requirements and the provider registry. Physical Attack/Dodge/Negation cards are providers alongside equipment and hero abilities.

Current important providers:

- physical Attack / Dodge / Negation cards;
- Eight Trigrams Formation as an explicit Dodge provider;
- Serpent Spear as an explicit Attack provider;
- Zhen Ji Qingguo as an explicit Dodge provider using one black hand card.

The response interaction invariant is deliberate:

- **0 or 1 implicit provider** for the ordinary/default physical-card route;
- **0..N explicit providers** for equipment or hero abilities.

Ordinary physical response cards can therefore be selected directly. Alternative abilities require an explicit choice. The registry throws if two implicit providers are simultaneously available.

A provider returns a semantic execution result, not an HTTP action. Immediate responses return `status: "satisfied"`; abilities requiring a secondary effect return `status: "requires_resolution"`.

### 3. Generic provider-owned Judgement

Eight Trigrams no longer maps `judgement` to a special Eight-Trigrams route. It requests a generic Judgement resolution and owns the success predicate (red result = Dodge). The generic engine reveals/discards the Judgement card and resumes the Attack/AOE continuation according to the result.

This is the model for future hero/equipment abilities that perform Judgement: the provider owns the rule for interpreting the revealed card; central Attack code must not know the provider identity.

### 4. Passive and triggered capability modules

Nio Shield is implemented through the passive Attack-modifier registry before a Dodge requirement is created.

`game/capabilities/triggers.ts` now defines a real executable trigger contract with:

- trigger event;
- option discovery;
- selection constraints;
- live revalidation / resolution;
- semantic execution output.

Representative migrated triggers:

- Green Dragon Blade — `attack_dodged`, select one valid follow-up Attack;
- Rock Cleaving Axe — `attack_dodged`, discard exactly two current Hand/Equipment cards;
- Frost Sword — `damage_about_to_apply`, choose one or two target Hand/Equipment cards and replace the damage with discards.
- Kirin Bow — `damage_about_to_apply`, choose one target Mount in the damaged character's Equipment Zone and discard it before the original damage resumes.

Frost Sword correctly excludes Judgement Zone cards.

Trigger discovery is event-centric and returns **0..N** legal providers. `TriggerPending.resolvedEffectIds` prevents the same optional reaction from being offered twice during one event. The route rebuilds capability-neutral live source/target context and validates the submitted provider against the entire remaining option set. The only trigger commands are `trigger` and `decline_trigger`.

Providers now return a discriminated semantic trigger outcome (`follow_up_attack`, `force_damage`, `prevent_damage`, or `continue_event`) with compiler-enforced payloads. Target-card constraints carry a target player plus opaque `eligibleKeys`; hidden hand IDs are never exposed as card IDs. `game/decisions/triggers.ts` owns the non-terminal `continue_event` transition: it records the resolved effect, reopens the same event with the remaining live options, or immediately resumes its continuation when none remains. `attack_dodged` terminal outcomes now use generic `applyFollowUpAttackOutcome()` and `applyForcedDamageOutcome()` domain functions; canonical execution switches on the semantic outcome and not on Green Dragon Blade or Rock Cleaving Axe.

Legacy provider-specific request-name translation is no longer a live module.
The canonical engine accepts only the semantic response/trigger protocol; do not
reintroduce the removed compatibility action surface.

### 5. Decision-specific presentation barrier

Presentation uses `resolutionId` separately from `actionRevision`. `currentAction.presentation` now contains:

```ts
{
  resolutionId: string | null;
  readyAfterEventId: string | null;
}
```

The client records completed event IDs and opens all response providers, decline, selectors, and the human response timer together only after `readyAfterEventId` has been presented. It no longer waits for the entire unrelated global presentation queue to become idle.

Events already present on initial load/reload are treated as presented; optimistically displayed cards are marked complete when their authoritative event arrives.

## Completed architecture boundaries

### A. Canonical trigger decisions are the public protocol

`TriggerPending` is now the persisted wrapper for weapon reactions. It records the semantic event (`attack_dodged` or `damage_about_to_apply`), the acting player, deadline/reason and a bounded continuation. `roomState()` projects the current actor's private trigger option(s), and the client submits `trigger` or `decline_trigger`. The route recomputes the provider from live equipment/hand/target state and rejects a mismatched or stale provider.

Green Dragon Blade, Rock Cleaving Axe, Frost Sword and Kirin Bow are covered end-to-end through this protocol. Frost now uses the generic `damage_about_to_apply` continuation and semantic `prevent_damage` outcome; Kirin Bow uses the same continuation with a semantic target-card discard outcome. Older pending shapes and action names are unsupported and are not part of the canonical engine.

### B. Decision presentation barriers are now transition-owned

Every newly created canonical `ResponsePending` and `TriggerPending` stores `readyAfterEventId` at the transition that creates it. This includes normal and Serpent Spear Attacks, Duel exchanges, AOE/halberd targets, initial and counter-Negation windows, delayed-card Judgement Negation, and the representative weapon triggers.

`roomState()` consumes the persisted value directly. Decision creators own the exact barrier; log scanning is not part of the semantic response/trigger contract.

### C. Legacy protocol branches are unsupported

The semantic protocol is the only supported gameplay protocol. Old clients and old persisted in-progress legacy response/trigger decisions are unsupported. `currentAction` is the authoritative client decision contract; provider-specific HTTP actions must not be added for future cards or heroes.

The cleanup is complete. Do not reintroduce legacy protocol branches, saved-game response compatibility, response expansion, or provider-specific HTTP actions.

## Match-rule hardening (2026-09-16)

The pure `determineMatchOutcome()` helper now owns the Standard role winner matrix while the room route retains D1 persistence, held-card commit, and terminal transition. Unrescued Dying defeat now passes through one continuation decision: terminal outcome first, then live Group/AOE continuation, live effect resumption, or the next living turn seat when the interrupted owner died. Finished-room projections have no actionable actor/current action. Source-free Lightning remains source-free, so it cannot create rewards or penalties. Focused pure coverage protects Renegade/Traitor compatibility and continuation ordering; the existing API regressions continue to cover role cleanup, AOE stop/continue, rescue races, and post-finish rejection.

Dying / multi-damage — **COMPLETE**. Death / continuation / match outcome — **COMPLETE**. Stage 5 delayed Stratagem/Judgement lifecycle — **COMPLETE**. Stage 6 hero abilities — **ACTIVE**.

## Recommended next work — Stage 6 hero abilities

1. **Implement the next narrowly-scoped hero ability** through semantic provider/capability contracts, with Quick Test, multiplayer privacy, stale safety, and deterministic regressions.
2. **Keep the canonical protocol isolated.** Do not add legacy verbs, pending shapes, response expansion, or provider-specific HTTP actions to the canonical engine.
3. **Keep the completed physical Standard deck stable:** do not reopen its manifest while match-rule correctness work proceeds.

## Standard card roadmap status

The verified active roadmap is 28 card identities. **28 / 28 are currently treated as playable.**

`docs/STANDARD_108_DECK_MANIFEST.md` remains the physical 108-card target. The resolved runtime manifest and local conservation tests are complete; the release gate is the exact-head CI/deployment result.

Borrowed Sword, Blue Steel Sword, Yin-Yang Swords, and Kirin Bow are implemented and dealt. All 28 / 28 verified identities and the physical Standard 108-card deck are complete; the active milestone is match-rule correctness / Dying and multi-damage.

## Key gameplay/rules invariants

- A core rule should request a semantic result (`Dodge`, `Attack`, `Negate`) rather than know every way it can be produced.
- Physical cards, equipment, hero conversions, and future effects provide capabilities around those semantic requirements.
- Passive effects such as Nio Shield happen before the response requirement if the Attack is already prevented.
- Triggered effects happen after the relevant domain event (`attack_dodged`, `damage_about_to_apply`, etc.).
- Server state is authoritative. Options visible to one acting player must not leak to other viewers.
- Presentation may delay an entire decision, but must never enable one legal choice while another legal choice in the same decision is still blocked.
- Human response timers must not begin before the visible decision is ready and must never extend on refresh/duplicate requests.
- Normal GET polling must stay read-only.
- Keep Quick Test perspective switching deterministic and private.

## Validation and release rules

Before a functional release, follow `AGENTS.md`:

- update `README.md` and this handover for functional changes;
- keep deterministic/Quick Test coverage current;
- run build, full tests, lint, and `git diff --check`;
- push the validated commit to `main`;
- use GitHub Actions as the only production deployment path.

Do not claim local tests ran unless they actually ran. A GitHub workflow startup failure is not evidence that the code failed tests; it is also not evidence that the code passed them.
## Step 3.5 complete — prune redundant tests (2026-09-17)

Test cleanup is complete with no production-code changes. The suite now keeps behavioural coverage in the Worker/D1 API and integration paths, including the 108-card physical deck, Dying and match outcomes, private-hand perspective/privacy, canonical `currentAction` safety, real card rules, and semantic response/trigger chains. The duplicate latest-ten Game Messages checks were merged; capability discovery and generic response-decision checks were merged; synthetic capability registry setup/cleanup checks were merged; and source-regex tests for route/page implementation details were removed. The lobby SSR smoke test and focused room-safety rendering tests remain as independent rendering coverage.

The cleanup removed tests that only enforced internal function names, exact source text, or lower-level behavior already proven through stronger API/integration regressions. Attack behavior remains covered through canonical `currentAction` plus `respond`/`decline_response`; no legacy trigger execution or response-alias tests were added. Step 4 Duel canonicalization is complete: Duel uses `ResponsePending` plus `DuelContinuation` directly. Group/AOE and Negation still used the old expansion boundary; the next architecture step was Step 5 Group/AOE.
