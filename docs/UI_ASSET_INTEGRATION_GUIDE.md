# WTK UI Asset Integration Guide

Status: **asset staging — do not apply the full visual refresh yet**  
Last updated: **2026-09-23**

This document is the single source of truth for the generated UI assets being prepared for War of the Three Kingdoms. We will keep adding approved assets here. When the user later asks for the final visual integration, review this document and apply the complete set in one coherent pass.

The core rule is:

> Preserve the existing gameplay layout, responsive behavior, game logic, information privacy, and interactions. Upgrade presentation by layering reusable visual assets over the current components.

---

## 1. Global visual direction

The implementation should still look and behave like the current game, not like a replacement UI.

Approved direction:
- dark forest-green / charcoal / black palette,
- Chinese ink-wash, mist and mountain atmosphere,
- restrained antique-gold ornament,
- mysterious rather than faction-specific generic graphics,
- visual detail concentrated at edges and corners,
- quiet central areas where gameplay information appears,
- strong readability for HP, role, suit/rank, card names, actions and response prompts,
- no text baked into generic reusable image assets,
- no identifiable hero/kingdom symbol in generic assets unless a later asset explicitly requires one.

Do **not** use concept/mock-up sheets directly. Only isolated production assets listed in this guide are approved.

---

## 2. Asset directory

All staged UI assets belong under:

`public/assets/ui/`

The asset list is deliberately split into **production**, **reference-only**, and **blocked** groups. Coding agents must not infer status from filenames alone.

### 2.1 Production assets — allowed in runtime UI

```text
public/assets/ui/
  game-board-bg.webp
  game-board-frame.svg
  card-back-bg.webp
  card-frame-gold.svg
  other-player-frame-asymmetric.webp
  other-player-frame-symmetric.webp
  local-player-frame.webp
  button-secondary.svg
```

These are the only assets currently approved for direct runtime use.

### 2.2 Reference-only assets — NEVER import into runtime UI

```text
public/assets/ui/
  other-player-frame-asymmetric-reference.webp
  deck-panel-concept-reference.webp
```

Reference assets exist only to communicate visual intent. They may contain baked text, baked state, a non-transparent background, or proportions unsuitable for direct rendering.

**Hard rule:** no production component may reference a filename containing `-reference`.

### 2.3 Blocked / missing production assets

Do not invent or substitute these:

```text
button-primary            BLOCKED — prior file was an accidental duplicate and has been removed
deck-panel-frame          MISSING — concept reference exists, production frame does not
discard-panel treatment   NOT YET APPROVED
destructive/end button    NOT YET APPROVED
```

Until a blocked asset is supplied:
- keep the existing CSS presentation for that UI element,
- do not reuse another asset merely because it looks similar,
- do not crop a concept/reference image into a substitute,
- do not claim the full visual integration complete.

### 2.4 Naming rule

Use lowercase kebab-case and name assets by UI function rather than generation prompt.

### 2.5 Why frames are SVG when practical

Scalable frames are preferred where the artwork is mostly border/ornament because this gives:
- crisp rendering at different sizes,
- easier responsive adjustment,
- reuse across front/back card surfaces,
- independent replacement of artwork and frame.

### 2.6 Exact runtime integration map

The current game implementation is concentrated in these files:

```text
app/page.tsx
app/globals.css
app/sequence-overrides.css
```

Use the current components/classes rather than creating a parallel UI.

Current integration targets:

```text
Main board
  -> existing .play-table / game-shell play surface

Opponent players
  -> .player-board
  -> .player-square-\${relativeIndex}

Deck / discard
  -> .play-center
  -> .draw-stack
  -> .discard-stack

Local player HUD
  -> LocalPlayerDock
  -> .local-player-dock

Hand cards
  -> .game-card

Visible table / discard / equipment / judgement cards
  -> CardFace
  -> .played-card

Primary action buttons
  -> existing .primary
  -> keep current styling until a valid production primary-button asset exists

Secondary neutral actions
  -> existing neutral/decline controls where semantically appropriate
  -> button-secondary.svg

Destructive / end-turn actions
  -> existing .end
  -> keep current styling until a dedicated asset is approved
```

Do not change game-state logic, response flow, information visibility, or animation anchors as part of asset integration.

---

# 3. Main game board
# 3. Main game board

