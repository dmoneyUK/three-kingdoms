# WTK Coding Agent Task — Balance Opponent Hero Layout Around the Board

## Goal

Adjust the **mobile game-table layout** so that all players are positioned evenly around the board.

The current opponent hero-card redesign is good, but the positioning needs refinement:

- The **top opponent** should remain at the top-centre.
- The **left and right opponents should sit lower than the top opponent**, roughly midway down the upper battlefield.
- The three opponent cards should form a balanced horseshoe/arc around the board.
- The **Deck / Discard** area should sit in the lower-middle of the battlefield, closer to the current/local player.
- Nothing should overlap.
- The current player's bottom panel should remain unchanged.

This is primarily a **layout/CSS task**, not a game-logic task.

---

## Target Visual Structure

For a 4-player mobile game, aim for this composition:

```text
                    ┌───────────────┐
                    │ TOP OPPONENT  │
                    │   HERO CARD   │
                    └───────────────┘


      ┌───────────────┐             ┌───────────────┐
      │ LEFT OPPONENT │             │RIGHT OPPONENT │
      │   HERO CARD   │             │   HERO CARD   │
      └───────────────┘             └───────────────┘


                    ┌──────┐ ┌───────┐
                    │ DECK │ │DISCARD│
                    └──────┘ └───────┘


      ┌───────────────────────────────────────────┐
      │        CURRENT / LOCAL PLAYER UI          │
      │ Hero / HP / Equipment / Hand / Actions   │
      └───────────────────────────────────────────┘
```

The important point is that the three opponents should feel **evenly distributed around the board**, not stacked across the same horizontal band.

---

## Layout Intent

Think of the battlefield as a table with players sitting around it:

- Current/local player = **bottom**
- Opponent 1 = **top**
- Opponent 2 = **left side**
- Opponent 3 = **right side**

The left/right opponents should be vertically positioned **between the top opponent and the current player**.

They should **not** be as high as the top opponent.

They should also **not** be so low that they collide with Deck / Discard or the current-player panel.

The visual result should feel approximately like four seats around a table.

---

## Required Changes

### 1. Keep the top opponent at top-centre

The top opponent should remain horizontally centred.

Keep the existing opponent hero-card design:

- vertical playing-card shape
- hero image
- hero name over the image
- HP over the image
- heart indicators
- large hand-card count
- info button

Do not shrink the card unnecessarily.

---

### 2. Move the left and right opponents DOWN

The previous layout placed the left and right hero cards too high.

Move both side players lower so that they sit naturally around the centre board.

They should be symmetrical:

```text
left opponent Y == right opponent Y
```

They should visually sit around the middle of the available battlefield height.

The left/right cards should be clearly lower than the top card.

---

### 3. Keep left/right spacing symmetrical

The left and right cards should mirror each other horizontally.

For example, conceptually:

```text
left:
  x = near left board edge
  y = side-player row

right:
  x = near right board edge
  y = same side-player row
```

Do not independently tune the left and right cards with unrelated magic numbers.

Use shared layout variables / rules.

---

### 4. Deck / Discard should sit lower

Deck and Discard should remain centred horizontally as a group.

Move the group toward the lower-middle area, closer to the current/local player than to the top opponent.

The piles should have their own clear space.

They must not overlap:

- top opponent
- left opponent
- right opponent
- current-player panel

There should be visible breathing room around them.

---

## Recommended Spatial Relationship

Do not treat these exact values as mandatory pixel coordinates, but this is the intended relationship:

```text
Top opponent:
    horizontal centre
    upper ~10–15% of battlefield

Side opponents:
    left/right edges
    roughly ~30–45% down the battlefield

Deck / Discard:
    horizontal centre
    roughly ~60–70% down the battlefield

Current player:
    fixed bottom UI
```

Prefer percentages, CSS layout variables, `clamp()`, grid/flex positioning, or normalized seat positions over one-off device-specific pixel offsets.

---

## Preferred Implementation Approach

### First inspect the existing implementation

