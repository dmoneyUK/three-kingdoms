# Opponent Hero Artwork Fix Task

Repository: `dmoneyUK/three-kingdoms`

## Goal

Fix hero artwork in the three opponent/player panels on the game table.

The deployed mobile UI currently shows:

- Zhang Fei as the initials fallback `ZF`
- Zhen Ji as the initials fallback `ZJ`
- Sima Yi artwork as a shallow horizontal crop rather than a useful hero portrait

This is a UI/art-integration bug only. Do not change gameplay behaviour.

---

## Current root causes

### 1. Implemented heroes are missing from the shared artwork map

In `app/page.tsx`, `HERO_ART_BY_ID` currently maps only:

- `cao-cao`
- `liu-bei`
- `sun-quan`
- `simayi`
- `xiahou-dun`
- `zhang-liao`

`HeroPortrait` intentionally falls back to hero initials when a hero has no mapped asset.

The screenshot therefore shows `ZF` for Zhang Fei and `ZJ` for Zhen Ji.

The `public/` directory currently contains hero artwork only for those same six mapped heroes.

### 2. Opponent portrait CSS is too shallow on mobile

Current opponent portrait styling in `app/globals.css` includes:

```css
.player-square-target .player-square-portrait {
  width: min(100%, 106px);
  height: clamp(44px, 8vw, 92px);
  ...
}
```

At a mobile width around 390px, the calculated portrait height is only about 44px.

That produces the shallow/cropped Sima Yi image visible in the deployed screenshot.

---

# Required work

## Step 1 — Audit implemented heroes against available artwork

Review:

- `game/heroes.ts`
- `IMPLEMENTED_STANDARD_HERO_IDS`
- `HERO_ART_BY_ID` in `app/page.tsx`
- hero image files under `public/`
- `docs/HERO_ART_INTEGRATION_GUIDE.md`

Create a clear list of implemented heroes that are missing hero artwork.

Do not rename stable hero IDs to match filenames.

Important existing exception:

```text
stable hero id: simayi
asset filename: hero-sima-yi.jpg
```

Keep stable gameplay IDs unchanged.

---

## Step 2 — Add missing hero artwork wiring

At minimum, the screenshot requires artwork for:

```text
zhang-fei
zhen-ji
```

Expected asset naming:

```text
public/hero-zhang-fei.jpg
public/hero-zhen-ji.jpg
```

Expected mapping additions:

```ts
"zhang-fei": "/hero-zhang-fei.jpg",
"zhen-ji": "/hero-zhen-ji.jpg",
```

However, do not fix only these two heroes.

Compare the complete `IMPLEMENTED_STANDARD_HERO_IDS` set against `HERO_ART_BY_ID` and make the artwork integration complete for all implemented/selectable Standard heroes where approved artwork is available.

Use the project's established hero-art workflow and naming convention.

Reference:
https://wtkgames.com/generalCard/

Do not ship third-party/official artwork unless it is permitted for this project. Follow the existing project art/licensing rules in `AGENTS.md` and `docs/HERO_ART_INTEGRATION_GUIDE.md`.

Keep the initials fallback for genuinely missing artwork so the UI remains safe.

---

## Step 3 — Keep HeroPortrait as the single shared renderer

Do not create opponent-specific artwork logic.

The existing architecture intentionally uses:

```tsx
<HeroPortrait hero={playerHero} />
```

for opponent cards.

Preserve this.

The same hero ID should resolve to the same artwork across:

- hero selection
- locked-in hero view
- local player dock
- opponent/player panels

Do not duplicate `HERO_ART_BY_ID`.

---

## Step 4 — Fix opponent portrait proportions

The opponent card itself should remain portrait/card-shaped.

Fix only the hero artwork region so it is no longer a shallow horizontal strip.

Current bad mobile result:

```text
approximately 90–100px wide
approximately 44px high
```

Target around a 390px portrait viewport:

- use almost the full inner width of the opponent card
- use a useful hero-image height around 65–78px
- keep a consistent ratio across all opponent seats
- preserve enough room underneath for player information

Prefer an aspect-ratio driven solution rather than `height: clamp(44px, 8vw, 92px)`.

Suggested direction:

```css
.player-square-target .player-square-portrait {
  width: 100%;
  aspect-ratio: 4 / 3;
  height: auto;
  flex: 0 0 auto;
  overflow: hidden;
}

.player-square-target .player-square-portrait .hero-art-image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center top;
}
```

Tune the exact ratio after checking the actual assets.

Do not distort artwork.

---

## Step 5 — Keep opponent information readable

After fixing the portrait, every opponent panel must still show vertically:

1. player name
2. hero name
3. `HP x/x`
4. heart icons
5. `Hand cards: x`

Keep the info button at the top-right.

Do not allow the portrait to overlap:

- player name
- hero name
- HP
- hearts
- hand count
- equipment/judgement zone
- info button

Keep existing target, turn, action and defeated highlighting.

---

## Step 6 — Make fallback use the same portrait area

If a hero genuinely has no available artwork:

- keep the initials fallback
- keep it inside the exact same portrait region
- do not change the opponent panel geometry
- centre the initials cleanly

A missing asset must not collapse or reshape the player panel.

---

## Step 7 — Add focused regression tests

Update/add focused UI/render tests covering:

1. mapped hero artwork renders `.hero-art-image`
2. Zhang Fei renders artwork instead of `.hero-art-fallback` once mapped
3. Zhen Ji renders artwork instead of `.hero-art-fallback` once mapped
4. an intentionally unmapped hero still renders the fallback safely
5. opponent rendering still uses the shared `HeroPortrait`
6. opponent portrait CSS no longer uses the shallow mobile rule:
   `height: clamp(44px, 8vw, 92px)`
7. opponent portrait geometry remains consistent across all seats

If the implemented roster is expected to have complete artwork, add a consistency test that verifies every `IMPLEMENTED_STANDARD_HERO_IDS` entry has an artwork mapping.

Do not add brittle screenshot/pixel assertions.

---

## Step 8 — Manual mobile review

Verify approximately:

- 320px
- 390px
- 430px

At minimum test these heroes:

- Zhang Fei
- Zhen Ji
- Sima Yi
- Cao Cao

At ~390px verify:

- Zhang Fei does not show `ZF` when artwork exists
- Zhen Ji does not show `ZJ` when artwork exists
- Sima Yi is no longer rendered as a thin horizontal strip
- all three opponent seats use the same portrait area
- hero artwork is not distorted
- useful face/upper-body content remains visible
- player information remains readable
- the info button does not overlap important artwork/text
- the opponent card remains portrait/card-shaped
- no equipment/judgement layout regression

---

## Do not change gameplay

Do not change:

- hero skills
- hero selection legality
- HP rules
- target calculation
- distance calculation
- role privacy
- response flow
- equipment semantics
- judgement rules
- turn state
- Quick Test perspective
- semantic action API

This task is presentation/art integration only.

---

## Project bookkeeping

Per `AGENTS.md`, after this bug fix:

- update `README.md` with the current stage / roadmap / next milestone
- update `HANDOVER.md` with implemented state, recent work, known boundaries and recommended next work

Do not claim the task is complete before those project docs match the actual code.

---

## Validation

Before completion run:

```bash
npm run build
npm test
npm run lint
git diff --check
```

Fix any failure caused by this task.

---

# Definition of Done

- [ ] Zhang Fei shows hero artwork when an approved asset is available.
- [ ] Zhen Ji shows hero artwork when an approved asset is available.
- [ ] Sima Yi artwork is no longer a shallow horizontal crop.
- [ ] All three opponent seats use the same hero portrait dimensions.
- [ ] Hero artwork is not distorted.
- [ ] Portrait crop favours useful head/upper-body content.
- [ ] Player name remains visible.
- [ ] Hero name remains visible.
- [ ] HP and hearts remain visible.
- [ ] Hand count remains visible.
- [ ] Info button remains usable.
- [ ] Equipment/judgement presentation does not regress.
- [ ] `HeroPortrait` remains the single shared renderer.
- [ ] Stable hero IDs remain unchanged.
- [ ] Initials fallback still works for genuinely unmapped heroes.
- [ ] Tests cover the regression.
- [ ] `README.md` is updated.
- [ ] `HANDOVER.md` is updated.
- [ ] `npm run build` passes.
- [ ] `npm test` passes.
- [ ] `npm run lint` passes.
- [ ] `git diff --check` passes.