## 3.1 `game-board-bg.webp`

### Purpose
Primary artwork behind the in-game play surface.

### Visual content
- dark green / black ink texture,
- subtle mist and mountain silhouettes,
- faint central enso / circular brush motif,
- restrained gold flecks,
- a deliberately calm central area.

### Must not contain
- player positions,
- deck/discard slots,
- labels,
- buttons,
- interactive elements,
- outer UI frame.

### Integration intent

Use it as the background of the existing game-board area:

```css
.game-board-background {
  position: absolute;
  inset: 0;
  background: url('/assets/ui/game-board-bg.webp') center / cover no-repeat;
  pointer-events: none;
}
```

A small amount of cropping is acceptable on unusual aspect ratios. Do not stretch the bitmap disproportionately.

---

## 3.2 `game-board-frame.svg`

### Purpose
Decorative antique-gold border overlay for the main game board.

### Visual content
- transparent center,
- thin layered gold border,
- restrained geometric corner ornaments.

### Layering
Render it above the board background but below all gameplay UI.

```tsx
<img
  className="game-board-frame"
  src="/assets/ui/game-board-frame.svg"
  alt=""
  aria-hidden="true"
/>
```

```css
.game-board-frame {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  object-fit: fill;
}
```

If the board becomes extremely narrow or wide, protect the gameplay controls first. Decoration must adapt to the layout, never the other way around.

---

## 3.3 Board layer order

Use this conceptual order:

```text
Game screen base
  ├─ game-board-bg.webp
  ├─ game-board-frame.svg
  └─ existing gameplay UI
       ├─ event/history panel
       ├─ other players
       ├─ deck + discard
       ├─ center-card / judgement presentation
       ├─ local player panel
       ├─ equipment + judgement zones
       ├─ hand cards
       └─ action controls / dialogs
```

Both decorative board layers must use `pointer-events: none`.

---

# 4. Card visual system

The approved card architecture separates **artwork/content** from the **decorative frame**.

This applies to both card backs and card fronts.

The game already owns dynamic information such as:
- suit,
- rank,
- card name,
- card artwork,
- selected / playable / disabled state,
- card interaction behavior.

None of those should become part of the decorative frame asset.

---

## 4.1 `card-back-bg.webp`

### Purpose
Generic face-down / hidden-card artwork.

### Approved design decision
The earlier dragon emblem is **not** used.

The generic card back should feel mysterious without representing one hero, kingdom or card category.

Visual direction:
- dark green / black ink wash,
- subtle circular brush / enso motif,
- mist and shadowy mountain forms,
- small antique-gold flecks,
- no dragon,
- no faction icon,
- no Chinese character,
- no text,
- no outer gold border baked into the artwork.

### Intended usage
Use wherever a physical game card is deliberately shown face-down, including the draw deck and other face-down card presentations.

Do not bake deck count or `DECK` into this image. Those remain live UI.

---

## 4.2 `card-frame-gold.svg`

### Purpose
Reusable transparent gold frame for normal game cards.

### Important design decision
This frame is shared by **card backs and card fronts**.

Do not pre-combine it with artwork.

Conceptual structure:

```text
Card root
  ├─ artwork/content
  │    ├─ card-back-bg.webp                    when face-down
  │    └─ existing front-card artwork/content when face-up
  ├─ card-frame-gold.svg
  └─ live UI
       ├─ suit + rank
       ├─ card name / other dynamic text
       └─ interaction state
```

Example:

```tsx
<div className="game-card">
  <div className="game-card-artwork">
    {/* existing face-up artwork OR card-back-bg.webp */}
  </div>

  <img
    className="game-card-frame"
    src="/assets/ui/card-frame-gold.svg"
    alt=""
    aria-hidden="true"
  />

  <div className="game-card-live-content">
    {/* suit, rank, name, etc. */}
  </div>
</div>
```

The coding agent must adapt this layering idea to the current card component instead of creating a parallel implementation.

---

## 4.3 Front-card compatibility

For face-up cards:
- keep the existing card art and game data,
- overlay `card-frame-gold.svg`,
- do not regenerate every card as a new framed bitmap,
- preserve current card aspect ratio,
- keep suit/rank readable at all card sizes.

This same structure must work for:
- hand cards,
- center-screen cards,
- played cards,
- equipment cards,
- judgement cards,
- discard presentation.