Before changing code, identify:

1. Component that renders the game table.
2. Component that renders non-local/opponent players.
3. CSS/module/styled component controlling player positions.
4. Code that decides each player's seat/position.
5. Code that positions Deck / Discard.
6. Any mobile-specific media queries.

Briefly report what controls the current layout before editing.

---

### Use seat-based positioning

If the code already has concepts such as:

- `top`
- `left`
- `right`
- `bottom`
- seat index
- relative player position

reuse them.

For a 4-player game, the layout should conceptually map to:

```text
seat 0 = current player / bottom
seat 1 = left or right depending on game ordering
seat 2 = top
seat 3 = opposite side
```

Do not duplicate separate opponent-card markup just to position each seat.

Use one reusable opponent card component.

Positioning should be controlled by the surrounding board/table layout.

---

## Suggested CSS Strategy

A robust approach could look conceptually like:

```css
.game-board {
  position: relative;
}

.opponent--top {
  position: absolute;
  left: 50%;
  top: var(--top-player-y);
  transform: translateX(-50%);
}

.opponent--left {
  position: absolute;
  left: var(--side-player-x);
  top: var(--side-player-y);
}

.opponent--right {
  position: absolute;
  right: var(--side-player-x);
  top: var(--side-player-y);
}

.card-piles {
  position: absolute;
  left: 50%;
  top: var(--pile-y);
  transform: translateX(-50%);
}
```

The exact implementation can differ.

The important part is:

```text
top-player-y < side-player-y < pile-y
```

and the positions should come from shared layout rules rather than unrelated hardcoded offsets.

---

## Mobile Responsiveness

Mobile portrait is the priority.

Test at minimum:

- 390px width
- 393px width
- 402px width
- 430px width

Also test common mobile viewport heights.

At every tested size:

- top hero remains fully visible
- left hero remains fully visible
- right hero remains fully visible
- left/right heroes are vertically aligned with each other
- left/right heroes are lower than top hero
- all opponent cards appear evenly arranged around the board
- Deck is fully visible
- Discard is fully visible
- current-player UI is unchanged
- no horizontal overflow
- no accidental page scrolling caused by positioning
- no overlap

Use responsive values such as `clamp()` if appropriate.

---

## Opponent Card Size

Do not solve positioning problems primarily by shrinking cards.

Keep the current card proportions and visual hierarchy.

The opponent cards should still clearly show:

```text
Hero artwork

Hero Name
HP 4/4
♥♥♥♥

Hand cards        4
```

If a very small viewport requires minor scaling, use bounded responsive sizing.

Example concept:

```css
width: clamp(...);
```

Do not make the cards so small that names, HP or hand-card count become difficult to read.

---

## Preserve Interaction / Hit Areas

After moving elements, verify all interaction behaviour.

Opponent cards must still support:

- tapping/clicking the opponent
- selecting an opponent as a card target
- hero info button
- active-player indication
- selectable-target indication
- disabled/non-selectable indication
- dead/eliminated state
- status/effect indicators

Deck / Discard must remain tappable where applicable.

Check `z-index` and the actual element bounds.

A visually moved opponent must not leave an invisible hitbox covering the Deck / Discard area.

---

## Opponent Equipment / Judgement Display

### Problem to fix

The compact opponent panel can currently show Equipment / Judgement cards partially clipped or hidden. In the current mobile view, the right-side player's attached cards are only partly visible.

This makes it difficult to understand the opponent's state.

### Required behaviour

When Equipment or Judgement cards are shown on an opponent panel:

- show the **whole miniature card**
- do not crop the card art
- do not allow one card to cover another
- do not allow the hero artwork/footer to cover the attached cards
- do not hide cards with `overflow: hidden`
- preserve the original game-card aspect ratio
- keep each card recognizable at normal board scale

The compact board representation can be small, but every attached card must be fully visible.

Conceptually:

```text
┌────────────────────┐
│                    │
│      HERO ART      │
│                    │
│     Zhou Yu        │
│      HP 3/3        │
│       ♥♥♥          │
│                    │
│ [EQ] [EQ] [JUDGE]  │  <- complete miniature cards
├────────────────────┤
│ Hand cards      3  │
└────────────────────┘
```

If there are multiple cards, lay them out as a compact row/grid rather than overlapping them.

Use the existing card assets/components where possible. Do not create different fake thumbnails.

### Equipment and Judgement must remain visually distinct

Do not merge the two concepts in game state.

The compact view may place them close together, but the enlarged inspection view described below must clearly separate:

- **Equipment**
- **Judgement Zone**

---

## Tap-to-Zoom Opponent Inspection

Add an opponent inspection interaction.

### User interaction

When the game is **not currently waiting for that tap to select a target**:

1. User taps/clicks an opponent hero card.
2. That opponent enters an enlarged inspection state.
3. Show the opponent's:
   - hero card
   - current HP / hearts
   - Equipment cards
   - Judgement Zone cards
4. The rest of the battlefield remains visible in the background but is visually de-emphasized.
5. User taps/clicks the enlarged opponent again.
6. The UI returns to the normal board layout.

This is a toggle:

```text
normal opponent
      ↓ tap
expanded inspection
      ↓ tap same expanded player
normal opponent
```

Only **one opponent** may be expanded at a time.

If another opponent is tapped while one is expanded, either:
- switch directly to the newly tapped opponent, or
- close the current inspection first

Prefer switching directly if it keeps the implementation simple and predictable.

### Expanded visual structure

The enlarged display should show the hero and attached zones as one inspection group.

Suggested layout:

```text
┌──────────────────────────┐  ┌──────────────────────┐
│                          │  │ Equipment            │
│                          │  │                      │
│        HERO ART          │  │ [full] [full]        │
│                          │  │                      │
│                          │  ├──────────────────────┤
│ Hero Name                │  │ Judgement Zone       │
│ HP 3/3                   │  │                      │
│ ♥♥♥                      │  │ [full] [full]        │
└──────────────────────────┘  └──────────────────────┘
```

On narrower mobile screens, it is acceptable to place the zones underneath the enlarged hero instead:

```text
┌──────────────────────────┐
│       ENLARGED HERO      │
└──────────────────────────┘

Equipment
[card] [card]

Judgement Zone
[card] [card]
```

Choose the layout based on available width. Do not force a side-by-side desktop layout onto a narrow phone.

### Whole cards in expanded mode

In the enlarged inspection state, Equipment and Judgement cards must be shown as **complete cards**, not clipped thumbnails.

Requirements:

- preserve card aspect ratio
- use `object-fit: contain` rather than cropping
- show the card from top edge to bottom edge
- card name/effect art should be readable enough to identify it
- if there are several cards, scale/wrap them rather than overlapping
- do not hide the bottom half of the card behind another container
- do not crop due to parent `overflow`

The purpose of the zoom is to let the player inspect the opponent's visible public cards clearly.

### Expanded hero size

The enlarged hero should be clearly larger than its normal board card.

It must still fit inside the battlefield on a mobile portrait screen.

Use bounded responsive sizing, for example with `clamp()` / `min()` / `max()`.

Do **not** allow the expanded hero group to cover the current/local player's hand/action bar unless the available screen is extremely constrained.

Prefer fitting the enlarged inspection into the board/battlefield area above the local player UI.

### Backdrop / focus treatment

When an opponent is expanded:

- keep the rest of the game visible
- optionally darken/blur/de-emphasize the board behind the inspected player
- do not remove game state from the DOM unnecessarily
- ensure the inspected group is above other players and Deck / Discard with a deliberate `z-index`

The overlay/backdrop must not permanently intercept clicks after the zoom is closed.

### Closing the zoom

Primary close behaviour required by the user:

- tapping/clicking the enlarged opponent again closes it

Also acceptable as secondary close methods:

- tapping the dimmed backdrop
- pressing `Escape` on desktop
- an unobtrusive close button

