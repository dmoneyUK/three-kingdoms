# WTK UI / Layout — Current Task Handoff

## REMOTE HANDOVER RULE
Work only on `ux-v2`. Read this file and `docs/PLANNER_DEVELOPMENT_WORKFLOW.md`. Implement only the task below, validate, append this task's execution result, commit/push, verify remote HANDOVER, then STOP. Do not wait for or poll CI.

## Reviewer status — UX2.0VIS-05A ACCEPTED

Reviewed implementation chain:
- topology: `79eda6ea1ee2017a73cd336fbeddbbf7b566b44a`
- containment fix: `91368228a4d436992082a17e67cbccce3281390d`

Accepted facts to preserve:
- 5–10 player rooms now use deterministic LEFT/RIGHT Side Column projection from `projectSideColumnSeat(totalPlayers, relativeIndex)`;
- published 5/7/10 seat orders and the extra-right rule are correct;
- Side Column uses explicit LEFT / empty CENTRAL / RIGHT tracks and no longer relies on `grid-auto-flow` for seat placement;
- the middle 40% corridor is seat-free;
- Side Column seats are now self-contained narrow thumbnails rather than overflowing full cards;
- directly visible Side Column information is compact hero identity/art, HP and concealed Hand count;
- full Equipment/Judgement card faces are hidden in the thumbnail but remain available through unchanged Opponent Inspect;
- all 117 hero-target centre hit checks across the 5–10 × 1440/650/480 matrix resolve to the correct seat;
- real Inspect clicks for high/low seats in both columns work without force-clicking;
- the previous 1440/N6 p2/p3 footer interception is gone;
- minimum visible-descendant clearance above LocalPlayerDock was reported as ~24.89px / 17px / 18.63px at 1440 / 650 / 480;
- Top Row, VIS-06 local console, gameplay and presentation authority were not changed;
- focused FIX1 reported 24/24 PASS and the retained/focused selection reported 134/134 PASS.

VIS-05A is now complete. Do not reopen its topology or thumbnail containment unless new real-device evidence shows a regression.

# NEXT TASK — UX2.0VIS-05B: Give Side Column Mode a Real Central Interaction Safe Zone

## Objective
Fix one remaining Side Column structural defect:

**For 5–10 player rooms, place the existing Interaction Stage inside a dedicated central safe zone between the proven LEFT/RIGHT seat columns instead of letting it use the legacy global absolute top/620px dashboard geometry.**

This is a geometry/containment task only.

Do not redesign Interaction Stage internals, enlarge Side Column Hero Focus, change Reaction/Dying/Meta content, or alter seat topology.

## Current production defect
The wrapper already exists in React:

```tsx
<div className="interaction-safe-zone">
  <InteractionStage ... />
</div>
```

but current CSS is:

```css
.interaction-safe-zone { display: contents; }
```

Only Top Row mode overrides that wrapper into a real positioned safe zone.

Therefore Side Column mode still falls back to the legacy global Interaction Stage positioning:

```css
.interaction-stage {
  position:absolute;
  left:50%;
  top:14px;
  width:min(94%,620px);
  translate:-50% 0;
}
```

That ignores the newly proven Side Column corridor and can visually compete with or overlap the side seat columns.

UX V2 defines Side Column Mode as:
- narrow LEFT seats;
- narrow RIGHT seats;
- a narrower but taller central Interaction Stage area;
- side columns terminate above the LocalPlayerDock;
- the LocalPlayerDock owns full usable screen width.

## Files expected in scope
Production:
- `app/globals.css`

Regression:
- `tests/browser/ui19.spec.mjs`

Do not modify:
- `app/page.tsx`;
- `projectSideColumnSeat`;
- Side Column thumbnail CSS in `app/sequence-overrides.css`;
- Top Row geometry;
- game/presentation/server/projector logic.

## Required implementation

### 1. Turn the existing Side Column wrapper into real geometry
Under:

`.play-table[data-seat-topology="side-column"] > .interaction-safe-zone`

create a positioned central safe zone.

Required:
- `position:absolute`;
- top and bottom remain within the play-table battlefield;
- left/right boundaries sit between the actual LEFT/RIGHT seat columns;
- display as a real flex/block container rather than `display:contents`;
- centre the existing Interaction Stage inside it;
- keep `pointer-events:none` on the public presentation wrapper.

Do not add visible background/border/placeholder chrome to the safe-zone wrapper.

### 2. Remove legacy Stage positioning only inside Side Column mode
For the direct child Interaction Stage in Side Column mode:
- override legacy `position:absolute`;
- override legacy `left:50%`;
- override legacy `top:14px`;
- override legacy `translate:-50% 0`;
- use normal relative positioning inside the safe zone;
- width must be constrained by the safe-zone width, not by a viewport-wide 620px placement.

Do not change the global legacy rule or Top Row override in this task.

### 3. Horizontal seat-clearance contract
For active Side Column states, at 1440x900, 650x900 and 480x900:

Let:
- `leftSeatsRight = max(right edge of all LEFT seat visible descendants)`;
- `rightSeatsLeft = min(left edge of all RIGHT seat visible descendants)`;
- `safeZone.left/right` be the central wrapper bounds.

Require:
- `safeZone.left >= leftSeatsRight + 6px`;
- `safeZone.right <= rightSeatsLeft - 6px`.

For the visible Interaction Stage itself require the same 6px clearance.

Do not use JS runtime measurement for layout; measurements are test-only.

### 4. Vertical battlefield ownership
The Side Column safe zone may use the full battlefield height because there is no top row.

