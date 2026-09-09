# WTK Standard — Official Card Reference

> **Primary source of truth:** https://wtkgames.com/gameCard/
>
> This document records the WTK **Standard** card information supplied from the official English catalogue on 9 September 2026. Catalogue index numbers are intentionally omitted. Preserve the official English card names when implementing or auditing the game.

## Quick index

| Category | Cards |
| --- | --- |
| Basic | Attack, Dodge, Peach |
| Regular Stratagem | Barbarian Invasion, Borrowed Sword, Bumper Harvest, Burning Bridges, Duel, Negation, Oath of the Peach Garden, Raining Arrows, Something Out of Nothing, Steal |
| Conditional Stratagem | Lightning, Overindulgence |
| Weapon | Blue Steel Sword, Frost Sword, Green Dragon Blade, Kirin Bow, Rock Cleaving Axe, Serpent Spear, Sky Piercing Halberd, Yin-Yang Swords, Zhuge Crossbow |
| Armor | Eight Trigrams Formation, Nio Shield |
| Mount | Fergana Steed, Shadowrunner |

**Total distinct Standard card entries recorded here: 28.**

---

## Basic cards

| Card | Suit & rank |
| --- | --- |
| **Attack** | 10 ♥ |
| **Dodge** | 2 ♥ |
| **Peach** | 3 ♥ |

## Regular Stratagem cards

### Barbarian Invasion — 7 ♣

**Type:** Regular (Stratagem)

**Effect:** Play Phase, target all other characters. Each one of them must play an [Attack], otherwise take 1 damage from you.

### Borrowed Sword — Q ♣

**Type:** Regular (Stratagem)

**Effect:** Play Phase, target another character with a Weapon in their Equipment zone. The target character must play an [Attack] against someone of your choice within their attack range, otherwise you take target's Weapon card.

### Bumper Harvest — 3 ♥

**Type:** Regular (Stratagem)

**Effect:** Play Phase, you may use this card on all characters including yourself. Reveal cards from the top of the deck matching the number of players, and each player takes turns selecting 1 card.

### Burning Bridges — Q ♠

**Type:** Regular (Stratagem)

**Effect:** Play Phase, target another character. You may discard 1 card from target's Equipment zone, Judgement zone or their hand.

### Duel — A ♠

**Type:** Regular (Stratagem)

**Effect:** Play Phase, target another character to start a Duel. Starting with the target character, target and you will take turns to play an [Attack]. The first character that fails to play [Attack] will take 1 damage from the Duel object.

### Negation — Q ♣

**Type:** Regular (Stratagem)

**Effect:** Use this card to cancel the effect of any Stratagem card on a character or cancel the effect of another [Negation].

### Oath of the Peach Garden — A ♥

**Type:** Regular (Stratagem)

**Effect:** Play Phase, you may use this card on all characters including yourself. Each character recovers 1 HP.

### Raining Arrows — A ♥

**Type:** Regular (Stratagem)

**Effect:** Play Phase, target all other characters. Each one of them must play a [Dodge], otherwise take 1 damage from you.

### Something Out of Nothing — 7 ♥

**Type:** Regular (Stratagem)

**Effect:** Play Phase, play this card to draw 2 cards.

### Steal — 3 ♠

**Type:** Regular (Stratagem)

**Effect:** Play Phase, target another character within 1 distance from you. You may obtain 1 card from target's Equipment zone, Judgement zone or their hand.

## Conditional Stratagem cards

### Lightning — Q ♠

**Type:** Conditional (Stratagem)

**Effect:** Play Phase, you may put this card into your Judgement zone. During your next Judgement Phase, if the Judgement card is between 2-9 and belongs to ♠, you will take 3 points thunder damage. Otherwise, the [Lightning] card will be passed into the next character's Judgement Zone.

### Overindulgence — 6 ♣

**Type:** Conditional (Stratagem)

**Effect:** Play Phase, you may put this card into another character's Judgement zone. During Judgement Phase of their turn, if the Judgement card does not belong to ♥, the character's Play Phase will be skipped.

---

## Equipment

### Weapons

| Weapon | Suit & rank | Attack range |
| --- | --- | ---: |
| **Zhuge Crossbow** | A ♦ | 1 |
| **Frost Sword** | 2 ♠ | 2 |
| **Yin-Yang Swords** | 2 ♠ | 2 |
| **Blue Steel Sword** | 6 ♠ | 2 |
| **Green Dragon Blade** | 5 ♠ | 3 |
| **Serpent Spear** | Q ♠ | 3 |
| **Rock Cleaving Axe** | 5 ♦ | 3 |
| **Sky Piercing Halberd** | Q ♦ | 4 |
| **Kirin Bow** | 5 ♦ | 5 |

