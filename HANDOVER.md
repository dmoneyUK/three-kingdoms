# WTK UI / Layout — Current Task Handoff

## REMOTE HANDOVER RULE
Work only on `ux-v2`. Read this file and `docs/PLANNER_DEVELOPMENT_WORKFLOW.md`. Implement only the task below, validate, append this task's execution result, commit/push, verify remote HANDOVER, then STOP. Do not wait for or poll CI.

## Reviewer status — UX2.0VIS-04B ACCEPTED, VIS-05A DEFERRED BEFORE START

Reviewed implementation: `43b69730365281f26179759c22811a8841621125`.

Accepted facts to preserve:
- Top Row compact thumbnails remain 180x108 at 1440, 112x88 at 650, 100x78 at 480.
- Top Row Safe Zone currently clears those seats by 13.5 / 15.75 / 16.5px at 1440 / 650 / 480.
- Dying@650 is contained without shrinking/clipping content.
- Hero Focus / Medium Source / Reaction / Dying / LocalPlayerDock / gameplay authority remain unchanged.

New reviewer evidence from the real iPhone REST screenshot shows one remaining Top Row geometry defect:
- the three opponent thumbnails are horizontally correct but visually float too far down from the top of the battlefield;
- there is a large unused band above them;
- code confirms why: Top Row still inherits `grid-template-rows:minmax(120px,1fr) auto minmax(120px,1fr)` and the opponent card uses `align-self:center`, so row 1 expands and centres the seat inside a tall track;
- VIS-04B correctly moved the Safe Zone just below the seats, but it therefore followed the seats' unnecessarily-low Y position.

The previously assigned VIS-05A Side Column task has not started and is deferred. Fix the visible Top Row vertical anchor first.

# NEXT TASK — UX2.0VIS-04C: Anchor Compact Top-Row Seats to the Actual Top Band

## Objective
In 2–4 player Top Row Mode, make the already-accepted compact opponent thumbnails sit at the actual top of the player-board area instead of being vertically centred inside a large flexible grid row.

Then retune only the Top Row Safe Zone top so it continues to begin 6–24px below the newly-anchored row.

This is a vertical-placement correction only.

## Production scope
Expected:
- `app/globals.css`

Regression:
- `tests/browser/ui19.spec.mjs`

Do not modify `app/page.tsx`, `app/sequence-overrides.css`, game helpers, server/projector or fixtures unless strictly required by an existing test harness.

## Required implementation

### 1. Remove the legacy expanding first-row behaviour in Top Row mode
Under:

`.player-board[data-seat-topology="top-row"]`

the first grid row must size to the opponent thumbnail band rather than consuming `1fr`.

Preferred approach:
- make row 1 content-sized / fixed to the existing thumbnail height;
- keep the remaining unused board area flexible below it;
- change top-row opponent alignment from vertical centring to top alignment.

Equivalent CSS is acceptable if it produces the same geometry.

Do not change the generic legacy `.player-board` row model globally.

### 2. Keep the existing player-board outer top inset
Preserve the accepted Top Row player-board top insets:
- desktop: 68px;
- <=700: 60px;
- <=480: 55px.

These offsets reserve space for existing battlefield chrome/controls.

Do not move the whole player-board upward.

### 3. Preserve all accepted seat X geometry and dimensions
Do not change:
- 2-player centre mapping;
- 3-player left/right mapping;
- 4-player left/centre/right mapping;
- seat widths/heights;
- hero-region height;
- Hand footer height;
- hidden top-row Equipment/Judgement treatment;
- target/Inspect behaviour;
- player identity / relativeIndex.

The only seat change is Y anchoring within the existing player-board.

### 4. Seat-top contract
At 1440x900, 650x900 and 480x900, for counts 2/3/4:

`seatTop - playerBoardTop`

must be:
- >= 0px;
- <= 4px.

All opponents in the same room must still share one row within the existing <=4px Y tolerance.

This new regression must fail against the current pre-VIS-04C CSS where row 1 expands and centres the seats.

### 5. Retune Safe Zone top after moving seats
Because seats move upward, update only the Top Row `--interaction-safe-top` values / equivalent top geometry so:

`safeZone.top - maxOpponentBottom`

remains:
- >= 6px;
- <= 24px.

Do not change:
- safe-zone left/right/bottom;
- play-table height;
- Stage width or internals;
- LocalPlayerDock.

Do not leave the current 253/245/260 values if they create a large dead band after the seats move.

### 6. Preserve all accepted active-state containment
For count=4 at 1440/650/480, retain:
- interaction;
- negation;
- dying;
- group-observer.

For each state assert:
- max opponent bottom <= Stage top - 6px;
- Stage fully inside Safe Zone;
- Reaction Chain / Dying remains fully visible where applicable;
- Hero Focus dimensions unchanged;
- Medium Source dimensions unchanged where applicable;
- Stage/Safe Zone do not overlap LocalPlayerDock;
- no horizontal page overflow.

Do not shrink or recompose Stage content.

### 7. REST composition
At REST:
- no Interaction Stage is visible;
- Safe Zone remains invisible geometry only;
- deck/discard may remain in the central battlefield as today;
- opponent thumbnails must visually read as a real top row, leaving the large open centre below them rather than a large empty band above them.

### 8. Side Column remains untouched
Counts 5–10 keep the current side-column behaviour exactly as-is in this task.

