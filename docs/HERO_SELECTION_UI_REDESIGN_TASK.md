# Hero Selection Page UI Redesign Task

Status: **follow-up correction required — current implementation is not final**  
Last reviewed: **2026-09-23**  
Scope: **Hero / General Selection page only**  
Primary files: `app/page.tsx`, `app/globals.css`, `tests/room-safety-render.test.mjs`  
Reference: `docs/HERO_ART_INTEGRATION_GUIDE.md`, `WTK_CG_STYLE_GUIDE.md`

---

## 1. Current state

The first redesign pass improved the original mobile problem, but the deployed result is still not the approved final design.

The current implementation already gets several things right:

- Lord layout is still **3 + 2** on mobile/tablet.
- The second row is centred.
- The hero grid uses more of the phone width.
- The selected card has a clear gold treatment.
- The separate information button is preserved.
- Hero-selection privacy and gameplay behaviour are unchanged.

However, the current implementation still has four visible design problems and one missing asset mapping:

1. hero artwork is still too small relative to the card,
2. `object-fit: contain` creates visible dark side bars,
3. the mobile card is too tall for its content and leaves too much empty lower space,
4. the confirmation area is narrower than the hero-card group,
5. Zhang Liao's checked-in artwork is not mapped, so the page incorrectly falls back to `ZL`.

This document supersedes the intermediate CSS values introduced by the first pass.

---

## 2. Goal

The final Hero Selection page should look like a proper character-selection screen:

- dark green / charcoal Three Kingdoms theme,
- antique-gold card chrome,
- compact header and role section,
- large readable hero artwork,
- clear name, HP, skill names, and selection state,
- Lord layout of three cards followed by a centred pair,
- normal vertical scrolling on mobile rather than shrinking the cards.

The hero artwork must be the dominant visual element.

The most important acceptance rule is:

> **On a phone, each candidate must look like a hero portrait card, not a small information tile with a narrow image window.**

---

## 3. Preserve all gameplay behaviour

This is a presentation/layout correction plus one missing artwork mapping.

Do **not** change:

- room creation,
- role allocation,
- hero candidate allocation,
- number of candidates,
- hero IDs,
- HP,
- faction,
- skill metadata,
- role privacy,
- candidate privacy,
- `choose_hero` API behaviour,
- Quick Test controller behaviour,
- waiting / locked-in semantics,
- hero information dialog behaviour,
- current selection state handling.

Keep using the existing shared:

```text
HERO_ART_BY_ID
HeroPortrait
```

Do not create a second artwork renderer or mapping.

---

## 4. Current implementation problems to fix

### 4.1 Hero portrait is still too small

Current mobile CSS:

```css
.hero-monogram {
  flex: none;
  height: clamp(68px, 21vw, 90px);
}
```

This is better than the old 54px strip, but it is still visually too small.

In the current deployed screenshot, the artwork occupies only around 40–45% of the card and the lower half contains too much unused dark space.

### Required correction

At phone widths, the artwork should occupy roughly **55–65% of the useful card body**.

Use a substantially taller portrait area. A good starting point is:

```css
.hero-monogram {
  height: clamp(108px, 29vw, 124px);
}
```

The exact values may be tuned after rendering, but the result must satisfy the visual acceptance criteria below.

Do not reduce the artwork simply to fit the whole page inside one viewport.

Vertical scrolling is allowed and preferred.

---

### 4.2 Remove `object-fit: contain` black-side-bar effect

Current selection-specific rule:

```css
.hero-choice .hero-monogram > .hero-art-image {
  object-fit: contain;
  object-position: center top;
  background: #131611;
}
```

This creates obvious dark side areas around narrower source portraits.

### Required correction

After increasing the portrait container height, use:

```css
.hero-choice .hero-monogram > .hero-art-image {
  object-fit: cover;
  object-position: center top;
}
```

Important:

- scope this to Hero Selection only,
- do not globally change `.hero-art-image`,
- do not alter local-player or opponent-player portrait framing,
- do not add hero-specific positioning rules.

The container must be tall enough that `cover` does not turn the image into a face-only crop.

Acceptance target:

- head visible,
- upper body / armour visible,
- main silhouette readable,
- no distortion,
- no black side bars.

---

### 4.3 Correct the mobile card proportion

Current mobile rule:

```css
.hero-choice-wrap {
  aspect-ratio: 108 / 180;
}
```

That is taller than necessary and contributes to the large blank area under the hero details.

### Required correction

Use a normal portrait-card proportion around:

```css
.hero-choice-wrap {
  aspect-ratio: 2 / 3;
}
```

A very small adjustment is acceptable if text requires it, but the card must not become a long empty column.

