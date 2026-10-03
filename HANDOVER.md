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

## Reviewer status — UX2.0VIS-02 PARTIAL

Reviewed implementation: `928a4f9eef594bf516a23e791c371bfe2410b85d`.

Accepted parts:
- `.play-table` now mirrors the existing seat topology hook.
- one immediate `.interaction-safe-zone` wrapper contains only the existing InteractionStage;
- side-column mode is preserved with `display: contents`;
- top-row mode removes the legacy InteractionStage top/left/translate placement and centres the existing stage inside the safe-zone wrapper;
- VIS-01 seat geometry was not changed;
- focused VIS-02 regression reported 4/4 passed;
- GitHub Actions run `37153968265` completed successfully: lint, build, full browser suite, `npm test`, deploy, and production smoke all passed.

Blocking review gap:
- the new containment regression proves only `state="interaction", count=4`, which is a comparatively short Attack-response stage;
- existing production/fixture states such as `state="negation"` and `state="dying"` have materially taller Interaction Stage content (Hero Focus plus Reaction Chain or Dying handoff plus context);
- current top-row safe-zone CSS starts at `top:clamp(300px,62%,390px)`, with an additional desktop +32px, leaving only the lower portion of the play-table available;
- `.play-table` still has `overflow:hidden`;
- therefore the current tests do not prove the task's required invariant that the unchanged active Interaction Stage is fully contained and not clipped for the existing complex interaction states.

Do not enlarge/redesign Hero Focus or Reaction Chain yet. First make the VIS-02 geometry contract true for the existing tall states, or report a proven blocker if that is impossible without redesigning stage internals.

# NEXT TASK — UX2.0VIS-02-FIX1: Prove Safe-Zone Containment for Tall Existing Interaction States

## Objective
Complete VIS-02 by making the existing top-row Interaction Safe Zone use the available central battlefield height efficiently enough to contain the **unchanged existing Interaction Stage** for the known complex 4-player states.

This is still a container/geometry task only.

The task passes only if the existing Interaction Stage fits without clipping for:
- normal interaction / Attack-response;
- Negation with Reaction Chain;
- Dying / rescue handoff.

If the unchanged stage cannot satisfy this at 480px after removing unnecessary safe-zone dead space, STOP and report the exact measured blocker. Do not redesign the stage in this FIX task.

## Existing accepted truth
Preserve:
- VIS-01 top-row seat layout;
- the VIS-02 `.interaction-safe-zone` wrapper and topology hook;
- LocalPlayerDock geometry;
- InteractionStage JSX/internals;
- HeroFocus size/content;
- Reaction Chain content;
- Dying handoff content;
- semantic PresentationClientView authority;
- all gameplay/server/projector behavior.

## Exact defect to fix
Current CSS:

`.play-table[data-seat-topology="top-row"]>.interaction-safe-zone{ top:clamp(300px,62%,390px); ... }`

and on desktop:

`top:calc(clamp(300px,62%,390px) + 32px)`

This reserves substantially more blank space above the safe zone than the contract requires. The safe zone should begin as soon as practical after the fixed opponent row, not at an arbitrary percentage of the whole play-table.

The current browser test does not detect this because it uses only the shorter `state="interaction"` fixture.

## Required implementation

### 1. Maximise the real central safe zone without moving accepted seats
Change only top-row safe-zone geometry so that:
- opponent seats remain exactly where VIS-01 currently places them;
- safe-zone top is the smallest CSS-defined boundary that still gives every visible top-row opponent at least **6 CSS px** clearance;
- safe-zone bottom remains inside the play-table above the LocalPlayerDock boundary;
- the safe zone uses the remaining vertical battlefield space instead of leaving a large unused gap;
- no JavaScript measurement, ResizeObserver, timer, or post-render positioning is introduced.

Prefer a shared responsive CSS variable / explicit responsive geometry derived from the existing top-row layout rather than another unrelated percentage magic number.

Do not change `.player-board`, opponent card dimensions, or seat ordering merely to create more room.

