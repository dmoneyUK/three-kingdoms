# LocalPlayerDock Final UI Refinement Task

## Purpose

This document is the implementation brief for the next **presentation-only** refinement of the War of Three Kingdoms mobile game UI.

Repository: `dmoneyUK/three-kingdoms`

The current implementation already contains the major LocalPlayerDock redesign. **Do not throw it away or rebuild it from scratch.** Refine the current code so the deployed mobile UI matches the final agreed layout and behaviours described below.

The current dock implementation already has:

- narrow Hero column
- one permanent button per `hero.skills` entry
- dynamic enable/disable of hero skill buttons
- a Status panel
- a combined Equipment/Judgement panel
- measured Hand spacing using `ResizeObserver`
- selected hand card rising in its original horizontal position
- a separate Action/message panel
- concise `Play`, `End`, `Skip` labels
- shared `CardFace` artwork for equipment and judgement cards
- LocalPlayerDock layout CSS consolidated in `app/sequence-overrides.css`

The main current implementation is in:

- `app/page.tsx`
- `app/sequence-overrides.css`
- opponent player panel styles are still primarily in `app/globals.css`

Do not perform the parked test-suite refactor in this task.

---

# Non-negotiable visual requirements

This task is not complete unless **all** of the following are true:

1. Selecting a hand card reveals the **full card** in its original horizontal position and raises it above the upper dock panels.
2. Equipment and Judgement are **two separate bordered panels**.
3. Equipment has exactly **4 improved slots**:
   - Weapon
   - Armour
   - +1 Horse
   - -1 Horse
   Empty slots show their label inside the slot and **do not show a + icon**.
4. Judgement has **no fixed empty slots**. It is one dynamic area sized for approximately 2 compact cards:
   - 1 card: natural placement
   - 2 cards: evenly laid out
   - 3+ cards: progressively overlap
5. Status is narrow and vertically shows:
   - HP
   - hearts
   - Role
   It is the **same height as the Equipment and Judgement panels**.
6. All 3 visible opponents use **portrait/card-shaped player panels**.
7. Hand-card rank/suit corner component is visibly **smaller** than the current version.

---

# Final mobile layout

At approximately 390px portrait:

```text
┌───────────┬────────┬───────────────────────┬──────────────┐
│           │ HP 5/5 │ Weapon Armour +1  -1 │ Judgement    │
│           │ ♥♥♥♥♥  │ [   ][   ][   ][   ] │ [card][card] │
│   HERO    │ LORD   │                       │              │
│   CARD    ├────────┴───────────────────────┴──────────────┤
│           │ HAND                                          │
│Treachery  │ [card] [card] [selected] [card] [card]       │
│Entourage  │                                               │
├───────────┴───────────────────────────────────────────────┤
│ Your action · choose a player...                 [Play][End]│
└───────────────────────────────────────────────────────────┘
```

The exact dimensions should respond to viewport width, but this structure must remain.

---

# 1. Preserve the Hero panel

Keep the current Hero panel approach.

It contains only:

- Hero card
- all hero skill buttons

Do **not** put Role, HP, equipment, judgement, or player name back into the Hero panel.

The Hero card remains tappable to open `HeroInfoDialog`.

Keep the current metadata-driven skill solution:

- button count/names come from `hero.skills`
- every skill remains visible
- passive/unavailable skills remain visible but disabled
- existing semantic projected actions determine enablement
- do not infer rule legality in React
- preserve current Guan Yu / Zhao Yun state handling

Do not regress back to a generic `Skill` button.

---

# 2. Restructure the current right-top area

Current JSX is conceptually:

```text
.local-dock-zones
  .local-status-panel
  .local-zone-panel
    .local-zone-strip
      .local-equipment-slots
      .local-judgement-stack
```

Current CSS vertically stacks Status and Zones.

Replace this with three sibling panels in one horizontal row:

```text
.local-dock-zones
  .local-status-panel
  .local-equipment-panel
  .local-judgement-panel
```

Suggested JSX shape:

```tsx
<div className="local-dock-zones">
  <div className="local-status-panel">
    ...
  </div>

  <div className="local-equipment-panel" aria-label="Equipment">
    ...
  </div>

  <div className="local-judgement-panel" aria-label="Judgement zone">
    ...
  </div>
</div>
```

Equipment and Judgement must not share one visual border.

---

# 3. All three top panels must be the same height

Status, Equipment and Judgement must line up cleanly in one row.

Use one row with:

```css
align-items: stretch;
```

Suggested mobile height: approximately 68–74px.

Do not allow Status to be 30px high while Equipment/Judgement are taller.

Explicit requirement:

```text
STATUS HEIGHT == EQUIPMENT HEIGHT == JUDGEMENT HEIGHT
```

---

# 4. Make the Status panel narrow

Status contains only:

```text
HP 5/5
♥♥♥♥♥
LORD
```

Required vertical order:

1. HP
2. hearts
3. Role

Do not use the current horizontal presentation such as `LORD  HP 5/5 ♥♥♥♥♥`.

Suggested width:

```css
--status-panel-width: clamp(56px, 15vw, 68px);
```

Suggested structure:

```tsx
<div className="local-status-panel">
  <span className="local-status-hp">HP {hp}/{maxHp}</span>
  <span className="local-status-hearts">{hpDisplay(hp)}</span>
  <strong className="local-status-role">{role}</strong>
</div>
```

---

# 5. Status typography and spacing must respond to viewport width

Do not hardcode large fixed spacing.

Use `clamp()` or equivalent responsive sizing.

Example direction:

```css
.local-status-panel {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: clamp(2px, .8vw, 5px);
}

.local-status-hp {
  font-size: clamp(7px, 2.1vw, 9px);
}

.local-status-hearts,
.local-status-role {
  font-size: clamp(7px, 2vw, 9px);
}
```

Make sure the panel remains readable at 320px.

---

# 6. Equipment panel must be a separate bordered panel

Create `.local-equipment-panel`.

It must have:

- complete border
- dark panel background
- compact internal padding
- exactly four visual card spaces

Required visual order:

1. Weapon
2. Armour
3. +1 Horse
4. -1 Horse

Important: underlying game semantics remain:

- `defensiveHorse` = +1 Horse
- `offensiveHorse` = -1 Horse

Only presentation order changes if needed.

A safe presentation definition is:

```ts
[
  { key: "weapon", label: "Weapon" },
  { key: "armor", label: "Armour" },
  { key: "defensiveHorse", label: "+1 Horse" },
  { key: "offensiveHorse", label: "-1 Horse" },
]
```

Do not change game distance logic.

---

# 7. Equipment slot labels go inside empty slots

Current empty equipment renders `+`.

Remove that.

An empty slot should show its label **inside the physical card-shaped slot**, preferably toward the lower part.

Examples:

```text
┌────────┐
│        │
│ Weapon │
└────────┘

┌────────┐
│        │
│ Armour │
└────────┘

┌────────┐
│        │
│+1 Horse│
└────────┘

┌────────┐
│        │
│-1 Horse│
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

There must be no visible standalone `+` glyph.

---

# 8. Occupied equipment must replace the placeholder label

Do not layer real equipment on top of the empty-slot label.

For an occupied slot render only the real `CardFace`.

Therefore:

- empty slot: placeholder label
- occupied slot: actual equipment card only

Keep semantic `aria-label` naming on the slot container.

---

# 9. Equipment cards remain compact

Use the same compact responsive card size for both Equipment and Judgement.

Suggested variables:

```css
--zone-card-width: clamp(28px, 7.8vw, 34px);
--zone-card-height: calc(var(--zone-card-width) * 1.5);
--zone-card-gap: clamp(3px, 1.1vw, 6px);
```

Maintain roughly 2:3 aspect ratio.

Do not make equipment as large as hand cards.

---

# 10. Equipment panel has exactly four card spaces

The panel is designed around four compact cards.

Do not use `1fr` sizing that stretches the cards.

Panel width should derive from:

```text
4 × card width
+ 3 × card gap
+ panel padding
```

---

# 11. Judgement is a separate panel

Create `.local-judgement-panel`.

It must have:

- separate complete border
- separate background
- same row height as Status/Equipment
- visual capacity for approximately two compact zone cards

It is **not** a set of named slots.

---

# 12. Judgement panel must have no fake empty slots

When there are zero judgement cards:

- panel stays empty
- no `+`
- no empty card rectangles
- no fake card backs

The panel itself is the reserved area.

---

# 13. Judgement layout is dynamic

Desired behaviour:

- 0 cards: empty
- 1 card: naturally centred/positioned
- 2 cards: evenly laid out across the available area
- 3+ cards: progressively overlap

Do not use the current fixed CSS offsets:

```css
:nth-child(2) { left: 3px; }
:nth-child(3) { left: 6px; }
:nth-child(n + 4) { left: 9px; }
```

Replace with calculated spacing similar to the Hand algorithm.

The data model remains `player.judgementCards`; do not limit the array to 2 cards.

---

# 14. Reuse the hand spacing idea for Judgement

If useful, extract a presentation helper such as:

```ts
computeCardStep({
  availableWidth,
  cardWidth,
  cardCount,
  minimumVisibleStep,
})
```

Judgement rules:

- 1–2 cards: prefer natural/even layout
- 3+ cards: compute overlap
- minimum visible step can be around 10–14px because zone cards are smaller
- if unusually many cards exist, allow controlled overlap/overflow

Do not change Judgement game rules.

---

# 15. Equipment and Judgement must keep real CardFace artwork

Preserve:

```tsx
<CardFace card={card} />
```

Do not regress to:

- plain cream rectangles
- text-only mini cards
- manually recreated card faces

---

# 16. Keep the Hand panel full-width on the right side

Conceptually:

```text
|Hero| Status | Equipment | Judgement |
|Hero|          HAND                 |
```

The Hand panel spans under all three top-right panels.

Do not restrict the Hand width to Equipment width.

---

# 17. Keep current dynamic Hand distribution

Current implementation already measures `handRailWidth` and calculates card spacing.

Keep it.

Do not restore fixed negative overlap such as:

```css
margin-left: -38px;
```

Small hands should spread naturally.
Large hands should overlap only as much as needed.

---

# 18. Shrink the Hand suit/rank corner

Current Hand corner is still approximately:

- width: 21px
- min-height: 29px
- rank font: 10px
- suit font: 9px

Reduce it noticeably.

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

Scope this to Hand cards only.

Do not globally shrink centre-reveal or discard-card markers.

---

# 19. Selected Hand card must show the full card

This is a core requirement.

When one normal Hand card is selected:

- the **full physical card** becomes visible
- it stays at its original horizontal x-position
- it rises upward
- neighbouring cards do not dramatically reflow
- dock height does not grow
- do not show a detached centre preview

Preserve the existing full-card height behaviour, currently around 102px.

---

# 20. Selected card must paint above all top panels

When raised, a selected Hand card may overlap:

- Status
- Equipment
- Judgement

It must render **above** all of them.

No top-panel background or border should cut across the selected card.

Suggested stacking hierarchy:

```text
top panels                z-index ~10
normal hand               z-index ~20
selected hand/card        z-index ~60–80
action panel              z-index ~100
```

The Action panel must still stay above the selected card so the selected card can never cover the bottom controls.

---

# 21. Avoid stacking-context traps

A high z-index on the child is useless if its parent is below another stacking context.

Review:

- `.local-dock-zones`
- `.local-status-panel`
- `.local-equipment-panel`
- `.local-judgement-panel`
- `.local-hand-section`
- `.local-hand`
- `.local-hand-rail`

Avoid accidental stacking contexts caused by unnecessary transforms/opacity.

Recommended model:

```css
.local-dock-zones {
  position: relative;
  z-index: 10;
}

.local-hand-section {
  position: relative;
  z-index: 50;
  overflow: visible;
}

.local-hand,
.local-hand-rail {
  overflow-y: visible;
}

.card-slot.single-selected {
  z-index: 80;
}

.turn-controls {
  z-index: 100;
}
```

Test in actual mobile Safari-size rendering.

---

# 22. Move selected Card and info icon as one visual unit

Current code transforms the card and info button independently.

For robustness, introduce a shared wrapper if practical:

```text
.card-slot
  .hand-card-visual
    button.game-card
    button.card-info-button
```

Then transform `.hand-card-visual` once when selected.

Do not nest one button inside another.

Benefits:

- info icon always travels with selected card
- easier z-index handling
- no duplicated transforms
- easier relative positioning

---

# 23. Selected Hand-card info icon position

The selected card must show its info icon:

- horizontally centred
- beneath the card name
- inside the card
- not bottom-right
- not overlapping rank/suit
- hidden when the card is unselected

Approved visual:

```text
┌───────────────┐
│5♦             │
│               │
│  Rock Cleave  │
│      ⓘ        │
│               │
└───────────────┘
```

Example positioning:

```css
.hand-card-visual {
  position: relative;
}

.hand-card-visual .card-info-button {
  position: absolute;
  left: 50%;
  top: 67%;
  translate: -50% -50%;
  opacity: 0;
  pointer-events: none;
}

