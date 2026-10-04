# WTK UI / Layout — Current Task Handoff

## REMOTE HANDOVER RULE
Work only on `ux-v2`. Read this file and `docs/PLANNER_DEVELOPMENT_WORKFLOW.md`. Implement only the task below, validate, append this task's execution result, commit/push, verify remote HANDOVER, then STOP. Do not wait for or poll CI.

## Reviewer status — UX2.0VIS-04C ACCEPTED

Reviewed implementation: `e7d898d3474ee0b8e028c32e15fa9e82c37741a6`.

Accepted facts to preserve:
- 2–4 player Top Row seats are now anchored to the actual player-board top band instead of being vertically centred in a flexible row;
- player-board top insets remain 68 / 60 / 55px at desktop / <=700 / <=480;
- Top Row seat size/X mapping remains unchanged;
- Safe Zone now follows 14 / 16 / 16px below the seat row at 1440 / 650 / 480;
- Interaction / Negation / Dying / Group Observer containment remains green in the focused retained suite;
- Side Column, LocalPlayerDock, Stage internals, gameplay and presentation authority were not changed.

The user-approved final visual target is now the generated mockup family:
- true compact opponent top row;
- open central battlefield / Interaction Stage;
- enlarged interaction participants only when semantically relevant;
- large persistent local player dock;
- hero skills adjacent to the local hero;
- stable action controls;
- guidance text must remain readable on mobile.

### Newly confirmed implementation defects
Code review found three concrete local-operation defects that must be addressed in sequence:

1. **Action positions are unstable.**
   `.turn-controls` currently renders one flex-wrapping button container. Confirm / Cancel / Skip / End / provider buttons are conditionally emitted in different DOM order across rescue, Borrowed Sword, trigger, active-skill, response and turn flows. Their screen positions therefore move between flows and can also move when extra provider buttons appear or wrapping changes.

2. **Long guidance is intentionally clipped on <=480.**
   Current mobile CSS fixes `.turn-controls` to 48px and sets `.decision-status` to `max-height:100%; overflow:hidden`. Long instructions can therefore be cut off.

3. **Sun Shangxiang Daredevil is still owned by the generic bottom trigger surface.**
   `HERO_SKILL_EFFECT_IDS["sun-shangxiang"]` maps Betrothment only. The implemented trigger `sun_shangxiang_daredevil` is not mapped to the hero-skill panel, so its projected trigger option can appear in the generic bottom operation controls instead of beside the hero. This is a separate semantic/control-ownership fix and is intentionally NOT part of VIS-06A below; it is the next priority after this layout task.

The previously deferred Side Column task remains deferred until the local operation console is made stable.

# NEXT TASK — UX2.0VIS-06A: Stabilize Local Action Slots and Move Guidance to a Full-Width Row

## Objective
Fix one interaction-safety problem across all local card/skill flows:

**Separate decision guidance from action buttons, and give Cancel / Primary / Decline controls permanent screen slots so their positions never change when the current card, skill, provider or response flow changes.**

This is a UI-structure/layout task only.

Do not change gameplay legality, CurrentAction semantics, provider selection semantics, action payloads or callbacks.

## Current implementation facts
In `app/page.tsx`:
- `.turn-controls` currently contains both `.decision-status` and one anonymous button wrapper;
- branches render buttons directly in different orders:
  - rescue: Peach + Skip;
  - Borrowed Sword: Confirm + Cancel;
  - trigger flows: provider controls + Confirm + Cancel + Skip;
  - active skill: Confirm + Cancel;
  - response: provider controls + Confirm + Skip;
  - normal turn: optional Spear + Play/Confirm + Cancel + End.

In `app/sequence-overrides.css`:
- action wrapper is flex + wrap + `justify-content:flex-end`;
- <=480 turn-controls height is fixed to 48px;
- <=480 decision-status is clipped with `overflow:hidden`.

These are the defects to remove.

## Files expected in scope
Production:
- `app/page.tsx`
- `app/sequence-overrides.css`

