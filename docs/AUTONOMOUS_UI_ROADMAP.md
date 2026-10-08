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
  was run. Pushed as `eb54f01`; Actions run `37312290991` completed
  successfully (verified at the 2026-10-05 planning boundary).

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
  Pushed as `132f4cd`; exact Actions run `37313614735` was `in_progress` at
  the 2026-10-05 planning checkpoint, so CI has no conclusion recorded yet.

### UX2.3-FAST-RESPONSE-NEGATION-GUIDANCE-01 — Private Negation response guidance

- The Local Player Dock now uses `YOUR RESPONSE` / `Play Negation or Skip.`
  only when the viewer-owned `CurrentAction` is a Negation response with
  authoritative `respond` and `decline_response` actions plus a Negation-
  satisfying provider. The zero-card selection summary is omitted for this
  concise guidance; selected-card gating and Confirm/Skip controls are unchanged.
- The focused fixture separates private CurrentAction ownership from public
  Stage decision/responder identity. Browser coverage passed 7/7 across
  390px/480px/1440px plus missing-response, missing-decline, missing-provider,
  and observer cases. The focused response-timer spec passed 3/3; targeted ESLint
  and `git diff --check` passed. No full local suite/build/lint was run. Pushed
  as `7533bec`; exact Actions run `37315901817` completed successfully for both
  `build-and-test` and `deploy`, including the production smoke-test step. The
  earlier repeated Stage-geometry and compact-Dock assertion failures are
  closed by the CI test corrections recorded above; current CI is green.

### UX2.3-FAST-RESPONSE-SEMANTIC-LABEL-01 — Local semantic response heading

- Generalized the Local Player Dock's `YOUR RESPONSE` heading to viewer-owned
  semantic `CurrentAction.kind=response` decisions only when `respond` is
  authoritative and a response option satisfies the current requirement.
  Negation's combined `Play Negation or Skip.` instruction retains its stricter
  requirement for authoritative `decline_response`; no control, protocol, or
  public Stage behavior changed.
- Added focused local Duel/Dodge coverage at 390px, 480px, and 1440px, including
  provider mismatch fail-closed behavior, observer privacy, selection-gated
  Confirm, and preserved projected stage copy. The local Duel fixture explicitly
  aligns source, active target, and responder identities. The Negation guidance
  regression now distinguishes its general response heading from its stricter
  combined instruction when Skip authority is absent.
- Both focused browser specs passed 15/15; targeted ESLint and `git diff --check`
  passed. No full local suite/build/lint was run. Pushed as `4995e23`; exact
  Actions run `37319031950` was `in_progress` at the 2026-10-05 planning
  checkpoint, so no CI conclusion is recorded.

### UX2.3-FAST-RESPONSE-STAGE-CHROME-01 — Proven Current Effect vocabulary

- In a connected, visible Current Effect composition, removed the visible
  `INTERACTION STAGE` / `HERO FOCUS` labels and named the focused participant
  `Target`; retained the stage's accessible section name and event title.
- Suppressed decision-actor text only when its public actor ID matches the
  proven focused target, for both Stage context and the active Reaction Chain.
  Missing-effect / missing-Duel-participant fallbacks and existing Negation
  treatment remain unchanged; no eligibility or gameplay logic changed.
- The Current Effect and semantic-response-heading browser specs passed 20/20;
  targeted ESLint and `git diff --check` passed. No full local suite/build/lint
  was run. Pushed as `3a16740`; exact run `37321563100` later completed with
  failure in the browser-test step (run 701); the stale UI-19 assertions are
  documented in the CI recovery entry below.

### UX2.3-FAST-RESPONSE-EVENT-SUMMARY-01 — Proven Current Effect summary

- Added a concise natural-language line below the event title only when a
  connected Current Effect, public source, and visible active participant are
  proven. Single-target effects use source/effect/target wording; Duel uses a
  pair sentence only when its two known active participants include the source.
- Missing source/effect/participant proof, unlinked Negation, local Inspect, and
  local Preview remain summary-free. The public open-response copy does not name
  the private responder/provider.
- Focused browser specs passed 21/21 after correcting one new 390px Negation
  geometry assertion to use the established narrow-flow branch; targeted ESLint
  and `git diff --check` passed. No full local suite/build/lint was run.
  Pushed as `8de8445`; exact Actions run `37323057854` later completed with
  failure in the browser-test step (run 702); the stale UI-19 assertions are
  documented in the CI recovery entry below.

### UX2.3-FAST-RESPONSE-CHAIN-GEOMETRY-01 — Portrait Reaction Chain proof

- Added measured browser assertions for the proven open Negation chain at
  390px Top Row and 480px Side Column: the chain follows the Source/Effect/
  Target composition and the Root node precedes the Active node vertically.
  Existing Stage/Dock separation and neutral waiting-state assertions remain.
- The three focused Negation Current Effect viewport cases passed 3/3;
  targeted ESLint and `git diff --check` passed. Existing responsive CSS already
  satisfied the measured contract, so no production stylesheet change was
  needed. No full local suite/build/lint was run. Pushed as `b4c0937`; exact
  push-triggered Actions run `37323822915` was `in_progress` at the 2026-10-05
  checkpoint; no conclusion is inferred.

### CI-RECOVERY-UX23-UI19-ASSERTIONS-01 — Fast-response semantic assertion alignment

- Runs `37321563100` and `37323057854` failed in `npm run test:browser`. A
  CI-mode local reproduction completed with 447 passed and 5 failed, all in
  `tests/browser/ui19.spec.mjs`: three 08A viewport cases expected the removed
  architectural `INTERACTION STAGE` label, 12M expected `CURRENT TARGET` rather
  than the player-facing `Target`, and the UI-19 semantic Stage test expected
  the same obsolete architecture label.
- Updated those assertions to preserve and verify the accessible Stage name,
  player-facing `Attack Response` title and `Target` role, including the proven
  event summary. No production, gameplay, server, or protocol behavior changed.
- The five affected browser cases passed 5/5; targeted ESLint and
  `git diff --check` passed. In run `37325865676` for `ae3f6b8`, the browser
  step passed, but the later `npm test` step failed on stale response-role
  assertions; no overall CI success is inferred.

### UX2.3-FAST-RESPONSE-10P-NEGATION-01 — Ten-player Side Column proof

- Extended the proven Negation Current Effect matrix with a 10-player,
  480x900 Side Column case. Measured Stage, Source, Effect, Target, and Reaction
  Chain bounds remain within the central safe zone; the Stage does not overlap
  the Local Player Dock. Existing assertions retain source/effect/target order,
  Root-before-Active order, neutral open-window copy, and responder privacy.
- The Negation Current Effect matrix passed 4/4; targeted ESLint and
  `git diff --check` passed. Existing responsive CSS met the measured contract,
  so no production change was required. Pushed as `34362d1`; the one-time
  Actions run `37327380014` completed with failure at `Run npm test`. Its
  lint, build, and browser steps passed; the failure repeated the stale
  response-role test assertions recorded below.

### CI recovery — stale fast-response role assertions

- The three latest failed `ux-v2` runs were `37323822915` (`b4c0937`, browser
  step), `37325865676` (`ae3f6b8`, `npm test` step), and `37327380014`
  (`34362d1`, `npm test` step). The first browser failure was the old UI-19
  vocabulary contract fixed in `ae3f6b8`; the later browser step passed, while
  `npm test` still exposed stale `CURRENT PARTICIPANT` / `CURRENT TARGET`
  assertions in fast-response rendering tests.
- Updated those fast-response test expectations to the current player-facing
  `Target` contract, without changing production or gameplay behavior. The
  local CI-equivalent `CI=1 npm test` completed successfully: build passed,
  fast tests 203/203, and API tests 248/248. Targeted ESLint and
  `git diff --check` passed. The repair was pushed as `b666335`; exact Actions
  run `37330805764` completed successfully on 2026-10-05, including the
  build-and-test and deploy/smoke-test jobs. This closes the CI-recovery entry;
  the successful result applies to that exact pushed revision.

### UX2.3-FAST-RESPONSE-TIMER-10P-01 — 10-player timer clearance

- Reserved a conditional top lane for the response timer in 10-player Side
  Column mode so fixed opponent seats and Interaction Stage content stay below
  the timer. The focused 480x900 observer regression checks timer bounds,
  seat/Stage non-overlap, Dock separation, neutral public copy, and absence of
  viewer-private options/actions.
- The complete response-timer browser spec passed 4/4; targeted ESLint and
  `git diff --check` passed. No gameplay, timer semantics, or action authority
  changed. Pushed as `b138959`; exact Actions run `37332560641` completed
  successfully on 2026-10-05, including build/test and deploy/smoke-test jobs.

### UX2.3-FAST-RESPONSE-TIMER-EXIT-CLEARANCE-01 — Exit/timer separation

- Moved only the visible Exit control when the response timer is present and
  constrained the expanded mobile Game Messages panel only where needed. A
  real-browser regression covers 390/480/1440px, collapsed/expanded messages,
  at least 8px timer/Exit clearance, and a normal Exit click. Gameplay, timer
  semantics, and action authority are unchanged.
- The focused response-timer spec passed 5/5; targeted ESLint and
  `git diff --check` passed. Pushed as `3294a4b`; exact Actions run
  `37335513984` completed successfully on 2026-10-05.

### UX2.3-LOCAL-HERO-MOBILE-HIERARCHY-01 — Narrow mobile Hero visibility

- Increased the narrow-mobile Local Hero identity column to 96px and portrait
  cap to 88px, preserving the approved Dock composition, full-size Hand cards,
  and horizontal pan. The focused real-browser regression passed 6/6 across
  390/414/480px with 5/25-card Hands; targeted ESLint and `git diff --check`
  passed.
- Feature SHA `a551bd3` exposed a stale 70px source assertion in CI run
  `37339005768`. A repair-only test-contract update was pushed as `4ff9fbd`;
  its exact Actions run `37340057118` passed on 2026-10-05, including
  build/test and deploy/smoke-test jobs. `tests/browser/ui19.spec.mjs` was
  preserved unchanged.

### UX2.3-FAST-RESPONSE-TIMER-10P-390-01 — 390px 10-player timer coverage

- Added a focused 390×844 observer regression for top-lane containment,
  clearance from all nine fixed seats and visible Stage content, Dock
  separation, neutral timer copy, and the absence of viewer-private options or
  actions. The response-timer spec passed 6/6 serially; targeted ESLint and
  `git diff --check` passed. No production CSS or timer semantics changed.
- A four-worker run had one existing fake-clock urgency assertion fail under
  parallel timing; its isolated reproduction passed, then the full focused
  spec passed serially. Exact pushed SHA `bf20878` passed Actions run
  `37342708163` on 2026-10-05, including build-and-test and deploy/smoke-test.

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

### UX2.3-LOCAL-SKILL-PEER-CONSISTENCY-01 — Comparable local Hero-skill controls

- Peer skills now share the available band width instead of shrinking their
  visual weight according to label length. The focused Zhou Yu regression and
  existing UI19 Zhen Ji skill-readability matrix passed 10/10; targeted ESLint
  and `git diff --check` passed. Exact pushed SHA `89efc45` passed Actions run
  `37344999603`, including build-and-test and deploy/smoke-test jobs. The
  user-owned `tests/browser/ui19.spec.mjs` remained unchanged.

### UX2.3-SIDE-COLUMN-THUMBNAIL-RECOGNITION-01 — Mobile Hero-seat recognition

- Side Column seat width now follows one responsive CSS contract shared with
  the Interaction Safe Zone. Focused browser coverage passed 8/8 for 6/10-player
  layouts at 320/390/480/650px; existing UI19 Equipment/crop checks passed
  8/8; targeted ESLint and `git diff --check` passed. At 480/650px, the seat is
  74px wide; the 10-player/650px row budget yields 100px seat height, while the
  other checked cases remain at least 108px. `tests/browser/ui19.spec.mjs` was
  preserved unchanged.
