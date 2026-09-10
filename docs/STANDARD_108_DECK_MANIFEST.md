# WTK Standard — 108-card deck manifest

This document defines the project's target deck composition: **Standard 104-card deck + 4 EX cards = 108 cards**.

The official English WTK catalogue remains the primary source for player-facing English names and rule text:

- https://wtkgames.com/gameCard/
- `docs/OFFICIAL_CARD_REFERENCE.md`

For quantities and the complete classic Standard+EX physical deck composition, this manifest also cross-checks published Standard 108-card deck tables. Catalogue index numbers are ignored.

> **Important:** where a secondary classic-deck table disagrees with the supplied official English WTK catalogue on a suit/rank, the discrepancy is recorded rather than silently overwriting the official-English reference. Resolve such conflicts against the physical/current WTK English Standard product before changing game logic.

## Deck totals

| Category | Quantity |
| --- | ---: |
| Basic | 53 |
| Stratagem | 36 |
| Equipment | 19 |
| **Total** | **108** |

The 108 cards are evenly distributed across suits: **27 ♠, 27 ♥, 27 ♣, 27 ♦**. The four EX cards add one card in each suit to the 104-card base deck.

## Quantity by card

### Basic — 53

| Official English name | Qty |
| --- | ---: |
| Attack | 30 |
| Dodge | 15 |
| Peach | 8 |

### Stratagem — 36

| Official English name | Qty | Notes |
| --- | ---: | --- |
| Burning Bridges | 6 | — |
| Steal | 5 | — |
| Something Out of Nothing | 4 | — |
| Negation | 4 | includes 1 EX copy |
| Barbarian Invasion | 3 | — |
| Duel | 3 | — |
| Overindulgence | 3 | — |
| Borrowed Sword | 2 | — |
| Bumper Harvest | 2 | — |
| Lightning | 2 | includes 1 EX copy |
| Raining Arrows | 1 | — |
| Oath of the Peach Garden | 1 | — |

### Equipment — 19

#### Weapons — 10

| Official English name | Qty | Attack range | EX? |
| --- | ---: | ---: | --- |
| Zhuge Crossbow | 2 | 1 | No |
| Blue Steel Sword | 1 | 2 | No |
| Yin-Yang Swords | 1 | 2 | No |
| Frost Sword | 1 | 2 | **Yes** |
| Green Dragon Blade | 1 | 3 | No |
| Serpent Spear | 1 | 3 | No |
| Rock Cleaving Axe | 1 | 3 | No |
| Sky Piercing Halberd | 1 | 4 | No |
| Kirin Bow | 1 | 5 | No |

#### Armor — 3

| Official English name | Qty | EX? |
| --- | ---: | --- |
| Eight Trigrams Formation | 2 | No |
| Nio Shield | 1 | **Yes** |

#### Mounts — 6

The project target is **all six Standard mounts**: three `+1` distance mounts and three `-1` distance mounts.

| Classic card identity | English name / working mapping | Suit & rank in classic 108 table | Distance modifier | Status |
| --- | --- | --- | ---: | --- |
| 绝影 (Jueying) | **Shadowrunner / Shadow Runner** | 5 ♠ | +1 | supplied official-English reference already records Shadowrunner |
| 的卢 (Dilu) | **Hex Mark / Dilu Horse** | 5 ♣ | +1 | add to target deck; official WTK English label still to verify |
| 爪黄飞电 (Zhuahuang Feidian) | **Yellow-Hoofed Flying-Lightning** | K ♥ | +1 | add to target deck; official WTK English label still to verify |
| 赤兔 (Chitu) | **Red Hare** | 5 ♥ | -1 | add to target deck; official WTK English label still to verify |
| 紫骍 (Zixing) | **Purple Bay / Zixing** | K ♦ | -1 | add to target deck; official WTK English label still to verify |
| 大宛 (Dayuan) | **Fergana Steed / Dayuan (Blood-Sweating Horse)** | K ♠ | -1 | likely identity of supplied Fergana Steed; see discrepancy below |

### Mount source notes

Secondary Three Kingdoms references identify:

- **Dilu / 的卢** as **Hex Mark**;
- **Zixing / 紫骍** as **Purple Bay**;
- **Chitu / 赤兔** as **Red Hare**;
- **Dayuan / 大宛** as a Fergana/"blood-sweating" horse;
- **Zhuahuang Feidian / 爪黄飞电** as **Yellow-Hoofed Flying-Lightning**; and
- **Jueying / 绝影** as **Shadow Runner**.