Scaled-down contexts may need a simplified CSS treatment if the decorative corner lines become visually crowded. Do not make suit/rank smaller merely to fit the ornament.

---

## 4.3.1 Current card render paths — BOTH must be handled

The current UI does not have only one visual card path.

```text
Local hand cards
  -> .game-card

Visible table/discard/equipment/judgement cards
  -> CardFace
  -> .played-card
```

The final card skin is incomplete if only `.game-card` is updated.

When applying `card-frame-gold.svg`:
- integrate it with the existing hand-card structure,
- integrate it with `CardFace` / `.played-card`,
- preserve `CardFace` sizing used by discard, equipment and judgement,
- do not break animation classes or settlement/landing calculations in `app/sequence-overrides.css`.

---

## 4.4 Suit/rank priority

The current game renders suit/rank in the upper-left area. Gameplay information has priority over ornament.

When integrating:
- keep spade/club black and heart/diamond red,
- keep sufficient contrast,
- keep the suit/rank layer above decoration if necessary,
- preserve a safe inset from the card edge,
- do not allow a corner ornament to overlap or obscure rank/suit.

---

## 4.5 Card states stay code-driven

Do not bake any of these into the card artwork or frame:
- selected glow,
- playable highlight,
- target highlight,
- disabled dimming,
- hover,
- pressed state,
- error state.

Keep those CSS/state-driven so every card can share the same assets.

---

# 5. Other-player frame variants

Two transparent opponent/player-frame assets are now approved and staged. They are decorative overlays only; all player information remains live UI.

## 5.1 `other-player-frame-asymmetric.webp`

### Purpose
Ornate asymmetric frame for the side opponent positions.

### Visual characteristics
- antique-gold and dark-green styling,
- open transparent center,
- stronger ornament/medallion emphasis toward one upper side,
- decorative lower rail and cloud/mountain elements,
- no player name, HP, hand count, role, equipment text, or hero portrait baked into the asset.

### Intended positioning
Use for the **left and right side opponents** on the main game board.

For the right-side opponent, the coding agent may horizontally mirror the decorative frame with CSS so the visual weight faces inward toward the board center. Mirror **only the decorative image layer**, never the live text, portrait, equipment icons, suit/rank, or controls.

Example concept:

```css
.other-player-frame--right .other-player-frame-art {
  transform: scaleX(-1);
}
```

Do not mirror the actual player panel DOM.

---

## 5.2 `other-player-frame-symmetric.webp`

### Purpose
Symmetrical ornate frame for the top-center opponent position.

### Visual characteristics
- centered circular ornament,
- balanced left/right pillars,
- transparent central content area,
- dark-green / antique-gold styling,
- decorative lower name/stat rail,
- no text or player data baked into the image.

### Intended positioning
Use for the **top-center opponent** so the top opponent does not inherit a left/right directional bias.

---

## 5.3 `other-player-frame-asymmetric-reference.webp`

### Purpose
Exact uploaded reference render of the ornate asymmetric player-frame design.

### Important implementation note
This file is intentionally retained as a **visual reference asset**, not the layer that should be rendered directly in the game.

The uploaded reference has a solid light/white background and therefore is not appropriate as an in-game overlay. If used directly, it would cover the board behind the opponent panel.

When implementing this design, use:
- `other-player-frame-asymmetric.webp` as the production transparent overlay,
- `other-player-frame-asymmetric-reference.webp` only to compare proportions, ornament placement and overall visual intent.

Do not attempt to chroma-key or CSS-blend the white background at runtime.

---

## 5.4 Required live content inside player frames

The frame assets must never replace the real player information.

Keep the current data-driven UI for:
- player name,
- info/details button,
- `HP x/x`,
- heart icons,
- `Hand cards: x`,
- hero/general portrait if currently shown,
- equipment mini-cards,
- judgement mini-cards,
- role/faction information where rules permit,
- active/targetable/selected indicators.

The visual frame is a non-interactive layer around this content.

Suggested structure:

```tsx
<div className="other-player">
  <img
    className="other-player-frame-art"
    src={frameAsset}
    alt=""
    aria-hidden="true"
  />

  <div className="other-player-content">
    {/* existing player UI */}
  </div>
</div>
```

Both frame images must use `pointer-events: none`.

---

