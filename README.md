# Three Kingdoms

An English online implementation of the classic Three Kingdoms card game, built for small private groups of friends.

- Play: https://three-realms-table.dai-jinge.chatgpt.site
- Source: https://github.com/dmoneyUK/three-kingdoms
- Development handover: [HANDOVER.md](HANDOVER.md)
- Current stage: **playable four-player alpha — general rules stabilisation and card expansion**

The hosted game is public and does not require a GitHub or ChatGPT account. Players join a room using a room code and keep their session on their device.

## Current Stage

The project has moved beyond the initial table prototype. A complete four-player match loop now runs with one human and three bots, and the current work sits between **Roadmap Stage 2 (strengthening the general rules engine)** and **Stage 3 (completing the general card set)**. Hero-specific abilities remain intentionally deferred.

The playable alpha currently includes:

- automatic roles and hero assignment;
- Lord bonus HP and the Zhang Fei test hero;
- Draw, Play, Discard and Ending phases;
- turn ownership, seat order, distance and attack range;
- ordered Attack, Dodge, Duel and global-card responses;
- Peach healing and turn-ordered Dying rescue;
- death, role reveal, defeated-hand cleanup, Rebel defeat rewards and the Lord's Loyalist-kill penalty;
- automatic bot drawing, card play, responses, rescue and discard;
- private card draws and private rescue decisions;
- table-based card-resolution presentations: each played or revealed card zooms into view, settles face-up in play order before its player, retains its effect explanation and results, then joins the sequence-wide discard animation when resolution concludes;
- event history plus a detailed rule-audit trail; and
- a quick-test opening hand containing one of every implemented card, with Negation also seeded into bot hands.

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

### Recently stabilised

- Negation can interrupt a stratagem in seat order, supports an explicit Pass action, and can itself be cancelled by a deliberate human counter-Negation. Barbarian Invasion and Raining Arrows now open a fresh Negation window for each target, then continue to later players after one target is protected. Bots defend their own affected character but do not blindly counter another bot's Negation.
- Overindulgence introduces the public Judgement Zone. It can be Negated before placement, cannot be duplicated on one character, reveals a judgement card at the target's next turn, and skips only the Play Phase when the result is not a Heart.
- Bumper Harvest keeps every revealed card on one shared choice panel, requires confirmation, names the current chooser, and visibly paces every raised selection and shaded confirmation before advancing to the next player.
- Bumper Harvest gains no longer trigger the normal private-draw overlay, so the shared panel remains visible while every later player selects and confirms.
- Opening draws begin immediately, card plays appear on the table optimistically, and Bumper Harvest selection changes never lock the controls while their shared preview synchronises.
- Optimistic card presentations now end after exactly one second even when the server response is slower, and the matching authoritative event is de-duplicated instead of replaying the same card.
- Oath of the Peach Garden remains playable when nobody needs healing; it resolves without changing HP.
- Player 3 → ME is covered by a response-and-round-transition regression test.
- Consecutive bot rounds with Barbarian Invasion and Raining Arrows return control to ME correctly.
- Dying rescue resumes the interrupted global-card response at the correct player.
- A role victory ends an unfinished global response chain immediately.

## Roadmap

### Progress summary

| Stage | Status | Position |
| --- | --- | --- |
| 1. Stabilise the turn loop | Mostly complete; ongoing regression work | Core ownership, phase order, repeated rounds and response chains are playable and tested. |
| 2. Strengthen the general rules engine | In progress | State invariants and ordered pending actions are implemented; resolver reuse and broader transition tests remain. |
| 3. Complete the general card set | In progress — current feature focus | 13 cards are playable; Negation has ordered counter-responses, and Overindulgence introduces delayed stratagems and judgement. |
| 4. Equipment and distance modifiers | Planned | No weapons, armour or horses yet. |
| 5. Complete match rules | Partly implemented | Death cleanup, reveal, Rebel rewards, the Lord's Loyalist penalty and main victory paths work; remaining edge cases need expansion. |
| 6. Hero-specific abilities | Deferred | Begins after shared cards and rules are stable. |
| 7. Product polish | Ongoing alongside rules work | Mobile feedback, timing and visibility are improving; sound, invitations and saved history remain planned. |

### Next milestone

Strengthen the new Judgement Zone and add the next classic delayed stratagem, **Lightning**. Negation now supports single-target cards, per-target AOE windows and cards initiated by either humans or bots. Borrowed Sword remains deferred until equipment zones exist.

### 1. Stabilise the turn loop — mostly complete, ongoing

- Add targeted regressions whenever manual testing finds a new turn or response defect.
- Continue strengthening state invariants as new response-chain cards are introduced.

### 2. Strengthen the general rules engine — in progress

- Centralise turn ownership, phases and pending responses.
- Extend the state checks that reject invalid ownership and pending-action combinations.
- Expand deterministic tests for damage, rescue, death and victory transitions.

### 3. Complete the general card set — current feature focus

- Add remaining immediate stratagem cards one at a time.
- Add response-chain cards.
- Add delayed stratagems and the Judgement Zone.

### 4. Add equipment and distance modifiers

- Weapons and attack range.
- Armour effects.
- Offensive and defensive horses.

### 5. Complete match rules

- Thoroughly test Lord, Loyalist, Rebel and Traitor victory conditions.
- Extend the completed standard death rewards and penalties when equipment and judgement zones are introduced.
- Improve reconnect, disconnect and room-cleanup behaviour.

### 6. Add hero-specific abilities

Hero details are intentionally deferred until the shared rules and cards are stable. Abilities will then be added and tested hero by hero.

### 7. Product polish

- Improve mobile clarity, animations and accessibility.
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