- Feature SHA `40f26b0` initially failed CI only because a UI-11 test still
  asserted the former literal seat width; lint, build, and browser steps passed
  and deploy was skipped. CI-repair-only SHA `0283aa7` updated that assertion
  to verify the shared width/safe-zone contract. Its exact Actions run
  `37349152242` passed on 2026-10-05, including build-and-test and deploy. The
  repair did not change production behavior.

### UX2.4-SELECTABLE-DETAIL-AUTHORITY-AUDIT-01 — Existing target-card flows

- The existing `pendingTargetCard` / `CurrentAction` continuation and local
  action-revision reconciliation support the retained picker; server settlement
  revalidates the live target and zone. Public Equipment/Judgement identities
  come from the player projection, while hidden-Hand position choices are
  constructed from `handCount` because no selectable-object / opaque-position
  projection exists. Keep this picker as the safe fallback until authority can
  support the §12.4 same-Hero-Focus migration.
- The original audit found that generic Retaliation omitted the hidden-Hand
  count and used generic eligible-card copy. That presentation gap was closed
  by `UX2.4-CONCEALED-HAND-ZONE-SELECTION-CLARITY-01` below; the same-Hero-Focus
  migration remains open.

### UX2.4-CONCEALED-HAND-ZONE-SELECTION-CLARITY-01 — Random Hand zone semantics

- The shared `target_cards` picker presents the server-projected `hand` key as
  one random-Hand zone, displays the public Hand count (with bounded backs and
  overflow), and distinguishes individually selectable public Equipment and
  Judgement cards. The existing action payload and server-side random card
  choice remain unchanged; no concealed identity is projected.
- Focused browser coverage passed 20/20 across the picker and existing UI19
  cases (UI19 read-only); the two CI-exposed stale Node assertions were updated
  to semantic zone/name contracts. Exact repair head `fa19635` passed Actions
  run `37375430748` for both `build-and-test` and `deploy`.

### UX2.4-GENERIC-HERO-SKILL-ENTRY-01 — Ma Chao Cavalry Dock entry

- Added Ma Chao Cavalry to the shared Hero-skill capability map so its
  server-projected `CurrentAction.triggerOptions` enables the existing Skills
  band and removes the duplicate Action Row fallback. Horse Riding remains
  passive; there is no hero-specific render path or server/gameplay change.
- Focused browser coverage passed 3/3 at 390px/1440px and with no projected
  option; targeted ESLint had 0 errors (fixture JSX ignored by config) and
  `git diff --check` passed. Exact pushed SHA `1dab785` passed Actions run
  `37358008000`, including `build-and-test` and `deploy`.

### UX2.3-ACTIVE-DYING-CURRENT-EFFECT-01 — Dying public rescue handoff

- Added the proven Source → Effect → Dying Player composition while preserving
  the public rescue handoff and Dying identity. The first feature SHA
  `87e067f` failed its browser job: connected-effect chrome relabelled Dying as
  Target and the composition overflowed short safe zones. CI-repair-only SHA
  `ac54b2e` restored `DYING PLAYER` and compacted the proven row; the user-owned
  `tests/browser/ui19.spec.mjs` stayed unchanged.
- Focused Current Effect browser coverage passed 24/24, read-only Dying cases
  from UI19 passed 39/39, and targeted ESLint plus `git diff --check` passed.
  Exact repair Actions run `37364054848` completed successfully for both
  `build-and-test` and `deploy`.

### UX2.3-ACTIVE-JUDGEMENT-CURRENT-EFFECT-01 — Proven Judgement focus

- The Stage consumer now renders Current Effect for a `JUDGEMENT` scene only
  when public source/effect data and exactly one active target agree with the
  current participant. Distinct source/subject roles use the established
  Source → Effect → Target composition; a same-participant Judgement uses
  neutral copy, avoids duplicate identity panels, and keeps the viewer Hero in
  the Dock. Missing or mismatched proof remains unlinked/fail-closed.
- Focused `active-current-effect.spec.mjs` browser coverage passed 29/29,
  including 390/480/1440px, source-distinct and same-participant views, local
  Dock ownership, and missing/mismatched authority. Targeted ESLint on the
  production component and spec had 0 errors (`fixture.jsx` has no matching
  ESLint config); `git diff --check` passed.
- Exact Actions run `37384283798` for `e80906d` was observed in progress at the
  next planning boundary; no CI completion is claimed here.

### UX2.3-ACTIVE-BORROWED-SWORD-CURRENT-EFFECT-01 — Three-role forced Attack context

- The proven child scene now carries immutable root-frame source/effect/targets
  from the public causal envelope through the typed snapshot and client
  adapter. The Stage names the Borrowed Sword source, weapon holder and forced
  Attack target only when the parent/root link, root target, active target and
  current participant agree; otherwise it keeps neutral Attack-only copy.
- The current `borrowed_sword_attack` effect is labelled as Attack. The
  two-player case keeps the local source/target in the Dock without central
  duplication, and a decision actor already represented by the semantic focus
  is not repeated as separate metadata. No legality, gameplay, private-control
  or protocol behavior changes.
- Focused browser coverage passed 35/35, including missing/inconsistent root
  authority, 2-player, 390/480/1440px and Top Row/Side Column layouts.
  Engine-backed Presentation V2 API coverage passed 26/26; projector/client
  Node coverage passed 75/75; targeted ESLint had 0 errors; `npm run build`
  and `git diff --check` passed. `tests/browser/ui19.spec.mjs` is unchanged.

### UX2.3-ACTIVE-GROUP-CURRENT-EFFECT-01 — Proven Group participant focus

- Group/AOE Current Effect now connects the known public source/effect and
  current participant only when that participant belongs to the typed active
  target scope. Original scope stays neutral; no per-participant progress,
  order, or Stage controls are inferred or added.
- Focused Current Effect browser coverage passed 40/40; the two stale UI-19
  Group contract repairs passed 2/2. Targeted ESLint and `git diff --check`
  passed. No full local suite/build/lint was run.

### UX2.3-ACTIVE-TARGET-SHIFT-CURRENT-EFFECT-01 — Redirected Attack focus

- The Current Effect follows a proven redirected Attack target while preserving
  the original target as neutral scope. An inconsistent typed current
  participant stays unlinked; no redirect actor or Reaction Chain event is
  inferred. Compact Top Row, Side Column, and wide layouts keep the viewer Hero
  in the Dock and the Stage clear of the Dock.
- Focused `active-current-effect.spec.mjs` coverage passed 44/44, including
  valid 390/480/1440px layouts and missing/mismatched target proof. Targeted
  ESLint and `git diff --check` passed. No full local suite/build/lint was run;
  push-triggered CI status is tracked in HANDOVER.

### UX2.4-SELECTABLE-DETAIL-OPAQUE-HAND-POSITIONS-01 — Frost Sword concealed positions

- Shared Hero Focus SELECTABLE DETAIL now accepts only server-projected,
  unique, in-range `hand:<index>` keys for a proven external target. Hidden
  positions use anonymous glyphs, public Equipment remains identified, the
  existing `cardKeys` submission and action-revision reset remain unchanged,
  and unsupported proof retains the picker fallback.
- Browser coverage passed 19/19 for the target-card selector, 20/20 for the
  short-portrait Stage matrix, and 526/526 for the full local browser job.
  Targeted ESLint and `git diff --check` passed. The previous remote-head
  Actions run `37393574566` failed in its browser job; after the combined
  repair/feature push at `0e2cc79`, Actions run `37398701721` was observed
  in progress. No remote CI pass is claimed.
- The CI repair corrects the 650x700 Group Stage Safe Zone overflow by
  compacting its read-only source card, and updates UI-19 expectations to the
  current fail-closed semantic and player-facing-label contracts. `ui19.spec.mjs`
  had no pre-existing local edits at task start; its current changes are part
  of this scoped repair.

### UX2.4-PENDING-TARGET-CARD-ELIGIBILITY-PROJECTION-01 — Actor-scoped card choices

- `CurrentAction.targetCardSelection` now projects anonymous in-range Hand
  position keys and public Equipment/Judgement IDs only to the live Pending
  actor. The existing `choose_target_card` payload and live server validation
  remain unchanged; empty and defeated targets expose no selectable-object
  projection.
- Build passed; the focused `tests/api/stratagems.test.mjs` file passed 22/22,
  including actor/observer privacy, both public zones, hidden identity
  non-disclosure, existing hand-index submission, and empty/stale-target
  rejection. Targeted ESLint and `git diff --check` passed.
- The previous remote-head Actions run `37398791627` on `487fbd9` completed
  with `npm test` failure. Its stale player-facing role/duplicate-decision
  assertions were repaired in this combined feature change. Local `npm test`
  passed (build, fast 204/204, API 249/249); the Judgement responsive browser
  cases passed 3/3 and targeted ESLint plus `git diff --check` passed. No
  Actions result for this push is claimed.

### UX2.4-SELECTABLE-DETAIL-PENDING-TARGET-CARD-HERO-FOCUS-01 — Steal/Dismantle Pending

- Steal/Dismantle Pending now reuses the external Hero Focus SELECTABLE DETAIL
  when the actor-scoped `CurrentAction.targetCardSelection` and semantic target
  focus agree. Concealed Hand choices remain anonymous and public Equipment /
  Judgement keep their public identities; Local Dock Confirm/Cancel and the
  existing `choose_target_card` payload remain unchanged. Missing or invalid
  authority retains the picker fallback, and action revision / availability
  changes reconcile local selection.
- The `CurrentAction` safety normalizer now retains only well-formed,
  actor-owned target-card eligibility proof. Production Stage headers and
  focus roles use player-facing copy rather than internal component labels;
  the two stale fail-closed browser assertions were updated without weakening
  missing-effect, summary, participant, or connector checks.
- Local build, focused unit 6/6, targeted browser 11/11, full browser 535/535,
  targeted ESLint, and `git diff --check` passed. The previous remote-head
  Actions run `37400533926` on `7236cf9d` failed in `npm run test:browser`;
  its browser failures were reproduced locally and repaired in this combined
  feature change. No result for the new push is claimed.

### UX2.7-PLAYER-FACING-PREVIEW-INSPECT-LABELS-01 — Local focus copy

- Removed the internal `HERO FOCUS` heading from local Preview and opponent
  Inspect while retaining the `PREVIEW TARGET` / `INSPECT` state labels, public
  details, target selection, and Preview → Inspect → Preview continuity.
- Local build and focused Preview/Inspect browser coverage passed 14/14;
  targeted ESLint and `git diff --check` passed. The relevant earlier Actions
  run `37404317662` for `aabb312` was in progress at the pre-commit check; no
  result for this copy-only change is claimed.

### UX2.7-AOE-RAINING-ARROWS-AVOIDED-OUTCOME-01 — Proven AOE avoidance

- Raining Arrows now records `AVOIDED` only after the server confirms a Dodge
  requirement and resolves that participant, including the Eight Trigrams
  provider path. The typed fact is validated through PresentationV2, Snapshot,
  and client view before the read-only Stage shows “Avoided”; unresolved,
  mismatched, or unproven participants expose no outcome.
- Local validation passed: build; focused PresentationV2/Snapshot/client/render
  tests 108/108; engine-backed API tests 49/49; targeted ESLint; and
  `git diff --check`. The pre-change remote head `ceca3dc` passed Actions run
  `37427033710`; the push of `3409723` passed Actions run #756
  (`37430172672`).

### UX2.7-AOE-RAINING-ARROWS-DAMAGE-OUTCOME-01 — Proven AOE damage

- The public Stage now shows `Damaged` only after the server proves positive
  effective damage and the matching Raining Arrows Group participant resolves.
  The proof survives post-damage triggers and Dying rescue, then is consumed at
  the resolved boundary; pending/prevented damage remains outcome-free. Private
  continuation and hand state are hashed in `actionRevision` rather than
  serialized into a public value, retaining stale-change sensitivity without
  disclosing private data.
- Local validation passed: build; focused PresentationV2/Snapshot/client/render
  tests 110/110; engine-backed API tests 27/27; targeted ESLint; and
  `git diff --check`. The exact pre-change remote head `3409723` passed Actions
  run #756 (`37430172672`); this task's push-triggered result is not yet
  observed.