Regression:
- `tests/browser/fixture.jsx`
- `tests/browser/ui19.spec.mjs`

A tiny pure presentational helper/type in `app/page.tsx` is acceptable.

Do not change game/server/projector/current-action construction.

## Required implementation

### 1. Move decision guidance out of the action row
Keep the existing `consoleDecision` model and the existing decision copy/data attributes.

Render the existing decision-status content in a dedicated full-width guidance row that spans the whole LocalPlayerDock, above the hero/zones/hand/action area.

Use a stable hook such as:

`data-console-guidance="true"`

The guidance row must preserve:
- `data-console-decision-kind`;
- `data-console-coherent`;
- `data-console-primary`;
- `data-console-primary-enabled`;
- `data-console-selection-count`;
- `data-console-local-cancel`;
- `data-console-authoritative-decline`;
- `role="status"`;
- `aria-live="polite"`;
- `aria-atomic="true"`.

Do not duplicate the guidance in the old turn-controls row.

### 2. Guidance must be full width and content-sized
For all viewports:
- guidance spans the full LocalPlayerDock width;
- text wraps normally;
- height grows with content;
- no ellipsis, line clamp or `overflow:hidden`;
- long instruction + selection summary + local-cancel hint remain readable;
- guidance must not overlap the raised selected hand-card area;
- guidance must not cover buttons.

At <=480 specifically:
- remove the existing clipping rule for decision-status;
- do not force the guidance into the old 48px action height;
- allow at least three normal wrapped text lines without clipping.

The LocalPlayerDock may become taller; the battlefield should flex around it. Do not create page horizontal overflow.

### 3. Make turn-controls actions-only
After moving guidance, `.turn-controls` must contain action controls only.

Add two stable child areas:
- `data-action-extras="true"` — optional provider/mode controls;
- `data-action-slots="true"` — fixed semantic action slots.

The semantic slot container must always render three stable slots in this left-to-right order:

1. `data-action-slot="cancel"`
2. `data-action-slot="primary"`
3. `data-action-slot="decline"`

Empty slots remain empty; they are not removed merely because that action is unavailable.

### 4. Exact slot ownership
Move the existing buttons/callbacks into these slots without changing semantics.

#### CANCEL slot
Only local non-authoritative cancellation of the current local selection:
- Borrowed Sword local Cancel;
- trigger target local Cancel when a separate provider-cancel surface is not already the owner;
- active-skill target local Cancel;
- normal local target Cancel.

Do not put provider-mode buttons like `Cancel <Skill>` here; those remain extras because they toggle a provider/mode rather than the common local-selection Cancel action.

#### PRIMARY slot
The current main commit action:
- Confirm;
- Play / Form Attack;
- Peach rescue;
- Discard N selected;
- equivalent current `consoleDecision.primary` action.

The primary slot stays in the same geometric column even when its label changes.

#### DECLINE slot
Authoritative decline / turn-finalization:
- Skip;
- End.

Do not put local Cancel in this slot.

### 5. Extras cannot move the three semantic slots
Provider/mode controls remain in the extras region, including examples such as:
- generic explicit response provider buttons;
- generic trigger provider buttons;
- Spear / Normal mode;
- provider-owned `Cancel <label>` toggles.

The extras region may wrap independently, but its presence/absence must not change the X position of the Cancel / Primary / Decline slot columns.

Hero-specific skill ownership is not redesigned here. Sun Shangxiang Daredevil is a separate follow-up.

### 6. Stable geometry contract
At 480x900 and 1440x900:
- all three semantic slot containers exist exactly once;
- their X ordering is always Cancel < Primary < Decline;
- each slot's left/right geometry is invariant within 4px across the focused fixture states;
- if a slot has no action, the slot stays empty rather than allowing another semantic action to slide into it;
- buttons remain at least the existing minimum touch size;
- no button overlaps another or the guidance row;
- no horizontal overflow.

### 7. Preserve callbacks and disabled rules
Do not rewrite action logic.