### 2. Keep Interaction Stage internals untouched
Do not modify:
- `InteractionStage` JSX;
- `HeroFocus`;
- `.hero-focus*`;
- `.reaction-chain*`;
- `.dying-handoff*`;
- SOURCE / FOCUS / DECISION / RESOLVER blocks;
- transition semantics or animation definitions.

Do not add:
- max-height to the stage;
- internal scrolling;
- `overflow:hidden` on the stage/safe zone;
- CSS scale transforms;
- reduced font/card sizes;
- conditional hiding/collapsing of stage sections.

Those would hide the geometry problem rather than solve VIS-02.

### 3. Add tall-state browser geometry coverage
Extend `tests/browser/ui19.spec.mjs` using existing fixtures:

- `state="interaction", count=4`
- `state="negation", count=4`
- `state="dying", count=4`

Run each at:
- 1440x900
- 650x900
- 480x900

For every state/viewport assert:

1. one `.interaction-safe-zone`;
2. one visible `.interaction-stage`;
3. three opponent anchors still share one row (VIS-01 tolerance <= 4px);
4. max opponent bottom <= stage top - 6px;
5. stage left/top/right/bottom are fully inside safe-zone bounds (4px border tolerance);
6. stage bottom <= `.play-table` bottom - 1px;
7. safe-zone and stage have zero overlap with `.local-player-dock`;
8. local hand and Local Operation Console remain visible;
9. no horizontal page overflow;
10. computed overflow on `.interaction-safe-zone` and `.interaction-stage` is not being used to clip content.

For Negation additionally assert:
- `[data-reaction-chain="proven"]` is visible;
- the bottom of the Reaction Chain is inside the visible Interaction Stage.

For Dying additionally assert:
- `[data-dying-handoff="proven"]` is visible;
- the bottom of the Dying handoff is inside the visible Interaction Stage.

The new tests must fail against the current `928a4f9...` geometry if either complex stage extends beyond the safe zone.

### 4. Contradiction protocol
If, after using the maximum legitimate space between the accepted opponent row and play-table bottom, either Negation or Dying still cannot fit at 480x900 **without changing Interaction Stage internals**, do not force green.

Instead:
- leave the safest geometry improvement you can prove only if it does not regress existing states;
- mark the 480px state as GAP in the execution result with exact measured:
  - opponent bottom;
  - safe-zone top/bottom/height;
  - stage top/bottom/height;
  - overflow amount;
- STOP for Planner review.

Do not start the future central Hero/Reaction layout redesign in this task.

## Negative regression / forbidden shortcuts
Do not:
- move opponent seats upward/downward;
- shrink opponent seats;
- hide opponents during interaction;
- move LocalPlayerDock;
- clip/scroll/scale the Interaction Stage;
- hide Reaction Chain or Dying content;
- make viewport-specific React trees;
- use JS geometry;
- change gameplay or presentation semantics;
- change side-column (5–10 player) layout;
- start VIS-03.

## Validation
Run and report actual results for:
- focused Playwright VIS-02-FIX1 geometry tests;
- `npm run test:browser`;
- `npm run test:fast`;
- `npm run build`;
- `npm run lint`;
- `git diff --check`.

Report exact counts where available. Do not claim unrun checks passed.

## Execution result
Append only the VIS-02-FIX1 execution result:
- full implementation SHA;
- files changed;
- previous vs new safe-zone geometry strategy;
- measured geometry for Interaction / Negation / Dying at 480px;
- browser assertions added;
- validation commands/results;
- PASS or exact GAP for each required state;
- any blocker requiring future Interaction Stage redesign.

Do not declare VIS-02 accepted/closed. The Planner/Reviewer decides that after review.

Push and verify remote HANDOVER, then STOP.

## Acceptance
VIS-02-FIX1 passes only if the unchanged existing Interaction Stage is fully visible and fully contained inside the central safe zone for Interaction, Negation, and Dying at 1440/650/480 widths, with VIS-01 seats and LocalPlayerDock unchanged and no clipping/scrolling/scaling workaround.

If 480px cannot satisfy that invariant, an honest measured GAP is the required result; do not redesign the stage in this task.

## VIS-02-FIX1 Execution Result

