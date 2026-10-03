# WTK UI / Layout — Current Task Handoff

## REMOTE HANDOVER RULE
HANDOVER.md contains only the current reviewer state, one current task, and that task's execution result. Work only on branch `ux-v2`.

Agent sequence:
1. fetch/pull `origin/ux-v2`
2. read this HANDOVER and `docs/PLANNER_DEVELOPMENT_WORKFLOW.md`
3. implement only the task below
4. run the required validation
5. append only this task's execution result
6. commit + push implementation and HANDOVER to `origin/ux-v2`
7. fetch origin and verify remote HANDOVER contains the result
8. STOP

Do not wait for or poll CI.

## Reviewer status — UX2.0VIS-04A ACCEPTED

Reviewed implementation: `b2c903214d62e992575e9dcb153b25d19ca6f400`.

Accepted facts to preserve:
- 2–4 player top-row opponents are now real landscape thumbnails rather than tall full public-zone cards;
- measured 4-player seats are 180x108 at 1440, 112x88 at 650, and 100x78 at 480;
- player name, hero name, HP, Hand count and hero artwork remain visible;
- full Equipment and Judgement card faces are visually hidden only in top-row thumbnails while underlying public data remains mounted and available through the existing Inspect overlay;
- target/Inspect behavior, relative seat anchors/order, semantic seat roles and LocalPlayerDock were not changed;
- Side Column mode was not changed;
- focused VIS-04A browser coverage reported 13/13 PASS plus 3/3 compact-geometry rerun;
- the retained 47/51 result exposes one pre-existing geometry GAP rather than a VIS-04A regression: Dying at 650x900 extends to ~591.94px while the current safe-zone bottom is ~586px.

Do not reopen VIS-04A.

# NEXT TASK — UX2.0VIS-04B: Reclaim the Vertical Gap Below Compact Top-Row Seats

## Objective
Use the space freed by VIS-04A.

**Move only the 2–4 player top-row Interaction Safe Zone upward so it starts shortly below the new compact opponent row instead of retaining the old large-seat top offsets.**

This must:
- remove the large dead gap between thumbnails and Interaction Stage;
- increase usable central height;
- close the known Dying@650 containment failure;
- preserve all accepted seat, Stage-content, Hero, Medium Source and LocalPlayerDock geometry.

This is a safe-zone-top geometry task only.

## Current measured facts
VIS-04A measured 4-player opponent bounds:
- 1440x900: y=131.5, h=108, bottom≈239.5
- 650x900: y=141.25, h=88, bottom≈229.25
- 480x900: y=165.5, h=78, bottom≈243.5

Current old safe-zone CSS still uses:
- desktop: `--interaction-safe-top:385px`
- <=650: `319px`
- <=480: `326px`

Those values were chosen before compact thumbnails and now leave unnecessary vertical dead space.

Known retained failure:
- Dying at 650x900: Stage bottom≈591.94 while safe-zone bottom≈586.

## Files expected in scope
Production:
- `app/globals.css`

Regression:
- `tests/browser/ui19.spec.mjs`

Do not modify `app/page.tsx`, `app/sequence-overrides.css`, game helpers, server/projector, gameplay or fixtures unless a test fixture is strictly required to expose an existing state.

## Required implementation

### 1. Change only top-row safe-zone TOP geometry
Keep:
- safe-zone left/right;
- safe-zone bottom;
- Stage width;
- Stage internal layout;
- play-table height;
- LocalPlayerDock geometry.

Change only the top-row `--interaction-safe-top` values / equivalent CSS needed to place the Safe Zone immediately after the compact row.

No JavaScript measurements, ResizeObserver, timers or runtime DOM repositioning.

### 2. Clearance contract
At 1440x900, 650x900 and 480x900, for 2-, 3- and 4-player top-row layouts:

`safeZone.top - maxOpponentBottom`

must be:
- at least **6 CSS px**;
- no more than **24 CSS px**.

This is the real contract. Do not hard-code tests to one exact top value.

The Stage must begin inside that Safe Zone and must not overlap opponents.