#### Zhuge Crossbow

◆Passive: You may use an unlimited number of [Attack] cards each turn.

#### Frost Sword

◆When your [Attack] inflicts damage, you may choose to negate the damage and instead you discard 2 cards from target's hand or Equipment zone.

#### Yin-Yang Swords

◆When your [Attack] targets a character of the opposite gender, the target character must choose between: ① he/she discard 1 hand card; ② you draw 1 card from the deck.

#### Blue Steel Sword

◆Passive: Your [Attack] ignore the effect of target's Armor.

#### Green Dragon Blade

◆When your [Attack] is offset, you may continue to play [Attack] against the same target.

#### Serpent Spear

◆You may discard 2 cards from your hand to form an [Attack].

#### Rock Cleaving Axe

◆When your [Attack] is about to be offset, you may discard 2 cards to force the target to take damage from your [Attack].

#### Sky Piercing Halberd

◆When you use an [Attack] as your last card in hand, you may target 2 additional characters.

#### Kirin Bow

◆When your [Attack] inflicts damage on a character, you may discard 1 Mount card from that character's Equipment zone.

### Armor

#### Eight Trigrams Formation — 2 ♠

◆You may enter Judgement phase when you need to use or play a [Dodge], if the Judgement card belongs to Red suited, you are deemed to used or played a [Dodge].

#### Nio Shield — 2 ♣

◆Passive: Grants immunity to the effects of black [Attack] cards.

### Mounts

| Mount | Suit & rank | Distance modifier |
| --- | --- | ---: |
| **Fergana Steed** | K ♣ | -1 |
| **Shadowrunner** | 5 ♠ | +1 |

#### Fergana Steed

> “The Fergana steeds are renowned for their sweet resembling blood and their elegant, dragon-like physique. Previously witnessed only in ancient artwork, encountering them in reality is a delightful surprise.” — *Ode to the Heavenly Stallion*

#### Shadowrunner

> “His renowned steed bears the name Shadowrunner.” — *Records of the Three Kingdoms: Book of Wei*

---

## Implementation mapping

Internal names may differ from official English names. Keep internal kinds stable where necessary for saved-game compatibility.

| Internal kind | Official English name | Official card ID | Product |
| --- | --- | ---: | --- |
| `Attack` / legacy `Strike` | Attack | 173 | Standard |
| `Dodge` | Dodge | 56 | Standard |
| `Peach` | Peach | 171 | Standard |
| `DrawTwo` | Something Out of Nothing | 184 | Standard |
| `Dismantle` | Burning Bridges | 174 | Standard |
| `Steal` | Steal | 189 | Standard |
| `Duel` | Duel | 185 | Standard |
| `Oath` | Oath of the Peach Garden | 81 | Standard |
| `BarbarianInvasion` | Barbarian Invasion | 178 | Standard |
| `RainingArrows` | Raining Arrows | 183 | Standard |
| `BumperHarvest` | Bumper Harvest | 57 | Standard |
| `Negation` | Negation | 108 | Standard |
| `Overindulgence` | Overindulgence | 177 | Standard |
| `Lightning` | Lightning | 107 | Standard |
| `ZhugeCrossbow` | Zhuge Crossbow | 175 | Standard |
| `GreenDragonBlade` | Green Dragon Blade | 180 | Standard |
| `SerpentSpear` | Serpent Spear | 181 | Standard |
| `RockCleavingAxe` | Rock Cleaving Axe | 186 | Standard |
| `SkyPiercingHalberd` | Sky Piercing Halberd | 188 | Standard |
| `FrostSword` | Frost Sword | 40 | Standard |
| `OffensiveHorse` | Fergana Steed | 182 | Standard |
| `DefensiveHorse` | Shadowrunner | 190 | Standard |
| `RationsDepleted` | Rations Depleted | 199 | Endless Legends — compatibility only; excluded from new games |

## Development policy

- The official WTK catalogue at https://wtkgames.com/gameCard/ is the primary source of knowledge for cards.
- Filter the catalogue by **Standard** before adding a playable card.
- Use the official English names recorded here in player-facing UI and documentation.
- Do not add Endless Legends or Kingdom Wars cards until expansion development is explicitly enabled.
- Keep internal card kinds stable when required for saved-game compatibility.
- Do not copy or ship official card artwork, scans, logos, frames, or other YOKA visual assets without appropriate permission.
- Do not expose this development-reference document inside the player interface.