Do not start the deferred VIS-05A implementation.

## Required browser regression

### A. Top-row anchor matrix
REST, counts 2/3/4, widths 1440/650/480:
- seat count N-1;
- exact existing relativeIndex/X mapping;
- exact existing VIS-04A seat width/height;
- all seat tops within 0–4px of player-board top;
- same-row Y spread <=4px;
- Safe Zone clearance 6–24px below max seat bottom;
- one LocalPlayerDock;
- no overflow.

### B. Active containment matrix
Count=4, widths 1440/650/480, states:
- interaction;
- negation;
- dying;
- group-observer.

Retain all VIS-04B containment and VIS-03 participant-size assertions.

### C. Old-geometry negative proof
Add one named 480x900 REST regression proving the pre-VIS-04C flexible-row/centre alignment would place the opponent row materially below the player-board top, while the new geometry satisfies the <=4px anchor contract.

Do not implement this by testing source-code strings; use rendered geometry.

### D. Side-column negative regression
At count=6, widths 1440 and 480:
- topology remains side-column;
- no Side Column seat geometry/style changes caused by VIS-04C.

## Forbidden shortcuts
Do not:
- change opponent widths/heights;
- change player-board outer top inset;
- use transform translate to fake the Y position;
- use JS DOM measurements;
- move Safe Zone bottom;
- change LocalPlayerDock;
- change Stage/Hero/Medium Source internals;
- change deck/discard geometry;
- change Side Column;
- change gameplay/presentation semantics.

## Validation
Run and report:
- focused VIS-04C top-anchor tests;
- retained VIS-04A compact-seat tests;
- retained VIS-04B containment tests;
- retained VIS-03B/C/D/E presentation tests;
- broader local checks only if allowed.

Do not claim unrun checks. Do not inspect or wait for CI.

## Execution result
Append only:
- implementation SHA;
- files changed;
- old vs new Top Row grid-row/alignment strategy;
- measured playerBoardTop / seatTop / seatBottom / safeZoneTop at 1440/650/480;
- proof widths/heights/X anchors stayed unchanged;
- active-state containment results;
- Side Column negative regression result;
- any GAP.

Do not self-accept. Push, verify remote HANDOVER, then STOP.

## Acceptance
Pass only if 2–4 player opponent thumbnails are actually anchored to the top of the existing player-board band, retain all accepted size/X/behaviour contracts, Safe Zone follows 6–24px below them, active states remain fully contained, and Side Column/gameplay are unchanged.

## Execution result — UX2.0VIS-04C (2026-10-04)

- Implementation SHA: `e7d898d3474ee0b8e028c32e15fa9e82c37741a6` (`Anchor compact top-row seats to board top`). Changed `app/globals.css` and `tests/browser/ui19.spec.mjs`; this section is the only `HANDOVER.md` change.
- Top Row strategy: row 1 changed from `minmax(120px,1fr)` with opponent `align-self:center` to `max-content` with `align-self:start`; the remaining board space is flexible below it. The player-board outer top insets remain 68/60/55px. Top Row Safe Zone top changed from desktop 253px / <=650 245px / <=480 260px to desktop 190px / <=700 164px / <=480 149px; only its top is retuned. The 651–700px breakpoint now uses 164px to follow the existing 60px board inset.
- Measured 4-player REST geometry (the same row geometry is asserted for 2/3/4 players):

  | Viewport | playerBoardTop | seatTop | seatBottom | safeZoneTop | Clearance |
  | --- | ---: | ---: | ---: | ---: | ---: |
  | 1440×900 | 68px | 68px | 176px | 190px | 14px |
  | 650×900 | 60px | 60px | 148px | 164px | 16px |
  | 480×900 | 55px | 55px | 133px | 149px | 16px |

- Seat size/X proof: 1440 retains 180×108px at X=10/630/1250; 650 retains 112×88px at X=21.5/269/516.5; 480 retains 100×78px at X=15.5/190/364.5. The 2-player centre and 3-player left/right mappings, relative indices, same-row alignment, and one LocalPlayerDock are asserted. The rendered old-geometry simulation at 480 places seats 110.5px below the board top and fails the <=4px anchor contract; the new geometry places them 0px below it.
- Active-state containment: the new Interaction, Negation, Dying, and group-observer matrix passes at 1440/650/480 with opponent-to-Stage separation, Stage/Safe Zone and dock containment, unchanged Hero Focus and Medium Source portrait dimensions, visible Reaction Chain/Dying handoff, and no horizontal overflow. The retained VIS-04B matrix additionally confirms REST Safe Zone invisibility and no scrolling/clipping.
- Side Column negative regression: 6-player geometry and `align-self:center` baseline remain unchanged at 1440 and 480; both cases pass. No side-column CSS, Stage internals, deck/discard geometry, LocalPlayerDock, gameplay, or projection logic changed.
- Validation actually run: VIS-04C focused browser tests **26 passed**; retained VIS-04A, VIS-04B, and VIS-03B/C/D/E browser tests **68 passed**. Full browser suite, full tests, build, lint, and `git diff --check` were not run under the remote-validation workflow; GitHub Actions owns the remaining gate validation and was not inspected.
- GAP: no known failure in the scoped browser contracts. A fresh real-iPhone screenshot was not captured; reviewer should inspect that composition and decide VIS-04C acceptance before assigning further work. VIS-05A remains deferred.