### UX2.7-AOE-BARBARIAN-INVASION-DAMAGE-OUTCOME-01 — Proven AOE damage

- Barbarian Invasion now shares the proven positive-damage continuation path:
  `Damaged` appears only after the exact Group participant resumes as resolved.
  A satisfied Attack has no damage outcome; pending Damage stays outcome-free;
  the private continuation marker is not projected. `AVOIDED` remains limited
  to Raining Arrows, and damage outcomes require `GROUP` semantics and a resolved
  participant at every projection boundary.
- Local validation passed: build; focused PresentationV2/Snapshot/client/render
  tests 111/111; engine-backed API tests 27/27; targeted ESLint; and
  `git diff --check`. The exact pre-change remote head `f976f3c` passed Actions
  run #757 (`37432494493`); the pushed feature head `fb44d95` passed Actions
  run #758 (`37433985701`).

### UX2.7-AOE-NEGATED-OUTCOME-01 — Proven AOE cancellation

- AOE participant progress now shows `NEGATED` only after a resolved Negation
  cancels the exact Raining Arrows or Barbarian Invasion Group participant.
  Open windows, pass-only resolution, counter-Negation, and target-identity
  mismatch remain outcome-free. The Stage labels the public outcome without
  exposing private response controls or card identities.
- Local validation passed: build; focused PresentationV2/Snapshot/client/render
  tests 111/111; engine-backed API tests 29/29; targeted ESLint; and
  `git diff --check`. The exact pre-change remote head `fb44d95` passed Actions
  run #758 (`37433985701`); the push-triggered result for this task is not yet
  observed.

### UX2.7-AOE-DEFEATED-OUTCOME-01 — Proven AOE defeat

- Raining Arrows and Barbarian Invasion now publish `DEFEATED` only when the
  exact positively damaged Group participant resumes after an authoritative
  Dying failure. Pending Dying remains outcome-free, Peach rescue remains
  `DAMAGED`, and the typed causal/player proof is preserved through
  PresentationV2, Snapshot, Client, and the shared Stage label without
  exposing private continuation fields.
- Local validation passed: build; focused PresentationV2/Snapshot/client/render
  tests 111/111; engine-backed API tests 30/30; targeted ESLint; and
  `git diff --check`. The exact current remote head `db8970d` passed Actions
  run #760 (`37454554676`); this feature push-triggered result is not yet
  observed.

### UX2.8-AOE-MOBILE-TARGET-STRIP-DENSITY-01 — Compact mobile AOE markers

- Proven Group/AOE Target Strips now use one-row horizontal compact markers at
  narrow 390px Top Row and 480px Side Column widths, including short target
  sets that previously retained large two-column cards. The change is visual
  density only: authoritative participant status, viewer privacy, fixed seat
  DOM, and the protected Hero Focus contract remain unchanged.
- Local validation passed: build; focused compact-strip browser tests 5/5; the
  focused active-current-effect plus protected `ui19.spec.mjs` Group/AOE
  geometry slice 57/57; targeted ESLint; and `git diff --check`. The previous
  feature SHA `41c7231` passed Actions run `37455806263`; this feature
  push-triggered result is not yet observed.

### UX2.9-AOE-MOBILE-NEGATION-BRANCH-01 — Compact public Group Negation branch

- Proven Group/AOE Negation now keeps the authoritative Group Target Strip in
  place and presents only the public Negation branch plus neutral waiting copy;
  the duplicated Reaction Chain root is omitted because the Stage's root Action
  card remains the causal context. Private responder identity, provider data,
  and Local Player Dock controls remain separate and unchanged.
- Local validation passed: build; focused active-current-effect plus protected
  `ui19.spec.mjs` Group/AOE browser coverage 60/60; targeted ESLint; and
  `git diff --check`. The pre-commit remote SHA `3843ef7` had push-triggered
  Actions run `37456608951` **in_progress**; no result for this feature push is
  claimed.

### UX2.10-AOE-MOBILE-OUTCOME-MARKERS-01 — Compact accessible AOE outcomes

- Proven `Avoided`, `Damaged`, `Negated`, and `Defeated` Group outcomes
  now use compact visual markers in the Target Strip (`✓`, `−♥`, `⊘`,
  and `✕`) while retaining descriptive accessible names and authoritative
  outcome data attributes. No damage amount, outcome, legality, or privacy
  fact is inferred by the client.
- Local validation passed: build; the four-outcome browser marker slice 4/4;
  `room-safety-render` 19/19; the focused active-current-effect plus protected
  `ui19.spec.mjs` Group/AOE slice 64/64; targeted ESLint; and
  `git diff --check`. The pre-commit remote SHA `d4be592` had push-triggered
  Actions run `37457008657` **in_progress**; no result for this feature push is
  claimed.

### UX2.11-AOE-MOBILE-NEGATION-CARD-01 — Active public Negation branch head

- Proven Group/AOE Negation branches now visually distinguish the latest public
  Negation node as the active gold card-like head while keeping the response
  waiting node neutral. Public actor/card text remains projection-backed, the
  root Action card and Target Strip remain stable, and private responder data
  remains outside the Stage.
- Local validation passed: build; the focused public Negation branch slice 5/5;
  the focused active-current-effect plus protected `ui19.spec.mjs` Group/AOE
  slice 64/64; targeted ESLint; and `git diff --check`. The pre-commit remote
  SHA `d5bb7d5` had push-triggered Actions run `37457268458`
  **in_progress**; no result for this feature push is claimed.

### UX2.12-AOE-MOBILE-COUNTER-NEGATION-01 — Counter-Negation branch continuity

- Added measured Group/AOE counter-Negation coverage for two proven public
  Negation nodes. At 390px, 480px, and 1440px the older node remains subdued,
  the newest node is the sole gold branch head, the waiting node stays neutral,
  and the root/Target Strip/Dock/privacy boundaries remain unchanged.
- Local validation passed: build; focused counter/public Negation browser
  coverage 8/8; the focused active-current-effect plus protected `ui19.spec.mjs`
  Group/AOE slice 67/67; targeted ESLint; and `git diff --check`. The
  pre-commit remote SHA `fb45d84` had push-triggered Actions run
  `37457458894` **pending**; no result for this feature push is claimed.

### UX2.13-AOE-MOBILE-NEGATION-RETURN-01 — Root context after Negation

- Added measured Group/AOE Negated-return coverage at 390px, 480px, and
  1440px. The proven public branch is absent at the settled boundary, the
  root Raining Arrows effect remains the current Stage context, and the
  Target Strip retains the authoritative `⊘` outcome/current-participant
  state without exposing private response controls.
- Local validation passed: focused Negated-return/public-branch browser
  coverage 10/10; build; the focused active-current-effect plus protected
  `ui19.spec.mjs` Group/AOE slice 70/70; targeted ESLint; and
  `git diff --check`. The pre-commit remote SHA `6fbf24d` had push-triggered
  Actions run `37457613604` **pending**; no result for this feature push is
  claimed.

### UX2.14-AOE-MOBILE-NEGATION-ADVANCE-01 — Authoritative next participant

- Added measured Group/AOE coverage proving that a settled Negated participant
  keeps its `⊘` marker while the explicitly projected next participant owns
  the single CURRENT highlight. The root effect remains active, no stale public
  Negation branch appears, and the test does not derive order from DOM or
  target-array position.
- Local validation passed: focused next-participant/return/public Negation
  browser coverage 13/13; build; the focused active-current-effect plus
  protected `ui19.spec.mjs` Group/AOE slice 73/73; targeted ESLint; and
  `git diff --check`. The pre-commit remote SHA `cb668a2` had push-triggered
  Actions run `37457731412` **pending**; no result for this feature push is
  claimed.

### UX2.15-AOE-MOBILE-NEGATION-WAITING-PRIVACY-01 — Neutral open Negation window

- Proven Group/AOE NEGATION without a public submitted node now keeps the root
  Raining Arrows effect visible, retains the authoritative Target Strip, and
  suppresses the generic empty Reaction Chain. The Stage exposes no private
  responder, scan-order, provider, or card fact from compatibility Pending;
  ordinary non-Group Negation chains remain unchanged.
- Local validation passed: focused open/return/counter Group Negation coverage
  15/15; ordinary Reaction Chain regressions 2/2; build; the focused
  active-current-effect plus protected `ui19.spec.mjs` Group/AOE slice 76/76;
  targeted ESLint; and `git diff --check`. The pre-commit remote SHA
  `5443a33` had push-triggered Actions run `37457833613`
  **in_progress**; no result for this feature push is claimed.

### UX2.16-AOE-MOBILE-GROUP-NEGATION-GUIDANCE-01 — Private responder guidance

- Added a Group/AOE browser fixture where the viewer is the server-authorized
  Negation responder. CurrentAction remains the source of `negate`, legal
  response/decline actions, and the private Negation provider; the public
  snapshot redacts decision/resolver identity while the Stage keeps the root
  Raining Arrows effect and authoritative Target Strip. The public Stage has
  no private `Play Negation or Skip.` copy or fabricated Negation branch.
- Local validation passed: focused Group/AOE plus Negation-guidance browser
  coverage 28/28; protected `ui19.spec.mjs` Group/AOE geometry/Stage slice
  37/37; build; targeted ESLint; and `git diff --check`. Pushed as `6baec5f`;
  its exact push-triggered Actions run `37458837327` is **in_progress**.

### UX2.17-AOE-MOBILE-GROUP-GUIDANCE-GEOMETRY-01 — Stable mobile response layout

- Added a three-viewport browser geometry regression for the authorized local
  Group/AOE Negation responder. Before and after normal response-card selection,
  the Stage, effect root, and proven Target Strip stay within 1 CSS px; Guidance
  stays readable and adjacent below the Stage; Hand, Confirm, and Skip remain
  visible, hit-testable, and non-overlapping without horizontal overflow.
- Focused Group/AOE, Negation, observer/privacy, and related Stage regressions
  passed 38/38, including 390×844, 480×900, and 1440×900; targeted ESLint and
  `git diff --check` passed. Pre-commit remote `e676385d` Actions run
  `37459258633` was **success**. Agent implementation complete; Reviewer
  acceptance not implied.

### UX2.18-AOE-STRUCTURAL-COMPOSITION-01 — Single Group/AOE event spine

- Existing typed `GROUP` scenes now use one compact public Source, the root
  action card, and one Group Target Strip. The strip alone owns current-member
  emphasis; duplicate Hero Focus, expanded Source, Current Effect metadata,
  repeated event prose, AOE heading, and per-target Hero/HP details are removed
  from this composition. Only submitted public Negation nodes form a compact
  root-attached branch; an open window remains neutral. No gameplay or
  projection-protocol authority changed.
- Focused Group/AOE browser coverage passed 30/30 across 390×640, 390×844,
  480×900, and 1440×900. Measured source/root/strip order, zero Stage/Dock
  overlap, and root/strip geometry stability within 1 CSS px as the public
  Negation branch grew. Targeted ESLint and `git diff --check` passed. The
  pre-commit remote SHA `c9f6afe25867e9d849aa8f8d33833370ece5e86d` had Actions
  run `37462834224` **success**. The feature push `21ca89d741d2f0aa7cbd604b148b92d8f04f866a`
  exposed one stale SSR assertion; test-only repair `673efcf132e74c4280ef46c81d62a4d553e7e2d6`
  passed complete Actions run `37472484337` (**success**), including deploy and
  production smoke test. Reviewer acceptance remains unclaimed.

### UX2.19-OATH-AUTHORITATIVE-RECIPIENT-SCOPE-01 — Simultaneous Oath recipients

- Added one shared domain rule for living, wounded Oath recipients and exposed
  its result through a typed, identity-bound public scope in PresentationV2,
  PresentationSnapshot, and PresentationClientView. The scope remains distinct
  from Oath's causal self-target and intentionally has no sequential current
  participant. Viewer equality, privacy, typed-continuation, and mismatch
  fail-closed behavior are covered; Group/Negation behavior and Bumper Harvest
  are unchanged.
