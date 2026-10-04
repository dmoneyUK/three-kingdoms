# WTK UI / Layout — Current Task Handoff

## CURRENT AUTONOMOUS STATE NOTICE

For autonomous UI/Layout work, current task/status lives in `docs/AUTONOMOUS_UI_STATUS.md`.

This `HANDOVER.md` is the historical/audit ledger. Autonomous Agents must **not** read this entire file by default; consult historical sections selectively only when older accepted contracts, measurements, SHAs, CI evidence, or regression history are specifically needed.

Older task instructions below may be stale and are not current autonomous task authority. Human Reviewer historical inspection remains allowed.


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

### VIS-05B IMPLEMENTATION RESULT

Implementation SHA: `8fa843c`.
Files changed: app/sequence-overrides.css; tests/browser/ui19.spec.mjs; tests/browser/layout.config.mjs; README.md; append-only HANDOVER.md.
What changed: Transparent absolute wrapper follows inward edges of the accepted outer 30% seat tracks plus 8px clearance. Stage is relative/normal-flow, translate/transform none, existing content untouched. Added 18 active-state cases plus a negative legacy-position regression. Fixture-only config avoids unrelated Worker startup locally; full CI still uses both servers.
What was intentionally preserved: Seat mapping, dimensions, Inspect, Top Row, Hero Focus sizes/content, Reaction/Dying, server authority, public/private projections, CurrentAction, local controls, payloads and gameplay. No CI workflow changes.
Focused tests: Initial 18 positive cases passed; initial negative fixture failed to reproduce legacy overflow because existing max-width still constrained it. Corrected only that negative fixture with maxWidth:none; final combined VIS-05B/VIS-05A/VIS-04C Chromium run passed 96/96 (19 new, 77 retained). Command: npx playwright test --config tests/browser/layout.config.mjs --grep 'UX2.0VIS-05B|UX2.0VIS-05A|UX2.0VIS-04C' --workers=2.
Broader tests: Only the named bounded browser regressions above; no local full test/build/lint. git diff --check passed under autonomous workflow.
Geometry: At480px safe zone x104.09375, width271.8125; at650px x142.875, width364.25; at1440px x300.59375, width838.8125. Existing Stage fits without clipping/scroll/scaling or suppressing semantic content. All visible Stage and seat descendants are explicitly compared. 480px/10-player Negation screenshot visually inspected locally.
Known gaps: This closes positioning only, not final Large/Medium Side Column Hero Focus design, touch/WCAG certification, subjective art approval or deployment verification. Reviewer acceptance is not claimed.
CI pending: Push exact implementation and this result to origin/ux-v2; wait for build-and-test and fix only actual failures before selecting another task.

### VIS-05B STATUS: COMPLETED BY AGENT — CI GREEN

CI run: https://github.com/dmoneyUK/three-kingdoms/actions/runs/37183434567 — completed/success for `6becbcc2abd94552c849ea974afc5ce1fc9b5715`.
CI job: build-and-test `111380418874` success; run also completed deployment successfully, but no independent production/manual health certification is claimed.
Final implementation/fix SHAs: `8fa843c`, result record `6becbcc`; no CI fixes required.
Final test status: Local bounded browser 96/96; remote lint/build/browser/npm-test gate all passed.
Known remaining gaps: Side Column still uses old compact Hero Focus and lacks independent Medium Source projection; final dock/hand/group-density work remains. Human reviewer acceptance is not implied.
Recommended next bounded task: Side Column Large Focus/Medium Source presentation using the existing accepted semantic/viewer helpers, without changing gameplay/public authority or Top Row.

TASK ID: UX2.0VIS-05C — Side Column participant hierarchy
STATUS: PLANNED

Objective: Large primary portrait and Medium external Source in the proven Side Column safe zone.
Observed gap: Side Column retains 38x48 desktop/34x43 mobile primary portraits; Medium Source is gated to Top Row in React.
Why this task is next: Safe-zone CI is green; autonomous roadmap explicitly calls for Side Column Stage adaptation before group density/dock work.
Design authority: Autonomous workflow sections 7.3 and 10; interaction design section3C Large/Medium hierarchy, viewer exclusion and narrow-centre vertical relationship.
Current production evidence: projectMediumSourceForViewer already proves distinct external source plus active-target primary, excludes viewer/self and fails closed. Reuse it unchanged.
Files expected in scope: app/page.tsx, app/sequence-overrides.css, tests/browser/ui19.spec.mjs, README.md, append-only HANDOVER.md.
Implementation requirements: Extend existing Medium Source projection to Side Column; vertical source -> primary relationship; primary portraits use retained Top Row dimensions90x113/72x90/64x80; source remains smaller. No change to semantic selection/helper.
Explicit non-goals: Group participant/status/order model, public history, Local Dock/hand composition, gameplay, new assets, Top Row redesign.
Forbidden shortcuts: No guessed focus from decision/HP/seat; no viewer duplicate; no seat resize; no clipping/scroll/scaling or disappearing Reaction/Dying.
Required regression tests: 18 retained safe-zone state cases, distinct-source Group observer and Dying hierarchy; viewer source/target excluded from Medium; existing Top Row hierarchy and seat containment/hits.
Required local validation: Focused browser/mounted semantic helper tests and whitespace check, not full build/test/lint.
CI acceptance: Pushed revision CI green before next task; preserve meaningful tests and classify any failure.
Task acceptance criteria: Large primary dimensions, smaller Medium Source only when helper proves it, vertical direction, all visible descendants within safe zone/table above dock and >=6px from seats; unchanged Top Row/control authority. Stop if geometry requires unapproved loss of content.

