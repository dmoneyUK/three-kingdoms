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

## Reviewer status — UX2.0VIS-01 ACCEPTED

Accepted implementation: `b263174771d812105c35eb4e97b46dce99342393`.

Verified facts:
- 2-player rooms: relative seat 1 is top-centre.
- 3-player rooms: relative seats 1/2 are top-left/top-right.
- 4-player rooms: relative seats 1/2/3 are top-left/top-centre/top-right.
- the mapping is scoped to `data-seat-topology="top-row"`;
- no Interaction Stage, Hero Focus, Local Dock, gameplay, or 5–10-player semantics were changed;
- the new Playwright geometry test uses real bounding boxes and would fail the previous horseshoe geometry;
- the focused VIS-01 browser suite reported 9/9 passed;
- later branch CI run 37149913858, which contains VIS-01 in its ancestry, completed successfully with lint, build, full browser suite, and `npm test` (build + fast + API).

Do not reopen VIS-01.

# NEXT TASK — UX2.0VIS-02: Reserve a Real Central Interaction Safe Zone in 2–4 Player Mode

## Objective
Fix exactly one remaining visual-layout defect for **2–4 total-player games**:

**The public Interaction Stage must occupy a dedicated central battlefield safe zone below the fixed top-row opponent seats instead of rendering as a top-wide absolute dashboard over the upper battlefield.**

This task changes the stage container/placement only.

Do **not** redesign the internal Interaction Stage content and do **not** enlarge Hero Focus yet. Those are later tasks after this geometry is reviewed.

## Existing accepted truth
Preserve:
- VIS-01 top-row seat geometry;
- opponent seat anchors stay fixed when an interaction starts;
- LocalPlayerDock remains the persistent bottom player/control surface;
- Interaction Stage is public/read-only;
- local gameplay controls stay in the Local Operation Console;
- InteractionStage/HeroFocus semantic identity continues to come from the accepted PresentationClientView path;
- no gameplay/server/projector authority is changed.

Current defect:
- `.interaction-stage` is directly under `.play-table`;
- it is absolutely positioned with `left:50%`, `top:14px` (7/8px at narrow widths), and width near the full viewport;
- in a 4-player interaction this places the information panel over the same upper area that now contains the fixed top-row opponent seats;
- the centre of the battlefield is not represented by a dedicated layout container.

## Files expected in scope
Expected production files:
- `app/page.tsx`
- `app/globals.css`

Expected regression file:
- `tests/browser/ui19.spec.mjs` or one smaller existing browser layout spec if clearly more appropriate.

Do not modify presentation/gameplay helpers unless a compile-only type change is unavoidable. If semantic logic appears necessary, STOP and report the blocker instead of expanding scope.

## Required implementation

### 1. Add one explicit central safe-zone layout container
Inside `.play-table`, replace only the current direct `InteractionStage` placement with one structural wrapper:

`<div className="interaction-safe-zone"> ...existing InteractionStage... </div>`

The wrapper should be an immediate `.play-table` child and should contain the existing InteractionStage only. Do not move the other existing play-table overlays/notices/dialogs into it.

Use `interaction-safe-zone` as the stable class/test hook unless there is a compile-level reason not to.

The wrapper is invisible layout geometry, not another panel:
- no background, border, heading, placeholder, or decorative dashboard of its own;
- no gameplay controls;
- no click handlers;
- no CurrentAction inspection;
- no duplicated player state;
- no semantic fallback logic.

### 2. Give play-table the existing topology context
The safe-zone CSS must know whether the room is in top-row mode without inferring it from child geometry.

Mirror the exact existing topology expression onto `.play-table`:

`data-seat-topology={room.players.length >= 5 ? "side-column" : "top-row"}`

You may also mirror `data-player-count={room.players.length}` if useful, but do not invent another player-count calculation.

Important existing-test consequence: `tests/browser/ui19.spec.mjs` currently uses a broad selector such as `[data-seat-topology="top-row"]` and expects one match. After mirroring the attribute onto `.play-table`, that selector will truthfully match both the table and the player board. Update the retained topology assertion to target the original owner explicitly, e.g. `.player-board[data-seat-topology="top-row"]`, rather than deleting the new layout hook or weakening the assertion.

This is a layout hook only. Do not change the authoritative player ordering or seat calculation.

### 3. Move the existing Interaction Stage into the safe zone for top-row rooms
For `data-seat-topology="top-row"`:
- the safe zone must begin **below the rendered bottom edge of every opponent top-row seat**;
- the safe zone must remain **above the bottom edge of the battlefield / LocalPlayerDock boundary**;
- the Interaction Stage must be fully contained inside this safe zone;
- the Interaction Stage must no longer use the old top-of-table `top:7/8/14px` placement in top-row mode;
- the stage must remain horizontally centred in the safe zone;
- the stage must not overlap any opponent seat or the local dock.