The card should visually allocate space in this order:

1. faction / info controls,
2. large hero artwork,
3. hero name,
4. HP hearts,
5. skill names,
6. SELECTED / CHOOSE state.

There should not be a large unused gap between skill text and the bottom state.

---

### 4.4 Align the Confirm section with the hero grid

Current mobile hero grid:

```css
width: min(100%, 392px);
```

but the confirmation section still uses:

```css
.hero-confirm {
  max-width: 344px;
}
```

This makes the separator and confirm button visibly narrower than the hero-card group.

### Required correction

Use the same mobile width contract as the card grid, for example:

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

The separator and confirm button should visually align with the outer hero grid.

---

### 4.5 Fix Zhang Liao artwork mapping

The repository already contains:

```text
public/hero-zhang-liao.jpg
```

but `HERO_ART_BY_ID` currently omits it.

Add:

```ts
"zhang-liao": "/hero-zhang-liao.jpg",
```

to the existing shared mapping in `app/page.tsx`.

Do not add a special-case renderer.

### Zhou Yu

There is currently no checked-in Zhou Yu hero artwork in `public/`.

Therefore:

- keep the initials fallback for Zhou Yu,
- do not substitute another image,
- do not generate or invent an asset in this task.

---

## 5. Mobile layout contract

Mobile is the acceptance baseline.

Validate at approximately:

- 390px,
- 430px,
- 768px.

### Lord: five candidates

Keep:

```text
[ 1 ][ 2 ][ 3 ]
   [ 4 ][ 5 ]
```

The existing six-track approach is acceptable:

- each candidate spans two tracks,
- fourth candidate starts at track 2,
- fifth candidate starts at track 4.

Do not change this into:

- two columns,
- a horizontal carousel,
- horizontal card scrolling,
- five tiny cards in one row.

### Non-Lord: three candidates

Keep:

```text
[ 1 ][ 2 ][ 3 ]
```

All three cards should remain equal-sized and centred.

### Scrolling

The page may and should scroll vertically if necessary.

Do not compress the hero artwork just to fit:

- title,
- role banner,
- two hero rows,
- confirm button,

inside one phone viewport.

Do not introduce horizontal page scrolling.

---

## 6. Card visual contract

Each hero candidate must retain:

- faction label at upper-left,
- round information button at upper-right,
- large hero portrait,
- hero name,
- red HP hearts,
- skill names,
- SELECTED or CHOOSE label.

### Selected state

Keep:

- gold border,
- restrained gold glow,
- warmer selected background,
- gold SELECTED text.

Do not scale the selected card enough to cause reflow or overlap.

### Info control

Keep the information button separate from the card-selection button.

Do not create nested buttons.

The current accessible label pattern must remain:

```text
View <hero name> information
```

Position the info button so it does not obscure the important part of the hero portrait.

---

## 7. Text hierarchy

On mobile, prioritise:

```text
artwork > hero name > HP > skills > selection state
```

If space is tight:

- reduce skill/status font sizing before reducing artwork,
- keep hero name readable,
- keep hearts readable,
- keep SELECTED / CHOOSE compact.

Do not let metadata force the portrait back into a small strip.

---

## 8. Desktop and tablet

Do not regress desktop.

### > 900px

Five Lord candidates may remain in one centred row.

Cards should remain balanced and artwork should still be readable.

### <= 900px

Use the centred 3 + 2 layout.

Do not create awkward partial rows.

---

## 9. Implementation guidance

Review before editing:

```text
AGENTS.md
app/page.tsx
app/globals.css
app/sequence-overrides.css
tests/room-safety-render.test.mjs
docs/HERO_ART_INTEGRATION_GUIDE.md
WTK_CG_STYLE_GUIDE.md
```

Avoid a large component rewrite.

The existing `HeroSelection` structure is already functionally correct.

Prefer focused CSS changes plus the Zhang Liao mapping.

Do not modify unrelated game-board UI.

---

## 10. Tests

Update:

```text
tests/room-safety-render.test.mjs
```

The current tests freeze intermediate implementation details that are no longer desired:

- `aspect-ratio: 108 / 180`,
- `height: clamp(68px, 21vw, 90px)`,
- `object-fit: contain`.

Replace those expectations with the corrected design.

Keep coverage for:

- private role display,
- 3 candidates for normal roles,
- 5 candidates for Lord,
- separate info control per candidate,
- 3 + 2 Lord layout,
- centred fourth/fifth Lord cards,
- no two-column regression,
- no old 54px portrait regression,
- portrait-style card proportion,
- selection-specific image framing,
- Zhang Liao artwork mapping,
- checked-in Zhang Liao asset,
- initials fallback for heroes without artwork,
- no nested interactive controls,
- unchanged privacy behaviour.

