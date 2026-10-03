# WTK UI / Layout — Current Task Handoff

## REMOTE HANDOVER RULE
HANDOVER.md contains only the current task and the current execution result. Work only on branch `ux-v2`.

Agent sequence:
1. `git fetch origin`
2. checkout/pull `ux-v2`
3. read this remote HANDOVER and `docs/PLANNER_DEVELOPMENT_WORKFLOW.md`
4. implement only the task below
5. run the required validation
6. append only this task's execution result to HANDOVER
7. commit and push implementation + HANDOVER to `origin/ux-v2`
8. fetch origin and verify the remote HANDOVER contains the result
9. STOP

# NEXT TASK — UX2.0VIS-03A: Make the Desktop Top-Row Interaction Stage a Wide Horizontal Composition

## Objective
Fix one proven desktop layout defect only:

**In 2–4 player top-row mode at 1440x900, the existing Interaction Stage is too tall for the protected central safe zone because its current contents are stacked vertically inside a narrow 620px panel. Convert only the desktop top-row Interaction Stage shell to a wide horizontal composition so the existing Interaction / Negation / Dying content fits completely inside the already-proven safe zone.**

This task is a layout/composition change only. Do not change presentation semantics, copy, gameplay, seat geometry, LocalPlayerDock geometry, or the accepted mobile layout.

## Existing repo facts you must preserve
Current branch already has:
- VIS-01 fixed opponent top-row geometry.
- one `.interaction-safe-zone` wrapper under `.play-table`.
- top-row safe-zone top variables:
  - desktop: `385px`
  - <=650px: `319px`
  - <=480px: `326px`
- strict browser geometry tests for Interaction, Negation and Dying at 1440/650/480.
- 650x900 and 480x900 already PASS for all three states.
- the only known geometry GAP is 1440x900:
  - safe zone height: ~186px;
  - Interaction Stage: ~188.5px;
  - Negation Stage: ~263.6px;
  - Dying Stage: ~261.1px.

Do not move the opponent row or LocalPlayerDock to create more room. Use the top-row design's intended **wide central interaction area**.

## Files expected in scope
Production:
- `app/page.tsx`
- `app/globals.css`

Regression:
- `tests/browser/ui19.spec.mjs` only if a new structural hook assertion is needed.

Do not modify game/server/presentation helper files.

## Required implementation

### 1. Add explicit layout wrappers inside InteractionStage
Keep all existing semantic content and text, but group it into three presentation regions so CSS can compose them horizontally on desktop:

- **hero region**: existing `HeroFocus`
- **event region**: existing Dying handoff and/or Reaction Chain
- **meta region**: existing SOURCE / FOCUS block plus DECISION / RESOLVER / ORIGINAL SCOPE / CONTEXT

A recommended structure is:

```tsx
<section className="interaction-stage" ...>
  <header>...existing header...</header>
  <div className="interaction-stage-body">
    <div className="interaction-stage-hero-region">
      <HeroFocus ... />
    </div>
    <div className="interaction-stage-event-region">
      ...existing dying/reaction sections...
    </div>
    <div className="interaction-stage-meta-region">
      ...existing interaction-stage-focus...
      ...existing interaction-stage-context...
    </div>
  </div>
</section>
```

Equivalent names are acceptable, but the regions must be stable class hooks.

Do not duplicate content. Do not alter the semantic conditions controlling whether Hero Focus, Reaction Chain, Dying, Decision or Resolver appear.

### 2. Desktop top-row only: use width instead of vertical stacking
For top-row mode at desktop width **>650px**:

- allow the Interaction Stage to use substantially more of the safe-zone width than the old 620px cap;
- keep it horizontally centered;
- lay out the three regions horizontally using CSS Grid/Flex;
- Hero region, event region, and meta region must not overlap;
- optional empty event region must not reserve a large useless column;
- the resulting stage height must fit inside the existing safe-zone height without clipping.

Use responsive CSS, not JavaScript measurement.

The design source explicitly defines Top Row Mode as a **wide central interaction area**. This task implements that geometry; it is not a new semantic design.

### 3. Do not enlarge Hero Focus yet
This task changes shell composition only.

Do not change:
- Hero Focus portrait/card dimensions;
- HeroFocus semantic selection;
- hero artwork;
- Reaction Chain content;
- Dying content;
- SOURCE / FOCUS / DECISION copy;
- current font sizes merely to make the test pass.

A later reviewed task will turn Hero Focus into the intended enlarged central hero presentation.

### 4. Preserve mobile/narrow composition
At:
- 650x900
- 480x900

the existing stacked Interaction Stage behavior is already proven to fit.

Therefore:
- keep the existing narrow/mobile reading order;
- do not force the desktop horizontal grid onto <=650px;
- do not change the existing safe-zone top values;
- do not introduce horizontal scrolling;
- do not shrink or hide content.

Wrappers may be shared, but narrow CSS must preserve the current readable stacked behavior.

### 5. Do not change safe-zone/seat/dock geometry
Do not change:
- `--interaction-safe-top` values;
- `.player-board` geometry;
- opponent card size or positions;
- `.play-table` height;
- LocalPlayerDock dimensions/position;
- safe-zone bottom;
- 5–10 player side-column behavior.