### VIS-05C IMPLEMENTATION RESULT

Implementation SHA: `d04ca9e`.
Files changed: app/page.tsx; app/sequence-overrides.css; tests/browser/ui19.spec.mjs; README.md; append-only HANDOVER.md.
What changed: Existing projectMediumSourceForViewer now serves both seat modes, unchanged helper proof. Side Column uses source-above-primary with decorative downward arrow; primary portrait90x113/72x90/64x80, source56x70/48x60/42x53. CSS is scoped to Side Column; no new semantic model.
What was intentionally preserved: Top Row composition and arrow, semantic IDs/fail-closed focus, viewer exclusion, server/private authority, payloads, CurrentAction, seat/dock/control geometry, full Reaction/Dying content. No source inferred from labels/seat/HP.
Focused tests: 12 new hierarchy cases plus retained VIS-05B and Top Row VIS-04B: 53/53 Chromium passed. Existing presentation-client + room-safety-render: 56/56 passed with node --import tsx --test. Initial plain-node invocation failed before tests because it lacked the TSX loader; corrected command passed without source/test changes.
Broader tests: Named bounded tests only; no local full build/test/lint. git diff --check passed. 480px Dying screenshot visually inspected; full Stage and all visible descendants fit the retained safe zone and preserve >=6px seat clearance in the 18 VIS-05B cases.
Known gaps: Group participant density/progress and final Dock/hand structure are not claimed complete; real-device, WCAG, art approval remain unverified.
CI pending: Push this revision, wait exact CI, fix only real failures, then inspect the next bounded Group/AOE concern and its available public authority.

### VIS-05C STATUS: COMPLETED BY AGENT — CI GREEN

CI run: https://github.com/dmoneyUK/three-kingdoms/actions/runs/37183863972 for `1a10128dbb5c9f3f0fe15ecbfcaf357021dd5a4a`.
CI job: build-and-test `111381652287` completed/success; deploy `111382354553` completed/success. No independent production visual/health certification is claimed.
Final implementation/fix SHAs: `d04ca9e`, result ledger `1a10128`; no CI fixes.
Final test status: 53/53 bounded browser and 56/56 focused semantic/render tests locally; remote lint/build/full-browser/npm-test all passed.
Known remaining gaps: Group density/progress, Stage chrome/metadata simplification, final Dock and hand composition, real-device/WCAG/visual acceptance.
Recommended next bounded task: Reviewer must clarify the Group/AOE presentation authority boundary below before the autonomous run resumes. Agent completion is not reviewer acceptance.

## Group/AOE follow-up — BLOCKED — HUMAN REVIEW REQUIRED

Observed requirement: UX_V2_INTERACTION_STAGE_DESIGN.md section6 asks for resolved/current/pending group participants; sections0.35–0.36 and0.51 require explicit resolution semantics and per-participant status/order. The autonomous roadmap places multi-target/AOE participant hierarchy after Side Column adaptation. Card-density-only presentation is independently possible, but cannot be claimed to complete this progress requirement.

Exact missing authority:
- game/presentation-v2.ts PresentationInteractionScene/PresentationParticipantRoles expose IDs, original/active target scope, current participant, actor/resolver and continuity. They do not expose per-participant outcome/status or resolutionSemantics/semantic order.
- groupProjectionValues takes participantIds from group.remainingIds; historical originalTargetIds are separate. Presence/absence/order in these arrays does not prove RESOLVED/PENDING/PAUSED/NO_LONGER_APPLICABLE or an outcome. No progress inference was added.
- game/presentation-snapshot.ts aliases this accepted typed scene and keeps settlement null and transitionEvents empty; it cannot supply the missing progress contract.
- tests/presentation-client.test.mjs "Interaction Stage display hierarchy keeps Group/AOE scope facts without ordinal progress" and "Interaction Stage never infers ordinal progress from target order or scope length" explicitly forbid completed/remaining/sequence/progress inference from array shape. Both remain passing in the 56-test focused run.
- The Group observer browser fixture is geometry evidence only, not real engine proof of a new public status contract.

Why stopped: Proceeding with complete Group progress would require either inventing semantic authority in React (forbidden), weakening an accepted test (forbidden), or extending the accepted server/projector contract (requires reviewer architecture decision). The autonomous workflow section15 requires a human-review stop for missing required semantic authority/unclear architecture. No follow-up production/test code was changed.

Smallest human decision:
1. Authorize a presentation-only Group participant-density slice using proven target/current-participant IDs, neutral secondary cards and no completed/pending/order/outcome markers; explicitly defer progress semantics. Then continue independent Stage/Dock/hand visual work.
2. Or require progress now and provide/approve a bounded server-owned public Group status/resolution-semantics contract with real engine/API proof before React consumes it.

