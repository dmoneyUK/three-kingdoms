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

## Autonomous run append-only updates — 2026-10-04

### UX2.0VIS-11B — CI closure

Status: `COMPLETED BY AGENT — CI GREEN`  
Tested revision: `747eb0654fc6be9d5d6ab29b4901b3801239f2d9`  
CI run: [37210340894](https://github.com/dmoneyUK/three-kingdoms/actions/runs/37210340894) — build-and-test job `111460067223` and deploy job `111461124350` succeeded. Human Reviewer acceptance remains separate. Focused browser matrix 13/13 and targeted ESLint passed; no full local suite/build/lint was run.

### UX2.0VIS-12A — Make Local Hero Skills Readable, Full-Label, and Easy to Hit

Status: `IMPLEMENTED — CI PENDING`

Planning gate: all five §19 checks passed against `docs/UX_V2_INTERACTION_STAGE_DESIGN.md` §§0.77–0.80, 2.1, 2.4, 2.9 and the current autonomous workflow §§19–20. The approved design requires large/reliable skill controls, readable names without hover, and Skills-left / Equipment-right placement; existing hero skill metadata supplies presentation labels. The current defect was measured at 944×24 on desktop and 223×22 at 480px, while an experimental 320px horizontal variant clipped Zhen Ji's longest skill labels.

Requirements:
- Keep skill controls in the right-top band, left of Equipment, with Hand below; preserve labels, enabled/disabled/active states, callbacks, and `CurrentAction` ownership.
- Use responsive content-sized controls with full visible names and minimum 44×44px hit areas; no ellipsis, clipping, or mid-word line breaks at 320px.
- Cover Zhen Ji's “Empress Dowager” and “Godess of Luo River” at 320, 360, 390, 480, 650, and 1440px; verify hit geometry, complete readable words, Equipment separation, and no page overflow.
- Do not change Dock/Hand/Interaction Stage geometry, gameplay, protocol, or authoritative semantics.

Implementation result: changed only the local skills presentation to a compact responsive horizontal row of content-sized controls, at least 44×44px and capped at 56px high; removed ellipsis/clipping, tuned narrow-screen typography to preserve whole-word wrapping, and kept equipment right of skills. Added a test-only hero override to the existing browser fixture and six viewport regressions with geometry, word-line, hit-target, equipment separation, and document-width assertions. No product/gameplay semantics or `README.md` changes.

Focused validation: VIS-12A's six viewport cases and existing VIS-06B enabled/disabled skill behavior/semantic-flow cases passed 10/10. Screenshots at 320, 480, and 1440px were reviewed. Targeted ESLint on `tests/browser/ui19.spec.mjs` reported zero errors; the fixture JSX file is ignored by the repository ESLint configuration. No full local suite/build/lint was run. Commit, push, and exact-revision CI are pending.

Stop condition: if 320px cannot retain two 44×44px controls, full names without splitting words, Equipment to their right, and no overlap/overflow under existing Dock and Stage/Hand constraints, record measurements and stop with `BLOCKED — HUMAN REVIEW REQUIRED`.

Remote design/workflow refresh during VIS-12A: fast-forwarded from `747eb06` to `b32fbb6` after finding three reviewer commits. Reviewed the full design/workflow diff, including mobile composition and Stage layering (§§0.91.1–0.91.5), Hero-art crop (§1.5 / §2.3), and Direct-Reversal-First control semantics (§§0.89 / 8). None changes this bounded skill-control task or authorizes adding Stage/crop/control-semantic changes here. Keep those mobile Stage and Hero-art requirements visible for later independent planning.

Supplemental focused validation after the remote design refresh: VIS-12A + existing VIS-06B skill behavior + VIS-10A/VIS-11A short-portrait Stage containment passed 30/30; targeted ESLint on `tests/browser/ui19.spec.mjs` passed. No full suite/build/lint was run.

### UX2.0VIS-12A — CI closure

Status: `COMPLETED BY AGENT — CI GREEN`  
Tested revision: `ee77bbecafb2bf7e47a7bdd4319cedba5a81527e`  
CI run: [37213322962](https://github.com/dmoneyUK/three-kingdoms/actions/runs/37213322962) — build-and-test job `111468919876` and deploy job `111470033329` both succeeded. No CI failure fixes required. Human Reviewer acceptance remains separate.

### UX2.0VIS-12B — Restore Hero-First Width for Mobile Top-Row Opponent Seats

Status: `IMPLEMENTED — CI PENDING`

Planning gate: all five §19 checks passed after fetching `origin/ux-v2` and reviewing current workflow §§19–20 and design §§0.91.1–0.91.5, 1.5–1.5.2, 2.3 and 2.7. The approved 4-player Top Row benchmark is about 136–146px per opponent card at 480px; the current rendered cards are about 100px. The 480px fixture screenshot and VIS-04B/C geometry tests prove the measurable gap.

Objective: Increase only the three opponent seats in the 4-player mobile Top Row to the approved Hero-first width and align them to the approved compact row geometry.

Requirements:
- At 480px, each of the three actually rendered opponent cards measures 136–146px with about 12–16px outer margins and 8–10px gaps; at 390px they remain contained and non-overlapping; at 650px widths stay capped at 146px.
- Keep the accepted one-row order and vertical anchors; adjust only the horizontal tracks/outer anchors as needed to achieve the approved margins and gaps. Preserve current seat height, Stage clearance, local Dock separation, Hero/identity/HP/Hand/equipment visibility, Inspect and target hit behavior, and no document-level horizontal overflow.
- Update stale VIS-04A/B/C width/position expectations only where this deliberate width change requires it; retain unchanged 2-/3-player Top Row and Side Column behavior.
- Use only the rendered 4-player opponent seats for density/geometry checks. Do not infer participant density from nominal table size or excluded viewer/primary/source roles.

Design authority: `docs/UX_V2_INTERACTION_STAGE_DESIGN.md` §§0.91.1, 0.91.5, 1.5, 1.5.2; workflow §§19–20. Existing public seat projections and fixed relative seat classes remain authoritative.

Expected scope: `app/sequence-overrides.css`, focused `tests/browser/ui19.spec.mjs`, append-only `HANDOVER.md`, and `docs/AUTONOMOUS_UI_ROADMAP.md`.

Non-goals: no change to seat topology/order semantics, Side Column dimensions, Hero crop focal points/art assets, equipment meaning, Interaction Stage/Deck/Discard placement, controls, gameplay, private projections, or server authority.

Focused validation: mounted 4-player Top Row browser coverage at 390/480/650px, plus only affected VIS-04A/B/C and VIS-10C checks; inspect representative screenshots. No local full suite/build/lint. Push the change and exact-revision CI evidence per autonomous workflow; do not plan another task until that CI run is green.

Stop condition: if the 480px width target cannot coexist with the approved same-row, Safe Zone, and no-overflow constraints without changing another accepted composition, record measured geometry and stop with `BLOCKED — HUMAN REVIEW REQUIRED`.

Implementation result: limited the responsive three-track change to the 4-player mobile Top Row. At 480px, measured seats are 146px wide with 12px outer margins and 9px gaps; widths contract to about 117.5px at 390px and cap at 146px at 650px. Seat height and vertical placement are unchanged. Updated only affected VIS-04B/C geometry expectations and added 390/480/650 mounted regressions for bounds, Stage clearance, Hero art, identity, HP/Hand visibility, target hits, and document overflow. The initial width-only experiment exposed 5.5px edge clipping; the approved three-track margin/gap model fixed it. Reviewed the 480px screenshot. No gameplay, private projection, control, Side Column, or Hero-crop changes.

Focused validation: `npx playwright test --config tests/browser/layout.config.mjs --grep 'UX2.0VIS-12B|UX2.0VIS-04A|UX2.0VIS-04B|UX2.0VIS-04C|UX2.0VIS-10C Top Row' --workers=2` — 74/74 passed; the three VIS-12B cases also passed separately. `npx eslint tests/browser/ui19.spec.mjs` passed. No local full suite/build/lint. Commit, push, and exact-revision CI are pending.

### UX2.0VIS-12B — CI closure

Status: `COMPLETED BY AGENT — CI GREEN`  
Tested revision: `102f36d1430663f5005c4696a90b6bc1135944a4`  
GitHub Actions run: [37215156772](https://github.com/dmoneyUK/three-kingdoms/actions/runs/37215156772) — build-and-test job `111474046079` succeeded; deploy job `111474896190` and production smoke test succeeded. No CI fixes required. Human Reviewer acceptance remains separate.

### UX2.0VIS-12C — Reduce Mobile Deck/Discard Prominence

Status: `IMPLEMENTED — CI PENDING`

Planning gate: all five §19 checks passed after fetching `origin/ux-v2` and reviewing current workflow §§19–20 plus design §§0.91.2–0.91.4 and 1.5. The 480px interaction screenshot shows the default Deck/Discard anchors at 70×98px in the lower-middle battlefield; the empty Discard surface is much brighter than the active Stage and local controls. The approved design explicitly says these are secondary in ordinary interactions, compact, and lower-contrast.

Objective: Reduce only the mobile default Deck/Discard footprint and surface prominence while retaining the existing lower-middle/background anchor and readable pile labels/card face.

Requirements:
- At 390/480/650px, render both pile containers no larger than 56×78px; preserve the existing center alignment, lower-middle vertical anchor, accessible labels/counts, and pile contents.
- Use quieter surface/border/shadow treatment for the empty/default piles; preserve legibility of the top discard card itself and leave active event/card treatments untouched.
- Keep Deck/Discard below the Interaction Stage/Hero Focus and clear of opponent seats, local Dock, and controls. Preserve existing sequence-active hiding and any authoritative event/reveal behavior.
- Add focused mounted regressions for ordinary/rest and interaction views, including pile geometry, readable labels, active Stage stacking/containment, and no page overflow; retain relevant existing pile/reveal coverage.

Design authority: `docs/UX_V2_INTERACTION_STAGE_DESIGN.md` §§0.91.2–0.91.4; workflow §§19–20. No new gameplay/event semantics are needed.

Expected scope: `app/sequence-overrides.css`, focused `tests/browser/ui19.spec.mjs`, append-only `HANDOVER.md`, and `docs/AUTONOMOUS_UI_ROADMAP.md`.

Non-goals: do not move the piles to a newly selected left/right corner or add event-specific emphasis; do not change card identity/art, reveal timing, server/gameplay semantics, Interaction Stage content, or local controls. The exact edge destination remains a separate future composition decision; current lower-middle placement is retained for this bounded de-emphasis slice.

Focused validation: only the new 390/480/650 mounted cases and relevant existing pile/Stage browser tests; inspect a representative mobile screenshot. No local full suite/build/lint. Push and require exact-revision CI green before planning another task.

Implementation result: changed only mobile Deck/Discard presentation. Both pile envelopes are 56×78px at 390/480/650px, remain centered at the existing lower-middle anchor, and use quieter surfaces/shadows; removing the mobile Discard tilt was required because its transformed visible bounds exceeded the approved envelope. The existing discard card face/art is unchanged. A reviewed 480px Interaction screenshot confirms the piles stay visually secondary to the Stage and local controls. Files: `app/sequence-overrides.css`, `tests/browser/ui19.spec.mjs`, this handover, and `docs/AUTONOMOUS_UI_ROADMAP.md`.

Focused validation: `npx playwright test --config tests/browser/layout.config.mjs --grep 'UX2.0VIS-12C' --workers=2` — 6/6 passed; retained mounted local-Dock/discard identity regression — 1/1 passed; `npx eslint tests/browser/ui19.spec.mjs` passed. No local full suite/build/lint. Commit, push, and exact-revision CI are pending.

### UX2.0VIS-12C — CI closure

Status: `COMPLETED BY AGENT — CI GREEN`  
Tested revision: `60c353de5fb6957e716b07ac07dfb48f692ace33`  
GitHub Actions run: [37216175450](https://github.com/dmoneyUK/three-kingdoms/actions/runs/37216175450) — build-and-test job `111477024607` and deploy job `111478068875` both succeeded, including production smoke test. No CI fixes required. Human Reviewer acceptance remains separate.

### UX2.0PROCESS-01 — Use a Non-Blocking CI Checkpoint Between Autonomous Tasks

Status: `PLANNED`

Objective: update persistent repository guidance so autonomous UI work does not wait after each push, but checks the latest `ux-v2` push-triggered Actions run before beginning the next task's source edits.

Requirements:
- After commit/push, proceed directly to bounded next-task planning; do not wait, sleep-poll, or repeatedly inspect that run.
- At the next task boundary, check the latest push-triggered run before editing source. If it failed, pause feature work and fix the actual failure; if it is queued/running, proceed without waiting and check again at the following task boundary.
- Keep every revision's CI state truthful; never call an unchecked or pending revision green.
- Apply the same rule to future sessions through `AGENTS.md` and `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`.

Focused validation: review for conflicting wait-until-green instructions in the two active guidance files; no product tests are needed. Push this guidance change and use the newly documented checkpoint before the next UI implementation.

Implementation update: `AGENTS.md` and this workflow now share the same non-blocking checkpoint: push without waiting; before the next task's source edits, inspect the latest `ux-v2` push run; fix a completed failure before feature work; proceed immediately if queued/running; and keep unverified revisions CI-pending. Completion wording still requires exact-revision required jobs to succeed. The VIS-12C run/job evidence above was confirmed before this procedural change. The new guidance revision remains CI pending until its own Actions result is observed.

Focused validation: manually reconciled activation, delivery, planning-gate, task-completion, and handoff sections in both guidance files; `rg` review found no remaining autonomous instruction to wait for green before starting the next task. No product tests were changed or run.
