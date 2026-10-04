# WTK Autonomous UI/Layout Agent Workflow

Repository: `dmoneyUK/three-kingdoms`  
Branch: `ux-v2`

## Purpose

This document defines an **experimental autonomous implementation run** for the War of Three Kingdoms UX V2 UI/Layout work.

It changes only the Coding Agent execution cadence.

The human Reviewer workflow is **not** changed:

- the human Reviewer may inspect implementation at any time;
- Agent task completion does not equal Reviewer acceptance;
- the Agent must never write `REVIEWER ACCEPTED`;
- only the human Reviewer may accept, partially accept, reject, or redirect work.

During this experiment the Coding Agent may plan and execute multiple consecutive bounded tasks without waiting for human review after every task, provided it follows the design, authority, testing, CI, HANDOVER, and stop rules below.

### Activation

This workflow is active only when the user's instruction explicitly contains:

`AUTONOMOUS UI RUN: ACTIVE`

When active, this document is the authorized exception described in `AGENTS.md`. It overrides only the normal single-task/reviewer-next-task/append-vs-clean/no-CI-polling cadence rules listed there. It does not override architecture, gameplay authority, privacy, WTK Standard references, or fail-closed rules.

The autonomous run ends when either:

1. the remaining approved UI/Layout work is implemented and CI-green; or
2. a `BLOCKED — HUMAN REVIEW REQUIRED` condition is reached.

---

## 1. Required first read

Before planning or modifying code, fetch `origin/ux-v2` and read:

- `HANDOVER.md`
- `docs/PLANNER_DEVELOPMENT_WORKFLOW.md`
- `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`
- `docs/UX_V2_RELEASE_GATE.md`
- `ROADMAP.md`

Also consult when relevant:

- `docs/UI_ASSET_INTEGRATION_GUIDE.md`
- `docs/HERO_ART_INTEGRATION_GUIDE.md`
- `docs/STANDARD_HERO_REFERENCE.md`
- `docs/OFFICIAL_CARD_REFERENCE.md`
- `graphic-design/new-hero-design/DESIGN_INSTRUCTIONS.md`
- `docs/art/wei-general-visual-design-standard.md`

The primary UI/interaction design authority is:

`docs/UX_V2_INTERACTION_STAGE_DESIGN.md`

The primary architecture/workflow authority is:

`docs/PLANNER_DEVELOPMENT_WORKFLOW.md`

If this autonomous experiment conflicts with the normal workflow only on:

- stopping after one task;
- cleaning/replacing HANDOVER;

then this document temporarily overrides those two points only.

All semantic, architecture, authority, privacy, and safety rules from the normal workflow continue to apply.

---

## 2. Repository and branch rules

Work only on:

`ux-v2`

Never modify or merge `main`.

At the beginning of every task:

```bash
git fetch origin
git checkout ux-v2
git pull --ff-only origin ux-v2
```

Do not work from stale local state.

Before starting a new task, confirm that no newer remote implementation or HANDOVER entry supersedes local assumptions.

---

## 3. HANDOVER policy for this experiment

**Do not clean HANDOVER.md.**

**Do not replace old task/result history.**

**Do not remove previous task records.**

For this experiment, `HANDOVER.md` becomes an **append-only autonomous task ledger**.

Preserve all existing content.

Before implementing each new task, append a task section with this structure:

```text
TASK ID:
STATUS: PLANNED

Objective:
Observed gap:
Why this task is next:
Design authority:
Current production evidence:
Files expected in scope:
Implementation requirements:
Explicit non-goals:
Forbidden shortcuts:
Required regression tests:
Required local validation:
CI acceptance:
Task acceptance criteria:
```

Commit/push the planned task record before or together with implementation.

After implementation, append:

```text
IMPLEMENTATION RESULT

Implementation SHA:
Files changed:
What changed:
What was intentionally preserved:
Focused tests:
Broader tests:
Known gaps:
CI pending:
```

Push the implementation.

Then wait for the GitHub Actions run for that pushed revision.

When CI is green, append:

