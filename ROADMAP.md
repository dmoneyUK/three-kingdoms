# Three Kingdoms Roadmap

This roadmap is aligned to the verified WTK Standard card reference in `docs/OFFICIAL_CARD_REFERENCE.md`.

## Progress summary

| Stage | Status | Position |
| --- | --- | --- |
| 1. Stabilise the turn loop | Mostly complete; regression-driven maintenance | Core ownership, phase order, repeated rounds, Dying interruption/resumption and response chains are playable and tested. |
| 2. Strengthen the general rules engine | In progress alongside card work | Ordered pending actions and ownership checks are stable. Shared stratagem, judgement and sequence resolvers still need extraction. |
| 3. Complete the verified Standard card set | 23 / 28 verified card identities playable; quantity audit pending | Five verified identities remain, and the 108-card manifest still needs authoritative quantities/suits/ranks reconciled with the runtime deck. |
| 4. Equipment and distance modifiers | In progress — current feature focus | Weapon, Armor and Mount slots are playable. One armor and four verified weapons/interactions remain. |
| 5. Complete match rules | Partly implemented | Death cleanup, role reveal, Rebel rewards, Lord/Loyalist penalty and main victory paths work; remaining edge cases need expansion. |
| 6. Hero-specific abilities | Deferred | Begin after shared cards and rules are stable. |
| 7. Product polish | Ongoing alongside rules work | Continue mobile/UI work; sound, invitations and saved history remain planned. |

## Immediate rules correction

### Quick Test perspective privacy — complete

Quick Test follows the current actor using the normal bottom seat, hand and hero/role/HP. Opponent hand previews and full-hand payloads are removed. Switching `meId` establishes a new hand baseline and cancels prior private presentations; only new same-player draw events can show PRIVATE DRAW. Negation order and normal multiplayer session ownership are unchanged. Next card milestone remains Eight Trigrams Formation.

### Ordered Negation windows — complete

Initial windows start at the affected target and include the user; counter windows start after the latest Negation player and can reach that player last. Pass consumes one opportunity, while a newly played Negation resets eligibility. Raining Arrows and Barbarian Invasion finish each target before advancing; Duel (including bot-played Duel) uses the same Negation gate. Normal responses have fresh deadlines after the chain closes, and Attack/Serpent Spear remain alternatives when Attack is required. Next: Eight Trigrams as an additional normal Dodge response, never during Negation.

### Equipment animation follow-up — complete

Removed optimistic equipment entries from retained sequence cards. While a public equipment reveal is queued or active, its rack slot remains reserved but the card is hidden. The reveal travels to that slot's measured position and size, then the rack card becomes visible. Equipment summaries remain in Event History without an additional timed message. Next card: Eight Trigrams Formation.

### Current rules-engine maintenance — complete

Attack and Steal targeting now share effective distance (including horses), so out-of-range targets are rejected before a card is consumed. A target with no Dodge and no implemented defensive capability is damaged immediately; response windows remain available for Dodge-capable hands and equipment. Quick Test uses three HP per seat, leaves horses in the draw deck, and the equipment rack supports four cards. Regression tests cover these paths.

### Standard 108-card manifest audit — tracked

`docs/STANDARD_108_DECK_MANIFEST.md` is the quantity and identity target. The five implemented gaps are Eight Trigrams Formation, Blue Steel Sword, Yin-Yang Swords, Kirin Bow and Borrowed Sword. Before calling the deck complete, reconcile the manifest's 108 physical cards (including exact suit/rank assignments and six named mounts) with the runtime deck; do not silently substitute generic horse cards or unverified expansion cards.

### Frost Sword correction — complete

Frost Sword now follows the verified Standard wording: its damage-replacement branch can select only cards in the target's **Hand or Equipment Zone**, never their **Judgement Zone**. The attacker still chooses one or two eligible cards, and the branch is unavailable when the target has no eligible cards. A regression test covers a target whose only card is in their Judgement Zone.

## Remaining verified WTK Standard cards

Implementation order is dependency-driven rather than catalogue order.

### Nio Shield — complete

**2 ♣ — Armor**

Passive immunity to black `[Attack]` cards is implemented. Nio Shield occupies the authoritative Armor slot, replaces only an existing Armor, is visible beside its owner, and cancels a black Attack before any Dodge or damage response for both human and bot players. Red Attacks still follow the ordinary response flow.

Regression coverage verifies human and bot targets. Blue Steel Sword must later suppress this effect for its own Attack without removing the Armor.

### 1. Eight Trigrams Formation

**2 ♠ — Armor**

When a Dodge is needed, its owner may perform Judgement; a red result counts as `[Dodge]`.

Work:
- reuse the authoritative Armor slot;
- add an optional armour response before/alongside normal Dodge handling;
- reuse the Judgement engine without corrupting the active Attack/global-card response sequence;
- support Attack and Raining Arrows response contexts;
- add red-success, black-failure, Skip and bot tests.

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
