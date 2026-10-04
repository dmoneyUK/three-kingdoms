# WTK UI / Layout — Current Task Handoff

## REMOTE HANDOVER RULE
Work only on `ux-v2`. Read this file and `docs/PLANNER_DEVELOPMENT_WORKFLOW.md`. Implement only the task below, validate, append this task's execution result, commit/push, verify remote HANDOVER, then STOP. Do not wait for or poll CI.

## Reviewer status — UX2.0VIS-05A PARTIAL

Reviewed implementation: `79eda6ea1ee2017a73cd336fbeddbbf7b566b44a`.

### Accepted topology work
Preserve these parts exactly:
- `projectSideColumnSeat(totalPlayers, relativeIndex)` is pure and uses only total player count + relative index.
- Required mappings for 5–10 players are correct.
- `data-side-column` and `data-side-row` are exposed only in Side Column mode.
- Side Column placement is now explicit LEFT / empty CENTRE / RIGHT rather than `grid-auto-flow`.
- Published 5/7/10 examples match the required seat order.
- The middle 40% corridor is clear when measured from the opponent **container** bboxes.
- Top Row / VIS-04 / VIS-06 local console behavior was not changed.
- Focused VIS-05A topology/geometry tests reported 29/29 PASS; retained suite reported 61/61 PASS.

### Blocking gap — VIS-05A is not accepted yet
The implementation report correctly exposed a real descendant-overflow bug:

At 1440x900 / 6 players:
- p2 seat container: y≈406.06..464.06, height 58px;
- p2 hero button extends to y≈570;
- p2 footer extends to y≈660.48;
- p3 footer occupies y≈454.41..490.41 and intercepts p2's real click.

Root cause:
- Side Column container height is capped by the row;
- internal `.opponent-hero-card` still keeps the old tall portrait `2/3` sizing from the full opponent card;
- Equipment/Judgement/Hand footer are still laid out as full public zones;
- parent/public-zone overflow remains visible;
- therefore descendants escape the projected seat container, overlap adjacent rows, can extend toward the LocalPlayerDock and can block another seat's hit target.

This violates the actual seat-thumbnail design and the VIS-05A usability acceptance even though the outer container geometry passes.

Do not hide this with forced clicks, z-index tricks, pointer-events on neighbouring seats, or by weakening the topology tests.

# NEXT TASK — UX2.0VIS-05A-FIX1: Contain Side-Column Seat Thumbnails and Restore Hit Safety

## Objective
Complete VIS-05A by making every 5–10 player Side Column opponent a **self-contained narrow thumbnail** whose visible descendants and hit areas stay inside its projected grid cell.

The exact LEFT/RIGHT topology from VIS-05A must remain unchanged.

This task may compact the **Side Column thumbnail internals only**, because the previous task has now proven that the old full-card internals cannot fit the Side Column row geometry.

Do not change Top Row thumbnails, Side Column mapping, LocalPlayerDock, Interaction Stage, gameplay or public Inspect data.

## Design authority
`docs/UX_V2_INTERACTION_STAGE_DESIGN.md §1.5` requires Side Column Mode to use a **narrow portrait thumbnail** to protect central width.

A seat thumbnail should directly show lightweight information such as:
- hero face/art;
- hero or player identity;
- HP;
- concealed Hand count;
- lightweight status markers.

It must **not** try to render:
- full skill detail;
- full Equipment names/cards;
- full Judgement card faces;
- long status text.

Full public Equipment/Judgement detail remains available through the existing Opponent Inspect surface.

## Files expected in scope
Production:
- `app/sequence-overrides.css`
- `app/page.tsx` only if a tiny presentational hook/count badge is required

Regression:
- `tests/browser/ui19.spec.mjs`

Do not modify:
- `projectSideColumnSeat` formula;
- Side Column data hooks;
- relativeIndex calculation;
- presentation/game/server/projector logic;
- target legality;
- LocalPlayerDock;
- Top Row CSS.

## Required implementation

### 1. Make the Side Column card fit its assigned grid row
Under:

`.player-board[data-seat-topology="side-column"]`

the opponent card must be fully bounded by its grid cell.

Required:
- remove any Side Column `min-height` that can force a card taller than its row;
- actual card height must be <= its grid-row height;
- actual card width must remain entirely inside its 30% side band;
- use real dimensions, not `transform:scale`;
- preserve current rowCount and row-gap logic.

Use a narrow thumbnail width. A reasonable target is:
- minimum usable width: 44px;
- maximum: about 86px;
- responsive width between those limits.

Equivalent geometry is acceptable if tests below pass.

### 2. Convert internal public zones to thumbnail density
For Side Column only:

- hero artwork remains the dominant surface and fills the bounded seat;
- remove the old child `2/3` sizing that makes `.opponent-hero-card` taller than its parent;
- hero target/button must stay entirely inside the seat;
- keep a compact readable identity treatment;
- HP must remain directly visible;
- concealed Hand count must remain directly visible;
- full Equipment grid must not consume seat height;
- full Judgement card faces must not consume seat height;
- hearts may be hidden/compacted if HP text remains visible.

Do not delete Equipment/Judgement state from the DOM/data model merely to make layout pass.

### 3. Hand count becomes a compact in-seat badge/footer
The Hand count may be rendered as a small overlay/footer inside the thumbnail.

It must:
- stay inside the seat bbox;
- not increase the seat's measured height;
- not intercept the main hero Inspect/target click.

