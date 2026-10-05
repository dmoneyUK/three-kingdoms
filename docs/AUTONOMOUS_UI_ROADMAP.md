# WTK Autonomous UI / Layout Roadmap and History

Repository: `dmoneyUK/three-kingdoms`  
Branch: `ux-v2`

## Purpose

This file is **history, not instruction**.

It records durable UX2 UI/Layout implementation milestones and known implementation gaps. It does not define the current task, task order, product design, CI cadence, or Agent workflow.

Current sources of authority are:

- product/UI behavior: `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`;
- current execution status: `HANDOVER.md`;
- repository rules: `AGENTS.md`;
- autonomous execution method: `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`.

If a historical statement conflicts with current design/code, treat it as history.

Detailed older handoff evidence through VIS-12J is archived in:
`docs/history/UX_V2_HANDOVER_THROUGH_VIS_12J.md`.

## Completion rule — do not repeat closed work

Anything listed under **Completed implementation inventory** is closed as an
implementation objective. The Coding Agent must not select a task whose purpose
is simply to recreate or redo that completed contract.

A completed area may be reopened only when at least one is true:

- the Reviewer explicitly changes/extends the design contract;
- a concrete regression proves the current implementation violates the
  existing contract;
- a new approved direction explicitly requires a bounded migration of the
  existing implementation.

A stale test, CI repair, documentation update, or later visual polish does not
by itself reopen the underlying feature.

When planning new work, compare the current approved design direction against
this inventory and inspect current code/tests before choosing a task.

## Completed implementation inventory

### Presentation / authority foundation — CLOSED

- Stable/fail-closed PresentationSnapshot / PresentationClientView projection.
- Causal Interaction / Frame / Checkpoint identity and presentation continuity.
- CurrentAction-owned local legality; React does not own gameplay legality.
- Viewer-private controls remain separate from public interaction facts.
- actionRevision/state reconciliation and Quick Test viewer reprojection
  foundations are implemented.

### Seat topology / battlefield geometry — CLOSED

- VIS-01 / VIS-04: 2–4 total players use Top Row topology and compact top
  anchoring.
- VIS-05: 5–10 total players use deterministic Side Column topology with
  containment/hit safety, protected central safe zone, and participant
  hierarchy.
- Opponent physical seat DOM remains fixed while semantic participants are
  projected into the Interaction Stage.
- VIS-10A / VIS-11A: short/narrow portrait Interaction Stage containment.
- VIS-12B / VIS-12I: four-player mobile Hero-first seat sizing and internal
  composition.
- VIS-12D / VIS-12H: mobile opponent Hero upper-body crop/focal treatment.

### Local Player Dock / Hand / controls — CLOSED STRUCTURE

The established Dock structure is implemented and must not be rebuilt:

- viewer Hero remains in the Local Player Dock;
- Skills and Equipment occupy the upper operational band;
- Hand is one horizontal layer with overlap, pan, and stable viewport anchoring;
- persistent Judgement is attached to the local Hero;
- Current Guidance occupies the full-width Dock top edge; Actions remain
  protected in the bottom row;
- semantic Primary / contextual Cancel / authoritative Skip-Decline / End are
  separate;
- mobile Primary action placement and safety gutter are implemented;
- VIS-12A local skill readability and VIS-12F narrow-width Hand validation are
  implemented;
- VIS-12G local Hero upper-body crop is implemented.

The current design may still approve **bounded visual hierarchy polish** (for
example making the local Hero carry more visual weight). That is a delta, not a
Dock rebuild.

### Interaction Stage presentation work already implemented — CLOSED BASELINE

- VIS-03 family: semantic Interaction Stage orientation, Hero Focus foundation,
  open-shell treatment, viewer exclusion, and Medium Source.
- VIS-06: full-width Guidance, semantic action slots, mapped Hero Skills.
- VIS-07: neutral Group/AOE scope density without invented progress/order.
- VIS-08: open Side Column Stage shell, fail-closed Stage focus, Dying metadata
  deduplication.