Use CSS/layout geometry, not JavaScript measurements, timers, or post-render repositioning.

Do not hard-code a one-off position that only passes 1440px. The same CSS structure must satisfy all three required viewport assertions. Preserve the VIS-01 seat positions; the safe zone adapts around those accepted seats rather than moving them.

Do not clip the existing Interaction Stage merely to satisfy containment. If the unchanged stage cannot fit the required 480px geometry without clipping or overlapping the local dock, STOP and report that as a concrete blocker for Reviewer decomposition instead of shrinking/removing stage internals in this task.

### 4. Keep the current stage internals unchanged
Do not change:
- the InteractionStage header text;
- HeroFocus JSX or portrait size;
- Dying handoff;
- Reaction Chain;
- SOURCE / FOCUS / DECISION / RESOLVER content;
- transition classes;
- semantic data attributes;
- viewer/private control behavior.

VIS-02 only creates and uses the correct central physical region.

### 5. Keep REST behavior empty
When `InteractionStage` returns null:
- the safe-zone wrapper may remain as empty geometry;
- it must not render placeholder text, controls, fake hero cards, or a visible dashboard;
- opponent top-row seats and Local Dock remain unchanged.

## Required browser regression
Extend browser geometry coverage using the existing fixture `state="interaction", count=4`.

Run at:
- 1440x900
- 650x900
- 480x900

For each viewport assert real bounding boxes:

1. `.interaction-safe-zone` exists exactly once.
2. `.interaction-stage` is visible for the interaction fixture.
3. every top-row opponent seat bottom is **at least 6 CSS pixels above** the visible Interaction Stage top.
4. the Interaction Stage bounding box is fully inside the safe-zone bounding box (4px tolerance acceptable for borders).
5. the Interaction Stage does not overlap `.local-player-dock`.
6. the safe zone does not overlap `.local-player-dock`.
7. opponent anchor Y positions from VIS-01 remain one row within the accepted tolerance.
8. no horizontal page overflow is introduced.
9. local console and hand remain present.

Add one REST assertion using `state="rest", count=4`:
- the safe-zone hook remains available exactly once;
- no visible `.interaction-stage` exists;
- the empty safe-zone wrapper itself has no visible panel/background/placeholder content.

The new interaction-geometry regression must fail against the old top:7/8/14px dashboard placement.

## Negative regression / forbidden shortcut
Do not satisfy this task by:
- reducing opacity or z-index while leaving the stage geometrically over the seats;
- hiding opponent seats during interactions;
- moving/reordering opponent anchors;
- moving the local dock;
- shrinking the stage to zero/near-zero size;
- moving controls into the safe zone;
- conditionally rendering a different mobile React tree;
- using JS DOM measurements to reposition the stage;
- starting the enlarged Hero Focus redesign.

## Responsive contract
The same structural rule applies at 1440, 650 and 480 widths:
- top row above;
- dedicated central safe zone below it;
- local dock below the battlefield;
- one Interaction Stage inside the safe zone when active.

Exact safe-zone height may respond to viewport width, but the three-region hierarchy must not change.

## Validation
Run and report actual results for:
- focused Playwright VIS-02 geometry test(s);
- `npm run test:browser`;
- `npm run test:fast`;
- `npm run build`;
- `npm run lint`;
- `git diff --check`.

Report exact counts where available. Do not claim unrun commands passed.

## Scope exclusions
Do not:
- enlarge or redesign Hero Focus;
- change Interaction Stage internal information hierarchy;
- change Reaction Chain/Dying/Duel/Judgement semantics;
- change 5–10 player side-column geometry;
- resize/restructure opponent seat cards;
- change LocalPlayerDock;
- change gameplay, CurrentAction, server, projector, causal, or payload behavior;
- start any later VIS task;
- perform unrelated CSS cleanup.

## Execution result
Append only the VIS-02 execution result:
- full implementation SHA;
- files changed;
- safe-zone DOM structure/hook;
- exact top-row safe-zone CSS strategy;
- browser bounding-box assertions and before/after failure evidence;
- validation commands with exact results/counts;
- any remaining issue inside VIS-02 scope.

Do not declare VIS-02 accepted/closed. The Planner/Reviewer decides that after review.

Push and verify remote HANDOVER, then STOP.

## Acceptance
VIS-02 passes only if, for 2–4-player top-row mode:
- opponent anchors remain fixed above the centre;
- an explicit central Interaction Safe Zone exists;
- the active Interaction Stage is fully contained in that zone and cannot overlap the opponent row or local dock;
- the old top-of-table dashboard geometry no longer applies;
- browser geometry proves the change at desktop and mobile widths;
- Interaction Stage internals, Hero Focus size, controls, gameplay, and 5–10-player layout remain unchanged.
