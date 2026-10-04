# WTK UI / Layout — Current Task Handoff

## REMOTE HANDOVER RULE
Work only on `ux-v2`. Read this file and `docs/PLANNER_DEVELOPMENT_WORKFLOW.md`. Implement only the task below, validate, append this task's execution result, commit/push, verify remote HANDOVER, then STOP. Do not wait for or poll CI.

## Reviewer status — UX2.0VIS-06B ACCEPTED

Reviewed implementation: `c18cf31d3d6634844400e090664806c56c23d309`.

Accepted facts to preserve:
- Sun Shangxiang's stable skill mapping now includes both:
  - `Betrothment -> sun_shangxiang_betrothment`
  - `Daredevil -> sun_shangxiang_daredevil`
- Daredevil is now claimed by the existing Hero Skills ownership path rather than the generic bottom provider surface.
- The production change is limited to the effect-ID mapping; no Daredevil capability/gameplay/server/projector semantics changed.
- In the reviewed Daredevil trigger fixture:
  - Betrothment remains present but disabled;
  - Daredevil is enabled in the local Hero Skills panel;
  - Cancel and Primary slots remain empty;
  - Decline contains `Skip`;
  - no Daredevil control appears in action extras or fixed action slots.
- Clicking Daredevil still dispatches exactly:
  `{ action: "trigger", extra: { providerId: "sun_shangxiang_daredevil" } }`
  through the existing generic mapped-skill callback.
- Outside the trigger decision, Daredevil stays visible but disabled.
- The existing unmapped provider-extra fixture remains in the extras region, proving this change did not over-generalize trigger ownership.
- Focused VIS-06B browser coverage reported 4/4 PASS; retained VIS-06A slot/guidance coverage reported 3/3 PASS; retained mounted active-skill/trigger tests reported 40/40 PASS.

Do not reopen VIS-06A or VIS-06B.

## Deferred work state — RESUME NOW
**UX2.0VIS-05A was previously deferred and remains INCOMPLETE.**
It has not been implemented or accepted.

VIS-06A/06B are now complete enough to resume it. The current task below is the original deferred Side Column topology correction, updated only to avoid absolute viewport-Y assumptions because the content-sized LocalPlayerDock from VIS-06A legitimately changes available battlefield height.

# NEXT TASK — UX2.0VIS-05A: Correct 5–10 Player Side-Column Seat Topology

## Objective
Fix one structural layout defect:

**For 5–10 total players, place every opponent in deterministic LEFT/RIGHT vertical columns that match the documented seat topology and leave a real seat-free central corridor.**

Current Side Column CSS is still only:

- two equal columns;
- `grid-auto-flow: row`;
- DOM order implicitly determines placement.

That is insufficient because:
- it does not encode which relative seats belong LEFT vs RIGHT;
- it does not encode the clockwise seat order within each side;
- the two-column grid lets seat cards occupy too much of the battlefield centre.

This task fixes **Side Column seat placement only**.

Do not compact/redesign Side Column card internals.
Do not redesign Side Column Interaction Stage geometry.
Do not change Top Row mode.

## Normative topology rule
The design document's prose and its concrete 5/7/10-player diagrams disagree on one left-column ordering detail.

For VIS-05A, use the **published 5/7/10 diagrams plus the rule that the extra/exact-opposite seat goes to the clockwise RIGHT column** as normative.

Relative indices already run clockwise from the local viewer as `1..N-1`.

Use:

```ts
opponentCount = totalPlayers - 1
rightCount = Math.ceil(opponentCount / 2)
leftCount = opponentCount - rightCount
rowCount = rightCount
```

### RIGHT projection
When:

`relativeIndex <= rightCount`

then:

```ts
side = "right"
row = rightCount - relativeIndex + 1
```

So RI1 is the lowest/right-nearest slot and larger right-side relative indices rise upward.

### LEFT projection
When:

`relativeIndex > rightCount`

then:

```ts
leftOffset = relativeIndex - rightCount
side = "left"
row = leftCount - leftOffset + 1
```

Rows are numbered top-to-bottom, with row1 highest.

When opponent count is odd, the extra row belongs to RIGHT and the lowest LEFT row remains empty.

## Exact required mapping

### 5 total players
- RI1 -> RIGHT row2
- RI2 -> RIGHT row1
- RI3 -> LEFT row2
- RI4 -> LEFT row1

Visual top-to-bottom:
- LEFT: P5, P4
- RIGHT: P3, P2

### 6 total players
- RI1 -> RIGHT row3
- RI2 -> RIGHT row2
- RI3 -> RIGHT row1
- RI4 -> LEFT row2
- RI5 -> LEFT row1
- LEFT row3 empty