Forbidden alternatives: Infer progress from target-array order/differences, timeline/HP, turn/seat, compatibility Pending in React, or animation; silently drop the design's progress requirement while claiming complete.

## AUTONOMOUS RUN SUMMARY — stopped at human-review boundary

Tasks planned: VIS-05B and VIS-05C; Group/AOE follow-up assessed but not implemented.
Tasks completed: VIS-05B central safe zone; VIS-05C Large Focus/Medium Source; both COMPLETED BY AGENT — CI GREEN, not reviewer accepted.
Tasks with CI fixes: None. Local negative-test repro condition and missing TSX-loader invocation are accurately recorded above.
Implementation SHAs: `8fa843c`, `d04ca9e`; result/CI ledger commits `6becbcc`, `981755c`, `1a10128`.
Final branch head: Last CI-tested head `1a10128dbb5c9f3f0fe15ecbfcaf357021dd5a4a`; this append-only closeout commit is identified by Git history and changes HANDOVER only.
Final CI run: https://github.com/dmoneyUK/three-kingdoms/actions/runs/37183863972; build-and-test and deploy completed/success. HANDOVER-only pushes are excluded by workflow paths-ignore, so no new code-gate claim applies to the closeout commit.
Contracts preserved: Server/private/CurrentAction authority, causal snapshot and fail-closed focus, viewer Hero only in Dock, physical seat DOM/mapping/dimensions, Top Row, Inspect, full Reaction/Dying, existing gameplay/protocol.
New regression coverage: 19 safe-zone/negative-layout cases and12 hierarchy cases; local 96/96 then53/53 browser regressions, plus56/56 retained semantic/render tests. Full validation responsibility fulfilled by named CI runs, not local full suites.
Remaining visual gaps: Group density, open Stage chrome/duplicate metadata, final Dock hero/skills/equipment/judgement arrangement, larger single-layer hand and viewport/pan behavior; screenshot is intermediate, not final target.
Remaining semantic gaps: Per-participant Group status/outcomes and explicit resolution order/semantics lack an accepted public snapshot contract; durable counter history/settlement events remain reserved.
Known technical debt: Side-zone inset/thumbnail budget mirrors accepted CSS geometry; retained geometry tests protect against drift. Historical header/old RED task remains preserved intentionally; newest appended records govern this run.
Items requiring human visual review: 480px/10-player Negation safe zone; 480px Dying source-above-primary hierarchy; mobile whitespace/art balance and final design direction.
Items requiring real-device review: Touch pan/tap, response accessibility, reduced-height portrait and full WCAG; not certified here.
Recommended reviewer inspection order: VIS-05B CSS/descendant geometry and retained hit tests; VIS-05C helper reuse/viewer exclusion/portrait dimensions; named green CI runs; then decide Group scope option1 or2 before resume.

## Autonomous run resumed — user decision 2026-10-04

The user explicitly authorizes option1: presentation-only participant density with no progress/status/order/outcome claims, followed by independent Stage/Dock/hand work. The earlier stop is resolved for this bounded visual scope only; server-owned Group progress remains deferred, not implemented or accepted.

TASK ID: UX2.0VIS-07A — Neutral Group target-scope density
STATUS: PLANNED

Objective: Render proven external Group target identities as neutral secondary cards, retaining the authoritative primary focus as dominant.
Observed gap: GROUP_RESOLUTION currently shows one focus and text scope only, not density-adapted secondary target cards.
Why this task is next: Explicit user-approved resolution of the preceding authority boundary; VIS-05B/VIS-05C are CI-green.
Design authority: Autonomous workflow sections7.5/10, interaction design sections3C/6, and user's option1 decision. Progress semantics expressly deferred.
Current production evidence: InteractionStageView originalTargets is proven historical target scope; currentParticipant remains separate. Existing HeroFocus and MediumSource helpers stay unchanged.
Files expected in scope: game/hero-focus.ts (pure visual density projection only), app/page.tsx, app/sequence-overrides.css, focused semantic/browser tests and fixture, README.md, append-only HANDOVER.md.
Implementation requirements: GROUP_RESOLUTION only; original target scope label, no current-eligibility/progress claim; exclude viewer and already-rendered primary/source from secondary copies; 2–3 external targets medium, 4+ compact; no arbitrary primary if semantic focus is absent; known IDs decorated only after selection.
Explicit non-goals: Resolved/pending/paused/outcome/order markers, new public protocol, local selection preview, nested-frame Group inference, gameplay/legality/hidden data, Stage chrome/Dock changes in this task.
Forbidden shortcuts: No array-difference progress, compatibility Pending/timeline/HP/turn/seat inference, duplicate viewer, controls in Stage, or fabricated selected-order labels.
Required regression tests: Pure density/identity/viewer/REST/ambiguous/unknown/legacy/order guards; dense6/10-player Group scope at1440/650/480; retained safe-zone, current focus, semantic controls and Top Row hierarchy.
Required local validation: Focused semantic/render and browser layout tests only; whitespace check per autonomous workflow. Full checks in CI.
CI acceptance: Exact push must be green before the next implementation.
Task acceptance criteria: Neutral external cards from proven originalTargets only; proper density, current focus dominant when proven, no progress or eligibility claims; visible content inside safe zone/table and above Dock without seat/control interference.

