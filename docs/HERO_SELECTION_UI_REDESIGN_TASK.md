# Hero Selection Page UI Redesign Task

Status: **ready for implementation**  
Scope: **Hero / General Selection page only**  
Primary files expected: `app/page.tsx`, `app/globals.css`, `tests/room-safety-render.test.mjs`  
Reference architecture: `docs/HERO_ART_INTEGRATION_GUIDE.md`

---

## 1. Goal

Redesign the **Choose your general** page so the hero cards match the approved visual direction and, most importantly, the hero artwork is actually readable on a phone.

The current mobile UI compresses each hero portrait into a very shallow strip. The screenshot that triggered this task shows the problem clearly: the layout technically contains five cards, but the character artwork is too short and heavily cropped to function as the main visual element.

The new page should keep the existing dark Three Kingdoms / antique-gold styling, but the hero card itself must become the focus of the screen.

### Approved visual result

The intended portrait/mobile hierarchy is:

```text
┌──────────────────────────────────────────┐
│ WTK / THREE KINGDOMS   ROOM CODE   EXIT  │
├──────────────────────────────────────────┤
│             GENERAL SELECTION            │
│                                          │
│           Choose your general            │
│                                          │
│     YOUR SECRET ROLE      [ LORD ]        │
│                                          │
│   As Lord, choose from five generals.    │
│                                          │
│     ┌────────┐ ┌────────┐ ┌────────┐     │
│     │ HERO 1 │ │ HERO 2 │ │ HERO 3 │     │
│     │ LARGE  │ │ LARGE  │ │ LARGE  │     │
│     │  ART   │ │  ART   │ │  ART   │     │
│     │  NAME  │ │  NAME  │ │  NAME  │     │
│     └────────┘ └────────┘ └────────┘     │
│                                          │
│          ┌────────┐ ┌────────┐           │
│          │ HERO 4 │ │ HERO 5 │           │
│          │ LARGE  │ │ LARGE  │           │
│          │  ART   │ │  ART   │           │
│          │  NAME  │ │  NAME  │           │
│          └────────┘ └────────┘           │
│                                          │
│          [ CONFIRM <HERO NAME> ]         │
└──────────────────────────────────────────┘
```

For a normal non-Lord player with three candidates, render one centred row of three cards.

The page **may scroll vertically on mobile**. Do not squash the hero cards merely to force the entire selection screen into one viewport.

---

## 2. Current implementation reviewed

The current page is implemented in `HeroSelection` in:

```text
app/page.tsx
```

The existing structure is already correct from a gameplay perspective:

- private role banner,
- Lord receives five candidates,
- other roles receive three private candidates,
- first valid candidate is selected by default,
- clicking a hero changes the local selection,
- selected hero has a visual selected state,
- each card has an information button,
- information dialog remains private,
- confirm calls the existing `onChoose(heroId)`,
- waiting / locked-in state is separate,
- selection choices remain private until the match begins.

**Do not rewrite this gameplay flow.**

The current hero artwork is rendered through the shared `HeroPortrait` / `HERO_ART_BY_ID` path. Keep using that shared renderer.

### Root cause of the visual problem

The main problem is in `app/globals.css`.

At the mobile breakpoint the current CSS contains:

```css
.hero-monogram {
  flex: none;
  height: 54px;
  ...
}
```

This forces the hero artwork into only a 54px-high strip.

The shared image rule is also:

```css
.hero-art-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
```

A shallow 54px container plus `object-fit: cover` means the source portrait is aggressively cropped.

The current mobile grid is also capped at only `344px`, leaving useful phone width unused.

The redesign must fix the layout rather than modifying individual hero source images to compensate.

---

## 3. Non-negotiable behaviour

This is a **presentation / responsive-layout change**.

Do not change:

- room creation,
- room projection,
- role allocation,
- hero allocation,
- number of hero choices,
- hero IDs,
- hero HP,
- faction,
- skill metadata,
- selection privacy,
- turn/action ownership,
- `choose_hero` API behaviour,
- locked-in/waiting semantics,
- Quick Test controller semantics,
- hero information dialog content,
- the shared artwork mapping architecture.

Do not introduce a second hero-art mapping.

Do not hard-code Cao Cao, Liu Bei, Sun Quan, Zhou Yu, Zhang Liao, or any other specific hero into the layout.

The component must work for whichever heroes are provided by `room.myHeroOptions`.

---

## 4. Hero card visual contract

Each candidate must look like a proper hero card rather than a small information tile.

