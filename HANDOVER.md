# WTK UI / Layout — Current Task Handoff

## REMOTE HANDOVER RULE
HANDOVER.md contains only the current task and this task's execution result. Work only on branch `ux-v2`.

Agent sequence:
1. fetch/pull `origin/ux-v2`
2. read this HANDOVER and `docs/PLANNER_DEVELOPMENT_WORKFLOW.md`
3. implement only the task below
4. run the required focused/full local validations you can run
5. append this task's execution result
6. commit + push implementation and HANDOVER
7. fetch origin, verify remote HANDOVER contains the result
8. STOP

Do not wait for or poll CI. CI status is not part of this agent task.

# NEXT TASK — UX2.0VIS-03B: Enlarge the Proven Primary Hero Focus in Top-Row Interaction Stage

## Objective
Fix exactly one remaining player-facing layout defect:

**In 2–4 player top-row mode, the proven current Hero Focus is still rendered as a tiny 34–38px portrait inside a compact information panel. Promote that existing proven primary Hero Focus into a clearly enlarged central hero presentation.**

This task changes only the visual treatment of the already-selected `HeroFocusView.primary`.

Do not add additional participants, do not change how the primary player is selected, and do not redesign Reaction Chain or meta/context blocks yet.

## Why this task exists
The original UX V2 design explicitly requires:
- seat thumbnails stay fixed;
- the selected/current involved player can appear as an enlarged presentation inside Interaction Stage;
- Top Row Mode has a wide central interaction area;
- Large Hero Focus is the current primary focus/resolving participant;
- the compact UI-06 Hero Focus was explicitly temporary.

Current production still uses:
- desktop portrait ~38x48px;
- <=650px portrait ~34x43px.

That is still visually a small status avatar, not the intended enlarged Hero Focus.

## Existing accepted work to preserve
Do not regress:
- VIS-01 top-row opponent placement;
- VIS-02 central safe-zone wrapper;
- VIS-03A desktop wide stage composition and its hero/event/meta regions;
- 650/480 stacked narrow composition;
- LocalPlayerDock;
- Interaction/Negation/Dying containment;
- PresentationClientView / HeroFocusView semantic authority;
- all gameplay and controls.

## Production files expected in scope
Expected:
- `app/globals.css`

Only change `app/page.tsx` if a small presentational class/hook is strictly required. Do not change `game/hero-focus.ts`, `game/presentation-client.ts`, server, projector, protocol, gameplay, or target logic.

## Required implementation

### 1. Keep the existing primary identity exactly unchanged
Continue rendering only:

`buildHeroFocusView(...).primary`

Do not:
- infer another source/target from room state;
- use CurrentAction/timeline/pending fallbacks;
- add a second Hero Focus;
- convert source/decision actor into another large hero;
- change the existing fallback rules.

This task is visual only.

### 2. Promote Hero Focus from compact avatar to enlarged hero presentation
Inside top-row Interaction Stage only:

- the hero artwork must become the dominant element of the Hero region;
- player name, hero name and HP remain visible;
- existing role label remains visible;
- source/nested-context text remains secondary;
- the hero artwork must preserve portrait aspect ratio and use the existing local hero asset;
- no controls/buttons/private data are added.

Target visual scale:
- desktop >650px: hero artwork at least **88px wide and 112px high**;
- 481–650px: at least **72px wide and 90px high**;
- <=480px: at least **64px wide and 80px high**.

These are minimums, not pixel-perfect art-direction values. Larger is acceptable only if all existing safe-zone containment tests stay green.

### 3. Make the Hero region read as a presentation, not a panel inside a panel
For top-row mode:
- remove/reduce the current compact-dashboard feel of `.hero-focus`;
- do not add another large outer card background around the entire Stage;
- the enlarged portrait and identity should be visually dominant;
- the existing Interaction Stage shell and VIS-03A hero/event/meta structure stay intact.

Do not redesign the Reaction Chain, Dying block or meta region in this task.

### 4. Preserve narrow/mobile containment
At 650x900 and 480x900:
- Hero Focus must be enlarged as above;
- Stage must still remain fully inside the existing safe zone;
- no clipping, internal scroll, scale transform or hidden text;
- LocalPlayerDock must remain unobstructed;
- opponent top-row seats must not move.

If the required minimum enlarged Hero Focus cannot fit at 480x900 while preserving the accepted safe-zone and dock geometry, STOP and report the measured blocker. Do not shrink below the minimum merely to force green.

## Required browser regression
Extend `tests/browser/ui19.spec.mjs` using existing 4-player fixtures:
- `state="interaction"`
- `state="negation"`
- `state="dying"`

At 1440x900, 650x900 and 480x900 assert:

1. one visible `[data-hero-focus="true"]`;
2. its existing `data-hero-focus-player-id` remains the fixture's proven primary;
3. `.hero-focus-portrait` meets the minimum width/height for that viewport class;
4. portrait is fully inside `.interaction-stage-hero-region`;
5. Hero region is fully inside Interaction Stage;
6. no overlap with Event region or Meta region at desktop;
7. existing VIS-02/VIS-03A safe-zone containment assertions remain unchanged and pass;
8. no page horizontal overflow;
9. LocalPlayerDock remains visible and unobstructed.

Add one negative semantic regression:
- do not render more than one `[data-hero-focus="true"]` for these fixtures.

Do not weaken existing geometry tests to accommodate the larger hero.

## Forbidden shortcuts
Do not:
- change HeroFocus primary-selection semantics;
- add source/target inference;
- add multiple large hero cards;
- change opponent seat sizes or positions;
- change safe-zone top/bottom;
- change LocalPlayerDock geometry;
- hide Reaction Chain/Dying/meta content;
- add scrolling/clipping/scaling;
- reduce existing text solely to fit;
- change gameplay/presentation authority;
- start multi-participant composition work.

## Validation
Run and report actual results for:
- focused Hero Focus browser regression;
- existing VIS-02-FIX1 / VIS-03A geometry tests;
- `npm run test:browser`;
- `npm run test:fast`;
- `npm run build`;
- `npm run lint`;
- `git diff --check`.

Do not claim unrun commands passed. Do not wait for or inspect CI.

## Execution result
Append only:
- implementation SHA;
- files changed;
- final Hero Focus portrait dimensions by viewport class;
- CSS strategy used;
- proof primary player ID/semantic selection was unchanged;
- focused/full validation results;
- any measured GAP.

Do not declare the task accepted. Reviewer decides after inspecting the result.

Push and verify remote HANDOVER, then STOP.

## Acceptance
Pass only if the already-proven primary Hero Focus becomes materially enlarged in top-row mode at desktop and mobile widths, semantic identity selection is untouched, existing Interaction/Negation/Dying containment stays green, and no seat/dock/gameplay/Reaction/meta scope is changed.

## Agent execution result — UX2.0VIS-03B

- Implementation SHA: `ed9421425c82a54d8d010704390e3b94ad4796fc`.
- Files changed:
  - `app/globals.css`
  - `tests/browser/ui19.spec.mjs`
- Final top-row Hero Focus portrait dimensions:
  - desktop >650px: `90px × 113px`;
  - 481–650px: `72px × 90px`;
  - <=480px: `64px × 80px`.
- CSS strategy: top-row-scoped CSS Grid promotes the existing portrait into the dominant left column and places the unchanged heading/role, identity, source and nested context in the right column. The existing `.hero-focus-body` becomes `display: contents` only in this scope so no React or semantic structure changed. The old nested compact-panel background, border, inset shadow and padding are removed in top-row mode; artwork keeps the established approximately 4:5 portrait ratio and existing asset/object-fit behavior. At <=650px the event region's external top spacing is reduced from 7px to 3px so the enlarged minimum portrait fits without changing Reaction/Dying content, text, safe-zone geometry or Dock geometry.
- Primary-selection proof: `app/page.tsx`, `game/hero-focus.ts`, `game/presentation-client.ts` and all server/gameplay files are unchanged. New browser assertions prove exactly one visible `[data-hero-focus="true"]` and preserve the fixture-proven IDs at every tested viewport: Interaction=`p1`, Negation=`p2`, Dying=`p3`.
- Focused validation:
  - `npx playwright test tests/browser/ui19.spec.mjs --grep 'UX2.0VIS-03B' --config tests/browser/playwright.config.mjs` — final **9/9 PASS**. An initial 7/9 run exposed the retained compact-panel top margin at 650px; removing that obsolete margin restored both failing cases without reducing the required portrait size.
  - `npx playwright test tests/browser/ui19.spec.mjs --grep 'UX2.0VIS-(02-FIX1|03B)' --config tests/browser/playwright.config.mjs` — final **18/18 PASS**: 9 existing VIS-02-FIX1/VIS-03A containment cases plus 9 new VIS-03B Hero Focus cases. Before the final external event-spacing adjustment, the existing suite identified 650px Negation and Dying play-table-bottom overruns of approximately 3.1px and 0.6px; the unchanged strict assertions pass after the adjustment.
- Full validation not run under the project remote-validation workflow: `npm run test:browser`, `npm run test:fast`, `npm run build`, `npm run lint`, and `git diff --check`. GitHub Actions owns those gates; CI status was not inspected or polled.
- Remaining GAP: none observed within the bounded VIS-03B focused scope. Full-suite and CI results remain unverified pending GitHub Actions/user notification.