### 7 total players
- RI1 -> RIGHT row3
- RI2 -> RIGHT row2
- RI3 -> RIGHT row1
- RI4 -> LEFT row3
- RI5 -> LEFT row2
- RI6 -> LEFT row1

Visual top-to-bottom:
- LEFT: P7, P6, P5
- RIGHT: P4, P3, P2

### 8 total players
- RI1 -> RIGHT row4
- RI2 -> RIGHT row3
- RI3 -> RIGHT row2
- RI4 -> RIGHT row1
- RI5 -> LEFT row3
- RI6 -> LEFT row2
- RI7 -> LEFT row1
- LEFT row4 empty

### 9 total players
- RI1 -> RIGHT row4
- RI2 -> RIGHT row3
- RI3 -> RIGHT row2
- RI4 -> RIGHT row1
- RI5 -> LEFT row4
- RI6 -> LEFT row3
- RI7 -> LEFT row2
- RI8 -> LEFT row1

### 10 total players
- RI1 -> RIGHT row5
- RI2 -> RIGHT row4
- RI3 -> RIGHT row3
- RI4 -> RIGHT row2
- RI5 -> RIGHT row1
- RI6 -> LEFT row4
- RI7 -> LEFT row3
- RI8 -> LEFT row2
- RI9 -> LEFT row1
- LEFT row5 empty

Visual top-to-bottom:
- LEFT: P10, P9, P8, P7
- RIGHT: P6, P5, P4, P3, P2

## Current production facts
Current Side Column CSS lives mainly in `app/sequence-overrides.css`:

```css
.player-board[data-seat-topology="side-column"] {
  display:grid;
  grid-template-columns:minmax(0,1fr) minmax(0,1fr);
  grid-template-rows:repeat(var(--seat-row-count),minmax(0,1fr));
  grid-auto-flow:row;
}
```

Current Side Column cards:
- retain portrait-card density;
- retain Equipment/Judgement zones;
- have responsive height caps;
- use the same target/Inspect handlers as other opponent seats.

Keep that density/content unchanged in VIS-05A.

## Files expected in scope
Production:
- `app/page.tsx`
- `app/sequence-overrides.css`

Regression:
- `tests/browser/ui19.spec.mjs`

A small pure presentation-only helper file is allowed if it is cleaner than keeping the projection in `app/page.tsx`.

Do not modify:
- game rules;
- PresentationSnapshot;
- PresentationClientView;
- server/projector;
- target legality;
- hero/card data;
- LocalPlayerDock action/guidance semantics.

## Required implementation

### 1. Add one pure Side Column placement helper
Add a pure helper such as:

`projectSideColumnSeat(totalPlayers, relativeIndex)`

Return:

```ts
{
  side: "left" | "right",
  row: number,
  rowCount: number
}
```

Return null when:
- totalPlayers < 5;
- totalPlayers > 10;
- relativeIndex < 1;
- relativeIndex >= totalPlayers.

The helper must depend only on:
- totalPlayers;
- relativeIndex.

Do not read:
- DOM geometry;
- player names;
- seat labels;
- alive/dead status;
- distance;
- gameplay state.

### 2. Add stable Side Column DOM hooks
For Side Column opponent cards only, expose:

- `data-side-column="left|right"`
- `data-side-row="1..5"`

Equivalent names are acceptable if clear and stable.

Preserve:
- `data-player-anchor`;
- `player-square-{relativeIndex}`;
- interaction semantic role data;
- selected-target classes;
- turn/action/defeated treatment;
- target/Inspect handlers.

Top Row opponents must not receive side-column hooks.

### 3. Replace generic auto-flow with explicit edge columns
For:

`.player-board[data-seat-topology="side-column"]`

use an explicit 3-column battlefield grid:

- column 1 = LEFT seat band;
- column 2 = empty flexible CENTRAL corridor;
- column 3 = RIGHT seat band.

Recommended track contract:

```css
grid-template-columns:
  minmax(0, 30%)
  minmax(40%, 1fr)
  minmax(0, 30%);
```

Equivalent CSS is acceptable if it satisfies the measured corridor contract below.

Placement authority must come from the projection:
- LEFT -> grid column 1;
- RIGHT -> grid column 3;
- projected row -> grid row.

`grid-auto-flow` must no longer decide opponent position.

Do not use per-player absolute pixel coordinates.

### 4. Preserve current Side Column card internals
Do not change:
- card aspect treatment;
- portrait;
- Equipment/Judgement visibility;
- Hand footer;
- player/hero identity;
- responsive seat height caps;
- Inspect behavior;
- target behavior.

A later task may compact Side Column cards after topology is proven.

### 5. Central corridor contract
At 1440x900, 650x900 and 480x900:

