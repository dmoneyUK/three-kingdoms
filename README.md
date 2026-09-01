# Three Kingdoms

An English online implementation of WTK Standard, the classic hidden-role Three Kingdoms card game, built for small private groups of friends.

- Play: https://three-realms-table.dai-jinge.chatgpt.site
- Source: https://github.com/dmoneyUK/three-kingdoms
- Development handover: [HANDOVER.md](HANDOVER.md)
- Current stage: **playable four-player alpha — Standard weapon expansion with ongoing rules-engine stabilisation**

The hosted game is public and does not require a GitHub or ChatGPT account. Players join a room using a room code and keep their session on their device. Refreshing the page restores the active table, and Exit now preserves a one-tap rejoin option for that saved game.

## Current Stage

The project has moved beyond the initial table prototype. A complete four-player match loop now runs with one human and three bots. Turn ownership, ordered responses, death rewards and victory checks are working, and the authoritative Weapon slot now supports three Standard weapons plus weapon-based Attack Range and formed-Attack costs. The current feature focus remains **Roadmap Stage 4 (equipment and distance modifiers)** while Stage 2 rules-engine extraction and regression work continues. Expansion cards and hero-specific abilities remain intentionally deferred.

The playable alpha currently includes:

- automatic roles and hero assignment;
- Lord bonus HP and the Zhang Fei test hero;
- Draw, Play, Discard and Ending phases;
- turn ownership, seat order, distance and attack range;
- a public weapon slot with authoritative equip, replacement and defeat cleanup;
- ordered Attack, Dodge, Duel and global-card responses;
- Peach healing and turn-ordered Dying rescue;
- death, role reveal, defeated-hand cleanup, Rebel defeat rewards and the Lord's Loyalist-kill penalty;
- automatic bot drawing, card play, responses, rescue and discard;
- private card draws and inline, turn-ordered Peach rescue controls;
- table-based card-resolution presentations: each played card zooms into view, settles face-up in play order before its player, remains through the complete response/effect sequence, then joins the sequence-wide discard animation when resolution concludes;
- event history plus a detailed rule-audit trail; and
- a quick-test opening hand containing one of every implemented WTK Standard card, with Negation also seeded into bot hands.

### Implemented cards

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
- Zhuge Crossbow
- Green Dragon Blade
- Serpent Spear

### Recently stabilised

