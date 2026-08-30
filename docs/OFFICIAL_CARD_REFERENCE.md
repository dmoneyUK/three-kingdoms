# Official English card reference

Use YOKA Games' official English *War of the Three Kingdoms* catalogue as the
source of truth for card names, categories, and rule meaning:

- Catalogue: https://wtkgames.com/gameCard/
- Official catalogue API: https://api.wtkgames.com/api/card
- YOKA delayed-stratagem rules reference: https://kf1.yokagames.com/front/index/content-detail?id=230

Current mappings:

| Internal kind | Official English name | Official card ID |
| --- | --- | ---: |
| `Attack` / legacy `Strike` | Attack | 173 |
| `Dodge` | Dodge | 56 |
| `Peach` | Peach | 171 |
| `DrawTwo` | Something Out of Nothing | 184 |
| `Dismantle` | Burning Bridges | 174 |
| `Steal` | Steal | 189 |
| `Duel` | Duel | 185 |
| `Oath` | Oath of the Peach Garden | 81 |
| `BarbarianInvasion` | Barbarian Invasion | 178 |
| `RainingArrows` | Raining Arrows | 183 |
| `BumperHarvest` | Bumper Harvest | 57 |
| `Negation` | Negation | 108 |
| `Overindulgence` | Overindulgence | 177 |
| `Lightning` | Lightning | 107 |
| `RationsDepleted` | Rations Depleted | 199 |

Development policy:

- Use the catalogue to verify terminology and paraphrase rule effects.
- Keep internal card kinds stable for saved-game compatibility.
- Do not copy or ship official card artwork, card scans, logos, frames, or other
  YOKA visual assets without a licence or written permission from the rights
  holder. Create original visual assets for the playable site.
- Do not expose this development reference inside the player interface.