### Card proportions

Use a normal portrait-card silhouette, approximately **2:3**.

The card may be slightly taller if required by text, but do not make it short and wide.

On a typical 390–430px-wide phone:

- three cards must fit in the first row,
- each card should use almost all available width allocated to its grid track,
- gaps should be small but deliberate,
- the second row of a five-card Lord selection must be centred,
- cards must not overflow the viewport.

Do **not** preserve the current “make everything tiny so it fits on one screen” behaviour.

### Internal order

Each card should visually read from top to bottom as:

1. faction label,
2. information icon,
3. **large hero portrait**,
4. hero name,
5. HP hearts,
6. skill names,
7. selected / choose state.

Use the existing content and wording unless a small markup wrapper is required for styling.

### Hero artwork is the priority

The artwork must become the dominant area of the card.

On mobile, the portrait area should occupy roughly **55–65% of the useful card body**, not a fixed 54px strip.

Acceptance target:

- head is visible,
- upper body / armour / primary silhouette is visible,
- the image no longer looks like a narrow banner,
- different source portraits remain recognisable,
- the image is not distorted.

Do not stretch hero artwork.

For the **hero-selection portrait only**, use a fit/framing strategy that prevents destructive cropping. Prefer:

```css
object-position: center top;
```

and use `object-fit: contain` when that is required to keep the character visible.

If `cover` is retained, the portrait container must be tall enough that the head and upper body are still clearly visible. Do not use a face-only crop.

Important: do **not** globally change `.hero-art-image` if that would alter the local-player or opponent-player portraits. Scope selection-specific image fitting to the hero-selection container.

### Recommended implementation direction

The existing `.hero-monogram` can remain the portrait container, but it must stop being treated as a 54px mobile banner.

A good implementation is:

- give `.hero-choice-wrap` a real portrait-card proportion,
- give `.hero-monogram` a substantial explicit share of card height,
- keep it `position: relative` + `overflow: hidden`,
- keep `HeroPortrait` filling that container,
- apply selection-specific image framing,
- keep the faction/info controls above the image with the correct z-index.

Do not create hero-specific CSS such as `.cao-cao-image`, `.liu-bei-image`, etc.

---

## 5. Mobile layout: highest priority

The user reported this issue from a portrait phone, so mobile is the acceptance baseline.

### Width range to validate

Manually inspect at least:

- 390px wide,
- 430px wide,
- 768px wide.

### Five-candidate Lord layout

Keep the good existing 3 + 2 pattern:

```text
[ 1 ][ 2 ][ 3 ]
   [ 4 ][ 5 ]
```

The second row must be visually centred.

The current six-track CSS technique is acceptable:

- each card spans two tracks,
- card 4 starts at track 2,
- card 5 starts at track 4.

However, use more of the available phone width. The current hard cap of `344px` is too conservative for the approved design.

Use a viewport-safe width close to the available content width, for example a `min(100%, ...)` value in the high 300px range, while still avoiding horizontal overflow on narrower devices.

Do not change the 3 + 2 layout into:

- two columns,
- a horizontal carousel,
- horizontally scrolling cards,
- five tiny cards in one row.

### Three-candidate layout

For normal roles:

```text
[ 1 ][ 2 ][ 3 ]
```

Keep them centred and equal sized.

### Vertical scrolling is allowed

If the larger cards mean the confirmation button sits below the initial viewport, that is acceptable.

Preferred behaviour:

- page scrolls normally,
- top section remains compact,
- cards stay readable,
- confirm button follows the cards in normal document flow.

Do not set a fixed page height that clips the second row or confirm control.

Do not use `overflow: hidden` on the page to conceal content.

Use `min-height: 100dvh` where appropriate for modern mobile viewport handling.

---

## 6. Header and title area

Keep the same information hierarchy as the approved mock-up:

### Top bar

- brand left,
- room status/code centred,
- Exit right,
- dark translucent background,
- thin antique-gold separation line,
- compact height.

Do not allow the header to consume a large fraction of mobile height.

### Main heading

Keep:

```text
GENERAL SELECTION
Choose your general
```

The heading should be elegant and visible, but it should not steal space from the cards.

On mobile, keep the current idea of a smaller responsive title, roughly in the low/mid-30px range.

### Secret role banner

Keep this visually prominent:

```text
YOUR SECRET ROLE    LORD
```

It should remain centred, compact, and clearly separate from the instruction text.

Do not reveal any other player's role.

### Instruction copy

