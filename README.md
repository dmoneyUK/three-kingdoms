# Three Kingdoms

An English online implementation of WTK Standard, the classic hidden-role Three Kingdoms card game, built for small private groups of friends.

- Play: https://three-kingdoms.dai-jinge.workers.dev
- Source: https://github.com/dmoneyUK/three-kingdoms
- Development handover: [HANDOVER.md](HANDOVER.md)
- Roadmap: [ROADMAP.md](ROADMAP.md)
- Official card reference: [docs/OFFICIAL_CARD_REFERENCE.md](docs/OFFICIAL_CARD_REFERENCE.md)
- Current stage: **playable four-player alpha — architecture and D1 polling stabilisation**

## Source of knowledge

The official **War of the Three Kingdoms (WTK) Game Card catalogue** is the primary source of truth for card names, product membership, categories and card rule meaning:

- **WTK Game Card catalogue:** https://wtkgames.com/gameCard/

For this project, always filter the catalogue to **Standard**. Endless Legends and Kingdom Wars cards are out of scope unless expansion development is explicitly enabled. When implementation behaviour, older project documentation, community translations or remembered rules conflict with the official WTK Standard catalogue, verify against the official catalogue and treat it as authoritative. The project's captured Standard reference is maintained in [`docs/OFFICIAL_CARD_REFERENCE.md`](docs/OFFICIAL_CARD_REFERENCE.md).

## Current Stage

The project has moved beyond the initial table prototype. A complete four-player match loop runs in both normal multiplayer rooms and a single-device Quick Test table. Quick Test has no bot automation: one controller plays every seat in turn, with only the acting seat's hand visible at the bottom. Turn ownership, ordered responses, death rewards and victory checks are working. Human card and weapon responses use a 30-second action window while bot decisions retain a 10-second window in the dedicated automated regression fixture.

The current focus is **architecture stabilisation before the next weapon**. Normal Attack cards, Serpent Spear-formed Attacks and Green Dragon Blade follow-ups enter one shared semantic Attack declaration path, preserving the physical source card when downstream rules need its provenance. The persisted pending-decision union now lives in `game/pending.ts`, outside the HTTP route. The API publishes a canonical private `currentAction` (`kind`, actor, deadline, reason and legal actions), and the browser uses it for response selection and stale-action context instead of reconstructing the pending kind from nullable fields. Legacy projected pending fields remain temporarily for presentation detail while the UI migrates incrementally. Response capability discovery now has semantic `ActionRequirement`, `ResponseProvider`, and selection-constraint types; physical cards, Eight Trigrams, and Serpent Spear are registered providers, while compatibility protocol actions remain available during migration. Delayed Stratagems animate from the centre into the target's Judgement Zone, and Quick Test seeds Player 1 with Serpent Spear. Quick Test gameplay actions validate a live controller revision, return the newest room on stale actions, and serialize timeout/manual submissions. The UI no longer invents Dodge or damage controls for an unknown response state.

The Cloudflare deployment workflow now performs a post-deploy smoke test against `/` and the Worker-only `/api/health` endpoint. A successful Wrangler upload is not considered production-ready unless both checks return successfully.

Room reads are now deliberately read-only: they do not refresh presence, progress gameplay, or run schema DDL. The browser polls every 8 seconds while idle, every second during an active response, and every 60 seconds in a hidden tab. Normal multiplayer presence uses a separate 60-second throttled heartbeat; Quick Test writes no presence rows. Timer-driven Bumper Harvest transitions use an explicit action at the authoritative deadline rather than GET polling. An active match with no game-state event for five minutes is closed as finished by the next one-minute inactivity check; opening a saved room also performs that check. Presentation events now carry a resolution identity separate from action revisions, plus explicit importance/final-result metadata, so informational response chatter can collapse without hiding essential outcomes. `currentAction` now also publishes an authoritative semantic response requirement and its legal providers, and the API accepts the compatibility-safe generic `respond` action. Providers validate and select their resolver path themselves; Eight Trigrams and Serpent Spear now live in dedicated equipment capability modules. Nio Shield is a passive Attack modifier and Green Dragon Blade is an Attack-dodged trigger. The next milestone is to make response pending state requirement-centric before Blue Steel Sword.

Human response timing is now tied to the visible decision, rather than the server transition that created it. A response's providers, decline control, card/cost selectors and countdown remain unavailable while the preceding public presentation is active; all become interactive together once that presentation settles. Human decisions begin unarmed, and the first client timer request arms one fixed 30-second deadline; reloads and duplicate requests preserve it. Bot response windows retain their immediate 10-second clock. The response UI renders the server-projected provider list directly: a provider first identifies itself, then the player supplies only the card cost permitted by that provider. Generic submission validates every provider's `min`/`max` card constraints and supports one or many cards; Play Phase Serpent Spear remains a separate weapon action. Response selection is reset whenever the authoritative action revision changes, so chained decisions cannot inherit a prior provider or card cost.

