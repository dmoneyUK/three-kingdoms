# WTK — Local Current Player Panel Resize / Re-layout Task

## Goal

Refine **only the local/current player's bottom panel** in the mobile game UI.

Base the work on the current implementation in:

- `app/page.tsx`
- `app/sequence-overrides.css`
- `tests/room-safety-render.test.mjs`

Do **not** redesign opponent panels, the board, draw pile, discard pile, or gameplay behaviour.

---

## Current production implementation

The current mobile dock (`<=480px`) is approximately:

```css
.local-player-dock {
  --hand-panel-height: 72px;
  --hand-peek-height: 56px;
  --hand-card-height: 102px;

  grid-template-columns: 64px minmax(0, 1fr);
  grid-template-rows: auto var(--hand-panel-height) 40px;
}

.local-hero-card {
  width: 52px;
  height: 78px;
  aspect-ratio: 2 / 3;
}
```

The right top row currently contains:

```text
Status | Equipment | Judgement | unused remaining row space
```

The local hero column currently contains:

```text
Hero image
Hero skill buttons
```

The requested change moves the skills out of the hero column and into the right-side top row.

---

# Target layout

At approximately 390px mobile width:

```text
┌──────────────┬──────────────────────────────────────────────────────────┐
│              │ SKILLS (fills remaining space) │ EQUIPMENT │ JUDGEMENT │
│              │ Treachery                      │ Weapon    │           │
│ HERO CARD    │ Entourage                      │ Armour    │           │
│              │                                │ +1 Horse  │           │
│ HP / hearts  │                                │ -1 Horse  │           │
│ ROLE         ├──────────────────────────────────────────────────────────┤
│ hero name    │ HAND — 50% taller than current production              │
│              │ cards still use their existing physical size            │
├──────────────┴──────────────────────────────────────────────────────────┤
│ Your action · Play Phase                            PLAY         END    │
└─────────────────────────────────────────────────────────────────────────┘
```

Important:

- Judgement ends at the **far-right edge** of the row.
- Equipment sits **directly to the left of Judgement**.
- Skills consume **all remaining width** between the hero column and Equipment.
- There must be **no unused empty strip to the right of Judgement**.

---

# Step 1 — Make local hero column 10% wider

Current mobile local dock column:

```css
64px
```

Target approximately:

```css
70px
```

Suggested mobile rule:

```css
@media (max-width: 480px) {
  .local-player-dock {
    grid-template-columns: 70px minmax(0, 1fr);
  }
}
```

This applies **only** to the local/current player dock.

Do not change:

- `.player-square`
- opponent hero cards
- opponent widths
- board seat geometry

---

# Step 2 — Make hero image fill the hero column, but preserve normal card ratio

The local hero card must use the available width of `.local-dock-identity`.

It must **not stretch vertically**.

The hero card should preserve the same normal card aspect ratio already used by the game:

```css
aspect-ratio: 2 / 3;
```

Recommended approach:

```css
@media (max-width: 480px) {
  .local-dock-identity {
    align-items: stretch;
    padding: 3px;
  }

  .local-hero-card {
    width: 100%;
    height: auto;
    aspect-ratio: 2 / 3;
    flex: 0 0 auto;
  }
}
```

With a 70px column and 3px padding on each side, the hero card will be about:

```text
64px wide
96px tall
```

This is intentionally much shorter than the previous preview.

Do **not** use a fixed tall height that distorts the card.

---

# Step 3 — Move HP, hearts and Role into the hero image

Currently the local status panel renders:

```tsx
HP
hearts
Role
```

Remove those from `.local-status-panel`.

Render them as an overlay inside `.local-hero-card` / `.local-hero-portrait`.

Suggested structure:

```tsx
<button className="local-hero-card">
  <span className="local-hero-portrait">
    <HeroPortrait hero={hero} />

    <span className="local-hero-vitals">
      <span className="local-hero-hp">
        HP {player?.hp ?? 0}/{player?.maxHp ?? 0}
      </span>

      <span className="local-hero-hearts">
        {hpDisplay(player?.hp ?? null)}
      </span>

      <strong className="local-hero-role">
        {player?.role ?? "Role pending"}
      </strong>
    </span>

    <span className="local-hero-label">
      {hero.name}
    </span>
  </span>
</button>
```

Visual order near the bottom of the hero artwork:

```text
HP 5/5
♥♥♥♥♥
LORD
CAO CAO
```

Requirements:

- Keep the hero name on the hero card.
- HP and hearts sit above the role.
- Role text should be noticeably larger / stronger than HP.
- Keep text readable over artwork using a subtle dark gradient or text shadow.
- Do not cover the whole artwork with an opaque panel.

Example styling direction:

```css
.local-hero-vitals {
  position: absolute;
  left: 3px;
  right: 3px;
  bottom: 16px;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.local-hero-role {
  font-size: 11px;
  font-weight: 800;
}

.local-hero-hp,
.local-hero-hearts {
  font-size: 8px;
}
```