### VIS-07A IMPLEMENTATION RESULT

Implementation SHA: `69e04cd`.
Files changed: game/hero-focus.ts, app/page.tsx, app/sequence-overrides.css, tests/presentation-client.test.mjs, tests/browser/fixture.jsx, tests/browser/ui19.spec.mjs, README.md, append-only HANDOVER.md.
What changed: Pure GROUP_RESOLUTION-only historical target-scope projection; deduplicates viewer/primary/rendered source; medium/compact density by external target count. Neutral read-only cards labelled Original target scope; current primary remains unchanged. Unknown decorations retain proven IDs. New dense fixture is geometry evidence only, not new engine semantic proof.
What was intentionally preserved: Snapshot/protocol/server/legality/currentAction/private data, gameplay, focus fail-closed, Top Row and side mapping/dimensions, Inspect, existing Reaction/Dying and Dock controls. No progress/order/outcome/eligibility claims or array-difference inference.
Focused tests: 57/57 presentation-client + room-safety-render (one new pure projection test); initial browser run60/62 found actual dense10 overflow at1440 (~6px) and650 (~19px). Fixed only new compact-card padding/gaps and3-column breakpoint600px; no assertion relaxed, content hidden or accepted primary resized. Final62/62 bounded browser regression and9/9 fresh VIS-07A rerun passed; 480px10-player Group screenshot inspected.
Broader tests: Named bounded browser/semantic/render tests only; no local full build/test/lint. git diff --check passed.
Known gaps: Public Group progress/order/outcomes remain explicitly deferred by user's option1 approval. Stage shell/duplicate metadata and final Dock/hand still intermediate, not final visual acceptance.
CI pending: Push code and this ledger, wait exact run and repair only actual failures. Only then plan next bounded visual task.

### VIS-07A STATUS: COMPLETED BY AGENT — CI GREEN

Implementation SHA: `69e04cd`; tested result-ledger revision: `53406c95db001b62a53f07a1ffa5276674797094`.
CI run: https://github.com/dmoneyUK/three-kingdoms/actions/runs/37184619061 — completed/success, confirmed earlier in this execution before the latest user-supplied workflow took effect. No new CI polling was performed for this closeout.
CI job: build-and-test `111383853380` success; the whole run completed successfully, including deployment. No independent production health or visual certification is claimed.
Final test status: Previously run focused semantic/render tests 57/57, bounded browser regressions 62/62, fresh VIS-07A browser rerun 9/9. No tests were rerun for this HANDOVER-only closeout. No CI fixes required.
Files changed in this closeout: HANDOVER.md only, append-only. Implementation files and authority boundaries are recorded in the preceding result.
Known remaining gaps: Group progress/order/outcomes remain deferred; open Stage shell/duplicate metadata and final Dock/hand composition remain unfinished. Agent completion is not reviewer acceptance.
Recommended next bounded task: Reviewer-authored Side Column open Stage shell task, preserving semantic content, participant hierarchy, Reaction/Dying, accepted seats, Top Row and Dock controls.
Workflow boundary: The latest user-supplied AGENTS.md requires reviewer-authored task authority and prohibits CI polling. The older autonomous planning/CI-loop instructions conflict with those rules. No new task was self-authored or implemented; await the reviewer's next bounded HANDOVER task or an explicit user clarification of this conflict.

## TASK ID: UX2.0VIS-07B — Group density after rendered-participant exclusions
STATUS: PLANNED

Objective: Choose neutral Group-card density from the secondary participant cards actually rendered.
Observed gap: `projectGroupTargetScopeForViewer` currently chooses density before excluding the separately rendered viewer, primary focus, and Medium Source; six-player Group therefore uses compact styling for only three cards.
Design authority: AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md §§7.5, 19–20; approved neutral-scope decision in VIS-07A; latest user instruction on rendered participant density.
Scope: `game/hero-focus.ts`, focused projection/browser tests, append-only HANDOVER.md.
Requirements: deduplicate proven historical target IDs; exclude viewer/primary/source first; use medium below four rendered secondary cards and compact at four or more; preserve neutral identity-only semantics and fail-closed focus; exercise 2/3/4-card thresholds plus 4/6/10-player layouts at 1440/650/480px.
Non-goals: Group progress/order/outcomes, authority/protocol/gameplay changes, Stage chrome, Dock/hand composition, README changes.
Validation: focused presentation-client test file, bounded browser layout tests for VIS-07B and retained VIS-07A, `git diff --check`.
Acceptance: Density matches the post-exclusion rendered card count; existing IDs and responsive bounds remain correct, with no progress or eligibility claims.

### VIS-07B IMPLEMENTATION RESULT

