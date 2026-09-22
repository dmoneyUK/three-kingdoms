# LocalPlayerDock Final UI Refinement Task

## Purpose

This document is the **current and authoritative implementation brief** for the next presentation-only refinement of the War of Three Kingdoms mobile UI.

Repository: `dmoneyUK/three-kingdoms`

This file replaces the previous version of this task brief. Review the **current code first** and refine the existing implementation; do not rebuild the dock from scratch.

Primary files:
- `app/page.tsx`
- `app/sequence-overrides.css`
- opponent `.player-square` styles in `app/globals.css`
- focused UI/render tests such as `tests/room-safety-render.test.mjs`

Do **not** perform the parked broad test-suite refactor in this task.

---

# Latest screenshot review — mandatory changes

The latest deployed screenshot adds these requirements on top of the current dock work:

1. The other 3 players must show information vertically:
   - `HP x/x`
   - heart icons
   - `Hand cards: x`

2. Other players' equipped cards must show:
   - real compact card graphics
   - suit/rank corner
   - not plain/text-only rectangles

3. Local Judgement panel must be smaller:
   - visually sized for **2 compact cards**
   - same card size as local Equipment cards
   - no fake/fixed empty Judgement slots

4. Local Status / HP / Role panel must be **wider than the current implementation** while remaining smaller than the Equipment panel.

5. Play / Skip / End style action buttons should be **wider** for clearer touch targets.

These items are mandatory and override older sizing assumptions.

---

# Non-negotiable visual requirements

This task is complete only when all of these are true:

1. Selecting a Hand card reveals the **full card** at its original horizontal position.
2. Selected Hand card rises above Status / Equipment / Judgement and is not cut by their borders/backgrounds.
3. Equipment and Judgement are **separate bordered panels**.
4. Equipment has exactly 4 improved slots:
   - Weapon
   - Armour
   - +1 Horse
   - -1 Horse
5. Empty Equipment slots show their label **inside the slot** and show **no standalone + icon**.
6. Judgement has **no fixed empty slots**.
7. Judgement visually holds about 2 compact cards and dynamically overlaps 3+ cards.
8. Status vertically shows:
   - HP
   - hearts
   - Role
9. Status, Equipment and Judgement panels are the **same height**.
10. Status is wider than the current deployed version.
11. All 3 opponents use **portrait/card-shaped panels**.
12. Opponent player info is vertical:
   - HP
   - hearts
   - Hand cards
13. Opponent Equipment uses real card artwork with suit/rank.
14. Hand suit/rank corner is smaller.
15. Play / Skip / End buttons are wider.
16. Existing gameplay rules and semantic actions are unchanged.

---

# Final mobile layout target

At approximately 390px portrait:

```text
┌───────────┬────────────┬─────────────────────────┬──────────────┐
│           │ HP 4/4     │ Weapon Armour +1   -1  │ Judgement    │
│           │ ♥♥♥♥       │ [   ] [   ] [   ] [   ]│ [card][card] │
│   HERO    │ SPY        │                         │              │
│   CARD    ├────────────┴─────────────────────────┴──────────────┤
│           │ HAND                                                │
│ God of War│ [card] [card] [selected] [card] [card]             │
├───────────┴─────────────────────────────────────────────────────┤
│ Your action · Play Phase                           [Play] [End] │
└─────────────────────────────────────────────────────────────────┘
```

Opponent target shape:

```text
┌──────────────┐
│          ⓘ   │
│ Test Player 3│
│ Cao Cao      │
│ HP 5/5       │
│ ♥♥♥♥♥        │
│ Hand cards: 4│
│              │
│ [mini equip] │
└──────────────┘
```

---

# 1. Preserve the current Hero panel

Keep the current Hero panel structure and current skill logic.

Hero panel contains only:
- Hero card
- all Hero skill buttons

Do not place:
- Role
- HP
- equipment
- judgement
- player name

back into the Hero column.

Keep current behaviour:
- Hero card opens `HeroInfoDialog`
- visible skill buttons come from `hero.skills`
- unavailable/passive skills stay visible but disabled
- existing semantic capability/provider state controls enablement
- preserve current Guan Yu / Zhao Yun special behaviour
- do not infer hero legality in React

Do not regress to a generic `Skill` button.

---

# 2. Right-top dock must contain three sibling panels

Current code still conceptually has:

```text
.local-dock-zones
  .local-status-panel
  .local-zone-panel
    .local-equipment-slots
    .local-judgement-stack
```

Change it to:

```text
.local-dock-zones
  .local-status-panel
  .local-equipment-panel
  .local-judgement-panel
```

