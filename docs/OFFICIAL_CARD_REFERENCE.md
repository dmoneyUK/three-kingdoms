# Official English card reference

Use YOKA Games' official English *War of the Three Kingdoms* catalogue as the
source of truth for card names, categories, and rule meaning:

- Catalogue: https://wtkgames.com/gameCard/
- Official catalogue API: https://api.wtkgames.com/api/card

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

Development policy:

- Use the catalogue to verify terminology and paraphrase rule effects.
- Keep internal card kinds stable for saved-game compatibility.
- Do not copy or ship official card artwork, card scans, logos, frames, or other
  YOKA visual assets without a licence or written permission from the rights
  holder. Create original visual assets for the playable site.
- Do not expose this development reference inside the player interface.
