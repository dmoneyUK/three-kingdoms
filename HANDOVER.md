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

## Reviewer status — UX2.0VIS-03B ACCEPTED

Reviewed implementation: `ed9421425c82a54d8d010704390e3b94ad4796fc`.

Accepted facts that the next task must preserve:
- top-row Hero Focus still uses the existing proven `HeroFocusView.primary`; no semantic selector/helper changed;
- exactly one Hero Focus is rendered for the reviewed Interaction / Negation / Dying fixtures;
- portrait is materially enlarged to 90x113 desktop, 72x90 at 481–650, and 64x80 at <=480;
- top-row seat geometry, safe-zone geometry, LocalPlayerDock, gameplay, Reaction/Dying content and presentation authority were not changed;
- focused Hero Focus tests reported 9/9 PASS and the combined retained geometry/Hero Focus suite reported 18/18 PASS;
- the remaining visible problem is that top-row Interaction Stage itself still looks like a large bordered dashboard shell even though the centre is now structurally reserved and the primary hero is enlarged.

# NEXT TASK — UX2.0VIS-03C: Remove the Top-Row Interaction Stage Dashboard Shell

## Objective
Fix exactly one visual hierarchy defect:

**In 2–4 player top-row mode, stop rendering the entire Interaction Stage as one large dark bordered dashboard panel. Keep the semantic InteractionStage container and all existing Hero / Event / Meta content, but make the outer top-row Stage visually open/transparent so the central battlefield reads as a composition rather than a giant information box.**

This is a shell/chrome task only.

Do not change semantic content, Hero Focus size, Reaction Chain content, Dying content, meta copy, seat layout, safe-zone geometry, LocalPlayerDock, or gameplay.

## Why this task exists
Current production still inherits the old UI-03 compact-panel shell:

`.interaction-stage { background:#11140ee8; border:1px solid #9c8249; box-shadow:0 8px 24px #0008; padding:8px 11px; }`

and the Stage header still uses a full-width divider.

VIS-03A made the desktop Stage wide and VIS-03B enlarged the proven primary hero, but the outer shell still visually turns the protected centre into one large dashboard. That is the same hierarchy problem visible in the real-game screenshot.

The original UX V2 intent is:
- fixed small opponent seats;
- protected central Interaction Safe Zone;
- enlarged interaction content inside that centre;
- LocalPlayerDock below;
- no requirement for the whole central zone to be one opaque dashboard card.

## Files expected in scope
Production:
- `app/globals.css`

Regression:
- `tests/browser/ui19.spec.mjs`

Do not change `app/page.tsx` unless a test-only stable class hook is genuinely missing. Do not change any game/presentation/server helper.

## Required implementation

### 1. Top-row mode only: remove outer dashboard chrome
Under:

`.play-table[data-seat-topology="top-row"]`

override the outer `.interaction-stage` shell so that it is visually open:

- background must be transparent;
- outer border must be removed;
- outer box-shadow must be removed;
- remove shell padding that exists only to create the old panel frame;
- preserve the Stage's existing semantic DOM element, data attributes, width, position and containment;
- preserve `pointer-events:none`.

Do not apply this change globally. Side-column mode is not part of this task.

### 2. Keep the Stage header, but make it a compact label rather than a full-width panel divider
Do not remove or rewrite the existing header text/semantics.

For top-row mode:
- remove the full-width bottom border/divider from `.interaction-stage>header`;
- do not give the header its own large opaque background;
- keep `INTERACTION STAGE`, the existing focus label, and `YOUR DECISION` when applicable;
- keep the header compact and above the composition;
- it must not reserve a large blank row across the whole safe-zone width.

A small inline/fitted label treatment is acceptable. Do not change copy.

### 3. Preserve the three accepted content regions
Do not change the DOM or semantic conditions of:
- `.interaction-stage-hero-region`
- `.interaction-stage-event-region`
- `.interaction-stage-meta-region`

Do not change:
- Hero Focus portrait dimensions from VIS-03B;
- Hero Focus identity selection;
- Reaction Chain / Dying content;
- SOURCE / FOCUS / DECISION / RESOLVER / ORIGINAL SCOPE / CONTEXT copy;
- the desktop horizontal grid;
- the <=650 stacked reading order.

The Event region may retain its own Reaction/Dying panel chrome. This task removes only the **outer Interaction Stage dashboard shell**.

### 4. Preserve geometry
Do not change:
- `--interaction-safe-top`;
- safe-zone top/right/bottom/left;
- Stage width caps;
- play-table height;
- player-board geometry;
- opponent seat sizes/positions;
- LocalPlayerDock geometry;
- 5–10 player side-column layout.

The transparent Stage must stay fully inside the same safe zone.

## Required browser regression
Extend `tests/browser/ui19.spec.mjs` with a focused top-row shell test using:
- `state="interaction", count=4`
- `state="negation", count=4`
- `state="dying", count=4`

Run at:
- 1440x900
- 650x900
- 480x900

For every case assert:

1. exactly one visible `.interaction-stage`;
2. computed outer Stage background is transparent (alpha 0);
3. computed outer Stage border widths are 0px;
4. computed outer Stage box shadow is `none`;
5. `.interaction-stage>header` remains visible;
6. header bottom border width is 0px;
7. Hero / Event / Meta region hooks remain mounted exactly once;
8. Hero Focus size still satisfies VIS-03B minimums;
9. Stage remains fully inside `.interaction-safe-zone`;
10. Stage and safe zone do not overlap LocalPlayerDock;
11. no horizontal page overflow.

For Negation and Dying also retain proof that:
- Reaction Chain / Dying handoff remains visible;
- its own inner panel/background is not removed by the outer-shell change.

The new shell regression must fail against the pre-VIS-03C top-row CSS because that CSS has the opaque background, 1px border and box shadow.

## Negative regression / forbidden shortcuts
Do not:
- delete the `.interaction-stage` element;
- hide the Stage;
- remove the Stage header copy;
- make Hero/Event/Meta content transparent;
- remove Reaction Chain/Dying panel chrome;
- change Hero Focus size;
- change any semantic selector or data attribute;
- move seats/safe zone/dock;
- change side-column mode;
- change gameplay/server/projector/presentation authority;
- introduce viewport-specific React trees.

## Validation
Run and report:
- focused VIS-03C shell browser tests;
- retained VIS-02-FIX1 / VIS-03A / VIS-03B geometry tests;
- `npm run test:browser` if allowed by the local execution policy;
- `npm run test:fast` if allowed by the local execution policy;
- `npm run build` if allowed by the local execution policy;
- `npm run lint` if allowed by the local execution policy;
- `git diff --check`.

Do not claim unrun commands passed. Do not inspect or wait for CI.

## Execution result
Append only:
- full implementation SHA;
- files changed;
- exact top-row shell overrides;
- header treatment;
- proof side-column/global shell was not changed;
- focused/retained validation results;
- any remaining GAP.

Do not declare the task accepted. Reviewer decides after inspecting the result.

Push and verify remote HANDOVER, then STOP.

## Acceptance
Pass only if top-row Interaction Stage no longer renders as one opaque bordered/shadowed dashboard shell at desktop and mobile widths, while the semantic Stage container, compact header, enlarged primary Hero Focus, Reaction/Dying panels, meta content, safe-zone containment, seats, LocalPlayerDock and gameplay remain unchanged.
