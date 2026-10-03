# WTK UI / Layout — Current Task Handoff

## REMOTE HANDOVER RULE
HANDOVER.md is the single current task/execution file. Work only on branch `ux-v2`.

Agent sequence:
1. `git fetch origin`
2. checkout/pull `ux-v2`
3. read the current remote `HANDOVER.md`
4. implement only the task below
5. run the required validation
6. append the execution result to this HANDOVER
7. commit and push implementation + HANDOVER to `origin/ux-v2`
8. `git fetch origin`
9. verify `origin/ux-v2:HANDOVER.md` contains the execution result
10. STOP

Read `docs/PLANNER_DEVELOPMENT_WORKFLOW.md` before implementation.

# NEXT TASK — UX2.0VIS-01: Correct 2–4 Player Opponent Seats to a Real Top Row

## Objective
Fix exactly one visual-layout defect:

**For games with 2–4 total players, every opponent seat must render in one stable top row above the battlefield instead of using the current legacy horseshoe positions.**

This task changes opponent-seat position only. Do not redesign Interaction Stage, Hero Focus, the central battlefield, opponent-card content, or the local dock.

## Existing accepted truth
The UX V2 design already defines:
- 2–4 total players = top-row opponent topology;
- the local player remains in the persistent bottom `LocalPlayerDock`;
- opponent anchors remain persistent public seat thumbnails;
- an interaction must not move/reorder opponent seat identity;
- gameplay targeting/click behavior must remain unchanged.

Current production already emits:
- `data-seat-topology="top-row"` when `room.players.length < 5`;
- `data-player-count={room.players.length}` on `.player-board`;
- opponent seats only inside `.player-board`;
- the local player only inside `LocalPlayerDock`.

The current defect is layout CSS. Generic rules still map:
- `.player-square-1` -> left-middle;
- `.player-square-2` -> top-middle;
- `.player-square-3` -> right-middle.

That recreates the legacy horseshoe even while the DOM says `top-row`.

## Production files in scope
Expected production change:
- `app/globals.css`

Expected regression change:
- `tests/browser/ui19.spec.mjs` or a smaller existing browser layout spec if one already fits better.

Do not change `app/page.tsx` unless a missing stable test hook is proven necessary. If you believe JSX must change for another reason, STOP and report the blocker instead of broadening this task.

## Required implementation

### 1. Add topology-specific top-row CSS
Add explicit selectors scoped to:

`[data-seat-topology="top-row"]`

Use `data-player-count` to make the mapping deterministic.

Required visual mapping:

#### 2 total players
Only opponent `relativeIndex=1` exists.

Expected geometry:
- row: top row
- horizontal position: centre

Equivalent grid mapping with the existing 3-column board:
- `.player-square-1` -> `grid-row: 1; grid-column: 2`

#### 3 total players
Opponents `relativeIndex=1,2`.

Expected left-to-right order:
- index 1 = left
- index 2 = right

Equivalent mapping:
- `.player-square-1` -> `grid-row: 1; grid-column: 1`
- `.player-square-2` -> `grid-row: 1; grid-column: 3`

#### 4 total players
Opponents `relativeIndex=1,2,3`.

Expected left-to-right order:
- index 1 = left
- index 2 = centre
- index 3 = right

Equivalent mapping:
- `.player-square-1` -> `grid-row: 1; grid-column: 1`
- `.player-square-2` -> `grid-row: 1; grid-column: 2`
- `.player-square-3` -> `grid-row: 1; grid-column: 3`

You may use equivalent CSS only if the browser geometry proves exactly the same result.

Do not reuse the generic horseshoe row assignments when `data-seat-topology="top-row"`.

### 2. Preserve seat identity and behavior
Do not modify:
- `room.players` ordering;
- `relativeIndex` calculation;
- `OpponentPlayerCard` target legality;
- target click handlers;
- Inspect behavior;
- semantic role classes/data attributes;
- turn/action/defeated/local-selection highlights;
- local dock rendering;
- CurrentAction / PresentationSnapshot semantics.

