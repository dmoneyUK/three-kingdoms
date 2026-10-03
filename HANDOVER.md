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

## Reviewer status — UX2.0VIS-03E ACCEPTED

Reviewed implementation: `74a39c3d68ed9510281d3340186b2dc3f5af23e3`.

Accepted facts that the next task must preserve:
- Medium Source projection is isolated in `projectMediumSourceForViewer`;
- it renders only when the viewer-projected Large primary is a proven active target and the source is a different external player;
- viewer-owned source, source==primary, non-active-target primary and missing source all fail closed;
- `buildHeroFocusView` and `projectHeroFocusForViewer` semantics were not changed;
- the central Medium Source is a separate read-only presentation copy; the fixed source seat remains mounted in `.player-board`;
- the Group/AOE observer fixture uses viewer p3, source p4, active scope p1/p2/p3 and current participant p1 without using CurrentAction as public presentation authority;
- Medium Source portrait sizes are 56x70 desktop, 48x60 at 481–650 and 42x53 at <=480; Large Hero Focus sizes remain unchanged;
- focused Medium Source unit coverage reported 1/1 PASS and focused browser coverage reported 6/6 PASS;
- no server/projector/gameplay/layout-authority changes were found in the reviewed diff.

Do not reopen VIS-03E.

# NEXT TASK — UX2.0VIS-04A: Convert 2–4 Player Top-Row Opponents into True Compact Seat Thumbnails

## Objective
Fix exactly one remaining visual-hierarchy defect:

**In 2–4 player Top Row Mode, opponent seats must read as compact fixed seat thumbnails rather than full portrait cards with full public zones.**

Current top-row seats are still visually too large:
- the opponent hero area uses a tall `2 / 3` portrait card;
- the seat also renders the full Equipment grid and optional Judgement card faces;
- the resulting seat can be taller/more visually dominant than the enlarged central Hero Focus.

UX V2 explicitly requires:
- fixed **Seat Thumbnails** for topology/distance context;
- Top Row Mode may use a **wider compact thumbnail** because vertical height is valuable;
- full skills/equipment names/full Judgement cards/long status text do not belong in seat thumbnails;
- detailed public Equipment/Judgement information belongs in public Inspect / Interaction presentation.

This task changes only **Top Row opponent-seat density and appearance**.

Do not move the top-row anchors.
Do not reclaim/move the Interaction Safe Zone yet.
Do not change Side Column seats yet.

## Current production facts
The current top-row geometry is already accepted:
- 2 players: relative seat 1 top-centre;
- 3 players: relative seats 1/2 top-left/top-right;
- 4 players: relative seats 1/2/3 top-left/top-centre/top-right.

Current opponent visual CSS is split:
- top-row placement/width overrides in `app/globals.css`;
- opponent card/portrait/public-zone styling in `app/sequence-overrides.css`.

Current full opponent surface includes:
- hero portrait;
- player/hero identity;
- HP/hearts;
- Equipment grid;
- optional Judgement card faces;
- Hand count footer.

Preserve the same player anchor and target/inspect behavior.

## Files expected in scope
Production:
- `app/globals.css`
- `app/sequence-overrides.css`

Optional production change only if needed for compact public-presence badges:
- `app/page.tsx`

Regression:
- `tests/browser/ui19.spec.mjs`

Do not change presentation/game/server helpers.

## Required implementation

### 1. Top-row seats become wider-than-tall thumbnails
Scope all compact rules under:

`.player-board[data-seat-topology="top-row"]`

Do not globally change `.opponent-player-card`.

For top-row opponents:
- remove the tall portrait-card `2 / 3` visual proportion;
- use a compact wider-than-tall seat shell;
- retain rounded frame, existing turn/action/selection/semantic-role treatments;
- hero artwork remains visible;
- player name, hero name, HP and Hand count remain visible.

Target maximum total seat heights:
- >700px viewport: **<=110 CSS px**
- 481–700px: **<=92 CSS px**
- <=480px: **<=82 CSS px**

The final seat bounding box must satisfy:

`seat width > seat height`

at 1440x900, 650x900 and 480x900.

Do not use transform scaling. Implement real layout dimensions.

### 2. Keep the hero face useful in compact geometry
For top-row mode only:
- change `.opponent-hero-card` from a tall 2:3 portrait region to a compact landscape/wide hero region;
- continue using the existing public HeroPortrait artwork and `object-fit:cover`;
- keep the identity overlay readable;
- keep HP visible;
- hearts may be compacted or hidden if HP text remains visible;
- the hero info affordance must remain reachable.

Do not change the HeroPortrait asset or hero identity.

### 3. Remove full Equipment/Judgement card faces from the thumbnail
For Top Row Mode only:
- do not visually render the full `.opponent-equipment-zone` card grid inside the seat;
- do not visually render full `.opponent-judgement-zone` card faces beside the seat;
- do not delete the underlying public player data;
- do not change the existing `OpponentInspectionOverlay`.