.card-slot.single-selected .card-info-button {
  opacity: 1;
  pointer-events: auto;
}
```

Tune `top` visually so it sits just below the card name.

---

# 24. Selected card highlight remains border-only

Keep:

- gold border
- optional subtle outer glow

Do not:

- gold-fill the artwork
- tint the whole card
- obscure card art

The card graphic must remain readable.

---

# 25. Selected card must not cover the Action panel

Keep the existing bottom-gutter geometry.

Even though the selected card rises above top panels, it must remain above the Action boundary.

The Action panel has the highest dock z-index.

Verify at:

- 320px
- 390px
- 430px

---

# 26. Convert all three opponents to portrait/card-shaped panels

Current opponent `.player-square` is still a wide rectangular panel.

Change it to a portrait/card-like shape.

Suggested mobile target:

```css
.player-square {
  aspect-ratio: 2 / 3;
  width: clamp(100px, 26vw, 112px);
  height: auto;
}
```

Exact values can be adjusted for viewport fit.

Keep:

- player name
- hero name
- hearts/HP
- hand count
- info button
- turn highlight
- action highlight
- selected-target highlight
- defeated appearance

Do not move the top/left/right seat positions.

---

# 27. Opponent card content layout

Inside each opponent card:

```text
┌───────────┐
│        ⓘ │
│ Player 3  │
│ Guo Jia   │
│           │
│ ♥♥♥       │
│3/3 · 4    │
│           │
└───────────┘
```

Typography should remain compact enough to fit.

---

# 28. Opponent equipment/judgement must remain visible

Opponent card shape must not break if opponent zone cards exist.

Do not simply let the portrait card grow indefinitely.

If opponent has Equipment/Judgement:

- render compact mini cards in a lower internal strip
- or fan them compactly inside the panel

Do not hide game information.

No game-rule changes.

---

# 29. Keep draw/discard unchanged

Do not redesign:

- draw pile
- discard pile
- deck count
- discard-card rendering

This task is focused on player/dock layout.

---

# 30. Keep current Hero-skill behaviour

Do not rewrite the existing `heroSkillButtons` logic.

Keep:

- `hero.skills` determines visible buttons
- semantic capability IDs determine enablement
- Wusheng/Longdan special state remains intact
- disabled passive skills stay visible

---

# 31. Keep the Action panel

Keep:

- message on left
- buttons on right
- concise Play / End / Skip labels
- wider button hit targets
- separate bordered panel

Do not shrink it back to the older cramped row.

---

# 32. Responsive width strategy

For approximately 390px portrait, after the Hero column:

Suggested variables:

```css
--status-width: clamp(56px, 15vw, 68px);
--zone-card-width: clamp(28px, 7.8vw, 34px);
--zone-card-gap: clamp(3px, 1.1vw, 6px);
--top-panel-gap: 3px;
```

Equipment width derives from:

```text
4 × zone-card-width
+ 3 × zone-card-gap
+ padding
```

Judgement width derives from:

```text
2 × zone-card-width
+ zone-card-gap
+ padding
```

Status should not absorb spare flex width.

---

# 33. <=360px fallback

At 320–360px:

- Hero may shrink slightly
- Status narrows
- Zone cards shrink toward 28px
- gaps shrink modestly
- Equipment still shows four slots
- Judgement still visually supports two cards
- Action buttons remain usable

Do not hide slots.

Avoid wrapping Equipment to another line unless absolutely unavoidable.

---

# 34. CSS ownership

Keep LocalPlayerDock layout rules in:

`app/sequence-overrides.css`

Do not recreate duplicate LocalPlayerDock rules in `app/globals.css`.

For opponent `.player-square`, edit its existing canonical style in `app/globals.css` rather than adding multiple competing override blocks.

Search for duplicate/conflicting selectors before finishing.

---

# 35. Required JSX direction

Current:

```tsx
<div className="local-dock-zones">
  <div className="local-status-panel">...</div>
  <div className="local-zone-panel">
    <div className="local-zone-strip">
      <div className="local-equipment-slots">...</div>
      <div className="local-judgement-stack">...</div>
    </div>
  </div>
</div>
```

Target conceptually:

```tsx
<div className="local-dock-zones">

  <div className="local-status-panel">
    <span className="local-status-hp">
      HP {hp}/{maxHp}
    </span>
    <span className="local-status-hearts">
      {hpDisplay(hp)}
    </span>
    <strong className="local-status-role">
      {role}
    </strong>
  </div>

  <div className="local-equipment-panel" aria-label="Equipment">
    <div className="local-equipment-slots">
      ... four slots ...
    </div>
  </div>

  <div className="local-judgement-panel" aria-label="Judgement zone">
    <div className="local-judgement-cards">
      ... only actual judgement cards ...
    </div>
  </div>