This task is layout only.

### 3. Do not touch Interaction Stage or Hero Focus
The top-wide Interaction Stage is a separate known defect and will be assigned only after VIS-01 is reviewed.

Do not change:
- `InteractionStage` JSX;
- `.interaction-stage` position/size;
- Hero Focus JSX/CSS;
- central safe-zone geometry;
- Reaction Chain/Dying/Duel presentation;
- opponent card dimensions/content.

### 4. Responsive contract
The same top-row topology must remain true at:
- 1440x900
- 650x900
- 480x900

At every required width:
- all opponents for 2–4 total players occupy the same top row;
- no opponent occupies a left-middle or right-middle horseshoe position;
- seat order remains 1 -> 2 -> 3 from left to right;
- there is no horizontal page overflow introduced by this change;
- exactly one local dock remains present;
- no mobile-only alternate topology is introduced.

## Required browser regression
Extend the existing Playwright layout coverage. Do not rely only on the `data-seat-topology` string.

Add geometry assertions for **2, 3 and 4 total players**.

At minimum execute the new assertions at:
- 1440x900
- 480x900

Retain the existing 650px matrix and make sure the new CSS does not break it.

For each case assert:
1. opponent anchor count = totalPlayers - 1;
2. local dock anchor count = 1;
3. all opponent seat bounding boxes have the same top/Y position within a tolerance of **4 CSS pixels**;
4. horizontal centres are strictly increasing in relativeIndex order;
5. no two opponent bounding boxes have severe overlap;
6. document/page width does not exceed viewport width because of this change.

For 4 total players additionally assert:
- `.player-square-1`, `.player-square-2`, `.player-square-3` are all in the same top row;
- centreX(index1) < centreX(index2) < centreX(index3);
- the regression would fail against the old horseshoe CSS because indices 1 and 3 previously occupied middle-row positions.

Use the existing `player-square-N` classes as the relative-index test hook. Do not add a new production data attribute merely for this test unless absolutely necessary.

## Negative regression / forbidden shortcut
The following implementation is NOT acceptable:
- only changing `data-seat-topology` while leaving geometry unchanged;
- hiding one of the opponent seats;
- changing seat DOM order to make the X-order assertion pass;
- moving the local player into `.player-board`;
- shrinking/repositioning Interaction Stage to make the screenshot look better;
- adding viewport-specific JSX branches.

The browser geometry test must prove the actual seat positions changed.

## Validation
Run and report actual results for:
- focused Playwright topology test(s);
- `npm run test:browser`;
- `npm run test:fast`;
- `npm run build`;
- `npm run lint`;
- `git diff --check`.

Report exact counts where the runner provides them. Do not claim unrun commands passed.

## Scope exclusions
Do not:
- change Interaction Stage layout;
- change Hero Focus;
- implement the central enlarged combat presentation;
- change 5–10 player side-column layout;
- change local dock layout;
- change opponent-card visual content/size;
- change gameplay/server/projector/presentation semantics;
- perform unrelated CSS cleanup;
- start VIS-02 or any later layout task.

## Execution result
Append only the VIS-01 execution result:
- full implementation SHA;
- files changed;
- exact CSS mapping used for 2/3/4 players;
- browser geometry assertions added;
- proof that old horseshoe geometry would fail the new regression;
- validation commands with exact results/counts;
- any remaining issue discovered inside VIS-01 scope.

Do not declare VIS-01 accepted/closed. The Planner/Reviewer does that after review.

Push and verify remote HANDOVER, then STOP.

## Acceptance
VIS-01 passes only if:
- 2–4 player games visually use a genuine single opponent top row at desktop and mobile widths;
- relative seat order 1 -> 2 -> 3 is preserved;
- the generic horseshoe geometry cannot apply under `top-row`;
- browser bounding-box tests prove the real geometry, not just DOM labels;
- exactly one local dock remains;
- no Interaction Stage/Hero Focus/gameplay/5–10-player scope is changed.
