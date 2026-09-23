# Three Kingdoms project handover

## Opponent board arc, unclipped zones, and inspection — 2026-09-24

The mobile opponent board remains driven by the existing `relativeIndex`
mapping in `app/page.tsx` (`1=left`, `2=top`, `3=right`). The appended table
rules in `app/sequence-overrides.css` convert those seats to one responsive
absolute arc: shared `--opponent-seat-x`, `--top-seat-y`, and `--side-seat-y`
variables keep left/right symmetric, while the centred `.play-center` uses a
lower `clamp(290px, 66%, 520px)` anchor. The local player dock and its CSS were
not changed.

The previous compact-card clipping came from the opponent card/hero wrapper,
zone row, and child row combining `overflow: hidden` with a `max-height: 34%`
constraint. The public zone override permits visible height and wrapping, so
multiple miniature Equipment/Judgement cards retain their 2:3 shape instead
of being cropped or laid over one another.

`expandedOpponentId` is presentation-only React state. An opponent hero tap
opens one bounded battlefield inspection layer; its hero tap closes it, and
the layer shows full `CardFace` cards in separately labelled Equipment and
Judgement Zone sections. Compact and expanded card info controls stop event
propagation. `targetSelectionActive` is computed from the existing selected
card/skill/trigger state, so target clicks continue to call `onTarget`; the
inspection handler is used only when no target-selection mode is active. Any
inspection is cleared when target selection begins, and the layer is bounded
to the table so it cannot cover the local action dock or leave a hitbox behind.

`tests/room-safety-render.test.mjs` now protects the seat variables, pile
anchor, public-zone overflow/wrapping rules, inspection state and markup,
info-button propagation, and target-selection priority. The live browser
review at 390px, 393px, 402px, and 430px was attempted but was blocked by the
shared Mac lock; those viewport-specific visual checks remain recommended on
an unlocked device. Other player counts retain the same relative seat classes
and no server/rules/projection code was changed.

Validation status for this pass: build passed; fast render/regression tests
passed 39/39; all 106 API tests passed across four shards; lint and
`git diff --check` passed. An earlier API attempt hit a temporary Wrangler
inspector-port collision from the dev server, then the full suite passed after
that server was stopped. Recommended next work is unlocked-device visual
review and final graphic/theme polish with approved artwork intake for
remaining fallback heroes.

## Current focus — LocalPlayerDock final follow-up

Repository: `dmoneyUK/three-kingdoms`

Current implementation is based on commit:

`9c4e3aed23a8d1a5512c82c2f17ac3a32f9f2b3f` — **Resize local player panel layout**

The LocalPlayerDock redesign is mostly complete. Do not rebuild it from scratch.

### Current approved mobile layout

At phone widths (`<=480px`):

- Local hero column: `70px`
- Local hero card:
  - fills available hero-column width
  - `height: auto`
  - `aspect-ratio: 2 / 3`
  - must not be vertically stretched
- Hero overlay contains:
  - HP
  - hearts
  - role
  - hero name
- Role text is intentionally more prominent than HP/hearts.
- Hero skills are no longer below the hero image.
- Hero skills render vertically in the former Status panel.
- Skills panel uses all flexible width between Hero and Equipment.
- Equipment is immediately left of Judgement.
- Judgement is the final/rightmost top-row panel.
- Top Skills / Equipment / Judgement row: `58px`
- Hand panel: `108px`
- Hand visible/peek height target: `102px`
- Physical hand-card height remains `102px`
- Mobile action/message row: `48px`
- Opponent panels, board geometry, Draw pile and Discard pile must remain unchanged.

Relevant files:

- `app/page.tsx`
- `app/sequence-overrides.css`
- `tests/room-safety-render.test.mjs`

## Required follow-up 1 — Use the full Hand panel height

The deployed screenshot shows an unnecessary black strip below the normal hand cards.

Current CSS:

```css
--hand-panel-height: 108px;
--hand-peek-height: 84px;
--hand-card-height: 102px;
```

The physical cards are already `102px` tall, but normal `.card-slot` elements use `--hand-peek-height` with `overflow: hidden`, so only 84px of each 102px card is shown.

Do not enlarge the cards and do not increase the Hand panel.

Change only:

```css
--hand-peek-height: 102px;
```

Keep:

```css
--hand-panel-height: 108px;
--hand-card-height: 102px;
```

The intent is to use the existing black/empty space to reveal the already-existing full physical card height.

Verify:

- normal hand cards show their full `102px` height
- physical card size does not change
- Hand panel remains `108px`
- selected-card rise still works
- selected card does not cover the action row
- card info button remains usable
- horizontal card compression/distribution remains unchanged
- no new overflow appears

Update tests that currently expect:

```text
--hand-peek-height: 84px
```

to expect:

```text
--hand-peek-height: 102px
```

## Required follow-up 2 — Fix responsive Judgement spacing

Current code in `LocalPlayerDock` uses a hard-coded card width:

```tsx
style={{
  marginLeft:
    index === 0
      ? 0
      : `${judgementCardLayout.step - 34}px`
}}
```

This is incorrect because the actual Judgement/Equipment card width is responsive:

```css
--zone-card-width: clamp(28px, 7.6vw, 34px);
```

The component already measures the current card width in `judgementCardWidth`.

Change the spacing calculation to use that measured value:

```tsx
style={{
  marginLeft:
    index === 0
      ? 0
      : `${judgementCardLayout.step - judgementCardWidth}px`
}}
```

Do not otherwise redesign the approved LocalPlayerDock.

## Required visual checks

Review approximately:

- 320px
- 390px
- 430px

Confirm:

1. Hero card remains 2:3 and is not stretched.
2. Skills remain vertically stacked.
3. Equipment remains directly to the left of Judgement.
4. Judgement remains flush with the right edge.
5. One Judgement card centres correctly.
6. Two Judgement cards fit naturally in the fixed Judgement panel.
7. Three or more Judgement cards overlap correctly.
8. Hand panel remains `108px`.
9. Normal hand cards use the full existing `102px` card height.
10. The previous black strip below normal hand cards is removed or reduced to panel padding/border only.
11. Physical hand cards are not enlarged.
12. Selected hand card behaviour still works.
13. Action row remains `48px` on mobile.
14. No horizontal page overflow.
15. Opponents, board, Draw and Discard remain unchanged.

## Validation required before completion

Run all of:

```bash
npm run build
npm test
npm run lint
git diff --check
```

Do not mark this task complete unless all four pass.

After validation, report:

- files changed
- exact Hand peek-height change
- exact Judgement spacing fix
- build result
- test result
- lint result
- `git diff --check` result
- any remaining visual issue

## Scope guard

Do not make unrelated refactors.

Do not change:

- gameplay rules
- card legality
- target legality
- distance calculation
- equipment semantics
- judgement rules
- hero skill legality
- response flow
- role privacy
- semantic action API
- opponent panel layout
- Draw / Discard presentation