- Focused PresentationV2/Snapshot/client tests passed 94/94; engine-backed API
  tests passed 31/31; targeted ESLint, `git diff --check`, and build passed.
  Pushed as `a3cecb3340b307912a6c1c28faef6a9c00ff9d4d`; exact Actions run
  `37477034233` completed **success**. Reviewer acceptance remains unclaimed.

### UX2.20-OATH-NEGATION-STAGE-COMPOSITION-01 — Oath root-card composition

- Oath NEGATION now consumes only its proven simultaneous recipient scope in a
  compact Source → root Oath card → recipient strip. Public submitted Negation
  cards branch from that root; duplicate HeroFocus, Current Effect, event prose,
  and Reaction Chain panels are omitted. Local response controls and private
  identity remain in the Dock. Group and Bumper Harvest behavior are unchanged.
- Presentation/render regressions passed 68/68; focused Oath browser semantic
  and geometry tests passed 9/9, including ten-player mobile scrolling and
  Stage/Dock separation. Build, targeted ESLint, and `git diff --check` passed.
  Pushed as `8fdb0cfcbaed9dbe8679310c7606ae7d1af8ca9d`; exact Actions run
  `37480885665` completed **success** (`build-and-test`, `deploy`). Reviewer
  acceptance remains unclaimed.

### UX2.21-BUMPER-HARVEST-AUTHORITATIVE-SEQUENCE-01 — Ordered public progress

- Bumper Harvest now persists the server-computed chooser order, explicit
  chosen/negated/no-longer-applicable states, and an identity-bound causal root
  plus per-participant Negation child frames. PresentationV2, Snapshot, and
  ClientView expose only the proven public sequence and submitted Negation
  history; the open private scan actor and response legality remain private.
- Focused Presentation/render tests passed 96/96; engine/API tests passed
  32/32; build, targeted ESLint, and `git diff --check` passed. Pushed as
  `5575e6422bbe370f4d8eb3552541451c00a9d896`; exact push Actions run
  `37488197985` completed **success** at the UX2.22 planning boundary.
  Reviewer acceptance remains unclaimed.

### UX2.22-BUMPER-HARVEST-MOBILE-STAGE-COMPOSITION-01 — Compact public causal spine

- Bumper Harvest now uses proven ordered progress to render one compact Source
  → root card → participant strip; public submitted Negation nodes branch from
  the root. Duplicate Hero Focus, Current Effect, event summary, and standalone
  Reaction Chain are omitted; private response controls remain in the Dock.
- Presentation/render tests passed 70/70; focused browser geometry/privacy
  tests passed 9/9 across 390×640, 390×844, 480×900, and 1440×900. Build,
  targeted ESLint, and `git diff --check` passed. Pushed as
  `732da3771f94948989ea0845a452b63ebc934975`; exact Actions run `37491852275`
  completed **success**. Reviewer acceptance remains unclaimed.

### UX2.23-UX2-FINAL-RESPONSIVE-VISUAL-GATE-01 — Representative final gate

- Captured and inspected fresh fixtures for 2/4/6/10-player layouts at
  390×844, 480×900, and 1440×900. All nine captures had no document-level
  horizontal overflow; top-row and side-column topologies were represented.
- Focused coverage across 16 browser specs passed 200/200, spanning REST,
  Inspect, Preview/ACTIVE, single/multi-target, Group/AOE, Attack/Dodge, Duel,
  Negation, Dying/Peach, Judgement, Steal/Dismantle, Borrowed Sword,
  skill/self-target, long guidance, large Hand, Dock, timer, and viewer switch.
- The 10-player Group child-Damage capture still showed a separate current
  Hero Focus, `AOE PARTICIPANTS`, and repeated `ACTIVE SCOPE`, contrary to
  §§12.6.4 and 12.6.10. The existing engine/PresentationSnapshot Group proof
  retains the root card kind, root frame/source, full target order, and paused
  child participant, so the next bounded UI task can consume existing authority
  without a new protocol. UX2.24 is the sole follow-up task.
- At 1440×900, the Bumper Harvest root card visually overlays the empty
  discard-pile slot. §12.6 does not specify whether this layering is prohibited;
  recorded as an evidence limit, not authorized as a second task.
- UX2.22 Actions run `37491852275` was rechecked and completed **success**.
  UX2.23 screenshots were saved under `/tmp/ux2-final-gate-20261006/` and are
  review evidence only, not repository artifacts. Reviewer acceptance remains
  unclaimed.

### UX2.24-GROUP-CHILD-DAMAGE-MOBILE-COMPOSITION-01 — Preserve the Group spine in child Damage

- A coherent `DAMAGE` child frame now reuses the proven Group Source → root
  action card → single Target Strip composition. The paused child participant
  remains highlighted in that strip; duplicate Hero Focus, `AOE PARTICIPANTS`,
  and repeated `ACTIVE SCOPE` are omitted. Incoherent root frame/source/effect/
  target proof fails closed. No gameplay or projection protocol changed.
- Focused browser validation passed 104/104 across the Group, Oath, and Bumper
  Harvest composition specs; `room-safety-render` passed 19/19; build, targeted
  ESLint, and `git diff --check` passed. 10-player/390px and 6-player/480px
  screenshots were inspected. Current remote head `9195225` had Actions run
  `37494887683` completed **success** before this task commit. Reviewer
  acceptance remains unclaimed.
- At the close boundary, remote Design blob
  `530c8ec9b7ef5790b6a8bc27b694ac7b00499a6a` was unchanged. Oath's
  authoritative recipient scope/composition and Bumper Harvest's ordered
  progress/composition are already present in UX2.19–2.22; no duplicate
  semantic projection is authorized. UX2.25 is the sole next task: wide-screen
  geometry proof for the corrected Group child-Damage composition.

### UX2.25-GROUP-CHILD-DAMAGE-WIDE-GEOMETRY-01 — Wide composition evidence

- Added a 6-player/1440×900 regression alongside the existing 10-player/390px
  and 6-player/480px cases. It proves Source/root-card/Target-Strip semantic
  order, root composition geometry stability into child Damage, viewport and
  Stage/Dock containment, readable Dock Guidance, and usable Hand/Action Row.
- Focused Group child-Damage browser coverage passed 4/4; targeted ESLint and
  `git diff --check` passed. The inspected screenshot is
  `/tmp/ux2-25-group-child-wide-20261006.png`; measured Source y=8–46, root
  card y=64–182, Target Strip y=200–247, Stage bottom 247, Dock top 546, Hand
  bottom 813, Action Row top 828, and document width 1440. No UI correction was
  needed. The exact prior remote-head run `37497635783` was
  `build-and-test: in_progress` at pre-commit; per direct user instruction the
  Agent did not wait. Reviewer acceptance remains unclaimed.
- UX2.26 is the sole next task: move the self-owned public-Equipment
  `target_cards` choice to the Local Dock only when CurrentAction keys prove
  that exact supported zone; preserve the current modal fallback otherwise.

### UX2.26-LOCAL-EQUIPMENT-SELECTABLE-DETAIL-01 — Self-targeted public Equipment

- A self-targeted authoritative `target_cards` choice now uses the Local Dock
  Equipment band when every unique eligible key matches a currently projected
  public Equipment card and the viewer is alive. Mixed-zone or unprojected keys
  do not enable Equipment controls and keep the retained picker; an unprojected
  key has no selectable object. The existing provider, `cardKeys` payload,
  revision reset, Cancel/Skip authority, and server legality are preserved.
- The focused target-card browser spec passed 34/34, covering 390px, 480px,
  1440px, exact one-time payload, ineligible equipment, Cancel, actionRevision
  reset, and mixed/unprojected fallback. Targeted ESLint and `git diff --check`
  passed. Pre-commit remote head `b1fb2bb` Actions run `37499022849` completed
  success for both `build-and-test` and `deploy`. Reviewer acceptance remains
  unclaimed.
- At the close boundary, remote Design blob
  `530c8ec9b7ef5790b6a8bc27b694ac7b00499a6a` was unchanged. The §12.5
  Ma Chao Cavalry Skills-band entry already exists and has focused browser
  coverage; UX2.27 is the sole next task: the representative §12.9 responsive
  integration gate.

### UX2.27-UX2-FINAL-RESPONSIVE-INTEGRATION-GATE-01 — Representative responsive audit

- The representative matrix passed 209/209 cases across `active-current-effect.spec.mjs`, `borrowed-sword-targets.spec.mjs`, `bumper-harvest-composition.spec.mjs`, `local-dock-hero-hierarchy.spec.mjs`, `local-self-target.spec.mjs`, `local-skill-control-consistency.spec.mjs`, `local-target-preview.spec.mjs`, `negation-response-guidance.spec.mjs`, `oath-negation-composition.spec.mjs`, `opponent-inspect-hero-focus.spec.mjs`, `quick-test-viewer-reprojection.spec.mjs`, `response-timer.spec.mjs`, `semantic-response-heading.spec.mjs`, `side-column-seat-recognition.spec.mjs`, `target-card-zone-picker.spec.mjs`, and `zhang-liao-assault.spec.mjs`. A focused `ui19.spec.mjs` selection passed 37/37. This covers REST/Inspect/Preview, target cardinality, Group/AOE, Attack/Dodge, Duel, Negation, Dying/Peach, Judgement, Steal/Dismantle, Borrowed Sword, skills, self-target, guidance, large Hand, viewer switching, and 2/4/6/10-player topologies. Eleven composition cases were rerun after adding retained screenshot/geometry attachments.
- Eleven composition geometry cases were rerun; screenshot/geometry attachments cover seven representative scenes. Fresh Group child-Damage screenshots were inspected at 10p/390px, 6p/480px, and 6p/1440px; geometry asserts Source → root action → single Target Strip, stable root/strip coordinates across the child transition (≤1px), Stage/Dock separation, Guidance/Hand/Action Row containment, and no horizontal overflow. Fresh Oath and Bumper Harvest double-Negation screenshots at 390×844 and 1440×900 exposed the public composition overlapping the persistent Deck/Discard area. This violates the general pile hierarchy in Design §0.91.4, so §12.9 is **not closed**.
- Targeted ESLint for the three screenshot-evidence specs and `git diff --check` passed. The exact previous remote SHA `592d2d460aaef2a29b6fac2c36e749f81443080c` Actions run `37501361734` completed success for `build-and-test` and `deploy`; the UX2.27 local edits themselves have not yet run in CI. Reviewer acceptance remains unclaimed. UX2.28 is the sole follow-up: keep Deck/Discard visible but clear of the Oath and Bumper Harvest Source/root/participant/Negation composition, with focused non-overlap geometry proof.

### UX2.28-ACTIVE-STRATAGEM-PILE-CLEARANCE-01 — Oath and Bumper Harvest pile clearance

- Oath and Bumper Harvest keep persistent Draw/Discard piles visible in an edge
  lane, clear of the proven Source, root action card, recipient/participant
  strip, and public Negation branch. Short compact phones retain the established
  top-edge pile placement; no gameplay or projection authority changed.
- Added bounding-box non-overlap assertions to the Oath and Bumper Harvest
  composition specs, including their ten-player mobile fixtures. The complete
  two-spec browser run passed 18/18 across 390×640, 390×844, 480×900, and
  1440×900; targeted ESLint and `git diff --check` passed. The retained
  390×844 and 1440×900 screenshots were inspected. The preceding remote SHA
  `7779022483f51da5053cd63bc844e7989e68fa6e` Actions run `37504313777`
  completed successfully for `build-and-test` and `deploy`; the UX2.28 push
  result is tracked in HANDOVER. Reviewer acceptance remains unclaimed.

### UX2.29-SELECTABLE-DETAIL-REMAINDER-AUDIT-01 — Existing selectable-card paths

