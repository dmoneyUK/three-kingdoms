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

## Reviewer status — UX2.0VIS-03D ACCEPTED

Reviewed implementation: `b389949bc0751520e11b79ee5cd36f14b09b7805`.

Accepted facts that the next task must preserve:
- `buildHeroFocusView` remains the viewer-equal public semantic selector and its current-participant / sole-active-target / Dying fail-closed rules were not changed;
- viewer-specific self-projection is isolated in `projectHeroFocusForViewer`;
- a local public primary is replaced only by one unique external candidate derived from proven source/active-target identities; ambiguity fails closed;
- viewer hero is not duplicated centrally in the reviewed Interaction / Negation / Dying paths;
- LocalPlayerDock role projection remains unchanged;
- the synthetic Dying browser fixture now matches existing engine/API evidence: dying/current participant p2, rescuer/decision actor p3;
- the extra mounted Duel regression change is accepted because the viewer-centric projection intentionally changed only the expected central visual participant while preserving controls/protocol;
- focused public/viewer-projection unit tests reported 2/2 PASS, mounted interaction regressions 6/6 PASS, focused browser VIS-03D 9/9 PASS, and retained layout/viewer suites 36/36 PASS.

Remaining visual gap relevant to the real mobile Group/AOE screenshot:
- when the viewer is not the interaction source and the current large primary is an external active target, the proven external source is still only shown as small text;
- UX V2 calls for the important second external participant to remain visible as a **Medium Participant Card** while the current participant remains the **Large Hero Focus**;
- fixed seat thumbnails must remain in place; the medium card is a central presentation copy, not a moved seat.

# NEXT TASK — UX2.0VIS-03E: Add a Medium External Source Beside a Large Active-Target Hero

## Objective
Fix exactly one participant-hierarchy defect:

**In 2–4 player top-row Interaction Stage, when the viewer-projected Large Hero Focus is a proven active target and the proven source is a different external player, show that source as one smaller Medium Participant Card beside the Large Hero Focus.**

This task implements only the **external source -> large active target** relationship.

Do not implement the reverse "large source -> medium target" case yet.
Do not add multiple medium participants.
Do not redesign Current Effect, Reaction Chain, Meta, seats, Safe Zone, LocalPlayerDock, or gameplay.

## Design authority
`docs/UX_V2_INTERACTION_STAGE_DESIGN.md` defines:
- Large Hero Focus = current primary focus/resolving participant;
- Medium Participant Card = important source/target whose relationship must remain visible;
- fixed Seat Thumbnails stay in place while presentation copies appear centrally;
- wide source/target presentation preserves semantic direction source -> target;
- viewer's own hero is never duplicated centrally;
- third-party Negation reactors should remain primarily represented by Reaction Chain rather than extra full hero panels.

The real layout defect this task targets is the Group/AOE observer case:
- source is another player;
- current participant/active target is another player;
- viewer is neither the source nor the current large focus;
- current UI enlarges the target but reduces the source to text.

## Files expected in scope
Production:
- `game/hero-focus.ts`
- `app/page.tsx`
- `app/globals.css`

Tests:
- `tests/presentation-client.test.mjs`
- `tests/browser/fixture.jsx`
- `tests/browser/ui19.spec.mjs`

Do not change server, projector, protocol, PresentationSnapshot, PresentationClientView, gameplay, target legality or local controls.

## Required implementation

### 1. Add a separate pure Medium Source projection
In `game/hero-focus.ts`, add a small pure helper, for example:

`projectMediumSourceForViewer(stage, projectedFocus, viewerId, resolvePlayerDisplay)`

Equivalent naming is acceptable.

Define a small return type containing:
- decorated public player data using the existing Hero Focus public decoration rules;
- role label exactly `SOURCE`.

Do not change `buildHeroFocusView` or `projectHeroFocusForViewer` semantics.

### 2. Exact eligibility rules
Return a Medium Source only when **all** of these are true:

1. `stage.visible` is true;
2. `projectedFocus.primary` exists;
3. `projectedFocus.primary.id` appears in `stage.activeTargets`;
4. `stage.source.id` exists;
5. source ID is different from `projectedFocus.primary.id`;
6. source ID is different from `viewerId`.

Otherwise return null.

Important consequences:
- viewer is the source -> no central Medium Source; viewer stays only in LocalPlayerDock;
- primary is the source -> no Medium Source in this task;
- primary is a Negation responder/current participant but is not an active target -> no Medium Source;
- source == target/self-effect -> no duplicate Medium Source;
- missing source authority -> no guess.

Do not use decisionActor, resolver, CurrentAction, Pending, timeline, participant array order, turn owner or local controls as fallback authority.

### 3. Reuse the same public decoration rules
The Medium Source may expose only:
- player name;
- hero portrait / hero name when publicly resolvable;
- HP/maxHP when publicly resolvable;
- role label `SOURCE`.

Use the same `resolvePlayerDisplay` and fail-closed decoration behavior already used by Hero Focus.

Do not expose hand identities, private role, private providers, hidden cards or local-only information.

### 4. Add one presentational MediumParticipantCard
In `app/page.tsx`, add a small read-only component for this source.

Required DOM hooks:
- `data-medium-participant="source"`
- `data-medium-participant-player-id={source.id}`

The card must show:
- `SOURCE`;
- existing public hero artwork if known;
- player name;
- hero name when known;
- HP when known.

No buttons, click handlers or controls.

Use the existing `HeroPortrait` asset rendering path; do not introduce new art.

