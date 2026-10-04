# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

Current authority: this file and `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`. Long-lived decisions/history: `docs/AUTONOMOUS_UI_ROADMAP.md`.

## Latest result

### UX2.0VIS-11A — Keep the Interaction Stage Inside the Safe Zone on Narrow Short Portrait Screens

Status: `COMPLETED BY AGENT — CI GREEN`  
Tested revision: `4e8dcb3ca10af5532efc5182bb3ae8b4e37dc708`  
CI run: [37207569443](https://github.com/dmoneyUK/three-kingdoms/actions/runs/37207569443) — `build-and-test` job `111451871032` and `deploy` job `111452846296` succeeded. Human Reviewer acceptance remains separate.

Focused short-portrait browser matrix passed 20/20; targeted ESLint passed. No full local suite/build/lint was run. During implementation, design revision `09b5bbd` added the mobile thumb-zone action requirement in §2.7; it is recorded below as the next bounded task.

## Current task

### UX2.0VIS-11B — Place the Mobile Primary Action in the Centre-Right Thumb Zone

Status: `IMPLEMENTED — CI PENDING`

Objective: move the mobile semantic Primary action into the approved centre-right thumb zone while keeping authoritative Decline/Skip/End safely at the far right and preserving contextual Cancel.

Evidence at task start: at 480px, `.turn-controls > [data-action-slots]` put Primary in the first 78px track and grouped Cancel/Decline at the right; VIS-06A asserted Primary was left-anchored. Design §2.7 instead requires the mobile Primary in the 55–70% centre-right region. Workflow §§7.8/8 duplicated the superseded Primary-left rule; reconciled during this task.

Authority: `docs/UX_V2_INTERACTION_STAGE_DESIGN.md` §2.7 and Action-placement validation; revision `09b5bbd` explicitly supersedes the earlier far-left phone anchor. Workflow §1 names the design document as primary UI authority; synchronize only its stale action-slot summary in §§7.8/8 as part of this task.

Requirements:
- At 480px portrait, place Primary in the 55–70% horizontal thumb zone and not flush to either edge; place Decline/Skip/End far right with at least a 32px measurable Primary-to-Decline gutter and a deliberate edge margin.
- Keep Cancel contextual (rendered only when `CurrentAction`-owned local cancellation is available); arrange any visible Cancel/Primary/Decline controls in visual and keyboard/DOM order without changing action meaning.
- Preserve minimum 78×32px action targets; keep Primary visually more prominent than End Turn; do not overlap Guidance, Hand, other controls, or introduce page overflow.
- Cover card+target+Confirm, response+Skip/Decline, normal Play Phase+End Turn, and a genuine local picker requiring Cancel at 480px; retain 1440px desktop regression and inspect representative phone screenshots for one-handed reach / accidental-tap risk.
- Preserve action visibility, labels, enabled state, `CurrentAction` authority, callback/payload, and server/gameplay semantics; provider Extras stay outside the Primary/Decline safety gutter.

Expected files: `app/page.tsx`, `app/sequence-overrides.css`, `tests/browser/ui19.spec.mjs`, `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`, `HANDOVER.md`, and `docs/AUTONOMOUS_UI_ROADMAP.md`.

Validation: focused browser tests and targeted lint only; no local full suite/build/lint. Push source/tests/docs/handover and wait for Actions on the exact revision; fix actual failures and continue only after CI is green.

Planning gate: all five §19 checks passed. The current visual invariant is explicit and the old left-anchor implementation/test gap is measurable; only presentation/DOM traversal changes are needed, with all actual action semantics preserved. The design update resolves the older anchor; no product decision is inferred. Implementation rechecked touch geometry and the three-control picker arrangement against §2.7.

Implementation result: moved the existing conditional Cancel / Primary / authoritative Decline slots into left-to-right DOM order without changing visibility conditions, enabled state, handlers, or payloads. The phone grid places Primary in the measured 55–70% region and Decline at the right edge with >=32px separation and >=8px viewport-edge margin; contextual Cancel stays left with its own separation. Reconciled workflow §§7.8/8 with design §2.7. Reviewed 480px screenshots for target+Confirm+Cancel, response+Skip, and Play+End.

Focused validation: semantic action-slot browser matrix passed 3/3 at 360/480/1440px across six local flows; retained short-portrait Stage containment passed 10/10 at 320/360px; targeted ESLint passed. The matrix verifies 78×32px buttons, thumb-zone geometry at 360/480, right anchoring/gutter, traversal order, no action overlap, and no horizontal page overflow. No full local suite/build/lint was run. Commit/push and exact-revision CI are pending.

Stop condition: if 480px controls cannot simultaneously meet the approved reach zone, >=32px Primary-to-Decline gutter, minimum target size, readable contextual Cancel, and coherent traversal without semantic changes, record exact measurements and stop with `BLOCKED — HUMAN REVIEW REQUIRED`.
