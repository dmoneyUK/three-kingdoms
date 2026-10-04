# WTK UI / Layout — Current Task Handoff

## REMOTE HANDOVER RULE
Work only on `ux-v2`. Read this file and `docs/PLANNER_DEVELOPMENT_WORKFLOW.md`. Implement only the task below, validate, append this task's execution result, commit/push, verify remote HANDOVER, then STOP. Do not wait for or poll CI.

## Reviewer status — UX2.0VIS-06A ACCEPTED

Reviewed implementation: `8f34a827a2040a7a219a0c7192692018b3f81a74`.

Accepted facts to preserve:
- decision guidance is now a dedicated full-width, content-sized LocalPlayerDock row;
- the old <=480 guidance clipping was removed;
- the operation row now has a separate extras region plus three permanent semantic slots in left-to-right order: Cancel / Primary / Decline;
- representative 480x900 slot bboxes were invariant at x=226/308/390 with 78px widths, and 1440x900 at x=1123/1217/1311 with 90px widths;
- long guidance measured four wrapped lines at 480 and was not clipped;
- moved controls kept their existing callbacks, payloads, disabled conditions and busy labels;
- focused VIS-06A browser coverage reported 3/3 PASS and the retained local-operation/layout set reported 118 PASS.

The documented Side Column viewport-Y reflow is ACCEPTED as a natural consequence of the intentionally content-sized LocalPlayerDock: VIS-06A did not change Side Column placement rules, and the task explicitly allowed the dock to grow while the battlefield flexes around it. Do not add negative margins or other compensation to force the old absolute viewport coordinates back.

### Deferred work state — do not lose this
**UX2.0VIS-05A is still DEFERRED and INCOMPLETE.**
It has not been implemented or accepted. After VIS-06B is reviewed, return to VIS-05A unless a newly discovered blocker has higher priority.

## NEXT TASK — UX2.0VIS-06B: Route Sun Shangxiang Daredevil Through the Hero Skill Panel

## Objective
Fix one confirmed control-ownership defect:

**When Sun Shangxiang's implemented `Daredevil` trigger is legally available, its action must appear in the existing Hero Skills panel beside the local hero, not as a generic provider button in the bottom action-extras region.**

Keep the existing authoritative Skip/decline control in the fixed Decline slot.

This is a UI capability-routing task only. Do not change Daredevil gameplay semantics, trigger timing, legality, payload, resolution, or the VIS-06A action-slot layout.

## Current implementation facts
Sun Shangxiang metadata already contains two skills:
- `Betrothment`;
- `Daredevil`.

The capability implementation already exists:
- `game/capabilities/heroes/sun-shangxiang-daredevil.ts`
- effect ID: `sun_shangxiang_daredevil`
- event: `equipment_lost`
- selection: none
- `allowDecline: true`
- resolving the effect draws 2 cards.

Current UI mapping in `app/page.tsx` is incomplete:

```ts
"sun-shangxiang": {
  Betrothment: ["sun_shangxiang_betrothment"]
}
```

Because `Daredevil` is absent from `HERO_SKILL_EFFECT_IDS`, its trigger option is not claimed by `heroTriggerEffectIds` and therefore falls through to the generic trigger buttons in `data-action-extras="true"`.

The existing generic hero-skill branch already knows how to execute a mapped no-selection trigger directly with:

`onAction("trigger", { providerId: option.effectId })`

Do not invent another execution path.

## Files expected in scope
Production:
- `app/page.tsx`

Regression:
- `tests/browser/fixture.jsx`
- `tests/browser/ui19.spec.mjs`

Optional focused unit/mounted test file only if needed to prove the mapping without duplicating browser coverage.

Do not modify:
- `game/capabilities/heroes/sun-shangxiang-daredevil.ts`;
- server/projector/protocol;
- hero metadata;
- CurrentAction construction in production;
- VIS-06A CSS/action-slot geometry.

## Required implementation

### 1. Complete the existing Sun Shangxiang hero-skill mapping
Extend only the existing Sun Shangxiang entry so it contains both skills:

```ts
"sun-shangxiang": {
  Betrothment: ["sun_shangxiang_betrothment"],
  Daredevil: ["sun_shangxiang_daredevil"],
}
```

Equivalent formatting is fine.

Do not rename the skill or capability IDs.

Do not remove or alter the existing Betrothment mapping.

### 2. Let the existing hero-skill ownership path do the work
Once mapped:
- `activeSkillOptions` may recognise the Daredevil trigger option;
- `heroTriggerEffectIds` must claim `sun_shangxiang_daredevil`;
- the generic trigger renderer must therefore stop producing a bottom `Use Daredevil` / `Daredevil` provider button;
- `heroSkillButtons` must render the metadata-backed Daredevil button in `.local-hero-skills`;
- clicking it must use the existing direct no-selection trigger callback.

Do not add a special-case Sun Shangxiang click handler if the existing generic mapped-skill path already satisfies this.

### 3. Preserve authoritative decline
Daredevil is optional (`allowDecline:true`).

