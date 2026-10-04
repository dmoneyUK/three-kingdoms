# WTK UI / Layout — Current Handoff

Branch: ux-v2  
Mode: AUTONOMOUS UI RUN  
Authority: AGENTS.md, this file, and docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md.  
History: docs/AUTONOMOUS_UI_ROADMAP.md.

## Latest confirmed code/CI result

Commit `352f354c41e66228f56aad717bfad2b0409aaece` was checked at the task
boundary. Actions run `37237657587` completed successfully; both
`build-and-test` and `deploy` jobs passed. The preceding documentation commit
`5f125b325f09caef674bb792c76e048ccf1d9293` had run `37237551736` cancelled;
that revision is not claimed green. No local tests, build, or lint were run
for those documentation commits.

## Design review checkpoint

Reviewed remote `docs/UX_V2_INTERACTION_STAGE_DESIGN.md` from `origin/ux-v2`.
Its latest design-changing commit is
`43f282f494ee606e73347e3bb6a580b16024f65a` (`docs: integrate mobile visual
composition contract`). Reviewed the full heading map and that commit's full
design diff, including the added mobile proportions, Stage breathing/layering,
compression order, opponent-seat composition, and clarified selection/action
semantics. The current task uses §§0.91.1–0.91.5, 1.5.1–1.5.2, and 2.7.
Record the design revision reviewed at each future task-planning boundary and
compare the remote design against it.

## Current task — UX2.0VIS-12N: Four-Player Interaction Screenshot Matrix

Status: RESUMED BY USER — in progress.

Purpose: complete the four-player visual-evidence slice prompted by the user's
phone screenshot. Keep scope to four-player Top Row and existing typed browser
fixtures. No gameplay or semantic changes.

Acceptance:
- Capture and inspect 480×900 states: ordinary turn, single target,
  Group/AOE observer, Negation, Duel, Dying/Peach, and long guidance.
- Capture 390×640 Group/AOE observer and Dying/Peach.
- Use existing GameRoom typed fixtures/helpers; assert Stage/Safe Zone/Dock
  containment, opponent-seat separation, required semantic content, and
  action-target geometry where actions are present.
- Record screenshots and focused geometry evidence. Split any separate defect
  or undecided visual trade-off into a separately planned task.

Uncommitted local work at resume: `tests/browser/ui19.spec.mjs` contains an
unvalidated 12N screenshot/geometry matrix and a 12J screenshot-output change.
Preserve and finish this work in the existing checkout; it has not been run,
committed, or pushed.

Process update requested by the user: `AGENTS.md` and
`docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md` now require reviewing the remote
overall design document at each resume/planning boundary and clarify that the
Agent maintains HANDOVER. This documentation update is not yet committed or
pushed and must remain separate from the uncommitted `ui19.spec.mjs` work.

Before the first 12N source/test edit after that documentation push, inspect the
latest push-triggered Actions run once. If queued/in progress, proceed without
waiting; if failed, investigate the relevant failure first. No next UX task is
planned until 12N closes and the §19 planning gate is applied.