Tune exact values visually.

---

# Step 4 — Hero column contains ONLY the hero card

Move hero skill controls out of:

```tsx
.local-dock-identity
```

The local hero column should no longer contain:

```tsx
<div className="local-hero-skill">...</div>
```

After the change:

```text
.local-dock-identity
└── .local-hero-card
```

Do not remove skill functionality.

Only move its presentation.

---

# Step 5 — Re-purpose Status panel as the Hero Skills panel

Keep the existing `.local-status-panel` class if useful to reduce test churn, but its content must now be **hero skills only**.

Remove:

```tsx
<span className="local-status-hp">...</span>
<span className="local-status-hearts">...</span>
<strong className="local-status-role">...</strong>
```

Move the existing hero skill control into this panel:

```tsx
<div className="local-status-panel">
  {heroSkillControl ?? (
    <section className="hero-skills local-hero-skills" aria-label="Hero skills">
      ...
    </section>
  )}
</div>
```

Skills must be laid out vertically:

```text
┌──────────────────┐
│ TREACHERY        │
├──────────────────┤
│ ENTOURAGE        │
└──────────────────┘
```

Use:

```css
.local-status-panel .local-hero-skills {
  display: flex;
  flex-direction: column;
  width: 100%;
}
```

Do not put hero name, HP, hearts, or role in this panel.

---

# Step 6 — Make top panels 15% taller

Current mobile top row is effectively around 50px high because the zone card is ~44px high plus padding.

Target approximately:

```text
58px
```

Introduce a mobile top-panel height variable if helpful:

```css
@media (max-width: 480px) {
  .local-player-dock {
    --top-panel-height: 58px;
  }

  .local-dock-zones {
    height: var(--top-panel-height);
  }

  .local-status-panel,
  .local-equipment-panel,
  .local-judgement-panel {
    height: 100%;
  }
}
```

Important:

- Increase the **panel height**, not the Equipment/Judgement card dimensions.
- Keep existing `--zone-card-width` / `--zone-card-height`.
- Equipment and Judgement cards should remain compact.

---

# Step 7 — Right-side top-row width distribution

Change `.local-dock-zones` from the current fixed Status width to:

```text
Skills = all remaining width
Equipment = natural width
Judgement = fixed ~2-card width at far right
```

Recommended grid:

```css
.local-dock-zones {
  grid-template-columns:
    minmax(0, 1fr)
    max-content
    calc(
      var(--zone-card-width) +
      var(--zone-card-width) +
      var(--zone-card-gap) +
      8px
    );
}
```

The DOM order should remain:

```tsx
<div className="local-status-panel">...</div>
<div className="local-equipment-panel">...</div>
<div className="local-judgement-panel">...</div>
```

This gives:

```text
[ SKILLS — flexible ] [ EQUIPMENT ] [ JUDGEMENT ]
```

Because Judgement is the last grid column, it naturally ends at the right edge.

Do not leave an unused blank strip after Judgement.

---

# Step 8 — Equipment remains immediately left of Judgement

Do not change Equipment semantics.

Keep exactly four slots:

1. Weapon
2. Armour
3. +1 Horse
4. -1 Horse

Keep the current mapping:

```text
defensiveHorse = +1 Horse
offensiveHorse = -1 Horse
```

Do not change card size.

Do not change card rendering.

Do not change equipment legality.

---

# Step 9 — Judgement remains at far right

Judgement should:

- be the final column
- touch the right side of the top row
- retain approximately 2-card visual capacity
- continue dynamic overlap for 3+ cards
- render no fake empty cards

Do not change judgement rules or data.

---

# Step 10 — Increase Hand panel height by 50%, NOT 100%

The earlier "double height" design was too large.

Current production:

```css
--hand-panel-height: 72px;
--hand-peek-height: 56px;
--hand-card-height: 102px;
```

New target:

```css
--hand-panel-height: 108px; /* +50% */
--hand-peek-height: 84px;   /* +50% */
--hand-card-height: 102px;  /* unchanged */
```

Important distinction:

- The **hand area** becomes 50% taller.
- The physical card remains `68 × 102px`.
- Normal cards reveal about `84px` of their existing 102px height.
- Do NOT make every card full-height by default.
- Do NOT scale the actual hand cards larger.

Suggested:

```css
.local-player-dock {
  --hand-panel-height: 108px;
  --hand-peek-height: 84px;
  --hand-card-height: 102px;
}
```

Keep:

- existing dynamic horizontal distribution
- existing `ResizeObserver`
- existing selection logic
- existing full-card selected state
- existing card width

Review `--selected-rise` after the change, but preserve the behaviour:

- selected card reveals fully
- selected card can rise over the top panels
- selected card cannot cover the action bar

---

# Step 11 — Increase bottom message/action row height by 20%

Current mobile:

```css
height: 40px;
min-height: 40px;
```

Target:

```css
height: 48px;
min-height: 48px;
```

Suggested:

```css
@media (max-width: 480px) {
  .local-player-dock {
    grid-template-rows:
      auto
      var(--hand-panel-height)
      48px;
  }

  .local-player-dock .turn-controls {
    height: 48px;
    min-height: 48px;
  }
}
```

Keep:

- message on the left
- action buttons on the right
- existing button widths unless layout requires a minor adjustment
- existing button actions

Do not change action semantics.

---

# Step 12 — Expected mobile dock height

Do **not** make the local dock consume half the screen.

At ~390px width the target is approximately:

```text
Top skills/equipment/judgement row    ~58px
Hand panel                            108px
Action panel                           48px
Gaps/borders/padding                  ~10–15px
------------------------------------------------
Approx total                          ~224–229px
```

The hero column spans the top + hand rows, but does not increase the total dock height beyond those rows.

This should feel noticeably larger than production while still leaving the majority of the screen for the board.

---

# Step 13 — Small screen fallback

At `<=360px`, preserve the design but allow slightly tighter dimensions.

Example:

```css
@media (max-width: 360px) {
  .local-player-dock {
    grid-template-columns: 66px minmax(0, 1fr);
    --hand-panel-height: 102px;
    --hand-peek-height: 80px;
    --top-panel-height: 56px;
  }

  .local-dock-zones {
    gap: 2px;
  }

  .local-equipment-panel,
  .local-judgement-panel {
    padding: 2px;
  }
}
```

Do not collapse the skills into a horizontal row.

Do not move Judgement away from the right edge.

---

# Step 14 — Do not change these areas

Do not modify:

- opponent `.player-square`
- opponent hero image sizing
- opponent HP / hand count
- opponent equipment rendering
- board seat positions
- Draw pile
- Discard pile
- message history panel
- game rules
- card legality
- target legality
- distance calculation
- judgement logic
- equipment logic
- hero skill legality
- response flow
- role privacy
- action API
- animations unless the resize requires a minor positioning correction

---

# Step 15 — Tests to update

`tests/room-safety-render.test.mjs` currently contains assertions for the old layout.

Update assertions that hard-code:

```text
--hand-panel-height: 72px
--hand-peek-height: 56px
mobile grid column: 64px
mobile action row: 40px
Status HP/hearts/role structure
```

New tests should verify:

1. Local hero column is ~10% wider on mobile.
2. `.local-hero-card` preserves `aspect-ratio: 2 / 3`.
3. Hero card uses the available hero-column width.
4. HP/hearts/role render inside the local hero card.
5. Role text has a dedicated larger style.
6. `.local-status-panel` contains hero skills, not HP/hearts/role.
7. Hero skills are vertical.
8. Top row is about 15% taller.
9. `.local-dock-zones` uses:
   - flexible skills column
   - Equipment
   - Judgement as the last/rightmost column.
10. Exactly 4 Equipment slots still render.
11. Judgement still renders actual judgement cards only.
12. `--hand-panel-height` is `108px`.
13. `--hand-peek-height` is `84px`.
14. `--hand-card-height` remains `102px`.
15. Mobile action row is `48px`.
16. Opponent CSS remains unchanged.
17. Draw / Discard remain unchanged.

Do not add brittle screenshot pixel assertions.

---

# Manual visual review

Test around:

- 320px
- 390px
- 430px

At ~390px confirm:

- [ ] hero column is slightly wider than production
- [ ] hero card fills the hero column width
- [ ] hero card keeps normal 2:3 card ratio
- [ ] hero card is not vertically stretched
- [ ] HP and hearts appear over hero artwork
- [ ] Role is larger and clearly readable
- [ ] Hero name remains on hero artwork
- [ ] hero skills are no longer under the hero image
- [ ] hero skills appear vertically in the flexible top-left panel
- [ ] Equipment is directly left of Judgement
- [ ] Judgement reaches the right edge
- [ ] no unused right-side strip remains
- [ ] top row is about 15% taller than production
- [ ] hand panel is 50% taller than production
- [ ] normal hand cards are not full-height / oversized
- [ ] selected hand card still reveals correctly
- [ ] action row is 20% taller than production
- [ ] current player dock does not occupy half the screen
- [ ] opponents are unchanged
- [ ] Deck / Discard are unchanged

---

# Validation

Run:

```bash
npm run build
npm test
npm run lint
git diff --check
```

---

# Definition of Done

The task is complete only when:

- Local hero column is ~10% wider.
- Hero card fills that column while preserving `2 / 3` ratio.
- HP + hearts + role are overlaid on the hero card.
- Role text is larger than HP text.
- Hero skills move into the former Status panel.
- Skills are stacked vertically.
- Status/skills, Equipment and Judgement row is ~15% taller.
- Skills panel consumes all flexible width.
- Equipment is directly left of Judgement.
- Judgement is flush with the right edge.
- Hand area is +50% from production, not doubled.
- Physical hand-card size remains unchanged.
- Bottom message/action row is +20%.
- Opponents / board / Deck / Discard remain unchanged.
- No gameplay logic changes.