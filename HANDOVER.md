# WTK UI / Layout — Current Task Handoff

## REMOTE HANDOVER RULE
Work only on `ux-v2`. Read this file and `docs/PLANNER_DEVELOPMENT_WORKFLOW.md`. Implement only the task below, validate, append this task's execution result, commit/push, verify remote HANDOVER, then STOP. Do not wait for or poll CI.

## Reviewer status — UX2.0VIS-05A ACCEPTED; CI baseline RED

Reviewed implementation chain:
- VIS-05A topology: `79eda6ea1ee2017a73cd336fbeddbbf7b566b44a`
- VIS-05A containment/hit-safety fix: `91368228a4d436992082a17e67cbccce3281390d`
- latest reviewed CI run: GitHub Actions run `604` / `build-and-test` job `111335606012`

Accepted facts to preserve:
- 5–10 player Side Column mapping/topology is accepted.
- Side Column opponent cards are bounded narrow thumbnails.
- accepted desktop Side Column seat geometry is `width: clamp(44px, 8vw, 86px)`, `height: min(128px, 100%)`, `min-height: 0`, with accepted responsive height caps `116px` at <=650 and `108px` at <=480.
- compact hero art/identity, HP and concealed Hand count remain directly visible.
- Equipment/Judgement thumbnail card faces are hidden in Side Column but remain available through Opponent Inspect.
- VIS-05A/FIX1 browser containment/hit-safety tests passed in CI.
- the VIS-06 dedicated guidance/action split is accepted: `.console-guidance` owns decision/status text while `.turn-controls[data-console-surface="local-operation"]` owns actions; action extras wrap inside `[data-action-extras="true"]`.

Current CI evidence from run 604:
- `npm ci`: PASS
- `npm run lint`: PASS
- Chromium install: PASS
- `npm run build`: PASS
- `npm run test:browser`: PASS
- `npm test`: FAIL — 197/200 pass, exactly 3 failures

These 3 failures are stale source-shape assertions in `tests/room-safety-render.test.mjs`. They assert pre-VIS-05A-FIX1 / pre-VIS-06 CSS structure. They are not evidence of a production regression.

The previously assigned VIS-05B safe-zone task is deferred until the baseline test suite is green. Do not start VIS-05B in this task.

# NEXT TASK — UX2.0CI-FIX1: Repair Stale room-safety-render Assertions Without Changing Production

## Objective
Restore the baseline `npm test` gate by updating only the three stale static/source-shape assertions in `tests/room-safety-render.test.mjs` so that they verify the current accepted production contracts.

This is a **test-maintenance-only** task.

Do not change production CSS/React to satisfy old expectations. In particular, do not restore the old 150px Side Column seat height, do not collapse the dedicated guidance row back into the action console, and do not remove `.console-guidance` from the shared dock-panel styling group.

## Expected file scope
Change only:
- `tests/room-safety-render.test.mjs`

Do not modify:
- `app/sequence-overrides.css`
- `app/globals.css`
- `app/page.tsx`
- `tests/browser/ui19.spec.mjs`
- any gameplay/server/presentation/projector code
- `HANDOVER.md` except appending the execution result after implementation

If a production change appears necessary, STOP and report the exact mismatch instead of changing production.

## CI failure 1 — stale Side Column height assertion

Failing test:
`UI-11 keeps one local dock and stable opponent anchors across supported player counts`

Current stale assertion near the end of that test expects:

```js
assert.match(sequenceStyleSource, /data-seat-topology="side-column"[\s\S]*height: min\(150px/);
```

That 150px contract was intentionally replaced by accepted VIS-05A-FIX1 bounded thumbnail geometry.

### Required repair
Replace the stale 150px assertion with a source-shape assertion scoped to the main Side Column opponent-card block that proves the accepted contract:

```css
.game-shell .player-board[data-seat-topology="side-column"] > .opponent-player-card {
  width: clamp(44px, 8vw, 86px);
  height: min(128px, 100%);
  min-height: 0;
}
```

The assertion must be specific enough that an unrelated later `height` declaration elsewhere in the stylesheet cannot satisfy it accidentally.

Keep the existing row-budget assertions for 5/6/8/10 unchanged.

Optional but acceptable in the same test: add narrowly scoped assertions for the already-accepted responsive caps:
- <=650: `height: min(116px, 100%)`
- <=480: `height: min(108px, 100%)`

Do not reintroduce `150px` in production.

## CI failure 2 — stale console CSS assertion

Failing test:
`UI-11 preserves hand rail and one footer console for one, five, and ten cards`

The rendered-markup assertions already correctly prove there is one:

```html
data-console-surface="local-operation"
```

The stale CSS assertion then incorrectly searches the stylesheet for that HTML data attribute followed by `flex-wrap: wrap`:

```js
assert.match(sequenceStyleSource, /data-console-surface="local-operation"[\s\S]*flex-wrap: wrap/);
```

Current accepted VIS-06 structure is:
- `.local-player-dock .turn-controls` is the action console and uses grid layout.
- `.local-player-dock .turn-controls > [data-action-extras="true"]` is the wrapping auxiliary-action area and uses `display:flex; flex-wrap:wrap`.
- `[data-action-slots="true"]` owns the fixed action-slot grid.

### Required repair
Keep the existing rendered HTML check for one `data-console-surface="local-operation"`.

Replace the stale stylesheet assertion with scoped assertions that prove:
1. `.local-player-dock .turn-controls` is the action surface layout;
2. `[data-action-extras="true"]` under `.turn-controls` uses `display: flex` and `flex-wrap: wrap`;
3. do not require the HTML-only `data-console-surface` attribute to appear in CSS.