- Refresh and accidental Exit no longer abandon a live player session. The saved device token restores the table automatically after refresh, while Exit returns to the landing screen with a **Rejoin game** button.
- Peach rescue no longer covers the table with a private modal. The acting rescuer selects a Peach from their normal hand and uses **Play Peach**, or advances immediately with **Skip rescue**, while the existing five-second ordered rescue window remains authoritative.
- Burning Bridges and Steal now finish their complete Negation/counter-Negation chain before the source chooses a target card. The post-Negation choice uses the target's current hand, Equipment Zone or Judgement Zone; the initiating stratagem and every Negation remain outside discard until the final choice resolves.
- Serpent Spear is playable with Attack Range 3. Its owner can select exactly two different hand cards to form an Attack during the Play Phase, Duel or Barbarian Invasion response; normal targeting, one-Attack-per-turn, Dodge and ordered-response rules still apply. The two payment cards remain together in the visible resolution sequence, bots can equip and use the weapon, and quick-test mode includes it.
- Green Dragon Blade is playable with Attack Range 3. When its owner's Attack is blocked by Dodge, action returns to the attacker for an ordered five-second decision to play another Attack against the same target or skip. The entire repeated Attack/Dodge chain stays in one table sequence, and bots can equip and use the follow-up.
- Equipped weapons are now rendered as face-up cards in a separate equipment rack beside each player seat instead of as text inside the player panel. The rack is ready to grow into armour and horse slots without crowding the player's identity, HP or hand count.
- Delayed-card Negation now creates a fresh Judgement activation event. A Lightning, Overindulgence or compatibility judgement no longer reopens the original play event and pulls every intervening turn-end discard onto the table.
- Bumper Harvest now follows the multi-target Negation rule: each affected player receives a separate Negation window, one successful Negation skips only that player's choice, later players continue normally, and any unchosen revealed card enters discard only when the complete Harvest sequence finishes.
- Zhuge Crossbow is the first playable equipment card. It enters the owner's public Weapon slot, replaces and discards an existing weapon, remains visible after its play presentation, and removes the normal one-Attack-per-turn limit while equipped. Bots can equip and use it, and defeated equipment plus the Lord's Loyalist-kill penalty now clean up weapon cards.
- Negation can interrupt a stratagem in seat order, supports an explicit Pass action, and can itself be cancelled by a deliberate human counter-Negation. Barbarian Invasion and Raining Arrows now open a fresh Negation window for each target, then continue to later players after one target is protected. Bots defend their own affected character but do not blindly counter another bot's Negation.
- Overindulgence introduces the public Judgement Zone. It can be Negated before placement, cannot be duplicated on one character, reveals a judgement card at the target's next turn, and skips only the Play Phase when the result is not a Heart.
- Lightning can be Negated before placement or judgement, cannot be duplicated on one character, deals 3 source-free thunder damage on a Spade 2–9 judgement, and otherwise transfers to the next eligible living character's Judgement Zone.
- New games, the shuffled deck and the quick-test hand are now locked to the official WTK Standard product list. Rations Depleted is identified as Endless Legends and is excluded; its compatibility code remains dormant so earlier development states are not corrupted.
- Bumper Harvest keeps every revealed card on one shared choice panel, requires confirmation, names the current chooser, and visibly paces every raised selection and shaded confirmation before advancing to the next player.
- Bumper Harvest gains no longer trigger the normal private-draw overlay, so the shared panel remains visible while every later player selects and confirms.
- Opening draws begin immediately, card plays appear on the table optimistically, and Bumper Harvest selection changes never lock the controls while their shared preview synchronises.
- Played cards remain visible for four seconds without waiting for a slower server response, and the matching authoritative event is de-duplicated instead of replaying the same card.
- Attack, Duel, Burning Bridges, Steal, Barbarian Invasion and Raining Arrows now retain every played response card in front of its owner until the complete sequence—including its final card movement or effect—has concluded.
- Judgement reveals, individual discards and grouped end-of-turn discards animate to the discard pile without leaving stale cards in front of a player.
- The table presentation cache is scoped to the latest authoritative response sequence, so cards from completed turns cannot reappear beside players when a later response begins.
- Response countdowns now sit beside the acting player without covering their played-card row. Burning Bridges and Steal show their face-down choices near the targeted player rather than above ME's hand.
- Hand cards now show only rank, suit, official English name and category; full private rules remain available through each card's information button.
- Oath of the Peach Garden remains playable when nobody needs healing; it resolves without changing HP.
- Player 3 → ME is covered by a response-and-round-transition regression test.
- Consecutive bot rounds with Barbarian Invasion and Raining Arrows return control to ME correctly.
- Dying rescue resumes the interrupted global-card response at the correct player.
- A role victory ends an unfinished global response chain immediately.

## Roadmap

### Progress summary

| Stage | Status | Position |
| --- | --- | --- |
| 1. Stabilise the turn loop | Mostly complete; regression-driven maintenance | Core ownership, phase order, repeated rounds, Dying interruption/resumption and response chains are playable and tested. |
| 2. Strengthen the general rules engine | In progress alongside card work | Ordered pending actions and ownership checks are stable; target-scoped Negation covers global cards and Bumper Harvest, and targeted stratagems now use a post-Negation current-card choice state. Shared stratagem, judgement and sequence resolvers still need extraction. |
| 3. Complete the general card set | Standard core expanding with equipment | 17 Standard cards are playable, including three weapons. Remaining Standard weapons now precede Borrowed Sword. |
| 4. Equipment and distance modifiers | In progress — weapon expansion | The public face-up Equipment rack, authoritative Weapon slot and Attack Range, Zhuge Crossbow, Green Dragon Blade and Serpent Spear are playable; more weapons, armour and horses remain. |
| 5. Complete match rules | Partly implemented | Death cleanup, reveal, Rebel rewards, the Lord's Loyalist penalty and main victory paths work; remaining edge cases need expansion. |
| 6. Hero-specific abilities | Deferred | Begins after shared cards and rules are stable. |
| 7. Product polish | Ongoing alongside rules work | Mobile sequence layout, countdown placement, target-card selection and card information are improved; sound, invitations and saved history remain planned. |

