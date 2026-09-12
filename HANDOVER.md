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
- Public played/revealed cards currently remain for 4 seconds; event messages and private draws remain for 3 seconds. Human card and weapon-effect responses allow 30 seconds, bot responses allow 10 seconds, and Dying rescue decisions retain their separate 5-second action window.

## Repositories and live service

- Workspace: `/Users/jingedai/Documents/ChatGPT/WTK`
- GitHub: <https://github.com/dmoneyUK/three-kingdoms>
- GitHub branch: `main`
- Live Cloudflare Worker: <https://three-kingdoms.dai-jinge.workers.dev/>
- Cloudflare configuration: `wrangler.jsonc`
- Production workflow: `.github/workflows/deploy.yml`

GitHub and Cloudflare are the only source and deployment services for this project. Do not update or deploy the retired ChatGPT Sites copy. Keep Cloudflare credentials only in GitHub Actions secrets; never store them in source files, remote URLs or persistent Git configuration.

The standing release workflow requested by the owner is:

1. Implement and validate the change.
2. Commit and push the exact commit to GitHub `main`.
3. Let `.github/workflows/deploy.yml` run lint, tests, the D1 migrations, build and Cloudflare Worker deployment.
4. Confirm the GitHub Actions run and production Worker succeed, then return the live URL and GitHub commit.

## Current product state

### 2026-09-11 update — shared Attack declaration pipeline

Normal Attack cards, Serpent Spear formations and Green Dragon Blade follow-ups now converge on a semantic `AttackDeclaration` in `app/api/rooms/route.ts`. The declaration keeps the source, target, origin, paid physical cards, sequence anchor and optional physical Attack card/suit. Pending Attack responses retain this provenance, while the existing shared Dodge/Attack capability and weapon/equipment resolvers continue to decide the outcome. This means a Serpent Spear-formed Attack reaches Eight Trigrams through the same pending path as a normal Attack without being misclassified as a black physical Attack for Nio Shield. Regression assertions cover both origins. Future Attack alternatives should create declarations and reuse the resolver rather than adding source-specific response branches.

### 2026-09-11 update — Judgement Zone presentation and Quick Test seed

Delayed Stratagem cards (`Overindulgence`, `Lightning` and `Rations Depleted`) now fly from the centre reveal into a target-specific Judgement Zone. The target zone uses compact card faces and hides the settled card only while its public reveal is active, avoiding a duplicate card in the source player's played-card area. Quick Test now guarantees Player 1 a Serpent Spear while keeping the rest of the opening cards randomized.

### 2026-09-12 update — production smoke test

The live Worker was checked directly: the root route returned 200 and the runtime tail showed the latest version completing requests without exceptions. `GET /api/rooms` remains a room lookup endpoint and correctly returns 404 without a room code. A new D1-backed `/api/health` endpoint and a post-deploy workflow smoke test now verify both `/` and `/api/health` after every production deploy.

### 2026-09-12 update — room payload safety

The frontend now normalizes API room payloads before state updates, filtering null players, incomplete cards, and invalid timeline entries. The API also filters malformed persisted timeline records before returning them. Regression tests cover valid data, null entries, missing nested card data, empty collections, and malformed room payloads.

### 2026-09-11 update — named mounts and Eight Trigrams response coverage

Eight Trigrams Formation is registered in the Standard deck and Armor slot. When an Attack, including a Serpent Spear-formed Attack, or Raining Arrows requires Dodge, the acting player can either play a normal Dodge or choose **Use Eight Trigrams**. The server performs one Judgement, reveals and discards that card, treats red as a successful Dodge, and resolves black as normal damage. The same capability is available to bots and Quick Test; regression coverage now includes a Serpent Spear-formed Attack. The six physical Standard mounts are also now distinct one-copy card kinds in new decks; legacy generic horse kinds are retained only for saved-room compatibility. The next implementation is Blue Steel Sword, followed by the remaining manifest cards needed to reach 108.

Latest AOE update: every Negation window starts with the player who played the current Stratagem, including the AOE source and the latest Negation player, then visits each eligible living player once and stops before returning. This applies separately to each AOE target. The queue's final pass resumes the stored group or skips a negated target. `game/responses.ts` centralizes normal Attack/Dodge and implemented alternative providers, capability detection and selected cost validation; AOE uses it for both human and bot decisions. Serpent Spear remains the only implemented alternative Attack provider. Eight Trigrams/hero conversions must register their actual resolver and costs before being offered. Empty response capabilities auto-resolve damage. The public countdown appears five seconds into the unchanged 30s human/10s bot deadline; the early Negation actor label/highlight is hidden from opponents. This is UI concealment only: protocol actor IDs and timing can still reveal information; guaranteed secrecy would require a different uniform response-window protocol. Quick Test necessarily reveals its controlled seat. Tests cover both AOE pass rounds, self-countering, conversion costs and automatic no-response damage. Next milestone: Eight Trigrams Formation.

