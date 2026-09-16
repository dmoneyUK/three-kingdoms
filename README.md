# Three Kingdoms

An English online implementation of WTK Standard, the classic hidden-role Three Kingdoms card game, built for small private groups of friends.

- Play: https://three-kingdoms.dai-jinge.workers.dev
- Source: https://github.com/dmoneyUK/three-kingdoms
- Development handover: [HANDOVER.md](HANDOVER.md)
- Roadmap: [ROADMAP.md](ROADMAP.md)
- Official card reference: [docs/OFFICIAL_CARD_REFERENCE.md](docs/OFFICIAL_CARD_REFERENCE.md)
- Current stage: **playable four-player alpha — 28 / 28 verified Standard card identities and the physical Standard 108-card deck complete; active milestone is Match-rule correctness / Dying and multi-damage**

The latest architecture pass routes every Attack origin, including physical, Serpent Spear, triggered follow-up, Borrowed Sword, and human-controlled Quick Test Attacks, through the shared target, Dodge, Armor, damage, and Dying pipeline. Borrowed Sword is fully hardened in Standard games: after canonical Negation, its user chooses a live legal target, the Weapon holder receives a private semantic Attack decision with an idempotent human response timer, and refusal/no-provider transfer revalidates the persisted Weapon ID. Worker/D1 regressions cover races, stale targets/actions, physical and Serpent Spear providers, Dodge, and Yin-Yang Swords continuation.

Successful Judgement-based Negation now applies one transitioned parity/depth state before either opening a counter-window or resolving the effect.

The foldable Game Messages window is the sole public textual event-history surface and derives its latest 10 entries from the authoritative server timeline. The centre presentation displays cards only: informational text never enters the sequential visual presentation queue, so response availability and timers still wait only for the exact `readyAfterEventId` card or essential visual event while card settlement animations retain their existing 4-second duration.

The game table now uses a responsive four-seat player board with no in-game top bar. Each player square keeps the hero name, HP, hand count, compact equipment and Judgement cards together; active and self seats remain visually identifiable, and distance is no longer shown in player UI cards.

The game surface keeps Exit available independently of the hidden top bar. Game Messages is the foldable event window and can be folded away to free table space; no separate popup history window is used, and the turn-status strip is intentionally omitted from the board.

Player squares show a secret-role badge only for the local player. Negation skip controls keep a stable label while a request is in flight, avoiding transient status flicker. Equipment and Judgement tiles use a uniform compact card ratio, with taller player squares allowing the zone contents to remain readable.

## Source of knowledge

### Semantic execution status

The semantic response/trigger architecture is complete. All 28 / 28 verified Standard card identities and the exact physical Standard 108-card reconciliation are complete; Match-rule correctness / Dying and multi-damage is the active milestone.

The official **War of the Three Kingdoms (WTK) Game Card catalogue** is the primary source of truth for card names, product membership, categories and card rule meaning:

- **WTK Game Card catalogue:** https://wtkgames.com/gameCard/

For this project, always filter the catalogue to **Standard**. Endless Legends and Kingdom Wars cards are out of scope unless expansion development is explicitly enabled. When implementation behaviour, older project documentation, community translations or remembered rules conflict with the official WTK Standard catalogue, verify against the official catalogue and treat it as authoritative. The project's captured Standard reference is maintained in [`docs/OFFICIAL_CARD_REFERENCE.md`](docs/OFFICIAL_CARD_REFERENCE.md).

## Current Stage

The project has moved beyond the initial table prototype. A complete four-player match loop runs in normal human multiplayer rooms and a single-device Quick Test table. Quick Test is one controller playing every human-style seat in turn, with only the acting seat's hand visible at the bottom. Turn ownership, ordered responses, death rewards and victory checks are working. Human card and weapon responses use a 30-second action window. Any bot scheduler or bot response timing remaining in the repository is inactive legacy code, not an active product requirement.

The architecture milestone is complete. Normal Attack cards, Serpent Spear-formed Attacks, Green Dragon Blade follow-ups, and all verified card identities use the established semantic engine; the active work is match-rule correctness, including Dying and multi-point damage.

The Cloudflare deployment workflow now performs a post-deploy smoke test against `/` and the Worker-only `/api/health` endpoint. A successful Wrangler upload is not considered production-ready unless both checks return successfully.

