# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest functional result

Latest implementation/test commit reviewed: `961f818b4044f0775bbc0d36d4d225f657a4d5d7`
(`test: cover Zhou Yu Sowing Distrust skills activation`).

That slice adds focused proof for the existing `zhou_yu_fanjian` CurrentAction
path: Sowing Distrust activates from the Local Hero Skills band, uses the
projected target + generic Confirm continuation, submits the unchanged provider
payload, has no duplicate Action Row activation, and stays disabled without
authority. It is test/fixture-only; no rules or production behavior changed.

Test-suite optimization is complete/out of scope for this handoff. Do not spend
this task re-auditing CI/test optimization.

## Design checkpoint

`docs/UX2-refine.md` remains the UX2 product/UI design authority.

Reviewed against current production code:

- §§2, 3, 4, and 4B are substantially implemented with dedicated functional/
  browser proof for Negation presentation, Raining Arrows response semantics,
  System Menu/timer placement, Zhuge Liang skill presentation, and compact
  opponent Inspect.
- §4C shared Target Card Selection UI is implemented for Retaliation, Frost
  Sword, Kirin Bow, Dismantle, and Steal, including anonymous `hand:n`
  rendering, public Equipment/Judgment cards, multi-select, responsive layout,
  privacy, and revision clearing.
- Important §4C gap: the real Sima Yi Retaliation capability still emits one
  grouped `"hand"` key from `sima-yi-fankui.ts`. Therefore normal gameplay
  still presents `HAND ×N · Random card`; the individually selectable
  face-down Hand cards currently proven in browser fixtures are not yet the
  normal authoritative Retaliation path.
- The server's `gain_target_card` resolver already understands exact
  `hand:<index>` keys and removes the selected index, while preserving the
  older `"hand"` random fallback. Dismantle/Steal already project anonymous
  per-Hand positions.
- §1 Local Hero Skills architecture/roster geometry is broadly in place, and
  many skills now have focused activation proof, but the complete per-capability
  functional audit required by §1.10 is not yet closed.
- §4A is not fully closed: Bumper Harvest active-choice timing has no
  authoritative active-choice deadline in the current projection; do not
  synthesize a client timer.
- Because pre-§5 work is not fully closed, do not start §6 physical-seat
  interaction-graph implementation yet.

## Current task

`UX2.REFINE-RETALIATION-OPAQUE-HAND-POSITIONS-01` — make the real Sima Yi
Retaliation path use the §4C individually selectable concealed-Hand design
without exposing card identity.

Required work:

- Change the authoritative `sima_yi_fankui` target-card option so a source Hand
  of N cards projects opaque keys `hand:0 ... hand:N-1` instead of the single
  grouped `"hand"` key. Keep eligible public Equipment/Judgment IDs unchanged.
- Preserve strict privacy: CurrentAction/public projection may expose only Hand
  count + opaque positions, never hidden card ID, kind, suit, rank, or artwork.
- Reuse the existing Target Card Selection modal. In normal authoritative
  Retaliation, show N separate face-down selectable Hand cards; do not show
  `Random card` when per-position authority is present.
- Selecting `hand:i` must obtain exactly the card occupying that authoritative
  position at resolution time and remove exactly that card. If that position is
  stale/out of range, fail stale/fail closed; do not silently substitute a
  random different Hand card.
- Keep the existing server compatibility handling for the legacy grouped
  `"hand"` key unless removing it is independently proven safe. This task is
  about what current Retaliation projects, not deleting compatibility paths.
- Preserve Retaliation Equipment/Judgment selection, Cancel, authoritative Skip,
  provider ID `sima_yi_fankui`, action-revision clearing, and all other
  gameplay semantics.
- Add authoritative/API proof that a source with multiple hidden Hand cards
  exposes only `hand:n` keys and no hidden identity, and that selecting one
  position gains the exact corresponding card.
- Add/update focused browser proof at 390×844, 480×900, and wide that normal
  Retaliation shows separate concealed Hand positions, submits the selected
  opaque key, has no duplicate Dock Confirm, preserves Cancel/Skip behavior,
  clears stale selection on revision change, and introduces no horizontal
  overflow.
- Do not change Dismantle, Steal, Frost Sword, Kirin Bow, unrelated Hero skills,
  Interaction Stage Hero/player geometry, or §6 graph work.

Stop after this bounded slice is committed and pushed to `ux-v2`, then refresh
this HANDOVER with truthful implementation/validation evidence and exactly one
next functional task. Reviewer acceptance must not be claimed automatically.