Let:
- boardLeft / boardWidth come from the rendered `.player-board`;
- left30 = boardLeft + boardWidth * 0.30;
- right70 = boardLeft + boardWidth * 0.70.

Assert:
- every LEFT seat right edge <= left30 + 4px;
- every RIGHT seat left edge >= right70 - 4px.

Therefore the middle 40% of the board must contain no opponent seat geometry.

If existing Side Column card dimensions cannot satisfy this at 480 without redesigning/shrinking the cards, STOP and report the measured blocker. Do not compact seats in VIS-05A.

### 6. Relative vertical geometry only — no stale absolute viewport baselines
VIS-06A made LocalPlayerDock guidance content-sized, so available battlefield height can legitimately vary.

Do NOT restore old absolute Y coordinates and do NOT test fixed viewport Y values for Side Column seats.

Instead assert relative geometry:
- row1 is visually above row2;
- row2 above row3, etc.;
- seats in one side share the same X column within 4px;
- no two seats overlap;
- every seat bottom is <= LocalPlayerDock top - 6px;
- every seat stays inside player-board bounds, with 4px tolerance;
- no horizontal page overflow.

Do not use negative margins or fixed-Y compensation to recreate pre-VIS-06A positions.

### 7. Preserve Top Row completely
For counts 2/3/4:
- topology remains `top-row`;
- no side-column hooks;
- VIS-04A compact widths/heights remain;
- VIS-04C top anchoring remains;
- Safe Zone stays 6–24px below the row;
- VIS-06A guidance/action-slot layout remains unchanged.

## Required browser regression

Use REST fixtures at:
- 1440x900;
- 650x900;
- 480x900.

### A. Full 5–10 mapping matrix
For each total player count 5, 6, 7, 8, 9, 10:

Assert:
1. opponent count = N-1;
2. every opponent's `data-side-column` exactly matches the required table;
3. every opponent's `data-side-row` exactly matches the required table;
4. relativeIndex and `data-player-anchor` identity remain unchanged;
5. no opponent is assigned centre column.

### B. Geometry
For every count/viewport:
- all LEFT seats share one X column within 4px;
- all RIGHT seats share one X column within 4px;
- LEFT seat right edges satisfy the 30% boundary;
- RIGHT seat left edges satisfy the 70% boundary;
- row numbering matches visual top-to-bottom order;
- no two opponent bboxes overlap;
- seats remain inside player-board bounds;
- every seat is at least 6px above LocalPlayerDock;
- no horizontal overflow.

### C. Named published-example tests
Add explicit tests locking these three layouts:

#### 5 players
Viewer p1 / room order p1..p5:
- LEFT top-to-bottom = p5, p4;
- RIGHT top-to-bottom = p3, p2.

#### 7 players
- LEFT = p7, p6, p5;
- RIGHT = p4, p3, p2.

#### 10 players
- LEFT = p10, p9, p8, p7;
- RIGHT = p6, p5, p4, p3, p2;
- LEFT row5 has no seat.

### D. Behavior regression
At count=6 for 480 and 1440:
- click one opponent outside target-selection mode;
- existing Opponent Inspect opens;
- close it;
- the same opponent still has the same side/row hooks afterward.

Do not redesign Inspect.

### E. Top Row negative regression
At counts 2/3/4 for 480 and 1440:
- topology remains top-row;
- no side-column hooks;
- compact seat size/X placement remains;
- seat top remains within 0–4px of player-board top;
- Safe Zone clearance remains 6–24px;
- VIS-06A action-slot structure still exists.

## Forbidden shortcuts
Do not:
- reorder `room.players`;
- change the relativeIndex calculation;
- use player names or hard-coded player IDs for placement;
- use absolute per-player pixel coordinates;
- use JS DOM measurement for placement;
- compact/shrink Side Column cards;
- hide Side Column Equipment/Judgement;
- move LocalPlayerDock;
- change guidance/action-slot layout;
- change Top Row;
- change InteractionStage/Safe Zone geometry;
- change target legality, gameplay, server or presentation authority.

## Validation
Run and report:
- focused VIS-05A mapping/geometry tests;
- named 5/7/10 example tests;
- retained VIS-04A/VIS-04C Top Row tests;
- retained VIS-06A/VIS-06B local dock/control tests;
- existing UI-19 Side Column containment tests;
- broader local checks only if allowed.

Do not claim unrun checks. Do not inspect or wait for CI.

## Execution result
Append only:
- implementation SHA;
- files changed;
- placement-helper formula;
- exact DOM hooks added;
- mapping result for 5–10;
- measured left/right X columns and 30/70 corridor boundaries at 1440/650/480;
- dock-clearance minimums by viewport;
- proof 5/7/10 examples match;
- proof Top Row and VIS-06 local console remain unchanged;
- focused/retained validation results;
- any measured blocker/GAP.