Room reads are now deliberately read-only: they do not refresh presence, progress gameplay, or run schema DDL. The browser polls every 8 seconds while idle, every second during an active response, and every 60 seconds in a hidden tab. Normal multiplayer presence uses a separate 60-second throttled heartbeat; Quick Test writes no presence rows. Timer-driven Bumper Harvest transitions use an explicit action at the authoritative deadline rather than GET polling. An active match with no game-state event for five minutes is closed as finished by the next one-minute inactivity check; opening a saved room also performs that check. Presentation events now carry a resolution identity separate from action revisions, plus explicit importance/final-result metadata, so informational response chatter can collapse without hiding essential outcomes. `currentAction` publishes the private semantic response or trigger decision and its legal providers. `ResponsePending` is requirement-centric, while `TriggerPending` persists the domain event and a small continuation for the supported reactions. New decision transitions pass their exact event ID directly; the barrier helper no longer scans logs, and log scanning is retained only for legacy room projection. The client submits the generic `respond`/`decline_response` or `trigger`/`decline_trigger` protocol, and the server revalidates every provider against live state before a compatibility continuation resumes. The semantic execution layer now advances Negation passes correctly, safely resumes secondary Judgement across response continuations, and resumes exhausted trigger events semantically (including deferred damage and Dying). Saved-room compatibility is the remaining bounded boundary concern before new cards.

Human response timing is now tied to the visible decision, rather than the server transition that created it. A response's providers, decline control, card/cost selectors and countdown remain unavailable while the preceding public presentation is active; all become interactive together once that presentation settles. Human decisions begin unarmed, and the first client timer request arms one fixed 30-second deadline; reloads and duplicate requests preserve it. The response UI renders the server-projected provider list directly: a provider first identifies itself, then the player supplies only the card cost permitted by that provider. Generic submission validates every provider's `min`/`max` card constraints and supports one or many cards; Play Phase Serpent Spear remains a separate weapon action. Response selection is reset whenever the authoritative action revision changes, so chained decisions cannot inherit a prior provider or card cost. Any former bot timing path is inactive legacy code.

Response providers now return semantic results—what requirement was satisfied, whether cards are consumed, or whether provider-owned secondary resolution is required—instead of selecting an HTTP action themselves. Eight Trigrams now requests a generic Judgement effect and owns the red-result rule; the route resolves the Judgement and resumes the stored Attack/AOE continuation without treating every Judgement as Eight Trigrams. The response registry also enforces one implicit (ordinary physical-card) provider at most for each requirement; all alternatives are explicit. Zhen Ji's Qingguo remains the first live hero proof: one black hand card can satisfy any Dodge requirement through generic `respond`, including the normal Attack pipeline, without adding a Zhen Ji branch to that resolver.

The regression runner now applies the tracked D1 migrations into an isolated `.wrangler/test-state` database before starting its Worker and explicitly registers the synthetic capability fixture only in that test Worker. This makes fresh CI checkout tests reproducible without modifying the developer's local game database while keeping production registries limited to real gameplay providers. Green Dragon Blade and Rock Cleaving Axe execute through provider-owned `attack_dodged` triggers, while Frost Sword is the representative `damage_about_to_apply` trigger: each equipment module owns availability and live selection validation rather than route code inspecting a weapon. Response decisions now carry a `readyAfterEventId`; the client waits only for that decision's required public event, not for an unrelated presentation queue to drain. Human Attack-dodged triggers and initial/counter Negation windows capture the exact event ID returned by event creation. Every Attack origin now enters the same damage-about-to-apply discovery path, including physical, Serpent Spear, and triggered follow-up Attacks. The Worker/D1 tests exercise unknown Attack, zero-card Dodge, zero-card Negate, and both synthetic trigger chains through the existing registration APIs; cleanup unregisters them when the isolated test Worker shuts down.

Room payloads are normalized at the API and client boundary: malformed timeline entries, null players, incomplete cards, nullable equipment/Judgement collections, and stale pending states are discarded or defaulted before React renders. Public projected pending DTOs retain their kind discriminator, so valid Negation, Harvest, target-card and Dying responses survive this safety boundary and keep their controls. Presentation events now carry a separate resolution identity plus explicit essential/informational and final-result metadata; the client can collapse stale audit chatter while preserving the meaningful result before enabling the next action. An incompatible restored session is cleared with a recovery message, and a game-screen error boundary prevents one corrupt room from taking down the whole application.

The trigger registry now evaluates every provider that can react to a domain event, rather than selecting a weapon-specific option in the route. Canonical `trigger` requests are revalidated against that complete live set, while old trigger request names are translated once at the API boundary for saved clients. Trigger providers can therefore use the same event context whether their costs are in Hand, Equipment, or the target's zones; Rock Cleaving Axe is the first provider migrated to this fully live context.