```text
STATUS: COMPLETED BY AGENT — CI GREEN

CI run:
CI job:
Final implementation/fix SHAs:
Final test status:
Known remaining gaps:
Recommended next bounded task:
```

Never write:

`REVIEWER ACCEPTED`

Only the human Reviewer may do that.

If CI fails, record the failure and all fix attempts in the same task history. Do not erase failed attempts.

---

## 4. Mandatory CI loop for every task

For every implementation task:

1. Implement the bounded task.
2. Run focused local tests.
3. Run the relevant broader local tests allowed by the repository.
4. Run `git diff --check`.
5. Commit.
6. Push to `origin/ux-v2`.
7. Wait for the GitHub Actions run triggered by that push.
8. Inspect the actual CI jobs and failure logs.
9. If CI fails, diagnose the real reason.
10. Fix the root cause.
11. Push the fix.
12. Wait for CI again.
13. Repeat until CI is green.
14. Update HANDOVER status to `COMPLETED BY AGENT — CI GREEN`.
15. Only then plan the next task.

Do not start the next implementation while the previous task CI is red.

### Starting baseline

At the start of this experiment, the human Reviewer has confirmed that the current `ux-v2` CI baseline is **GREEN**.

Do not redo the previously planned CI baseline repair unless fresh evidence shows the baseline has become red again.

---

## 5. CI failure classification

When CI fails, classify the failure before editing code.

### A. Real production regression caused by the task

Fix production/test as appropriate.

### B. Test correctly exposes an incomplete implementation

Finish the implementation.

### C. An accepted design changed and an old source-shape assertion is stale

Update the stale test to the current accepted contract.

Do **not** revert accepted production merely to satisfy an obsolete assertion.

### D. Flaky/infrastructure issue

Prove it from logs before retrying.

Do not change unrelated production code.

Never make CI green by:

- deleting meaningful tests;
- weakening assertions until they prove nothing;
- force-clicking around a real UI overlap;
- adding arbitrary waits;
- hiding content required by design;
- changing gameplay/server rules merely to simplify layout tests.

---

## 6. Core architecture rules

These rules are non-negotiable.

### 6.1 CurrentAction authority

`CurrentAction` remains the authority for local legal actions.

React must not reconstruct gameplay legality.

Presentation UI may render authoritative choices but must not invent them.

### 6.2 Public presentation authority

`PresentationSnapshot` / `PresentationClientView` remain the source of proven public interaction facts such as:

- source;
- targets;
- current participant;
- decision actor;
- active resolver;
- causal frame;
- interaction/checkpoint identity;
- public Reaction Chain;
- Dying handoff;
- group/AOE participant information.

Do not infer these from:

- timeline ordering;
- turn owner;
- `actionPlayerId`;
- player name;
- card label;
- DOM position;
- local selection;
- HP changes alone.

### 6.3 Correlation is not authority

A value merely appearing near another value does not make it authoritative.

Use stable IDs and typed projected facts.

### 6.4 Fail closed

If public semantic evidence is missing or ambiguous, do not guess.

Examples:

- multiple possible primary targets with no proven primary;
- unknown source;
- ambiguous participant;
- missing causal identity.

Prefer neutral/no focus over a wrong confident presentation.

### 6.5 Public versus private

Public Interaction Stage must not expose:

- private hand identities;
- private providers;
- local-only target-selection state;
- hidden roles;
- viewer-private legality.

Local controls remain in the Local Player Dock.

Do not move gameplay controls into the public Interaction Stage.

### 6.6 Viewer Hero

The viewer/local player's Hero remains in `LocalPlayerDock`.

Never duplicate the local Hero centrally merely because they are:

- target;
- decision actor;
- responder;
- rescuer;
- resolver.

Central presentation should project external participants only when appropriate.

### 6.7 Seat DOM

Physical opponent seat DOM remains fixed.

Interaction Stage uses presentation copies/projections.

Do not move a seat into the centre during combat.

---

## 7. Approved final visual direction

The human Reviewer approved the generated final mockup direction. Treat the following as the visual target.

### 7.1 2–4 total players — Top Row Mode

All opponents appear in one compact row near the actual top battlefield band.

No side seats.