Keep the existing conditional text:

For Lord:

```text
As Lord, choose from five generals. Your identity will be visible at the table.
```

For other roles:

```text
Choose one of your three private candidates.
```

---

## 7. Card chrome and states

Preserve the current visual language:

- dark charcoal / deep green base,
- muted antique-gold border,
- light parchment text,
- red HP hearts,
- faction tint can remain subtle,
- restrained shadow.

### Selected card

The selected card should be unmistakable but not dramatically larger than its neighbours.

Keep / improve:

- gold border,
- soft gold outer glow,
- subtle warmer selected background,
- `SELECTED` label in gold.

Do not scale the selected card enough to cause grid reflow or overlap.

### Unselected card

Keep:

```text
CHOOSE
```

as the bottom action-state label.

The entire hero card remains clickable using the current button behaviour.

### Information control

Keep the round `i` control at the upper-right.

It must:

- remain visually separate from the main card-selection action,
- continue opening `HeroInfoDialog`,
- remain above the artwork,
- not obscure the hero's face,
- keep an accessible label such as `View Cao Cao information`.

On mobile, a visual size around the current small circular-control scale is fine, but position it so it does not consume portrait space.

---

## 8. Text sizing inside cards

The card should prioritise image > name > HP > skills > state.

On phones:

- name must remain readable without wrapping where practical,
- hearts must remain clearly visible,
- skill names may use a smaller font,
- skill text must not force the artwork back down to a tiny strip,
- selection-state text stays compact.

Do not make every text element large.

If space is tight, reduce skill/status text before reducing the hero artwork.

Use ellipsis only when genuinely necessary. The standard hero names should fit.

---

## 9. Desktop / tablet behaviour

Do not damage the current desktop experience.

Suggested responsive behaviour:

### Wide desktop (> 900px)

- five Lord candidates may remain in one centred row,
- cards can use the existing approximately 160–190px width range,
- hero portraits must still be large and readable,
- three-candidate selections remain centred.

### Tablet / narrow desktop (<= 900px)

Use the same centred 3 + 2 layout used by mobile.

The responsive transition must not produce awkward partially filled rows.

---

## 10. Markup guidance

Avoid a large component rewrite.

The existing structure in `HeroSelection` is close to what we need.

Small semantic wrappers are acceptable if they make CSS much clearer, for example:

```tsx
<button className="hero-choice ...">
  <span className="faction">...</span>

  <div className="hero-monogram">
    <HeroPortrait hero={hero} />
  </div>

  <div className="hero-choice-details">
    <h2>...</h2>
    <span className="hero-hp">...</span>
    <p>...</p>
  </div>

  <i>...</i>
</button>
```

This is only an example. Adapt the current component rather than copying blindly.

Do not move the info button inside the main selection button if that creates invalid nested-button markup. The current wrapper + separate info button pattern is valid and should be preserved.

---

## 11. Waiting / locked-in state

The current `chosen-wait` flow is functional and is not the main target of this task.

Do not remove it.

At minimum verify:

- chosen hero artwork still renders,
- waiting message remains correct,
- ready count remains correct,
- the redesign CSS does not accidentally inherit candidate-card dimensions.

A small visual alignment update is acceptable, but do not turn this task into a waiting-screen rewrite.

---

## 12. Tests to update

Review:

```text
tests/room-safety-render.test.mjs
```

There is already focused hero-selection coverage.

Preserve assertions for:

- private role display,
- three candidate wrappers for normal roles,
- five candidate wrappers for Lord,
- one info button per candidate,
- hero art IDs,
- 3 + 2 centred Lord layout,
- no regression to two flexible mobile columns.

### Remove / update brittle assumptions from the old compact design

The current test explicitly expects the mobile grid to use a compact `344px` width. That expectation belongs to the old compressed layout and should be updated.

The redesigned tests should verify the **invariants**, not the old exact compression numbers:

- mobile still has three card tracks,
- Lord card 4 and card 5 remain centred on row 2,
- selection artwork fills the portrait container,
- mobile portrait is no longer capped to `54px`,
- the selection page has a selection-specific image framing rule,
- cards remain portrait shaped,
- hero info controls remain separate,
- no nested interactive controls are introduced.

Do not weaken the existing privacy / hero-count assertions.

---

## 13. Files the coding agent should inspect before editing

Read these first:

```text
AGENTS.md
app/page.tsx
app/globals.css
tests/room-safety-render.test.mjs
docs/HERO_ART_INTEGRATION_GUIDE.md
WTK_CG_STYLE_GUIDE.md
```