### 5. Compose it with the existing Large Hero Focus
Inside `.interaction-stage-hero-region`:
- keep the existing Large `HeroFocus`;
- when Medium Source exists, render it **before/left of** the Large active-target focus;
- include a small non-interactive directional marker `→` between them;
- source/target visual direction must read left-to-right on top-row mode;
- if Medium Source is null, do not render an empty card or arrow.

The fixed source seat in `.player-board` must remain mounted in its VIS-01 position. This is a presentation copy only.

### 6. Size hierarchy
For top-row mode use these source portrait sizes:

- >650px: Medium Source portrait **56x70px**
- 481–650px: **48x60px**
- <=480px: **42x53px**

The existing Large Hero Focus portrait sizes remain unchanged:
- 90x113 desktop;
- 72x90 at 481–650;
- 64x80 at <=480.

The Medium Source must remain visibly smaller than the Large primary at every tested width.

Do not shrink the Large Hero Focus.

### 7. Mobile composition must remain horizontal inside Hero region
For this bounded source->target pair in 2–4 player top-row mode:
- keep Medium Source + arrow + Large Hero Focus on one horizontal relationship row even at 650/480;
- allow text inside each participant block to wrap/compact;
- do not stack the Medium Source above the Large target;
- do not introduce horizontal scrolling.

Reaction/Dying/Meta regions keep their existing responsive behavior.

## Add one browser fixture that reproduces the missing Group/AOE observer case
Extend `tests/browser/fixture.jsx` with a dedicated state:

`group-observer`

For `count=4`, construct:
- viewer/meId = `p3`
- stage = `GROUP_RESOLUTION`
- effect = `Raining Arrows`
- source = `p4`
- original/active targets = [`p1`, `p2`, `p3`]
- currentParticipant = `p1`
- decisionActor = `p1`
- activeResolver = `p1`

Local viewer p3 is in group scope but is not the current participant.

Give CurrentAction only the minimum coherent non-local fixture state needed by the harness. Do not use CurrentAction as presentation authority.

Do not alter the existing `group` fixture; add `group-observer` separately.

## Required unit regressions
Extend `tests/presentation-client.test.mjs` for Medium Source projection:

1. external source A + projected active-target B + viewer C -> Medium Source A.
2. viewer is source A -> null.
3. projected primary C not in activeTargets [B] -> null.
4. projected primary is source A -> null.
5. source equals projected primary B -> null.
6. source id null -> null.
7. unknown proven source keeps the same source ID with unknown/null artwork/HP; no substitute participant.

Retain all VIS-03D viewer-projection tests unchanged.

## Required browser regression

### A. Group observer — primary acceptance case
For `state="group-observer", count=4` at 1440x900, 650x900 and 480x900 assert:

1. exactly one Large Hero Focus;
2. Large Hero Focus player ID = `p1`;
3. exactly one `[data-medium-participant="source"]`;
4. Medium Source player ID = `p4`;
5. no central Hero Focus / Medium Source uses viewer ID `p3`;
6. LocalPlayerDock anchor remains `p3`;
7. fixed opponent seat anchor `p4` still exists in `.player-board`;
8. Medium Source is a distinct central presentation copy, not the seat node;
9. Medium Source bounding box is left of the Large Hero Focus;
10. arrow is between Medium Source and Large Hero Focus;
11. Medium portrait is smaller than Large portrait;
12. both participant blocks are fully inside `.interaction-stage-hero-region`;
13. Interaction Stage remains inside Safe Zone;
14. Stage/Safe Zone do not overlap LocalPlayerDock;
15. no horizontal page overflow.

### B. Self-projection negative case
For existing `state="interaction", count=4` where viewer p1 is source:
- no Medium Source renders;
- Large Hero Focus remains external p2;
- local p1 stays only in LocalPlayerDock.

Run at least at 480x900 and 1440x900.

### C. Negation negative case
For existing `state="negation", count=4`:
- no Medium Source is added merely because Reaction Chain exists;
- existing Reaction Chain remains visible.

Run at least at 480x900.

Retain existing VIS-02/VIS-03B/C/D geometry/self-projection assertions; do not weaken them.

## Forbidden shortcuts
Do not:
- move or clone the actual opponent seat DOM node;
- render the viewer's hero centrally;
- add more than one Medium Participant Card;
- add Medium Source when primary is not a proven active target;
- infer source from decision actor/resolver/CurrentAction/Pending/timeline;
- implement medium target/reverse direction yet;
- change Hero Focus primary-selection rules;
- shrink Large Hero Focus;
- change safe-zone/seat/dock geometry;
- redesign Reaction Chain, Dying handoff or Meta;
- change gameplay/server/projector semantics.

## Validation
Run and report:
- focused unit tests for Medium Source projection;
- focused `group-observer` browser tests;
- self-source and Negation negative browser tests;
- retained VIS-02-FIX1 / VIS-03B / VIS-03C / VIS-03D browser tests;
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
- exact Medium Source eligibility rules;
- final portrait dimensions by viewport;
- `group-observer` fixture facts;
- proof source seat remains fixed while central source is a presentation copy;
- focused/retained validation results;
- any remaining GAP.

Do not declare the task accepted. Reviewer decides after inspection.

Push and verify remote HANDOVER, then STOP.

## Acceptance
Pass only if a top-row observer of a Group/AOE interaction sees one smaller external SOURCE card followed by the existing Large current active-target Hero Focus, the viewer/local hero is never duplicated, the fixed source seat does not move, mobile 480 remains contained with no overflow, and public/gameplay authority remains unchanged.