- VIS-09A: persistent local Judgement ownership moved to the local Hero.
- VIS-10B / VIS-11B: action-zone separation and mobile thumb-zone placement.
- VIS-10C: opponent Hero readability and public Equipment at a glance.
- VIS-12C: ordinary mobile Deck/Discard de-emphasis.
- VIS-12E: Interaction Stage Hero Focus upper-body focal treatment.
- VIS-12J: centered mobile single-target Stage composition.
- VIS-12K / VIS-12L: representative four-player ordinary-turn coverage and
  corrected Guidance/action vertical composition.
- VIS-12M: duplicate non-Dying Stage source metadata removal.
- VIS-12N: four-player 480×900 / 390×640 interaction screenshot and geometry
  matrix.
- VIS-12O: Deck/Discard separation from active four-player Stage content.
- VIS-12P: Group current-participant metadata deduplication while preserving
  distinct authoritative scope/decision facts.

These completed presentation slices remain valid foundations for the new §12
Interaction Stage completion direction. New ACTIVE / SELECTABLE DETAIL work
must extend them and the completed PREVIEW / INSPECT implementations rather
than restart them.

### UX2.2-HF-PREVIEW-01 — Local target Preview in Hero Focus

- Implemented in `5b1a317`: selected external targets use the shared Hero
  Focus structure as a local-only PREVIEW; multi-target focus follows the most
  recently selected external target, while self-target stays Dock-only.
- PREVIEW creates no REST interaction identity or Reaction Chain node and
  hands the same Hero Focus DOM node to a matching authoritative Attack
  Response. Stale/current-action changes reconcile the local submission.
- Focused browser coverage passed 10/10; real Draw Phase Assault browser
  coverage passed 4/4; targeted ESLint and `git diff --check` passed. No full
  local suite/build/lint was run.

### UX2.2-HF-INSPECT-01 — Public opponent Inspect in shared Hero Focus

- Replaced the blocking opponent-inspection overlay with a non-modal INSPECT
  mode inside the shared Interaction Stage / Hero Focus.
- Inspect exposes public Hero/HP/skills, Equipment/Judgement explanations, and
  concealed Hand count/generic backs only. Its info affordance stays independent
  from target selection; closing restores the existing Preview or authoritative
  Hero Focus without a gameplay action or Stage-identity change.
- Focused browser coverage passed 6/6 across 390/480/1440px Top Row, Side
  Column, target-selection and authoritative-Stage cases; 5 focused existing
  Inspect/target-selection regressions passed; Preview/Borrowed Sword regressions
  passed 9/9. Targeted ESLint and `git diff --check` passed. No full local suite,
  build, or lint was run; CI is pending after push.

### UX2.2-HF-ACTIVE-01 — Proven Current Effect in ACTIVE composition

- Added a central Current Effect panel for a proven, single-target Attack
  Response using only the public `PresentationClientView.stage.effect` and
  active-target identity. The source/effect/target path is linked only when the
  projected Hero Focus is that active target.
- Local REST/Preview does not invent an effect; Inspect over an active Stage
  keeps the effect visible but removes participant connectors to the inspected
  Hero. Empty/missing effect remains identity-free. The persistent focus wrapper
  preserves Preview-to-ACTIVE DOM continuity.
- Focused browser coverage passed 5/5 for 390px Top Row, 480px Side Column,
  1440px Top Row, Inspect preservation, and fail-closed absence. The combined
  Current Effect/Preview/Borrowed Sword/Inspect suite passed 20/20; six selected
  existing UI-19 active-stage/Inspect regressions passed. Targeted ESLint and
  `git diff --check` passed; no full local suite/build/lint was run.

### UX2.2-HF-ACTIVE-NEGATION-01 — Proven Current Effect in open NEGATION

- Extended the Current Effect composition to a proven single-target NEGATION
  using only public `stage.effect`, the projected active target, and matching
  Hero Focus identity. Missing or ambiguous authority stays unlinked/fail-closed.
- Open-window Stage, Reaction Chain, and seat treatment use neutral waiting
  language and do not reveal the private responder/scan actor. The viewer Hero
  and legal controls remain in the Local Player Dock.
