# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

Current authority: this file and `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`. Long-lived decisions/history: `docs/AUTONOMOUS_UI_ROADMAP.md`.

## Latest result

### UX2.0VIS-10C — Opponent Hero Readability and Public Equipment at a Glance

Status: `COMPLETED BY AGENT — CI GREEN`  
Tested revision: `f8fd113ece95e11665758b1d267172e97b731a5d`  
CI run: [37205238173](https://github.com/dmoneyUK/three-kingdoms/actions/runs/37205238173) — build-and-test and deploy succeeded. Initial run [37204909828](https://github.com/dmoneyUK/three-kingdoms/actions/runs/37204909828) exposed two stale retained equipment-wrapper assertions; corrected to verify the visible public Weapon summary, focused rerun 2/2 passed. Human Reviewer acceptance remains separate.

Focused VIS-10C browser matrix passed 23/23; targeted render regression 1/1; targeted ESLint had no errors (fixture JSX is not configured for lint). No full local suite/build/lint was run.

## Current task

### UX2.0VIS-11A — Keep the Interaction Stage Inside the Safe Zone on Narrow Short Portrait Screens

Status: `IMPLEMENTED — CI PENDING`

Objective: prevent the Top Row Interaction Stage from extending into the Local Player Dock on narrow, short portrait viewports while preserving required Stage information and the fixed Dock composition.

Evidence: screenshot and DOM geometry probe at 320×640 in `long-guidance` with 25 Hand cards measured Stage y=149–324.4, Safe Zone bottom=288.5, and Dock top=294.5: Stage overruns the Safe Zone by 35.9px and overlaps the Dock by 29.9px. Existing VIS-10A coverage starts at 480×640 / 650×700.

Authority: `docs/UX_V2_INTERACTION_STAGE_DESIGN.md` §§0.90–0.91, 1.4, 2.10; `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md` §§7.3, 7.7, 19. Preserve Top Row topology, required semantic Stage content, local Dock hierarchy, `CurrentAction` authority, and existing gameplay/privacy boundaries.

Requirements:
- Keep required current Stage content within the measured Safe Zone and above the Dock; Stage must not overlap the Dock, Guidance, or action controls.
- Validate 320×640 and 360×640 with a 25-card Hand for representative Interaction, Negation, Dying, and Group-observer states; prove required Stage content remains visible, Dock/action controls remain contained and usable, and document width does not overflow.
- Use approved responsive compaction only; do not silently hide/truncate current semantic focus, decision, or required guidance, change composition, or alter gameplay/server authority.

Regression and visual proof: add focused short-portrait geometry/visibility cases to the existing VIS-10A matrix and inspect representative screenshots; DOM presence alone is insufficient.

Validation: focused browser cases and targeted lint only; no local full suite/build/lint. Push code, focused tests, relevant docs, and handover; inspect Actions for the exact pushed revision, fix real failures, and continue only after CI is green.

Planning gate: all five §19 checks passed. The approved Stage/Dock non-overlap invariant is explicit; the defect is measured and reproducible; the work is presentation-only and independently testable. Design-file diff since VIS-10C planning: none. During implementation, remote revision `09b5bbd` updated design §2.7 with phone Primary centre-right thumb-zone placement and safety separation from Decline/Skip/End, superseding the earlier far-left anchor. This does not change VIS-11A's Safe Zone scope; the new action-placement requirement is tracked separately for the next planning review. Other deferred items remain Local Dock final proportions/density and representative interaction/final mobile visual audit.

Implementation result: `app/globals.css` now uses a flexible four-track Group layout at ≤360px Safe Zone width and moves the narrow Dying Rescue panel into a full-width second row with its three handoff roles kept together. The existing critical-height metadata compaction remains presentation-only. Extended VIS-10A coverage to 320×640 and 360×640, with Interaction, Negation, Dying, Group-observer, and long-guidance states at 25 cards; assertions now verify Stage-child bounds/text, full Dying handoff fields, Dock containment, and no horizontal document overflow. The test caught and fixed a Group implicit-column overflow (child edge 475px vs Safe Zone right 318px) and a 320×640 Dying Stage extending 19px below the Safe Zone. Representative 320×640 Dying screenshot visually reviewed; all required handoff text remained legible.

Focused validation: `npx playwright test --config tests/browser/layout.config.mjs --grep 'stays inside the Safe Zone without losing Stage content' --workers=2` — 20/20 passed across 480×640, 650×700, 320×640, and 360×640. `node_modules/.bin/eslint tests/browser/ui19.spec.mjs` passed. No full local suite/build/lint was run. Commit/push and exact-revision CI are pending.

Stop condition: if required Stage content cannot fit inside the approved Safe Zone without removing/hiding required meaning or changing the approved Dock composition, record measurements and stop with `BLOCKED — HUMAN REVIEW REQUIRED`.
