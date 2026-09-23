# WTK Hero Art Integration Guide

## Purpose

This document tells a coding agent how to add a newly approved hero CG image to the WTK hero-card UI without changing gameplay behavior.

The visual art direction itself lives in `WTK_CG_STYLE_GUIDE.md`. This file is only about repository placement, code wiring, rendering surfaces, and validation.

---

## Current architecture

Hero artwork is intentionally centralized.

In `app/page.tsx`, `HERO_ART_BY_ID` maps stable game hero IDs to static files under `public/`.

```ts
const HERO_ART_BY_ID: Record<string, string> = {
  "cao-cao": "/hero-cao-cao.jpg",
  "liu-bei": "/hero-liu-bei.jpg",
  "sun-quan": "/hero-sun-quan.jpg",
  "simayi": "/hero-sima-yi.jpg",
  "xiahou-dun": "/hero-xiahou-dun.jpg",
  "zhang-liao": "/hero-zhang-liao.jpg",
  "zhang-fei": "/hero-zhang-fei.jpg",
  "zhen-ji": "/hero-zhen-ji.jpg",
};
```

`HeroPortrait` is the shared renderer.

Do **not** separately hard-code artwork into General Selection, the locked-in selection view, the local player dock, or opponent cards. Once a hero is added to `HERO_ART_BY_ID`, all of those surfaces should receive the same art through `HeroPortrait`.

Heroes without a mapped image must keep the initials fallback.

---

## Asset location and naming

Put approved hero portrait files directly under:

```text
public/
```

Use this filename convention:

```text
hero-<stable-hero-id>.jpg
```

Examples:

```text
public/hero-cao-cao.jpg
public/hero-liu-bei.jpg
public/hero-sun-quan.jpg
public/hero-sima-yi.jpg
public/hero-xiahou-dun.jpg
public/hero-zhang-liao.jpg
public/hero-zhang-fei.jpg
public/hero-zhen-ji.jpg
```

Use the actual stable hero ID from `game/heroes.ts` when wiring the mapping.

Important exception already present in the project:

- stable ID: `simayi`
- asset filename: `hero-sima-yi.jpg`

Do not rename a stable gameplay hero ID to match a filename.

---

## Image preparation requirements

Preferred hero-card source:

- portrait orientation
- 2:3 aspect ratio
- JPEG for checked-in final card artwork
- no text
- no logo
- no UI baked into the image
- main character clearly readable when cropped with `object-fit: cover`
- keep important face / eyes / weapon away from extreme edges
- follow `WTK_CG_STYLE_GUIDE.md`

Large source images may be compressed for the web as long as the card-sized result remains visually clean.

When replacing an already-wired hero image and keeping the same filename, normally **do not change UI code**. Replace the asset in `public/`, keep the existing stable ID mapping, and rerun the focused render/build checks.

Do not change game-card art, deck art, or the centre draw pile when adding or replacing a hero portrait.

---

## Step-by-step integration

### Step 1 — verify the hero ID

Read `game/heroes.ts` and confirm the hero's stable ID.

For Zhang Liao the stable ID is:

```text
zhang-liao
```

Never infer the ID only from the English display name.

### Step 2 — check in the image

Example:

```text
public/hero-zhang-liao.jpg
```

The file must be committed to the repository. Do not point production UI at a temporary ChatGPT attachment, external CDN, local filesystem path, or generated-session URL.

### Step 3 — add one shared mapping

Update `HERO_ART_BY_ID` in `app/page.tsx`.

For Zhang Liao:

```ts
const HERO_ART_BY_ID: Record<string, string> = {
  "cao-cao": "/hero-cao-cao.jpg",
  "liu-bei": "/hero-liu-bei.jpg",
  "sun-quan": "/hero-sun-quan.jpg",
  "simayi": "/hero-sima-yi.jpg",
  "xiahou-dun": "/hero-xiahou-dun.jpg",
  "zhang-liao": "/hero-zhang-liao.jpg",
  "zhang-fei": "/hero-zhang-fei.jpg",
  "zhen-ji": "/hero-zhen-ji.jpg",
};
```

