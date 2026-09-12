# Three Kingdoms Roadmap

## Latest stability milestone — D1-efficient room reads

Room GET requests are now read-only: they no longer update presence, advance game timers, or run DDL/schema checks. Migrations remain the deployment-time schema authority. The client uses 8-second idle polling, 1-second response polling, and 60-second hidden-tab polling. Human presence is a separate, guarded 60-second heartbeat; Quick Test produces no four-seat presence writes. Bumper Harvest deadline progression is explicitly submitted once by the active client instead of being a side effect of fast polling. Regression coverage verifies a room read leaves `connected_at` unchanged and a fresh heartbeat produces no second write. Next: finish the incremental action-view migration, then implement Blue Steel Sword.

Active games now have a five-minute no-event expiry. A D1 activity trigger records real room-state transitions, not GET polling or presence heartbeats. An open client checks once per minute and on room load; if the five-minute deadline has passed, the match becomes finished with a public closing event. A completely clientless Worker cannot run a timer by itself, so an abandoned room is finalized on the next check or when someone returns.

Presentation sequencing now has its own `resolutionId`, separate from `actionRevision`. Group and Negation pending state carries the identity across AOE targets and counter-rounds. Timeline events are created with explicit importance and final-result metadata, allowing the client to collapse informational Negation/pass backlog while preserving essential card/effect results. Next: finish the canonical action-view migration, then continue the Standard card roadmap.

Capability migration now publishes a semantic response view without changing persisted pending compatibility: `game/responses.ts` exposes requirements and registered executable response providers with selection constraints, while `game/response-decision.ts` turns a pending requirement plus private actor state into its safe client view. Physical Attack/Dodge/Negation cards are core providers; Eight Trigrams and Serpent Spear each live in dedicated equipment modules. `currentAction` publishes its authoritative `requirement`, provider `options`, and decline action only to the acting player; `POST { action: "respond", providerId, cardId/cardIds }` revalidates the live provider, then lets that provider validate the selection and choose its legacy resolver path. Nio Shield now contributes through the passive Attack-modifier registry, and Green Dragon Blade through the Attack-dodged trigger registry. Legacy response actions remain available during migration. Next: persist the semantic requirement as the single canonical pending decision, then route trigger resolution through the same interfaces.

### CI D1 initialization — complete

`tests/run-tests.mjs` now applies the repository's D1 migrations to its own `.wrangler/test-state` before launching the test Worker. The API suite no longer relies on a pre-existing developer database, so a fresh GitHub Actions runner starts with the required `rooms` and `players` schema. The isolated worker always runs on port 3137 and never reuses the local game on port 3000. Next: add the atomic presentation/decision barrier, then continue the canonical pending-decision migration.

## Latest stability milestone — canonical action protocol

The first architecture-stabilisation slice is complete. `game/pending.ts` now owns the server's persisted `Pending` discriminated union rather than keeping it inside the HTTP route. `game/protocol.js` is executable shared protocol data for the Worker, browser and Node tests; it owns the gameplay action vocabulary. Every room view now contains a versioned, viewer-private `currentAction` with one canonical kind, actor, deadline, reason and legal action list. The API computes that list from authoritative state without disclosing another player's hand. The client submits stale-action context from canonical `pending.kind`, renders response capabilities from `currentAction.legalActions`, and retains the existing detailed pending projections only as a temporary presentation adapter. The room safety normalizer validates the contract and drops unknown legal actions. Tests cover normalization, client rendering, browser-context responses and the full API game suite. Next: migrate the remaining response/presentation details from `pendingX` compatibility fields to the canonical action view, then resume Blue Steel Sword.

## Previous stability milestone — Quick Test response synchronization

