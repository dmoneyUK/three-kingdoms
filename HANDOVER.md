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

## Reviewer status — UX2.0VIS-03C ACCEPTED

Reviewed implementation: `44f5838902d48618697dc7eacc28f5b01643a43e`.

Accepted facts that the next task must preserve:
- top-row Interaction Stage outer shell is open: transparent background, zero border, zero shadow and zero shell padding;
- the semantic Stage element/data attributes remain mounted;
- the header remains a compact fitted label;
- inner Reaction Chain / Dying panels retain their own chrome;
- VIS-03B Hero Focus sizes are unchanged;
- Hero/Event/Meta regions, safe-zone geometry, seats, LocalPlayerDock, side-column/global shell and gameplay authority are unchanged;
- focused VIS-03C tests reported 9/9 PASS; retained VIS-02-FIX1/VIS-03B/VIS-03C tests reported 27/27 PASS.

Remaining design mismatch:
- UX V2 requires the viewer's own hero to remain only in LocalPlayerDock and never be duplicated into Interaction Stage;
- current `buildHeroFocusView` is intentionally public/viewer-equal and can select the viewer as current participant;
- the fix must therefore be a separate viewer-specific visual projection, not a change to public semantic authority.

# NEXT TASK — UX2.0VIS-03D: Enforce Viewer Self-Projection in Hero Focus Without Changing Public Semantics

## Objective
Fix exactly one viewer-centric presentation defect:

**The viewer's own hero must never appear as a duplicate central Hero Focus. Keep public Hero Focus semantics viewer-equal, then apply a separate viewer-specific visual projection that keeps an external proven primary or, when the public primary is the viewer, substitutes exactly one uniquely-proven external source/target counterpart.**

Do not implement full two-hero source/target composition yet. Do not redesign Reaction Chain, meta content, seats, safe-zone geometry, LocalPlayerDock, or gameplay.

## Design authority
`docs/UX_V2_INTERACTION_STAGE_DESIGN.md` requires:
- the viewer's own hero is never duplicated into Interaction Stage;
- if the viewer is the source, show the external target centrally and keep YOU in LocalPlayerDock;
- if the viewer is the target, show the external source centrally and keep YOU in LocalPlayerDock;
- if the viewer is the current decision actor, decision emphasis belongs in LocalPlayerDock;
- public event facts remain viewer-equal while spatial presentation is viewer-centric.

Preserve this boundary:
- **public semantic model = viewer-equal**
- **visual projection = viewer-specific**

## Existing authority to preserve

### Public Hero Focus helper
`game/hero-focus.ts::buildHeroFocusView` currently selects only:
1. proven `currentParticipant`;
2. otherwise one sole proven active target;
3. Dying never guesses from active-target fallback.

Its existing semantic tests prove viewer-equal public output.

**Do not change those selection rules.**
**Do not make `buildHeroFocusView` accept viewerId.**
**Do not delete or weaken the existing viewer-equality test.**

### Allowed counterpart facts
A viewer fallback may use only identities already present in `InteractionStageView`:
- `stage.source`
- `stage.activeTargets`

Do not use decisionActor, resolver, turn owner, CurrentAction, Pending, timeline, actionPlayerId, card/hero names, or array position as participant authority.

## Files expected in scope
Production:
- `game/hero-focus.ts`
- `app/page.tsx`

Tests:
- `tests/presentation-client.test.mjs`
- `tests/browser/fixture.jsx`
- `tests/browser/ui19.spec.mjs`

Touch `app/globals.css` only if a tiny role-label style adjustment is required. Do not change layout geometry.

## Required implementation

### 1. Add a separate pure viewer projection helper
In `game/hero-focus.ts`, add a pure helper such as:

`projectHeroFocusForViewer(stage, publicFocus, viewerId, resolvePlayerDisplay)`

Equivalent naming is acceptable.

The existing `buildHeroFocusView` remains the public/viewer-equal semantic helper.

### 2. Exact projection algorithm

#### Case A — no public primary
If `publicFocus.primary` is null:
- return the public focus unchanged;
- do not invent a participant.

#### Case B — public primary is external
If `publicFocus.primary.id !== viewerId`:
- return the public focus unchanged.

#### Case C — public primary is the viewer
If `publicFocus.primary.id === viewerId`:
- suppress that local hero from central presentation;
- collect external candidates only from:
  1. `stage.source` when it has an ID different from viewerId;
  2. every `stage.activeTargets` identity with an ID different from viewerId;
- de-duplicate by player ID.

Then:
- exactly 1 unique external candidate -> render that candidate;
- 0 candidates -> visible focus with `primary:null`;
- >1 candidates -> visible focus with `primary:null`.

Never choose the first candidate from an ambiguous set.

### 3. Counterpart role label
For the unique projected external candidate:
- if its ID is in `stage.activeTargets`, role label = `CURRENT TARGET`;
- otherwise, if its ID equals `stage.source.id`, role label = `SOURCE`.

Extend the Hero Focus role-label type to allow `SOURCE` if required.

Do not relabel decisionActor or resolver as source/target.

### 4. Public decoration only
Resolve projected counterpart name/hero/HP through the existing `resolvePlayerDisplay` callback.