- Focused browser regressions passed 10/10, including Top Row/Side Column,
  missing/ambiguous proof, 480×640 containment, and semantic labels;
  PresentationClient tests passed 40/40. Targeted ESLint reported no errors
  (the JSX fixture is ignored by repository lint configuration), and
  `git diff --check` passed. No full local suite/build/lint was run.

### UX2.2-CI-REPAIR-01 — Short Top Row Stage pressure and current test contracts

- Under short Safe Zone pressure, a proven Current Effect and Hero Focus use a
  compact connected row. The Stage omits focus/source and local decision
  summaries only when those identities are already present in the authoritative
  participant composition / local viewer state; unique public context remains.
- Open Negation window guidance is part of the active Reaction Chain node, not a
  second metadata panel. The chain remains vertical and neutral about private
  responders. Dying geometry coverage preserves the viewer-Hero-in-Dock rule.
- Replaced the stale `OpponentInspectionOverlay` implementation assertion with
  shared-Stage browser behavior coverage, including the seat Hero-info affordance.
  Focused validation passed: short-portrait UI-19 20/20, Current Effect/Inspect
  browser 14/14 plus seat Hero-info 1/1, and `room-safety-render` 19/19;
  targeted ESLint and `git diff --check` passed. CI is pending after push; the
  prior Negation delivery run was cancelled during browser validation.

### UX2.2-DOCK-GUIDANCE-TOP-01 — Guidance adjacent to the Interaction Stage

- Moved the existing private Guidance strip to the first Dock grid row and DOM
  order, directly below the Stage and above Hero/Skills/Equipment/Hand. The
  single-layer Hand and bottom Action Row retain their existing semantics and
  placement; guidance remains viewer-private.
- Updated Dock geometry/action-flow regressions and the raised-card check.
  Focused UI-19 browser selection passed 12/12 across 390/480/650/1440px Dock
  geometry, 360/480/1440px action layouts, and long-guidance/selected-card
  containment. Targeted ESLint and `git diff --check` passed. No full local
  suite/build/lint was run; push-triggered CI remains to be checked.

### UX2.2-CI-RECOVERY-01 — Dying fixture semantics and Stage assertion alignment

- The browser Dying fixture now represents the dying/current participant (`p2`)
  separately from the rescue decision actor/resolver (`p3`), matching the
  public presentation contract and the existing Dying target fixture. This
  keeps the local viewer's Hero in the Dock while allowing the external Dying
  participant to remain the Stage Hero Focus.
- Updated only the browser assertions implicated by CI: redundant role metadata
  remains omitted when Hero Focus already communicates the identity, and an
  open Negation response uses its player-facing `NEGATION RESPONSE` title.
  No production UI, gameplay, or protocol behavior changed.
- The legacy VIS-02/03 geometry checks now treat the Meta region as conditional
  on distinct facts instead of a mandatory empty column; dedicated semantic
  cases still cover source/scope metadata when it is needed. The follow-up
  Stage-geometry subset passed 21/21.
- Focused CI-failure browser cases passed 41/41 and the short-portrait Top Row
  matrix passed 20/20; targeted ESLint on `ui19.spec.mjs` and
  `git diff --check` passed. The JSX fixture is excluded by the repository ESLint
  configuration. No full local test/build/lint suite was run; CI status for the
  repair is recorded in `HANDOVER.md`.
- The subsequent CI run passed its browser job but failed one Node assertion in
  the Quick Test / Local Player Dock regression: its source matcher required an
  obsolete compact-grid row and brittle selector adjacency. Updated the test to
  inspect the actual 480px Dock rule (`auto` identity row plus the measured
  top/hand/action rows); the exact Node test passed locally 1/1. No product CSS
  changed. Corrective commit `18fff19` completed Actions run `37307938922`
  successfully, closing this CI recovery without a production UI/gameplay
  change.

### UX2.3-FAST-RESPONSE-TIMER-01 — Glanceable response countdown

- Refined only the existing authorized response countdown with an hourglass,
  neutral `Response Time` label, accessible numeric timer name, and calm/urgent/
  critical contrast states driven by remaining time. The authoritative deadline,
  visibility threshold, action eligibility, and generic Harvest/rescue timers
  remain unchanged.