Triggered providers also declare a strongly typed semantic outcome instead of asking the route to recognize their identity: follow-up Attack, forced damage, damage prevention, or a non-terminal reaction that keeps the current event open. Attack-dodged and damage-about-to-apply trigger decisions are event-shaped: after a provider resolves, the engine applies its semantic outcome and resumes the effect without constructing a weapon-specific pending decision. Selected provider labels are carried as generic presentation metadata, so history remains player-readable without provider-specific rule branches. Target-card selections now use opaque keys and a target reference, preserving hidden-hand privacy. A non-terminal provider is excluded after it resolves; if no option remains, its continuation resumes immediately rather than leaving an empty response window. The trigger decision module now exposes lifecycle helpers for creation, human choice, continuation reopening and semantic resumption.

The remaining legacy response and trigger names are isolated in `game/compat/legacy-actions.ts`. They are accepted only for saved/older clients, then translated once at the HTTP boundary into canonical `respond`, `decline_response`, `trigger`, or `decline_trigger` commands before gameplay resolution begins. The current browser renders only canonical response/trigger decisions. Canonical target-card triggers—including Frost Sword—use one generic picker: hidden hand cards remain opaque while eligible Equipment cards stay named.

Negation response prompts now track the latest Negation in a counter-chain while retaining the original Stratagem as the root effect. Event History records each Negation window opening, pass, counter-window opening and closure, making Quick Test response transitions diagnosable instead of appearing to skip silently.

AOE resolves one target at a time. Each target's initial Negation round starts at the current turn owner; a counter round starts after its latest Negation player and includes that player last. After all passes, an effective AOE asks for the required Attack/Dodge capability, including implemented alternatives with their normal costs. Response countdowns appear after five elapsed seconds (the deadline is unchanged). Eight Trigrams Formation is the first alternative Dodge provider. Compatibility remains a bounded input/state adapter; match-rule correctness is the active milestone.

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
- Kirin Bow
- Yin-Yang Swords
- Nio Shield
- Eight Trigrams Formation
- Fergana Steed
- Shadowrunner

### Remaining verified Standard cards

The verified remaining cards and implementation order are maintained in [ROADMAP.md](ROADMAP.md). The current verified remainder is:

Physical Standard 108-card deck — COMPLETE. The active milestone is Match-rule correctness / Dying and multi-damage.

The official catalogue and `docs/OFFICIAL_CARD_REFERENCE.md` take precedence over older roadmap/card lists.

### Current stage and next milestone

The shared turn and response engine now uses effective horse-adjusted distance consistently in both UI and API, auto-resolves impossible Dodge responses, and keeps Quick Test at three HP with named mounts in the deck. Equipment and delayed Stratagem presentations now settle directly into their owner's Equipment or Judgement Zone without a duplicate numbered copy. Attack cards, Serpent Spear formations, Green Dragon follow-ups, Lightning, Duel, AOE, and forced damage converge on damage rules that preserve actual resulting HP. Dying begins at hp <= 0; each Peach restores 1 HP; Dying ends only after hp >= 1 or rescue is exhausted. The server projects recoveryNeeded for the rescue actor without moving rule calculation into React. The semantic response/trigger architecture milestone remains complete.

## Roadmap

Negation now resolves each target separately: its initial window starts at the target and includes the Stratagem user. Passing is final within that opportunity; playing Negation opens a new counter window after its player. Once everyone passes, parity determines whether the normal Dodge/Attack/Serpent Spear response opens, with a fresh timer. Eight Trigrams can now provide an optional Judgement-based Dodge for both physical and Serpent Spear-formed Attacks. The reusable `attack_targeted` event now supports target-owned decisions and Yin-Yang Swords before Armor/Dodge resolution. Semantic response/trigger architecture remains complete; Blue Steel Sword, Yin-Yang Swords, Kirin Bow, and Borrowed Sword are implemented and dealt. The next milestone is match-rule correctness / Dying and multi-damage.

Equipment presentation now uses a single centre-to-slot animation: the rack copy is hidden until the public reveal finishes, and no numbered sequence copy is retained. This covers both the optimistic player action and incoming events for other viewers. Eight Trigrams Formation now uses the same equipment rack and presentation path. Equipment and Judgement Zone cards retain an info button that opens their existing card explanation dialog. Informational gameplay messages appear only in the foldable Game Messages window, which retains the latest 10 public events in chronological order and does not hold cards, decisions, turns, timers, or later animations. The canonical equipment card event supplies rank, suit, and name; the redundant semantic equipment history event is removed.

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
