# Three Kingdoms project handover

This file contains only unfinished follow-up work. Completed implementation
history has been removed.

## Pending 1 — Opponent board unlocked-device visual verification

The opponent-board arc, unclipped Equipment/Judgement zones, and opponent
inspection overlay are implemented and covered by render/regression tests.

The only remaining follow-up is a live visual check on an unlocked device at
approximately:

- 390px
- 393px
- 402px
- 430px

Verify:

- left / top / right opponents remain positioned on the intended responsive arc
- Equipment and Judgement cards are not clipped
- the opponent inspection overlay remains bounded to the battlefield
- target selection still takes priority over inspection
- the inspection layer leaves no stale hitbox after closing
- the local player dock, Draw pile, Discard pile, and center play area remain usable

Do not change code unless this visual review finds a real issue.

## Pending 2 — LocalPlayerDock final regression closure

The LocalPlayerDock layout, 102px hand reveal, responsive Judgement spacing,
and hero response-skill UI are implemented.

Do not redesign them.

### Add the remaining architecture regressions

Update `tests/room-safety-render.test.mjs` with representative coverage for:

1. Play Phase:
   - a legal Play Phase hero skill is available through the Hero Skills panel
   - the normal bottom controls still render `Play` and `End`

2. Passive skill:
   - use a passive hero skill such as Lu Xun — `Modesty`
   - the skill remains visible in the Hero Skills panel
   - it remains disabled when there is no canonical projected decision
   - passive ownership alone must not make the skill interactive

Existing response/trigger coverage should remain intact, including:

- Zhen Ji — Empress Dowager
- Guan Yu — God of War
- Zhao Yun — Braveheart
- Cao Cao — Entourage
- Liu Bei — Influencing
- Zhen Ji — Godess of Luo River trigger

### Response-footer invariant

Keep the current distinction:

- physical response cards are selected directly from hand
- hero response skills are activated from the Hero Skills panel
- hero-skill response activation must not be duplicated in the bottom row
- the hero response footer uses the generic `Confirm` / `Skip` completion flow
- non-hero/equipment response providers may retain a dedicated activation control
  where the capability requires one

Do not change gameplay semantics merely to force equipment providers into the
hero-skill UI pattern.

## Final validation

Before considering the remaining handover work complete, run:

```bash
npm run build
npm test
npm run lint
git diff --check
```

All four must pass.

## Scope guard

Do not make unrelated refactors.

Do not change:

- gameplay rules
- card legality
- target legality
- distance calculation
- equipment semantics
- judgement rules
- hero skill legality
- response flow
- role privacy
- semantic action API
- approved LocalPlayerDock layout
- opponent geometry unless the pending visual check finds a real issue
- Draw / Discard presentation
