# Three Kingdoms Roadmap

This roadmap is aligned to the verified WTK Standard reference in `docs/OFFICIAL_CARD_REFERENCE.md`. Standard is the only active ruleset. Expansion cards stay out of scope unless the project owner explicitly changes that priority.

## Current architecture milestone — semantic decisions and capabilities

The response refactor has reached its intended core shape:

- `ResponsePending` is the canonical persisted response-decision wrapper;
- Attack, Duel, AOE and Negation expose semantic requirements (`attack`, `dodge`, `negate`);
- `currentAction` v3 privately projects the acting player's canonical `respond` / `decline_response`, provider options, deadline and presentation barrier;
- ordinary physical response cards are the single possible **implicit** provider;
- equipment/hero alternatives are **explicit** providers;
- providers validate live state and return semantic results rather than HTTP actions;
- Eight Trigrams uses generic provider-owned Judgement rather than an equipment-specific Judgement dispatch;
- Zhen Ji Qingguo proves a hero can satisfy Dodge without changing the central Attack resolver;
- Nio Shield is a passive Attack modifier;
- Green Dragon Blade, Rock Cleaving Axe and Frost Sword use executable triggered-effect capability modules;
- response interaction waits on a decision-specific `readyAfterEventId` instead of the entire presentation queue.
- `attack_targeted` is a reusable capability event. Its persisted semantic decision may be target-owned, so Quick Test and multiplayer project private choices to the established target actor.

This response architecture is complete and should now be treated as the foundation, not redesigned again. Saved-room compatibility and end-to-end synthetic provider proofs are covered by the green final validation batch.

## Architecture status — semantic responses, triggers, and presentation barriers

Trigger providers and the public trigger protocol are generic. The small continuation executors for Green Dragon Blade, Rock Cleaving Axe and Frost Sword remain route-specific only as a saved-room-safe compatibility layer; no new capability should add another provider-specific client action.

The canonical trigger decision is now implemented alongside `ResponsePending`:

```ts
type TriggerPending = {
  kind: "trigger";
  actorId: string;
  event: TriggerEvent;
  reason: string;
  deadline?: number;
  resolutionId?: string;
  continuation: TriggerContinuation;
};
```

Established flow:

```text
domain event occurs
    ↓
attack_dodged / damage_about_to_apply / future event
    ↓
discover live trigger providers
    ↓
project private trigger options
    ↓
player chooses one or declines
    ↓
provider validates + resolves semantic cost/effect
    ↓
resume continuation
```

The route does not need a new weapon/hero name when another capability reacts to an existing trigger event.

This remains deliberately bounded; do **not** build a universal effects DSL.

## Presentation architecture follow-up

The browser now waits for one concrete `currentAction.presentation.readyAfterEventId`, which fixes the earlier global-presentation gate and keeps all legal choices/timer atomic.

Canonical damage-trigger decisions accept the exact presentation event ID from event creation, as do all newly-created response/trigger decisions. `roomState()` retains log scanning only for old saved rooms as a bounded migration fallback.

## Compatibility cleanup — incremental and saved-room safe

Legacy protocol/pending compatibility still exists intentionally:

- provider-specific response actions such as `respond_dodge`, `respond_group`, `respond_negation`, `respond_eight_trigrams`;
- weapon-specific trigger actions such as `respond_green_dragon`, `respond_rock_cleaving`, `use_frost_sword` and their pass actions;
- legacy-shaped `ResponseContinuation` variants.

Remove these one path at a time only after the equivalent semantic decision is fully covered. Keep saved-game compatibility until the replacement path is proven; do not add any new card or hero capability to a legacy action branch.

## Validation status

Physical Standard 108-card deck — COMPLETE. Active milestone: Match-rule correctness / Dying and multi-damage. The semantic execution layer remains complete. Damage preserves actual resulting HP; Dying begins at hp <= 0; each Peach restores 1 HP; Dying ends only after hp >= 1 or rescue is exhausted. The server remains authoritative for negative HP and projects recoveryNeeded to the rescue actor.

## Progress summary