Implementation SHA: `67dca61`.
Files changed: `game/hero-focus.ts`, `tests/presentation-client.test.mjs`, `tests/browser/ui19.spec.mjs`, append-only `HANDOVER.md`.
Change: Group density now uses the deduplicated secondary cards after viewer, primary, and Medium Source exclusions. The 6-player fixture renders three secondary cards as medium; the 10-player fixture renders seven as compact. No Group progress semantics changed.
Focused tests: `node --import tsx --test tests/presentation-client.test.mjs` — 38/38; `npx playwright test --config tests/browser/layout.config.mjs --grep 'UX2.0VIS-07A' --workers=2` — 9/9 at 1440/650/480px for 4/6/10 players; `git diff --check` passed. No full suite/build/lint was run locally.
Known gaps: Group progress/order/outcomes remain deferred; this task addresses only card density.
CI pending: implementation and result record are being pushed; wait for GitHub Actions on that revision before planning another task.

### VIS-07B STATUS: COMPLETED BY AGENT — CI GREEN

Tested revision: `55e18c8ada0608e080cc87f42ff72a807949161f` (implementation `67dca61`).
CI run: https://github.com/dmoneyUK/three-kingdoms/actions/runs/37186359071 — completed/success.
Jobs: `build-and-test` `111388996568` and `deploy` `111389762790`, both completed/success.
CI fixes: none.
Next-task rationale: VIS-07A's actual rendered-card density is now corrected. The approved Side Column Stage direction still calls for an open shell and compact context; inspect the current Stage shell/metadata and split that visual gap into one bounded task.

### VIS-07B STATUS: COMPLETED BY AGENT — CI GREEN

Tested revision: `55e18c8ada0608e080cc87f42ff72a807949161f` (implementation `67dca61`).
CI run: https://github.com/dmoneyUK/three-kingdoms/actions/runs/37186359071 — completed/success; `build-and-test` `111388996568` and `deploy` `111389762790` both passed.
CI fixes: none.

## TASK ID: UX2.0VIS-08A — Open Side Column Interaction Stage shell
STATUS: PLANNED

Objective: Remove the dashboard-like outer panel chrome from the Side Column Interaction Stage.
Observed gap: The shared `.interaction-stage` still supplies opaque background, border, shadow, padding, and a full-width divider header in Side Column; the accepted Top Row open-shell treatment does not currently cover Side Column.
Design authority: AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md §§7.3, 8, 20; accepted VIS-05B safe-zone and VIS-05C participant hierarchy; current approved final mockup direction.
Scope: `app/sequence-overrides.css`, focused `tests/browser/ui19.spec.mjs`, append-only `HANDOVER.md`.
Requirements: make only the Side Column outer shell/header open and compact; preserve Stage geometry and all text/semantic regions; retain independent Hero Focus, Reaction Chain, and Dying panel chrome; preserve seat, safe-zone, dock, Top Row, and reduced-motion behavior.
Non-goals: duplicate metadata cleanup, participant/progress semantics, Dock/hand/Judgement changes, gameplay or protocol changes, README changes.
Validation: focused browser cases for interaction, Negation, Dying, and Group-observer states at 1440/650/480px; retained geometry/hit assertions; screenshot inspection; `git diff --check`.
Acceptance: Side Column Stage outer background is transparent with no border/shadow/padding; compact header has no divider; inner semantic panels retain their own visible surfaces; Stage stays inside the accepted safe zone and above the Dock without clipping.

### VIS-08A IMPLEMENTATION RESULT

Implementation SHA: `48287fa`.
Files changed: `app/sequence-overrides.css`, `tests/browser/ui19.spec.mjs`, append-only `HANDOVER.md`.
Change: Side Column now uses a transparent, unpadded Stage shell and fit-content divider-free header, matching the accepted open Top Row composition. Hero Focus, Reaction Chain, and Dying panels retain their own backgrounds/borders. No semantic or control markup changed.
Focused validation: 40/40 browser cases passed (`VIS-08A`, retained `VIS-05B` safe-zone/hit checks, and `VIS-07A` Group density) at 1440/650/480px; `git diff --check` passed. 480px Dying and 10-player Group screenshots inspected. An initial combined run's only two failures were an overly strict assertion that the header must be narrower than the Stage at 480px; the content fills that narrow width naturally. The final assertion checks that it never overflows.
Known gaps: Stage metadata duplication and final Dock/hand composition remain. No full suite/build/lint was run locally.
CI pending: implementation/result revision must complete GitHub Actions before another task begins.

### VIS-08A STATUS: COMPLETED BY AGENT — CI GREEN

Tested revision: `b96f5bb4058a8b235f1610dc8a635bfc4227bbcc` (implementation `48287fa`).
CI run: https://github.com/dmoneyUK/three-kingdoms/actions/runs/37187150243 — completed/success.
Jobs: `build-and-test` `111391406926` and `deploy` `111392199055`, both completed/success.
CI fixes: none.
Next-task rationale: inspect the current Interaction Stage focus/context projection for remaining misleading or duplicate metadata, especially whether an unproven single focus is displayed when multiple targets exist; select only a design-authorized, bounded correction.

## TASK ID: UX2.0VIS-08B — Fail-closed Interaction Stage metadata focus
STATUS: PLANNED