Also check `app/sequence-overrides.css` for selectors that could unintentionally override shared `.hero-art-image` behaviour on the actual game board.

Do not modify unrelated game-board UI while doing this task.

---

## 14. Implementation order

### Step 1 — preserve behaviour

Read `HeroSelection` and identify the existing state / click / confirm / waiting paths.

Do not change the action contract.

### Step 2 — fix the card layout

Update the candidate-card CSS so:

- cards are real portrait cards,
- mobile uses available width,
- five-card Lord layout is 3 + 2,
- cards are not vertically compressed.

### Step 3 — fix the artwork area

Remove the mobile `54px` portrait bottleneck.

Give the portrait a large predictable area.

Apply selection-scoped image fitting / positioning so the character is visible without distorting or destructively cropping the source image.

### Step 4 — rebalance card metadata

Fit hero name, HP, skills and SELECTED/CHOOSE underneath the larger image.

Keep the artwork dominant.

### Step 5 — verify top section and confirmation

Make sure the larger cards work with:

- title,
- role banner,
- instruction text,
- confirmation button,
- mobile vertical scrolling.

### Step 6 — update tests

Update the hero-selection render/CSS assertions to represent the new invariants.

### Step 7 — validate

Run the repository-required checks from `AGENTS.md`.

At minimum:

```text
npm test
npm run lint
npm run build
git diff --check
```

Use the exact package scripts present in `package.json` if their names differ.

### Step 8 — repository documentation

Because this is a functional UI change, update:

```text
README.md
HANDOVER.md
```

Document:

- hero-selection mobile card redesign,
- portrait no longer compressed to 54px,
- 3 + 2 Lord layout retained,
- vertical scrolling intentionally allowed to protect artwork readability.

---

## 15. Manual acceptance checklist

Do not mark the task complete until all of these are true.

### Mobile

- [ ] At ~390px width, three hero cards fit without horizontal overflow.
- [ ] At ~430px width, cards scale cleanly and use the available width.
- [ ] A Lord sees 3 cards on the first row and 2 centred on the second.
- [ ] A non-Lord sees 3 centred cards.
- [ ] Hero art is substantially taller than the old 54px strip.
- [ ] Hero head and upper-body silhouette are clearly visible.
- [ ] Artwork is not stretched.
- [ ] Faction label does not cover the face.
- [ ] Info icon does not cover the face.
- [ ] Hero name remains readable.
- [ ] HP hearts remain readable.
- [ ] Skill names remain readable.
- [ ] Selected state is clear.
- [ ] Confirm button is reachable.
- [ ] Page can scroll vertically when needed.
- [ ] No horizontal page scroll appears.

### Desktop / tablet

- [ ] Five-card desktop row still looks balanced.
- [ ] <=900px layout becomes 3 + 2 cleanly.
- [ ] Three-card selection remains centred.
- [ ] No giant or distorted hero images.
- [ ] Info dialog still opens correctly.

### Behaviour

- [ ] Selecting a candidate changes only local selection state.
- [ ] Confirm sends the same selected hero ID as before.
- [ ] Role privacy is unchanged.
- [ ] Candidate privacy is unchanged.
- [ ] Waiting/locked-in state still works.
- [ ] Quick Test perspective still works.
- [ ] No game rules or API behaviour changed.

---

## 16. Things NOT to do

Do not:

- shrink the hero artwork to make the page fit one screen,
- keep the 54px mobile portrait height,
- switch to a two-column layout,
- switch to a horizontal carousel,
- add hero-specific CSS,
- crop / edit each hero asset as a workaround for layout,
- replace `HeroPortrait`,
- duplicate `HERO_ART_BY_ID`,
- add gameplay logic to the presentation component,
- reveal other players' role or candidate data,
- redesign the whole game board,
- apply `docs/UI_ASSET_INTEGRATION_GUIDE.md` board assets to this screen unless separately requested.

---

## 17. Definition of done

The task is complete when the Hero Selection page visually matches the approved direction:

> a dark, elegant Three Kingdoms selection screen with a compact header and role panel, five properly proportioned hero cards in a centred 3 + 2 mobile layout, large readable character artwork, clear name/HP/skills, a strong gold selected state, and a full-width confirmation action — with normal vertical scrolling preferred over compressing the artwork.

The most important regression check is simple:

> **On a phone, a hero must look like a hero portrait card, not a 54px image strip.**
