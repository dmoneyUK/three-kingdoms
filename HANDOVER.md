# Three Kingdoms project handover

## Current state — Stage 6 Da Qiao / Deflection Step 1 — 2026-09-29

Step 1 is implemented internally on current `main`; Captivating has not been
started and Da Qiao remains unavailable in Standard hero selection.

Implemented:

- Added the small generic `redirect_attack` semantic outcome to the existing
  `attack_targeted` capability protocol; no Da Qiao-specific route action,
  `play_card` branch, or central Attack-resolution branch was added.
- Added target-owned `daqiao_deflection`. It projects privately only when Da
  Qiao is the current Attack target, accepts exactly one live Hand or
  Equipment card and one legal replacement target, and revalidates ownership,
  liveness, effective range, attacker exclusion, and the active window before
  the atomic claim.
- Redirection preserves the original source, physical/virtual Attack identity,
  origin, physical cards, Attack card, armor flag, Dodge count, sequence and
  resolution metadata. A replacement target starts a fresh target-specific
  `attack_targeted` lifecycle; Halberd remaining targets remain intact.
- Ma Chao's source-owned Cavalry window remains before target-owned Deflection.
  Black replacement Judgement reopens normal Dodge, and red Cavalry does not
  incorrectly suppress Dodge after a redirect.
- Added deterministic capability, API, range, stale-safety, another-Da-Qiao,
  and Halberd regressions. `daqiao` was deliberately not added to
  `IMPLEMENTED_STANDARD_HERO_IDS`; counts remain 21/30 heroes and 30/46 skills.

Known boundary and next work:

- Captivating is still unimplemented. Do not enable Da Qiao or change the
  implementation counts until Captivating and the full two-skill hero round
  are complete.
- Preserve the canonical `trigger`/`decline_trigger` and
  `respond`/`decline_response` protocol, server-owned legality, private
  projections, Quick Test parity, and exact card conservation.

## Latest presentation update — Ma Chao and Liu Bei artwork — 2026-09-28

Added the supplied Ma Chao design at `public/hero-ma-chao.jpg` and replaced
the Liu Bei design at `public/hero-liu-bei.jpg`. Both are connected through the
existing shared `HERO_ART_BY_ID` / `HeroPortrait` path and the shared portrait
renderer regression now verifies the Ma Chao asset and intentional fallback
set. This update changes artwork only; gameplay, projections, selection rules,
layout dimensions, and semantic actions are unchanged.

## Current state — Stage 6 Ma Chao / Horse Riding + Cavalry complete — 2026-09-28

Ma Chao is complete on current `main`; Da Qiao has not been started. The Step 1
UI handover remains closed and this gameplay round contains no presentation or
artwork work.

Implemented:

- Preserved raw circular seat distance as an independently testable primitive;
  effective self-distance is now 0, dead-player handling keeps the existing
  sentinel, and distance providers are statically bounded.
- Reused the generic directional distance pipeline for Ma Chao Horse Riding:
  outbound distance -1, minimum effective character distance 1, composing with
  offensive/defensive Mounts and healthy/low-HP Gongsun Zan Militia.
- Added Cavalry as a source-owned optional `attack_targeted` trigger. It enters
  the shared Judgement continuation; Heart/Diamond suppress Dodge for the
  current target, Club/Spade continue to ordinary Dodge, and Sima Yi replacement
  remains supported.
- Preserved the original Attack declaration, virtual/physical identity,
  equipment modifiers, resolution identity, and normal damage/reaction pipeline.
  Sky Piercing Halberd opens Cavalry independently for each target.
- Enabled `ma-chao` for Standard selection only after both skills were complete.

Validation for this round includes distance unit tests, source-owned trigger
projection, optional skip, all four Judgement suits, Judgement replacement,
virtual Serpent Spear Attack, Halberd multi-target behavior, stale safety, and
the existing Quick Test/normal multiplayer suites.

The Standard roster is now 21/30 heroes and 30/46 printed skills, with nine
remaining heroes. The next recommended hero is Da Qiao / Captivating +
Deflection. Preserve server-owned legality, private projections, canonical
`trigger`/`decline_trigger` and `respond`/`decline_response`, and Quick Test /
multiplayer parity. Do not start Da Qiao in this round.

## Previous completed state — Stage 6 Gongsun Zan / Militia — 2026-09-28

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

Ma Chao / Horse Riding + Cavalry is now complete in the current handover above.
Stage 7 still has final graphic/theme polish and separately approved artwork
intake for fallback heroes. Preserve server-owned legality, private
projections, Quick Test/normal multiplayer parity, stale safety, and the
canonical semantic action contract.
