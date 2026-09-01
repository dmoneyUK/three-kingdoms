# Three Kingdoms project handover

Use this document to continue development in a new chat. Start from the latest `main` branch and read `README.md` for the public-facing roadmap.

## Product goal

Build an English, browser-based version of the classic *War of the Three Kingdoms* card game for a small private group of friends.

Product decisions already made:

- Focus exclusively on WTK Standard, the classic hidden-role product. Endless Legends and Kingdom Wars are deferred.
- Prioritise general turn, card, death and victory rules before hero-specific abilities.
- Add cards incrementally, normally one card at a time, with tests for each new transition.
- Use official English card names and rule meaning, but original visual design.
- Do not ship official card artwork without permission from the rights holder.
- The player-facing name for the internal `Renegade` role is **Traitor**.
- The public game must remain playable without GitHub or ChatGPT sign-in.
- Mobile clarity and visible action order are important: always show the turn owner, phase, acting player, card, source and target.
- Public played/revealed cards currently remain for 4 seconds; event messages and private draws remain for 3 seconds. Dying rescue decisions retain their separate 5-second action window.

## Repositories and live service

- Workspace: `/Users/jingedai/Documents/ChatGPT/WTK`
- GitHub: <https://github.com/dmoneyUK/three-kingdoms>
- GitHub branch: `main`
- Live Site: <https://three-realms-table.dai-jinge.chatgpt.site/>
- ChatGPT Sites project ID: `appgprj_6a80663f4c6c81919b11bc000dc47e71`
- Sites source repository: `https://git.chatgpt-team.site/71b0ed06-7e27-42fc-9829-ad3fa809fc68/appgprj_6a80663f4c6c81919b11bc000dc47e71.git`
- Sites source branch: `main`
- Hosting metadata: `.openai/hosting.json`

Never store a Sites write token in a remote URL, file or persistent Git configuration. Obtain a short-lived source-repository credential through the Sites tools and use it only as a per-command HTTP authorization header.

The standing release workflow requested by the owner is:

1. Implement and validate the change.
2. Commit and push the exact commit to GitHub `main`.
3. Push that same commit to the ChatGPT Sites source repository `main`.
4. Package the successful build, save a Site version using the exact commit SHA, and deploy it to the existing public Site.
5. Confirm the production deployment succeeds and return the live URL and GitHub commit.

## Current product state

This is a playable four-player alpha. The quick-test game starts immediately with:

- human player `ME`;
- bots `Player 1`, `Player 2` and `Player 3`;
- random roles and heroes, except `ME` uses Zhang Fei for testing;
- Lord bonus HP;
- bots at 1 HP in quick-test mode; and
- one of every implemented WTK Standard card in `ME`'s opening hand.

Implemented shared rules include:

- Draw, Play, Discard and Ending phases;
- authoritative turn owner, acting player and ordered response state;
- seat order, living-player distance and range-1 Attack;
- Attack/Dodge, Duel and ordered global-card response chains;
- Attack and Dodge responses to global AOE cards are presented without a player-to-player direction;
- Peach healing and turn-ordered Dying rescue;
- death, defeated-hand cleanup, public role reveal, Rebel defeat reward, the Lord's Loyalist-kill penalty and match victory checks;
- bot draw, play, response, rescue, discard and repeated-round operation;
- private draws, inline ordered Peach rescue controls and public action presentations;
- one-room audit storage, cleared when a new game starts; and
- a scrollable Event History debug window.

Implemented cards:

1. Attack
2. Dodge
3. Peach
4. Something Out of Nothing
5. Burning Bridges
6. Steal
7. Duel
8. Oath of the Peach Garden
9. Barbarian Invasion
10. Raining Arrows
11. Bumper Harvest
12. Negation
13. Overindulgence
14. Lightning
15. Zhuge Crossbow
16. Green Dragon Blade
17. Serpent Spear
18. Rock Cleaving Axe

Rations Depleted was previously implemented during development, but the official
catalogue classifies it as Endless Legends. Its compatibility code and tests are
preserved, while it is excluded from every new Standard deck and quick-test hand.

`Strike` remains only as a saved-game compatibility alias for Attack.

## Recent interaction work

The latest weapon milestone added Rock Cleaving Axe:

- Rock Cleaving Axe (official card 186) equips in the shared Weapon slot and gives its owner Attack Range 3.
- When its owner's Attack is blocked by Dodge, the attacker receives an ordered five-second decision to select exactly two different cards or skip immediately.
- The cost accepts any combination of hand and equipped cards, including the Rock Cleaving Axe itself. A valid payment forces the blocked Attack's 1 damage and continues into normal Dying rescue when lethal.
- Attack, Dodge and both revealed payment cards retain the original Attack sequence identifier and stay together on the table until the decision and damage finish.
- Bots automatically use a legal two-card payment. Quick-test mode gives `ME` one copy, and deterministic coverage protects range, response ownership, timer, duplicate rejection, skip, self-discard, forced damage, presentation and bot use.

The latest rules and session stabilisation completed three related fixes:

- The browser session survives refresh and intentional Exit. Refresh restores the table automatically; Exit returns to the landing screen without deleting the device token and exposes a one-tap **Rejoin game** action.
- Dying rescue uses the same hand-and-command interaction pattern as Negation. Only the authoritative acting rescuer may select and play Peach or press **Skip rescue**; the old private modal was removed while the existing ordered five-second deadline remains.
- Burning Bridges and Steal no longer preselect a hand-card ID before Negation. A dedicated `target_card` pending state opens only after the entire Negation/counter-Negation chain resolves, then lets the source choose from the target's current hand, Weapon slot or Judgement Zone. All sequence cards stay held until that final choice commits them together.
- Deterministic coverage reproduces the reported stale-card case: a target spends its only hand card as Negation, the source counter-Negates, and Steal can then obtain the target's equipped Serpent Spear instead of incorrectly reporting that no card remains.

The latest weapon milestone added Serpent Spear:

- Serpent Spear (official card 181) equips in the shared Weapon slot and gives its owner Attack Range 3.
- During the Play Phase, its owner can explicitly enter Serpent Spear mode, select exactly two different hand cards and choose a legal target to form an Attack.
- The same two-card formation is legal whenever that owner must play Attack in Duel or against Barbarian Invasion; it is not offered for Dodge, Negation or Green Dragon Blade follow-ups.
- Normal Attack limits, distance, Dodge, damage and ordered response ownership remain authoritative. Both payment cards appear as one grouped play event and remain in the complete table sequence until it concludes.
- Bots equip Serpent Spear and form an Attack when they have no ordinary Attack. Quick-test mode gives `ME` one copy, and deterministic coverage protects range, duplicate-cost rejection, Dodge, Duel, Barbarian Invasion, sequence anchoring and bot use.

The latest table-layout refinement separates equipment from player identity:

- Equipped weapons appear as compact, face-up cards in a dedicated rack beside their owner's seat.
- Player targeting, turn highlighting and response countdowns remain attached to the fixed player panel rather than moving with the rack.
- The rack is a reusable public Equipment Zone container, ready for later armour and offensive/defensive horse slots.

The latest weapon milestone added authoritative Attack Range and Green Dragon Blade:

- Green Dragon Blade (official card 180) equips in the shared Weapon slot and gives its owner Attack Range 3.
- When an Attack is blocked by Dodge, a living owner who still has an Attack receives an ordered response to continue against the same target or skip; the normal response countdown and action ownership checks apply.
- Repeated Green Dragon Blade Attacks retain the first Attack's sequence identifier so every Attack and Dodge remains together until the full chain concludes.
- Bots equip Green Dragon Blade, select targets using their equipped Attack Range and automatically use legal follow-up Attacks.
- Quick-test mode gives `ME` one Green Dragon Blade, and deterministic coverage protects opposite-seat range, human follow-up, fixed-target enforcement, bot follow-up and sequence retention.

The preceding rule and presentation fixes corrected delayed-card and Bumper Harvest Negation:

- A delayed card now emits a fresh `activate` card event when its Judgement Negation window opens. The client anchors the visible response sequence to this current event instead of the card's original Play Phase event, preventing intervening discards from reappearing around every player.
- Bumper Harvest reveals its shared pool once, then opens a separate Negation window for each affected player in turn order.
- A successful Negation cancels only that player's chance to choose. The same revealed pool continues to later players, and the skipped player's leftover card is discarded when the full Harvest sequence concludes.
- Bumper Harvest, its Negation responses and any leftover revealed cards stay out of the logical discard pile until the complete sequence finishes.
- Deterministic coverage reproduces the delayed-Lightning presentation anchor and a first-player Bumper Harvest Negation followed by the remaining three choices.

The preceding milestone introduced the Equipment Zone foundation and Zhuge Crossbow:

- Every player now has a persisted, publicly projected Weapon slot.
- Equipping Zhuge Crossbow removes it from hand, replaces and discards the previous weapon, and presents it as equipment rather than as an ordinary discard.
- An equipped Zhuge Crossbow removes the normal one-Attack-per-turn limit for both humans and bots.
- Bots equip the weapon before attacking and can continue using Attack cards while legal targets remain.
- Defeat cleanup discards equipment, and the Lord's Loyalist-kill penalty now clears the Lord's equipment as well as the hand.
- Quick-test mode gives `ME` one Zhuge Crossbow, while deterministic coverage protects equip, replacement, repeated Attack, bot use and cleanup.

The preceding scope change locked every new game to WTK Standard:

- The official catalogue product filter is recorded for every mapped card.
- `game/cards.ts` marks cards as Standard or Endless Legends.
- Only Standard cards in `DECK_COUNTS` enter shuffled decks and quick-test hands.
- Rations Depleted remains readable in older state and retains deterministic compatibility coverage, but bots and players cannot receive it in a newly created game.
- Rock Cleaving Axe is complete. The next active milestone is Sky Piercing Halberd; Borrowed Sword follows the remaining Standard weapons.

The preceding rules change added Lightning and made delayed-card resolution reusable:

- Lightning is placed in its owner's Judgement Zone and can be Negated before placement.
- Each delayed card now resolves individually, preserving later cards and their own Negation windows.
- A Spade 2–9 judgement deals 3 source-free thunder damage and enters the normal Peach rescue flow when lethal.
- Every other judgement transfers Lightning to the next eligible living character without creating a duplicate Lightning in one Judgement Zone.
- Bots place and resolve Lightning, and quick-test mode gives `ME` a Lightning card.
- Deterministic API coverage protects placement, duplicate prevention, transfer and damage.
- The frontend now scopes retained table cards to the latest authoritative pending sequence. This prevents cards from completed turns being merged into a later Lightning, Negation or other response window; the backend already commits completed ordinary plays to discard and clears their pending state.

Earlier interaction work concentrated on latency and Bumper Harvest:

- Opening automatic draw begins after approximately 0.1 seconds instead of waiting behind the turn banner.
- A card played during Play Phase is presented optimistically while the server validates it.
- Optimistic played cards expire locally after 4 seconds instead of waiting for the server response; the later authoritative copy is recorded but not presented twice.
- Bumper Harvest selection previews are non-blocking and queued, so a player can change their selected card without waiting for network round trips.
- Confirming a Bumper Harvest card shades it immediately as `Chosen by ME`; the authoritative server choice then advances in the background.
- Bot Bumper Harvest choices are deliberately paced: selection rises, confirmation shades and names the chooser, then the next player begins.
- The final set of Bumper Harvest choices remains visible briefly before the panel closes.
- Bumper Harvest gains are excluded from the private-draw presentation, keeping the shared choice panel continuously visible as later players act.

Manual mobile testing should continue to watch for stale selection previews, repeated action presentations or any response that leaves the room in `resolving` state.

## Architecture

### Client

`app/page.tsx` contains the current single-page client experience:

- lobby, quick start and hero selection;
- table layout and hand controls;
- polling and action submission;
- optimistic card-play and Bumper Harvest feedback;
- presentation queue, private draws, rescue prompt and Event History; and
- mobile-facing action labels.

`app/globals.css` contains the complete visual system and responsive layout.

The client is not authoritative. It may provide optimistic feedback, but all rule transitions must be validated by the server.

### Production timing audit

All intentional production waits are now centralised or recorded here:

| Behaviour | Duration | Purpose |
| --- | ---: | --- |
| Normal room polling | 2500 ms | Refresh other-player and bot activity. |
| Bumper Harvest polling | 300 ms | Keep shared previews and choices responsive. |
| Automatic draw start | 100 ms | Let the turn-owner banner render, then claim Draw Phase. |
| Played/revealed card | 4000 ms | Show the public card, source and target. This no longer waits for the action response. |
| Event or role-reveal message | 3000 ms | Show important public state changes. |
| Private draw | 3000 ms | Let only the drawing player inspect new cards. |
| Peach rescue decision | 5000 ms | Give each eligible player a private chance to select Peach or pass. |

Every blocking presentation and decision overlay shows a live countdown. Bumper Harvest also exposes its bot preview and final-choice deadlines to all viewers; continuous room polling remains intentionally invisible because it is a repeating refresh rather than a blocking wait.