Quick Test gameplay POSTs now reload the authoritative room and derive the controlled seat from the live phase/pending actor before resolving an action. Requests carry the displayed action revision; stale requests return the latest room state instead of mutating an advanced response. The browser serializes mutations and prevents timeout/manual double submissions. The client maps each pending field to the server's exact lowercase/snake-case protocol kind before submitting that context, so valid Dodge and Negation clicks are not falsely rejected as stale. Unknown response states no longer fall back to Dodge or take-damage controls. Public pending DTOs retain their discriminator through the room-safety normalizer, so a valid Negation window cannot be mistaken for an unknown response state. Regression coverage includes ordered AOE perspective changes, stale Something Out of Nothing actions, no-Negation resolution, browser-context Dodge resolution, and safe rendering of valid and invalid response states. Negation windows now also record opening, pass, counter-window and closure events in Event History.

This roadmap is aligned to the verified WTK Standard card reference in `docs/OFFICIAL_CARD_REFERENCE.md`.

## Progress summary

| Stage | Status | Position |
| --- | --- | --- |
| 1. Stabilise the turn loop | Mostly complete; regression-driven maintenance | Core ownership, phase order, repeated rounds, Dying interruption/resumption and response chains are playable and tested. |
| 2. Strengthen the general rules engine | In progress — architecture slice started | Pending-state and action vocabulary are shared; migrate the remaining response details and extract deterministic resolvers from the route. |
| 3. Complete the verified Standard card set | 24 / 28 verified card identities playable; mount identity corrected, quantity audit pending | Six physical mounts are now distinct in new decks. Four verified identities and the remaining 108-card quantity/suit/rank reconciliation remain. |
| 4. Equipment and distance modifiers | In progress — current feature focus | Weapon, Armor and Mount slots are playable. Four verified weapon interactions remain. |
| 5. Complete match rules | Partly implemented | Death cleanup, role reveal, Rebel rewards, Lord/Loyalist penalty and main victory paths work; remaining edge cases need expansion. |
| 6. Hero-specific abilities | Deferred | Begin after shared cards and rules are stable. |
| 7. Product polish | Ongoing alongside rules work | Continue mobile/UI work; sound, invitations and saved history remain planned. |

## Immediate rules correction

### Shared Attack declarations — complete

Normal Attack cards, Serpent Spear-formed Attacks and Green Dragon Blade follow-ups now construct the same semantic `AttackDeclaration` before entering the existing Dodge, Eight Trigrams, Nio Shield, Frost Sword and damage pipeline. The declaration preserves its origin, paid physical cards and (when present) the single physical Attack card/suit, so source-sensitive rules do not confuse a formed Attack with a black physical Attack. Pending Attack state carries that provenance for downstream responses. Regression coverage compares normal and Serpent Spear response state and keeps Eight Trigrams available for both. Future Attack-providing equipment and hero skills should register as new declaration providers rather than adding another downstream resolver branch.

### Delayed-card presentation and Quick Test seed — complete

Overindulgence, Lightning and Rations Depleted now use a target-specific Judgement Zone presentation: the centre reveal zooms out into the target's Judgement Zone, with the settled zone card hidden until the flight completes. The resolution caption identifies the Judgement Zone instead of presenting the card as a discard. Quick Test keeps its randomized opening hands but guarantees Player 1 one Serpent Spear for manual formed-Attack testing.

### Production health checks — complete

The Cloudflare workflow now smoke-tests the deployed root page and a Worker-only `/api/health` route after `wrangler deploy`. This catches Worker startup failures that a successful upload alone cannot detect without turning continuous health monitoring into D1 reads.

### Room payload safety — complete

The API filters malformed timeline records and one authoritative client normalizer validates the complete Room DTO before rendering. Null entries, incomplete cards, nullable player zones, missing optional collections, stale pending states, and empty arrays now degrade safely instead of taking down the page. Restored incompatible sessions are cleared, and a GameRoom error boundary logs only safe state context while returning the user to recovery.

### Sequential AOE and generic responses — complete

