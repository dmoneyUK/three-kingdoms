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

Current approved asset set:

```text
public/assets/ui/
  game-board-bg.webp
  game-board-frame.svg
  card-back-bg.webp
  card-frame-gold.svg
  other-player-frame-asymmetric.webp
  other-player-frame-symmetric.webp
  other-player-frame-asymmetric-reference.webp
```

Naming rule: lowercase kebab-case, named by UI function rather than generation prompt.

### Why frames are SVG

The board and card frames are deliberately separate scalable SVG overlays instead of being baked into the background images. This allows:
- crisp rendering at different sizes,
- easier responsive adjustment,
- reuse of the same card frame for front and back,
- independent replacement of artwork and frame,
- no need to generate a separate framed bitmap for every card.

---

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

# 6. Responsive and performance rules

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

# 7. Screens affected in the final integration

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

# 8. Coding-agent constraints

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

# 9. Assets still to be designed

Do not invent missing assets.

Expected future items:
- local-player / bottom panel frame,
- equipment-slot treatment,
- judgement-area treatment,
- deck/discard presentation treatment if needed,
- primary / secondary / destructive button system,
- generic panel frame,
- modal / response-window frame,
- small ornamental separators if needed.

---

# 10. Update protocol

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

# 11. Change log

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

# 12. Final asset-pass instruction

**Do not perform the broad visual rewrite yet.**

Continue staging approved assets and updating this guide. When the user explicitly says the asset set is ready and asks the coding agent to apply it, use this document as the implementation contract and perform one coherent integration pass.