- Audited the `CurrentAction.targetCardSelection` consumer for Steal/Dismantle
  Pending and all five `target_cards` producers: Retaliation, Frost Sword,
  Kirin Bow, Fanjian, and Yue Jin's self-Equipment path. Proven
  external targets with supported server keys/public identities use the shared
  Hero Focus Selectable Detail path. Fallback remains when target, zone, or
  focus proof is unavailable; Local Dock inline selection remains limited to
  all-public Equipment keys. No gameplay/projection change was indicated.
- `tests/browser/target-card-zone-picker.spec.mjs` passed 34/34 across the
  tested 390px, 480px, 1440px, and reduced-height cases, including payload,
  privacy, revision reset, and fail-closed fallback assertions. This audit did
  not directly exercise live Fanjian/Kirin Bow browser sessions. UX2.30 is the
  sole next task: re-run the §12.9 representative integration gate after the
  UX2.28 pile-clearance correction.
- Exact pre-commit remote SHA `f47a9f9cf4548b64281e4e62706a36eaf9d5aafc`
  Actions run `37507015662` was `in_progress`; lint, build, and browser steps
  were successful and `npm test` was still running. Reviewer acceptance is not
  claimed.

### UX2.30-UX2-FINAL-INTEGRATION-RECHECK-01 — §12.9 representative gate

- Re-ran the representative matrix from 16 focused browser specs: 209/209
  passed across REST/Inspect/Preview, response/ACTIVE families, Group/AOE,
  Steal/Dismantle, Borrowed Sword, skills/self-target, guidance, large Hand,
  viewer switching, and 2/4/6/10-player topologies. Oath/Bumper Harvest pile
  bounding-box non-overlap assertions passed at 390×640, 390×844, 480×900,
  and 1440×900. Inspected fresh 390×844 and 1440×900 double-Negation captures;
  Draw/Discard remain visible in the edge lane and clear of the causal spine.
- This closes the Agent's §12.9 representative validation gate only; Reviewer
  acceptance is not claimed. The UX2.29 audit found no confirmed external
  selectable-card flow incorrectly forced to the modal, but did not directly
  exercise Fanjian's source-owned anonymous-Hand path in a browser. UX2.31 is
  the sole next task: add focused Fanjian Selectable Detail browser proof.
- Exact pre-commit remote SHA `beca49a5c3f978a81830829529c7ceb1f8b9088f`
  Actions run `37507856521` was `in_progress`; lint/build succeeded and browser
  validation was running. Reviewer acceptance remains unclaimed.

### UX2.31-FANJIAN-SELECTABLE-DETAIL-BROWSER-PROOF-01 — Fanjian concealed-Hand choice

- Added source-owned Fanjian browser proof for anonymous `hand:N` selection:
  source focus is shown only with public projection proof; hidden identities
  remain absent; selection stays local until Confirm; the existing trigger
  payload is submitted once; action-revision changes clear selection; and the
  generic picker remains when focus is unproven. A measured wide-screen
  overlap was corrected by scaling shared Selectable Detail cards to 68×96px
  above 650px; mobile sizing is unchanged.
- The target-card browser suite passed 40/40 at 390px, 480px, and 1440px;
  `room-safety-render` passed 19/19; targeted ESLint and `git diff --check`
  passed. Geometry verifies the interactive hidden-card bounds remain inside
  the viewport and clear of the Local Dock. No gameplay/projection semantics
  changed. Pre-commit remote SHA `f2801a81` passed Actions run `37508298620`.
  Reviewer acceptance remains unclaimed.

### UX2.32-KIRIN-BOW-SELECTABLE-DETAIL-BROWSER-PROOF-01 — Public Mount choice

- Added Kirin Bow browser proof for public Mount Selectable Detail: only the
  authoritative eligible Mounts appear with proven external target focus;
  selection remains local until Confirm, submits the existing trigger payload
  once, resets on action revision, and falls back to the generic picker when
  focus or public-card proof is absent. The target-card browser suite passed
  47/47, targeted ESLint, and `git diff --check`. Fixture/spec only; gameplay
  and projection semantics are unchanged. Pre-commit remote SHA `3d64a02`
  passed Actions run `37510268990`. Reviewer acceptance remains unclaimed.

### UX2.33-JUDGEMENT-MOBILE-CAUSAL-SPINE-01 — Portrait Judgement flow

- Proven external-participant Judgement now reads Source → Current Effect →
  target vertically and centered at 390×844 and 480×900 Top Row viewports.
  A 390×640 safe zone measured 384×218px and uses a compact horizontal causal
  row (Stage 338×143px) to stay clear of the Local Dock. Side Column and 1440px
  Top Row remain covered and unchanged; the local participant stays Dock-only
  and missing/mismatched authority still fails closed. The focused Judgement
  browser slice passed 7/7, targeted ESLint, and `git diff --check`. No gameplay
  or projection changes. Pre-commit remote SHA `aef8473` passed Actions run
  `37512146457`. Reviewer acceptance remains unclaimed.

### UX2.34-DYING-MOBILE-CAUSAL-SPINE-01 — Portrait Dying / Peach flow

- Proven external-participant Dying/Peach ACTIVE scenes now read Source →
  Current Effect → dying player vertically and centered on portrait Top Row
  when safe-zone height permits. Short safe zones retain the compact causal
  row; Side Column, wide Top Row, fail-closed semantic gates, rescue handoff,
  and private Dock controls remain unchanged.
- The focused geometry slice passed 5/5 at 390×844, 390×640, 480×900 Top Row,
  480×900 Side Column, and 1440×900; Dying/rescue safe-zone checks passed 6/6.
  Targeted ESLint and `git diff --check` passed. No gameplay/projection change.
  Pre-commit SHA `9631b6bd16d1e858eaaa19cd1099660fd37dd200` passed Actions run
  `37514429249` (`build-and-test`, `deploy`). Reviewer acceptance remains
  unclaimed.

### UX2.6-AOE-ORDERED-SCOPE-AND-CURRENT-PARTICIPANT-01 — Group/AOE scope proof

- Group/AOE causal roots now retain the complete server-selected target order,
  separately from the one current participant. `remainingIds` remains
  continuation input only; matching causal frames advance the current
  participant through Negation, retry, Damage/Dying, and Halberd paths without
  deriving progress from the continuation tail.
- Local build passed; the focused engine-backed API set passed 48/48; targeted
  ESLint and `git diff --check` passed. The feature push-triggered Actions run
  `37408039555` completed `cancelled`; the later documentation-only remote head
  `ceb5c6b` passed Actions run `37408137461`.

### UX2.6-AOE-EXPLICIT-PARTICIPANT-PROGRESS-01 — Authoritative AOE statuses

- Standard Barbarian Invasion and Raining Arrows persist ordered participant
  statuses across response, advancement, nested Damage/Dying, rescue resume,
  and no-longer-applicable transitions. `PresentationV2.groupResolution`
  exposes the list only when participant identity/order, complete root scope,
  interaction/frame identity, and active causal state agree; malformed or
  incomplete proof fails closed. Halberd, legal actions, and gameplay rules are
  unchanged; no player-facing UI, outcomes, or Reaction Chain history is added.
- Local build passed; focused Presentation V2 tests passed 35/35; focused
  Worker/D1 API tests passed 30/30; targeted ESLint and `git diff --check`
  passed. The feature was pushed as `7554fe4`; Actions run `37411145464` was
  observed `in_progress`, so no CI pass is claimed.

### UX2.6-AOE-PARTICIPANT-PROGRESS-STAGE-CONSUMER-01 — AOE participant UI

- The typed Snapshot/client path now admits only Standard AOE progress matching
  the public interaction, root/active frames, complete ordered target scope,
  current participant, and valid statuses. Stage participant cards render that
  exact order and state; the current/paused participant is also marked in Hero
  Focus, while a local target is represented as text only and its Hero remains
  in the Dock. Progress remains visible through child-frame Damage; compact
  4+ participant rows scroll horizontally without Stage/Dock overlap.
- Snapshot/client tests passed 50/50; the focused `active-current-effect`
  browser spec passed 48/48; build and targeted ESLint passed. The previous
  remote-head Actions run `37411200534` failed at `npm test` because the AOE
  failure-damage path called an undefined participant-status helper. That
  server transition is now implemented, and the exact local `npm test` command
  passed build, fast 213/213, and API 250/250. The combined repair and UI task
  were pushed as `f98ba4c`; Actions run `37414138268` was cancelled after a
  follow-up documentation push. Latest run `37414234939` on docs-only
  `45b7ce3` failed at `npm run test:browser`: compact Group cards are in a
  horizontally scrolling track, while three geometry assertions counted
  clipped children as visible overflow. The UI remains unchanged; the tests
  now measure the track viewport and last-card reachability. The same browser
  run also exposed Hero-art image-load races, so the relevant fixtures wait for
  successful image loading instead of sampling immediately. The exact local
  browser step passed 539/539 and targeted ESLint passed. At the original
  handoff the repair was still pending; pushed commit `bdd039a` was later
  verified by Actions run `37416789582` as **Success** (build-and-test and
  deploy).

### UX2.6-REACTION-CHAIN-NEGATION-HISTORY-01 — Active Negation history

- The active Negation continuation records each actually submitted physical
  Negation card with interaction/frame identity and an explicit predecessor
  link. PresentationV2, PresentationSnapshot, and PresentationClientView expose
  only the public actor/card kind and linked order; physical card IDs and
  private CurrentAction options remain private. Passes add no node, malformed
  or mismatched history fails closed, and the projection ends with the active
  continuation. No React rendering or gameplay behavior changed.
- Local validation passed: build; focused fast tests 117/117; engine-backed API
  tests 27/27; targeted ESLint; and `git diff --check`. The local feature change
  was pushed as `1c5f4ef`; its Actions run `37418042611` completed **Success**
  (build-and-test and deploy).

### UX2.6-HALBERD-ORDERED-PARTICIPANT-PROJECTION-01 — Explicit ordered target progress

- The existing Sky Piercing Halberd response sequence now persists explicit
  `ORDERED` participant semantics and complete target status in the route's
  authoritative order. PresentationV2, Snapshot, and client view preserve that
  order and active/paused/resolved states through nested Damage/Dying recovery;
  malformed or mismatched proof fails closed. AOE remains explicitly `GROUP`,
  and Halberd is kept out of the existing AOE Stage consumer. No gameplay order,
  legality, weapon behavior, or player-facing rendering changed.
- Local validation passed: build; focused PresentationV2/Snapshot/client tests
  88/88; engine-backed API tests 27/27; Halberd/equipment API tests 20/20;
  targeted ESLint; and `git diff --check`. The prior remote head `1c5f4ef` was
  verified green in Actions run `37418042611`. Pushed as `c63cc6b`; its Actions
  run `37419043447` was later **cancelled** when the subsequent documentation
  push started; no pass is claimed for that feature SHA.

### UX2.6-HALBERD-ORDERED-PARTICIPANT-STAGE-CONSUMER-01 — Halberd target progress

- The Interaction Stage now consumes only the typed Sky Piercing Halberd
  `ORDERED` progress and shows the authoritative target numbering and
  active/paused/resolved status. This remains separate from the AOE `GROUP`
  consumer, labels, and contracts; missing or mismatched ordered proof renders
  no progress. No gameplay, legality, weapon ordering, or Dock control changed.
- Focused PresentationClient tests passed 45/45; the targeted Active Current
  Effect browser slice passed 7/7, including unchanged AOE labels and progress;
  `npm run build`, targeted ESLint, and `git diff --check` passed. The pre-task
  remote head `2a99b0f` had Actions run `37419081776` queued at the pre-commit
  check; no result is claimed for it here.

### UX2.6-REACTION-CHAIN-NEGATION-NODES-STAGE-01 — Public Negation nodes

- The Interaction Stage now renders validated, server-projected Negation card
  nodes in their linked order between the root effect and active response. The
  UI exposes only public actor/card kind; physical card IDs, private
  CurrentAction/provider data, inferred passes, and malformed history remain
  absent. Root/active content and AOE presentation remain separate.
