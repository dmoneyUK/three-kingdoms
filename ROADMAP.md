# Three Kingdoms Roadmap

This roadmap is aligned to the verified WTK Standard card reference in `docs/OFFICIAL_CARD_REFERENCE.md`.

## Progress summary

| Stage | Status | Position |
| --- | --- | --- |
| 1. Stabilise the turn loop | Mostly complete; regression-driven maintenance | Core ownership, phase order, repeated rounds, Dying interruption/resumption and response chains are playable and tested. |
| 2. Strengthen the general rules engine | In progress alongside card work | Ordered pending actions and ownership checks are stable. Shared stratagem, judgement and sequence resolvers still need extraction. |
| 3. Complete the verified Standard card set | 22 / 28 verified cards playable | Six verified Standard cards remain: Nio Shield, Eight Trigrams Formation, Blue Steel Sword, Yin-Yang Swords, Kirin Bow and Borrowed Sword. |
| 4. Equipment and distance modifiers | In progress — current feature focus | Weapon slot, six weapons and both mounts are playable. Armour and four verified remaining weapons/interactions remain. |
| 5. Complete match rules | Partly implemented | Death cleanup, role reveal, Rebel rewards, Lord/Loyalist penalty and main victory paths work; remaining edge cases need expansion. |
| 6. Hero-specific abilities | Deferred | Begin after shared cards and rules are stable. |
| 7. Product polish | Ongoing alongside rules work | Continue mobile/UI work; sound, invitations and saved history remain planned. |

## Immediate rules correction

### Frost Sword correction — complete

Frost Sword now follows the verified Standard wording: its damage-replacement branch can select only cards in the target's **Hand or Equipment Zone**, never their **Judgement Zone**. The attacker still chooses one or two eligible cards, and the branch is unavailable when the target has no eligible cards. A regression test covers a target whose only card is in their Judgement Zone.

## Remaining verified WTK Standard cards

Implementation order is dependency-driven rather than catalogue order.

### 1. Nio Shield

**2 ♣ — Armor**

Passive immunity to black `[Attack]` cards.

Work:
- add an authoritative Armor equipment slot and replacement/cleanup behaviour;
- identify black Attack from suit before Dodge/damage resolution;
- prevent the black Attack's effect when Nio Shield applies;
- cover interaction with Blue Steel Sword once that weapon is added;
- add human/bot and defeat-cleanup tests.

### 2. Eight Trigrams Formation

**2 ♠ — Armor**

When a Dodge is needed, its owner may perform Judgement; a red result counts as `[Dodge]`.

Work:
- reuse the authoritative Armor slot;
- add an optional armour response before/alongside normal Dodge handling;
- reuse the Judgement engine without corrupting the active Attack/global-card response sequence;
- support Attack and Raining Arrows response contexts;
- add red-success, black-failure, Skip and bot tests.

### 3. Blue Steel Sword

**6 ♠ — Weapon — Attack Range 2**

Passive: the owner's `[Attack]` ignores the target's Armor.

Work:
- add the weapon and range;
- bypass Nio Shield and Eight Trigrams Formation for that Attack;
- keep armour equipped and visible; only suppress its effect for the relevant Attack;
- add regression tests against both armour cards.

### 4. Yin-Yang Swords

**2 ♠ — Weapon — Attack Range 2**

When `[Attack]` targets a character of the opposite gender, that target chooses to discard one hand card or let the attacker draw one card.

Work:
- ensure hero gender is authoritative in game state;
- insert a target-owned decision into Attack resolution;
- support discard-one-hand-card vs attacker-draw choice;
- define behaviour when the target has no hand card (only the draw branch remains);
- add human/bot, same-gender and opposite-gender tests.

### 5. Kirin Bow

**5 ♦ — Weapon — Attack Range 5**

When `[Attack]` inflicts damage, the attacker may discard one Mount from the damaged character's Equipment zone.

Work:
- add the weapon and range;
- trigger only after Attack actually inflicts damage;
- allow selection between eligible equipped Mounts when both are present;
- do nothing when no Mount is equipped;
- test interaction with Frost Sword's damage replacement (no damage means no Kirin Bow trigger).

### 6. Borrowed Sword

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

The following 22 cards are currently treated as implemented:

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
