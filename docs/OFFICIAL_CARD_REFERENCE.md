# Official English card reference

Use YOKA Games' official English *War of the Three Kingdoms* catalogue as the source of truth for card names, categories, and rule meaning:

- Catalogue: https://wtkgames.com/gameCard/
- Official catalogue API: https://api.wtkgames.com/api/card
- WTK Standard product and rulebook: https://www.wtkgames.com/product/Standard/
- YOKA delayed-stratagem rules reference: https://kf1.yokagames.com/front/index/content-detail?id=230

The current playable ruleset is **WTK Standard only**. The product column is required because the combined catalogue also contains Endless Legends and Kingdom Wars cards.

## Verified Standard cards

The following card details were supplied from the official WTK Standard catalogue on 9 September 2026. Preserve the official English names and wording when checking implementation behaviour. Index/order numbers from the catalogue are intentionally omitted.

| Official English name | Suit & rank | Type | Range / modifier | Official effect text |
| --- | --- | --- | --- | --- |
| Frost Sword | 2 ♠ | Weapon | Attack Range 2 | ◆When your [Attack] inflicts damage, you may choose to negate the damage and instead you discard 2 cards from target's hand or Equipment zone. |
| Nio Shield | 2 ♣ | Armor | — | ◆Passive: Grants immunity to the effects of black [Attack] cards. |
| Dodge | 2 ♥ | Basic | — | — |
| Bumper Harvest | 3 ♥ | Regular (Stratagem) | — | Play Phase, you may use this card on all characters including yourself. Reveal cards from the top of the deck matching the number of players, and each player takes turns selecting 1 card. |
| Oath of the Peach Garden | A ♥ | Regular (Stratagem) | — | Play Phase, you may use this card on all characters including yourself. Each character recovers 1 HP. |
| Lightning | Q ♠ | Conditional (Stratagem) | — | Play Phase, you may put this card into your Judgement zone. During your next Judgement Phase, if the Judgement card is between 2-9 and belongs to ♠, you will take 3 points thunder damage. Otherwise, the [Lightning] card will be passed into the next character's Judgement Zone. |
| Negation | Q ♣ | Regular (Stratagem) | — | Use this card to cancel the effect of any Stratagem card on a character or cancel the effect of another [Negation]. |
| Peach | 3 ♥ | Basic | — | — |
| Kirin Bow | 5 ♦ | Weapon | Attack Range 5 | ◆When your [Attack] inflicts damage on a character, you may discard 1 Mount card from that character's Equipment zone. |
| Attack | 10 ♥ | Basic | — | — |
| Burning Bridges | Q ♠ | Regular (Stratagem) | — | Play Phase, target another character. You may discard 1 card from target's Equipment zone, Judgement zone or their hand. |
| Zhuge Crossbow | A ♦ | Weapon | Attack Range 1 | ◆Passive: You may use an unlimited number of [Attack] cards each turn. |
| Eight Trigrams Formation | 2 ♠ | Armor | — | ◆You may enter Judgement phase when you need to use or play a [Dodge], if the Judgement card belongs to Red suited, you are deemed to used or played a [Dodge]. |
| Overindulgence | 6 ♣ | Conditional (Stratagem) | — | Play Phase, you may put this card into another character's Judgement zone. During Judgement Phase of their turn, if the Judgement card does not belong to ♥, the character's Play Phase will be skipped. |
| Barbarian Invasion | 7 ♣ | Regular (Stratagem) | — | Play Phase, target all other characters. Each one of them must play an [Attack], otherwise take 1 damage from you. |
| Borrowed Sword | Q ♣ | Regular (Stratagem) | — | Play Phase, target another character with a Weapon in their Equipment zone. The target character must play an [Attack] against someone of your choice within their attack range, otherwise you take target's Weapon card. |
| Green Dragon Blade | 5 ♠ | Weapon | Attack Range 3 | ◆When your [Attack] is offset, you may continue to play [Attack] against the same target. |
| Serpent Spear | Q ♠ | Weapon | Attack Range 3 | ◆You may discard 2 cards from your hand to form an [Attack]. |
| Fergana Steed | K ♣ | Mount | Distance Modifier -1 | The Fergana steeds are renowned for their sweet resembling blood and their elegant, dragon-like physique. Previously witnessed only in ancient artwork, encountering them in reality is a delightful surprise. — Ode to the Heavenly Stallion |
| Raining Arrows | A ♥ | Regular (Stratagem) | — | Play Phase, target all other characters. Each one of them must play a [Dodge], otherwise take 1 damage from you. |
| Something Out of Nothing | 7 ♥ | Regular (Stratagem) | — | Play Phase, play this card to draw 2 cards. |
| Duel | A ♠ | Regular (Stratagem) | — | Play Phase, target another character to start a Duel. Starting with the target character, target and you will take turns to play an [Attack]. The first character that fails to play [Attack] will take 1 damage from the Duel object. |
| Rock Cleaving Axe | 5 ♦ | Weapon | Attack Range 3 | ◆When your [Attack] is about to be offset, you may discard 2 cards to force the target to take damage from your [Attack]. |
| Sky Piercing Halberd | Q ♦ | Weapon | Attack Range 4 | ◆When you use an [Attack] as your last card in hand, you may target 2 additional characters. |
| Yin-Yang Swords | 2 ♠ | Weapon | Attack Range 2 | ◆When your [Attack] targets a character of the opposite gender, the target character must choose between: ① he/she discard 1 hand card; ② you draw 1 card from the deck. |
| Steal | 3 ♠ | Regular (Stratagem) | — | Play Phase, target another character within 1 distance from you. You may obtain 1 card from target's Equipment zone, Judgement zone or their hand. |
| Shadowrunner | 5 ♠ | Mount | Distance Modifier +1 | “His renowned steed bears the name Shadowrunner.” — Records of the Three Kingdoms: Book of Wei |
| Blue Steel Sword | 6 ♠ | Weapon | Attack Range 2 | ◆Passive: Your [Attack] ignore the effect of target's Armor. |

## Internal mappings

Keep internal card kinds stable for saved-game compatibility.

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
| `RationsDepleted` | Rations Depleted | 199 | Endless Legends - preserved for compatibility, excluded from new games |

## Development policy

- Use the catalogue to verify terminology and paraphrase rule effects.
- Filter the official catalogue by **Standard** before adding a playable card.
- Do not add Endless Legends or Kingdom Wars cards to the deck until the owner explicitly enables expansion development.
- Keep internal card kinds stable for saved-game compatibility.
- Do not copy or ship official card artwork, card scans, logos, frames, or other YOKA visual assets without a licence or written permission from the rights holder. Create original visual assets for the playable site.
- Do not expose this development reference inside the player interface.