Each Negatable Stratagem opens a once-around response round beginning with its player. AOE repeats that round separately for each target. Counter-Negation rounds also begin with the latest Negation player, then visit each eligible living player once. Surviving effects use the shared Attack/Dodge response capability and cost validation in `game/responses.ts`. No-response damage is automatic. Response countdowns appear after five elapsed seconds, with the initial Negation actor indication hidden from other players during that interval. This reduces visible skip clues but is not a guarantee against timing inference. Next: Blue Steel Sword as the next Armor-bypass interaction.

### Negation-chain response context — complete

Counter-Negation windows now retain the root Stratagem separately from the latest Negation event. Response order still starts after the latest Negation player, while prompts identify the current Negation being answered.

### Quick Test perspective privacy — complete

Quick Test follows the current actor using the normal bottom seat, hand and hero/role/HP. Opponent hand previews and full-hand payloads are removed. Switching `meId` establishes a new hand baseline and cancels prior private presentations; only new same-player draw events can show PRIVATE DRAW. The baseline helper is plain ESM JavaScript so deployment tests run without a TypeScript loader. Negation order and normal multiplayer session ownership are unchanged. Next card milestone remains Eight Trigrams Formation.

The Quick Test opening now guarantees the newest implemented card (currently Eight Trigrams Formation) plus three Attacks for ME; all other opening cards remain randomized from the shuffled deck.

### Ordered Negation windows — complete

Initial targeted-card windows start at the affected target; AOE windows now start at the turn owner. Both include the user. Counter windows start after the latest Negation player and can reach that player last. Pass consumes one opportunity, while a newly played Negation resets eligibility. Raining Arrows and Barbarian Invasion finish each target before advancing; Duel (including bot-played Duel) uses the same Negation gate. Normal responses have fresh deadlines after the chain closes and accept any implemented legal provider of the required type. Eight Trigrams is now an additional normal Dodge response, never during Negation. Next: Blue Steel Sword.

### Equipment animation follow-up — complete

Removed optimistic equipment entries from retained sequence cards. While a public equipment reveal is queued or active, its rack slot remains reserved but the card is hidden. The reveal travels to that slot's measured position and size, then the rack card becomes visible. Equipment summaries remain in Event History without an additional timed message. Next card: Eight Trigrams Formation.

### Current rules-engine maintenance — complete

Attack and Steal targeting now share effective distance (including horses), so out-of-range targets are rejected before a card is consumed. A target with no Dodge and no implemented defensive capability is damaged immediately; response windows remain available for Dodge-capable hands and equipment. Quick Test uses three HP per seat, leaves horses in the draw deck, and the equipment rack supports four cards. Regression tests cover these paths.

### Standard 108-card manifest audit — in progress

`docs/STANDARD_108_DECK_MANIFEST.md` is the quantity and identity target. The four remaining gaps are Blue Steel Sword, Yin-Yang Swords, Kirin Bow and Borrowed Sword. Before calling the deck complete, reconcile the manifest's 108 physical cards (including exact suit/rank assignments and six named mounts) with the runtime deck; do not silently substitute generic horse cards or unverified expansion cards.

The six mount identities are now represented separately in new decks: Shadowrunner, Hex Mark, Yellow-Hoofed Flying-Lightning, Red Hare, Purple Bay and Fergana Steed, one physical card each. The legacy `OffensiveHorse` and `DefensiveHorse` kinds remain readable for saved rooms but are no longer dealt. The runtime deck is therefore intentionally still below 108 until the four remaining card identities and their quantities are implemented.

### Frost Sword correction — complete

Frost Sword now follows the verified Standard wording: its damage-replacement branch can select only cards in the target's **Hand or Equipment Zone**, never their **Judgement Zone**. The attacker still chooses one or two eligible cards, and the branch is unavailable when the target has no eligible cards. A regression test covers a target whose only card is in their Judgement Zone.

## Remaining verified WTK Standard cards

Implementation order is dependency-driven rather than catalogue order.

### Nio Shield — complete

**2 ♣ — Armor**

Passive immunity to black `[Attack]` cards is implemented. Nio Shield occupies the authoritative Armor slot, replaces only an existing Armor, is visible beside its owner, and cancels a black Attack before any Dodge or damage response for both human and bot players. Red Attacks still follow the ordinary response flow.

