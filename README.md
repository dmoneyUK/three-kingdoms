# Three Kingdoms

An English online implementation of WTK Standard, the classic hidden-role Three Kingdoms card game, built for small private groups of friends.

- Play: https://three-kingdoms.dai-jinge.workers.dev
- Source: https://github.com/dmoneyUK/three-kingdoms
- Development handover: [HANDOVER.md](HANDOVER.md)
- Roadmap: [ROADMAP.md](ROADMAP.md)
- Official card reference: [docs/OFFICIAL_CARD_REFERENCE.md](docs/OFFICIAL_CARD_REFERENCE.md)
- Current stage: **playable four-player alpha — 28 / 28 verified Standard card identities and the physical Standard 108-card deck complete; Stage 5 match-rule correctness COMPLETE; Stage 6 Round 1 roster reconciliation, Guan Yu Wusheng hardening, Step 4.3 response-helper cleanup, single-controller bot-surface removal, Step 5E response-builder typing, Step 6B Negation canonicalization, Step 7B.1 legacy persisted-response rejection, Step 7C direct response construction, and Step 7D response architecture documentation closure COMPLETE**

Step 7D closes the semantic response architecture cleanup. `ResponsePending` is the sole semantic Attack, Duel,
Group, and Negation decision shape. Attack, ordinary AOE, Halberd, and Duel
creation now return canonical responses directly; DeferredStratagem stores
canonical Duel and Group responses; continuations are explicit domain types;
and `serializePending()` performs serialization only. No response-family
conversion helpers, builder conversions, or legacy response decision types
remain. `TriggerPending` is the only persisted semantic trigger decision, and
old saved Attack/Duel/Group/Negation response states are unsupported. The next
milestone is selecting and implementing the next scoped Standard hero.

Stage 6 architecture cleanup is canonical-only: supported gameplay commands are `respond`, `decline_response`, `trigger`, and `decline_trigger`, and `currentAction` is the authoritative client decision contract. Old clients and persisted in-progress legacy decisions are unsupported. Future cards and heroes must expose provider capabilities through this semantic contract, never concrete provider-specific HTTP actions. Wusheng conversion is explicit via `playAs: "attack"`; absent that field, the physical card performs its native action. Step 3.5 test cleanup, Step 4 Duel canonicalization, Step 4.3 response-helper cleanup, Step 5A Group/AOE response canonicalization, Step 5B `advanceGroup()` canonicalization, Step 5C canonical Dying Group resume, removal of inactive bot gameplay, Step 6A canonical Negation responses, the Step 6A.1 continuation boundary, Step 6B Negation canonicalization, Step 7A response expansion compatibility removal, Step 7B.1 rejection of legacy persisted Attack/Duel/Group/Negation response states, Step 7C direct response construction, and Step 7D documentation closure are complete. Audit/state validation, room projections, and response timers now read canonical `ResponsePending` and `TriggerPending` records directly; old response-family states never become actionable `currentAction` values or legacy response DTOs. Quick Test and normal multiplayer use human-style seats only; one Quick Test controller switches seats through the shared token. The next milestone is selecting and implementing the next scoped Standard hero.

The current deterministic suite has been consolidated to 74 tracked test
declarations while retaining the required human multiplayer and capability
invariants. Pure helper assertions now run in grouped cases, and inactive bot-only
tests and product paths have been removed. The Worker/D1 runner executes all 74 tests.

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

The foldable Game Messages window is the sole public textual event-history surface and derives its latest 10 entries from the authoritative server timeline. The centre presentation displays cards only: informational text never enters the sequential visual presentation queue, so response availability and timers still wait only for the exact `readyAfterEventId` card or essential visual event while card settlement animations retain their existing 4-second duration.

The game table now uses a responsive four-seat player board with no in-game top bar. Each player square keeps the hero name, HP, hand count, compact equipment and Judgement cards together; active and self seats remain visually identifiable, and distance is no longer shown in player UI cards. Quick Test now assigns each selected hero's real maximum HP, including the Lord's +1 bonus; Guan Yu therefore starts as Player1/Lord at 5 HP.

