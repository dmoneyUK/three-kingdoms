# Three Kingdoms project handover

Use this document to continue development in a new chat. Start from the latest `main` branch and read `README.md` for the public-facing roadmap.

## Product goal

Build an English, browser-based version of the classic *War of the Three Kingdoms* card game for a small private group of friends.

Product decisions already made:

- Focus on the classic hidden-role rules.
- Prioritise general turn, card, death and victory rules before hero-specific abilities.
- Add cards incrementally, normally one card at a time, with tests for each new transition.
- Use official English card names and rule meaning, but original visual design.
- Do not ship official card artwork without permission from the rights holder.
- The player-facing name for the internal `Renegade` role is **Traitor**.
- The public game must remain playable without GitHub or ChatGPT sign-in.
- Mobile clarity and visible action order are important: always show the turn owner, phase, acting player, card, source and target.
- Public played/revealed cards currently remain for 1 second; event messages and private draws remain for 3 seconds. Dying rescue decisions retain their separate 5-second action window.

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
- one of every implemented card in `ME`'s opening hand.

Implemented shared rules include:

- Draw, Play, Discard and Ending phases;
- authoritative turn owner, acting player and ordered response state;
- seat order, living-player distance and range-1 Attack;
- Attack/Dodge, Duel and ordered global-card response chains;
- Attack and Dodge responses to global AOE cards are presented without a player-to-player direction;
- Peach healing and turn-ordered Dying rescue;
- death, defeated-hand cleanup, public role reveal, Rebel defeat reward, the Lord's Loyalist-kill penalty and match victory checks;
- bot draw, play, response, rescue, discard and repeated-round operation;
- private draws, private rescue prompts and public action presentations;
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

`Strike` remains only as a saved-game compatibility alias for Attack.

## Recent interaction work

The most recent rules change added Lightning and made delayed-card resolution reusable:

- Lightning is placed in its owner's Judgement Zone and can be Negated before placement.
- Each delayed card now resolves individually, preserving later cards and their own Negation windows.
- A Spade 2–9 judgement deals 3 source-free thunder damage and enters the normal Peach rescue flow when lethal.
- Every other judgement transfers Lightning to the next eligible living character without creating a duplicate Lightning in one Judgement Zone.
- Bots place and resolve Lightning, and quick-test mode gives `ME` a Lightning card.
- Deterministic API coverage protects placement, duplicate prevention, transfer and damage.

Earlier interaction work concentrated on latency and Bumper Harvest:

- Opening automatic draw begins after approximately 0.1 seconds instead of waiting behind the turn banner.
- A card played during Play Phase is presented optimistically while the server validates it.
- Optimistic played cards expire locally after 1 second instead of waiting for the server response; the later authoritative copy is recorded but not presented twice.
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
| Played/revealed card | 1000 ms | Show the public card, source and target. This no longer waits for the action response. |
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
- `players`: seat, hidden role, hero, HP, hand and private session hash;
- `game_audit`: transition and action audit rows; and
- `audit_scope`: identifies the one room whose audit is retained.

Schema definitions are in `db/schema.ts`; migrations are in `drizzle/`.

## Rule and naming source

Read `docs/OFFICIAL_CARD_REFERENCE.md` before adding or renaming a card. The development source of truth is YOKA Games' official English catalogue:

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
- internal `Renegade` → player-facing Traitor
- legacy `Strike` → Attack

## Adding the next card

Follow this checklist:

1. Verify the official English name, category, card ID and rule meaning.
2. Add a stable `CardKind` in `game/model.ts`.
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

`npm test` performs a production build and runs the API and rendered-client suites. The current expected result is 14 passing test flows.

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
- Stage 3: complete the general card set.

Recommended next sequence:

1. Continue extracting shared ordered-response/resolution helpers from `app/api/rooms/route.ts`.
2. Negation (official card 108) now has ordered Play/Pass controls, bot responses, counter-Negation parity, quick-test cards, deterministic single-target coverage and a fresh response window for every Barbarian Invasion or Raining Arrows target, including AOE cards played by bots.
3. Overindulgence (official card 177) adds the public Judgement Zone, placement-time Negation, duplicate prevention, public judgement reveals, Heart success, non-Heart Play Phase skipping and bot resolution.
4. Lightning (official card 107) is complete: self-placement, duplicate prevention, placement/judgement Negation, Spade 2–9 judgement, 3 source-free thunder damage, Dying rescue, transfer to the next eligible living character, bot play and deterministic tests.
5. Add Rations Depleted (official card 199) next and continue extracting shared judgement/strategy-resolution helpers.
6. Defer Borrowed Sword until equipment zones exist.
7. Continue through remaining response-chain cards and Judgement Zone edge cases.
8. Add equipment and distance modifiers.
9. Extend role-outcome and defeat cleanup to future equipment and judgement cards.
10. Add hero abilities only after shared rules and cards are stable.

## Known boundaries

- The game uses HTTP polling, not WebSockets.
- Only the current action owner can submit a legal action; there is no simultaneous response system.
- The Judgement Zone supports Overindulgence and Lightning. Delayed cards resolve one at a time so Negation, transfer and Dying interruptions do not consume later judgement cards. Equipment Zones do not exist yet, so Burning Bridges and Steal currently operate on hand cards only.
- Most hero abilities are intentionally placeholders; Zhang Fei's repeated Attack behaviour is the principal test exception.
- Reconnect uses the private room session stored on the device.
- Saved match history, player profiles, statistics, sound and richer invitations are not implemented.
- The Site is public, but the GitHub repository may remain private and requires collaborator access for contributors.

## Safe continuation prompt

In the next chat, say:

> Continue the Three Kingdoms project from the latest `main`. Read `HANDOVER.md`, `README.md` and `docs/OFFICIAL_CARD_REFERENCE.md` first. Preserve the general-rules-before-heroes priority, run all tests, then push the exact commit to both GitHub and the ChatGPT Sites repository and deploy it to the existing public Site.