</div>
```

Class names may vary slightly, but the semantic separation must exist.

---

# 36. Focused tests to update

Update the relevant UI/render tests.

Verify:

- three top panels exist:
  - `local-status-panel`
  - `local-equipment-panel`
  - `local-judgement-panel`
- exactly four `local-equipment-slot` elements
- empty equipment slots render the correct label
- no standalone `+` placeholder for empty equipment
- visual order is Weapon / Armour / +1 Horse / -1 Horse
- underlying mapping remains `defensiveHorse = +1`, `offensiveHorse = -1`
- Judgement renders only actual cards
- multiple Judgement cards render
- selected Hand card still uses the same physical `data-hand-card-id`
- selected card wrapper can sit above the top-panel stacking layer
- selected info icon is hidden when unselected
- Hand corner CSS is smaller than the current 21×29px
- opponent player panels use portrait/card proportions

Do not add brittle screenshot-pixel assertions to the Node test suite.

---

# 37. Required browser/UI review

After implementation, test at approximately:

- 320px
- 390px
- 430px

Capture or inspect:

1. empty Equipment / no Judgement
2. one equipped card
3. all four equipment cards
4. one Judgement card
5. two Judgement cards
6. three+ Judgement cards
7. normal 5–6-card Hand
8. selected Hand card
9. selected card overlapping top panels
10. response state
11. card-shaped opponents
12. opponent with Equipment/Judgement if practical

---

# 38. Critical acceptance: selected card

PASS only if:

- full card is visible
- stays at original x-position
- rises upward
- paints above Status
- paints above Equipment
- paints above Judgement
- no panel border/background cuts across it
- artwork remains visible
- selected highlight is border/glow only
- info icon is centred below the card name
- info icon travels with the selected card
- selected card does not cover Action panel

---

# 39. Critical acceptance: top panels

At about 390px:

Status:
- narrow
- same height as Equipment/Judgement
- HP at top
- hearts below HP
- Role below hearts

Equipment:
- separate border
- exactly 4 compact card slots
- empty slots show labels inside
- no plus icons
- label disappears/replaced when actual equipment is present

Judgement:
- separate border
- no fake slots
- panel sized for about 2 zone cards
- 1 card placed naturally
- 2 cards evenly laid
- 3+ cards dynamically overlap

---

# 40. Critical acceptance: Hand

Hand:

- keeps measured responsive distribution
- smaller suit/rank marker
- unselected cards show no info icon
- selected card shows full card
- selected info icon is centred below the card name
- selected card stays in place horizontally

---

# 41. Critical acceptance: opponents

All three opponents:

- portrait/card-shaped
- consistent proportions
- existing seat positions unchanged
- target interactions work
- info buttons work
- player/hero/HP/hand count remains readable
- Equipment/Judgement information remains visible when present

---

# 42. Do not change gameplay

No changes to:

- card legality
- target calculation
- distance calculation
- +1/-1 Horse semantics
- equipment ownership
- judgement rules
- multiple judgement card support
- hero skill legality
- role privacy
- response flow
- semantic action API
- timeline/presentation events
- Quick Test perspective
- Dying/rescue
- Negation
- turn state

---

# 43. Validation

Before completion run:

```bash
npm run build
npm test
npm run lint
git diff --check
```

Do not perform the parked test-suite refactor.

Do not start the final graphic/art skin in this task.

---

# Definition of Done

Do not mark the task complete unless every item below is true:

- [ ] Hero card + all Hero skill buttons remain correct.
- [ ] Status is narrow and vertically shows HP → hearts → Role.
- [ ] Status, Equipment and Judgement panels have equal height.
- [ ] Equipment is a separate bordered panel.
- [ ] Equipment has exactly 4 physical card spaces.
- [ ] Empty Equipment slots contain text labels.
- [ ] Empty Equipment slots contain no plus icon.
- [ ] Visual Equipment order is Weapon, Armour, +1 Horse, -1 Horse.
- [ ] Underlying horse rules remain unchanged.
- [ ] Judgement is a separate bordered panel.
- [ ] Judgement has no fixed empty slots.
- [ ] Judgement area naturally holds approximately 2 cards.
- [ ] More than 2 Judgement cards overlap dynamically.
- [ ] Equipment and Judgement cards use the same compact card dimensions.
- [ ] Hand suit/rank corner is smaller.
- [ ] Hand dynamic distribution remains working.
- [ ] Selecting one Hand card shows its full card.
- [ ] Selected card stays in its original horizontal position.
- [ ] Selected card is above all top panels.
- [ ] No panel border/background covers selected card.
- [ ] Selected card retains visible artwork with border-only highlight.
- [ ] Selected card info icon is centred below its card name.
- [ ] Unselected Hand cards have no visible info icon.
- [ ] Selected card cannot cover the Action panel.
- [ ] All three opponent panels are card-shaped.
- [ ] Opponent targeting/info still works.
- [ ] Draw/discard layout remains unchanged.
- [ ] No gameplay rules changed.