Latest Negation fix: pending response state retains the root Stratagem for final resolution while storing the latest Negation player/card, chain depth and response target. Counter-round prompts now say whose Negation is being answered; response order and pass semantics are unchanged. API regression coverage verifies the initial root prompt and updated counter prompt.

Latest perspective fix: Quick Test still selects the legal actor on the server, but player DTOs no longer expose table hands (`handCards` stays empty); `myHand` is the only private hand. The small seat previews and their CSS are removed. `game/private-hand.js` keeps the current owner plus hand/event baselines, resetting on `meId` changes, and the private overlay is owner-scoped so a previous player's cards cannot flash during a switch. Draw Phase, Draw Two and Rebel reward log entries carry `drawPlayerId` metadata without card identities; only a new event for the same viewed player can present newly added hand cards. Gains/Harvest and repeated polling do not count as draws. The helper is plain ESM JavaScript so Node's deployment test runner can import it without a TypeScript loader. Public sequence state and Negation rules are unchanged. Tests cover a complete Quick Test Arrows/pass/response cycle, return to ME, draw markers, per-seat privacy, repeated polling and card recycling. Next milestone remains Eight Trigrams Formation.

Latest Negation update: confirmed owner model starts targeted-card initial windows at the affected target (AOE now starts at the turn owner), includes the Stratagem user, and restarts after the latest Negation player only when a Negation is played. Existing pass queues shrink without cycling; counter windows permit previous passers and encounter the latest card player last if still eligible. Players with no Negation are automatically skipped. The API's `negated` field tracks provisional parity; no normal response resolves until the current opportunity exhausts. Surviving Duel/AOE effects receive a fresh normal-response deadline. Bot Duel now enters this same pipeline. Quick Test controlled-hand selection respects the same response eligibility as the main hand. New API tests cover ordering, pass finality, parity, user inclusion, expired nested timers, early-response rejection, Spear with an Attack still held, and per-target sequencing. Eight Trigrams and hero response skills remain unimplemented.

Latest fix: equipment has one visible centre-to-rack flight. The prior retention filter missed optimistic entries, producing the numbered duplicate reported in screenshots. Both merged sequence entries and the final sequence renderer now filter equipment; rack visibility follows unseen, queued and active equipment events. A layout measurement with ResizeObserver supplies the real destination across seats and viewport sizes. Equipment summaries use history-only entries to avoid a second presentation delay. Existing live equipment is visible immediately on reconnect. Continue with Eight Trigrams Formation after visual regression checks.

Local browser verification: played Nio Shield followed by Frost Sword. During each flight there was one centre reveal, zero numbered settled copies, and the incoming rack card was hidden; afterwards the reveal was gone and the rack card visible. The second flight's measured destination matched the second rack slot while the already-equipped Shield stayed visible.

This is a playable four-player alpha. The quick-test game starts immediately as a single-device controller table with:

- four human-controlled seats: `ME`, `Player 1`, `Player 2` and `Player 3`;
- only the controlled seat's full hand displayed in the normal bottom hand area; opponents show counts only;
- automatic controller hand/permission switching to the seat that legally acts;
- random roles and heroes, except `ME` uses Zhang Fei for testing;
- Lord bonus HP;
- Player 1–3 at 3 HP in quick-test mode; and
- Eight Trigrams Formation plus three Attacks in `ME`'s opening hand; the remaining opening cards are drawn randomly from the shuffled Standard deck. Other weapons and all horses remain available in the deck. Player 3 also begins with three Attacks plus a Negation for bot-response testing.

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

The latest Frost Sword correction keeps the portrait modal's two result choices visible and makes the discard branch attacker-controlled. Selecting **Choose cards to discard** exposes the target's hidden hand slots and public equipment cards; the attacker confirms one or two distinct cards via `cardKeys`. The API validates those selections before preventing damage and discarding them. Judgement Zone cards are never eligible. The target does not choose, and no selection is accepted when the target has no eligible hand/equipment cards. The quick-test ME hand now explicitly includes three Attacks.

The Frost Sword selector is rendered inside the bright response prompt and names the attacked player, so portrait users no longer have to interact with a shadowed picker behind the modal. The selection remains staged until the attacker presses the discard confirmation.

Steal and Burning Bridges now present their post-Negation target-card picker as a centered, bright response panel instead of a rotated, dim table overlay. Their existing target-card validation and explicit confirmation flow are unchanged.

Player presence is now surfaced per seat. Authenticated room polling refreshes `connected_at`; bots are always online, and human seats are marked offline after 15 seconds without a heartbeat. This is informational only and does not remove a player or alter turn ownership.

