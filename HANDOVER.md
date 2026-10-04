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

Process-guidance revision: `f115f2e479ec7d7ef1c292478ba353c44c6a2836`. Its Actions run has not been checked after push; status is unverified, not green. The next-task checkpoint below is where it will be checked.

### UX2.0PROCESS-01 — CI closure

Status: `COMPLETED BY AGENT — CI GREEN`  
Tested revision: `f115f2e479ec7d7ef1c292478ba353c44c6a2836`  
GitHub Actions run: [37218274066](https://github.com/dmoneyUK/three-kingdoms/actions/runs/37218274066) — build-and-test job `111483170685` and deploy job `111484194397`, including production smoke test, succeeded. No fixes required. Human Reviewer acceptance remains separate.

### UX2.0VIS-12D — Set an Upper-Body Focal Crop for Mobile Opponent Seats

Status: `PLANNED`

Planning gate: all five §19 checks passed after syncing `origin/ux-v2`, reading the current handover and reviewing workflow §§4, 15, 18.4, 19–20 and design §§1.5–1.5.2. The approved crop contract calls for a recognizable face/upper torso and suggests a 15–25% vertical focal position as a starting range. Current `.opponent-hero-portrait .hero-art-image` uses `object-fit: cover; object-position: center top`; existing VIS-10C regressions prove image load, geometry, metadata-clear focal point and hit safety, but do not assert or visually audit the crop focal position. The 480px Top Row / 10-player Side Column screenshots show the current real-art treatment and provide representative contexts.

Objective: align only mobile opponent-seat portrait framing with the approved upper-body focal contract while retaining the existing seat layout and public information.

Requirements:
- Audit and tune the shared mobile opponent-seat crop for Top Row and Side Column using real repository art; begin within the approved 15–25% range and use a per-Hero focal adjustment only if representative screenshots show the shared crop obscures identity-critical features.
- Cover 4-player Top Row at 480/650px and 6-/10-player Side Column at 480/650px; inspect representative real-art screenshots in both topologies.
- Add focused regression evidence for the computed crop/focal position, image bounds/load, unoccluded face focus, public Equipment, target hit safety, seat/Stage/Dock containment, and no page overflow; retain VIS-10C coverage.
- Preserve source assets, aspect ratio, seat topology/dimensions, public/private projection boundaries, and all gameplay/control behavior.

Design authority: `docs/UX_V2_INTERACTION_STAGE_DESIGN.md` §§1.5–1.5.2 and `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md` §§19–20.

Expected scope: opponent portrait CSS, focused `tests/browser/ui19.spec.mjs` and, only if the crop evidence requires it, presentation-only per-Hero focal metadata in the existing Hero art path; append-only handover and roadmap.

Non-goals: do not redesign local Hero or Interaction Stage Focus crops in this slice; those are separate surfaces to audit later. Do not change the art assets, opponent seat geometry, equipment summaries, Inspect, hit targets, semantics, server data or private projections.

Focused validation: existing VIS-10C Top Row/Side Column mounted cases at 480/650px plus new crop checks for representative heroes; screenshot inspection; targeted lint only if test code changes. No local full suite/build/lint. Apply the newly documented latest-run CI checkpoint before the first source edit.

Stop condition: if an approved-range shared or per-Hero presentation crop cannot keep the full face/headwear recognizable while framing the upper body without altering seat geometry or covering public information, record the measured visual evidence and stop for human review.

Scope refinement: CSS geometry shows a 480px Side Column portrait viewport of about 44×108px (and 52×116px at 650px) against a 0.75 source-art ratio. `object-fit: cover` therefore crops horizontally, so changing vertical `object-position` has no vertical crop effect there. Keep VIS-12D to the 4-player Top Row where the square-ish viewport has vertical overflow; do not alter Side Column seat dimensions or claim a visual crop change there. Plan a separate Side Column crop composition task if the approved design still requires it after its art viewport is measured.

Implementation result: mobile 4-player Top Row Hero art now uses `object-fit: cover` with `object-position: 50% 20%`, replacing the previous top-aligned crop; no per-Hero overrides or asset changes were needed. Reviewed the 480px real-art screenshot; faces/headwear and upper-body details remain recognizable, with the existing text/Equipment focus area and seat geometry intact. Side Column, local Hero and Stage Focus crops remain separate audits. Files: `app/sequence-overrides.css`, `tests/browser/ui19.spec.mjs`, this handover, and `docs/AUTONOMOUS_UI_ROADMAP.md`.

Focused validation: VIS-12D 4-player Top Row crop checks at 480/650px — 2/2 passed; retained VIS-10C Top Row/Side Column equipment, containment, and hit-safety matrix — 20/20 passed; `npx eslint tests/browser/ui19.spec.mjs` passed. No full local suite/build/lint. Commit, push, and CI status are pending. Before editing, the latest checkpoint was process-guidance revision `f115f2e`, run `37218274066`, with build-and-test and deploy/smoke successful.

Status update: `IMPLEMENTED — CI PENDING`; focused checks above passed. Side Column crop is explicitly deferred based on measured portrait geometry; no vertical focal change is claimed for that topology.

Delivery checkpoint: pushed revision `84b49ed59ce73e6239aec85bdf9a2bf690bb63e`; latest Actions run [37219392735](https://github.com/dmoneyUK/three-kingdoms/actions/runs/37219392735) was `in_progress` at the next-task boundary. Per workflow §4, no waiting/polling; this revision remains CI pending.

### UX2.0VIS-12E — Set an Upper-Body Focal Point for Interaction Stage Hero Focus

Status: `PLANNED`

Planning gate: all five workflow §19 checks passed after syncing `origin/ux-v2` and reviewing the current design/workflow. No design-document changes were present since the last design baseline. Design §§1.5 crop contract, 0.91.2–0.91.3 and 3C require recognizable upper-body art in the larger semantic Hero Focus while keeping the active interaction unobscured. The Hero Focus image currently inherits `object-fit: cover; object-position: center top` (`app/globals.css`); existing VIS-03B cases prove semantic focus identity and geometry but do not verify artwork focal positioning or image load.

Objective: align only the Interaction Stage Hero Focus art with the approved face/upper-torso focal range, preserving its existing viewport, semantic role, source art, and stage composition.

Requirements:
- Use existing Hero artwork with `object-fit: cover` and a shared upper-body focal point in the design's suggested 15–25% vertical range; do not add per-Hero metadata unless representative evidence proves the shared crop inadequate.
- Add focused browser evidence for the actual computed focal point, loaded intrinsic artwork, and portrait bounds in representative Top Row and Side Column mobile Hero Focus states.
- Retain the VIS-03B identity, Stage/Safe-Zone/Dock containment and no-overflow regressions; inspect a representative screenshot for face/headwear/upper-torso recognition and unobscured active content.
- Change presentation only; preserve projected participant identity, public/private data boundaries, CurrentAction, and all gameplay semantics.

Design authority: `docs/UX_V2_INTERACTION_STAGE_DESIGN.md` §§1.5, 0.91.2–0.91.3 and 3C; workflow §§4, 19–20.

Expected scope: `app/globals.css`, focused `tests/browser/ui19.spec.mjs`, append-only handover and roadmap.

Focused validation: new crop checks plus the affected VIS-03B representative cases and targeted ESLint only. No local full suite/build/lint. Latest-run checkpoint before source edits: revision `84b49ed`, run `37219392735`, observed `in_progress`; proceed without waiting and recheck at the next task boundary.

Stop condition: if a shared approved-range focal point obscures identity-critical art or active event content in either topology, record the measured evidence and stop for human review rather than altering accepted Stage/seat geometry.

Implementation result: set the shared Hero Focus artwork to `object-fit: cover; object-position: center 20%`; no asset, per-Hero metadata, Stage geometry, or semantic changes. Added 4-/10-player Top Row/Side Column checks at 480/650px for projected Hero art loading, intrinsic dimensions, computed focal position, and clipped portrait viewport. Reviewed both 480px screenshots; face/headwear and upper torso remain recognizable, with Stage context unobscured.

Focused validation: VIS-12E crop cases plus retained VIS-03B Hero Focus geometry/semantic cases — 13/13 passed; `npx eslint tests/browser/ui19.spec.mjs` passed. The first test draft incorrectly treated expected image-box overflow as visible overflow; the final assertion verifies the portrait's clipping viewport instead. No full local suite/build/lint. Revision, push, and CI status pending.

Status update: `IMPLEMENTED — CI PENDING`; commit and push checkpoint to follow. No CI-green claim until exact-revision Actions jobs are confirmed.

Delivery checkpoint: pushed revision `8a56add6b3620bf5f566349ecfcfe3fa724915b8`; latest Actions run [37220219500](https://github.com/dmoneyUK/three-kingdoms/actions/runs/37220219500) was `in_progress` at the next-task boundary. Per workflow §4, no waiting/polling; this revision remains CI pending.

### UX2.0VIS-12D — CI closure

Status: `COMPLETED BY AGENT — CI GREEN`  
Tested revision: `84b49ed59ce73e6239aec85bdf9a2bf690bb63e`  
GitHub Actions run: [37219392735](https://github.com/dmoneyUK/three-kingdoms/actions/runs/37219392735) — build-and-test job `111486465159` and deploy job `111487406478`, including production smoke test, succeeded. Focused local crop/retained matrix 22/22 and targeted ESLint passed. No fixes required; human Reviewer acceptance remains separate.

### UX2.0VIS-12F — Validate Single-Layer Hand Interaction at 320–360px

Status: `PLANNED`

Planning gate: all five workflow §19 checks passed after remote sync and review of the current Hand/mobile composition design and autonomous continuation rules. Design §§0.81–0.88 require one horizontal layer, readable fixed-size cards, pan/tap separation, selected-card visibility, and preserved viewport context; the 5/10/15/20/25+ sizes are benchmarks, not implementation thresholds. Existing VIS-09B exercises counts 5/10/15/20/25/30 at 480/650/1440px; VIS-10A reaches 320/360px with 25 cards but checks Stage/Dock containment, not the Hand rail's own fit, pan, selection and inspection behavior.

Objective: extend focused Hand usability evidence to the narrow portrait widths already used by the mobile Stage gate, without changing Dock composition or card semantics.

Requirements:
- Cover 320px and 360px for the existing 5/10/15/20/25/30-card geometry/selection matrix; preserve 68×102px cards, one row, measured overlap/scroll, selected-card lift, action-bar clearance and no document overflow.
- Cover 25-card tap/inspection and horizontal pan at both widths; a pan must not select/submit, and an ordinary tap must continue to identify/select the intended physical card.
- Reuse VIS-09B helpers and fixtures; change production CSS only if measured behavior violates the approved contract.
- Preserve VIS-09C viewport anchoring, physical IDs, CurrentAction authority, action payloads and all gameplay semantics.

Design authority: `docs/UX_V2_INTERACTION_STAGE_DESIGN.md` §§0.81–0.88, 0.91.1 and 0.91.5; workflow §§4, 11–12, 19–20.

Expected scope: focused extensions in `tests/browser/ui19.spec.mjs`; `app/sequence-overrides.css` only if a proven layout defect is found; append-only handover and roadmap.

Focused validation: narrow-width VIS-09B geometry/tap/pan matrix plus retained VIS-09C anchor cases only if the same viewport handling changes. No local full suite/build/lint. Latest-run checkpoint before source edits: revision `8a56add`, run `37220219500`, observed `in_progress`; proceed without waiting and recheck at the next task boundary.

Stop condition: if narrow-width usability cannot preserve readable card size, single-row geometry, tap/pan separation and action-bar clearance without changing an approved invariant, record measured evidence and stop for human review.

Implementation result: extended the existing VIS-09B geometry/selection matrix to 320/360px for 5/10/15/20/25/30 cards and native pan/tap coverage to 25 cards at both widths. The current measured layout satisfied the approved one-row, card-size, clipping, selection-rise, action-clearance and no-page-overflow constraints; no production CSS change was needed. Reviewed 320/360px selected-25-card screenshots.

Focused validation: new VIS-12F narrow-width geometry/selection and native touch cases — 16/16 passed; `npx eslint tests/browser/ui19.spec.mjs` passed. No local full suite/build/lint. Commit, push, and CI status pending.

Status update: `IMPLEMENTED — CI PENDING`; exact-revision CI is required before labeling green, but does not block the next-task planning checkpoint.

Delivery checkpoint: pushed revision `d6d79791c1f9b5e561b0750dd1d8624cc07fba31`; latest Actions run [37220873567](https://github.com/dmoneyUK/three-kingdoms/actions/runs/37220873567) was `in_progress` at the next-task boundary. Per workflow §4, do not wait/poll; keep this revision CI pending.

### UX2.0VIS-12E — CI closure

Status: `COMPLETED BY AGENT — CI GREEN`  
Tested revision: `8a56add6b3620bf5f566349ecfcfe3fa724915b8`  
GitHub Actions run: [37220219500](https://github.com/dmoneyUK/three-kingdoms/actions/runs/37220219500) — build-and-test job `111488867930` and deploy job `111489661223`, including production smoke test, succeeded. No fixes required. Human Reviewer acceptance remains separate.

### UX2.0VIS-12G — Frame the Persistent Local Hero on Face and Upper Torso

Status: `PLANNED`

Planning gate: all five workflow §19 checks passed after remote sync and review of the current crop/mobile composition design and workflow. No design/workflow changes appeared since the prior review. Design §§1.5 and 2.3 explicitly require a persistent local-Hero upper-body focal crop. Current `.local-hero-card` retains a 2:3 viewport and `.local-hero-portrait > .hero-art-image` fills it with `object-fit: cover` but no focal position; repository `hero-cao-cao.jpg` is 853×1280 (also 2:3), so the current cover fit does not crop that art at all. Existing VIS-09A regressions prove Judgement overlay ownership/hit geometry, not face/upper-torso framing.

Objective: make the local Hero's recognizable face and upper torso the portrait focus while preserving the established Local Dock/card geometry and stable identity/status presentation.

Requirements:
- Use only existing repository Hero art, preserve its aspect ratio, and remove unnecessary headroom/lower-body emphasis without cropping identity-critical features.
- Keep the local Hero card dimensions/hit target, name/role/HP, and persistent Judgement overlay behavior intact; do not duplicate the viewer in Stage or alter gameplay.
- Validate representative local Hero artwork at narrow mobile and standard phone widths, including loaded source dimensions, crop/focal presentation, text-overlay clearance, Judgement coexistence and no page overflow; visually inspect screenshots.
- Add per-Hero presentation focal metadata only if real-art evidence shows the shared crop fails for a specific Hero.

Design authority: `docs/UX_V2_INTERACTION_STAGE_DESIGN.md` §§1.5, 2.1, 2.3 and 2.6; workflow §§4, 7.7, 7.12, 19–20.

Expected scope: local portrait CSS in `app/sequence-overrides.css`, focused `tests/browser/ui19.spec.mjs`, append-only handover and roadmap.

Focused validation: local Hero crop/overlay cases plus affected VIS-09A Judgement hit/containment regression and targeted ESLint only. No local full suite/build/lint. Latest-run checkpoint before source edits: revision `d6d7979`, run `37220873567`, observed `in_progress`; proceed without waiting and recheck at the next task boundary.

Stop condition: if a shared crop cannot preserve face/headwear, identity/status readability, Judgement interaction and the accepted portrait viewport simultaneously, record measured screenshot/geometry evidence and stop for human review.

### UX2.0VIS-12G — IMPLEMENTATION RESULT

Status: `IMPLEMENTED — CI PENDING`  
Change: proportionally enlarged existing Local Hero artwork to 115% height and clipped it within the unchanged portrait viewport, preserving source aspect ratio and centring the crop on the approved upper-body focal range. Hero card geometry, labels/HP, viewer identity, Judgement ownership/hit behavior and gameplay remain unchanged.  
Focused validation: VIS-12G crop + one/two-card Judgement screenshots and retained VIS-09A geometry/hit cases — 9/9 passed; `npx eslint tests/browser/ui19.spec.mjs` passed. The 480px Cao Cao/Liu Bei and one/two-Judgement screenshots were inspected; identity-critical upper-body art remained recognizable, overlays remained inspectable, and page width stayed within the viewport. No full suite/build/lint. Commit and push pending.

### UX2.0VIS-12H — Refocus Side-Column Hero Thumbnails on the Upper Body

Status: `PLANNED`

Planning gate: all five workflow §19 checks passed after fetching `origin/ux-v2` and reviewing the current workflow and mobile composition design. Design §§1.5–1.5.2 explicitly require recognizable upper-body crops for Side Column seats. Current `.opponent-hero-portrait .hero-art-image` uses a viewport-sized `object-fit: cover` image at `object-position: center top`; measured 480/650px Side Column portrait viewports are tall and narrow, so cover crops horizontally while leaving the full vertical illustration/headroom visible. The same measured gap was deferred in VIS-12D; VIS-12D/E/G now address Top Row, Stage Focus, and Local Hero independently.

Objective: make existing Side Column opponent Hero art emphasize recognizable face/headwear and upper torso without changing seat geometry, public text/equipment visibility, or target behavior.

Requirements:
- Use existing projected Hero identities and repository artwork; preserve aspect ratio and clip any proportional zoom inside the existing portrait viewport.
- Cover 6- and 10-player Side Column at 480/650px, including the actual loaded Hero assets and their face/headwear/upper-torso crop; add per-Hero focal metadata only if representative art evidence proves the shared crop inadequate.
- Preserve player/Hero identity, HP, concealed Hand count, public Equipment indicators, Inspect/target hit safety, Safe Zone and Dock clearance, and no document-level horizontal overflow.
- Inspect representative mobile screenshots; change only Side Column portrait-art presentation and focused browser regressions.

Design authority: `docs/UX_V2_INTERACTION_STAGE_DESIGN.md` §§1.5–1.5.2; workflow §§19–20.

Expected scope: `app/sequence-overrides.css`, focused `tests/browser/ui19.spec.mjs`, append-only handover and roadmap. Focused validation: new Side Column crop matrix plus retained VIS-10C Side Column equipment/hit/containment cases and targeted ESLint only; no local full suite/build/lint.

Stop condition: if a shared upper-body crop removes identity-critical features or obscures the dedicated portrait/overlay contract across actual Side Column assets, record screenshot and geometry evidence and stop for human review rather than changing seat dimensions or public information.