Objective: Keep the Stage metadata from presenting an arbitrary active target as its single focus.
Observed gap: `buildInteractionStageDisplayModel` falls back to `activeTargets[0]` when `currentParticipant` is absent, unlike `buildHeroFocusView`, which only permits a sole-target fallback outside Dying.
Design authority: AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md §§6.4, 7.3, 7.5, 19; UX_V2_INTERACTION_STAGE_DESIGN.md §3C and §6; accepted VIS-07A requirement that an absent semantic focus must not produce an arbitrary primary.
Scope: `game/presentation-client.ts`, focused `tests/presentation-client.test.mjs`, a bounded mounted fixture/test in `tests/browser/fixture.jsx` and `tests/browser/ui19.spec.mjs`, append-only `HANDOVER.md`.
Requirements: use a proven current participant; otherwise retain only the existing unique-active-target fallback for non-Dying stages. For multiple active targets or Dying without a current participant, expose no focus ID and label the metadata row as scope while retaining the proven active-scope summary. Do not infer progress, order, eligibility, or gameplay state.
Validation: focused presentation-client tests; mounted ambiguous Group case plus retained VIS-07A browser regression; `git diff --check`. No local full suite/build/lint.
Acceptance: ambiguous multi-target and unproven Dying states do not render the first target as `FOCUS`; proven current/sole targets remain unchanged, and no authority or privacy boundary changes.

VIS-08B scope clarification: include `app/page.tsx` only to label an identity-bearing focus as `FOCUS` and an identity-free target summary as `SCOPE`; no action/control behavior changes.

### VIS-08B IMPLEMENTATION RESULT

Implementation SHA: `826c062`.
Files changed: `game/presentation-client.ts`, `app/page.tsx`, `tests/presentation-client.test.mjs`, `tests/browser/fixture.jsx`, `tests/browser/ui19.spec.mjs`, append-only `HANDOVER.md`.
Change: Stage metadata now selects the proven current participant, or a sole active target only outside Dying. Ambiguous/empty scope and unproven Dying expose no focus identity; the row is labelled `SCOPE` and retains the public scope summary. No progress/order/eligibility or gameplay semantics were added.
Focused validation: `node --import tsx --test tests/presentation-client.test.mjs` — 39/39; `npx playwright test --config tests/browser/layout.config.mjs --grep 'UX2.0VIS-08B|UX2.0VIS-07A' --workers=2` — 10/10, including the mounted ambiguous Group case and retained 4/6/10-player Group layouts at 1440/650/480px; `git diff --check` passed.
Known gaps: Group progress/order/outcomes remain deferred; no full local suite/build/lint was run.
CI pending: push the implementation and this result, then wait for Actions on the exact resulting revision before selecting another task.

### VIS-08B STATUS: COMPLETED BY AGENT — CI GREEN

Tested revision: `17e75fc4e154c96356f730813d0bb5455cdc55f` (implementation `826c062`).
CI run: https://github.com/dmoneyUK/three-kingdoms/actions/runs/37188237593 — completed/success.
Jobs: `build-and-test` `111394726206` and `deploy` `111395564436`, both completed/success.
CI fixes: none.
Next-task rationale: VIS-08B closes the ambiguous-focus fallback. Next inspect the remaining Stage metadata against the already-rendered Hero Focus, Reaction Chain, and Dying panels; simplify only rows proven redundant while retaining unique public context.

## TASK ID: UX2.0VIS-08C — Dying handoff metadata deduplication
STATUS: PLANNED

Objective: Remove repeated Dying source/focus/decision identities from the generic Stage metadata when the dedicated semantic panels already render them.
Observed gap: Dying currently renders Medium Source, Hero Focus, and Dying/Rescue handoff, then repeats matching source/focus/decision text in `.interaction-stage-meta-region`.
Design authority: AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md §§7.3, 19; UX_V2_INTERACTION_STAGE_DESIGN.md §§0.6.4, 3C, 10; retain only semantically useful context.
Authority and boundary: compare existing proven player IDs in `InteractionStageView`, `HeroFocusView`, `MediumSourceView`, and `DyingHandoffView`; do not infer identity from names or legacy data. No gameplay, protocol, or control changes.
Scope: `app/page.tsx`, focused `tests/browser/ui19.spec.mjs`, append-only `HANDOVER.md`.
Requirements: suppress Dying source/focus summaries only when their exact identities are already rendered in Medium Source/Hero Focus; suppress decision/resolver rows only when the same IDs are shown by Dying Handoff. Preserve distinct source identity, changed original-target scope, and nested context; omit empty metadata wrappers. Leave non-Dying layouts unchanged.
Validation: mounted Dying regression at representative desktop/mobile widths, retained VIS-05B Dying safe-zone/hit checks and VIS-08A open-shell checks, `git diff --check`. No local full suite/build/lint.
Acceptance: Dying retains its semantic panels and any unique context but no longer repeats their proven identities in a redundant footer metadata block; no other state loses metadata.

VIS-08C layout clarification: treat the two-column SOURCE/FOCUS strip as a unit. Remove it only when both identities are represented in their matching visible semantic panels; otherwise keep the strip intact. Decision/resolver context rows may be deduplicated independently by exact ID.

### VIS-08C IMPLEMENTATION RESULT