Card presentations now use one cumulative table-resolution layer. Earlier steps remain visible while later card responses and effect messages are added, and response-based sequences stay open until the server leaves Response, Dying or Resolving. The centre caption includes the development-source rules explanation from `game/cards.ts`.

The resolution is spatially anchored to the table: each active card travels from its player’s seat to a large centre reveal, then settles in a numbered face-up row in front of that player. Multiple cards remain ordered per player. Once no response or resolving phase remains, every player row animates into the central discard pile together over 700 ms.
| Bumper Harvest bot think | 450 ms | Show which bot is about to choose. |
| Bumper Harvest raised/confirmed choice | 1400 ms | Make each bot selection visible before advancing. |
| Final Bumper Harvest choices | 1400 ms | Leave the completed shaded choices visible briefly. |

Zero-millisecond timers only defer React state updates to the next task; they are not user-visible pauses. CSS presentation durations are aligned with the React timers. Test polling delays exist only under `tests/` and do not affect production.

### Server and game engine

`app/api/rooms/route.ts` is the authoritative room API and currently contains most orchestration logic:

- room lifecycle and player sessions;
- roles, heroes and match setup;
- D1 reads/writes and audit capture;
- action validation and phase claims;
- card resolution, pending-response state, Dying rescue and victory;
- bots; and
- public/private room-state projection.

Important pending-state kinds are Attack, Duel, group response, Bumper Harvest and Dying rescue. Only the player identified by the authoritative pending action may act. Preserve atomic phase/pending claims when changing this code.

`game/rules.ts` contains reusable living-player order, next-seat, distance and post-Attack phase helpers. More rule logic should gradually move into reusable functions rather than further enlarging the API route.

`game/model.ts` defines card kinds and core shared types.

`game/cards.ts` is the card catalogue, deck composition and Attack compatibility layer.

### Persistence

The Site uses Cloudflare D1 through the logical `DB` binding in `.openai/hosting.json`.

Main tables:

- `rooms`: status, turn, phase, deck, discard, event log and pending action;
- `players`: seat, hidden role, hero, HP, hand, judgement/equipment zones and private session hash;
- `game_audit`: transition and action audit rows; and
- `audit_scope`: identifies the one room whose audit is retained.

Schema definitions are in `db/schema.ts`; migrations are in `drizzle/`.

## Rule and naming source

Read `docs/OFFICIAL_CARD_REFERENCE.md` before adding or renaming a card. The active ruleset is WTK Standard, using its official product page and rulebook together with YOKA Games' English catalogue filtered to Standard:

- <https://www.wtkgames.com/product/Standard/>
- <https://wtkgames.com/gameCard/>
- <https://api.wtkgames.com/api/card>

Keep official links and research in project documentation, not in the player interface. Paraphrase effects and use original visuals.

Internal identifiers may differ from player-facing names for compatibility:

- `DrawTwo` → Something Out of Nothing
- `Dismantle` → Burning Bridges
- `BumperHarvest` → Bumper Harvest
- `Negation` → Negation
- `Overindulgence` → Overindulgence
- `Lightning` → Lightning
- `RationsDepleted` → Rations Depleted (dormant Endless Legends compatibility only)
- internal `Renegade` → player-facing Traitor
- legacy `Strike` → Attack

## Adding the next card

Follow this checklist:

1. Verify the official English name, category, card ID and rule meaning.
2. Confirm the card belongs to the official Standard product filter, then add a stable `CardKind` in `game/model.ts`.
3. Add its definition and explicit deck count in `game/cards.ts`.
4. Ensure quick-test mode gives `ME` one copy in the opening hand. This happens automatically for kinds in `DECK_CARD_KINDS`.
5. If it is a defence/response card, ensure bots can receive and legally play it in tests.
6. Add authoritative validation and resolution to the server.
7. Reuse or extract ordered pending-response logic rather than allowing simultaneous responders.
8. Add bot behaviour.
9. Add clear source/target presentation and private information handling.
10. Add API transition tests and rendered-control assertions.

Do not begin hero-specific details until the owner changes the current priority.

## Tests and local development

Requirements: Node.js `>=22.13.0`.

```bash
npm install
npm run dev
npm run lint
npm test
```

`npm test` performs a production build and runs the API and rendered-client suites. The current expected result is 19 passing test flows.

Key test files:

- `tests/game-api.test.mjs`: room, phase, card, bot, rescue, victory, Bumper Harvest and audit transitions.
- `tests/rendered-html.test.mjs`: rendered UI and source-level interaction regressions.
- `tests/run-tests.mjs`: local test server orchestration.

When a manual game exposes a bug, add a deterministic regression before or alongside the fix. In particular, protect player order, action ownership, duplicate-action rejection and resumption after Dying.

## Audit and debugging

The player UI exposes **Event History** as a debug tool. The API audit can be retrieved by a valid room member with:

```text
GET /api/rooms?code=ROOM_CODE&token=PLAYER_TOKEN&audit=1
```

The audit is intentionally scoped to one room and reset when a new game starts. Use it to reconstruct phase, turn-seat and acting-player changes when a reported game becomes stuck.

## Roadmap position and recommended next work

The project is currently between:

- Stage 2: strengthen and centralise the general rules engine; and
- Stage 4: expand the new Weapon slot into complete Equipment Zones and distance modifiers.

Recommended next sequence:

1. Continue extracting shared ordered-response/resolution helpers from `app/api/rooms/route.ts`.
2. Negation (official card 108) now has ordered Play/Pass controls, bot responses, counter-Negation parity, quick-test cards, deterministic single-target coverage and a fresh response window for every Barbarian Invasion or Raining Arrows target, including AOE cards played by bots.
3. Overindulgence (official card 177) adds the public Judgement Zone, placement-time Negation, duplicate prevention, public judgement reveals, Heart success, non-Heart Play Phase skipping and bot resolution.
4. Lightning (official card 107) is complete: self-placement, duplicate prevention, placement/judgement Negation, Spade 2–9 judgement, 3 source-free thunder damage, Dying rescue, transfer to the next eligible living character, bot play and deterministic tests.
5. Equipment Zone foundation, a separate face-up rack beside each seat, authoritative Attack Range, Zhuge Crossbow, Green Dragon Blade, Serpent Spear and Rock Cleaving Axe are complete. Burning Bridges and Steal now target current hand, equipment or judgement cards only after Negation finishes.
6. Add Sky Piercing Halberd with its final-hand-card multi-target Attack rule and bot coverage.
7. Continue through the remaining Standard weapons, then add Borrowed Sword after weapon interactions are mature.
8. Continue through armour, horses, distance modifiers and remaining response-chain edge cases.
9. Extend role-outcome and defeat cleanup to future equipment and judgement cards.
10. Add hero abilities only after shared Standard rules and cards are stable.

## Known boundaries

- The game uses HTTP polling, not WebSockets.
- Only the current action owner can submit a legal action; there is no simultaneous response system.
- The live Standard Judgement Zone supports Overindulgence and Lightning. Dormant compatibility handling for Rations Depleted remains covered by tests. Delayed cards resolve one at a time so Negation, transfer and Dying interruptions do not consume later judgement cards.
- The Equipment Zone currently exposes only the Weapon slot, rendered as a face-up card in the separate rack beside its owner. Zhuge Crossbow, Green Dragon Blade, Serpent Spear and Rock Cleaving Axe are playable, and equipped weapon range is authoritative for Attack targeting. Rock Cleaving Axe may discard cards from hand and/or the Equipment Zone, including itself, after Dodge. Armour and horse slots can extend the same rack. Burning Bridges and Steal can already select the current Weapon or a delayed card after their Negation chain.
- Bumper Harvest Negation is target-specific: a cancelled player does not choose, later players continue, and any leftover revealed card is discarded with the held Harvest/Negation sequence at completion.
- Most hero abilities are intentionally placeholders; Zhang Fei's repeated Attack behaviour is the principal test exception.
- Reconnect uses the private room session stored on the device. Refresh restores automatically and Exit offers a one-tap same-device rejoin; cross-device account recovery is not implemented.
- Saved match history, player profiles, statistics, sound and richer invitations are not implemented.
- The Site is public, but the GitHub repository may remain private and requires collaborator access for contributors.

## Safe continuation prompt

In the next chat, say:

> Continue the Three Kingdoms project from the latest `main`. Read `HANDOVER.md`, `README.md` and `docs/OFFICIAL_CARD_REFERENCE.md` first. Keep the active ruleset strictly WTK Standard, preserve the general-rules-before-heroes priority, run all tests, then push the exact commit to both GitHub and the ChatGPT Sites repository and deploy it to the existing public Site.
