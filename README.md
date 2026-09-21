# Three Kingdoms

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

## Quick Game shared-controller setup — 2026-09-21

Quick Game is a single-player controller mode: one local player switches
between four human-style seats and plays each seat in turn. It keeps the normal
Lord-first hero selection and starts through the same `beginMatch()` path as
multiplayer. The opening hands are four cards dealt from the normally shuffled
Standard 108-card deck; no hero or card fixture is injected into production
Quick Game.

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
validation currently passes 97 tests.

The next Wu/Qun hero batch is now playable: Gan Ning (Qixi), Lü Meng
(Keji), Huang Gai (Kurou), Zhou Yu (Yingzi/Fanjian), and Lü Bu (Wushuang).
Qixi uses the canonical Burning Bridges Negation and target-card flow; Keji,
Kurou, Yingzi, and Fanjian are wired into the normal turn/trigger transitions;
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

The three Standard faction lords are now playable through the same semantic layer. Cao Cao has Jianxiong, which can reclaim the exact physical damage card(s), and Hujia, which delegates a Dodge request to Wei characters in action order. Liu Bei has Play Phase Rende card-gifting with one-per-phase recovery after two cards, plus Jijiang delegation to Shu characters for Attack responses. Sun Quan has once-per-Play-Phase Zhiheng and the Jiuyuan rescue modifier for another Wu character's Peach. These abilities project private legal choices through `currentAction` and use only the canonical `respond`, `decline_response`, `trigger`, and `decline_trigger` commands; deterministic Worker/D1 coverage exercises normal multiplayer and the shared multi-seat test fixture. The next milestone is the next individually verified Standard hero capability; the start phase and Quick Game selection contract are now complete.

An English online implementation of WTK Standard, the classic hidden-role Three Kingdoms card game, built for small private groups of friends.

- Play: https://three-kingdoms.dai-jinge.workers.dev
- Source: https://github.com/dmoneyUK/three-kingdoms
- Development handover: [HANDOVER.md](HANDOVER.md)
- Roadmap: [ROADMAP.md](ROADMAP.md)
- Official card reference: [docs/OFFICIAL_CARD_REFERENCE.md](docs/OFFICIAL_CARD_REFERENCE.md)
- Current stage: **playable four-player alpha — 28 / 28 verified Standard card identities and the physical Standard 108-card deck complete; Stage 5 match-rule correctness COMPLETE; Stage 6 Round 1 roster reconciliation, Guan Yu Wusheng hardening and final UI cleanup, Step 4.3 response-helper cleanup, single-controller bot-surface removal, Step 5E response-builder typing, Step 6B Negation canonicalization, Step 7B.1 legacy persisted-response rejection, Step 7C direct response construction, Step 7D response architecture documentation closure, Sima Yi Guicai Judgement continuation, Xiahou Dun Stauchness/Ganglie, and the three faction lords COMPLETE**

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

The shared turn and response engine now uses effective horse-adjusted distance consistently in both UI and API, auto-resolves impossible Dodge responses, and keeps Quick Test at three HP with named mounts in the deck. The Attack card artwork is now part of the shared presentation layer; the next milestone remains the next individually verified Standard hero capability. Attack cards, Duel, AOE, Lightning, and forced damage converge on authoritative negative-HP and ordered Dying rules. After an unrescued defeat, outcome is calculated before exactly one legal continuation: finish, resume the interrupted effect, continue the AOE sequence, or advance to the next living turn owner. The dead saved-room trigger adapters and provider-specific Green Dragon Blade, Rock Cleaving Axe, and Frost Sword continuation branches have now been removed; `TriggerPending` is now the only trigger decision in the persisted `Pending` model, Attack responses now resolve directly from canonical `ResponsePending` plus `AttackContinuation`, Duel responses now resolve directly from `ResponsePending` plus `DuelContinuation`, `advanceGroup()` now reads canonical `ResponsePending` plus `GroupContinuation`, Dying Group resume storage now persists canonical `ResponsePending` as well, and Negation runtime now uses canonical `ResponsePending` plus `NegationContinuation`. Response architecture cleanup — COMPLETE. Dying / multi-damage — COMPLETE. Death / continuation / match outcome — COMPLETE. Stage 5 delayed Stratagem/Judgement lifecycle — COMPLETE. Stage 6 hero abilities — ACTIVE.

## Roadmap

Negation now resolves each target separately: its initial window starts at the target and includes the Stratagem user. Passing is final within that opportunity; playing Negation opens a new counter window after its player. Once everyone passes, parity determines whether the normal Dodge/Attack/Serpent Spear response opens, with a fresh timer. Eight Trigrams can now provide an optional Judgement-based Dodge for both physical and Serpent Spear-formed Attacks. The reusable `attack_targeted` event now supports target-owned decisions and Yin-Yang Swords before Armor/Dodge resolution. Semantic response/trigger architecture, Dying/multi-damage, death/continuation/match outcome, and delayed Stratagem/Judgement lifecycle are complete. Stage 5 is complete; Stage 6 hero abilities is active.

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
