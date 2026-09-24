# Three Kingdoms project handover

This file contains only unfinished follow-up work. Completed implementation
history has been removed.

## Pending 1 — Current UI follow-up from latest review

Work from current HEAD.

This is a focused UI/presentation task. Do not perform unrelated refactors.

### 1. Fix hand cards leaving large gaps

Observed issue:

After the current player plays/discards/uses some cards, the remaining hand
cards do not always move together. Large empty gaps can remain between cards.

Expected behaviour:

If the hand changes from:

```text
[ A ][ B ][ C ][ D ][ E ]
```

after playing `B`, `C`, and `D`, it must become:

```text
[ A ][ E ]
```

not:

```text
[ A ]                         [ E ]
```

Requirements:

- Remaining hand cards must immediately close gaps after:
  - playing a card
  - responding with a card
  - discarding
  - paying a card cost
  - hero-skill card usage
  - Serpent Spear / other multi-card costs
  - any other authoritative hand removal
- Layout must be recalculated from the current `room.myHand` array.
- Do not preserve removed cards' old horizontal positions.
- Keep the existing physical hand-card size.
- Keep the current Hand panel dimensions unless a separate approved task
  explicitly changes them.
- When there is enough horizontal space, cards should sit next to each other
  naturally.
- When there is not enough horizontal space, retain controlled
  overlap/compression.
- Do not pin the first and last cards to opposite edges when only a few cards
  remain.

Inspect:

- `handCardLayout`
- `handRailWidth`
- any inline margin/transform positioning
- `.local-hand-rail`
- `.card-slot`
- React keys and stale derived layout state after `room.myHand` changes

Make sure layout recalculates when either the hand count or actual hand card
IDs/order changes.

Regression expectations:

- 1 card -> natural packed position
- 2 cards -> adjacent natural packing
- 3 cards -> adjacent natural packing
- large hands -> controlled overlap/compression
- removing middle cards -> immediate repack

### 2. Move opponent Equipment below the hero image

Opponent Equipment must no longer sit inside/on top of the opponent hero image.

Desired structure:

```text
┌──────────────┐
│              │
│  HERO CARD   │
│              │
└──────────────┘
[Weapon][Armour][+1][-1]
```

Requirements:

- Equipment must not cover the hero portrait.
- Equipment must not cover hero name, HP, hearts, hand-card count, or info
  controls.
- Keep the four logical slots:
  - Weapon
  - Armour
  - +1 Horse
  - -1 Horse
- Existing equipment-card inspection/info interaction must continue to work.
- Empty slots may remain visible if consistent with the current visual language.
- Keep the opponent hero card approximately the same size.
- Do not significantly move opponent seat positions around the board.
- Extend the Equipment row below the hero image instead of overlaying it.

Apply consistently to every opponent seat.

### 3. Give opponent Judgement cards a distinct separate position

Judgement must not sit inside the opponent hero image and must not look like
another Equipment slot.

Preferred conceptual arrangement:

```text
┌──────────────┐     [Judgement]
│              │
│  HERO CARD   │
│              │
└──────────────┘
[Weapon][Armour][+1][-1]
```

Judgement can sit slightly to the side of the hero image. Use the side that
fits naturally for each opponent position.

Requirements:

- Judgement cards remain clearly associated with the correct player.
- Judgement must not overlap the hero portrait.
- Judgement must not overlap Equipment.
- Judgement must remain visible and readable.
- Multiple Judgement cards must use controlled overlap/stacking.
- Existing card info interaction must remain available.
- Existing delayed-card/Judgement destination anchors must remain valid.
- Do not break Judgement flight/settlement animations.
- Keep Judgement visually distinct from Equipment.

### 4. Current player hero overlay order

For the current-player hero card, use this information order:

```text
Hero Name
ROLE
HP current/max
Hearts
```

Examples:

```text
GUAN YU
REBEL
HP 3/4
♥♥♥
```

```text
CAO CAO
LORD
HP 5/5
♥♥♥♥♥
```

Requirements:

- Keep all of this information on the current-player hero image.
- Hero name first.
- Role directly under hero name.
- HP text below the role.
- Hearts below the HP text.
- Role may remain visually prominent.
- Preserve the normal hero-card ratio.
- Keep `aspect-ratio: 2 / 3` and `height: auto`.
- Do not stretch the hero image.

Inspect:

- `.local-hero-overlay`
- `.local-hero-label`
- `.local-hero-role`
- `.local-hero-hp`
- `.local-hero-hearts`
- `.local-hero-vitals`

Prefer clean JSX/CSS ordering rather than absolute-position hacks.

### 5. Fix current-player Lord heart count

Observed bug:

For a Lord such as Cao Cao, the current-player panel can show:

```text
HP 5/5
```

but display only four hearts.

It must show five hearts:

```text
♥♥♥♥♥
```

Requirements:

- Hearts must represent current HP.
- Never cap visible hearts at 4.
- Use authoritative `player.hp` / `player.maxHp`.
- Do not incorrectly fall back to the hero's printed/base HP when the Lord has
  +1 max HP.
- Inspect the heart-rendering helper, likely `hpDisplay(...)`.
- Also inspect CSS so a fifth heart is not hidden by clipping, overflow,
  fixed width, wrapping, or spacing.
- If five hearts are tight, reduce spacing/font size slightly rather than
  hiding the fifth heart.

Regression expectations:

- local Lord 5/5 -> 5 hearts
- local Lord 4/5 -> 4 hearts
- local Lord 1/5 -> 1 heart
- local non-Lord 4/4 -> 4 hearts
- local hero at 3 HP -> 3 hearts

## Pending 2 — Hero skill / response UI architecture regressions

The recent Hero Skills panel and contextual response changes remain relevant.

This is a global Hero Skill UI rule, not a Zhen Ji-only fix.

For all heroes:

- If a hero skill is currently legally usable, its Hero Skills button must
  enable from the canonical projected capability.
- Clicking an active/optional hero skill enters/selects that interaction mode.
- Any required card/target/choice is then selected in the normal hand/board UI.
- For contextual hero-response decisions, the bottom row uses the generic
  `Confirm` / `Skip` completion flow.
- Do not duplicate the same hero skill as another activation button in the
  bottom row.
- Passive skills remain visible but non-interactive unless they genuinely
  require a player decision.
- Trigger skills enable only in their legal trigger window.
- Play Phase bottom controls remain `Play` / `End`.
- Physical response cards are selected directly from hand.
- Non-hero/equipment response providers may retain a dedicated activation
  control where their capability genuinely requires one.

Keep representative regression coverage for:

- at least one response skill
- at least one trigger skill
- at least one Play Phase skill
- at least one passive skill

Existing coverage should remain intact for cases such as:

- Zhen Ji — Empress Dowager
- Guan Yu — God of War
- Zhao Yun — Braveheart
- Cao Cao — Entourage
- Liu Bei — Influencing
- Zhen Ji — Godess of Luo River trigger

## Pending 3 — Responsive verification

Review approximately:

- 320px
- 390px
- 393px
- 402px
- 430px

Verify:

### Hand

- 2 remaining cards sit together
- 3 remaining cards sit together
- large hands still compress correctly
- removing a middle card causes immediate repacking
- no horizontal page overflow

### Opponents

- Equipment is below the hero image
- Judgement is separate and slightly offset to the side
- Equipment/Judgement do not cover the portrait
- hero name, HP, hand-card count, and info controls remain readable
- opponent seat positions remain sensible
- inspection overlay remains bounded to the battlefield
- target selection still takes priority over inspection
- closing inspection leaves no stale hitbox

### Current player

- Hero info order is Name -> Role -> HP -> Hearts
- role is directly under the hero name
- hero card remains 2:3 and not stretched
- Lord at 5/5 visibly shows 5 hearts
- remaining hand cards repack with no large dead gaps

### Response UI

- contextual hero-response footer uses `Confirm` / `Skip`
- hero-skill activation is not duplicated in the bottom row
- Play Phase still shows `Play` / `End`

## Tests to add/update

Add focused regression coverage for:

### Hand layout

- card-count reduction recalculates layout
- removing middle cards repacks remaining cards
- two remaining cards do not keep large empty gaps
- physical hand-card size remains unchanged

### Current hero overlay

- role appears directly after hero name
- HP uses authoritative current/max HP
- five-current-HP produces five visible hearts

### Opponent zones

- Equipment renders outside/below the opponent hero card
- Judgement renders separately from Equipment
- Equipment/Judgement anchors still exist
- delayed Judgement animation destinations remain valid

### Hero-skill response architecture

- representative response / trigger / Play Phase / passive coverage remains
  intact
- contextual hero-response footer uses generic `Confirm` / `Skip`
- skill availability comes from canonical projected capabilities

Prefer behavioural assertions where practical rather than relying only on
source-regex checks.

## Final validation

Before considering the remaining handover work complete, run:

```bash
npm run build
npm test
npm run lint
git diff --check
```

All four must pass.

## Completion report

Report:

1. root cause of the hand-card gap issue
2. exact hand-layout fix
3. files changed
4. opponent Equipment layout change
5. opponent Judgement layout change
6. current-player hero-overlay ordering change
7. root cause of the missing fifth heart
8. exact HP/hearts fix
9. build result
10. test result
11. lint result
12. `git diff --check` result
13. any remaining responsive/layout issue

## Scope guard

Do not make unrelated refactors.

Do not change:

- gameplay rules
- card legality
- target legality
- distance calculation
- equipment semantics
- judgement rules
- delayed Stratagem rules
- hero skill legality
- response flow semantics
- role privacy
- semantic action API
- Draw / Discard mechanics
- opponent hand privacy