Do not add duplicate image logic elsewhere.

### Step 4 — preserve `HeroPortrait`

Keep the shared renderer behavior:

- mapped hero -> `<img className="hero-art-image" ... />`
- unmapped hero -> initials fallback
- artwork remains presentational and `aria-hidden`
- stable `data-hero-art-id` remains available for render tests

Do not change hero rules, HP, skills, selection privacy, targeting, role logic, or room projection as part of an artwork change.

### Step 5 — verify every surface

The same mapping must work through the existing `HeroPortrait` helper in:

1. General Selection candidate card
2. locked-in / waiting selection state
3. local player's hero card
4. opponent hero cards

Do not create per-surface image maps.

### Step 6 — update render coverage

The current hero-art regression coverage is in:

```text
tests/room-safety-render.test.mjs
```

When adding an asset:

- add the new filename to the checked-in asset list
- add focused coverage that confirms the stable hero ID resolves to artwork
- keep the initials fallback covered for heroes without artwork
- do not alter hero-selection candidate counts merely to test artwork

For Zhang Liao, the asset list should include:

```text
hero-zhang-liao.jpg
```

A useful focused assertion is that a rendered Zhang Liao portrait contains:

```text
data-hero-art-id="zhang-liao"
```

or that the shared source mapping contains:

```text
"zhang-liao": "/hero-zhang-liao.jpg"
```

Prefer a real render assertion when practical.

---

## CSS expectations

Hero artwork styling is generic and should normally require no hero-specific CSS.

Existing hero artwork should continue to:

- fill the portrait container
- preserve the card/portrait silhouette
- crop using the shared image rules
- work at mobile sizes
- not change layout dimensions when an image is present

Do not add CSS selectors such as `.zhang-liao-image` unless there is a demonstrated, approved cross-surface requirement.

If a specific source image has poor framing, fix/crop the asset rather than adding one-off CSS positioning.

---

## Presentation-only boundary

Hero artwork integration is presentation-only.

It must not change:

- hero IDs
- hero metadata
- skills
- HP
- faction
- role allocation
- selection rules
- private projections
- board targeting
- card conservation
- turn or response semantics
- deck contents

The centre DECK remains the normal game-card draw pile. Hero artwork is not drawn from that deck.

---

## Validation checklist

Before considering a hero-art integration complete:

- [ ] approved image exists under `public/`
- [ ] filename follows the project convention
- [ ] stable ID confirmed in `game/heroes.ts`
- [ ] exactly one entry added to `HERO_ART_BY_ID`
- [ ] General Selection shows the image
- [ ] locked-in selection state shows the image
- [ ] local hero card shows the image
- [ ] opponent hero card shows the image
- [ ] unmapped heroes still use initials fallback
- [ ] no hero-specific duplicate rendering logic added
- [ ] `tests/room-safety-render.test.mjs` updated
- [ ] focused tests pass
- [ ] build/lint/test release gates remain green

---

## Zhang Liao status — 2026-09-23

WTK artwork is checked in at:

```text
public/hero-zhang-liao.jpg
```

Stable hero ID:

```text
zhang-liao
```

The final checked-in Zhang Liao portrait has now replaced the previous
undecodable asset at the same path. Zhang Fei and Zhen Ji also have original
project portrait assets at their stable-ID paths.

Current approved visual treatment:
- blue/black Wei armour and cloak
- pale blue plume
- face and upper body remain readable at small opponent-card sizes
- no text, logo, or UI baked into the artwork
- portrait 2:3 framing suitable for the shared hero-card crop

The hero is already wired through the existing shared `HERO_ART_BY_ID` / `HeroPortrait` path:

```ts
"zhang-liao": "/hero-zhang-liao.jpg",
```

For future Zhang Liao art revisions, replace `public/hero-zhang-liao.jpg` in place unless the stable hero ID or asset naming convention intentionally changes. Do not redesign the hero-card component for an art-only replacement.