Raining Arrows is covered through the current semantic response path: each living target receives a Dodge decision, and declining or timing out that decision applies its 1 damage before the next target is processed.

The game surface keeps Exit available independently of the hidden top bar. Game Messages is the foldable event window and can be folded away to free table space; no separate popup history window is used, and the turn-status strip is intentionally omitted from the board.

Recent UX fixes complete three reported flows: a defensive horse can replace an equipped Hex Mark through the normal equipment-slot path; Borrowed Sword now exposes live Weapon holders as selectable targets before opening the forced Attack response; and resolved hero/equipment reactions emit a server-authored Game Messages entry plus a brief on-table “Effect Triggered” notice. These notices are informational and never delay decisions, timers, or card presentation barriers.

Player squares show a secret-role badge only for the local player. Negation skip controls keep a stable label while a request is in flight, avoiding transient status flicker. Equipment and Judgement tiles use a uniform compact card ratio, with taller player squares allowing the zone contents to remain readable.

## Source of knowledge

### Semantic execution status

The semantic response/trigger architecture is complete. All 28 / 28 verified Standard card identities and the exact physical Standard 108-card reconciliation are complete. Match-rule correctness, including delayed Stratagem/Judgement lifecycle, is complete; Stage 6 hero abilities is active.

The official **War of the Three Kingdoms (WTK) Game Card catalogue** is the primary source of truth for card names, product membership, categories and card rule meaning:

- **WTK Game Card catalogue:** https://wtkgames.com/gameCard/

For this project, always filter the catalogue to **Standard**. Endless Legends and Kingdom Wars cards are out of scope unless expansion development is explicitly enabled. When implementation behaviour, older project documentation, community translations or remembered rules conflict with the official WTK Standard catalogue, verify against the official catalogue and treat it as authoritative. The project's captured Standard reference is maintained in [`docs/OFFICIAL_CARD_REFERENCE.md`](docs/OFFICIAL_CARD_REFERENCE.md).

## Current Stage

Stage 6 Round 1 is complete. Step 3.5 test cleanup is complete, with behavioural coverage retained in the API/integration suite and brittle source-regex checks removed. Step 4 Duel canonicalization is complete: Duel uses `ResponsePending` plus `DuelContinuation` directly. Step 5A Group/AOE response canonicalization, Step 5B `advanceGroup()` canonicalization, and Step 6B Negation canonicalization are complete. New Standard games use the single 31-general
`STANDARD_HEROES` registry (Wei, Shu, Wu, Qun), including Yue Jin, Yu Jin,
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

The project has moved beyond the initial table prototype. A complete four-player match loop runs in normal human multiplayer rooms and a single-device Quick Test table. Quick Test is one controller playing every human-style seat in turn, with only the acting seat's hand visible at the bottom. Turn ownership, ordered responses, death rewards and victory checks are working. Human card and weapon responses use a 30-second action window. Bot gameplay is not supported.

The architecture milestone is complete. Normal Attack cards, Serpent Spear-formed Attacks, Green Dragon Blade follow-ups, and all verified card identities use the established semantic engine; Stage 5 match-rule correctness is complete and Stage 6 hero abilities is active.

The Cloudflare deployment workflow now performs a post-deploy smoke test against `/` and the Worker-only `/api/health` endpoint. A successful Wrangler upload is not considered production-ready unless both checks return successfully.