Implementation SHA: `4d8a967`.
Files changed: `app/page.tsx`, `tests/browser/ui19.spec.mjs`, append-only `HANDOVER.md`.
Change: In Dying only, the SOURCE/FOCUS strip is omitted when both role identities are already visible in the matching Medium Source/Hero Focus or Dying Handoff panels. Decision/resolver rows are omitted only for exact IDs already shown by Dying Handoff. Distinct roles, changed original-target scope, nested context, and non-Dying metadata remain available; empty Dying metadata wrappers are removed. No semantic/control behavior changed.
Focused validation: `npx playwright test --config tests/browser/layout.config.mjs --grep 'UX2.0VIS-08C|UX2.0VIS-05B 6 players dying|UX2.0VIS-08A dying' --workers=2` — 9/9 across desktop/mobile, retained safe-zone/hit and open-shell checks; `git diff --check` passed. The initial browser attempt caught a missing JSX conditional brace; fixed before the passing rerun.
Known gaps: This closes the Dying duplicate footer only; remaining non-Dying metadata polish and final Dock/hand work remain. Group progress/order/outcomes remain deferred. No full local suite/build/lint was run.
CI pending: push implementation and this result, then wait for Actions on the exact resulting revision before selecting another task.

### VIS-08C CI failure correction — pending retry

CI run `37189288243`, build-and-test job `111397913546`, failed on five UI-19 assertions that still required the Dying `.interaction-stage-meta-region` hook. These assertions contradicted the planned empty-wrapper omission; no production defect was reported. Updated the VIS-02-FIX1/VIS-03B/VIS-03C checks to assert omission for Dying while retaining the mounted Hero/Event, handoff visibility, and geometry/overlap checks; non-Dying metadata remains required. No production files changed for this CI correction.
Focused validation: relevant Dying cases plus VIS-08C and retained VIS-05B/VIS-08A checks — 18/18 passed; `git diff --check` passed. Awaiting CI on the corrected test revision.

### VIS-08C STATUS: COMPLETED BY AGENT — CI GREEN

Tested revision: `41d6c27f7c4fc7a6f58bef82d40b88cf40dbcdb2` (implementation `4d8a967`; CI test-contract correction `41d6c27`).
CI run: https://github.com/dmoneyUK/three-kingdoms/actions/runs/37189810296 — completed/success.
Jobs: `build-and-test` `111399459355` and `deploy` `111400272036`, both completed/success.
CI fix: updated the stale Dying metadata-wrapper assertions; production code unchanged. Focused corrected browser coverage passed 18/18 locally.
Known gap: This closes only the proven duplicate Dying metadata; Local Player Dock composition and larger-hand behavior remain unfinished. Human Reviewer acceptance is not implied.
Recommended next bounded task: Move persistent local Judgement cards from the independent Dock column into a compact overlay associated with the local Hero, as already required by the approved design.

## TASK ID: UX2.0VIS-09A — Move Persistent Local Judgement Into the Hero Overlay
STATUS: PLANNED

Objective: Show the viewer's persistent Judgement cards as a compact overlay associated with the local Hero, without a permanent independent Dock Judgement panel.
Observed gap: `LocalPlayerDock` currently renders `player.judgementCards` in `.local-judgement-panel`, a dedicated third `.local-dock-zones` grid column.
Why this task is next: VIS-08C is CI-green; this is a concrete, independently testable mismatch with the approved Local Player Dock structure and the remaining persistent-Judgement visual direction.
Design authority: `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md` §§7.7, 7.12, 20; `docs/UX_V2_INTERACTION_STAGE_DESIGN.md` §§0.77–0.79, 2.6. Persistent state belongs on the Hero; active Judgement resolution remains in Interaction Stage.
Current production evidence: The local Dock already receives the viewer's `me` projection and renders its `judgementCards` with physical IDs, `CardFace`, info actions, and `hiddenCardIds`; current CSS reserves a fixed `--judgement-panel-width` third track.
Files expected in scope: `app/page.tsx`, `app/sequence-overrides.css`, `tests/room-safety-render.test.mjs`, `tests/browser/fixture.jsx`, `tests/browser/ui19.spec.mjs`, append-only `HANDOVER.md`.
Implementation requirements: Anchor the existing local Judgement cards compactly to the local Hero portrait; preserve each physical card ID, artwork, inspect affordance, and in-flight hiding; remove the independent panel/third track; keep overlay controls as siblings of, not nested buttons inside, the Hero button; retain Skills-before-Equipment layout and responsive Dock bounds.
Explicit non-goals: No gameplay, protocol, snapshot, CurrentAction, legality, opponent-zone, active-Stage, or full Hand/Dock redesign; do not add new Judgement selection semantics.
Forbidden shortcuts: Do not infer Judgement status or legality from timeline/animation; do not duplicate or hide local cards; do not create nested interactive buttons or let the overlay block Hero, Hand, or action controls.
Required regression tests: Mounted local one-/two-card and empty-zone states; prove cards are anchored to the viewer Hero and rendered once, remain inspectable, and stay within responsive bounds at 1440/650/480px; retain opponent-zone and active Interaction Stage coverage.
Required local validation: `node --import tsx --test tests/room-safety-render.test.mjs`; focused `tests/browser/ui19.spec.mjs` cases via `tests/browser/layout.config.mjs`; `git diff --check`. No local full suite/build/lint.
CI acceptance: Exact implementation revision build-and-test and deployment must complete successfully before another task is planned.
Task acceptance criteria: Persistent local Judgement cards are compact Hero overlays rather than a separate Dock column; empty local Judgement state consumes no overlay content; card identity/inspection and responsive usability remain intact; active Judgement resolution still belongs to Interaction Stage; no authority or gameplay boundary changes.
Execution boundary: Planning only in this handoff; stop before implementation so the user can switch Agent models.

