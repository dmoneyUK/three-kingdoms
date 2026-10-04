# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

Current task authority. Long-lived decisions/history: `docs/AUTONOMOUS_UI_ROADMAP.md`. Workflow: `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`.

## Previous result

### UX2.0VIS-09C — Preserve Hand Viewport Context Across Card Changes

Status: `COMPLETED BY AGENT — CI GREEN`
Revision: `a5fbc33c06453ee2b34f7c83dbdc13fa1328294c`
CI: [run 37196642543](https://github.com/dmoneyUK/three-kingdoms/actions/runs/37196642543) — build-and-test and deploy/production smoke test succeeded.

Viewer-private physical Hand IDs now anchor the horizontal rail across membership updates; if the anchor is removed, the nearest surviving card from the prior visible neighborhood is retained. Appends preserve the viewport and selection. Focused browser regression passed 4/4 at 480px/650px; targeted ESLint and `git diff --check` passed. Human Reviewer acceptance remains separate.

## Current task

### UX2.0VIS-10A — Keep the Interaction Stage Inside the Safe Zone at Short Portrait Heights

Status: `PLANNED — READY TO IMPLEMENT`

Observed gap: the 900px-high mobile matrix passes, but active Top Row stages overflow the safe zone and Local Dock at short heights. Mounted fixture measurements: at 480×640, Stage/Dock overlap was 20px in Dying, 120px in Negation and 108px in Group observer; at 650×700 it was 53px, 97px and 122px respectively. The safe zone still ends at the Play Table boundary, but Stage content extends past it.

Design authority: `docs/UX_V2_INTERACTION_STAGE_DESIGN.md` §§0.89–0.91; `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md` §§7.10, 19. Apply the approved responsive-pressure order: preserve the composition and required public interaction content while compacting secondary metadata; do not infer or change semantic authority.

Requirements:
- At 480×640 and 650×700, keep Top Row Interaction Stage fully within the safe zone and Play Table, above the Local Player Dock, for interaction, Negation, Dying and Group observer fixtures.
- Preserve the local Hero/Skills/Equipment/one-row Hand/Guidance/Actions composition and all required visible Stage content; do not clip, scroll, scale or hide non-redundant semantic content to force fit.
- Keep 900px-high behavior, seat geometry, viewer privacy and all server/CurrentAction/Presentation authority unchanged.
- Add focused browser geometry/content regressions for short portrait viewports.

Planning gate: approved requirement YES; existing viewer-safe presentation authority YES; one bounded Top Row mobile containment concern YES; high impact (measured Stage/Dock collision) YES; fixture geometry/content proof YES.

Run only focused local browser validation, targeted lint and `git diff --check`; GitHub Actions is the final gate. If approved responsive compaction cannot contain required content without an unapproved trade-off, record exact evidence and stop with `BLOCKED — HUMAN REVIEW REQUIRED`. Never write `REVIEWER ACCEPTED`.