But these are additional conveniences only. The same-player second tap must work.

---

## Important: Do Not Break Target Selection

Opponent hero cards are also game interaction targets.

The zoom interaction must **not** interfere with existing target selection.

Use this priority rule:

```text
IF the game is currently waiting for the player to select an opponent/target:
    preserve the existing target-selection behaviour
    do NOT replace that click with zoom
ELSE:
    tapping the opponent toggles inspection zoom
```

Examples where normal target selection must keep priority:

- Attack target selection
- Steal target selection
- Dismantle / similar targeted cards
- Duel
- hero skills that require choosing another player
- any other existing selection state

Do not change the game's legal-target rules.

If the existing code already exposes something like:

- `isSelectingTarget`
- `pendingAction`
- `selectable`
- `targetMode`
- action/interaction state

reuse it instead of creating duplicate game-state logic.

The UI inspection state should be local/presentation state only.

---

## Info Button Behaviour

Keep the existing circular `i` button.

It must continue to perform its existing hero/info function.

Clicking the `i` button must **not** accidentally trigger:

- opponent zoom
- target selection

Use event propagation handling if needed.

Similarly, clicking an Equipment/Judgement card in the expanded view should not accidentally close the zoom if that card has its own inspect/details behaviour.

---

## Suggested Component / State Design

Prefer a small presentation-state addition such as:

```ts
expandedOpponentId: string | null
```

or equivalent.

Conceptual behaviour:

```ts
function handleOpponentClick(player) {
  if (gameIsSelectingTargetFor(player)) {
    handleExistingTargetSelection(player)
    return
  }

  setExpandedOpponentId(current =>
    current === player.id ? null : player.id
  )
}
```

Do not put this UI-only state into authoritative multiplayer/server game state.

For rendering, prefer reusing the same underlying hero/equipment/judgement data rather than duplicating it.

Possible component structure:

```text
GameBoard
├── OpponentSeat
│   └── OpponentCard
│       ├── HeroSummary
│       ├── CompactEquipmentJudgement
│       └── HandCount
│
└── OpponentInspectionOverlay
    ├── ExpandedHeroCard
    ├── EquipmentZone
    └── JudgementZone
```

Names are illustrative; follow the repository's existing component conventions.

---

## Compact Card Overflow Rules

Inspect all parent containers around opponent attached cards.

Specifically check for CSS such as:

```css
overflow: hidden;
height: ...;
max-height: ...;
transform: ...;
z-index: ...;
```

The current partial-card problem may be caused by clipping from the hero card or its internal image wrapper.

Fix the layout at the correct container level rather than adding arbitrary negative offsets.

The hero artwork itself may still use `overflow: hidden` for rounded corners, but the Equipment/Judgement zone must not live inside a clipping region that cuts off cards.

---

## Responsive Inspection Behaviour

Test the zoom/inspection interaction at minimum at:

- 390px width
- 393px width
- 402px width
- 430px width

At each size verify:

- enlarged hero fits
- all Equipment cards are fully visible
- all Judgement cards are fully visible
- no attached card is half hidden
- no horizontal page overflow
- layout can wrap to a second row if needed
- local player UI remains usable
- closing the inspection restores the exact normal board layout

If many visible cards cannot fit on one row, use wrapping or a contained local scroller for the **card zone only**. Do not create page-level horizontal scrolling.

---

## Do Not Change

Do **not** modify:

- game rules
- turn flow
- attack logic
- response windows
- hero skills
- card effects
- multiplayer/networking
- server state
- Deck behaviour
- Discard behaviour
- current/local player's bottom layout
- equipment behaviour
- hand-card behaviour

This task is strictly about board layout and presentation.

---

## Other Player Counts

Do not break existing layouts for games with player counts other than four.

If the application already supports dynamic player-seat positioning, preserve that behaviour.

If the 4-player mobile layout needs a specific arrangement, implement it cleanly without regressing other supported player counts.

Do not attempt a large unrelated rewrite unless necessary.

