# Three Kingdoms project handover

## Current state — Stage 6 Gongsun Zan / Militia complete — 2026-09-28

This round is complete on current `main`. The Step 1 UI handover is also closed
and remains separate from this gameplay change.

Latest asset addition: the supplied Gongsun Zan portrait is now connected to
the shared hero-art renderer at `public/hero-gongsun-zan.jpg`. This is a
presentation-only update; gameplay, projections, selection, and layout remain
unchanged.

Implemented:

- Added a small generic effective-distance capability with independently tested
  raw circular seat distance, directional outbound/inbound providers, minimum
  distance clamping, and the existing dead-player sentinel.
- Moved offensive and defensive Mount distance behavior into the shared
  provider pipeline so modifiers compose rather than replace one another.
- Registered Gongsun Zan's passive Militia provider. It derives from authoritative
  current HP: outbound -1 above 2 HP, inbound +1 at 2 HP or below; no mode flag
  is persisted.
- Routed projected distance and every distance-sensitive server legality check
  through the same effective calculation, including Attack, Steal, and Rations
  Depleted. No Gongsun-Zan branch exists in raw rules, Attack handling, or routes.
- Added Gongsun Zan to Standard selection only after capability completion. Hero
  Skills shows the normal disabled passive label, with no activation button,
  Confirm/Skip flow, or provider-specific action.

Regression coverage includes 4/3/2/1 HP directionality, exact-boundary and
recovery transitions, clamping, dead-player handling, non-Gongsun behavior,
Mount composition, healthy/low-HP Attack legality, Quick Test selection, and
the existing normal multiplayer ownership/privacy suite.

## Validation

- `npm run build` passed.
- `npm test` passed: 46 fast tests and 109 API tests across four isolated
  Worker/D1 shards.
- `npm run lint` passed with one pre-existing warning for the unused
  `jsx-a11y/label-has-associated-control` disable directive at `app/page.tsx:1`.
- `git diff --check` passed.

## Known boundaries and recommended next work

The next Stage 6 hero is Ma Chao / Horse Riding + Cavalry, which must reuse the
distance primitive and remain a separate round. Stage 7 still has final
graphic/theme polish and separately approved artwork intake for fallback heroes.
Do not begin Ma Chao in this change or combine future gameplay with presentation
work. Preserve server-owned legality, private projections, Quick Test/normal
multiplayer parity, stale safety, and the canonical semantic action contract.
