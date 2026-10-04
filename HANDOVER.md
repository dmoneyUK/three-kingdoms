# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

This file is the **current task handoff authority** and is intentionally short.

Long-term roadmap and historical task/CI records live in:
`docs/AUTONOMOUS_UI_ROADMAP.md`

Execution workflow lives in:
`docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`

Do not load the full roadmap/history unless the current task or next-task planning actually needs older evidence.

## Previous result

### UX2.0VIS-09A — Move Persistent Local Judgement Into the Hero Overlay

Status: `COMPLETED BY AGENT — CI GREEN`  
Implementation: `59f15192dc580419443f50651325b9ea4f3abe79`  
Final tested revision: `159205965e2464c25d088b8e514bb20c26462359`  
CI: run `37191718705`; build-and-test and deploy succeeded.

Result:
- persistent local Judgement now renders once as a compact local-Hero overlay;
- the independent Dock Judgement column was removed;
- physical IDs, card inspection, in-flight hiding, Skills/Equipment, Hand and actions were preserved;
- active Judgement resolution remains Interaction Stage-owned.

Human Reviewer acceptance remains separate.

## Current task

### UX2.0VIS-09B — Navigate Overflowing Hand Cards in One Row

Status: `PLANNED — READY TO IMPLEMENT`

Objective:
Keep large local hands reachable in one horizontal layer without shrinking cards below their usable size or letting the rail spill outside the Hand viewport.

Design authority:
- `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md` §§7.11, 10, 19–20
- `docs/UX_V2_INTERACTION_STAGE_DESIGN.md` §§0.82–0.88, 2.2, 2.9

Preserve:
- only viewer `room.myHand` physical cards/IDs are rendered;
- selection and eligibility remain `CurrentAction`-driven;
- one horizontal Hand layer;
- existing card identity/order/inspection/selection;
- fixed Local Dock Guidance and Cancel | Primary | Decline action semantics;
- no gameplay/server/protocol changes.

Requirements:
- keep existing usable card dimensions and controlled overlap until the minimum useful step is reached;
- beyond that point, use platform-native horizontal scrolling/panning rather than further shrinking or clipping;
- render every physical Hand card exactly once and keep the end cards reachable;
- preserve selected-card visibility and info controls;
- a pan gesture must not activate/select the card under the gesture, while ordinary taps still work;
- prove behavior for 5/10/15/20/25+ cards at 1440/650/480px;
- prevent document-level horizontal overflow and overlap with action controls;
- update README only if the durable proven Hand contract materially changes; do not claim touch-device certification.

Non-goals:
- no new gameplay/legality;
- no second Hand row;
- no arbitrary hand-count-specific layout breakpoints;
- do not claim semantic scroll-anchor preservation across authoritative card add/remove unless separately proven.

Stop condition:
If the scroll viewport cannot preserve selected-card raise and existing controls without an unapproved composition trade-off, record the measured conflict and stop with `BLOCKED — HUMAN REVIEW REQUIRED`.

Focused validation:
- focused Hand/render tests;
- focused browser geometry/interaction cases using existing fixtures/helpers;
- `git diff --check`;
- GitHub Actions is the final validation gate.

## Handoff update rule

During VIS-09B, keep this file concise.

When VIS-09B closes:
1. record its compact execution result and final CI state here;
2. move the older VIS-09A result/history into `docs/AUTONOMOUS_UI_ROADMAP.md` if not already recorded;
3. inspect actual code plus the approved roadmap/design and define exactly one next bounded task here;
4. keep only the latest result plus the next/current task in HANDOVER.

Do not append a growing task history to this file.