The point of this task is to prove the desktop top-row Interaction Stage itself can use the available **width** correctly.

## Existing strict regression is authoritative
The committed VIS-02-FIX1 geometry tests currently fail only the three 1440x900 cases.

Do **not** weaken, skip, invert, annotate-away, or delete those failing assertions.

After the production layout fix, all 9 cases must pass:

- Interaction: 1440 / 650 / 480
- Negation: 1440 / 650 / 480
- Dying: 1440 / 650 / 480

For all cases retain proof of:
- >=6px opponent-to-stage clearance;
- stage fully inside safe zone;
- stage above play-table bottom;
- zero stage/safe-zone overlap with LocalPlayerDock;
- visible local hand and console;
- no horizontal page overflow;
- no clipping/scrolling workaround;
- Reaction Chain and Dying handoff remain inside the visible Stage.

### Additional desktop assertions
At 1440x900, add or retain assertions proving:
- `.interaction-stage-body` (or equivalent wrapper) is a horizontal composition, not the old single stacked column;
- hero/event/meta regions are all inside the Stage;
- visible non-empty regions do not overlap each other.

Do not assert pixel-perfect art direction.

## Forbidden shortcuts
Do not:
- change or remove the strict failing desktop tests;
- increase play-table height;
- reduce LocalPlayerDock height;
- move/shrink opponent seats;
- change safe-zone top/bottom;
- add stage scrolling or clipping;
- use `transform: scale(...)`;
- reduce font or Hero Focus size just to fit;
- hide Reaction Chain, Dying, SOURCE, FOCUS or decision context;
- change semantics or gameplay;
- change <=650px into a different React tree;
- start enlarged Hero Focus work.

## Validation
Run and report actual results for:
- focused `UX2.0VIS-02-FIX1` browser geometry suite — expected **9/9 PASS**;
- any new VIS-03A focused browser assertion;
- `npm run test:browser`;
- `npm run test:fast`;
- `npm run build`;
- `npm run lint`;
- `git diff --check`.

Do not report an unrun command as passed.

Because the branch is currently red from the three intentional desktop geometry failures, this task must restore the browser suite/CI to green.

## Execution result
Append only:
- full implementation SHA;
- files changed;
- final desktop DOM region structure;
- final desktop stage width/grid strategy;
- 1440x900 measured safe-zone and Stage heights for Interaction/Negation/Dying;
- 650/480 regression status;
- focused/full validation results with exact counts;
- any remaining GAP.

Do not declare the task accepted. Reviewer decides after inspecting the commit and tests.

Push, verify remote HANDOVER, then STOP.

## Acceptance
Pass only if the existing semantic content is unchanged, the 1440x900 top-row Stage becomes a genuine wide horizontal composition, all three desktop states fit entirely inside the existing safe zone, all 9 strict geometry cases pass, mobile remains stacked and green, and no seat/dock/gameplay/presentation authority is changed.

## Agent execution result — UX2.0VIS-03A

- Implementation SHA: `4c1ee9db41c1da191549c2a363d60a2d2cd6d8dc`.
- Files changed:
  - `app/page.tsx`
  - `app/globals.css`
  - `tests/browser/ui19.spec.mjs`
- Final DOM regions: the existing Stage header remains unchanged; `.interaction-stage-body` now contains `.interaction-stage-hero-region` (the existing `HeroFocus`), `.interaction-stage-event-region` (the existing conditional Dying handoff and Reaction Chain), and `.interaction-stage-meta-region` (the existing SOURCE / FOCUS and context blocks). Existing semantic conditions and copy were not changed.
- Desktop width/grid strategy: only top-row mode above 650px expands the Stage to `width: min(100%, 1200px)`. The body uses a three-column grid (`minmax(190px, .8fr)`, `minmax(300px, 1.4fr)`, `minmax(280px, 1fr)`) for hero/event/meta. When the event region is empty, CSS `:has(...:empty)` removes that empty region from layout and resolves hero/meta into two columns. No safe-zone, seat, play-table, dock, Hero Focus sizing, content, font, or gameplay/presentation-authority geometry changed.
- 1440x900 measured geometry:
  - Interaction: safe zone `186px`; Stage `122px`.
  - Negation: safe zone `186px`; Stage `122px`.
  - Dying: safe zone `186px`; Stage `122px`.
- Narrow regression status: all three states passed at 650x900 and all three states passed at 480x900; the body remains stacked at widths <=650px.
- Focused validation: `npx playwright test tests/browser/ui19.spec.mjs --grep 'UX2.0VIS-02-FIX1' --config tests/browser/playwright.config.mjs` — **9/9 PASS**. The same cases now also assert a resolved multi-column desktop grid, all three stable region hooks inside the Stage DOM, geometric containment for visible non-empty regions, and zero pairwise region overlap.
- Full validation not run under the project remote-validation workflow: `npm run test:browser`, `npm run test:fast`, `npm run build`, `npm run lint`, and `git diff --check`. GitHub Actions owns those gates; CI status was not inspected or polled.
- Remaining GAP: none observed within the bounded VIS-03A focused geometry scope. Full-suite and CI results remain unverified pending GitHub Actions/user notification.