## 5.5 Preserve the existing other-player layout

Do **not** rebuild the player card around the artwork's native image proportions.

The existing game layout and touch targets have priority. The coding agent should fit the decorative layer to the existing opponent panel container and tune internal padding so the live information remains readable.

Important:
- do not enlarge opponent panels enough to crowd the deck/discard area,
- do not allow ornament to cover HP/hearts/hand count,
- do not move the info button into the decorative medallion,
- do not embed equipment or judgement cards into the frame artwork,
- do not hide or truncate more player information than the existing UI already does.

If the asset details become visually dense at the smallest mobile size, reduce the decorative layer's visual prominence with CSS rather than removing live player data.

---

## 5.6 Positional mapping

The current implementation renders opponents as `.player-square-\${relativeIndex}` inside `.player-board`.

For a normal four-player table:

```text
.player-square-1 -> left opponent
.player-square-2 -> top opponent
.player-square-3 -> right opponent
```

For the current three-opponent board:

```text
Top-center opponent
  -> other-player-frame-symmetric.webp

Left opponent
  -> other-player-frame-asymmetric.webp

Right opponent
  -> other-player-frame-asymmetric.webp
     mirrored on the decorative image layer only
```

This mapping uses both approved assets while keeping the gameplay component shared.

The same player component should select only the decorative frame variant from seat/layout position. Do not fork game logic or player-state rendering.

---

# 6. Local-player / bottom HUD frame

## 6.1 `local-player-frame.webp`

### Status
**PRODUCTION — approved for runtime use.**

### Purpose
Decorative outer frame for the existing `LocalPlayerDock` / `.local-player-dock`.

The existing bottom HUD structure remains authoritative. The frame is presentation only.

### Existing live regions that must remain code-driven
- hero card and hero info,
- HP / role / status,
- equipment,
- judgement,
- hand cards,
- action / phase text,
- Play / End / response controls.

### Required implementation model

```tsx
<section className="local-player-dock">
  <img
    className="local-player-frame-art"
    src="/assets/ui/local-player-frame.webp"
    alt=""
    aria-hidden="true"
  />

  {/* existing LocalPlayerDock content stays intact */}
</section>
```

Adapt this idea to the current component rather than wrapping it in a second competing dock implementation.

Recommended CSS principles:

```css
.local-player-dock {
  position: relative;
}

.local-player-frame-art {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: fill;
  pointer-events: none;
  z-index: 0;
}
```

Existing interactive/live content must remain above the decorative layer.

### Hard constraints
- do not change the current `LocalPlayerDock` grid just to match the source artwork,
- do not change hand-card interaction or selected-rise behavior,
- do not move equipment/judgement landing anchors,
- do not bake hero/HP/role/equipment/judgement/hand/button content into the frame,
- preserve mobile portrait behavior and current touch targets,
- decoration must never capture pointer events.

---

# 7. Primary button

## 7.1 Status

**BLOCKED — no valid production primary-button asset is currently present.**

The previous `button-primary.webp` was byte-for-byte identical to `local-player-frame.webp`, proving it was an accidental duplicate rather than a valid primary button asset. The invalid file has been removed from the repository.

### Current coding-agent rule

Keep existing `.primary` button styling until a new primary-button asset is explicitly approved.

Do not:
- substitute `local-player-frame.webp`,
- use `button-secondary.svg` as the primary style,
- crop a reference image,
- create a guessed production asset during the integration pass.

When a valid primary asset is later added, the intended semantics remain:
- Play,
- Confirm,
- OK / Continue,
- Use,
- Select.

Text, click handling, disabled state, focus behavior, ARIA semantics and game action dispatch must remain on the real HTML `<button>`.

---

# 8. Secondary button
# 8. Secondary button

## 8.1 `button-secondary.svg`

### Purpose
Production reusable **scalable SVG** visual skin for **secondary / lower-priority actions**. It is the implementation-ready vector version of the approved secondary-button design.

Use it for actions such as:
- Skip,
- Cancel,
- Back,
- Pass,
- Close when Close is not destructive.

The image is decoration only. The application must keep the real semantic `<button>`, live label, event handlers, keyboard support, disabled state, focus behavior and game logic.

### Required implementation model