### 3. Preserve compact seats exactly
Do not change:
- VIS-04A seat width/height;
- hero-region height;
- Hand footer height;
- anchor X/Y placement;
- hidden top-row Equipment/Judgement treatment;
- Inspect behavior;
- target behavior.

If moving the safe zone reveals a seat-overlap problem, fix the safe-zone top only; do not move seats.

### 4. Close the known 650 Dying gap
For `state="dying", count=4, 650x900`:
- Stage must be fully inside Safe Zone;
- Stage bottom <= safeZone.bottom + 4px;
- Stage bottom <= playTable.bottom - 1px;
- no clipping/scrolling/scaling;
- Dying handoff remains fully visible;
- LocalPlayerDock remains unobstructed.

Do not shrink Dying content to make this pass.

### 5. Preserve all accepted Interaction states
At 1440/650/480, count=4, retain containment for:
- interaction;
- negation;
- dying;
- group-observer.

For each:
- max opponent bottom <= Stage top - 6px;
- Stage fully inside Safe Zone;
- Safe Zone and Stage do not overlap LocalPlayerDock;
- no horizontal page overflow;
- Hero Focus dimensions unchanged;
- Medium Source dimensions unchanged where present;
- Reaction Chain / Dying panel remains visible where applicable.

### 6. REST still has invisible geometry only
At REST:
- `.interaction-safe-zone` remains exactly once;
- no Interaction Stage is rendered;
- safe zone has no background/border/placeholder/control.

Moving the safe-zone top must not create visible empty chrome.

### 7. Side Column is untouched
For count=6 at 1440 and 480:
- `data-seat-topology="side-column"` remains;
- side-column seat geometry remains unchanged;
- no new safe-zone top rule should accidentally alter side-column placement.

## Required browser regression

Extend `tests/browser/ui19.spec.mjs`.

### A. Safe-zone reclaimed-gap matrix
For REST at counts 2, 3, 4 and widths 1440, 650, 480:
- measure every opponent bottom;
- measure Safe Zone top;
- assert clearance is 6–24px;
- assert VIS-04A seat dimensions/order remain unchanged;
- assert one LocalPlayerDock;
- no horizontal overflow.

### B. Active-state containment matrix
For count=4 at 1440/650/480, run:
- interaction;
- negation;
- dying;
- group-observer.

Assert the containment rules in sections 4–5.

### C. Explicit previous failure proof
Add a named regression for Dying 650x900 proving:
- current pre-VIS-04B geometry would fail;
- new geometry contains the full Stage and Dying handoff.

Do not weaken/remove the existing VIS-02/VIS-03 assertions. The goal is to make the previously failing 650 Dying assertions green.

## Forbidden shortcuts
Do not:
- move/shrink opponent thumbnails;
- change safe-zone bottom;
- increase play-table height;
- move/shrink LocalPlayerDock;
- shrink Hero Focus or Medium Source;
- hide/collapse Reaction Chain, Dying or Meta;
- add scrolling/clipping/scale transforms;
- use JS geometry;
- change Side Column mode;
- change gameplay/presentation semantics;
- redesign Stage content.

## Validation
Run and report:
- focused VIS-04B reclaimed-gap tests;
- retained VIS-04A compact-seat tests;
- retained VIS-02 / VIS-03B/C/D/E tests;
- `npm run test:browser` if allowed locally;
- `npm run test:fast` if allowed locally;
- `npm run build` if allowed locally;
- `npm run lint` if allowed locally;
- `git diff --check`.

Do not claim unrun commands passed. Do not inspect or wait for CI.

## Execution result
Append only:
- implementation SHA;
- files changed;
- old vs new safe-zone-top strategy;
- measured opponent-bottom / safe-zone-top / clearance at 1440, 650, 480;
- Dying@650 before/after Stage and Safe Zone bounds;
- focused/retained validation results;
- any remaining GAP.

Do not declare VIS-04B accepted. Reviewer decides after inspection.

Push and verify remote HANDOVER, then STOP.

## Acceptance
Pass only if the 2–4 player Safe Zone begins 6–24px below the compact opponent row across 1440/650/480, all accepted active states remain contained, the known 650 Dying overflow is closed without shrinking content, and seats/Side Column/LocalPlayerDock/gameplay remain unchanged.
