# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

This file contains only the current execution handoff. Product design is in `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`; execution rules are in `AGENTS.md` and `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`; history is in `docs/AUTONOMOUS_UI_ROADMAP.md`.

## Latest confirmed remote baseline

Revision `8407c8dcf14444d107d348bfa43f473ac8331d2c` was confirmed green in GitHub Actions run `37240016937`: both `build-and-test` and `deploy` succeeded.

Later reviewer design-only commit `d3854354317111af3acb7d8cc7a70ee79392e496` added long-term interaction-correctness requirements to the UX V2 design. It does **not** change the current task. Its Actions run was still in progress at the last check; do not infer a result.

## Design review checkpoint

The current task was planned against Coding-Agent-reviewed design revision `43f282f494ee606e73347e3bb6a580b16024f65a`.

The remote design now includes reviewer additions from `d3854354317111af3acb7d8cc7a70ee79392e496`. Do not insert those additions into the current VIS-12N scope. Before planning the next task, review all design changes since `43f282f4` and record the new reviewed design revision.

## Current task — UX2.0VIS-12N: Four-Player Interaction Screenshot Matrix

Status: **IN PROGRESS**

Purpose: complete the four-player visual-evidence slice using existing typed browser fixtures. No gameplay or semantic changes.

Acceptance:

- 480×900: ordinary turn, single target, Group/AOE observer, Negation, Duel, Dying/Peach, and long guidance.
- 390×640: Group/AOE observer and Dying/Peach.
- Assert Stage/Safe Zone/Dock containment, opponent-seat separation, required semantic content, and action-target geometry where actions are present.
- Inspect and record screenshots/geometry evidence.
- If a separate defect or undecided visual trade-off appears, keep VIS-12N bounded and defer that issue to the next planning boundary unless it blocks this task.

## Resume point

The prior Agent reported uncommitted local work in `tests/browser/ui19.spec.mjs`: an unvalidated VIS-12N screenshot/geometry matrix plus a VIS-12J screenshot-output change.

Preserve that work if it exists in the current worktree. Do not assume it exists in a fresh checkout because it has not been pushed.

Before the next source edit, apply the workflow's one-time CI checkpoint. No next UX task is authorized until VIS-12N closes and the next-task planning gate is applied.