Horse equipment is now authoritative in the two dedicated equipment slots. `attackRangeFor` includes the owner's Offensive Horse bonus, while `attackDistance` applies a target's Defensive Horse penalty to Attack range checks. Quick-test setup removes horse cards from the draw/hand pools and equips both horses for every player.

The verified WTK Standard catalogue contains 28 active cards. Twenty-three are complete; remaining work is Eight Trigrams Formation, weapons (Blue Steel Sword, Yin-Yang Swords, Kirin Bow), and Borrowed Sword. The active, dependency-ordered list is maintained in `ROADMAP.md`; do not reintroduce older unverified cards such as Six Swords of Wu, Two-bladed Trident, Alliance, Rest and Reorganization, or Know your Enemy. Kingdom Wars and Endless Legends cards remain out of scope.

Nio Shield is the first complete Armor card. The Equipment Zone now has an authoritative Armor slot and replaces only the existing Armor. A shielded player is immune to a black Attack before a Dodge prompt or damage, including a bot target and Sky Piercing Halberd sequence; red Attacks remain normal. Quick-test `ME` begins with Nio Shield alongside Frost Sword, and the card rack labels Weapon, Armor and Mount cards correctly.

The production migration is now complete in the project configuration:

- GitHub `main` is the sole authoritative source and `.github/workflows/deploy.yml` is the sole production release path.
- Successful pushes validate the project, apply Cloudflare D1 migrations and deploy `three-kingdoms` to the public Worker URL.
- The obsolete ChatGPT Sites hosting file and build dependency were removed. The migrated test runner still exits explicitly to close Cloudflare worker handles in CI, but now preserves the real test result instead of forcing success after a failure.

The latest Quick Test change makes manual rule verification possible without waiting for bots. All four quick-test player rows share the local session token, but this is deliberately detected only when every four-seat player belongs to that session; normal multiplayer sessions continue to expose only their owner's hand. The API selects the legal turn or response actor as the controller perspective, so existing server ownership checks remain authoritative. The user interface shows only the controlled hand in the normal bottom area; opponent hand counts remain public but their cards are hidden. Perspective changes reset the hand baseline without a draw presentation. Bot fixtures use the internal `botTest: true` request field so regression tests retain coverage of automatic bot turns without changing the public Quick Test flow.

The latest timing change expands the shared response window:

- Human response decisions are 30 seconds for Attack/Dodge, Duel, Negation, Barbarian Invasion, Raining Arrows and weapon effects. Bots retain a 10-second window and normally advance immediately.
- The Frost Sword response modal keeps both result buttons visible on narrow portrait screens. Its attacker-controlled discard branch shows the target's eligible hidden Hand slots and public Equipment cards, then requires the attacker to confirm one or two selections. Judgement cards are deliberately absent.
- Each new normal-response pending state receives a fresh server-created deadline. A waiting source player has no countdown; after a defender plays Dodge, the source receives a new 30-second Green Dragon Blade or Rock Cleaving Axe decision with an immediate Skip control.
- A Rock Cleaving Axe decision has a dimmed, centre-table pop-up in addition to the footer controls, so it cannot be lost among card presentation events. It states the two-card cost and exposes both Use and Skip actions while leaving the hand and Equipment Zone selectable as payment.
- Seat countdowns are deliberately limited to real pending decisions (response, Bumper Harvest choice, and Peach rescue). The old card-presentation `Next step` countdown was removed: it incorrectly looked like an action timer after equipment and other completed plays.
- Every response still exposes its immediate Play or Skip action, and its visible countdown remains attached to the acting player.
- Peach rescue intentionally keeps its independent 5-second deadline.
- Deterministic coverage checks both an ordinary Dodge window and a Rock Cleaving Axe weapon-effect window.

The latest weapon milestone added Frost Sword:

- Frost Sword (official card 40) equips in the shared Weapon slot and gives its owner Attack Range 2.
- When its Attack would deal damage, the owner receives a fresh 30-second human choice (10 seconds for a bot): prevent that damage and discard up to two of the target's current cards, or let the one damage resolve normally.
- Both human and bot targets now enter this authoritative Frost Sword pending state. In particular, an undefended bot target no longer takes immediate damage before the owner can see the centred prompt.
- The centered panel always states both choices: **Discard up to 2 cards** or **Deal 1 damage**. One available card is enough for the discard branch, and Frost Sword's automatic deadline now passes to normal damage rather than leaving a human owner in a stale response state. Its discard resolver includes only Hand and Equipment Zone cards; a Judgement Zone card cannot be selected.
- The owner selects the exact one or two cards from the target's Hand or Equipment Zone. Judgement Zone cards are never eligible, matching the verified Standard wording.

The preceding weapon milestone added Sky Piercing Halberd:

- Sky Piercing Halberd (official card 188) equips in the shared Weapon slot and gives its owner Attack Range 4.
- When the owner uses their final hand card as an Attack, they may select one to three living opponents within range. Multiple selected targets resolve in table order, one at a time, with a fresh 30-second human Dodge-or-damage decision (10 seconds for a bot) for each acting target.
- The multi-target Attack is not a stratagem: it does not open a Negation window. It retains the one Attack card as a single visible sequence until every chosen target has resolved.
- Bots select two legal targets when their last hand card is Attack, and deterministic coverage verifies range, final-hand restriction, ordered ownership, Dodge, damage, completion and bot use.

The preceding weapon milestone added Rock Cleaving Axe:

- Rock Cleaving Axe (official card 186) equips in the shared Weapon slot and gives its owner Attack Range 3.
- When its owner's Attack is blocked by Dodge, the attacker receives an ordered 30-second human decision (10 seconds for a bot) to select exactly two different cards or skip immediately.
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
- Sky Piercing Halberd is complete. Continue through the remaining Standard weapons; Borrowed Sword follows once their shared interactions are mature.

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
| Normal card and weapon response | 10000 ms | Give the acting player time to select a legal response or skip, including weapon-effect decisions. |
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

The Cloudflare Worker uses D1 through the logical `DB` binding in `wrangler.jsonc`.

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
4. Ensure focused quick-test mode gives `ME` every non-weapon card plus only the current tested weapon; other weapons stay in the deck. Seed Player 3 with three Attacks and keep required bot response cards.
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

`npm test` performs a production build and runs the API, private-hand tracking and rendered-client suites. The current expected result is 33 passing test flows.

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
5. Equipment Zone foundation, a separate face-up rack beside each seat, authoritative Attack Range, Zhuge Crossbow, Green Dragon Blade, Serpent Spear, Rock Cleaving Axe, Sky Piercing Halberd and Frost Sword are complete. Burning Bridges and Steal now target current hand, equipment or judgement cards only after Negation finishes.
6. Continue through the remaining Standard weapons, then add Borrowed Sword after weapon interactions are mature.
7. Continue through armour, horses, distance modifiers and remaining response-chain edge cases.
8. Extend role-outcome and defeat cleanup to future equipment and judgement cards.
9. Add hero abilities only after shared Standard rules and cards are stable.

## Known boundaries

- The game uses HTTP polling, not WebSockets.
- Only the current action owner can submit a legal action; there is no simultaneous response system.
- A Negation window is deliberately exclusive: the acting player may play Negation or use the visible Skip response control; the underlying Dodge/Attack action becomes available only after the stratagem window resolves. AOE response windows then expose the required Dodge/Attack choice directly, without being hidden by unrelated cards in hand.
- The live Standard Judgement Zone supports Overindulgence and Lightning. Dormant compatibility handling for Rations Depleted remains covered by tests. Delayed cards resolve one at a time so Negation, transfer and Dying interruptions do not consume later judgement cards.
- The Equipment Zone has Weapon, Armor, Offensive Mount and Defensive Mount slots, rendered as face-up cards in the rack beside each owner. Zhuge Crossbow, Green Dragon Blade, Serpent Spear, Rock Cleaving Axe, Sky Piercing Halberd, Frost Sword and Nio Shield are playable, and equipped weapon range is authoritative for Attack targeting. Nio Shield cancels black Attack cards before Dodge or damage. Frost Sword lets its owner choose one or two current target Hand or Equipment cards after choosing the damage-replacement branch; Judgement Zone cards are never eligible. Sky Piercing Halberd resolves its final-hand multi-target Attack as a held sequence; its specialised response path does not yet combine with other post-Dodge weapon effects. Rock Cleaving Axe may discard cards from hand and/or the Equipment Zone, including itself, after Dodge. Eight Trigrams Formation is the next equipment milestone. Burning Bridges and Steal can already select the current Weapon or a delayed card after their Negation chain.
- Bumper Harvest Negation is target-specific: a cancelled player does not choose, later players continue, and any leftover revealed card is discarded with the held Harvest/Negation sequence at completion.
- Most hero abilities are intentionally placeholders; Zhang Fei's repeated Attack behaviour is the principal test exception.
- Reconnect uses the private room session stored on the device. Refresh restores automatically and Exit offers a one-tap same-device rejoin; cross-device account recovery is not implemented.
- Saved match history, player profiles, statistics, sound and richer invitations are not implemented.
- The Cloudflare Worker is public, but the GitHub repository may remain private and requires collaborator access for contributors.

## Safe continuation prompt

In the next chat, say:

> Continue the Three Kingdoms project from the latest `main`. Read `HANDOVER.md`, `README.md` and `docs/OFFICIAL_CARD_REFERENCE.md` first. Keep the active ruleset strictly WTK Standard, preserve the general-rules-before-heroes priority, run all tests, then push the validated commit to GitHub `main` and confirm its GitHub Actions deployment to the existing Cloudflare Worker. Do not use ChatGPT Sites.
