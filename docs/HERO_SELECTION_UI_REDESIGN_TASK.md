# Hero Selection UI — Final Fix Task

Status: **implementation required**  
Last reviewed against deployed screenshot: **2026-09-23**  
Scope: **Hero / General Selection page only**  
Primary files: `app/page.tsx`, `app/globals.css`, `tests/room-safety-render.test.mjs`

---

## 1. Objective

Fix the current Hero Selection page so the mobile layout is visually correct and stable.

The latest deployed screenshot shows that the previous attempt made the hero artwork larger, but the card layout was not rebalanced around it. As a result:

- hero names are visibly clipped,
- card content is vertically squeezed,
- artwork still uses `object-fit: contain`, leaving dark side areas,
- the card proportions are not well balanced,
- the Confirm section is narrower than the hero grid,
- Zhang Liao still falls back to `ZL` even though his artwork exists.

This task replaces all older Hero Selection layout instructions. Treat this file as the single authoritative implementation specification.

---

## 2. Do not change gameplay

This is a UI/layout correction plus one missing hero-art mapping.

Do not change:

- hero candidate allocation,
- role allocation,
- role privacy,
- candidate privacy,
- number of choices,
- `choose_hero` action contract,
- Quick Test behaviour,
- waiting / locked-in flow,
- hero IDs,
- HP,
- faction,
- hero skill metadata,
- `HeroInfoDialog` behaviour,
- room or API logic.

Keep the existing `HeroSelection`, `HeroPortrait`, and `HERO_ART_BY_ID` architecture.

Do not create a second hero-art mapping.

---

## 3. Current code problems

### 3.1 Hero names are clipped

The current mobile/tablet layout uses a fixed card aspect ratio:

```css
.hero-choice-wrap {
  aspect-ratio: 108 / 180;
}
```

and a large portrait block:

```css
.hero-monogram {
  height: clamp(94px, 25vw, 108px);
  margin: 28px 0 4px;
}
```

The card also contains:

- hero name,
- HP hearts,
- skill names,
- SELECTED / CHOOSE state.

The image became taller, but the card did not gain enough usable content height. The flex column therefore squeezes text elements. Because the hero name uses `overflow: hidden`, the name is visibly cut in half in the deployed screenshot.

This is the highest-priority bug.

### Required fix

The final layout must guarantee that all metadata fits without flex compression.

Do not rely on a fixed aspect ratio if it causes clipping.

Preferred implementation:

- use `min-height` rather than a hard height constraint,
- allow the card to grow vertically when needed,
- make metadata elements non-shrinking,
- keep a portrait-card appearance without forcing content into an undersized box.

For mobile, a good structure is:

```css
.hero-choice-wrap {
  min-height: 270px;
}

.hero-choice {
  height: 100%;
}

.hero-choice h2,
.hero-hp,
.hero-choice p,
.hero-choice i {
  flex-shrink: 0;
}
```

The exact minimum height may be tuned to the actual card width, but the result must satisfy the acceptance checks below.

Do not blindly copy a numeric value if it causes overflow or unnecessary empty space.

---

## 4. Hero card layout contract

Each card must show, in this order:

1. faction label,
2. info button,
3. large hero image,
4. full hero name,
5. HP hearts,
6. skill names,
7. SELECTED / CHOOSE state.

Nothing may overlap or clip.

The hero image should be visually dominant, but not at the expense of the name or metadata.

Target visual hierarchy:

```text
image > name > HP > skills > state
```

---

## 5. Image sizing and framing

### Current problem

Current selection artwork still uses:

```css
.hero-choice .hero-monogram > .hero-art-image {
  object-fit: contain;
  object-position: center top;
  background: #131611;
}
```

This leaves dark side bands and makes the portrait look like an image placed inside a box rather than integrated into the card.

### Required fix

Use selection-scoped cropping:

```css
.hero-choice .hero-monogram > .hero-art-image {
  object-fit: cover;
  object-position: center top;
}
```

Do not change the global `.hero-art-image` rule in a way that affects:

- local-player hero portrait,
- opponent hero portrait,
- waiting-state hero portrait.

### Portrait container

Keep the portrait large, but size it as part of the total card layout.

For mobile, aim for roughly:

- 45–55% of total card height for the image,
- enough height to show head + upper body,
- no black side bars,
- no face-only crop.

A reasonable starting range is around 105–120px at 390–430px phone widths.

Do not increase the image height again without verifying that name, HP, skills, and state still fit.

---

## 6. Remove excessive top spacing

Current mobile portrait uses:

```css
margin: 28px 0 4px;
```

This wastes too much vertical space.

The faction label and info button are absolutely positioned, so the portrait should not need 28px of normal-flow top margin.

Reduce this to a compact value, approximately 18–20px, while keeping:

- faction readable,
- info button clear,
- portrait unobstructed.

The exact value should be chosen from the actual rendered result.

---

## 7. Hero name must always be fully visible

The current screenshot shows names such as:

- Cao Cao,
- Liu Bei,
- Sun Quan,
- Zhou Yu,
- Zhang Liao

being cut vertically.

This is not acceptable.

The final CSS must ensure:

- no vertical clipping,
- no half-visible text,
- no overlapping image/name,
- no flex compression of the name.

Use:

```css
.hero-choice h2 {
  flex-shrink: 0;
  overflow: visible;
}
```

Horizontal ellipsis may remain only if needed for unusually long future names, but normal standard heroes must display fully.

Do not use `overflow: hidden` in a way that clips the line vertically.

---

## 8. HP and skill text

HP hearts and skills must remain visible below the hero name.

Requirements:

- HP must not overlap the name,
- skills must not overlap HP,
- skills must not be pushed outside the card,
- skills can use smaller text than the hero name,
- metadata must not force the portrait to collapse.

Use `flex-shrink: 0` on these metadata rows.

If vertical space is tight, reduce:

1. skill font size,
2. skill margins,
3. SELECTED / CHOOSE spacing,

before reducing the hero image dramatically.

---

## 9. Bottom action state

`SELECTED` / `CHOOSE` must stay pinned visually near the bottom of the card but must not cause the middle content to collapse.

The current `margin-top: auto` behaviour is acceptable only if all content above it fits naturally.

Do not use it in combination with a card height that is too short.

The bottom separator and label should remain clear and consistent across all cards.

---

## 10. Mobile grid

Keep the existing successful mobile arrangement.

### Lord

```text
[ 1 ][ 2 ][ 3 ]
   [ 4 ][ 5 ]
```

Keep the existing six-track technique if desired:

- each card spans 2 tracks,
- card 4 starts at track 2,
- card 5 starts at track 4.

### Non-Lord

```text
[ 1 ][ 2 ][ 3 ]
```

All cards must have the same width.

Do not switch to:

- 2 columns,
- horizontal carousel,
- horizontal scrolling,
- five tiny cards in one row.

---

## 11. Card width

The current mobile grid width:

```css
width: min(100%, 392px);
```

is acceptable.

Keep using most of the available phone width.

Do not shrink the grid back to the old 344px limit.

---

## 12. Confirm section width

Current mobile code still uses:

```css
.hero-confirm {
  max-width: 344px;
}
```

This is visibly narrower than the hero grid.

Fix it so the confirmation section uses the same width contract:

```css
.hero-confirm {
  width: min(100%, 392px);
  max-width: none;
}
```

Keep:

```css
.hero-confirm .gold-button {
  width: 100%;
}
```

The horizontal separator and confirm button should align with the outer edges of the hero-card group.

---

## 13. Zhang Liao artwork mapping

The repository already contains:

```text
public/hero-zhang-liao.jpg
```

but the current `HERO_ART_BY_ID` does not include it.

Add:

```ts
"zhang-liao": "/hero-zhang-liao.jpg",
```

to the existing map in `app/page.tsx`.

Do not special-case Zhang Liao elsewhere.

### Zhou Yu

There is no approved Zhou Yu image in `public/` currently.

Keep Zhou Yu on the existing initials fallback.

Do not invent or substitute an asset.

---

## 14. Header and role section

The current compact mobile header and role section are acceptable.

Keep:

- brand,
- room code,
- Exit,
- test-controller label,
- `Choose your general`,
- secret role banner,
- explanatory sentence.

Do not spend this task redesigning those elements.

Focus on hero cards.

---

## 15. Responsive behaviour

Validate these widths:

- 390px,
- 430px,
- 768px,
- desktop > 900px.

### <= 900px

Keep 3 + 2 for five candidates.

Ensure:

- no clipped names,
- no card overlap,
- no horizontal scroll,
- consistent card heights.

### > 900px

Five Lord candidates may remain in one row.

Do not regress desktop card readability.

---

## 16. Vertical scrolling

Vertical scrolling is expected and acceptable.

Do not reduce card quality to force the entire page into one screen.

Use normal document flow.

Do not:

- fix the hero section to viewport height,
- clip the second row,
- hide overflow,
- overlay the confirm button over cards.

---

