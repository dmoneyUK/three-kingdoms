# Official English card reference

Use YOKA Games' official English *War of the Three Kingdoms* catalogue as the
source of truth for card names, categories, and rule meaning:

- Catalogue: https://wtkgames.com/gameCard/
- Official catalogue API: https://api.wtkgames.com/api/card
- WTK Standard product and rulebook: https://www.wtkgames.com/product/Standard/
- YOKA delayed-stratagem rules reference: https://kf1.yokagames.com/front/index/content-detail?id=230

The current playable ruleset is **WTK Standard only**. The product column is
required because the combined catalogue also contains Endless Legends and
Kingdom Wars cards.

Current mappings:

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
| `RationsDepleted` | Rations Depleted | 199 | Endless Legends - preserved for compatibility, excluded from new games |

Development policy:

- Use the catalogue to verify terminology and paraphrase rule effects.
- Filter the official catalogue by **Standard** before adding a playable card.
- Do not add Endless Legends or Kingdom Wars cards to the deck until the owner
  explicitly enables expansion development.
- Keep internal card kinds stable for saved-game compatibility.
- Do not copy or ship official card artwork, card scans, logos, frames, or other
  YOKA visual assets without a licence or written permission from the rights
  holder. Create original visual assets for the playable site.
- Do not expose this development reference inside the player interface.