Room reads are now deliberately read-only: they do not refresh presence, progress gameplay, or run schema DDL. The browser polls every 8 seconds while idle, every second during an active response, and every 60 seconds in a hidden tab. Normal multiplayer presence uses a separate 60-second throttled heartbeat; Quick Test writes no presence rows. Timer-driven Bumper Harvest transitions use an explicit action at the authoritative deadline rather than GET polling. An active match with no game-state event for five minutes is closed as finished by the next one-minute inactivity check; opening a saved room also performs that check. Presentation events now carry a resolution identity separate from action revisions, plus explicit importance/final-result metadata, so informational response chatter can collapse without hiding essential outcomes. `currentAction` publishes the private semantic response or trigger decision and its legal providers. `ResponsePending` is requirement-centric, while `TriggerPending` persists the domain event and a small continuation for the supported reactions. New decision transitions pass their exact event ID directly; the barrier helper no longer scans logs, and log scanning is not part of the semantic decision contract. The client submits the generic `respond`/`decline_response` or `trigger`/`decline_trigger` protocol, and the server revalidates every provider against live state before the canonical continuation resumes. The semantic execution layer now advances Negation passes correctly, safely resumes secondary Judgement across response continuations, and resumes exhausted trigger events semantically (including deferred damage and Dying). The next work is the next scoped Standard hero.

Human response timing is now tied to the visible decision, rather than the server transition that created it. A response's providers, decline control, card/cost selectors and countdown remain unavailable while the preceding public presentation is active; all become interactive together once that presentation settles. Human decisions begin unarmed, and the first client timer request arms one fixed 30-second deadline; reloads and duplicate requests preserve it. The response UI renders the server-projected provider list directly: a provider first identifies itself, then the player supplies only the card cost permitted by that provider. Generic submission validates every provider's `min`/`max` card constraints and supports one or many cards; Play Phase Serpent Spear remains a separate weapon action. Response selection is reset whenever the authoritative action revision changes, so chained decisions cannot inherit a prior provider or card cost. Any former bot timing path is inactive legacy code.

Response providers now return semantic results—what requirement was satisfied, whether cards are consumed, or whether provider-owned secondary resolution is required—instead of selecting an HTTP action themselves. Eight Trigrams now requests a generic Judgement effect and owns the red-result rule; the route resolves the Judgement and resumes the stored Attack/AOE continuation without treating every Judgement as Eight Trigrams. The response registry also enforces one implicit (ordinary physical-card) provider at most for each requirement; all alternatives are explicit. Zhen Ji's Qingguo remains the first live hero proof: one black hand card can satisfy any Dodge requirement through generic `respond`, including the normal Attack pipeline, without adding a Zhen Ji branch to that resolver.

The regression runner now applies the tracked D1 migrations into an isolated `.wrangler/test-state` database before starting its Worker and explicitly registers the synthetic capability fixture only in that test Worker. This makes fresh CI checkout tests reproducible without modifying the developer's local game database while keeping production registries limited to real gameplay providers. Green Dragon Blade and Rock Cleaving Axe execute through provider-owned `attack_dodged` triggers, while Frost Sword is the representative `damage_about_to_apply` trigger: each equipment module owns availability and live selection validation rather than route code inspecting a weapon. Response decisions now carry a `readyAfterEventId`; the client waits only for that decision's required public event, not for an unrelated presentation queue to drain. Human Attack-dodged triggers and initial/counter Negation windows capture the exact event ID returned by event creation. Every Attack origin now enters the same damage-about-to-apply discovery path, including physical, Serpent Spear, and triggered follow-up Attacks. The Worker/D1 tests exercise unknown Attack, zero-card Dodge, zero-card Negate, and both synthetic trigger chains through the existing registration APIs; cleanup unregisters them when the isolated test Worker shuts down.

Room payloads are normalized at the API and client boundary: malformed timeline entries, null players, incomplete cards, nullable equipment/Judgement collections, and stale pending states are discarded or defaulted before React renders. Public projected pending DTOs retain their kind discriminator, so valid Negation, Harvest, target-card and Dying responses survive this safety boundary and keep their controls. Presentation events now carry a separate resolution identity plus explicit essential/informational and final-result metadata; the client can collapse stale audit chatter while preserving the meaningful result before enabling the next action. An incompatible restored session is cleared with a recovery message, and a game-screen error boundary prevents one corrupt room from taking down the whole application.