```tsx
<button className="game-button game-button--secondary">
  <img
    className="game-button-art"
    src="/assets/ui/button-secondary.svg"
    alt=""
    aria-hidden="true"
  />
  <span className="game-button-label">{label}</span>
</button>
```

Reuse the same shared `.game-button`, `.game-button-art`, and `.game-button-label` structure described for the primary button.

### Visual hierarchy

The secondary style must remain visibly quieter than the primary style.

The coding agent may use CSS to reduce prominence, for example:
- slightly lower brightness/saturation,
- weaker glow,
- less pronounced hover lift.

Do not create separate images just for hover, pressed, focus or disabled states.

### Hard rules
- never bake `SKIP`, `CANCEL`, `BACK`, `PASS`, or `CLOSE` into the asset,
- `button-secondary.svg` must use `pointer-events: none`,
- preserve the existing button dimensions and mobile touch target,
- do not enlarge the HUD to preserve every decorative cloud/mountain detail,
- the actual button element retains all accessibility and action behavior,
- do not use this style for the main positive action when a primary action is present,
- do not use this style for destructive / dangerous actions if a dedicated destructive style is later added.

---

# 9. Deck-area concept reference

## 9.1 `deck-panel-concept-reference.webp`

### Purpose
Visual reference for the deck-area composition shown during asset design.

### Status
**REFERENCE ONLY — do not render this file directly in production.**

The concept intentionally demonstrates the desired visual grouping of:
- deck ornament / panel styling,
- a face-down card,
- a deck-count badge,
- live `DECK` labeling.

However, this concept image bakes together several elements that must remain separate in the actual game:
- face-down card artwork,
- the example number `108`,
- the word `DECK`,
- decorative panel artwork.

The coding agent must not hardcode or render those baked values.

### Correct production architecture

The actual deck area should be composed from independent layers:

```text
Deck component
  ├─ future deck-panel-frame production asset
  ├─ face-down card
  │    ├─ card-back-bg.webp
  │    └─ card-frame-gold.svg
  └─ live UI
       ├─ current deck count from game state
       └─ DECK label rendered by code
```

Conceptual implementation:

```tsx
<div className="deck-panel">
  <img
    className="deck-panel-art"
    src="/assets/ui/deck-panel-frame.webp"
    alt=""
    aria-hidden="true"
  />

  <div className="deck-card">
    {/* existing face-down card component using approved card assets */}
  </div>

  <div className="deck-info">
    <strong>{deckCount}</strong>
    <span>DECK</span>
  </div>
</div>
```

### Hard rules
- do not render `deck-panel-concept-reference.webp` in the game,
- do not hardcode `108`,
- do not bake the word `DECK` into a production image,
- do not bake the face-down card into the production deck-panel frame,
- reuse `card-back-bg.webp` and `card-frame-gold.svg`,
- keep the deck count live from game state,
- preserve the current deck position and interaction behavior,
- decorative layers use `pointer-events: none`,
- do not enlarge or reposition the center board merely to match the reference artwork.

### Production asset still required
Create a separate future asset:

```text
public/assets/ui/deck-panel-frame.webp
```

That production frame should contain only the decorative dark-green / antique-gold deck-panel treatment, with no card, no number and no text.

---

# 10. Responsive and performance rules

The game is used on mobile as well as desktop.

Requirements:
- preserve the existing mobile portrait layout,
- introduce no page-level horizontal overflow,
- do not use source image dimensions as component dimensions,
- decorative layers never own hit areas,
- do not animate large background images,
- avoid duplicate image nodes where a single CSS background/overlay is sufficient,
- use the SVG frame assets at their natural scalable resolution,
- keep the WebP artwork assets lightweight.

Do not change gameplay spacing merely to make decoration look perfect. Decoration should accommodate the gameplay layout.

---

# 11. Screens affected in the final integration

The board assets are intended for the actual game screen containing:
- other players,
- deck,
- discard,
- local player area,
- equipment,
- judgement cards,
- hand,
- action controls.

Do not automatically apply the board background/frame to:
- landing/home,
- host/join lobby,
- hero selection,
- end-game screen,
- generic modal backgrounds.

Those may receive dedicated assets later.

The reusable card frame can eventually appear anywhere the standard game-card component appears, after readability is verified at each size.

---

# 12. Coding-agent constraints

When the user eventually asks for the complete asset implementation:

1. **Review the current UI code first.** Extend existing board/card/player components instead of creating a second UI architecture.
2. **Preserve all game logic.** This is a visual integration task unless a later section explicitly says otherwise.
3. **Preserve current responsive layout and interactions.**
4. **Never derive game state from an image.**
5. **Never bake dynamic text into generic visual assets.**
6. **Do not crop one asset to impersonate another component.** Wait for dedicated player/button/panel assets.
7. **All decorative overlays use `pointer-events: none`.**
8. **Decorative images use empty alt text / `aria-hidden`; accessibility stays on the actual control.**
9. **Do not expose hidden information.** Verify Quick Test and normal multiplayer behavior remains unchanged.
10. **Test mobile portrait and desktop widths before completion.**
11. **Avoid one-off styling forks.** The frame/card system should remain reusable.
12. **Do not broadly apply the staged assets until the user explicitly requests the final integration pass.**

---

# 13. Assets still to be designed / resolved

The final visual pass remains blocked on the following decisions/assets:

```text
1. Primary button production asset
   - invalid duplicate removed
   - must be regenerated/re-approved

2. Deck panel production frame
   - deck-panel-concept-reference.webp is reference-only
   - production frame must contain no baked card, count, or DECK text

3. Discard treatment
   - decide whether a dedicated frame is needed or current CardFace treatment is sufficient

4. Destructive / end-turn button treatment
   - current .end CSS remains authoritative until approved

5. Optional suit/status icon refinements
   - only if they improve readability without replacing live game state
```

Do not invent missing production assets during the implementation pass.

---

# 14. Update protocol
# 14. Update protocol

Every approved future asset must update this same file.

For each asset record:
1. exact repository path,
2. purpose,
3. approved visual intent,
4. allowed locations,
5. prohibited uses,
6. layer/z-index relationship,
7. responsive behavior,
8. interaction/accessibility behavior,
9. change-log entry.

Do not create competing implementation-guide files for the same asset set.

---

# 15. Change log

## 2026-09-23 — board foundation

Added:
- `public/assets/ui/game-board-bg.webp`
- `public/assets/ui/game-board-frame.svg`

Decision:
- use separate board artwork and scalable frame overlay.

## 2026-09-23 — player frame variants

Added:
- `public/assets/ui/other-player-frame-asymmetric.webp`
- `public/assets/ui/other-player-frame-symmetric.webp`
- `public/assets/ui/other-player-frame-asymmetric-reference.webp`

Decisions:
- both generated player-frame designs are retained as approved production assets,
- the exact user-uploaded asymmetric render is retained as a reference file only; its white background must not be used as the live overlay,
- use the symmetric variant for the top-center opponent,
- use the asymmetric variant for side opponents,
- horizontally mirror only the asymmetric decorative image for the right-side opponent when needed,
- preserve existing player information, interactions and component logic,
- player name, HP, hearts, hand count, equipment, judgement, info controls and other state remain live UI,
- decorative frames use transparent centers and `pointer-events: none`,
- do not resize the gameplay layout merely to match the source artwork proportions.

## 2026-09-23 — invalid local-player ornate reference removed

Correction:
- `public/assets/ui/local-player-frame-ornate-reference.webp` was discovered to be byte-for-byte identical to `other-player-frame-asymmetric-reference.webp`,
- it was therefore not a trustworthy local-player reference and has been removed,
- do not recreate or substitute it during implementation,
- `local-player-frame.webp` remains the approved production local-player frame.

## 2026-09-23 — production local-player frame

Added:
- `public/assets/ui/local-player-frame.webp`

Decisions:
- this wide transparent asset is the production decorative frame for the local player's bottom HUD,
- render it as a non-interactive overlay around the existing bottom-player UI,
- preserve hero, HP/role, equipment, judgement, hand, phase text and Play/End controls as live UI,
- do not resize or restructure the gameplay layout to match the asset's native dimensions,
- verify mobile portrait and desktop behavior before finalizing the integration.

## 2026-09-23 — invalid primary button removed

Correction:
- `public/assets/ui/button-primary.webp` was discovered to be byte-for-byte identical to `local-player-frame.webp`,
- the duplicate file was removed,
- primary buttons must keep the existing `.primary` CSS until a new production primary-button asset is explicitly approved,
- do not substitute the secondary-button asset or another frame.

## 2026-09-23 — secondary action button