Suggested JSX:

```tsx
<div className="local-dock-zones">
  <div className="local-status-panel">...</div>
  <div className="local-equipment-panel" aria-label="Equipment">...</div>
  <div className="local-judgement-panel" aria-label="Judgement zone">...</div>
</div>
```

Equipment and Judgement must not share one border.

---

# 3. Top-row panel heights must match

Status, Equipment and Judgement must share one aligned row and equal height.

Suggested mobile height:
- approximately 68–74px

Use a single-row layout with:
```css
align-items: stretch;
```

Do not let Status return to the current ~30px short row while the card panels are taller.

---

# 4. Status panel — wider and vertical

The latest screenshot shows the Status panel is too narrow.

Required content order:

```text
HP 4/4
♥♥♥♥
SPY
```

Suggested width:
```css
--status-panel-width: clamp(72px, 19vw, 92px);
```

This is intentionally wider than the earlier narrow design.

Suggested JSX:

```tsx
<div className="local-status-panel">
  <span className="local-status-hp">HP {hp}/{maxHp}</span>
  <span className="local-status-hearts">{hpDisplay(hp)}</span>
  <strong className="local-status-role">{role}</strong>
</div>
```

Responsive spacing:
```css
.local-status-panel {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: clamp(2px, .8vw, 5px);
}
```

The panel still should not consume spare flex space unnecessarily.

---

# 5. Equipment panel

Create/preserve a distinct `.local-equipment-panel`.

It must have:
- complete border
- dark background
- compact padding
- exactly 4 compact card spaces

Required visual order:
1. Weapon
2. Armour
3. +1 Horse
4. -1 Horse

Important semantic mapping remains:
- `defensiveHorse` = +1 Horse
- `offensiveHorse` = -1 Horse

Presentation order may change; game distance semantics must not.

A safe presentation definition:

```ts
[
  { key: "weapon", label: "Weapon" },
  { key: "armor", label: "Armour" },
  { key: "defensiveHorse", label: "+1 Horse" },
  { key: "offensiveHorse", label: "-1 Horse" },
]
```

---

# 6. Equipment empty slot presentation

Remove the current standalone `+` placeholder.

Empty slot should render the slot name **inside the card-shaped slot**, preferably near the lower portion.

Example:

```text
┌────────┐
│        │
│ Weapon │
└────────┘
```

Suggested JSX:

```tsx
<span
  className="local-zone-empty"
  aria-label={`${slotLabel(key)} empty`}
>
  <span className="local-zone-empty-label">
    {slotLabel(key)}
  </span>
</span>
```

There must be no visible standalone plus icon.

`+1 Horse` text is of course valid.

---

# 7. Occupied Equipment slots

When Equipment is present:
- render the real compact `CardFace`
- do not render the empty-slot label underneath
- keep suit/rank visible
- keep artwork visible

Preserve shared rendering:
```tsx
<CardFace card={card} />
```

Do not regress to plain/text-only Equipment cards.

---

# 8. Compact Equipment/Judgement card sizing

Use one compact card size family for local Equipment and local Judgement.

Suggested:

```css
--zone-card-width: clamp(28px, 7.6vw, 34px);
--zone-card-height: calc(var(--zone-card-width) * 1.5);
--zone-card-gap: clamp(3px, 1vw, 6px);
```

Do not stretch cards using `1fr`.

Equipment panel width should derive from:
```text
4 × zone-card-width
+ 3 × zone-card-gap
+ internal padding
```

---

# 9. Judgement panel must be smaller

Create/preserve a separate `.local-judgement-panel`.

Latest requirement:
- smaller than the current implementation
- sized for approximately **2 compact cards**
- uses the same physical card size as Equipment cards
- same panel height as Status/Equipment

Judgement panel width should derive from:
```text
2 × zone-card-width
+ 1 × zone-card-gap
+ internal padding
```

Do not let Judgement consume unnecessary empty width.

---

# 10. Judgement has no fixed empty slots

When there are zero Judgement cards:
- panel remains empty
- no fake rectangles
- no `+`
- no card backs

Only actual `player.judgementCards` render.

Do not change the data model.

---

# 11. Judgement card spacing must be dynamic

Required:

- 0 cards: empty panel
- 1 card: natural/centred placement
- 2 cards: evenly laid out
- 3+ cards: progressively overlap

Replace current fixed `nth-child` offsets with calculated spacing.

Reuse/extract the same presentation idea used for Hand spacing if useful.

Example helper:

```ts
computeCardStep({
  availableWidth,
  cardWidth,
  cardCount,
  minimumVisibleStep,
})
```