The trigger registry now evaluates every provider that can react to a domain event, rather than selecting a weapon-specific option in the route. Canonical `trigger` requests are revalidated against that complete live set, while old trigger request names are translated once at the API boundary for saved clients. Trigger providers can therefore use the same event context whether their costs are in Hand, Equipment, or the target's zones; Rock Cleaving Axe is the first provider migrated to this fully live context.

Triggered providers also declare a strongly typed semantic outcome instead of asking the route to recognize their identity: follow-up Attack, forced damage, damage prevention, or a non-terminal reaction that keeps the current event open. Attack-dodged and damage-about-to-apply trigger decisions are event-shaped: after a provider resolves, the engine applies its semantic outcome and resumes the effect without constructing a weapon-specific pending decision. Selected provider labels are carried as generic presentation metadata, so history remains player-readable without provider-specific rule branches. Target-card selections now use opaque keys and a target reference, preserving hidden-hand privacy. A non-terminal provider is excluded after it resolves; if no option remains, its continuation resumes immediately rather than leaving an empty response window. The trigger decision module now exposes lifecycle helpers for creation, human choice, continuation reopening and semantic resumption.

The semantic response and trigger protocol is the only supported gameplay
surface; provider-specific legacy action compatibility is removed. The current
browser renders only canonical response/trigger decisions. Canonical
target-card triggers—including Frost Sword—use one generic picker: hidden hand
cards remain opaque while eligible Equipment cards stay named.

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
- a single-device Quick Test controller that follows the legal acting seat and shows only that player's hand in the normal bottom area. Perspective changes never trigger a private draw. Quick Test names its human-style seats Player1 through Player4, assigns Guan Yu to Player1, and guarantees a red Wusheng-capable card in Player1's opening hand while randomizing the rest of the opening draw.

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

The shared turn and response engine now uses effective horse-adjusted distance consistently in both UI and API, auto-resolves impossible Dodge responses, and keeps Quick Test at three HP with named mounts in the deck. Attack cards, Duel, AOE, Lightning, and forced damage converge on authoritative negative-HP and ordered Dying rules. After an unrescued defeat, outcome is calculated before exactly one legal continuation: finish, resume the interrupted effect, continue the AOE sequence, or advance to the next living turn owner. The dead saved-room trigger adapters and provider-specific Green Dragon Blade, Rock Cleaving Axe, and Frost Sword continuation branches have now been removed; `TriggerPending` is now the only trigger decision in the persisted `Pending` model, Attack responses now resolve directly from canonical `ResponsePending` plus `AttackContinuation`, Duel responses now resolve directly from `ResponsePending` plus `DuelContinuation`, `advanceGroup()` now reads canonical `ResponsePending` plus `GroupContinuation`, Dying Group resume storage now persists canonical `ResponsePending` as well, and Negation runtime now uses canonical `ResponsePending` plus `NegationContinuation`. Response architecture cleanup — COMPLETE. Dying / multi-damage — COMPLETE. Death / continuation / match outcome — COMPLETE. Stage 5 delayed Stratagem/Judgement lifecycle — COMPLETE. Stage 6 hero abilities — ACTIVE.

## Roadmap

Negation now resolves each target separately: its initial window starts at the target and includes the Stratagem user. Passing is final within that opportunity; playing Negation opens a new counter window after its player. Once everyone passes, parity determines whether the normal Dodge/Attack/Serpent Spear response opens, with a fresh timer. Eight Trigrams can now provide an optional Judgement-based Dodge for both physical and Serpent Spear-formed Attacks. The reusable `attack_targeted` event now supports target-owned decisions and Yin-Yang Swords before Armor/Dodge resolution. Semantic response/trigger architecture, Dying/multi-damage, death/continuation/match outcome, and delayed Stratagem/Judgement lifecycle are complete. Stage 5 is complete; Stage 6 hero abilities is active.

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