Do not weaken privacy or candidate-count tests.

---

## 11. Required implementation sequence

### Step 1 — inspect current code

Confirm the existing state and action flow in `HeroSelection`.

Do not change the action contract.

### Step 2 — correct card proportions

Change mobile candidate cards away from the current `108 / 180` ratio toward approximately `2 / 3`.

### Step 3 — enlarge artwork

Replace the current 68–90px portrait range with a substantially larger portrait area.

Start around:

```css
height: clamp(108px, 29vw, 124px);
```

Tune visually if required.

### Step 4 — switch selection artwork to `cover`

Use:

```css
object-fit: cover;
object-position: center top;
```

only for Hero Selection candidate artwork.

### Step 5 — rebalance metadata

Remove excessive empty space while preserving name, HP, skills, and state.

### Step 6 — align confirmation width

Make the confirmation separator/button use the same mobile width contract as the hero grid.

### Step 7 — map Zhang Liao

Add:

```ts
"zhang-liao": "/hero-zhang-liao.jpg",
```

to `HERO_ART_BY_ID`.

Leave Zhou Yu on initials fallback until an approved asset exists.

### Step 8 — update tests

Remove assertions that protect the intermediate 68–90px / contain / 108:180 implementation.

Protect the corrected invariants instead.

### Step 9 — validate

Run the project-required checks from `AGENTS.md`, including:

```text
npm test
npm run lint
npm run build
git diff --check
```

Use the exact package scripts in `package.json` if names differ.

### Step 10 — update project docs

Because the implementation itself is a functional UI correction, update:

```text
README.md
HANDOVER.md
```

Record the final deployed behaviour rather than the superseded intermediate values.

---

## 12. Manual acceptance checklist

### Mobile

- [ ] At ~390px, three cards fit without horizontal overflow.
- [ ] At ~430px, cards use the available width cleanly.
- [ ] Lord layout is 3 + 2.
- [ ] Second row is centred.
- [ ] Non-Lord layout is one centred row of three.
- [ ] Portrait occupies roughly 55–65% of the useful card body.
- [ ] Portrait is clearly larger than the current 68–90px implementation.
- [ ] Head and upper body are visible.
- [ ] No black side bars caused by `object-fit: contain`.
- [ ] Artwork is not stretched.
- [ ] No large unused lower section in the card.
- [ ] Hero name is readable.
- [ ] HP hearts are readable.
- [ ] Skill names are readable.
- [ ] Selected state is obvious.
- [ ] Info button remains usable and does not obscure the face.
- [ ] Confirm separator/button aligns with hero-grid width.
- [ ] Zhang Liao uses `hero-zhang-liao.jpg`.
- [ ] Zhou Yu remains initials fallback if no asset exists.
- [ ] Vertical scrolling works normally.
- [ ] No horizontal page scroll.

### Tablet / desktop

- [ ] <=900px keeps 3 + 2.
- [ ] >900px five-card row remains balanced.
- [ ] Hero artwork remains readable.
- [ ] No distorted portraits.
- [ ] Info dialog still works.

### Behaviour

- [ ] Selecting a candidate changes only local selection.
- [ ] Confirm submits the same hero ID contract as before.
- [ ] Role privacy is unchanged.
- [ ] Candidate privacy is unchanged.
- [ ] Waiting / locked-in state still works.
- [ ] Quick Test still works.
- [ ] No gameplay rules or API semantics changed.

---

## 13. Do not do these

Do not:

- shrink the artwork to force everything into one viewport,
- restore a 54px-style portrait strip,
- keep the intermediate `object-fit: contain` black-bar treatment,
- keep the intermediate `108 / 180` ratio if it leaves empty space,
- create hero-specific CSS,
- edit each source portrait as a layout workaround,
- duplicate `HERO_ART_BY_ID`,
- replace `HeroPortrait`,
- hard-code hero names into layout logic,
- expose private candidate/role information,
- redesign the game board as part of this task,
- invent a Zhou Yu asset.

---

## 14. Definition of done

The task is complete when the deployed mobile page visually matches the approved direction:

> A dark, elegant Three Kingdoms hero-selection screen where each candidate is a proper portrait card, the hero artwork is the dominant part of the card, the Lord layout remains centred 3 + 2, card metadata is compact and readable, the Confirm action aligns with the card group, Zhang Liao displays his checked-in artwork, and the page scrolls vertically instead of sacrificing portrait quality.

The current intermediate implementation should **not** be considered complete until these corrections are applied.