Do not move guidance content back into `.turn-controls`.

## CI failure 3 — stale shared dock styling selector list

Failing test:
`the local player dock replaces the self battlefield square and follows Quick Test perspective`

The stale assertion expects this shared styling selector list to jump directly from `.local-hand-section` to `.local-player-dock .turn-controls`.

Current accepted CSS intentionally includes the dedicated guidance row in the same shared panel chrome:

```css
.local-dock-identity,
.local-dock-zones,
.local-status-panel,
.local-equipment-panel,
.local-judgement-panel,
.local-hand-section,
.local-player-dock .console-guidance,
.local-player-dock .turn-controls {
  box-sizing: border-box;
  border: 1px solid #765f3c99;
  background: #0e120dcc;
}
```

### Required repair
Update this source-shape assertion so it explicitly includes:

```css
.local-player-dock .console-guidance,
.local-player-dock .turn-controls
```

and still proves the shared:
- `border: 1px solid #765f3c99`
- `background: #0e120dcc`

Prefer a narrowly scoped assertion over a very broad `[\s\S]*` match that could accidentally cross unrelated CSS blocks.

Also retain the existing production/markup assertions around local hero, hand, equipment, judgement and opponent public zones.

## Guardrails
Do not weaken coverage by deleting the three assertions outright.

The repaired tests must continue to protect these real contracts:
- Side Column thumbnails remain bounded rather than reverting to the old tall-card geometry.
- one local operation console remains present in rendered markup.
- action extras remain wrappable.
- dedicated `.console-guidance` and `.turn-controls` remain separately styled dock regions.
- VIS-05A and VIS-06 production code remain untouched.

Do not rename tests merely to make the failure disappear. Small wording updates are allowed only if they improve accuracy.

## Validation
Run and report, in this order:

1. focused file:
```bash
node --test tests/room-safety-render.test.mjs
```

2. full fast/unit suite:
```bash
npm test
```

Expected baseline after this task: all current 200 tests pass.

3. lint:
```bash
npm run lint
```

Because this task must not change production/browser code, a full browser rerun is not required locally. If you choose to run it, report it accurately; do not wait for or poll GitHub Actions.

## Execution result
Append only:
- implementation SHA;
- files changed;
- exact three stale assertions repaired;
- focused `room-safety-render` result;
- full `npm test` result;
- lint result;
- confirmation that no production files changed;
- any remaining GAP.

Do not self-accept. Push, verify remote HANDOVER, then STOP.

## Acceptance
Pass only if the three stale assertions are updated to the current accepted VIS-05A/VIS-06 contracts, `npm test` is fully green, lint passes, no production file is changed, and no assertion is removed or weakened into a meaningless broad match.

## Autonomous UI/Layout run — 2026-10-04

The user starts the autonomous run in this chat on `ux-v2`. Preserve all historical content above. The newer AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md authorizes the starting VIS-05B task and subsequent bounded tasks after CI-green closure. CI-FIX1 is already implemented by `b5fed0d`; baseline `a935d408119b432cdfe9ab775ab1d877c7a75b25` passed run https://github.com/dmoneyUK/three-kingdoms/actions/runs/37169930005. The older RED/CI-FIX1 text is historical, not an instruction to repeat the repaired task.

TASK ID: UX2.0VIS-05B
STATUS: PLANNED

Objective: Positioned transparent Side Column central safe zone and normal-flow Interaction Stage, clear of seats and dock.
Observed gap: The wrapper is display:contents outside Top Row; Side Column Stage retains legacy absolute placement.
Why this task is next: Explicit starting task in autonomous workflow section 9; accepted VIS-05A/VIS-06 and CI-green baseline are preserved.
Design authority: AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md section 9; UX_V2_INTERACTION_STAGE_DESIGN.md sections 1.4, 1.10 and 3C; PLANNER_DEVELOPMENT_WORKFLOW.md; UX_V2_RELEASE_GATE.md; ROADMAP.md.
Current production evidence: Accepted side/row helper and 30/40/30 tracks, bounded narrow thumbnails, guidance/action split; real geometry exists only for Top Row safe zone.
Files expected in scope: app/sequence-overrides.css, tests/browser/ui19.spec.mjs, README.md, append-only HANDOVER.md. Geometry diagnostic evidence may be added separately if the explicit stop condition is reached before production changes.
Implementation requirements: Measure unchanged Stage first; positioned transparent wrapper, relative Stage, >=6px clearance from all visible seat descendants, Stage within table and above dock, Reaction/Dying visible.
Explicit non-goals: No seat mapping/dimension changes, Top Row changes, Stage density redesign, gameplay/projector/private controls, or CI configuration changes.
Forbidden shortcuts: No clipping, scrolling, scaling, hiding metadata/Reaction/Dying, reducing Hero Focus, or widening centre at expense of accepted seats.
Required regression tests: Count6 interaction/negation/dying/group-observer and count10 interaction/negation at 1440x900, 650x900, 480x900; retain Top Row and seat-hit evidence.
Required local validation: Focused geometry/hit tests; relevant bounded regressions; git diff --check under autonomous workflow. No routine full build/test/lint.
CI acceptance: Exact implementation revision build-and-test green before planning another task; diagnose only relevant failed jobs.
Task acceptance criteria: Wrapper and visible Stage clear every seat descendant >=6px; Stage fully inside table/above dock without content suppression. If unchanged Stage cannot fit at480px, record exact BLOCKED measurements and stop for human review without secretly adapting Stage composition.