---

## Acceptance Criteria

- [ ] Top opponent remains top-centre.
- [ ] Left opponent is positioned lower than the top opponent.
- [ ] Right opponent is positioned lower than the top opponent.
- [ ] Left and right opponents use the same vertical position.
- [ ] Left/right spacing is visually symmetrical.
- [ ] Opponents feel evenly distributed around the battlefield.
- [ ] Deck / Discard sits below the opponent arc.
- [ ] Deck / Discard is closer to the current player than before.
- [ ] No opponent overlaps Deck / Discard.
- [ ] No opponent overlaps the current-player panel.
- [ ] No opponent cards overlap each other.
- [ ] Deck and Discard remain fully visible and usable.
- [ ] Current-player UI remains unchanged.
- [ ] Existing opponent-card visual design remains unchanged.
- [ ] Compact Equipment cards are shown completely, not clipped.
- [ ] Compact Judgement cards are shown completely, not clipped.
- [ ] Multiple attached cards do not cover one another.
- [ ] Tapping an opponent outside target-selection mode enlarges that opponent.
- [ ] Enlarged view shows hero + Equipment + Judgement Zone together.
- [ ] Enlarged Equipment/Judgement cards are complete and clearly inspectable.
- [ ] Tapping the enlarged opponent again returns to normal board size.
- [ ] Only one opponent can be expanded at a time.
- [ ] Existing target-selection clicks still take priority over zoom.
- [ ] Info-button clicks do not accidentally toggle zoom.
- [ ] Closing zoom leaves no invisible backdrop/hitbox over the board.
- [ ] No invisible hitboxes cover another UI element.
- [ ] Layout works at 390–430px mobile widths.
- [ ] Other supported player counts are not regressed.
- [ ] Build passes.
- [ ] Existing tests pass.
- [ ] Lint/type-check passes if configured.

---

## Validation

After implementation:

1. Run the app in a 4-player game.
2. Capture/check a mobile portrait viewport.
3. Verify visually that the four players feel like seats around one board:
   - top opponent
   - left opponent
   - right opponent
   - local player at bottom
4. Verify Deck / Discard sits naturally inside the lower-middle area.
5. Tap all three opponents.
6. Tap all three info buttons.
7. Test target-selection highlighting.
8. Confirm Deck / Discard remains interactive.
9. Resize across the target widths.
10. Run tests/build/lint.
11. Give an opponent at least one Equipment card and confirm the whole miniature card is visible.
12. Give an opponent multiple Equipment/Judgement cards and verify none are clipped or overlapping.
13. Tap an opponent while no target-selection action is active and verify the inspection zoom opens.
14. Confirm the enlarged view shows the hero, Equipment and Judgement Zone clearly.
15. Tap the enlarged opponent again and verify the exact normal layout is restored.
16. Start a targeted card/skill action and confirm tapping the opponent selects the target instead of opening zoom.
17. Verify the opponent info button still performs its original action without toggling zoom.

---

## Final Report Expected From Coding Agent

After the change, report:

### Files changed

List every modified file.

### Existing layout problem

Explain briefly why the old positioning caused the unbalanced layout.

### New layout approach

Explain how the opponent seats and Deck / Discard positions are now calculated.

### Responsive behaviour

List the viewport sizes tested.

### Regression checks

Confirm:

- target selection works
- info buttons work
- compact Equipment/Judgement cards are not clipped
- opponent tap-to-zoom works
- second tap returns to normal scale
- expanded Equipment/Judgement cards are fully visible
- target-selection takes priority over zoom when required
- Deck / Discard interaction works
- current-player UI was not modified
- other player-count layouts were checked
- tests/build/lint status

---

## Core Design Rule

The final layout should visually communicate:

> **Players sit evenly around the game board.**

For a four-player mobile game, the three opponents should form a balanced arc around the upper/side battlefield, while the local player anchors the bottom. Deck and Discard belong inside the board area, below the opponent arc and nearer to the local player.