If implemented as an overlay, use `pointer-events:none` on the non-interactive badge/footer only.

Do not disable pointer events on the seat, hero target or info affordance.

### 4. Equipment/Judgement detail remains accessible through Inspect
In Side Column mode:
- full `.opponent-equipment-zone` and `.opponent-judgement-zone` card faces may be visually hidden in the thumbnail;
- the existing `OpponentInspectionOverlay` remains unchanged and must still show the same public Equipment/Judgement information.

Do not redesign Inspect.

### 5. Hit-safety contract
For every Side Column seat:
- the centre point of `.opponent-hero-target` must resolve to that button or one of its own descendants via `document.elementFromPoint`;
- no descendant from another seat may cover that centre point;
- no visible descendant of one seat may geometrically overlap the next seat's hero target.

Do not solve this with forced Playwright clicks.

### 6. Full visual containment contract
At 1440x900, 650x900 and 480x900 for counts 5–10:

For each seat, measure:
- outer seat article;
- hero card;
- hero target;
- hand-count/footer/badge;
- any visible identity/status overlay;
- any visible Equipment/Judgement thumbnail presence indicator if one is added.

Every visible measured descendant must be inside the outer seat bbox with 2px tolerance.

Also assert:
- no visible descendant extends below LocalPlayerDock top - 6px;
- no visible descendant enters the middle 40% central corridor;
- no descendant creates horizontal page overflow.

### 7. Preserve VIS-05A topology exactly
Do not change:
- 5–10 side/row mapping;
- 5/7/10 published order;
- 30% / 40% / 30% corridor structure;
- `data-side-column`;
- `data-side-row`;
- fixed seat identity/relativeIndex.

The retained topology tests must pass unchanged.

### 8. Preserve Top Row completely
Counts 2/3/4:
- Top Row compact dimensions remain unchanged;
- Equipment/Judgement continue using the existing Top Row rules;
- Safe Zone clearance remains 6–24px;
- no Side Column thumbnail rule leaks into Top Row.

## Required browser regression

### A. Descendant-containment matrix
REST, counts 5/6/7/8/9/10, widths 1440/650/480.

For every opponent seat:
1. seat bbox stays in its projected row/side;
2. hero card bbox is inside seat;
3. hero target bbox is inside seat;
4. Hand count/badge bbox is inside seat;
5. every visible Side Column seat descendant used for identity/status is inside seat;
6. no visible descendant crosses the 30/70 central-corridor boundaries;
7. no visible descendant reaches LocalPlayerDock;
8. no horizontal overflow.

### B. No cross-seat hit obstruction
For the same matrix:
- use `elementFromPoint` at the centre of every visible `.opponent-hero-target`;
- assert the returned node belongs to that same hero target;
- fail if another seat's footer/overlay/zone intercepts the point.

This regression must fail against pre-FIX1 geometry.

### C. Real Inspect click coverage
At count=6 and count=10, widths 480 and 1440:
- click at least the highest and lowest seat on BOTH left and right columns using normal Playwright click;
- Inspect must open for the correct player without `force:true`;
- close Inspect;
- topology hooks/position remain unchanged.

This specifically protects against the p2/p3 interception discovered in review.

### D. Inspect data preservation
Use existing fixture public zones to prove:
- Side Column thumbnail itself does not visibly render full Equipment/Judgement card faces;
- opening Inspect still shows the expected public Equipment/Judgement card(s).

### E. Retained topology + Top Row regression
Retain unchanged:
- VIS-05A full mapping matrix;
- named 5/7/10 example tests;
- VIS-04A/VIS-04C Top Row tests;
- VIS-06A/VIS-06B local console tests.

## Forbidden shortcuts
Do not:
- change the Side Column mapping helper;
- move seats to different rows/columns;
- widen seats into the centre corridor;
- use `overflow:hidden` as the only fix while leaving important required identity/HP/Hand content inaccessible;
- hide the entire hero target;
- use z-index to place one overlapping seat above another;
- use `force:true` in click tests;
- disable pointer events on real seat controls;
- change target/Inspect callbacks;
- change LocalPlayerDock height/layout;
- change Top Row;
- change gameplay/server/projector/presentation semantics.

## Validation
Run and report:
- focused FIX1 descendant-containment matrix;
- focused hit-obstruction + real Inspect click tests;
- retained VIS-05A mapping/5-7-10 example tests;
- retained VIS-04 Top Row tests;
- retained VIS-06 local-operation tests;
- broader local checks only if allowed.

Do not claim unrun checks. Do not inspect or wait for CI.

## Execution result
Append only:
- implementation SHA;
- files changed;
- final Side Column thumbnail width/height/internal strategy;
- which information remains directly visible;
- how Equipment/Judgement remain available;
- measured seat/hero/footer bounds for the previous 1440x900 6-player p2/p3 failure;
- minimum descendant-to-dock clearance at 1440/650/480;
- hit-test result for every seat in the matrix;
- real Inspect click results for highest/lowest seats;
- retained topology results;
- any remaining GAP.

Do not self-accept. Push, verify remote HANDOVER, then STOP.

## Acceptance
Pass only if the already-correct 5–10 LEFT/RIGHT topology is preserved and every Side Column thumbnail is visually/self-interactively contained inside its own seat cell, no descendant overlaps or blocks another seat, full Equipment/Judgement detail remains available through Inspect, all real seat clicks work without forcing, the central corridor/dock remain protected, and Top Row/VIS-06/gameplay remain unchanged.