Do not self-accept. Push, verify remote HANDOVER, then STOP.

## Acceptance
Pass only if 5–10 player rooms use deterministic explicit LEFT/RIGHT columns matching the required mapping and published 5/7/10 examples, the middle 40% of the board is free of opponent seats, side seats remain inside the board and above LocalPlayerDock without overlap/overflow, and Top Row / VIS-06 local controls / gameplay semantics remain unchanged.

## UX2.0VIS-05A execution result — topology implemented, content-overflow GAP awaiting reviewer

- Implementation SHA: `79eda6ea1ee2017a73cd336fbeddbbf7b566b44a`. Changed `app/page.tsx`, `app/sequence-overrides.css`, and `tests/browser/ui19.spec.mjs`; this appended execution result is delivered in the following documentation commit with the implementation.
- Pure `projectSideColumnSeat(totalPlayers, relativeIndex)` uses only integer count/index: `rightCount=ceil((N-1)/2)`, `leftCount=N-1-rightCount`; right seats use `row=rightCount-RI+1`, left seats use `row=leftCount-(RI-rightCount)+1`, both return `rowCount=rightCount`. Invalid/out-of-range/noninteger arguments return null. Relative-index computation and room player order are unchanged.
- Opponent cards now expose `data-side-column` and `data-side-row` only in Side Column mode; projected row drives inline `gridRow`, side selects CSS grid column 1 or 3. Tracks are 30% / flexible minimum 40% / 30%, with zero column gap and retained responsive row gaps. Grid auto-flow no longer assigns seats. Existing anchor, class, semantic roles, target/Inspect callbacks and card internals remain unchanged.
- Verified mapping by RI order: N5 `R2,R1,L2,L1`; N6 `R3,R2,R1,L2,L1`; N7 `R3,R2,R1,L3,L2,L1`; N8 `R4,R3,R2,R1,L3,L2,L1`; N9 `R4,R3,R2,R1,L4,L3,L2,L1`; N10 `R5,R4,R3,R2,R1,L4,L3,L2,L1`. Named browser tests prove published LEFT/RIGHT orders for N5 (p5,p4 / p3,p2), N7 (p7,p6,p5 / p4,p3,p2), and N10 (p10,p9,p8,p7 / p6,p5,p4,p3,p2), including empty LEFT row5.
- Measured seat-container X columns and corridor boundaries are invariant across N5–N10 at each width: 1440 left/right X `194.28125 / 1135.09375`, 30/70 boundaries `451.2 / 988.8`; 650 X `57.0625 / 489.3125`, boundaries `201.5 / 448.5`; 480 X `37.953125 / 369.765625`, boundaries `145.2 / 334.8` px. No seat-container bbox enters the middle 40%; no horizontal overflow or seat-container overlap. Card dimensions were not compacted.
- Minimum seat-container clearance above LocalPlayerDock over N5–N10: 1440 `39.921875px`, 650 `39.40625px`, 480 `47.625px`. All containers remain inside board bounds; row order and shared per-side X pass at all counts/widths. These are container measurements, not a claim that overflowing descendants are contained.
- Validation: focused VIS-05A 29/29 passed (18 mapping/geometry matrix, 3 named examples, 2 Inspect, 6 Top Row negatives); retained VIS-04A/VIS-04C, VIS-06A/VIS-06B and UI-19 tests 61/61 passed, combined 90 passed. Inline helper assertions also passed for invalid inputs and rowCount across all valid indices. Top Row compact geometry, top anchoring, Safe Zone clearance, and local action-slot structure are retained. No local full tests/build/lint/diff-check; remaining validation belongs to GitHub Actions. CI/deployment were not inspected.
- **GAP: descendant content overlap and click obstruction.** The first 1440px N6 Inspect test on p2 timed out because p3's Hand footer intercepted the real click. Measured p2 container y=406.0625..464.0625 (58px high), hero button y=407.0625..570, footer y=624.484375..660.484375; p3 footer y=454.40625..490.40625 overlaps p2's hero hit area. Thus existing internal content exceeds its retained container cap, can overlap adjacent rows and extend below the dock boundary even while container geometry passes. The required one-opponent Inspect regression uses the top right p4 and passes normally at 480/1440, without forced clicks; it does not prove every seat is unobstructed. This is not hidden or treated as resolved.
- No card-density, portrait, Equipment/Judgement, footer, height-cap, Stage, Safe Zone, or LocalPlayerDock changes were made to bypass that GAP. Reviewer must decide/authorize the next bounded repair for side-card content containment and hit areas; VIS-05A is not self-accepted or claimed closed despite the passing container-focused matrix.