For Judgement:
- 1–2 cards: prefer natural spacing
- 3+ cards: calculated overlap
- minimum visible step around 10–14px is acceptable

Do not alter Judgement rules.

---

# 12. Hand panel remains full width

Keep the Hand panel across the full right side underneath Status + Equipment + Judgement.

Conceptually:

```text
|Hero| Status | Equipment | Judgement |
|Hero|          HAND                 |
```

Keep current `ResizeObserver`/measured spacing.

Do not restore fixed `margin-left: -38px`.

---

# 13. Smaller Hand suit/rank corner

Current Hand suit/rank corner is still too large.

Suggested target:

```css
.local-hand-rail .game-card .corner {
  width: 17px;
  min-height: 23px;
  padding: 1px 1px 4px;
  font-size: 8px;
}

.local-hand-rail .game-card .corner i {
  font-size: 7px;
}
```

Scope to Hand cards only.

---

# 14. Selected Hand card must reveal full card

When one normal Hand card is selected:
- show the full physical card
- keep original horizontal position
- raise upward
- do not reflow neighbours dramatically
- do not increase dock height
- do not show a detached centre preview

Preserve current full-card height behaviour (around 102px).

---

# 15. Selected card must be above all top panels

Selected card may overlap:
- Status
- Equipment
- Judgement

It must paint **above** all of them.

Suggested stacking:

```text
top panels              z-index ~10
normal Hand             z-index ~20
selected card           z-index ~60–80
Action panel            z-index ~100
```

No top-panel border/background may visually cut across the selected card.

Also review parent stacking contexts so a child z-index is not trapped below the top row.

---

# 16. Selected card info icon

Selected Hand card info icon must:
- appear only when selected
- move together with the selected card
- be horizontally centred
- appear below the card name
- stay inside the card
- not overlap suit/rank

Approved concept:

```text
┌───────────────┐
│5♦             │
│               │
│  Rock Cleave  │
│      ⓘ        │
│               │
└───────────────┘
```

If useful, wrap the physical card + info button in a non-button visual wrapper and transform that wrapper as one unit.

Do not nest a button inside another button.

---

# 17. Selected card visual style

Keep:
- gold border
- optional subtle outer glow

Do not:
- gold-fill the artwork
- tint the full card
- obscure artwork

---

# 18. Action panel remains separate

Keep:
- message left
- action buttons right
- concise labels
- clear separate border
- action row tall enough for touch use

Selected Hand card must never cover this area.

---

# 19. Make Play / Skip / End buttons wider

Latest screenshot requirement: action buttons are still too narrow.

For short actions such as:
- Play
- Skip
- End

target around:

```css
min-width: 78px;
```

For response buttons that need more room:
- approximately 82–90px if required

Do not make them so wide that normal 390px layout wraps unnecessarily.

Keep concise text labels.

---

# 20. Opponent panels must be portrait/card-shaped

Current opponent `.player-square` is too wide/rectangular.

Convert all 3 visible opponents to portrait/card-like proportions.

Suggested mobile direction:

```css
.player-square {
  aspect-ratio: 2 / 3;
  width: clamp(100px, 26vw, 112px);
  height: auto;
}
```

Exact values can be tuned for viewport fit.

Do not move:
- top opponent seat
- left opponent seat
- right opponent seat

Keep target/turn/action/defeated highlighting.

---

# 21. Opponent information layout must be vertical

For every other player, show:

1. player name
2. hero name
3. `HP x/x`
4. hearts
5. `Hand cards: x`

Example:

```text
Test Player 3
Cao Cao
HP 5/5
♥♥♥♥♥
Hand cards: 4
```

Do not use the current condensed:
`♥♥♥ · 5/5 HP · 4 cards`

Use a dedicated vertical layout.

Info button stays at top-right.

---

# 22. Opponent Equipment must show real graphics + suit/rank

Current screenshot shows opponent Equipment as a plain light/text rectangle.

Change it.

For opponent Equipment:
- use real compact card artwork
- show suit/rank corner
- keep card name/art at compact scale
- preserve info button
- preserve `data-equipment-id` animation destination

Prefer reusing shared `CardFace` with a compact variant/scale rather than separate text-only markup.

---

# 23. Opponent Judgement/Equipment must fit inside card shape

If opponent has zone cards:
- keep overall portrait/card shape
- use a compact internal strip/fan near the lower part
- do not let the panel expand indefinitely
- do not hide information

No gameplay changes.

---

# 24. Keep Draw / Discard unchanged

Do not redesign central Draw or Discard piles in this task.

---