Detailed public Equipment/Judgement remains available through Inspect.

If you add compact presence indicators, keep them limited to counts:
- Equipment count;
- Judgement count.

Do not render equipment names, card faces or role details inside the compact top-row thumbnail.

If count indicators are added:
- use stable hooks such as `data-thumbnail-equipment-count` and `data-thumbnail-judgement-count`;
- do not change Side Column visual output.

### 4. Preserve Hand count as a compact status
The Hand count remains public and must stay directly visible in the thumbnail.

You may compact:
- "Hand cards 5"

to a smaller treatment such as:
- "HAND 5"
or equivalent existing-language copy.

Do not expose card identities.

### 5. Preserve targeting and Inspect behavior
Do not change:
- `data-player-anchor`;
- relative seat classes;
- target legality;
- target selection click path;
- selected-target treatment;
- interaction semantic role classes/data;
- turn/action/defeated states;
- public Hero info behavior;
- public OpponentInspectionOverlay;
- LocalPlayerDock.

Outside target-selection mode, clicking the opponent hero body must still open public Inspect exactly as before.

Do not move the actual seat DOM into Interaction Stage.

### 6. Do not move the Safe Zone in this task
Keep the accepted values unchanged:
- desktop `--interaction-safe-top:385px`
- <=650 `319px`
- <=480 `326px`

The next reviewer task will reclaim the vertical space only after the compact seat bounds are proven.

Also do not change:
- InteractionStage width/position;
- Hero Focus dimensions;
- Medium Source dimensions;
- Reaction/Dying/Meta composition;
- LocalPlayerDock geometry.

## Required browser regression

Use 4-player top-row fixtures at:
- 1440x900
- 650x900
- 480x900

### A. Compact-seat geometry
For `state="rest", count=4` assert:

1. exactly 3 opponent anchors;
2. all three remain on one top row within the existing <=4px Y tolerance;
3. horizontal centre order remains relativeIndex 1 < 2 < 3;
4. each opponent seat has `width > height`;
5. each seat height is within the viewport-specific maximum:
   - 1440: <=110px
   - 650: <=92px
   - 480: <=82px
6. no opponent seat overlaps another;
7. no horizontal page overflow;
8. LocalPlayerDock still exists exactly once.

### B. Compact content contract
For the same cases assert:
- player name visible;
- hero name visible;
- HP text visible;
- Hand count visible;
- the full top-row Equipment grid is not visibly occupying seat height;
- the full top-row Judgement card-face panel is not visibly occupying space when present.

Do not test by deleting DOM nodes; this is a visual-density contract.

### C. Inspect remains available
At least at 480x900 and 1440x900:
- load a non-target-selection top-row fixture;
- click one opponent hero body;
- assert the existing `.opponent-inspection-panel` opens;
- close it and prove the same seat anchor remains.

Do not redesign Inspect.

### D. Interaction hierarchy regression
At `state="interaction", count=4` for 1440/650/480:
- Large Hero Focus remains at the accepted VIS-03B size;
- every top-row seat total height is less than the Large Hero Focus portrait height;
- opponent row stays above the Interaction Stage;
- existing Safe Zone containment remains true;
- viewer/local hero remains only in LocalPlayerDock.

### E. Side-column negative regression
At `state="rest", count=6` at 480x900 and 1440x900:
- `data-seat-topology="side-column"` remains;
- the top-row compact width/height rules do not apply;
- existing Side Column Equipment/Judgement presentation is not hidden by the new top-row selectors.

Do not attempt to improve Side Column layout in this task.

## Forbidden shortcuts
Do not:
- move/reorder opponent anchors;
- change player identity or relativeIndex;
- shrink the entire board using CSS transform;
- hide player/hero name, HP or Hand count;
- delete public Equipment/Judgement state from room data;
- remove public Inspect;
- change target click behavior;
- move Safe Zone upward yet;
- resize Large Hero Focus or Medium Source;
- change 5–10 player layout;
- change gameplay/server/projector/presentation semantics.

## Validation
Run and report:
- focused VIS-04A browser tests;
- retained VIS-01 top-row geometry tests;
- retained VIS-02 / VIS-03B/C/D/E geometry/presentation tests;
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
- final seat width/height strategy for >700, 481–700 and <=480;
- what top-row content remains directly visible;
- how Equipment/Judgement detail remains accessible;
- measured 4-player seat bounds at 1440/650/480;
- proof seat order/anchors did not move;
- focused/retained validation results;
- any remaining GAP.

Do not declare VIS-04A accepted. Reviewer decides after inspection.

Push and verify remote HANDOVER, then STOP.

## Acceptance
Pass only if 2–4 player Top Row opponents are genuine compact, wider-than-tall thumbnails with visible identity/HP/Hand count, full Equipment/Judgement card faces no longer consume top-row seat space, fixed seat anchors/targeting/Inspect remain intact, the Large central Hero remains visually larger, Side Column mode is untouched, and Safe Zone geometry is not moved in this task.