- A dedicated browser regression controls time through 25s, 9s, and 4s, rejects
  responder names in timer copy, and checks top-right containment above the
  player board at 390, 480, and 1440 CSS pixels. It passed 1/1; targeted ESLint
  and `git diff --check` passed. Pushed as `f5217d2`; Actions run `37310264410`
  completed successfully. No full local suite/build/lint was run.

### UX2.3-FAST-RESPONSE-TIMER-02 — Shared response-window timer

- Extended the neutral timer to an observer view only when the shared viewer
  projection explicitly reports a response phase, `CurrentAction.kind=response`,
  and a positive deadline. The timer key is window/deadline-based; observer
  actor identity, legal actions, private options and controls remain absent.
  Existing eligible-viewer fallback behavior for response-ready legacy/trigger
  windows is retained. No API, gameplay, or protocol changes.
- The focused browser spec covers responder/observer parity against one shared
  deadline, privacy/action gating, fail-closed behavior without a deadline,
  urgency transitions, and 390px/480px/1440px containment. It passed 3/3;
  targeted ESLint and `git diff --check` passed. No full local suite/build/lint
  was run. Pushed as `eb54f01`; Actions run `37312290991` was queued at the
  one-time pre-task checkpoint. It remains CI pending; no conclusion is inferred.

### UX2.3-HF-DUEL-CURRENT-EFFECT-01 — Proven Duel Current Effect

- Extended the ACTIVE Current Effect consumer to `DUEL_EXCHANGE` only when
  the public effect is `duel` and the explicit current participant belongs to
  the projected active-target set. The UI presents `Duel` and uses existing
  Hero Focus/participant projection for any connector; missing effect or
  participant proof fails closed. No server/API, gameplay, or protocol changes.
- Active Current Effect browser coverage passed 12/12 across Attack, Negation,
  and Duel, including Duel geometry at 390px Top Row, 480px Side Column, and
  1440px Top Row plus missing-proof cases. The existing UI-19 Duel 650px
  breakpoint case passed 1/1; `ui19.spec.mjs` was not modified. Targeted ESLint
  and `git diff --check` passed. No full local suite/build/lint was run.
  Push/CI checkpoint pending.

### Interaction-correctness additions — CLOSED IMPLEMENTATION

- **13A / Reviewer addition A — authoritative self-target symmetry:** a
  server-projected self target is selectable/submittable from the Local Player
  Dock; the local Hero remains Dock-only.
- **13B / Reviewer addition B — failed response provider is not a Pass:** a
  failed Eight Trigrams attempt reopens the same Dodge requirement with the
  failed provider disabled and does not consume the requirement.
- **13C / Reviewer addition C — Borrowed Sword complete-path legality:** one
  server-owned legality result covers primary-holder and downstream forced
  Attack legality, including the legal two-player source-target case and
  deferred-path revalidation.

Later test/CI corrections for these implementations do not reopen the feature.
Only a proven regression or new Reviewer-approved design requirement does.

## Known deferred semantic gaps

These are **not completed** and must remain fail-closed until authoritative
projection exists:

- Group/AOE per-participant resolved / current / pending / outcome / semantic
  order.
- Durable independently proven multi-node Reaction Chain history beyond the
  currently authoritative bounded presentation.
- Settlement/transition history that would require new authoritative public
  projection.

Never infer these from remaining IDs, target-array order, timeline order, HP
changes, turn owner, seat position, or animation state.

## External/manual validation not equivalent to feature implementation

The following remain separate evidence/release concerns and are not reasons to
redo completed UX implementation:

- real-device/touch certification;
- full WCAG audit;
- live multiplayer timing validation;
- production deployment/health verification;
- subjective final pixel/art-direction review.

## Historical evidence policy

Do not add active task instructions to this file.

When a task closes, add only a short durable milestone/result when it helps
future planning. Keep temporary CI failures, exact resume instructions, and
current task state in HANDOVER while active; do not leave stale "CI pending in
HANDOVER" wording here after the handoff has moved on.