When the Daredevil trigger decision is active:
- the Daredevil skill button belongs beside the hero;
- the fixed VIS-06A Decline slot must still show `Skip`;
- the Primary slot should remain empty because the skill button itself is the positive action;
- the Cancel slot should remain empty because this is not a local selection mode.

Do not convert Skip into Cancel or hide the decline action.

### 4. Preserve the rest of Sun Shangxiang's skill panel
When the local hero is Sun Shangxiang:
- both metadata skill names remain visible in the Hero Skills panel;
- Betrothment remains present and keeps its existing enabled/disabled behavior;
- Daredevil becomes enabled only when the projected `sun_shangxiang_daredevil` option is actually available;
- outside that trigger decision, Daredevil remains visible but disabled rather than disappearing.

Do not infer availability from hero identity alone.

### 5. Do not over-generalize hero-trigger ownership
This task is specifically the missing Sun Shangxiang mapping.

Do not:
- automatically claim every trigger option whose label matches a hero skill;
- use string/label matching;
- alter generic unmapped trigger providers;
- move provider-extra controls from VIS-06A unless they are explicitly mapped hero skills.

The stable effect-ID mapping remains the authority.

## Required browser fixture
Add one dedicated fixture state:

`sun-shangxiang-daredevil`

For a 4-player room:
- viewer / action actor = `p1`;
- p1 hero = `sun-shangxiang`;
- CurrentAction kind = `trigger`;
- legal actions include `trigger` and `decline_trigger`;
- decline action = `decline_trigger`;
- trigger options contain exactly one Daredevil option:
  - effectId `sun_shangxiang_daredevil`;
  - label `Daredevil`;
  - no selection;
  - allowDecline true.

Keep the fixture minimal. It does not need to simulate equipment loss itself; production capability tests already own trigger legality. The browser fixture only represents the already-projected legal trigger decision.

Use the existing `window.__browserActions` capture from VIS-06A.

## Required browser regression

Run at:
- 480x900;
- 1440x900.

Assert:

1. LocalPlayerDock belongs to p1 and local hero is `sun-shangxiang`.
2. `.local-hero-skills` contains exactly the metadata skill controls for `Betrothment` and `Daredevil`.
3. Daredevil button is inside the Hero Skills / local-status panel, not inside `data-action-extras` or any action slot.
4. Daredevil button is enabled for this fixture.
5. Betrothment remains present and is not falsely enabled by the Daredevil option.
6. `data-action-extras="true"` contains no `Daredevil`, `Use Daredevil`, or `Cancel Daredevil` button.
7. Cancel slot is empty.
8. Primary slot is empty.
9. Decline slot contains `Skip`.
10. Clicking the Hero Skills Daredevil button records exactly:
    ```js
    { action: "trigger", extra: { providerId: "sun_shangxiang_daredevil" } }
    ```
    using the existing callback path.
11. The local hero card and local-status/skills panel remain in their existing dock regions; no bottom duplicate control appears.
12. No horizontal overflow.

### Negative regression
Retain the existing VIS-06A `provider-extra` fixture and prove its unmapped generic provider still remains in `data-action-extras="true"`.

This prevents the implementation from accidentally routing all generic providers into the hero panel.

### Inactive-state regression
Add or reuse a Sun Shangxiang normal-turn fixture with no Daredevil trigger option and prove:
- Daredevil is still visible in the Hero Skills panel;
- Daredevil is disabled;
- no generic Daredevil button exists in the action row.

## Forbidden shortcuts
Do not:
- hide the generic bottom Daredevil button with CSS while leaving ownership incorrect;
- duplicate Daredevil in both hero panel and extras;
- make Daredevil permanently enabled;
- infer the trigger from hero name/label text;
- alter `allowDecline`;
- remove Skip;
- put Daredevil in Primary/Cancel/Decline slots;
- change Betrothment behavior;
- change VIS-06A guidance or slot positions;
- change gameplay/server/projector/capability semantics.

## Validation
Run and report:
- focused VIS-06B browser tests at 480 and 1440;
- retained VIS-06A slot/guidance tests;
- retained mounted hero-skill/trigger tests relevant to active skills;
- retained provider-extra negative regression;
- broader local checks only if allowed.

Do not claim unrun checks. Do not inspect or wait for CI.

## Execution result
Append only:
- implementation SHA;
- files changed;
- exact mapping change;
- Daredevil hero-panel / bottom-extras DOM proof;
- action captured from Daredevil click;
- Skip preservation proof;
- inactive-state proof;
- retained VIS-06A validation result;
- any GAP.

Do not self-accept. Push, verify remote HANDOVER, then STOP.

## Acceptance
Pass only if Sun Shangxiang Daredevil is owned exclusively by the existing Hero Skills panel whenever its projected option is legal, invokes the existing trigger payload unchanged, preserves authoritative Skip in the fixed decline slot, remains disabled-but-visible when unavailable, and generic unmapped provider controls remain in the extras region.

## Deferred after this task
**VIS-05A remains incomplete.** After VIS-06B review, the reviewer should return to `UX2.0VIS-05A: Correct 5–10 Player Side-Column Seat Topology` unless a new blocker is discovered.
