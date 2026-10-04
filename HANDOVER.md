# WTK UI / Layout — Current Handoff

Branch: ux-v2  
Mode: AUTONOMOUS UI RUN  
Authority: AGENTS.md, this file, and docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md.  
History: docs/AUTONOMOUS_UI_ROADMAP.md.

## Latest confirmed code/CI result

The focused CI correction for UX2.0VIS-12M is commit
b0ac80d682da631a66f2b628e77ea773cb2173d6; Actions run 37234054061 was
observed successful. The later handover-only checkpoint commit
a49d0f0cb3b45502264329307eeb1bbffe0aad31 had run 37234601498 in progress at
the last observation. Its current status has not been checked during this
user-requested pause. No later revision is claimed green.

No full local test suite, build, or lint was run for that correction.
The workflow-documentation update is not claimed CI-green; the next Agent must
inspect the latest Actions status at the next task boundary before any source
edit, as specified in the workflow.

## Current task — UX2.0VIS-12N: Four-Player Interaction Screenshot Matrix

Status: PAUSED BY USER — workflow review/migration. Do not resume 12N source
changes or tests until the user explicitly resumes work.

Purpose: complete the four-player visual-evidence slice prompted by the user's
phone screenshot. Keep scope to four-player Top Row and existing typed browser
fixtures. Design authority: docs/UX_V2_INTERACTION_STAGE_DESIGN.md
§§0.91.2, 1.5.1–1.5.2, 2.7; process and planning gate:
docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md §§4, 12, 19.

Task acceptance when resumed:
- Capture and inspect 480×900 states: ordinary turn, single target,
  Group/AOE observer, Negation, Duel, Dying/Peach, and long guidance.
- Capture 390×640 Group/AOE observer and Dying/Peach.
- Use existing GameRoom typed fixtures/helpers; assert Stage/Safe Zone/Dock
  containment, opponent-seat separation, required semantic content, and
  action-target geometry where actions are present.
- Record screenshots and focused geometry evidence. No gameplay/semantic
  changes. Split any separate defect or undecided visual trade-off into a
  separately planned task.

Uncommitted local work at pause: tests/browser/ui19.spec.mjs has an unvalidated
12N screenshot/geometry matrix edit (480×900 states, 390×640 Group/Dying, and
a saved 12J single-target screenshot). It was not run, committed, or pushed.
Preserve it if resuming in the same worktree. It is not available from a fresh
remote checkout; if absent there, reconstruct it from the acceptance scope
above after the user resumes. Do not include this partial test work in the
workflow-documentation change.

No next task is planned while the user-requested pause is active.
