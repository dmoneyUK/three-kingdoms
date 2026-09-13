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

This response architecture should now be treated as the foundation, not redesigned again.

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

Canonical decisions now accept an exact presentation event ID from event creation; new trigger creation uses that direct reference, while older response creators continue through the compatibility fallback until their next focused migration. `roomState()` retains log scanning only for old saved rooms.

## Compatibility cleanup — incremental and saved-room safe

Legacy protocol/pending compatibility still exists intentionally:

- provider-specific response actions such as `respond_dodge`, `respond_group`, `respond_negation`, `respond_eight_trigrams`;
- weapon-specific trigger actions such as `respond_green_dragon`, `respond_rock_cleaving`, `use_frost_sword` and their pass actions;
- legacy-shaped `ResponseContinuation` variants.

Remove these one path at a time only after the equivalent semantic decision is fully covered. Keep saved-game compatibility until the replacement path is proven; do not add any new card or hero capability to a legacy action branch.

## Validation status

The current architecture baseline is `5c3c19b` plus the final bot-response and barrier cleanup. Local validation is green (58 tests, build, lint, and diff check); GitHub Actions remains the release gate for the pushed commit.

Before continuing gameplay work, obtain a normal green Actions run for the current head. A workflow startup failure is neither a test failure nor a successful validation.

## Progress summary

| Stage | Status | Position |
| --- | --- | --- |
| 1. Stabilise the turn loop | Mostly complete | Turn ownership, phases, ordered responses, Dying interruption/resumption and repeated rounds are playable and regression-covered. |
| 2. Strengthen the general rules engine | Advanced; compatibility cleanup remains | Semantic responses, trigger decisions and transition-owned presentation barriers are established. Next: retire compatibility paths incrementally, then return to the card roadmap. |
| 3. Complete the verified Standard card identities | **24 / 28 playable** | Four verified identities remain: Blue Steel Sword, Yin-Yang Swords, Kirin Bow and Borrowed Sword. |
| 4. Reconcile the physical Standard deck | In progress | `docs/STANDARD_108_DECK_MANIFEST.md` remains the exact quantity/suit/rank target. |
| 5. Complete match rules | Partly implemented | Main death/reward/victory paths work; edge cases still need expansion. |
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

## Standard 108-card manifest audit — in progress

`docs/STANDARD_108_DECK_MANIFEST.md` is the physical-card target. Before calling the Standard deck complete, reconcile all **108 physical cards**, exact suit/rank assignments, quantities and six named mounts with the runtime deck.

The six named mounts are represented separately in new decks: Shadowrunner, Hex Mark, Yellow-Hoofed Flying-Lightning, Red Hare, Purple Bay and Fergana Steed. Legacy generic `OffensiveHorse` / `DefensiveHorse` kinds remain readable only for old saved rooms.

The 28-card identity roadmap below is distinct from that physical manifest; the manifest contains individual physical mount cards and quantities that are reconciled separately.

## Remaining verified WTK Standard card identities

Implementation order is dependency-driven.

### 1. Blue Steel Sword

**6 ♠ — Weapon — Attack Range 2**

Passive: the owner's `[Attack]` ignores the target's Armor.

Architecture/rules work:

- add the weapon and range;
- suppress Armor effects for that Attack without unequipping or hiding the Armor;
- bypass Nio Shield prevention;
- prevent Eight Trigrams from being offered for that Attack;
- keep the Attack otherwise on the shared declaration/response/damage pipeline;
- add regression tests against both Armor cards and against unarmored targets.

This is the next card after the architecture work above because it is a good proof that passive capabilities can be contextually suppressed without hard-coding Armor identities into the Attack resolver.

### 2. Yin-Yang Swords

**2 ♠ — Weapon — Attack Range 2**

When `[Attack]` targets a character of the opposite gender, that target chooses to discard one hand card or let the attacker draw one card.

Work:

- make hero gender authoritative game state;
- introduce a target-owned Attack trigger/decision;
- offer discard-one-hand-card vs attacker-draw;
- if the target has no hand card, only the draw branch remains;
- test human/bot, same-gender and opposite-gender paths.

### 3. Kirin Bow

**5 ♦ — Weapon — Attack Range 5**

When `[Attack]` inflicts damage, the attacker may discard one Mount from the damaged character's Equipment Zone.

Work:

- add weapon/range;
- trigger only after Attack actually inflicts damage;
- expose a choice when both Mount slots are eligible;
- do nothing when no Mount is equipped;
- verify Frost Sword replacement prevents this trigger because no Attack damage occurred.

### 4. Borrowed Sword

**Q ♣ — Regular Stratagem**

Target another character who has a Weapon. That character must play `[Attack]` against a legal second target chosen by the Borrowed Sword user; otherwise the Borrowed Sword user obtains the first target's Weapon.

Work:

- require first target to have a Weapon;
- choose a second target using the weapon holder's current attack range;
- run the forced Attack through the normal Attack/Dodge/equipment/damage pipeline;
- if the first target cannot or does not provide Attack, transfer the Weapon rather than discard it;
- support Negation before the effect resolves;
- test range, successful Attack, refusal/no Attack, Negation, transfer and replacement.

## Verified implemented Standard identities — 24

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
