# Three Kingdoms

An English online implementation of the classic Three Kingdoms card game, built for small private groups of friends.

- Play: https://three-realms-table.dai-jinge.chatgpt.site
- Source: https://github.com/dmoneyUK/three-kingdoms
- Current stage: **playable rules prototype and card expansion**

The hosted game is public and does not require a GitHub or ChatGPT account. Players join a room using a room code and keep their session on their device.

## Current Stage

The complete four-player test loop is playable with one human player and three bots. The project currently includes:

- automatic roles and hero assignment;
- Lord bonus HP and the Zhang Fei test hero;
- Draw, Play, Discard and Ending phases;
- turn ownership, seat order, distance and attack range;
- ordered Attack, Dodge, Duel and global-card responses;
- Peach healing and turn-ordered Dying rescue;
- death, role reveal and Rebel defeat rewards;
- automatic bot drawing, card play, responses, rescue and discard;
- private card draws and private rescue decisions;
- five-second card, damage, discard and role presentations;
- event history plus a detailed rule-audit trail; and
- a quick-test opening hand containing one of every implemented card.

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

### Recently stabilised

- Bumper Harvest keeps every revealed card on one shared choice panel, requires confirmation, names the current chooser, and visibly paces every raised selection and shaded confirmation before advancing to the next player.
- Opening draws begin immediately, card plays appear on the table optimistically, and Bumper Harvest selection changes never lock the controls while their shared preview synchronises.
- Oath of the Peach Garden remains playable when nobody needs healing; it resolves without changing HP.
- Player 3 → ME is covered by a response-and-round-transition regression test.
- Consecutive bot rounds with Barbarian Invasion and Raining Arrows return control to ME correctly.
- Dying rescue resumes the interrupted global-card response at the correct player.
- A role victory ends an unfinished global response chain immediately.

## Roadmap

### 1. Stabilise the turn loop — current priority

- Add targeted regressions whenever manual testing finds a new turn or response defect.
- Continue strengthening state invariants as new response-chain cards are introduced.

### 2. Strengthen the general rules engine

- Centralise turn ownership, phases and pending responses.
- Extend the state checks that reject invalid ownership and pending-action combinations.
- Expand deterministic tests for damage, rescue, death and victory transitions.

### 3. Complete the general card set

- Add remaining immediate stratagem cards one at a time.
- Add response-chain cards.
- Add delayed stratagems and the Judgement Zone.

### 4. Add equipment and distance modifiers

- Weapons and attack range.
- Armour effects.
- Offensive and defensive horses.

### 5. Complete match rules

- Thoroughly test Lord, Loyalist, Rebel and Traitor victory conditions.
- Complete rewards and penalties for every defeat combination.
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