| Stage | Status | Position |
| --- | --- | --- |
| 1. Stabilise the turn loop | Mostly complete | Turn ownership, phases, ordered responses, Dying interruption/resumption and repeated rounds are playable and regression-covered. |
| 2. Strengthen the general rules engine | Complete | Semantic responses, trigger decisions, shared Attack damage execution, canonical Negation/secondary Judgement handling, fresh presentation barriers, and event-specific trigger resumption are implemented and covered by deterministic regressions and synthetic end-to-end extensibility proofs. |
| 3. Complete the verified Standard card identities | **28 / 28 playable** | Complete. All verified identities are implemented and dealt. |
| 4. Reconcile the physical Standard deck | **Complete** | The exact 108-card quantity/suit/rank manifest and six named mounts are implemented and validated. |
| 5. Complete match rules | **Active milestone** | Harden match-rule correctness, beginning with Dying and multi-point damage. |
| 6. Hero-specific abilities | Deferred except architecture proofs | Qingguo is the first live proof. Broad hero work begins after shared cards/rules architecture is stable. |
| 7. Product polish | Ongoing | Continue mobile clarity and presentation work; sound, invitations and saved history remain later work. |

## Stability foundation already complete

The following should remain invariant while the architecture migration continues:

- normal room GETs are read-only;
- presence is a separate throttled heartbeat;
- tests use isolated `.wrangler/test-state` D1 data;
- migrations are the schema authority;
- human response timers arm only after the decision is visible and duplicate starts cannot extend the deadline;
- Quick Test uses one controller token but only the acting seat's private state is projected;
- stale gameplay actions carry `actionRevision`/actor context and are rejected safely;
- `resolutionId` is separate from stale-action identity;
- presentation events carry importance/final-result metadata so informational backlog can collapse without dropping essential outcomes;
- room payloads are normalized before React renders.

## Rules-engine invariants

Keep these principles for all new cards and heroes:

- core rules request semantic results rather than know every card/skill that can produce them;
- provider availability is derived from authoritative state, not reconstructed by the client;
- one ordinary physical response provider may be implicit; all alternative abilities are explicit choices;
- passive prevention/modification happens before a response requirement when appropriate;
- triggered effects run from domain events after the triggering result exists;
- presentation may delay an entire decision but must never expose only part of its legal choice set;
- timers follow decision visibility, not server creation time;
- no private provider/card option may leak to non-acting viewers.

## Standard 108-card manifest audit — complete

`docs/STANDARD_108_DECK_MANIFEST.md` is the reconciled physical-card source. The audit covers all **108 physical cards**, exact suit/rank assignments, quantities and six named mounts in the runtime deck.

The six named mounts are represented separately in new decks: Shadowrunner, Hex Mark, Yellow-Hoofed Flying-Lightning, Red Hare, Purple Bay and Fergana Steed. Legacy generic `OffensiveHorse` / `DefensiveHorse` kinds remain readable only for old saved rooms.

The 28-card identity roadmap below is distinct from that physical manifest; the manifest contains individual physical mount cards and quantities that are reconciled separately.

## Physical Standard 108-card deck reconciliation — complete

The identity layer and physical manifest are complete. The runtime instantiates `docs/STANDARD_108_DECK_MANIFEST.md` as one canonical 108-entry collection with exact suit/rank assignments, quantities, and six named mounts. Stage 5 is now the active correctness milestone.

## Verified implemented Standard identities — 28

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
- Blue Steel Sword
- Yin-Yang Swords
- Kirin Bow
- Borrowed Sword

## Not on the active Standard roadmap

These previously appeared in older project notes but are not in the current verified 28-card Standard reference. Do not implement them as Standard without new official verification:

- Six Swords of Wu
- Two-bladed Trident
- Alliance
- Rest and Reorganization
- Know your Enemy

Endless Legends and Kingdom Wars remain out of scope.

## Release discipline

For functional changes follow `AGENTS.md`:

1. update `README.md` and `HANDOVER.md`;
2. keep Quick Test and deterministic regression coverage current;
3. run build, full tests, lint and `git diff --check`;
4. push validated code to `main`;
5. let GitHub Actions be the only production deployment path.