These names are useful for identity matching, but until each is visible in the official WTK English catalogue, only **Fergana Steed** and **Shadowrunner** should be treated as verified WTK player-facing English labels.

## Four EX cards

| Card | Suit & rank in classic 108 table | Category |
| --- | --- | --- |
| Frost Sword | 2 ♠ | Weapon |
| Nio Shield | 2 ♣ | Armor |
| Lightning | Q ♥ | Conditional Stratagem |
| Negation | Q ♦ | Regular Stratagem |

The EX cards are part of this project's selected **108-card Standard ruleset**.

## Physical-card suit/rank distribution

### Attack — 30

- ♠: 7, 8×2, 9×2, 10×2
- ♥: 10×2, J
- ♣: 2, 3, 4, 5, 6, 7, 8×2, 9×2, 10×2, J×2
- ♦: 6, 7, 8, 9, 10, K

### Dodge — 15

- ♥: 2×2, K
- ♦: 2×2, 3, 4, 5, 6, 7, 8, 9, 10, J×2

### Peach — 8

- ♥: 3, 4, 6, 7, 8, 9, Q
- ♦: Q

### Stratagem copies

- **Duel ×3:** A ♠, A ♣, A ♦
- **Burning Bridges ×6:** 3 ♠, 4 ♠, Q ♠, Q ♥, 3 ♣, 4 ♣
- **Steal ×5:** 3 ♠, 4 ♠, J ♠, 3 ♦, 4 ♦
- **Something Out of Nothing ×4:** 7 ♥, 8 ♥, 9 ♥, J ♥
- **Barbarian Invasion ×3:** 7 ♠, K ♠, 7 ♣
- **Raining Arrows ×1:** A ♥
- **Oath of the Peach Garden ×1:** A ♥
- **Bumper Harvest ×2:** 3 ♥, 4 ♥
- **Borrowed Sword ×2:** Q ♣, K ♣
- **Negation ×4:** J ♠, Q ♣, K ♣, **Q ♦ EX**
- **Overindulgence ×3:** 6 ♠, 6 ♥, 6 ♣
- **Lightning ×2:** A ♠, **Q ♥ EX**

### Equipment copies in the classic 108 table

- **Zhuge Crossbow ×2:** A ♣, A ♦
- **Blue Steel Sword ×1:** 6 ♠
- **Yin-Yang Swords ×1:** 2 ♠
- **Frost Sword ×1:** **2 ♠ EX**
- **Green Dragon Blade ×1:** 5 ♠
- **Serpent Spear ×1:** Q ♠
- **Rock Cleaving Axe ×1:** 5 ♦
- **Sky Piercing Halberd ×1:** Q ♦
- **Kirin Bow ×1:** 5 ♥
- **Eight Trigrams Formation ×2:** 2 ♠, 2 ♣
- **Nio Shield ×1:** **2 ♣ EX**
- **Shadow Runner / Jueying ×1:** 5 ♠, +1
- **Hex Mark / Dilu ×1:** 5 ♣, +1
- **Yellow-Hoofed Flying-Lightning ×1:** K ♥, +1
- **Red Hare ×1:** 5 ♥, -1
- **Purple Bay / Zixing ×1:** K ♦, -1
- **Dayuan / Fergana identity ×1:** K ♠, -1

## Known source discrepancies to resolve

The supplied official-English WTK catalogue reference currently records **Fergana Steed as K ♣ / -1** and **Kirin Bow as 5 ♦**. The classic 108-card composition sources instead place the Dayuan/Fergana-identity mount at **K ♠ / -1** and Kirin Bow at **5 ♥**. Do **not** silently change the supplied official-English reference on the basis of the secondary table. These are explicit audit items for the current English WTK Standard product.

Likewise, the supplied 28-entry reference contains one visible representative copy for several multi-copy cards; it is not itself a complete physical-card manifest. This file is the project's 108-card quantity/manfiest reference, while `OFFICIAL_CARD_REFERENCE.md` remains the terminology/effect reference.

## Implementation rule

When the game deck is brought into exact Standard-108 compliance, add a deterministic automated test that asserts:

1. exactly **108 cards** are generated;
2. category totals are **53 Basic / 36 Stratagem / 19 Equipment**;
3. quantities by official card identity match this manifest;
4. there are exactly **27 cards of each suit**; and
5. every physical card's suit/rank matches the resolved WTK English Standard manifest.