Added:
- `public/assets/ui/button-secondary.svg`

Decisions:
- use this for secondary / lower-priority actions such as Skip, Cancel, Back and Pass,
- keep button labels and behavior live in HTML/React,
- share the same semantic button structure as the primary style,
- keep hover / pressed / focus / disabled states CSS-driven,
- keep secondary actions visually quieter than primary actions,
- use the scalable SVG production asset so the frame stays crisp across mobile and desktop button sizes,
- preserve existing dimensions and touch targets,
- reserve destructive actions for a later dedicated style if required.

## 2026-09-23 — deck-area concept reference

Added:
- `public/assets/ui/deck-panel-concept-reference.webp`

Decisions:
- retain the approved deck-area composition as a visual reference only,
- do not render the reference file in production because it contains a baked face-down card, example count `108`, and `DECK` text,
- production deck UI must reuse the existing face-down card component with `card-back-bg.webp` and `card-frame-gold.svg`,
- deck count and `DECK` remain live UI,
- a dedicated `deck-panel-frame.webp` production asset is still required,
- preserve current deck position, logic and interaction behavior.

## 2026-09-23 — generic card back and reusable card frame

Added:
- `public/assets/ui/card-back-bg.webp`
- `public/assets/ui/card-frame-gold.svg`

Decisions:
- remove the dragon/faction-specific emblem from the generic card back,
- use a mysterious ink / enso / mist / mountain treatment,
- keep card artwork separate from frame,
- reuse the frame for card fronts and backs,
- keep suit/rank and all gameplay information live and above decoration where necessary,
- use SVG for the frame so it remains crisp across card sizes.

---

# 16. Final asset-pass instruction

## 16.1 Execution gate

Do **not** begin the full visual integration while any item in section 2.3 or section 13 is still required for the user's intended final look.

When the user explicitly says the asset set is complete and requests integration, first re-read this guide and verify the production manifest against `public/assets/ui/`.

Reference-only files must never be imported.

## 16.2 Required implementation order

```text
1. Main board background + board frame
2. Opponent decorative frames
3. LocalPlayerDock decorative frame
4. Shared card frame on BOTH .game-card and CardFace/.played-card paths
5. Secondary button skin
6. Newly approved primary/deck/discard/destructive assets, if present
7. Responsive and animation-anchor regression pass
```

## 16.3 Exact code boundaries to preserve

Do not rewrite or fork:
- `LocalPlayerDock`,
- opponent/player state rendering,
- `CardFace`,
- deck/discard state,
- response/trigger flows,
- hidden-information rules,
- card-flight, judgement, equipment or discard animation anchors.

Decoration adapts to these structures.

## 16.4 Final validation checklist

Before declaring the final visual pass complete, verify:

```text
[ ] production manifest matches files in public/assets/ui
[ ] no runtime import contains "-reference"
[ ] no blocked asset was substituted with another asset

[ ] game-board-bg applied
[ ] game-board-frame applied
[ ] left opponent uses asymmetric frame
[ ] top opponent uses symmetric frame
[ ] right opponent uses asymmetric frame, decoration mirrored only if needed
[ ] LocalPlayerDock frame applied without changing its grid

[ ] .game-card path styled
[ ] CardFace/.played-card path styled
[ ] discard CardFace still readable
[ ] equipment mini-card presentations still readable
[ ] judgement presentations still readable
[ ] suit/rank remains readable

[ ] primary buttons remain on existing CSS if no approved primary asset exists
[ ] secondary button asset used only for neutral/secondary semantics
[ ] .end styling remains intact unless a destructive asset is approved

[ ] mobile portrait checked
[ ] desktop checked
[ ] Quick Test checked
[ ] human multiplayer checked
[ ] left/top/right opponents checked
[ ] hand cards checked
[ ] selected/playable/disabled card states checked
[ ] target highlights checked
[ ] deck/discard checked
[ ] response dialogs checked

[ ] no decorative layer captures pointer/touch events
[ ] no hidden information is exposed
[ ] no page-level horizontal overflow introduced
[ ] card/equipment/judgement/discard animation anchors still land correctly

[ ] npm build passes
[ ] full tests pass
[ ] lint passes
[ ] git diff --check passes
```

If a validation fails, fix the visual integration without changing game rules or protocol behavior.