Response providers now return semantic results—what requirement was satisfied, whether cards are consumed, and whether a Judgement is needed—instead of selecting an HTTP action themselves. The route adapts those results only at the legacy compatibility boundary. Zhen Ji's Qingguo is the first live hero proof: one black hand card can satisfy any Dodge requirement through generic `respond`, including the normal Attack pipeline, without adding a Zhen Ji branch to that resolver.

The regression runner now applies the tracked D1 migrations into an isolated `.wrangler/test-state` database before starting its Worker. This makes fresh CI checkout tests reproducible without modifying the developer's local game database. The next functional priority is the shared presentation/decision gate: every response provider and decline choice must become interactive together.

Room payloads are normalized at the API and client boundary: malformed timeline entries, null players, incomplete cards, nullable equipment/Judgement collections, and stale pending states are discarded or defaulted before React renders. Public projected pending DTOs retain their kind discriminator, so valid Negation, Harvest, target-card and Dying responses survive this safety boundary and keep their controls. Presentation events now carry a separate resolution identity plus explicit essential/informational and final-result metadata; the client can collapse stale audit chatter while preserving the meaningful result before enabling the next action. An incompatible restored session is cleared with a recovery message, and a game-screen error boundary prevents one corrupt room from taking down the whole application.

Negation response prompts now track the latest Negation in a counter-chain while retaining the original Stratagem as the root effect. Event History records each Negation window opening, pass, counter-window opening and closure, making Quick Test response transitions diagnosable instead of appearing to skip silently.

AOE resolves one target at a time. Each target's initial Negation round starts at the current turn owner; a counter round starts after its latest Negation player and includes that player last. After all passes, an effective AOE asks for the required Attack/Dodge capability, including implemented alternatives with their normal costs. Response countdowns appear after five elapsed seconds (the deadline is unchanged). Eight Trigrams Formation is the first alternative Dodge provider. The next milestone is to finish migrating the remaining response UI to `currentAction`, then implement Blue Steel Sword.

The playable alpha includes:

- automatic roles and hero assignment;
- Lord bonus HP and the Zhang Fei test hero;
- Draw, Play, Discard and Ending phases;
- turn ownership, seat order, distance and attack range;
- public equipment with authoritative equip, replacement and defeat cleanup;
- ordered Attack, Dodge, Duel and global-card responses;
- Peach healing and turn-ordered Dying rescue;
- death, role reveal, Rebel defeat rewards and the Lord's Loyalist-kill penalty;
- automatic bot drawing, card play, responses, rescue and discard;
- table-based card-resolution presentation;
- event history and detailed rule-audit trail; and
- deterministic quick-test setups for card and response-chain development.
- a single-device Quick Test controller that follows the legal acting seat and shows only that player's hand in the normal bottom area. Perspective changes never trigger a private draw. Quick Test guarantees the newest implemented card in ME's opening hand while randomizing the rest of the opening draw.

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
- Zhuge Crossbow
- Green Dragon Blade
- Serpent Spear
- Rock Cleaving Axe
- Sky Piercing Halberd
- Frost Sword
- Nio Shield
- Eight Trigrams Formation
- Fergana Steed
- Shadowrunner

### Remaining verified Standard cards

The verified remaining cards and implementation order are maintained in [ROADMAP.md](ROADMAP.md). The current verified remainder is:

1. Blue Steel Sword
2. Yin-Yang Swords
3. Kirin Bow
4. Borrowed Sword

The official catalogue and `docs/OFFICIAL_CARD_REFERENCE.md` take precedence over older roadmap/card lists.

### Current stage and next milestone

The shared turn and response engine now uses effective horse-adjusted distance consistently in both UI and API, auto-resolves impossible Dodge responses, and keeps Quick Test at three HP with named mounts in the deck. Equipment and delayed Stratagem presentations now settle directly into their owner's Equipment or Judgement Zone without a duplicate numbered copy. Attack cards, Serpent Spear formations and Green Dragon follow-ups converge on a shared declaration with origin and physical-card provenance. Quick Test controller races are guarded by an authoritative action revision, and invalid generic response fallbacks are suppressed. Room reads are non-mutating and D1-efficient. Eight Trigrams Formation remains the first alternative Dodge provider. The next milestone is the armor-bypassing Blue Steel Sword. The remaining 108-card manifest audit is tracked in `ROADMAP.md`.

## Roadmap

Negation now resolves each target separately: its initial window starts at the target and includes the Stratagem user. Passing is final within that opportunity; playing Negation opens a new counter window after its player. Once everyone passes, parity determines whether the normal Dodge/Attack/Serpent Spear response opens, with a fresh timer. Eight Trigrams can now provide an optional Judgement-based Dodge for both physical and Serpent Spear-formed Attacks; Blue Steel Sword is next.

Equipment presentation now uses a single centre-to-slot animation: the rack copy is hidden until the public reveal finishes, and no numbered sequence copy is retained. This covers both the optimistic player action and incoming events for other viewers. Eight Trigrams Formation now uses the same equipment rack and presentation path.

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