# 25. Responsive strategy

At ~390px after the Hero column:

Suggested variables:

```css
--status-panel-width: clamp(72px, 19vw, 92px);
--zone-card-width: clamp(28px, 7.6vw, 34px);
--zone-card-gap: clamp(3px, 1vw, 6px);
--top-panel-gap: 3px;
```

Desired relative sizing:
- Status: wider than current, but still compact
- Equipment: 4 cards
- Judgement: 2 cards

At <=360px:
- shrink Hero slightly if needed
- shrink zone cards toward 28px
- reduce gaps modestly
- keep 4 Equipment positions
- keep 2-card Judgement visual capacity
- keep wider Action buttons usable

Avoid wrapping the top row unless absolutely unavoidable.

---

# 26. CSS ownership

LocalPlayerDock layout styles remain in:
- `app/sequence-overrides.css`

Opponent `.player-square` canonical styles should be updated in:
- `app/globals.css`

Do not create competing duplicate selector blocks.

---

# 27. Focused tests

Update UI/render tests to verify:

- `local-status-panel` exists
- `local-equipment-panel` exists
- `local-judgement-panel` exists
- all three top panels use the same height rule
- Status uses vertical HP/hearts/Role structure
- exactly four Equipment slots render
- no standalone `+` empty-slot placeholder
- visual Equipment order is Weapon / Armour / +1 Horse / -1 Horse
- underlying horse semantics remain unchanged
- Judgement renders no fake empty slots
- Judgement renders all actual cards
- Hand selected card remains same physical card
- selected card stacking is above top panel layer
- Hand suit/rank corner is smaller
- Action buttons use wider minimum width
- opponent card panel uses portrait/card proportions
- opponent info is vertical
- opponent Equipment uses real graphic/card-face rendering

Do not add brittle pixel screenshot assertions.

---

# 28. Required manual UI review

After implementation test at approximately:
- 320px
- 390px
- 430px

Check:

1. empty Equipment / empty Judgement
2. one equipped card
3. all four equipped cards
4. one Judgement card
5. two Judgement cards
6. three+ Judgement cards
7. normal 5–6 card Hand
8. selected full Hand card
9. selected card overlapping top panels
10. response state with wider buttons
11. all three portrait opponents
12. opponent with Equipment
13. opponent Equipment showing real art + suit/rank

---

# 29. Do not change gameplay

No changes to:
- card legality
- target calculation
- distance calculation
- +1 / -1 Horse semantics
- equipment ownership
- judgement rules
- hero skill legality
- role privacy
- response flow
- semantic action API
- timeline/presentation events
- Quick Test perspective
- rescue/Dying
- Negation
- turn state

---

# 30. Validation

Before completion run:

```bash
npm run build
npm test
npm run lint
git diff --check
```

Do not perform the broad test-suite refactor.

Do not start the final graphic/art-skin pass.

---

# Definition of Done

Do not mark complete unless:

- [ ] Hero card + Hero skill buttons remain correct.
- [ ] Status panel is wider than current.
- [ ] Status vertically shows HP → hearts → Role.
- [ ] Status, Equipment and Judgement have equal height.
- [ ] Equipment is its own bordered panel.
- [ ] Equipment has exactly 4 compact slots.
- [ ] Empty Equipment slots show labels inside.
- [ ] Empty Equipment slots show no standalone + icon.
- [ ] Equipment order is Weapon / Armour / +1 Horse / -1 Horse.
- [ ] Horse game semantics remain unchanged.
- [ ] Judgement is its own bordered panel.
- [ ] Judgement panel is smaller and sized for ~2 compact cards.
- [ ] Judgement has no fake/fixed empty slots.
- [ ] 3+ Judgement cards dynamically overlap.
- [ ] Equipment and Judgement use the same compact card dimensions.
- [ ] Hand suit/rank corner is smaller.
- [ ] Hand measured/dynamic distribution still works.
- [ ] Selected Hand card shows the full card.
- [ ] Selected card stays at original x-position.
- [ ] Selected card paints above all top panels.
- [ ] Selected card artwork remains visible with border-only highlight.
- [ ] Selected info icon is centred below the card name.
- [ ] Selected card cannot cover the Action panel.
- [ ] Play / Skip / End style buttons are wider.
- [ ] All 3 opponent panels are portrait/card-shaped.
- [ ] Opponent info is vertical.
- [ ] Opponent info includes HP x/x, hearts, Hand cards: x.
- [ ] Opponent Equipment shows real artwork + suit/rank.
- [ ] Draw/Discard remain unchanged.
- [ ] No gameplay behaviour changes.