- PresentationClient tests passed 45/45; the focused Active Current Effect
  browser slice passed 13/13, including one/multiple nodes, malformed/missing
  history, unchanged AOE/Halberd progress, 390/480/1440px, and 10-player
  geometry. Build, targeted ESLint, and `git diff --check` passed. The previous
  remote head `1d28913` completed Actions run `37419896636` with both
  build-and-test and deploy successful.

### UX2.34-CI-REPAIR-DYING-MOBILE-SAFE-ZONE-01 — Restore Dying containment

- The failed browser run `37516354859` on `b6a25e2` exposed eight Dying
  geometry regressions: the 650×900 scene escaped its short safe zone, and the
  480×900 handoff overlapped the Deck/Discard region. The compact row now
  activates for the measured short safe zone while keeping the primary portrait
  sizing. Focused regressions passed 19/19. Repair commit
  `ef57d59515974af5521ad619f9ee7fcb3282995d` passed exact Actions run
  `37530273503` (`build-and-test`, `deploy`).

### UX2.35-BORROWED-SWORD-MOBILE-CAUSAL-SPINE-01 — Forced-Attack child

- A proven Borrowed Sword forced-Attack child now prefers mobile Top Row
  Source → Attack → target; short safe zones retain the compact row. Root
  weapon source/holder/target proof remains authoritative and fail-closed;
  viewer identity stays Dock-only; Side Column and wide layouts are preserved.
  Focused browser coverage passed 9/9 with causal-order, containment, overlap,
  and overflow measurements. Commit `457e2e16750685148c64a607b7fd951df83626ce`
  passed exact Actions run `37531803898` (`build-and-test`, `deploy`).

### UX2.36-FINAL-UX2-VISUAL-GATE-01 — §12.9 final responsive evidence

- Added and ran a 19-case final geometry/screenshot matrix covering
  representative 2/4/6/10-player layouts, requested portrait and wide sizes,
  and Group/AOE, Oath, Bumper Harvest, Judgement, Dying, and Borrowed Sword.
  Stage/Dock intersection and document horizontal overflow are measured. The
  matrix passed 19/19; related interaction regressions passed 189/189 and
  layout/viewport regressions 58/58. Twelve fresh ACTIVE screenshots were
  captured under ignored Playwright results for Reviewer inspection. Commit
  `90d89e2f3a276ad1816e5524e8ee418a68b5dbcd` passed exact Actions run
  `37533803893` (`build-and-test`, `deploy`). Reviewer acceptance is not
  claimed. The boundary review found the remaining design statuses broad and
  partial/open, without identifying a new concrete task that would not require
  guessing product scope.

### UX2.REFINE-HUA-XIONG-TRIUMPHANT-SKILL-CHOICE-01 — Cross-Hero passive decision in Local Dock

- CurrentAction-owned Recover/Draw choices from Hua Xiong's Triumphant render in
  the acting viewer's Local Dock Action Row beside authoritative Skip. Hua
  Xiong's own Skills tile stays passive; observers receive no private trigger
  options. Focused browser coverage passed 8/8 across 320/390/480/wide geometry,
  payloads, Skip, and privacy. Feature commit `6025be2` exposed one stale passive
  roster expectation in full CI (692 passed, 1 failed); test-only repair
  `e5c5953` added Triumphant to the passive matrix, whose focused suite passed
  6/6. Exact repair SHA passed Actions run `37584932814` (`build-and-test`,
  `deploy`). Reviewer acceptance is not claimed.

### UX2.REFINE-PAN-FENG-AXE-PASSIVE-PRESENTATION-01 — Automatic skill identity

- Pan Feng's automatic Axe of Insanity now has a stable, non-actionable tile in
  the Local Skills band. The roster geometry/no-action regression passed 6/6,
  targeted ESLint and `git diff --check` passed, with no server or continuation
  changes. Commit `15e0e264f02d146c96fc2972416d3c52b8eb8862` passed exact Actions
  run `37589042247` (`build-and-test`, `deploy`). Reviewer acceptance is not
  claimed.

### UX2.REFINE-HUA-TUO-FIRST-AID-SKILLS-BAND-01 — First Aid via Local Skills

- Hua Tuo's First Aid is available from the owner's Skills band only when the
  viewer's authoritative `CurrentAction.options` proves the provider; eligible
  card selection remains private and submits through the existing `respond`
  action. Peach/Skip remain intact, with no server/gameplay changes. Focused
  browser coverage passed 3/3 across 390×640, 390×844, 480×900, and 1440×900,
  including payload, fail-closed, privacy, and Stage/Dock geometry assertions;
  targeted ESLint and `git diff --check` passed.

### UX2.REFINE-PRIVATE-DRAW-COUNTDOWN-CLUSTER-01 — Compact event timer