Require:
- safeZone.top >= playTable.top;
- safeZone.bottom <= playTable.bottom;
- Stage fully inside safeZone;
- Stage bottom <= playTable.bottom - 1px;
- Safe Zone and Stage do not overlap LocalPlayerDock;
- no Stage child may extend below the play-table into the dock.

Do not move LocalPlayerDock or increase play-table height.

### 5. Preserve Side Column seats exactly
Do not change:
- LEFT/RIGHT mapping;
- row numbers;
- 30/40/30 player-board tracks;
- Side Column thumbnail width/height;
- hero identity/HP/Hand treatment;
- hidden thumbnail Equipment/Judgement treatment;
- Inspect/target callbacks.

The retained VIS-05A/FIX1 tests must pass unchanged.

### 6. Preserve Top Row exactly
Counts 2/3/4 keep:
- current Top Row seat geometry;
- current Top Row safe-zone offsets;
- current wide/open Interaction Stage composition;
- Hero Focus and Medium Source sizes;
- VIS-06 guidance/action controls.

No Side Column selector may leak into Top Row.

### 7. Do not redesign Side Column Stage contents yet
Keep existing Side Column-specific presentation density exactly as it is today:
- current compact Hero Focus;
- current header;
- current Reaction Chain;
- current Dying handoff;
- current SOURCE / FOCUS / DECISION / RESOLVER meta;
- current outer Interaction Stage chrome.

Do not copy the Top Row open-shell/large-Hero CSS into Side Column in this task.

This task proves the corridor geometry first.

If the unchanged Side Column Stage cannot fit at 480x900 for the required states, STOP and report exact measured blocker rather than shrinking/hiding/recomposing content.

## Required browser fixtures/states
Use existing 6-player Side Column fixtures where possible.

Run active states with `count=6`:
- `interaction`;
- `negation`;
- `dying`;
- `group-observer`.

Also run one dense-seat check with `count=10` using at least:
- `interaction`;
- `negation`.

Do not alter their semantic participant identities merely for layout.

## Required browser regression

### A. Side Column safe-zone existence
At 1440/650/480 for the active states above:

Assert:
1. exactly one `.play-table[data-seat-topology="side-column"] > .interaction-safe-zone`;
2. wrapper computed display is not `contents`;
3. one visible `.interaction-stage`;
4. Stage is a direct child of the safe-zone wrapper;
5. Stage computed position is not the legacy viewport-absolute placement;
6. Stage transform/translate does not contain the old `-50%` centring.

### B. Horizontal containment
Measure visible seat descendants using the accepted FIX1 method.

Assert:
- safe-zone left >= all LEFT visible-descendant right edges + 6px;
- safe-zone right <= all RIGHT visible-descendant left edges - 6px;
- Stage left/right satisfy the same limits;
- Stage fully inside safe zone with 4px tolerance;
- no Interaction Stage descendant geometrically overlaps a Side Column seat descendant.

### C. Vertical containment
Assert:
- safe zone inside play-table;
- Stage fully inside safe zone;
- Stage bottom <= play-table bottom - 1px;
- Stage/safe-zone overlap with LocalPlayerDock = 0;
- no horizontal page overflow.

For Negation:
- Reaction Chain visible and inside Stage.

For Dying:
- Dying handoff visible and inside Stage.

### D. REST
At count=6 and count=10 for 480/1440:
- safe-zone wrapper exists exactly once;
- no Interaction Stage is visible;
- wrapper is visually transparent with zero border;
- no placeholder/dashboard is shown;
- Side Column seat hit safety still passes.

### E. Retained negative regression
Counts 2/3/4 at 480 and 1440:
- Top Row safe zone remains the existing Top Row geometry;
- Stage retains the accepted Top Row open-shell treatment;
- no Side Column safe-zone rule changes its bounds or Stage positioning.

## Forbidden shortcuts
Do not:
- move/shrink Side Column seats;
- change Side Column mapping;
- widen the centre by stealing from seat tracks;
- hide seats while Stage is active;
- increase play-table height;
- move LocalPlayerDock;
- add Stage scrolling/clipping/scaling;
- hide Reaction/Dying/meta content;
- enlarge Side Column Hero Focus in this task;
- copy Top Row outer-shell styling into Side Column;
- use JS DOM measurement for positioning;
- change gameplay/presentation semantics.

## Validation
Run and report:
- focused VIS-05B Side Column active-state safe-zone tests;
- dense 10-player interaction tests;
- retained VIS-05A/FIX1 mapping/containment/hit-safety tests;
- retained VIS-04 Top Row tests;
- retained VIS-06 local-console tests;
- broader local checks only if allowed.

Do not claim unrun checks. Do not inspect or wait for CI.

## Execution result
Append only:
- implementation SHA;
- files changed;
- final Side Column safe-zone CSS strategy;
- measured safe-zone/Stage/left-seat/right-seat bounds at 1440/650/480;
- Interaction / Negation / Dying / Group Observer containment results;
- count=10 dense-seat results;
- proof Top Row unchanged;
- any exact blocker/GAP.

Do not self-accept. Push, verify remote HANDOVER, then STOP.

## Acceptance
Pass only if the unchanged Side Column Interaction Stage is positioned entirely inside a real central safe zone between the proven seat columns, clears all visible seat descendants by at least 6px, remains fully inside the battlefield above LocalPlayerDock at 1440/650/480, preserves Negation/Dying content without clipping, and leaves VIS-05A seat topology plus Top Row/VIS-06/gameplay unchanged.