Conceptually:

```text
[P4]              [P3]              [P2]

             OPEN BATTLEFIELD

             INTERACTION STAGE
             only when relevant

------------------------------------------------
              LOCAL PLAYER
------------------------------------------------
```

Top-row opponent thumbnails directly contain only lightweight seat information:

- Hero artwork / face;
- player/hero identity;
- HP;
- concealed Hand count;
- lightweight important state.

Do not make a seat a miniature full dashboard.

Full Equipment/Judgement/public detail remains available in Inspect and/or Interaction Stage.

The viewer has no duplicate seat.

### 7.2 5–10 total players — Side Column Mode

No top row.

Use:

```text
LEFT SEATS   | CENTRAL INTERACTION |   RIGHT SEATS
```

The accepted deterministic topology must remain.

Example, 7 players:

```text
P7                               P4
P6        INTERACTION            P3
P5           STAGE               P2

               YOU
```

Example, 10 players:

```text
P10                              P6
P9                               P5
P8        INTERACTION            P4
P7           STAGE               P3
                                 P2

               YOU
```

Clockwise/right and counter-side/left placement must continue using the accepted `projectSideColumnSeat` helper and accepted mapping.

Side seats are narrow portrait thumbnails.

The middle battlefield must remain free for Interaction Stage content.

### 7.3 Interaction Stage

The Interaction Stage is **not** a large dashboard.

REST:

- no stage;
- open battlefield.

During interaction:

- show only semantically relevant public participants/effect/context.

Participant hierarchy:

**Large Hero Focus**  
Current primary focus/current resolving participant.

**Medium Participant Card**  
Important proven external source/target whose relationship must remain visible.

**Compact Reaction Identity**  
Third-party reactor whose contribution is represented primarily by the Reaction Chain.

Do not make every participant a large card.

One-target interaction:

```text
             [ LARGE TARGET ]
```

Two important external participants:

```text
[ MEDIUM SOURCE ]  ->  [ LARGE TARGET ]
```

The local viewer Hero must stay only in `LocalPlayerDock`.

### 7.4 Multi-target

For a small selected target set:

- selected seat thumbnails stay fixed;
- selected external heroes appear centrally;
- layout cleanly reflows.

Do not infer semantic resolution order from visual seat order.

For order-sensitive skills, preserve semantic selected order/markers.

### 7.5 AOE / Group

Automatic group effects do not require manual target selection.

Participant density should scale:

- 1 participant: large detail;
- 2–3 participants: medium detail;
- 4+ participants: compact participant cards.

The currently resolving participant should be visually dominant.

Do not create a wall of full Hero cards for 8–10 players.

### 7.6 Reaction / Negation

Reaction Chain explains **current public causal context**.

It is not the Game Log.

Prefer:

```text
ROOT EFFECT
↓
recent public response
↓
ACTIVE RESPONSE
```

Do not invent historical counter identities that `PresentationSnapshot` does not prove.

When space is tight:

1. collapse older Reaction detail;
2. reduce secondary participants;
3. compact metadata;
4. only then reduce primary Hero Focus.

### 7.7 Local Player Dock

Final structural target:

```text
┌────────────────────────────────────────────────────┐
│ FULL-WIDTH GUIDANCE                                │
│ wraps normally, never clipped                      │
├──────────────┬─────────────────────────────────────┤
│              │ SKILLS                EQUIPMENT     │
│ LARGE HERO   │                                     │
│              │ LARGE SINGLE-LAYER HAND AREA        │
│ Judgement    │ [CARD][CARD][CARD][CARD] ... →     │
│ overlays     │                                     │
├──────────────┴─────────────────────────────────────┤
│ EXTRAS             CANCEL | PRIMARY | DECLINE      │
└────────────────────────────────────────────────────┘
```

Size priority:

1. Hand
2. Hero
3. Skills / frequent controls
4. Guidance/action
5. Equipment
6. Judgement

This is size priority, not vertical ordering.

Structural ownership:

**LEFT**
- Hero + HP
- Judgement overlays on Hero

**RIGHT TOP**
- Skills | Equipment