- Private Draw's countdown now sits immediately left of System Menu in the
  lower-right `StageSystemCluster`, with a compact numeric-only face and a full
  accessible label. Private title/cards, viewer privacy, and the existing event
  duration remain unchanged. The new geometry/privacy regression plus existing
  response-timer regressions passed 5/5 at 390×844, 480×900, and 1440×900;
  targeted ESLint and `git diff --check` passed. Commit
  `1e49694bbf642c4e3a37720932e6f0cc6074576b` passed Actions run `37602622818`
  (#843; `build-and-test`, `deploy`). Reviewer acceptance is not claimed.

### UX2.REFINE-PRIVATE-DRAW-CONTENT-DRIVEN-HEIGHT-01 — Compact event content

- Private Draw keeps its full-table privacy backdrop while the title/cards use
  content-driven height near the lower System Cluster. Two-card content stays
  16–24px above the cluster at 390×844, 480×900, and 1440×900; sampled card
  animation remains clear. Focused browser specs passed 6/6; targeted ESLint
  and `git diff --check` passed. Commit `a040cc12b156b917a22bbe464798e1ed2a8a9b5f`
  passed exact Actions run `37606112183` (#846). Reviewer acceptance is not
  claimed.

### UX2.REFINE-BUMPER-HARVEST-CLOSING-TIMER-CLUSTER-01 — Closing timer placement

- The authoritative Bumper Harvest closing countdown now sits beside System
  Menu in the lower-right `StageSystemCluster`; the choice UI and server/gameplay
  behavior remain unchanged, and no choosing-phase deadline was invented.
  Focused browser coverage passed 16/16 at 390×844, 480×900, and 1440×900,
  including timer/menu/Guidance/card geometry and no legacy duplicate; targeted
  ESLint and `git diff --check` passed. The pre-commit remote base had an empty
  CI status, treated as success per direct user instruction. Reviewer
  acceptance is not claimed.

### UX2.REFINE-OTHER-PLAYER-INSPECT-FLOATING-SHELL-01 — Compact Stage overlay

- Inspect now uses one Stage-contained floating shell, one title/close row, and
  a Stage-only dim backdrop. At 390×844, 480×900, and 1440×900 the shell was
  352×223, 442×297, and 680×230px; Menu/Guidance/Dock overlap and Dock movement
  were 0. Commit `5cc2938509982f3fd4844e8d1ad2558f7c4f4223` passed Actions #849
  (`37618977420`).

### UX2.REFINE-OTHER-PLAYER-INSPECT-IDENTITY-BLOCK-01 — Mobile identity focus

- Inspect's mobile portrait/identity columns now use 39.8%/57.2% of the
  content width at 390×844 and 40.0%/57.6% at 480×900, with readable
  15/12/10/9px identity typography. The wide portrait remains 90×113px. The
  focused Inspect browser spec passed 7/7 across these viewports, wide layout,
  Preview restoration, and Side Column; targeted ESLint and `git diff --check`
  passed. Reviewer acceptance is not claimed.

### UX2.REFINE-OTHER-PLAYER-INSPECT-PUBLIC-SKILLS-01 — Compact public skills

- Inspect skill chips now use readable 10px type; the single-skill section sizes
  to 42.5px at 390×844, 480×900, and 1440×900 rather than stretching to the
  neighboring zone height. The unavailable-public-skill path remains a compact
  `None`. Focused Inspect browser coverage passed 11/11, including one/multiple
  skills, explanation, privacy, Preview, and Side Column; targeted ESLint,
  `git diff --check`, and visual screenshot review passed. Reviewer acceptance
  is not claimed.

### UX2.REFINE-OTHER-PLAYER-INSPECT-SINGLE-EQUIPMENT-READABILITY-01 — Readable single public Equipment card

- A sole public Equipment card now uses a readable 70–78px width while multiple
  cards retain the ≤60px compact layout. At 390×844, 480×900, and 1440×900 the
  single card measured 70×105, 76.8×115.2, and 78×117px, stayed inside its zone,
  and continued opening its explanation. The focused Inspect browser spec
  passed 14/14; targeted ESLint, `git diff --check`, and screenshot review
  passed. Pre-commit Actions #851 passed exact base SHA
  `58392a6fc83799b0865ff90ceee0ec180b97afce`. Reviewer acceptance is not
  claimed.

### UX2.REFINE-OTHER-PLAYER-INSPECT-ZONE-CONTENT-HEIGHT-01 — Content-sized public zones

- Inspect public-zone grid items now align to their own content instead of
  stretching to the tallest adjacent card. With one public Judgment card at
  1440×900, Judgment stays 111px high and concealed Hand is 41px (previously
  111px); 390×844 and 480×900 containment also passed. The focused Inspect
  browser spec passed 17/17; targeted ESLint and `git diff --check` passed.
  Pre-commit Actions run `37624104273` passed exact base SHA
  `2344c51349f45148a99e476b888679e5c309e769`. Reviewer acceptance is not
  claimed.

### UX2.REFINE-OTHER-PLAYER-INSPECT-EMPTY-JUDGMENT-COMPACT-01 — Compact empty Judgment

- An empty public Judgment Zone now renders a compact `None` state measuring
  32px at 390×844, 480×900, and 1440×900. The focused Inspect browser spec
  passed 20/20; restoring the prior stretching alignment makes the wide
  viewport assertion fail at 41px. Targeted ESLint and `git diff --check`
  passed. Actions run #853 attempt 2 passed on the exact prior head; its first
  attempt had a non-reproduced shard-1 Wrangler transport failure. Reviewer
  acceptance is not claimed.

### UX2.REFINE-RETALIATION-UNIFIED-TARGET-CARD-MODAL-01 — Sima Yi Retaliation modal

- Proven external-target Retaliation now uses the shared centered full-screen
  target-card modal, with distinct Hand / Equipment / Judgment sections,
  rule-facing copy, anonymous Hand fallback or authoritative `hand:n` positions,
  and modal-owned submit/cancel/skip controls. Browser geometry confirms the
  overlay blocks Dock controls without changing Stage/Dock bounds at
  390×844, 480×900, and 1440×900. The focused picker spec passed 56/56; the
  existing UI-19 Hero Focus compatibility check passed 1/1; targeted ESLint and
  `git diff --check` passed. Pre-commit Actions run `37634607717` passed on the
  exact parent SHA `9607280182e5f21a8d2acd5c03a707cb438906f5`. Reviewer
  acceptance is not claimed.

### UX2.REFINE-FROST-SWORD-UNIFIED-TARGET-CARD-MODAL-01 — Frost Sword modal

- Proven external-target Frost Sword now shares the target-card modal while
  retaining anonymous Hand positions, public Equipment, authoritative eligible
  keys, and the existing trigger payload. The dialog uses “Choose 1–2 cards to
  discard,” prevents selection beyond the server-provided maximum, and keeps
  Stage/Dock geometry stable. Focused Frost Sword browser coverage passed 8/8,
  the full target-card picker spec passed 56/56, and targeted ESLint plus
  `git diff --check` passed. Reviewer acceptance is not claimed.

### UX2.REFINE-KIRIN-BOW-UNIFIED-TARGET-CARD-MODAL-01 — Kirin Bow modal

- Proven external-target Kirin Bow now uses the shared Equipment-only modal,
  with only CurrentAction-eligible public Mount keys, rule-facing “Choose 1
  Mount to discard” copy, local Cancel, and the unchanged provider/key payload.
  Unproven focus stays on the safe fallback; unprojected keys expose no
  selectable card and cannot submit. Browser proof passed 10/10 focused and
  59/59 for the complete target-card picker spec, including 320×568, 390×640,
  390×844, 480×900, and 1440×900 geometry, 44px controls, overlay hit blocking,
  payload, Cancel, and revision reset. Targeted ESLint and `git diff --check`
  passed. Pre-commit Actions run `37639976811` passed exact parent SHA
  `c7ec91770635261d83b2dac656dbd4bdf0ef1c59`. Reviewer acceptance is not
  claimed.

### UX2.REFINE-HERO-CONVERSION-RESPONSE-SKILLS-BAND-01 — Wusheng / Longdan response activation

- Focused browser proof covers Guan Yu red Peach→Attack, Zhao Yun Dodge→Attack,
  and Attack→Dodge. Only CurrentAction-projected providers enable the Skills-band
  controls; only the projected card is selectable; generic Action Row duplicates
  are absent; and the existing `respond` provider/card payload is preserved.
  Missing-provider states remain disabled. The spec passed 8/8 at 390×844 and
  1440×900; targeted ESLint and `git diff --check` passed. No production,
  gameplay, or projection changes. Reviewer acceptance is not claimed.

### UX2.REFINE-GENERIC-HERO-RESPONSE-SKILLS-BAND-01 — Mapped response providers

- Browser coverage proves Cao Cao Entourage and Liu Bei Influencing delegate
  without a local card, while Zhen Ji Empress Dowager enables only its
  CurrentAction-eligible black card. All three activate from the Skills band,
  have no duplicate Action Row entry, preserve exact `respond` payloads, and
  remain disabled when their provider is absent. The focused spec passed 9/9
  at 390×844 and 1440×900; targeted ESLint and `git diff --check` passed. No
  production or gameplay behavior changed. Reviewer acceptance is not claimed.

### UX2.REFINE-HUANG-GAI-SELF-SACRIFICE-SKILLS-BAND-01 — Self Sacrifice routing

- The Local Skills mapping now connects Huang Gai's existing
  `huang_gai_kurou` CurrentAction option to `Self Sacrifice`; the absent-option
  state stays disabled and no generic Action Row duplicate is rendered. The
  exact existing `trigger` payload passed browser checks at 390×844 and
  1440×900; the focused spec passed 3/3, targeted ESLint and `git diff --check`
  passed. No rules or server projection changed. Reviewer acceptance is not
  claimed.

### UX2.REFINE-SIMA-YI-NECROMANCY-SKILLS-BAND-01 — Necromancy card selection

- Browser proof covers the existing `sima_yi_guicai` CurrentAction option at
  390×844 and 1440×900: exactly its projected private Hand card is selectable,
  the generic Action Row has no duplicate activation, Confirm preserves the
  `trigger` provider/cardIds payload, and absence of the option leaves the
  Skills button disabled. The focused spec passed 3/3; targeted ESLint and
  `git diff --check` passed. No production, gameplay, or server-projection
  changes. Reviewer acceptance is not claimed.

### UX2.REFINE-CAO-CAO-TREACHERY-SKILLS-BAND-01 — Treachery routing

- Browser proof covers Cao Cao's existing `cao_cao_jianxiong` CurrentAction
  option at 390×844 and 1440×900: Treachery activates from the Skills band,
  has no generic Action Row duplicate, preserves the existing `trigger`
  provider payload, and stays disabled without the option. The focused spec
  passed 3/3; targeted ESLint and `git diff --check` passed. No production,
  gameplay, or server-projection changes. Reviewer acceptance is not claimed.

### UX2.REFINE-RETALIATION-OPAQUE-HAND-POSITIONS-01 — Authoritative Hand positions

- Sima Yi Retaliation now projects separate opaque `hand:n` keys and resolves
  the selected live position exactly; stale positions fail closed and the
  legacy grouped `hand` key remains compatible. CurrentAction privacy and exact
  card conservation are covered by API/unit proof. Focused validation passed:
  response-capability unit 1/1, Judgement API 12/12, Yue Jin API 4/4,
  Retaliation browser 10/10 at 390×844, 480×900, and 1440×900, build, targeted
  ESLint, and `git diff --check`. Pre-commit Actions run `37659752814` for exact
  parent SHA `1a12e56704edbb774077b4badb4b7d9edc057cac` completed success.
  Reviewer acceptance is not claimed.

### UX2.REFINE-LADY-GAN-SKILLS-BAND-ACTIVATION-01 — Divine Wisdom / Prudence

- The Local Skills mapping connects Lady Gan's existing
  `lady_gan_divine_wisdom` and `lady_gan_prudence` CurrentAction options to
  their Skills-band controls. Fixture-browser proof covers direct activation,
  authoritative target selection and exact payloads, no duplicate Action Row
  controls, and unavailable states without options: 5/5 at 390×844 and
  1440×900. Targeted ESLint and `git diff --check` passed. This is not §4D
  real-game reachability proof; Reviewer acceptance is not claimed.

### UX2.REFINE-REAL-SERVER-TO-BROWSER-PROOF-P1-01 — Validation foundation

- Removed the duplicate `CausalCreation` declaration that prevented the local
  `vinext dev` dependency scan; a real product `POST /api/rooms` create request
  returned HTTP 201. A production Worker browser test now creates a room through
  Host Game, adds real server-backed test seats, starts it, finishes hero
  selection, and reaches `.game-shell` with server-generated CurrentAction.
  Build, focused browser 1/1, targeted ESLint, and `git diff --check` passed.
  Pre-commit Actions run `37669875927` on exact parent SHA
  `2a4ed5f94c6694d8e0095f28f8e7c3d19a9103a4` completed success. Reviewer
  acceptance is not claimed.

### UX2.REFINE-UNIFIED-TARGET-CARD-MODAL-REAL-GAME-P2-01 — Real selection paths

- Supported Steal/Dismantle pending decisions and Retaliation/Frost Sword/
  Kirin Bow CurrentAction options now route to the shared target-card modal
  without requiring Stage Hero Focus, Inspect, or target-preview presentation.
  The unrelated legacy table picker was removed; unsupported/missing selection
  proof fails closed. Five real server-backed browser flows cover anonymous
  Hand positions, public Equipment/Judgment, exact selection and resolution;
  the focused browser specs passed 73/73 and the production build passed.
  Pre-commit Actions run `37675406650` on exact parent SHA
  `fa4c70fb0561ba918d4ec12f50753f5f61fcfda4` completed success. Reviewer
  acceptance is not claimed.

### UX2.REFINE-HERO-SKILLS-REAL-GAME-REACHABILITY-P3-01 — Roster audit

- The roster audit found that server-generated `lu_meng_keji` was unreachable
  from the Skills band because the UI registry used `lu-meng` instead of the
  implemented ID `lü-meng`. Corrected the key and removed a phantom active
  `sun_quan_jiuyuan` mapping; Deliverance remains a passive skill. A registry
  contract now accounts for all 46 skills across 30 implemented Heroes (32
  active trigger entries, 7 response provider IDs, 10 passive entries, and the
  Guan Yu/Zhao Yun conversion controls). Every mapped provider has existing API
  proof. Production browser proof covers real Composure activation and exact
  payload, real Empress Dowager response, plus existing real Assault and
  Retaliation paths. The roster unit suite passed 44/44 and the focused
  skill-family browser batch passed 137/137; build, targeted ESLint, and
  `git diff --check` passed. Pre-commit Actions run `37678414085` on exact
  parent SHA `42e736e60fc3a8998ebd3d358f8a1deff869993d` completed success.
  Reviewer acceptance is not claimed.

### UX2.REFINE-REAL-PRODUCTION-PATH-PARITY-P4-01 — Real interaction paths

- Real server-backed browser proof now covers single-target Negation open,
  first and counter responses, restored/cancelled settlement, Raining Arrows
  with and without an authoritative Dodge provider, and public/private Opponent
  Inspect at 390, 480, and 1440px. Repairs keep the viewer Hero Dock-only,
  remove duplicate Stage/Action Row guidance, restore the root only on its
  proven transition, and make every public Inspect zone reachable in the
  contained compact panel without exposing Hand identities. The focused
  production/settlement browser group passed 16/16; the PresentationV2 engine
  API suite passed 33/33; build, targeted ESLint, syntax checks, and
  `git diff --check` passed. Reviewer acceptance is not claimed.

### UX2.REFINE-MOBILE-TARGET-CARD-MODAL-LAYOUT-4C29-01 — Mobile zone clarity

- The real server-backed Burning Bridge and Steal picker now prioritizes the
  anonymous Hand choices while keeping public Equipment/Judgment readable.
  Browser proof covers mixed and single-zone states, selected-state geometry,
  four visible Hand positions, larger-Hand contained scrolling, touch-target
  size, and reachable actions at phone and wide layouts. The focused target-
  card browser group passed 89/89; Inspect geometry 3/3; fast tests 229/229;
  build, targeted ESLint, syntax checks, and `git diff --check` passed. Reviewer
  acceptance is not claimed.

### UX2.REFINE-STARGAZING-DECK-REORDER-4.10-01 — Real-path compact Stargazing

- Real server-triggered four-card Stargazing now keeps identifiable card faces
  persistent and ordered at 390×844, 480×900, 320×640, and 1440×900. The
  focused browser group passed 6/6, including the real completion payload,
  observer privacy, action-revision closure, fixed-modal/Dock geometry, pointer
  interception, and keyboard focus cycling. Build, targeted ESLint, syntax,
  and diff checks passed. Reviewer acceptance is not claimed.

### UX2.REFINE-TRANSIENT-EVENT-TIMERS-4A-01 — Private Draw evidence (partial)

- Real server-backed browser proof covers the ordinary two-card draw and an
  eight-card Sun Quan Equilibrium draw. Large Private Draw rows are keyboard-
  focusable and horizontally scrollable without document overflow; observer
  API/page privacy is preserved. Timer/menu and Guidance geometry passed at
  390×844, 480×900, and 1440×900. The §4A task is still open because active
  Bumper Harvest choice has no server-owned deadline or approved timeout rule.

### UX2.REFINE-MOBILE-TOP-DEAD-SPACE-P5-01 — Stable mobile top-row Seats

- A real four-player room measured the pre-fix top-row board gap at 55px with
  no visible board-status row. Mobile CSS now places the board within 12px of
  the play-table top; real-room geometry proof preserves seat alignment,
  readable card bounds, target-center hit ownership, system-cluster clearance,
  and zero horizontal overflow at 390×844 and 480×900. The subsequent CI run
  exposed that the initial inset shorthand also changed board height and left
  the Stage safe zone behind; the correction moves both top edges together,
  preserves horizontal seat tracks, and measures a 6–24px Seat-to-Stage gap.
  Reviewer acceptance is not claimed.

### UX2.REFINE-BUMPER-HARVEST-ACTIVE-CHOOSER-TIMER-4A-02 — 60-second choice clock

- Each active Bumper Harvest chooser now receives a fresh server-owned
  60-second deadline, projected consistently to viewers and rendered beside
  the lower-right System Menu. Expiry is display-only: it does not select a
  card, skip a chooser, or settle Harvest. Engine-backed API proof verifies
  expiry and deadline renewal; compact timer geometry is covered at 390×844,
  480×900, and wide. The 33-test API suite, 29-test focused browser batch,
  production build, targeted lint, and diff check passed. CI repair for the
  previous P5 failure is included with this task's change; Reviewer acceptance
  is not claimed.

### UX2.6-PHASE-A-ROOT-ACTION-PROJECTION-01 — Ordinary Attack root proof

- Added a viewer-equal public `rootAction` for an ordinary Attack only when
  Pending's typed continuation, active causal frame/checkpoint, single target,
  and exact linked public played-card event agree. Snapshot and client adapters
  independently reject mismatched proof; the public contract carries no
  physical card ID.
- An engine-backed Attack/Dodge room route proves projection for all viewers;
  stale card linkage, target mismatch, missing envelope, malformed snapshot,
  and incoherent client proof fail closed. Presentation/client tests passed
  101/101, targeted API tests 33/33, production build, targeted lint, and
  `git diff --check` passed. The physical-seat overlay and graph renderer remain
  open; Reviewer acceptance is not claimed.

### UX2.6-PHASE-A-ROOT-ACTION-OVERLAY-01 — Physical-seat Attack graph

- The proven ordinary Attack now renders as one `.game-shell` card node with a
  source tether and target arrow attached to existing player anchors. Missing,
  ambiguous, or zero-size anchors preserve the safe Interaction Stage fallback;
  the exact root event is removed from the settled-card layer only while its
  graph is ready. Real server-backed Attack → response → Dock Skip browser proof
  passed at 390×844, 480×900, and 1440×900 with no anchor movement, card/anchor
  overlap, or horizontal overflow. The focused browser group passed 3/3;
  Presentation client/snapshot tests 65/65; engine API tests 33/33; build,
  targeted ESLint, and diff checks passed. Dense 6–8 player geometry and
  remaining Section 6 phases are still open. Reviewer acceptance is not claimed.

### UX2.6-PHASE-A-DENSE-ANCHOR-GEOMETRY-01 — 6–8 player tables

- Extended the test-only room seeder to accept canonical Standard role sets
  from four through eight players. Real Attack → response → Dock Skip browser
  proof passed 7/7 across 4-player 390×844 / 480×900 / wide, 6-player 390×844,
  and 8-player 390×844 / 480×900 / wide. Measured assertions require a root
  card of at least 112×78 px, card containment and clearance from Seats and
  table controls, connector containment and clearance from unrelated Seats,
  no document overflow, and no Seat/Dock movement above 0.5 px. Target Dock
  Skip remained clickable. Production build, targeted ESLint, and diff check
  passed. Reviewer acceptance is not claimed.

### UX2.6-PHASE-A-SELF-TARGET-PEACH-PUBLIC-PROOF-01 — ordinary Peach self-target

- The normal wounded-player Play Phase Peach route now attaches explicit public
  source=self target proof to its exact played-card event. PresentationV2,
  Snapshot, and Client preserve viewer-equal proof without exposing a physical
  card ID; mismatched or ambiguous proof fails closed. The existing root-card
  overlay renders a single Peach near the real Local Dock with a source tether
  and restrained self halo, but no loop arrow or duplicate player/card.
- Real-gameplay browser proof passed at 390×844, 480×900, and 1440×900 with
  measured table containment, obstacle/tether clearance, no horizontal
  overflow, and Seat/Dock stability within 0.5 px. Presentation tests passed
  104/104, engine-backed API tests 34/34, build and targeted lint passed.
  Reviewer acceptance is not claimed.

### UX2.6-PHASE-B-ATTACK-DODGE-RESPONSE-PROOF-01 — submitted Dodge authority

- The server now attaches typed public counter proof only to a submitted
  physical Dodge that answers one exact ordinary Attack target effect. The
  projector, snapshot, and client adapter require unique event/card identity,
  matching root/response resolution, and coherent source/target/responder
  fields; malformed or ambiguous proof fails closed. The public contract is
  viewer-equal and carries no physical card IDs or private controls.
- An engine-backed API route proves no response fact exists before submission,
  then verifies the exact public Dodge proof for source, target, and observer.
  Presentation/client/snapshot and CI-failure regression tests passed 151/151;
  the API suite passed 34/34; the previously failing fast suite passed 236/236
  after the optional-field guard; build, targeted ESLint, and diff check passed.
  The subsequent Attack/Dodge visual grammar remains open. Reviewer acceptance
  is not claimed.

### UX2.6-PHASE-B-ATTACK-DODGE-RESPONSE-VISUAL-01 — Attack/Dodge counter graph

- A submitted Dodge now renders from its typed public proof beside the exact
  Attack target effect, with a visible interruption mark, a source tether, and
  no false Dodge-to-target arrow. Real server-backed browser proof passed 13/13
  across physical-anchor layouts, all three required viewports, and self-target
  Peach regression cases; PresentationV2 tests passed 38/38 and targeted lint
  passed without warnings. Remote parent `80ae488d4520d763e9c5383a35b588b846c7e4e6`
  Actions run `37742834438` was success before this task commit. Reviewer
  acceptance is not claimed.

### UX2.6-PHASE-B-NEGATION-EXACT-PUBLIC-EVENT-PROOF-01 — Negation event links

- Single-target Negation now exposes exact public timeline event/resolution
  references for its proven root card and every submitted Negation. Server
  projection matches private continuation identities only internally and
  omits the entire link proof if any event is missing, duplicated, or mismatched;
  Snapshot and Client revalidate the chain/order without forwarding physical
  card IDs or graph-internal node IDs to the display model. A real engine/API
  Steal → Negation → counter-Negation route proves links for all viewers,
  privacy, stale replay safety, and fail-closed bad root/response references.
  Presentation tests passed 109/109, the focused engine API file 34/34, and
  build, targeted ESLint, and `git diff --check` passed. The pre-commit exact
  remote head `a55d9b6cdd43f6fe47afe9db2442ce722b57fa66` passed Actions run
  `37745870122`; task commit `2ad5c51d83499b815f7e6d5b275d1d69402c0ebe`
  passed Actions run `37747526386` across all five jobs. Reviewer acceptance is
  not claimed.

### UX2.6-PHASE-B-NEGATION-ROOT-DISPOSITION-AUTHORITY-01 — Root effect state

- Projected the server-owned single-target Negation disposition as `ACTIVE` or
  `BLOCKED` through PresentationV2, Snapshot, and Client only when the root and
  every public response have exact event links and continuation depth/state
  agree. Engine-backed Steal → Negation → counter-Negation asserts ACTIVE →
  BLOCKED → ACTIVE for all viewers; malformed, missing, or unlinked authority
  withholds the disposition. Presentation tests passed 109/109, the focused
  engine API file 34/34, build, targeted ESLint, and `git diff --check` passed.
  Pre-commit parent `2ad5c51d83499b815f7e6d5b275d1d69402c0ebe` passed Actions
  run `37747526386`. Reviewer acceptance is not claimed.

### UX2.6-PHASE-B-NEGATION-FIRST-RESPONSE-GRAPH-01 — First Negation graph

- The physical-seat overlay now renders the public root and first Negation from
  exact event/resolution links. The submitted responder's actual seat tethers
  to the response card, the response explicitly counters the root, and the
  root-to-target relation is subdued only for authoritative `BLOCKED` state.
  Open Negation remains placeholder-free; missing responder anchors retain the
  existing safe Stage fallback. A real Dismantle → open window → third-party
  Negation browser path passed 2/2, including 390×844 / 480×900 / wide graph
  geometry, stable root and seat anchors, Stage/Dock separation, no horizontal
  overflow, privacy, and fallback. Attack → Dodge graph regression passed 3/3;
  build, targeted ESLint, and `git diff --check` passed. The pre-commit parent
  `1e2ca29a339ff357afe4a11474b9d03a15699625` passed Actions run `37748618291`.
  Reviewer acceptance is not claimed.

### UX2.6-PHASE-B-NEGATION-COUNTER-CHAIN-GRAPH-01 — Counter-Negation graph

- The public single-target Negation graph now renders each server-proven
  response node with a display-safe counter target, tether to its actual
  physical actor, and an explicit edge to the exact root/previous response.
  Older responses are subdued; the root-to-target relation is active only for
  authoritative `ACTIVE` state. A real Dismantle → open Negation → Negation →
  counter-Negation browser path passed 2/2 with public viewer-equal causal
  proof, fixed root geometry, seat/card/connector containment, no Stage/Dock
  overlap, and no horizontal overflow at 390×844, 480×900, and wide. The
  Attack/Dodge regression passed 3/3, presentation-client tests 55/55, build,
  targeted ESLint, and `git diff --check` passed. The pre-commit latest Actions
  run `37750629004` succeeded on `3a9db67561ad2af3866056085bad205c5ffa72eb`.
  Reviewer acceptance is not claimed.

### UX2.4.10-STARGAZING-DRAG-DROP-01 — Three-zone private deck arrangement

- Real server-triggered Stargazing now presents ordered Top / Revealed / Bottom
  zones with hold-to-drag touch/pointer input, visible insertion feedback,
  keyboard/screen-reader Move controls, and contained edge auto-scroll. Card
  ownership and order remain exact; completion submits the existing
  `topCardIds` / `bottomCardIds` contract. The real gameplay browser suite
  passed 4/4 at 320×640, 390×844, 480×900, and 1440×900, including viewer
  privacy, geometry, cancellation, and exact submitted/deck order. The focused
  Stargazing API suite passed 8/8; build, targeted ESLint, and `git diff
  --check` passed. Pre-commit Actions run `37754303907` succeeded on exact
  parent SHA `1a8492e46c84764b6ed12cbf9c0ffc9951ca54ae`. Reviewer acceptance is
  not claimed.

### UX2.6-PHASE-C-DUEL-PERSISTENT-ROOT-AUTHORITY-01 — Duel exchange proof

- PresentationV2 now links the exact persistent public Duel root to each
  accepted Attack response using the live server continuation's semantic
  direction and a monotonic response ordinal. Snapshot and Client revalidate
  root/frame/checkpoint/scene coherence and discard physical card IDs. The
  server-backed physical Duel and delegated Liu Bei Jijiang → Guan Yu Attack
  flows prove stable root identity and distinguish the semantic decision actor
  from the actual submitter; malformed, missing, duplicate, or mismatched links
  fail closed. Presentation/client/snapshot tests passed 112/112; focused API
  tests passed 51/51; build, targeted ESLint, and `git diff --check` passed.
  Before-commit parent `8ea13ff1322a18e58c2d70cffe624071bbe447a5` passed Actions
  run `37758953873`. Duel graph rendering remains open; Reviewer acceptance is
  not claimed.

### UX2.6-PHASE-C-DUEL-EXCHANGE-GRAPH-01 — Persistent Duel graph

- The physical-seat overlay keeps one stable Duel root and shows only the
  latest server-proven Attack response. The response submitter's physical
  source tether is distinct from the semantic decision actor and authoritative
  response target arrow, including delegated Liu Bei Jijiang. Server-backed
  physical and delegated browser scenarios passed 5/5 at 390×844, 480×900, and
  1440×900; the existing Attack/Dodge graph regression passed 13/13. Build,
  targeted ESLint, and `git diff --check` passed. Exact pre-commit parent
  `e2761413c5f60f78ffdbb6285f752509a063963f` Actions run `37762264558` had one
  initial synthetic-touch Stargazing failure; the same-SHA rerun passed all
  five jobs. Reviewer acceptance is not claimed.

### UX2.6-PHASE-C-GROUP-TARGET-BRANCH-GRAPH-01 — Multi-target root graph

- The physical-seat overlay now keeps one Group root card stable while public
  target branches reflect authoritative Raining Arrows / Barbarian Invasion
  participant progress. Real server-backed browser paths passed 6/6 across
  390×844, 480×900, and 1440×900, including participant advancement, seat/root
  stability within 1px, source/target branch endpoints within 1.5px of their
  physical anchors, no card/Seat/Dock overlap or horizontal overflow, private
  Hand exclusion, and fail-closed fallback. Real Dock damage/Dodge paths passed
  2/2; the Duel/root graph regression passed 18/18. Build, targeted ESLint, and
  `git diff --check` passed. Before-commit parent
  `3fe0592c56b861138ccfc05ba14f8f2b97bb634e` passed all five Actions jobs in
  run `37767512338`. Reviewer acceptance is not claimed.

## Known deferred semantic gaps

These remain incomplete; where authoritative projection does not exist,
behavior must continue to fail closed:

- Public AOE outcomes beyond Raining Arrows `Avoided`, Raining Arrows / Barbarian
  Invasion `Damaged`, and Raining Arrows / Barbarian Invasion `Negated`, plus
  unrelated Group semantics, remain deferred.
- Cross-frame and post-settlement Reaction Chain history beyond the active
  Negation continuation's proven linked nodes.
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