## 17. Tests — important correction

Current tests are overfitted to the broken intermediate CSS.

They currently require details such as:

```text
aspect-ratio: 108 / 180
height: clamp(94px, 25vw, 108px)
object-fit: contain
```

Those exact assertions should be removed or updated.

### Tests should protect behaviour and layout invariants instead

Keep tests for:

- 3 candidates for non-Lord,
- 5 candidates for Lord,
- 3 + 2 mobile structure,
- centred row 2,
- separate info buttons,
- no nested buttons,
- private role rendering,
- hero art IDs,
- shared HeroPortrait architecture,
- no old 54px portrait regression,
- selection-specific image framing,
- Zhang Liao mapping,
- checked-in Zhang Liao asset,
- fallback initials for heroes without art,
- `100dvh` selection shell if retained,
- no two-column mobile regression.

### Add regression coverage for clipped metadata

Where practical, assert CSS intent such as:

- hero name / HP / skill rows are non-shrinking,
- card uses `min-height` or another content-safe layout,
- selection image uses `cover`,
- mobile Confirm width matches hero-grid width.

Do not write tests that merely freeze arbitrary pixel values unless those values are essential to the design.

---

## 18. Required implementation order

### Step 1

Read:

```text
AGENTS.md
app/page.tsx
app/globals.css
app/sequence-overrides.css
tests/room-safety-render.test.mjs
docs/HERO_ART_INTEGRATION_GUIDE.md
WTK_CG_STYLE_GUIDE.md
```

### Step 2

Fix the card height model first.

Do not change image height first.

The card must have enough content-safe height for:

- image,
- name,
- HP,
- skills,
- state.

### Step 3

Make name / HP / skills non-shrinking.

Remove vertical clipping.

### Step 4

Tune hero image height inside the corrected card.

### Step 5

Change selection image framing from `contain` to `cover` + `center top`.

### Step 6

Reduce the unnecessary 28px top margin.

### Step 7

Align Confirm width to the grid.

### Step 8

Add Zhang Liao to `HERO_ART_BY_ID`.

### Step 9

Update tests to protect the final design rather than the intermediate CSS.

### Step 10

Run the repository-required validation from `AGENTS.md`.

At minimum:

```text
npm test
npm run lint
npm run build
git diff --check
```

### Step 11

Update `README.md` and `HANDOVER.md` only with the final implementation state.

Do not document superseded intermediate values.

---

## 19. Manual acceptance checklist

Do not mark complete until all items pass.

### Mobile card content

- [ ] Hero name is fully visible.
- [ ] No hero name is vertically clipped.
- [ ] HP hearts are fully visible.
- [ ] Skill names are fully visible.
- [ ] SELECTED / CHOOSE remains visible.
- [ ] No text overlaps another row.
- [ ] No content is squeezed by flexbox.

### Hero portrait

- [ ] Image is large and visually dominant.
- [ ] Head is visible.
- [ ] Upper body / armour is visible.
- [ ] No black side bars.
- [ ] No distortion.
- [ ] No face-only crop.

### Layout

- [ ] Lord remains 3 + 2.
- [ ] Row 2 is centred.
- [ ] Non-Lord remains 3 across.
- [ ] Cards have consistent height.
- [ ] No horizontal page scrolling.
- [ ] Vertical page scrolling works normally.
- [ ] Confirm section matches hero-grid width.

### Assets

- [ ] Cao Cao art displays.
- [ ] Liu Bei art displays.
- [ ] Sun Quan art displays.
- [ ] Zhang Liao art displays from `hero-zhang-liao.jpg`.
- [ ] Zhou Yu remains initials fallback until approved art exists.

### Behaviour

- [ ] Selecting a card changes local selection.
- [ ] Selected visual state works.
- [ ] Info button still opens HeroInfoDialog.
- [ ] Confirm submits the selected hero.
- [ ] Role privacy unchanged.
- [ ] Candidate privacy unchanged.
- [ ] Quick Test unchanged.
- [ ] Waiting / locked-in flow unchanged.

---

## 20. Definition of done

The implementation is complete only when the deployed mobile page shows:

- five balanced portrait cards for Lord in 3 + 2,
- large integrated hero artwork,
- **fully visible hero names**,
- readable HP and skills,
- no dark side bars,
- no clipped text,
- no squeezed flex content,
- Confirm aligned to the card group,
- Zhang Liao using his real checked-in artwork,
- normal vertical scrolling instead of layout compression.

The latest deployed screenshot is **not** an acceptable final result because the hero names are visibly clipped.