Use the same public/unknown decoration behavior as current Hero Focus:
- missing decoration stays unknown;
- never substitute another player;
- no private hand identities, providers or action options.

Small internal refactoring is allowed only to reuse the same decoration code.

### 5. Apply projection only at React render boundary
Update `InteractionStage` to receive:

`viewerId: string | null`

In `GameRoom`, pass:

`viewerId={room.meId}`

Inside InteractionStage:
1. build `stage` exactly as today;
2. build public `heroFocus = buildHeroFocusView(...)`;
3. call the new viewer projection helper;
4. render `HeroFocus` from the projected result.

Do not change `PresentationClientView`, `PresentationSnapshot`, projector/server output, participant-role arrays or gameplay.

### 6. Preserve LocalPlayerDock role projection
When local Hero Focus is suppressed:
- keep existing local dock semantic role classes/data unchanged;
- current-participant / active-target / decision treatments remain on LocalPlayerDock;
- do not add a second local hero image anywhere else.

## Correct one known synthetic Dying-fixture contradiction
Current `tests/browser/fixture.jsx` Dying data has:
- dying target `p2`;
- viewer/decision actor `p3`;
- but generic fixture construction incorrectly sets `currentParticipantId=p3`.

Real engine/API evidence in `tests/api/presentation-v2-engine.test.mjs` proves Dying uses:
- originalTargetIds = dying player;
- activeTargetIds = dying player;
- currentParticipantId = dying player;
- decisionActorId = rescuer.

Correct only the synthetic Dying browser fixture:
- source = `p1`;
- currentParticipantId = `p2`;
- activeTargets = [`p2`];
- decisionActorId = `p3`;
- activeResolverId = `p3`.

Do not change production projector/gameplay for this fixture.

Update browser expectations that currently expect Dying Hero Focus `p3`; the corrected public primary is `p2`.

## Required unit regressions
Extend `tests/presentation-client.test.mjs`.

Keep the existing `buildHeroFocusView` viewer-equality regression unchanged.

Add tests for the new viewer projection helper:

1. external primary unchanged: public primary B, viewer A -> B.
2. viewer is source/current primary; source A, activeTargets [B] -> B, role CURRENT TARGET.
3. viewer is target/current primary; source A, activeTargets [B], viewer B -> A, role SOURCE.
4. same external ID appears as source and active target -> de-duplicate and render it once.
5. source B + active target C while viewer A is public primary -> ambiguous -> primary null.
6. source/targets all viewer -> primary null.
7. unknown display decoration stays attached to the same proven candidate and never substitutes another ID.

## Required browser regression
Use 4-player top-row fixtures at 1440x900, 650x900 and 480x900.

### Interaction
Existing `state="interaction"` has viewer/public primary `p1`, source `p1`, active target `p2`.

Assert:
- no central Hero Focus player ID `p1`;
- exactly one central Hero Focus;
- projected central Hero Focus = `p2`;
- LocalPlayerDock anchor remains `p1`.

### Negation
Existing `state="negation"` has viewer/public primary `p2` and one unique external proven `p1`.

Assert:
- no central Hero Focus `p2`;
- projected central Hero Focus = `p1`;
- LocalPlayerDock remains `p2`.

### Dying
After fixture correction:
- viewer = `p3`;
- dying/current participant = `p2`;
- central Hero Focus remains `p2`;
- LocalPlayerDock remains `p3`;
- Dying handoff identifies `p2` as dying player and `p3` as decision actor.

For all states/widths retain existing VIS-02/VIS-03A/B/C containment and no-overflow checks.

## Forbidden shortcuts
Do not:
- make public PresentationSnapshot/PresentationClientView viewer-specific;
- change `buildHeroFocusView` candidate rules;
- remove its viewer-equality regression;
- use decision actor/resolver/CurrentAction/Pending/timeline as fallback participant;
- choose from an ambiguous multi-external set;
- duplicate local hero centrally;
- change Hero Focus dimensions;
- move seats/safe zone/dock;
- implement two-external-hero composition;
- change Reaction Chain/meta layout;
- modify gameplay/server/projector semantics.

## Validation
Run and report:
- focused unit tests for viewer Hero projection;
- focused VIS-03D browser tests;
- retained VIS-02-FIX1 / VIS-03B / VIS-03C browser tests;
- `npm run test:fast` if allowed locally;
- `npm run test:browser` if allowed locally;
- `npm run build` if allowed locally;
- `npm run lint` if allowed locally;
- `git diff --check`.

Do not claim unrun commands passed. Do not inspect or wait for CI.

## Execution result
Append only:
- full implementation SHA;
- files changed;
- exact viewer-projection rules;
- confirmation `buildHeroFocusView` stayed viewer-equal;
- Dying fixture correction and evidence source;
- unit/browser validation results;
- any remaining GAP.

Do not declare the task accepted. Reviewer decides after inspection.

Push and verify remote HANDOVER, then STOP.

## Acceptance
Pass only if the viewer's own hero can no longer be duplicated as central Hero Focus, exactly one uniquely-proven external source/target counterpart is shown when available, ambiguous external sets fail closed, Dying fixture semantics match existing real API evidence, and all existing layout/containment/gameplay/public-authority contracts remain unchanged.