- Implementation SHA: `b1f0e0d367594beca803414deb0356633526adff`
- Files changed:
  - `app/globals.css`
  - `tests/browser/ui19.spec.mjs`
- Safe-zone geometry change:
  - Previous strategy: `top:clamp(300px,62%,390px)`, plus an unrelated desktop `+32px`, with 4–8px unused bottom inset.
  - New strategy: the top-row play-table owns `--interaction-safe-top`, derived from the accepted VIS-01 seat geometry: `385px` desktop, `319px` at <=650px, and `326px` at <=480px. The safe zone ends 1px above the play-table bottom.
  - This is the smallest proven CSS boundary that preserves at least 6px below the rendered opponent row at each required width. No player-board, opponent seat, LocalPlayerDock, Stage internals, overflow, scrolling, scaling, font, content, or semantic behavior changed.
- Browser regression:
  - Expanded from one short Interaction fixture to Interaction, Negation, and Dying at 1440x900, 650x900, and 480x900 (9 geometry cases).
  - Every case asserts the one-row opponent invariant, 6px clearance, safe-zone containment, play-table bottom containment, zero Local Dock overlap, visible hand/console, no horizontal overflow, and visible overflow on both safe zone and Stage.
  - Negation additionally proves the visible Reaction Chain remains inside the Stage; Dying additionally proves the visible Dying handoff remains inside the Stage.
- Measured 480x900 geometry (all PASS):
  - opponent bottom `319.25px`; safe zone top/bottom/height `326px / 667px / 341px`; play-table bottom `668px`.
  - Interaction Stage top/bottom/height `326px / 534.5px / 208.5px` — PASS.
  - Negation Stage top/bottom/height `326px / 654.6875px / 328.6875px` — PASS.
  - Dying Stage top/bottom/height `326px / 628.6875px / 302.6875px` — PASS.
- Measured 650x900 geometry (all PASS):
  - opponent bottom `312.90625px`; safe zone top/bottom/height `319px / 582px / 263px`; play-table bottom `583px`.
  - Interaction Stage height `176px`; Negation `251.09375px`; Dying `248.59375px` — all fully contained.
- Proven 1440x900 structural GAP after using maximum legitimate space:
  - opponent bottom `378.25px`; minimum legal Stage top is `384.25px`; implemented safe-zone top/bottom/height is `385px / 571px / 186px`; play-table bottom is `572px`.
  - Interaction Stage top/bottom/height `385px / 573.5px / 188.5px`: **GAP**, exceeds required play-table bottom limit by `2.5px`.
  - Negation Stage top/bottom/height `385px / 648.59375px / 263.59375px`: **GAP**, exceeds required play-table bottom limit by `77.59375px`.
  - Dying Stage top/bottom/height `385px / 646.09375px / 261.09375px`: **GAP**, exceeds required play-table bottom limit by `75.09375px`.
  - A temporary container-only desktop width expansion to 1200px did not reduce any Stage height and was not retained. With seats, Local Dock, and Stage internals frozen, no legal CSS safe-zone top can satisfy both the 6px opponent clearance and play-table containment at 1440x900.
- Focused validation actually run:
  - `npx playwright test tests/browser/ui19.spec.mjs --grep 'UX2.0VIS-02-FIX1' --config tests/browser/playwright.config.mjs` — **6 passed, 3 failed** (9 tests). The three intentional strict failures are Interaction, Negation, and Dying at 1440x900 and constitute the measured GAP above.
- Full validation not run locally, per the user-authorized remote-CI workflow:
  - `npm run test:browser` — not run; GitHub Actions responsibility.
  - `npm run test:fast` — not run; GitHub Actions responsibility.
  - `npm run build` — not run; GitHub Actions responsibility.
  - `npm run lint` — not run; GitHub Actions responsibility.
  - `git diff --check` — not run; GitHub Actions responsibility.
- Remaining blocker: VIS-02 cannot satisfy its all-width acceptance contract while keeping the accepted desktop opponent row, LocalPlayerDock, and unchanged Interaction Stage internals simultaneously. Planner decomposition is required before any Interaction Stage redesign.
- Recommended next bounded task: reviewer decides which desktop geometry constraint may change; do not start VIS-03.
