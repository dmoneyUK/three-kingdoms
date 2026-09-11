# Three Kingdoms

An English online implementation of WTK Standard, the classic hidden-role Three Kingdoms card game, built for small private groups of friends.

- Play: https://three-kingdoms.dai-jinge.workers.dev
- Source: https://github.com/dmoneyUK/three-kingdoms
- Development handover: [HANDOVER.md](HANDOVER.md)
- Roadmap: [ROADMAP.md](ROADMAP.md)
- Official card reference: [docs/OFFICIAL_CARD_REFERENCE.md](docs/OFFICIAL_CARD_REFERENCE.md)
- Current stage: **playable four-player alpha — shared Attack/Dodge capabilities with Eight Trigrams Formation**

## Source of knowledge

The official **War of the Three Kingdoms (WTK) Game Card catalogue** is the primary source of truth for card names, product membership, categories and card rule meaning:

- **WTK Game Card catalogue:** https://wtkgames.com/gameCard/

For this project, always filter the catalogue to **Standard**. Endless Legends and Kingdom Wars cards are out of scope unless expansion development is explicitly enabled. When implementation behaviour, older project documentation, community translations or remembered rules conflict with the official WTK Standard catalogue, verify against the official catalogue and treat it as authoritative. The project's captured Standard reference is maintained in [`docs/OFFICIAL_CARD_REFERENCE.md`](docs/OFFICIAL_CARD_REFERENCE.md).

## Current Stage

The project has moved beyond the initial table prototype. A complete four-player match loop runs in both normal multiplayer rooms and a single-device Quick Test table. Quick Test has no bot automation: one controller plays every seat in turn, with only the acting seat's hand visible at the bottom. Turn ownership, ordered responses, death rewards and victory checks are working. Human card and weapon responses use a 30-second action window while bot decisions retain a 10-second window in the dedicated automated regression fixture.

The current feature focus is **equipment and distance modifiers** while rules-engine extraction and regression work continues. Expansion cards and hero-specific abilities remain intentionally deferred.

Negation response prompts now track the latest Negation in a counter-chain while retaining the original Stratagem as the root effect.

AOE resolves one target at a time. Each target's initial Negation round starts at the current turn owner; a counter round starts after its latest Negation player and includes that player last. After all passes, an effective AOE asks for the required Attack/Dodge capability, including implemented alternatives with their normal costs. Response countdowns appear after five elapsed seconds (the deadline is unchanged). Eight Trigrams Formation is the first alternative Dodge provider; next milestone is Blue Steel Sword.

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
- a single-device Quick Test controller that follows the legal acting seat and shows only that player's hand in the normal bottom area. Perspective changes never trigger a private draw.

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

The shared turn and response engine now uses effective horse-adjusted distance consistently in both UI and API, auto-resolves impossible Dodge responses, and keeps Quick Test at three HP with horses in the deck. Equipment presentations now settle directly into the owner's rack without a duplicate numbered copy. Eight Trigrams Formation is complete as the first alternative Dodge provider; the next milestone is the armor-bypassing Blue Steel Sword. The 108-card manifest audit is tracked in `ROADMAP.md`.

## Roadmap

Negation now resolves each target separately: its initial window starts at the target and includes the Stratagem user. Passing is final within that opportunity; playing Negation opens a new counter window after its player. Once everyone passes, parity determines whether the normal Dodge/Attack/Serpent Spear response opens, with a fresh timer. Eight Trigrams can now provide an optional Judgement-based Dodge; Blue Steel Sword is next.

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

## Contributing

1. Create a feature or bug-fix branch.
2. Keep card names and rules aligned with the official WTK Standard catalogue and `docs/OFFICIAL_CARD_REFERENCE.md`.
3. Run the tests and lint checks.
4. Open a pull request into `main`.

Do not add official card artwork, card scans, logos, frames or other YOKA visual assets without confirming usage rights. Create original visual assets for the playable site.