For every moved button:
- keep the exact existing `disabled` condition;
- keep the exact existing `onClick` callback/payload;
- keep busy labels such as Confirming…, Playing…, Skipping…;
- keep provider selection/reset behavior;
- keep server revalidation unchanged.

This task is presentation/layout only.

## Required fixture coverage
Add minimal dedicated browser fixture states if existing fixtures cannot expose the necessary action combinations. Do not change production semantics merely to create them.

Required representative states:

1. **confirm-cancel**
   - primary Confirm visible;
   - local Cancel visible;
   - no authoritative decline.

2. **confirm-skip**
   - primary Confirm visible;
   - authoritative Skip visible;
   - no local Cancel.

3. **confirm-cancel-skip**
   - all three semantic actions visible simultaneously from one coherent trigger/selection fixture.

4. **turn-play-end**
   - primary Play visible;
   - End in decline slot;
   - cancel slot empty.

5. **provider-extra**
   - at least one provider/mode button visible in extras while primary/decline remain in their fixed slots.

6. **long-guidance**
   - use a realistic long instruction/selection summary long enough to wrap to 3+ lines at 480px.

Prefer current-action facts already understood by the fixture. Do not invent gameplay legality in React production code.

## Required browser regression

At both 480x900 and 1440x900 for the representative states:

### A. Slot structure
Assert:
- one guidance row;
- one extras region;
- one action-slot region;
- exactly one cancel slot;
- exactly one primary slot;
- exactly one decline slot;
- slot X order Cancel < Primary < Decline.

### B. Position invariance
Capture each slot bbox across every representative state.

For a given viewport:
- cancel-slot X/width variance <=4px;
- primary-slot X/width variance <=4px;
- decline-slot X/width variance <=4px.

This must fail against the current flex-wrap implementation.

### C. Button ownership
Assert:
- Cancel only appears in cancel slot;
- Confirm/Play/Peach/Discard primary action only appears in primary slot;
- Skip/End only appears in decline slot;
- extras do not contain plain common `Confirm`, plain `Cancel`, `Skip` or `End`.

Provider-owned labels such as `Cancel <provider>` are not plain local Cancel and may remain extras when applicable.

### D. Long guidance
At 480:
- long guidance text is fully visible;
- computed overflow is not hidden;
- guidance bbox does not overlap action slots;
- guidance does not overlap selected hand card geometry;
- no horizontal overflow.

### E. Existing gameplay-control regression
Keep existing mounted interaction/control tests for:
- rescue;
- response/Negation;
- active skill;
- turn play/end;
- local target selection.

Do not weaken them.

## Forbidden shortcuts
Do not:
- change `buildConsoleDecisionDisplay` semantics merely to fit layout;
- merge Cancel and Skip into one action;
- reuse one slot for different semantic roles;
- hide long guidance;
- reduce font to unreadable sizes;
- use absolute pixel positioning per fixture;
- use JS DOM measurements to place action buttons;
- change hero skill ownership in this task;
- move Hero Focus / seats / Safe Zone;
- change LocalPlayerDock hero/hand/equipment semantics;
- change server/gameplay/projector logic.

## Validation
Run and report:
- focused VIS-06A browser slot tests;
- retained local-operation mounted tests;
- retained VIS-03/VIS-04 layout tests;
- broader local browser/fast/build/lint/diff-check only if allowed locally.

Do not claim unrun checks. Do not inspect or wait for CI.

## Execution result
Append only:
- implementation SHA;
- files changed;
- final LocalPlayerDock row structure;
- exact semantic slot mapping;
- slot bboxes for all representative states at 480 and 1440;
- long-guidance measured height/line-wrap proof at 480;
- confirmation callbacks/disabled conditions were preserved;
- focused/retained validation results;
- any GAP.

Do not self-accept. Push, verify remote HANDOVER, then STOP.

## Acceptance
Pass only if decision guidance is full-width and never clipped, Cancel / Primary / Decline have invariant semantic positions across card/skill/response flows, provider extras cannot move those positions, and no gameplay/action semantics are changed.