**RIGHT MAIN**
- large single-layer Hand

**GUIDANCE**
- full width and readable

**ACTION**
- stable semantic slots

### 7.8 Stable action slots

Already accepted:

```text
Cancel | Primary | Decline
```

Semantic meanings:

**Cancel**  
Cancel unsubmitted local selection only.

**Primary**  
Confirm / Play / Peach / Discard / equivalent main submit.

**Decline**  
Skip / End / authoritative decline.

Provider/mode controls belong in Extras.

Extras must not move the fixed three action slots.

Do not merge Cancel and Skip.

### 7.9 Guidance

Already accepted:

Guidance is a dedicated full-width `LocalPlayerDock` row.

Long guidance:

- wraps;
- grows vertically;
- is never clipped;
- no ellipsis;
- no line clamp;
- no `overflow:hidden`.

### 7.10 Hero skills

Hero-owned skill actions belong beside the local Hero in Hero Skills.

Example already fixed:

Sun Shangxiang:

- Betrothment;
- Daredevil.

Do not allow a mapped Hero skill to fall through to generic bottom providers.

Do not automatically claim arbitrary providers based on labels.

Stable effect-ID mapping remains authority.

### 7.11 Hand

Hand remains one horizontal layer.

Never create a second hand row.

Progression:

```text
small hand
-> large readable cards

larger hand
-> controlled horizontal overlap

still too large
-> preserve usable card size and enable horizontal pan
```

Do not continuously shrink cards until everything fits.

Validation benchmark hand sizes eventually include:

- 5
- 10
- 15
- 20
- 25+

Tap and horizontal pan must remain distinguishable.

### 7.12 Judgement

Persistent Judgement state belongs as a compact Hero overlay.

Active Judgement resolution belongs in Interaction Stage.

Do not keep a large independent persistent Judgement row merely because it is easy to implement.

---

## 8. Current accepted implementation state

Do not reopen these without new concrete evidence.

Accepted:

- semantic Presentation architecture;
- CurrentAction/private-control separation;
- causal interaction/frame/checkpoint model;
- Interaction Stage semantic projection;
- Hero Focus semantic selection;
- Reaction Chain bounded public projection;
- Dying/Peach public handoff;
- 2–4 Top Row topology;
- Top Row compact opponent thumbnails;
- Top Row actual top anchoring;
- Top Row Interaction Safe Zone;
- Top Row open outer Stage shell;
- Large primary Hero Focus;
- Medium external source projection;
- viewer Hero excluded from central duplication;
- full-width long-form Local Dock guidance;
- permanent Cancel / Primary / Decline slots;
- provider Extras separated from semantic action slots;
- Sun Shangxiang Daredevil routed to Hero Skills;
- 5–10 Side Column deterministic topology;
- accepted Side Column 5/7/10 examples;
- Side Column 30/40/30 seat corridor model;
- Side Column compact narrow thumbnail density;
- Side Column Equipment/Judgement hidden from thumbnail but retained in Inspect;
- Side Column descendant containment;
- Side Column real click hit safety;
- Opponent Inspect behavior.

Relevant accepted implementation SHAs and detailed evidence are recorded in existing `HANDOVER.md` history.

Do not assume historical source-shape tests override accepted later design.

---

## 9. Starting task

The current CI baseline is GREEN.

Begin with:

# UX2.0VIS-05B — Side Column Central Interaction Safe Zone

The wrapper already exists in React:

```tsx
<div className="interaction-safe-zone">
  <InteractionStage ... />
</div>
```

But generic CSS still uses:

```css
.interaction-safe-zone {
  display: contents;
}
```

Only Top Row currently gives this wrapper real geometry.

Side Column therefore still allows `InteractionStage` to inherit legacy global absolute positioning.

### Goal

For 5–10 player rooms, create an actual Side Column central safe zone between the already-proven LEFT and RIGHT seat columns.

Required behavior:

- real positioned Side Column safe-zone wrapper;
- transparent / no visible wrapper chrome;
- Stage positioned normally inside it;
- no legacy viewport-centred absolute translate positioning;
- safe zone clears every visible LEFT seat descendant by >= 6px;
- safe zone clears every visible RIGHT seat descendant by >= 6px;
- visible Stage satisfies the same clearance;
- Stage remains fully above `LocalPlayerDock`;
- Stage remains fully inside `play-table`;
- Reaction Chain remains visible;
- Dying handoff remains visible;
- no clipping/scrolling/scaling used as shortcut;
- Top Row remains unchanged;
- Side Column seat mapping/dimensions remain unchanged.

Required active states at count=6:

- interaction;
- negation;
- dying;
- group-observer.

Required dense cases at count=10:

- interaction;
- negation.

Required viewports:

- 1440x900;
- 650x900;
- 480x900.

If the unchanged current Side Column Stage cannot fit the available corridor at 480px:

**STOP that task and record the exact measured blocker.**

Do not secretly:

- shrink Hero Focus;
- remove metadata;
- hide Reaction;
- hide Dying;
- resize seats;
- widen centre by violating accepted seat contracts.

Those would require a separate follow-up task.

---

## 10. Expected autonomous roadmap after VIS-05B

Do not treat the following names as mandatory implementation details.

They are directional milestones.

After each completed task, inspect actual code/results and split the next concern into the smallest reasonable bounded task.

Likely remaining sequence:

### VIS-05B — Side Column central safe zone

Then:

### Side Column Stage adaptation

If required after geometry proof:

- fit existing Interaction Stage composition to the narrower/taller Side Column corridor;
- one concern at a time;
- preserve semantics.

Then:

### Multi-target / AOE participant hierarchy

- 1 participant large;
- 2–3 medium;
- 4+ compact;
- current resolver dominant;
- viewer Hero not duplicated.

Then:

### Reaction / Current Effect visual cleanup

- root/effect/active relationship;
- compact public context;
- no giant dashboard;
- preserve semantic public facts.

Then:

### Local Player Dock final structure

Compare actual implementation against the approved fixed composition:

- Hero on left;
- Skills beside Hero/right-top;
- Equipment right of Skills;
- Hand in right-main;
- Judgement overlay on Hero;
- full-width guidance;
- fixed semantic actions.

Split into smaller tasks instead of doing all of this in one commit.

Then:

### Large Hand responsive behavior

- single row;
- progressive overlap;
- bounded usable card exposure;
- horizontal pan when needed;
- test 5/10/15/20/25+;
- no second row.

Then:

### Judgement / Equipment final Dock density

Only if still inconsistent with the approved design.

Then:

### Representative real-interaction visual regression

Cover:

- REST;
- single target;
- multi target;
- AOE;
- other-player target;
- Negation;
- Duel;
- Dying/Peach;
- Judgement;
- Steal/Dismantle detail;
- Borrowed Sword;
- Hero skill trigger;
- long guidance;
- 2/4/6/10-player modes.

Then:

### Final mobile visual release gate

Do not prematurely declare the whole game complete.

---

## 11. Task decomposition rule

Prefer one architectural concern per task.

Good task:

> Place Side Column Interaction Stage inside central corridor.

Bad task:

> Finish all Side Column visuals, rebuild Local Dock, redo Hero Focus and fix all mobile layouts.

If implementation exposes a new dependency:

1. finish the current bounded safe portion;
2. record the blocker;
3. create a separate next task.

Do not opportunistically refactor unrelated code.

---

## 12. Test design rule

Every regression should prove behavior, not merely source text, whenever practical.

For geometry, use real browser measurements.

For hit targets, use real normal clicks / `elementFromPoint` where useful.

For semantic authority, test actual projected IDs and actions.

Tests should ideally fail against the old broken implementation.

Do not rely only on screenshots.

Screenshots may supplement but not replace:

- geometry assertions;
- action payload assertions;
- semantic ownership assertions;
- visibility/privacy assertions.

---

## 13. Unacceptable UI shortcuts

Do not use:

- `transform: scale` to fake fitting;
- arbitrary translate offsets to fake topology;
- z-index to cover an overlapping-seat bug;
- `force:true` Playwright clicks to bypass blocked controls;
- `overflow:hidden` as the only solution when required information becomes inaccessible;
- font-size reduction to unreadable text;
- hiding required semantic context;
- moving `LocalPlayerDock`;
- shrinking Hand/Hero aggressively before compacting secondary metadata;
- changing gameplay rules to make UI easier;
- client-derived legality;
- client-derived public causality;
- player-name/string matching as semantic authority;
- browser-only fake special cases in production.

---

## 14. Human-review stop conditions

Immediately stop autonomous implementation and append:

`STATUS: BLOCKED — HUMAN REVIEW REQUIRED`

when any of the following occurs:

1. Two design documents conflict and resolving the conflict would change player-facing behavior.
2. A task requires choosing a new product/design rule not already approved.
3. Source/target/current participant/decision actor/resolver cannot be proven from authoritative data.
4. Completing presentation requires changing gameplay legality or server semantics merely for UI convenience.
5. Private/public information ownership is unclear.
6. A layout cannot fit without breaking an already accepted invariant and more than one reasonable design trade-off exists.
7. CI can only be made green by weakening meaningful regression coverage.
8. Fixing one task unexpectedly requires a large unrelated architectural rewrite.
9. Current implementation contradicts the approved final visual design in a way not covered by design documents.
10. You would otherwise have to guess.

When blocked, record:

- exact problem;
- files/lines involved;
- measured/runtime evidence;
- alternatives considered;
- why existing design authority is insufficient;
- smallest decision required from the human Reviewer.

Then STOP.

---

## 15. Completion standard

A task is not completed merely because code was pushed.

For this autonomous experiment, a task becomes:

`COMPLETED BY AGENT — CI GREEN`

only after:

- implementation is committed;
- focused regression passes;
- appropriate retained tests pass;
- push succeeds;
- GitHub Actions for the implementation/fix revision finishes;
- required CI jobs are green;
- HANDOVER contains the result and CI evidence.

This is still not human Reviewer acceptance.

---

## 16. End-of-autonomous-run summary

When all remaining approved UI/Layout work is complete, or when a human-review stop condition occurs, append one final section to HANDOVER:

```text
AUTONOMOUS RUN SUMMARY

Tasks planned:
Tasks completed:
Tasks with CI fixes:
Implementation SHAs:
Final branch head:
Final CI run:
Contracts preserved:
New regression coverage:
Remaining visual gaps:
Remaining semantic gaps:
Known technical debt:
Items requiring human visual review:
Items requiring real-device review:
Recommended reviewer inspection order:
```

Do not claim:

- production deployment healthy;
- touch-device certified;
- WCAG certified;
- whole game complete;

unless those were separately and explicitly proven.

---

## 17. Resume protocol

Do not assume a hard-coded task ID from an earlier version of this document is still current.

At the beginning or resumption of every autonomous run:

1. Fetch and fast-forward `origin/ux-v2`.
2. Read the **complete current remote `HANDOVER.md`**.
3. Identify the latest implementation task and its final status.
4. Do not repeat any task already recorded as `COMPLETED BY AGENT — CI GREEN` unless new concrete evidence shows a regression.
5. Inspect the actual current code for the highest-impact remaining gap against the approved final design.
6. Apply the planning gate in section 19 before writing the next task.
7. Append the next `PLANNED` task and continue the normal autonomous task/CI loop.

At the time this optimization was added, VIS-05B, VIS-05C, and VIS-07A had already been implemented and recorded in HANDOVER. Those IDs are historical milestones, not instructions to repeat them. The remote HANDOVER always wins for current progress.

---

## 18. Token and context efficiency

Implementation quality and reviewer traceability matter more than verbose self-documentation.

Use the following rules for every autonomous task.

### 18.1 Do not repeat stable background

Do not copy the full design or architecture background into each task.

Reference the existing authority instead, for example:

`Design authority: UX_V2_INTERACTION_STAGE_DESIGN.md §7.7; accepted VIS-06A contract.`

Only record the **task-specific delta**.

### 18.2 Compact task records

A normal `PLANNED` entry should usually contain:

- objective;
- concrete observed gap;
- files likely in scope;
- 3–7 implementation requirements;
- key preserved contracts;
- focused regression;
- one explicit stop condition if needed.

Do not restate unrelated accepted history.

### 18.3 Compact implementation results

A normal implementation result should contain only:

- implementation SHA;
- files changed;
- important behavior/geometry measurements;
- focused tests actually run;
- meaningful discovered/fixed regression;
- remaining gap.

Do not retell the task specification.

### 18.4 Compact CI closeout

After CI is green, record only:

- exact tested revision;
- run/job result;
- whether a CI fix was required;
- next-task rationale.

Do not repeat local test tables already recorded in the implementation result.

### 18.5 One run summary only

Write `AUTONOMOUS RUN SUMMARY` only when the autonomous run actually stops because:

- a human-review boundary is reached;
- the approved UI/Layout work is complete;
- the user explicitly asks to stop;
- available context/budget is becoming unsafe for another bounded task.

Do not write a full run summary after every task.

### 18.6 README discipline

Do not update `README.md` for every small visual/layout task.

Update README only when the user-facing product contract, durable architecture, setup/usage, or release status materially changes.

Task history belongs in HANDOVER; design contracts belong in the design documents.

### 18.7 Reuse tests and helpers

Prefer extending existing browser fixtures, geometry helpers, semantic helpers, and regression matrices.

Do not duplicate large helper blocks merely to create a new test.

Run the smallest focused local validation that proves the task. Let the named CI gate own full-suite validation unless a specific failure requires broader local reproduction.

### 18.8 Read narrowly

After the required first-read documents, inspect only the source/test files relevant to the current gap before widening repository search.

Do not repeatedly reread large unchanged files during the same task unless needed.

### 18.9 Documentation budget

As a target, documentation/history generation should normally consume much less effort than implementation and testing.

Avoid spending more than roughly 10–15% of an autonomous run on repeated narrative/history.

Do not invent token percentages if the runtime does not expose them.

### 18.10 Milestone cadence

Prefer 2–4 completed bounded implementation tasks between human milestone reviews.

A milestone review is recommended after high-impact visual areas such as:

- final Local Player Dock composition;
- large-hand 20/25+ behavior;
- final representative mobile visual gate.

Do not stop merely because three tasks are complete if the next task is small, clearly authorized, and context remains healthy.

---

## 19. Next-task planning gate

Before self-authoring the next task, answer these questions from the actual current repo and approved design:

1. **Approved requirement:** Is the desired behavior already explicitly supported by the approved final design or an accepted reviewer decision?
2. **Authority:** Can it be implemented using existing authoritative data without inventing gameplay/public semantics?
3. **Boundedness:** Can one architectural/visual concern be implemented and tested independently?
4. **Impact:** Is it among the highest-impact remaining gaps visible to the player?
5. **Regression proof:** Can the old defect or missing contract be captured by a meaningful focused test?

If all five are YES, append the task and implement it.

If 1 or 2 is NO, stop with `BLOCKED — HUMAN REVIEW REQUIRED`.

If 3 is NO, split the work smaller before implementation.

If 4 is NO, choose a higher-impact approved gap.

If 5 is difficult but the visual change is still objectively measurable, define the smallest geometry/DOM/interaction proof available and explain the limitation.

### Visual-detail caution

Architecture correctness does not replace visual judgment.

For density, spacing, prominence, and composition rules, compare the implementation against the exact approved design wording before finalizing. In particular, compute participant density from the participants that are actually rendered after viewer/primary/source exclusions, unless an approved design rule explicitly says otherwise.

---

## 20. Current continuation direction

The complete remote HANDOVER is the authority for exact progress.

The remaining approved direction is expected to include, as needed:

- Interaction Stage shell / duplicate metadata simplification;
- final neutral Group/AOE density polish without invented progress semantics;
- Local Player Dock final structure;
- persistent Judgement overlay on the local Hero;
- single-layer Hand overlap and horizontal-pan behavior for 5/10/15/20/25+ cards;
- representative interaction visual regression;
- final mobile visual gate.

Do not implement these as one large task. Derive the next smallest high-impact bounded task using section 19.

