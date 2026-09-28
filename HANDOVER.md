# Three Kingdoms project handover

## Current state — Step 1 UI handover closed — 2026-09-28

This round is complete as a presentation-only change on current `main`.

Implemented:

- Local hand packing uses the current physical card IDs/order, caps natural
  step at 68px, and applies controlled overlap/compression when the rail is
  tight. Physical card width and panel dimensions are unchanged.
- Opponent Equipment is outside and below the hero portrait with four visible
  logical slots: Weapon, Armour, +1 Horse, and -1 Horse.
- Opponent Judgement is a separate side zone with controlled multi-card
  overlap. Existing equipment/judgement data anchors, info controls,
  inspection behavior, and flight/settlement lookup anchors remain intact.
- Current-player hero information is ordered Hero Name, Role, HP current/max,
  Hearts. The hero portrait remains 2:3 and the heart row is not clipped, so
  Lord 5/5 displays five hearts.
- The established Hero Skills contract remains unchanged: representative
  response, trigger, Play Phase, and passive states use projected capability
  availability; contextual responses use generic Confirm / Skip; no duplicate
  skill controls were added to the bottom action row.

Regression coverage now protects hand packing, middle-card removal/repacking,
actual hand ID/order dependencies, opponent zone structure and anchors, hero
overlay order, 5/5, 4/5, 1/5, 4/4, and 3-HP heart rendering, plus the existing
Hero Skills response/trigger/Play Phase/passive coverage.

Responsive geometry was checked in the local browser at 320px, 390px, 393px,
402px, and 430px. The document width matched the viewport at each size. The
rendered suite provides the deterministic Judgement multi-card/anchor proof.

No gameplay rules, target legality, distance, hero legality, response or
Judgement semantics, hidden-information behavior, or semantic action API was
changed. Gongsun Zan was not started.

## Validation

- `npm run build` passed.
- `npm test` passed: 40 fast tests and 106 API tests.
- `npm run lint` passed with one pre-existing warning for the unused
  `jsx-a11y/label-has-associated-control` disable directive at `app/page.tsx:1`.
- `git diff --check` passed.

## Known boundaries and recommended next work

The remaining Stage 7 work is the final graphic/theme polish and separately
approved artwork intake for remaining fallback heroes. Any new hero or card
capability must remain a separate, server-owned semantic round and must not be
combined with another presentation closure.