Regression coverage verifies human and bot targets. Blue Steel Sword must later suppress this effect for its own Attack without removing the Armor.

### 1. Eight Trigrams Formation — complete

**2 ♠ — Armor**

When a Dodge is needed, its owner may perform Judgement; a red result counts as `[Dodge]`, while a black result fails and resolves normal damage.

Implemented:
- reuses the authoritative Armor slot;
- adds an optional armor response alongside normal Dodge handling;
- resolves and discards the judgement card without corrupting the active Attack/global-card response sequence;
- supports direct Attack and sequential Raining Arrows responses;
- supports Serpent Spear-formed Attacks through the same abstract Dodge capability;
- exposes a human/Quick Test action and deterministic bot provider, with red-success, black-failure and no-use/Skip coverage.

### 2. Blue Steel Sword

**6 ♠ — Weapon — Attack Range 2**

Passive: the owner's `[Attack]` ignores the target's Armor.

Work:
- add the weapon and range;
- bypass Nio Shield and Eight Trigrams Formation for that Attack;
- keep armour equipped and visible; only suppress its effect for the relevant Attack;
- add regression tests against both armour cards.

### 3. Yin-Yang Swords

**2 ♠ — Weapon — Attack Range 2**

When `[Attack]` targets a character of the opposite gender, that target chooses to discard one hand card or let the attacker draw one card.

Work:
- ensure hero gender is authoritative in game state;
- insert a target-owned decision into Attack resolution;
- support discard-one-hand-card vs attacker-draw choice;
- define behaviour when the target has no hand card (only the draw branch remains);
- add human/bot, same-gender and opposite-gender tests.

### 4. Kirin Bow

**5 ♦ — Weapon — Attack Range 5**

When `[Attack]` inflicts damage, the attacker may discard one Mount from the damaged character's Equipment zone.

Work:
- add the weapon and range;
- trigger only after Attack actually inflicts damage;
- allow selection between eligible equipped Mounts when both are present;
- do nothing when no Mount is equipped;
- test interaction with Frost Sword's damage replacement (no damage means no Kirin Bow trigger).

### 5. Borrowed Sword

**Q ♣ — Regular (Stratagem)**

Target another character who has a Weapon. That character must play `[Attack]` against a character chosen by the Borrowed Sword user within the weapon holder's attack range; otherwise the Borrowed Sword user obtains the target's Weapon.

Work:
- require the first target to have a Weapon;
- choose a legal second target using the first target's current attack range;
- run the forced Attack through the normal Attack/Dodge/weapon/damage pipeline;
- if the first target cannot or does not play Attack, transfer their Weapon to the Borrowed Sword user rather than discard it;
- support Negation before the effect resolves;
- add tests for range, no Attack, successful Attack, Negation, weapon transfer and weapon replacement.

## Verified implemented Standard cards

The following 23 cards are currently treated as implemented:

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
- Fergana Steed
- Shadowrunner

## Cards removed from the active Standard roadmap pending verification

The previous README roadmap listed these as Standard, but they are **not present in the current 28-card verified reference supplied from the official WTK Standard catalogue**:

- Six Swords of Wu
- Two-bladed Trident
- Alliance
- Rest and Reorganization
- Know your Enemy

Do **not** implement these as Standard until they are independently verified against the official WTK Standard catalogue/product. Expansion cards from Endless Legends and Kingdom Wars remain out of scope.

## Development rules

- `docs/OFFICIAL_CARD_REFERENCE.md` is the repository's recorded source of truth for the verified Standard list.
- Keep internal card kinds stable where possible for saved-game compatibility.
- Every new card must have deterministic quick-test coverage and regression tests for its response-chain interactions.
- Equipment effects must be authoritative server-side; UI state must not decide legality or outcomes.
- Expansion cards remain disabled until explicitly enabled by the owner.
- Do not use official YOKA card artwork or other protected visual assets without permission.