### Next milestone

Add **Rock Cleaving Axe** as the next Standard weapon. The milestone will add Attack Range 3 and its post-Dodge two-card discard decision, with explicit ordered ownership, timeout/skip handling, bot use, sequence retention and deterministic tests. Borrowed Sword remains deferred until the classic weapons are established.

### 1. Stabilise the turn loop — mostly complete, ongoing

- Add targeted regressions whenever manual testing finds a new turn or response defect.
- Continue strengthening state invariants as new response-chain cards are introduced.

### 2. Strengthen the general rules engine — in progress

- Centralise turn ownership, phases and pending responses.
- Extend the state checks that reject invalid ownership and pending-action combinations.
- Expand deterministic tests for damage, rescue, death and victory transitions.
- Continue extracting reusable stratagem, Negation and judgement helpers from the single-card delayed transition introduced for Lightning.

### 3. Complete the general card set — Standard core expanding with equipment

- Keep the playable deck filtered to WTK Standard; expansion cards remain deferred.
- Continue adding remaining Standard cards one at a time as their equipment dependencies become available.
- Keep one copy of every implemented card in ME's quick-test opening hand and seed required defence cards into bot hands.
- Add equipment-dependent Standard cards only after their required slots and modifiers are authoritative.

### 4. Add equipment and distance modifiers — current feature focus

- Weapon slot foundation and Zhuge Crossbow — complete.
- Authoritative Attack Range and Green Dragon Blade — complete.
- Serpent Spear two-card formed Attack across Play Phase, Duel and Barbarian Invasion — complete.
- Separate face-up equipment rack beside every player seat — complete and ready for additional equipment slots.
- Add Rock Cleaving Axe, then continue through the remaining Standard weapons.
- Add Borrowed Sword after the weapon set and weapon interactions are mature.
- Armour effects.
- Offensive and defensive horses.

### 5. Complete match rules

- Thoroughly test Lord, Loyalist, Rebel and Traitor victory conditions.
- Extend the completed standard death rewards and penalties when equipment and judgement zones are introduced.
- Extend the new same-device rejoin path into explicit disconnect indicators and room-cleanup behaviour.

### 6. Add hero-specific abilities

Hero details are intentionally deferred until the shared rules and cards are stable. Abilities will then be added and tested hero by hero.

### 7. Product polish

- Continue refining mobile spacing, animations and accessibility after each new response type.
- Add optional sound controls.
- Improve game setup and friend invitations.
- Add optional saved match history and player statistics.

## Optional ChatGPT Identity

ChatGPT Sites can optionally provide signed-in visitor identity or require Sign in with ChatGPT. Three Kingdoms does **not** currently use these features; anonymous friends can play from the public game link. They may become useful later for saved profiles, statistics or persistent match history.

## Development

Prerequisite: Node.js `>=22.13.0`.

```bash
npm install
npm run dev
npm test
npm run lint
```

The application uses React, TypeScript, vinext, Cloudflare Workers and D1. ChatGPT Sites hosts the live game and provides its database. Pushing code to GitHub does not by itself publish a new live version.

## Contributing

The repository is currently private. To contribute:

1. Ask the repository owner to add your GitHub account as a collaborator.
2. Create a feature or bug-fix branch.
3. Run the tests and lint checks.
4. Open a pull request into `main`.

Please keep card names and rules aligned with the official English reference recorded in `docs/OFFICIAL_CARD_REFERENCE.md`. Do not add official card artwork without confirming usage rights.
