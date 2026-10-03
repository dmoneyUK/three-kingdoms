# WTK UI / Layout — Current Task Handoff

## REMOTE HANDOVER RULE
HANDOVER.md is the single current task/execution file. Commit and push implementation + appended execution result to origin/ux-v2, fetch origin, verify origin/ux-v2:HANDOVER.md contains the result, then STOP.

Read docs/PLANNER_DEVELOPMENT_WORKFLOW.md before implementation.

# NEXT TASK — UX2.0VIS-01: Correct 2–4 Player Opponent Seats to a Real Top Row

## Objective
Fix one visual-layout defect only:

**For games with 2–4 total players, every opponent seat must render in one stable top row above the battlefield instead of using the current legacy horseshoe positions.**

Do not redesign Interaction Stage, Hero Focus, the central battlefield, or the local dock in this task.

## Existing accepted truth
The UX V2 design already defines:
- 2–4 total players = top-row opponent topology;
- the local player remains in the persistent bottom LocalPlayerDock;
- opponent anchors remain persistent public seat thumbnails;
- interactions must not move/reorder seat identity;
- gameplay targeting/click behavior must remain unchanged.

Current production already emits:
- `data-seat-topology="top-row"` when `room.players.length < 5`;
- opponent seats only in `.player-board`;
- the local player only in `LocalPlayerDock`.

The defect is CSS/layout: the generic rules still place `.player-square-1` left-middle, `.player-square-2` top-middle, and `.player-square-3` right-middle, which visually recreates the legacy horseshoe even when the DOM says `top-row`.

## Required implementation

### 1. Add topology-specific top-row placement
In `app/globals.css`, add explicit rules scoped to:

`[data-seat-topology="top-row"]`

Do not rely on the generic `.player-square-1/.2/.3` horseshoe rules for 2–4 player games.

Required mapping by **total player count**:

- **2 players total**: one opponent (`relativeIndex=1`) centered in the top row.
- **3 players total**: two opponents (`relativeIndex=1,2`) placed left and right in the same top row.
- **4 players total**: three opponents (`relativeIndex=1,2,3`) placed left / center / right in the same top row.

Preserve relativeIndex order left-to-right: 1, then 2, then 3.

Use the existing `data-player-count` attribute to make the mapping explicit where needed.

### 2. Do not change seat identity or behavior
Do not modify:
- `room.players` ordering;
- `relativeIndex` calculation;
- target legality;
- target click handlers;
- Inspect behavior;
- semantic role classes;
- turn/action/defeated/local-selection highlights;
- local dock rendering.

This is position/layout only.

### 3. Do not touch the Interaction Stage yet
The current top-wide Interaction Stage is a separate defect and will be handled only after this task is reviewed.

For VIS-01:
- do not change `InteractionStage` JSX;
- do not change `.interaction-stage` size/position;
- do not enlarge Hero Focus;
- do not introduce a central safe-zone container;
- do not redesign opponent card content.

The purpose of this task is to make the seat topology itself truthful first.

### 4. Responsive behavior
The top-row mapping must remain true at:
- desktop 1440x900;
- 650x900;
- 480x900.

At all three widths:
- all opponents in a 2–4 player game remain on one row;
- no opponent is positioned in a left-middle/right-middle horseshoe slot;
- no horizontal page overflow is introduced;
- the local dock remains present exactly once.

Do not add a second mobile-only seat topology.

## Required browser regression
Extend the existing Playwright layout coverage in `tests/browser/ui19.spec.mjs` (or the smallest existing browser layout file).

Add real geometry assertions, not only a check of the `data-seat-topology` string.

For 2, 3, and 4 total players:
1. assert opponent anchor count = N - 1;
2. assert one local dock anchor remains;
3. assert opponent bounding boxes have approximately the same top/Y position (small tolerance is acceptable);
4. assert their horizontal centers increase in relativeIndex order;
5. for 4 players specifically, prove relativeIndex 1/2/3 are left/center/right rather than left-middle/top/right-middle;
6. run at 1440px and 480px widths at minimum; retain the existing 650px matrix.

The new regression must fail against the old horseshoe CSS.

## Validation
Run:
- focused browser test(s) covering this topology change;
- `npm run test:browser`;
- `npm run test:fast`;
- `npm run build`;
- `npm run lint`;
- `git diff --check`.

Report actual counts/status only.

## Scope exclusions
Do not:
- change Interaction Stage layout;
- change Hero Focus;
- implement the central enlarged combat presentation;
- change 5–10 player side-column layout;
- change local dock layout;
- change gameplay/server/projector/presentation semantics;
- perform unrelated CSS cleanup.

## Execution result
Append only the VIS-01 execution result:
- implementation SHA;
- files changed;
- exact CSS mapping for 2/3/4 players;
- browser geometry assertions added;
- before/after defect statement;
- validation commands and exact results;
- any remaining issue discovered inside this task scope.

Push and verify remote HANDOVER, then STOP.

## Acceptance
VIS-01 passes only if 2–4 player games visually use a genuine single opponent top row at desktop and mobile widths, relative seat order is preserved, the old horseshoe placement is impossible under `top-row`, browser geometry tests prove the change, and no Interaction Stage/gameplay/local-dock scope is changed.