### VIS-09A IMPLEMENTATION RESULT

Implementation SHA: `59f15192dc580419443f50651325b9ea4f3abe79`.
Files changed: `app/page.tsx`, `app/sequence-overrides.css`, `tests/room-safety-render.test.mjs`, `tests/browser/fixture.jsx`, `tests/browser/ui19.spec.mjs`.
Change: Viewer-projected persistent Judgement cards now render once as inspectable siblings over the local Hero; empty state creates no overlay. Removed the dedicated panel and third Dock track. Existing physical IDs, `CardFace`, info controls, and `hiddenCardIds` in-flight hiding remain. Skills/Equipment, Hand, action controls, opponent zones, and active Stage rendering are unchanged; no gameplay, protocol, authority, or selection behavior changed. The user's follow-up authorized implementation after the planning-only model-switch pause; do not start a subsequent task.
Focused validation: `node --import tsx --test tests/room-safety-render.test.mjs` — 19/19; `node --import tsx --test --test-name-pattern='mounted Judgement' tests/active-skill-interactions.test.mjs` — 3/3; `npx playwright test --config tests/browser/layout.config.mjs --grep 'UX2.0VIS-09A|UX2.0VIS-08A|UX2.0VIS-08C' --workers=2` — 18/18, including empty/one/two local cards at 1440/650/480px, card/Hero inspection, no Hand/action overlap, and retained opponent/Stage coverage; `git diff --check` passed. No full test suite, build, or lint was run locally.
Known gaps: CI and deployment for the pushed implementation revision are pending; Human Reviewer acceptance remains separate. No follow-up task is planned at the user's request.

### VIS-09A STATUS: COMPLETED BY AGENT — CI GREEN

Tested revision: `159205965e2464c25d088b8e514bb20c26462359` (implementation `59f15192dc580419443f50651325b9ea4f3abe79`).
GitHub Actions run: [#617](https://github.com/dmoneyUK/three-kingdoms/actions/runs/37191718705) — completed/success.
Jobs: `build-and-test` `111405126906` and `deploy` `111405995778`, both completed/success.
CI fixes: none. Human Reviewer acceptance remains separate; no independent production-health certification is claimed.

## TASK ID: UX2.0VIS-09B — Navigate Overflowing Hand Cards in One Row
STATUS: PLANNED

Planning authority: User explicitly requested a next-task plan after reporting VIS-09A CI success; plan only in this turn.
Objective: Keep large local hands reachable in one horizontal layer without shrinking cards below their usable size or letting the rail spill outside the Hand viewport.
Observed gap: `calculateHandCardStep` bottoms out at a 30px step, while `.local-hand-rail` remains `overflow: visible` with fixed 68px cards and no horizontal pan. At 25 cards the minimum-step rail spans 788px, exceeding narrow Hand areas. README currently records only the 1/5/10-card rail contract.
Design authority: `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md` §§7.11, 10, 19; `docs/UX_V2_INTERACTION_STAGE_DESIGN.md` §§0.82–0.88, 2.2, 2.9. Use platform-native horizontal scrolling/panning; do not invent a custom gesture threshold.
Existing authority to preserve: Only the viewer's `room.myHand` physical cards and IDs are rendered; selection and eligibility remain governed by existing `CurrentAction`/selection state. No gameplay or server changes.
Likely scope: `app/page.tsx`, `app/sequence-overrides.css`, focused `tests/room-safety-render.test.mjs` and `tests/browser/ui19.spec.mjs` coverage using existing fixtures/helpers, relevant README contract, append-only `HANDOVER.md`.
Requirements:
- Keep one row and the existing usable card dimensions/overlap until geometry reaches its minimum; then provide horizontal navigation instead of further shrinking or clipping cards.
- Keep every physical card rendered once and reachable after pan; preserve card identity/order, inspection, selected-card visibility, and existing action controls.
- A pan gesture must not activate/select the card under the gesture; ordinary taps and info controls must still work.
- Prove fit/overflow behavior for 5/10/15/20/25+ cards at 1440/650/480px, including end-card reachability, no document-level horizontal overflow, and no overlap with action controls.
- Update the README's 1/5/10 hand statement to the proven behavior; do not claim touch-device certification.
Non-goals: New gameplay/legality, changing selection semantics, a second row, hand-count-specific breakpoints, and preserving a semantic anchor when cards are authoritatively added/removed (that remaining §0.86–0.87 behavior must not be claimed complete by this slice).
Stop condition: If the required scroll viewport cannot preserve the selected-card raise and existing controls without an unapproved composition trade-off, record the measured conflict and stop for human review.
Validation/delivery: Run only focused hand/browser checks locally; GitHub Actions owns full checks. Push code/tests/docs/handover together, do not poll CI, verify remote HANDOVER, then stop for the user's CI report.
