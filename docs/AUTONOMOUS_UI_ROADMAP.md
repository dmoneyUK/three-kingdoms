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
  returned HTTP 201. The refreshed production-Worker browser proof submits the
  actual Host Game form, asserts its create payload contains no handcrafted
  action/presentation authority, adds server-backed test seats, starts the
  match, selects only server-projected hero options, and reaches `.game-shell`
  with server-generated CurrentAction and revision. It avoids the test seed
  route. A local `vinext dev` check confirmed the form becomes interactive once
  hydration completes; the browser proof waits for Host Game to be enabled.
  The focused browser spec passed 1/1; syntax, targeted ESLint, and
  `git diff --check` passed. Exact pre-commit HEAD
  `544bc932e4a0a989d6a050d53ffae35599c86445` passed Actions run `37786601383`
  on attempt 2 (all five jobs); attempt 1's Browser Worker exit and subsequent
  connection failures did not reproduce in the retry or the 408-test local
  shard. Reviewer acceptance is not claimed.

### UX2.REFINE-UNIFIED-TARGET-CARD-MODAL-REAL-GAME-P2-01 — Real selection paths

- The real server-backed browser spec retains one production page from actual
  Steal/Burning Bridge play or Hero/equipment trigger through server-generated
  CurrentAction, unified modal, and exact submission (no reload). It proves
  all five flows—Steal, Burning Bridge, Retaliation, Frost Sword, and Kirin
  Bow—at 14/14, including opaque Hand privacy, public Equipment/Judgment,
  effect-specific actions, no legacy picker, and mixed-zone geometry at
  390×844, 480×900, and wide. Grouped-Hand compatibility remains inside the
  same picker language. Visible Burning Bridge copy follows the later §4C.15
  naming amendment (`a8f0ec65`), which postdates the §4D P2 wording
  (`268c4f85`); internal `Dismantle` identifiers remain unchanged. The code
  proof was covered by Actions run #941 (`37895174379`), successful on exact
  validation SHA `b55ca795e85b612fa5a320426f9686b298f69e29`, including both
  Browser shards. This is real server-backed browser proof, not a deployed-game
  screenshot or Reviewer acceptance.

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

### UX2.REFINEMENT-PRE-SECTION-6-GATE-REVALIDATION-01 — Current prerequisite evidence

- Rechecked the final gate on the current implementation: P4 real Negation,
  Raining Arrows, and server-projected Inspect passed 7/7; P5 real-room Seat
  geometry passed 2/2 at 390×844 and 480×900. §4A Private Draw/Harvest timer
  cases passed 15/15 across the real-gameplay and presentation specs; §4B
  compact Inspect cases passed 20/20, with real server-backed Inspect also
  covered at 390, 480, and 1440px. Together with the recorded P1–P3, §4.10,
  and §4C.29 evidence, these refinement prerequisites are closed for Section 6
  planning. This is implementation/test evidence, not Reviewer acceptance.

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
  parent SHA `1a8492e46c84764b6ed12cbf9c0ffc9951ca54ae`. The 8 Oct reviewer
  re-opened this same task for production-path ordering proof; follow-up browser
  assertions now verify no POST during local arrangement and that the exact
  visible Top order is submitted and drawn by the server. That browser suite
  passed 4/4; API passed 8/8, targeted ESLint and `git diff --check` passed.
  Pre-commit remote SHA `9ac6f5042e1405375dd7046d59ac10a1a2964b9a` passed run
  `37809951259`. Reviewer acceptance is not claimed.

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

### UX2.6-PHASE-C-GROUP-TARGET-EFFECT-SCOPE-AUTHORITY-01 — Scoped Group Negation proof

- PresentationV2 now exposes a `GROUP_TARGET_EFFECT` scope only when the
  server-owned Negation `effectTargetId` agrees with the Group frame's sole
  active target branch, its `CURRENT` participant proof, source/card identity,
  interaction, checkpoint, and presentation revision. Snapshot and Client
  independently revalidate it and preserve viewer equality; malformed or
  missing Group proof fails closed, while ordinary single-target Negation
  remains compatible. The real API suite passed 34/34, PresentationV2 / Snapshot
  / Client suites passed 114/114, and build, targeted ESLint, and `git diff
  --check` passed. No new browser geometry was introduced. Exact pre-commit
  parent `c0e7921b2ac29ddb34847dd16227c853a6b0c3cd` passed all five Actions jobs
  in run `37770799050`. Reviewer acceptance is not claimed.

### UX2.6-PHASE-C-GROUP-TARGET-EFFECT-COUNTER-GRAPH-01 — Group Negation graph

- The physical-seat graph now remains rooted through real Group Negation
  chains: the first response counters the server-proven target-effect branch,
  subsequent responses counter their exact prior Negation, and only the
  affected branch changes between blocked and restored. A real browser audit
  found and fixed a production adapter gap where nested Group response nodes
  lost their public counter target because Group roots have no ordinary
  root-card field; malformed or missing links still fail closed. The browser
  file passed 12/12 for Raining Arrows and Barbarian Invasion at 390×844,
  480×900, and 1440×900, including open/first/counter states, stable root and
  seat geometry, actor/source and branch endpoints, containment, and no
  horizontal overflow. PresentationV2 / Snapshot / Client tests passed 114/114;
  focused API tests passed 34/34; build, targeted ESLint (zero errors; CSS
  ignored), and `git diff --check` passed. Exact pre-commit parent
  `b14c27117c5b758c178e88f4bf844ff530706038` passed push Actions run
  `37772868829`. Reviewer acceptance is not claimed.

### UX2.6-PHASE-D-NEGATION-CHAIN-COMPACTION-01 — Long public response chains

- The physical-seat graph keeps the proven root and newest committed Negation,
  compacts older responses into an attached `+N` history node, and connects the
  newest counter relation to that node. This preserves the single-target root
  disposition and the exact Group target-effect branch state. Real
  server-backed single-target and Raining Arrows chains passed 6/6 at
  390×844, 480×900, and 1440×900 with stable root geometry, source tether,
  counter endpoint, privacy, containment, and no horizontal overflow. Build,
  targeted ESLint, `node --check`, and `git diff --check` passed. Exact
  pre-commit parent `21c055269182590b450e65477cc84ed2d0519d75` passed Actions run
  `37777442409`. Playwright captured screenshots; no manual visual acceptance
  is claimed.

### UX2.4A-BUMPER-HARVEST-60S-REAL-GAMEPLAY-PROOF-01 — Active chooser timer

- The existing production path already assigns each active Bumper Harvest
  chooser a server-owned 60-second deadline and projects it to the compact
  lower-right timer. Added a real server-backed browser path that starts the
  card from the Local Dock, verifies the first chooser, submits a legal choice,
  and verifies the next chooser receives a fresh deadline. Responsive geometry
  passed at 390×844, 480×900, and 1440×900, including the timer-only visibility
  delta, System Menu/Guidance stability, and no timer overlap or page overflow.
- Focused browser spec passed 1/1; `node --check`, targeted ESLint, and
  `git diff --check` passed. Exact pre-commit head
  `3486caee8e7555aa979d676ef4e06f318658118b` passed Actions run `37782474909`.
  The live-path measurement also found the active choice panel was wider than a
  390px viewport; that gap was closed by the bounded fit task below. Reviewer
  acceptance is not claimed.

### UX2.4A-BUMPER-HARVEST-MOBILE-CHOOSER-FIT-01 — Active choice containment

- The real server-backed chooser exposed a 459px panel at a 390px viewport.
  The grid item retained its min-content width from the four-card row. The
  panel now has a shrinkable viewport cap; the mobile card row adapts its card
  scale and spacing so four choices fit together, while larger sets retain
  contained horizontal scrolling. At 320×740 the panel measured 296px wide
  (12px side margins), and all four 52px cards plus the local Confirm control
  remained visible and inside the row.
- The focused production-path browser spec passed 1/1 at 320×740, 390×844,
  480×900, and 1440×900; panel/card containment, timer,
  menu, Guidance/Dock, and page-overflow assertions passed. `npm run build`,
  `node --check`, targeted ESLint, and `git diff --check` passed. Exact
  pre-commit HEAD `a68472626272680e67c53b6a4e2cfb67e16a90e1` passed Actions run
  `37784998759` with all five jobs successful. No manual screenshot acceptance
  is claimed.

### UX2.6-PHASE-D-SOWING-DISTRUST-EFFECT-NODE-01 — Public skill source graph

- A real Sowing Distrust activation now carries source/target/effect identity
  on its exact public event, with the matching event ID preserved in the
  authoritative hero-choice continuation. PresentationV2 requires the exact
  unique root, matching public metadata, current decision actor, and ready-after
  barrier; Snapshot/Client preserve the proof and malformed or duplicate proof
  fails closed. The Stage renders one compact `HERO SKILL — SOWING DISTRUST`
  node with a physical-seat tether and target arrow, without a physical-card
  identity or hidden-Hand leakage.
- A no-reload, server-backed two-player browser path activates the skill, then
  submits its suit choice and reaches the anonymous `hand:0` picker. Geometry
  stayed stable within 1px across the choice transition; the node remained in
  the Stage, clear of Seats/Dock, with connectors attached to the source and
  target anchors and no horizontal overflow at 390×844, 480×900, and 1440×900.
  Screenshots were retained for all three sizes. API passed 35/35, browser 3/3,
  build, targeted ESLint, and `git diff --check` passed. Exact pre-commit parent
  `f8f0f52d2bcd99286ace78e98b15227353dd03e9` passed Actions run `37795579452`.
  Settlement hold/exit remains the next bounded lifecycle task; Reviewer
  acceptance is not claimed.

### UX2.6-PHASE-A-DISMANTLE-ROOT-OVERLAY-01 — Dismantle target decision root

- The real Burning Bridges target-card decision now retains a root causal frame
  only when the authoritative source, target, exact held Dismantle, Negation
  settlement, and causal envelope agree. PresentationV2, Snapshot, and Client
  bind the root node to the unique exact public played-card event; absent or
  mismatched proof fails closed. Public proof is viewer-equal and excludes
  physical-card IDs and hidden target-Hand identities. The approved Burning
  Bridge picker remains above the graph per §6.18 layering.
- Focused API passed 22/22, PresentationV2 engine passed 36/36, and real-gameplay
  browser passed 17/17, including 390×844, 480×900, and 1440×900 geometry,
  Stage/Dock containment, source/target connectors, modal selection, and
  fail-closed/privacy assertions. Build, targeted ESLint, and `git diff --check`
  passed. Pre-commit parent `a40cfe2068a58c1a03dd66f34fd4a3586f26be96` passed
  Actions run `37812094451`. Reviewer acceptance is not claimed.

### UX2.6-PHASE-A-STEAL-ROOT-OVERLAY-01 — Steal target decision root

- The real Steal target-card decision now carries a physical-seat root graph
  bound to the unique exact public Steal play, source, target, and authoritative
  settlement frame. API and browser proofs cover the real target-card path,
  viewer-equal public identity, hidden-Hand privacy, selection submission, and
  graph/modal containment at 390×844, 480×900, and 1440×900. The API set passed
  58/58; the real-gameplay root-overlay browser set passed 20/20. Build,
  targeted ESLint, and `git diff --check` passed.
- The pre-commit parent `2c9f4fc6876513f4bae8c536d65f7f25c6c7a6b4` failed
  Actions run `37814577369` in browser shard 1/2. CI-config reproduction
  isolated the failure to Dismantle root proof rejecting the legitimate held
  root card when Negation cards were held alongside it; the browser parity
  assertion also still expected the superseded Stage composition. The proof
  now requires one exact held root card of the expected kind, and the parity
  browser test checks the physical root graph. Its focused CI-config rerun
  passed 1/1. The repair is included with this task; CI for the resulting
  commit is not yet observed. Reviewer acceptance is not claimed.

### UX2.6-PHASE-C-OATH-SIMULTANEOUS-ROOT-GRAPH-01 — Oath simultaneous root

- Oath's proven wounded-recipient scope and exact public root event now render
  as one stable physical-seat root with simultaneous branches. A wounded source
  is represented by a Dock halo, with no target-arrow loop or invented ordered
  participant; exact public Negation/counter-Negation links and branch
  active/blocked states remain authoritative. Real server-backed browser proof
  covers the full Oath → Negation → counter-Negation path and responsive
  geometry at 390×844, 480×900, and 1440×900. Presentation/API suites passed
  114/114 and 36/36; generic root-overlay browser regressions passed 37/37;
  build, targeted ESLint, and `git diff --check` passed.
- The pre-commit remote base `67853334984d7aaf91018570f6011f4e9a71b35c` failed
  Actions run `37818587607`: Browser shard 2/2 had 416/417 passing, with a
  timing-sensitive Sowing Distrust exit-state assertion failing after its
  transient node had been removed. Replaced the instantaneous DOM-state check
  with MutationObserver proof of the exit class/attribute, removal, and the
  same bounded lifecycle durations; focused browser reproduction passed 1/1.
  CI for the resulting commit is pending. Reviewer acceptance is not claimed.

### UX2.6-PHASE-C-BUMPER-HARVEST-ORDERED-ROOT-GRAPH-01 — Ordered Bumper root

- Bumper Harvest now keeps one exact public root card and physical-seat source
  tether while its server-proven ordered target branches advance through
  target-scoped Negation, counter-Negation, and chooser selection. Public
  counter links and ACTIVE/BLOCKED target effect state remain bound to the
  exact root/participant proof; the Local Dock retains private chooser controls
  and its server-owned timer. A real server-backed browser path passed 1/1,
  measuring stable root geometry, branch/source/counter endpoints, containment,
  no Seat/Dock overlap, and no horizontal overflow at 390×844, 480×900, and
  1440×900. Combined Bumper/Group graph browser tests passed 13/13;
  Presentation passed 122/122; engine/API passed 36/36; Oath browser regressions
  passed 11/11 after repairing the CI fixture's out-of-scope
  `negationNodeCount` reference. Build, targeted ESLint, and `git diff --check`
  passed. Parent `936c8b2f830cb004d189144c190d1a191af6c446` failed run
  `37824882092` only on the two Oath visual-gate fixture crashes; CI for the
  repair-and-feature changeset is pending. Reviewer acceptance is not claimed.

### UX2.6-ATTACK-ROOT-GRAPH-LEGACY-ROUTING-01 — Attack reveal convergence and visual clarity

- Ordinary Attack now keeps the legacy composition visible until its exact
  server-proven graph is geometrically ready, then atomically removes the Stage
  and table reveal. RAF traces record proof/event/source/target, display mode,
  visible root card, and the Inspect/geometry fallback gate; both fallbacks
  restore the graph when cleared. A real server-backed 4/6/8-player matrix
  passed 11/11 across 390×844, 480×900, and 1440×900, including submitted
  Dodge and reduced-motion settlement. Browser measurements confirmed straight
  source/target paths, 4.8px source tether, 6.5px target arrow, 20px marker,
  and 4.5px gold halo; proof-to-graph was bounded to ≤250ms. `npm run build`,
  split targeted ESLint, and `git diff --check` passed. One initial two-worker
  run had two 8-player target-page sessions remain at the lobby; those exact
  layouts and the complete two-worker 11/11 matrix passed on rerun. Latest
  pre-commit Actions run `37839750886` (#918) succeeded on code SHA
  `84cfe44d1506f2a486d14da27259734440875231`; no post-deploy screenshot or
  Reviewer acceptance is claimed.

### UX2.6-FINAL-AOE-POST-ATTACK-ROUTING-REVALIDATION-01 — Final AOE recheck

- Revalidated real server-backed Raining Arrows, Barbarian Invasion, Oath, and
  Bumper Harvest graph paths after Attack reveal convergence. The focused
  browser matrix passed 14/14 at 390×844, 480×900, and 1440×900, including
  Negation/counter-Negation and ordered/simultaneous branches. Oath geometry
  proof now polls measured endpoints after viewport changes instead of trusting
  a stale ready marker; the original ≤2px endpoint threshold is unchanged.
  Fresh screenshots and geometry are retained in the Playwright report.
  Parent SHA `d124878089c27a5baa3f5e94410d85249e62c8e6` passed Actions run
  `37844615401` attempt 2 (all five jobs); attempt 1 had a Wrangler/Miniflare
  worker network disconnect followed by cascading browser connection failures.
  Reviewer acceptance is not claimed.

### UX2.6-PHASE-D-DISMANTLE-SETTLEMENT-LIFECYCLE-01 — Dismantle settlement

- A committed real Dismantle target-card choice now receives a server-authored,
  fail-closed public settlement proof linked to the exact played Dismantle root
  and resolution. The semantic proof carries no selected-card identity; the
  selected card appears only in the ordinary public discard event after the
  rules resolve. The physical-seat root graph shows an accessible resolved
  state for 0.4–0.8 seconds before its fade, with a shorter no-exit reduced-
  motion path; the settlement reveal does not duplicate the discard card or
  move the root, Seats, Stage, or Dock.
- Real server-backed API coverage passed 22/22; PresentationV2 engine coverage
  passed 36/36; room-safety and client tests passed 63/63; production browser
  coverage passed 4/4 at 390×844, 480×900, and 1440×900, including reduced
  motion. Build, targeted ESLint, and `git diff --check` passed. The exact
  pre-commit parent `2398922fc38d56ff3163d69c81ffe3c321ee080a` passed Actions
  run `37847604812` (#920); the exact Dismantle commit then passed all five
  jobs in Actions run `37849530213` (#921). Reviewer acceptance is not claimed.

### UX2.6-PHASE-D-STEAL-SETTLEMENT-LIFECYCLE-01 — Steal settlement

- A committed real Steal target-card choice now receives a server-authored,
  fail-closed settlement proof linked to the exact public Steal root and
  resolution. The public proof and settlement message never identify the
  acquired card; the physical card remains visible only to its owner. The
  physical-seat root graph holds an accessible resolved marker for 0.4–0.8
  seconds before fade, with a shortened no-exit reduced-motion path. Real
  server-backed API coverage passed 23/23; room-safety/client coverage passed
  64/64; the real-gameplay browser path passed 4/4 at 390×844, 480×900, and
  1440×900 plus reduced motion, measuring stable Stage/Dock/Seat geometry and
  hidden-Hand privacy. Build, targeted ESLint, and `git diff --check` passed.
  The exact pre-commit parent `431644d33c077c26119ba7329797ce6617510adb`
  passed Actions run `37849530213` (#921), all five jobs. CI for the Steal
  changeset remains pending after push. Reviewer acceptance is not claimed.

### UX2.6-PHASE-D-ORDINARY-ATTACK-HIT-SETTLEMENT-01 — Ordinary Attack hit

- A direct, single-target ordinary Attack that applies damage without a Dodge
  or intervening response now receives a fail-closed public settlement proof
  bound to the exact root event, resolution, source, and target. The resolved
  root graph remains visible for the designed brief interval while Local Dock
  Guidance keeps stable geometry; reduced-motion users receive the shorter
  non-animated path. Prevented, zero-damage, Dying, delegated, and Group paths
  do not receive this proof.
- Real server-backed API coverage passed 37/37; Presentation/client and
  room-safety coverage passed 65/65; the real Attack browser path passed 4/4
  at 390×844, 480×900, and 1440×900 plus reduced motion, measuring Seat, Stage,
  and Dock geometry. Production build and targeted ESLint passed. The exact
  pre-commit parent `0e5546ef800d345256f6024b631169cd1da6b605` failed Actions
  run `37851251438` (#922) in both browser shards on the Wrangler ProxyWorker
  `Network connection lost.` failure. A capped CI-only recovery with focused
  policy tests was bundled into commit `457d12444ae41da2e264344f79ee212cb1fcaa0d`;
  that exact SHA passed all five Actions jobs in run `37855563197` (#923).
  Reviewer acceptance is not claimed.

### UX2.6-PHASE-C-RAINING-ARROWS-SETTLEMENT-HOLD-01 — Raining Arrows settlement

- Added a server-authored, fail-closed Raining Arrows final settlement proof
  bound to the exact played root, resolution, causal frame, source, and ordered
  terminal participants. Viewer snapshots remain equal and privacy-safe. The
  physical-seat graph takes priority over a still-present progress projection
  during the brief resolved hold, then exits; reduced motion uses the shorter
  no-exit path. A real server-backed browser check measures root position,
  opponent-seat geometry, Dock boundary/connector, branch outcomes,
  containment, and hidden-hand privacy.
- The focused settlement browser cases passed 2/2 at 390×844 and 1440×900
  reduced motion; the complete related Group graph spec passed 14/14 with two
  workers. Attack root revalidation passed 7/7; projection/snapshot passed
  59/59; room-safety/supervisor passed 11/11. Build, targeted ESLint, and
  `git diff --check` passed. An initial four-worker run had four page-open
  failures that remained at the lobby; the full file passed on the two-worker
  rerun. Parent Actions run `37858015569` (#924), exact SHA
  `bcfda64df7ea5fb860cc4aeea80cf73ae7d5cb1b`, failed only browser shard 1 after
  Wrangler's known ProxyWorker network disconnect. The supervisor mismatch
  (`exitCode` versus the caller's `code`) is repaired with a focused regression
  in the same changeset; outgoing CI is pending. Reviewer acceptance is not
  claimed.

### UX2.6-PHASE-C-BARBARIAN-INVASION-SETTLEMENT-HOLD-01 — Barbarian Invasion settlement

- Extended the server-authored Group settlement proof to Barbarian Invasion,
  binding exact root event/resolution/frame, source, and ordered terminal
  participant outcomes. Viewer snapshots remain equal and privacy-safe; malformed
  and stale proof fails closed. Real server-backed browser coverage measures the
  settled graph, branch outcomes, fixed Seats, Dock containment, hidden-Hand
  privacy, and reduced-motion exit at 390×844 and 1440×900. The related Group
  graph spec passed 16/16; the repeated lost-pointer-capture regression passed
  3/3; `npm run test:fast` passed 252/252; build, targeted ESLint, and
  `git diff --check` passed. Parent Actions run `37860968183` (#925), exact SHA
  `07c2d5dd8e0f827d0b3e6d7408cf15ffbb0def0f`, failed in fast tests on two stale
  `groupSettlements` fixtures/assertions and browser shard 2 on lost-pointer-
  capture cancellation. Both are repaired with focused proof in this changeset;
  outgoing Actions remain pending. Reviewer acceptance is not claimed.

### UX2.6-PHASE-C-BUMPER-HARVEST-SETTLEMENT-HOLD-01 — Bumper Harvest settlement

- The real server flow now attaches a privacy-safe terminal settlement to the
  exact Bumper Harvest root, resolution, interaction, and frame, with the
  complete ordered participant outcomes and no selected-card IDs. The
  physical-seat graph remains through a measured normal hold and shorter
  reduced-motion hold; its root, Seat/Dock anchors, containment, and viewer-
  equal public proof are checked in real gameplay. API tests passed 37/37,
  projection/client/privacy tests 127/127, and the Bumper Harvest browser path
  passed 1/1. Stargazing now cancels a lost capture in a document capture-phase
  listener matched to the active pointer ID, and its browser assertion waits
  for the newly observed matching release; the focused scenario passed 3/3.
  Targeted ESLint, build, and `git diff --check` passed. Parent
  Actions run `37862129812` on exact SHA
  `bc03b1df37c1d83cb3c0f738b86956189bd9ac5c` failed only Browser shard 2
  (422/423 browser cases passed); the CI repair is bundled into this changeset
  and the outgoing Actions result is not yet observed. Reviewer acceptance is
  not claimed.

### UX2.6-PHASE-D-ATTACK-GRAPH-ROUTING-CONSISTENCY-01 — Attack mode diagnosis

- Real production-path Attack tests found no routing defect: after public root
  proof and anchor measurement, graph mode owns the composition; missing
  geometry and Inspect intentionally restore the safe Stage. Ordinary Attack
  paths measured straight with 4.8px source, 6.5px target, 20px marker, and
  4.5px target halo; the server-proof-to-graph handoff remained within 250ms.
  The matrix passed 26/26 before route assertions and 14/14 after asserting
  `display-mode`, `layout-state`, and absence of fallback reason through Attack,
  Dodge, and settlement. Parent Actions run `37865225311` failed on a stale
  fast-test client-view fixture and a browser lost-pointer-capture event not
  observed until native pointer input; both focused repairs are in the outgoing
  changeset. Reviewer acceptance is not claimed.

### UX2.6-PHASE-D-ATTACK-GRAPH-CONTINUITY-01 — Ordinary Attack stability

- Added public root-identity diagnostics and a test-only RAF classifier so
  graph frames can be matched to the exact server-proven interaction. The
  production-path browser case passed twice across ten independently seeded
  4/6/8-player Attack windows, with attacker and defender pages at 390×844,
  480×900, and 1440×900. In the 12.9-second 4-player mobile observation both
  viewers recorded 776 consecutive `graph-visible` frames (maximum 20ms gap)
  and 13 room polls retaining the same public root identity; no fallback,
  hidden edge, duplicate Stage, overflow, or Seat/Dock movement was observed.
  Representative screenshots and frame/poll/geometry evidence are attached to
  the local Playwright HTML report. This does not reproduce or identify the
  user's specific intermittent session; missing proof, local Inspect/Preview,
  reveal handoff, and unavailable geometry remain intentional fail-closed
  fallbacks. Build, focused browser test, targeted ESLint, and `git diff
  --check` passed. Pre-commit Actions run `37866279249` succeeded on its exact
  SHA; this task's outgoing SHA is not yet validated. Reviewer acceptance is
  not claimed.

### UX2.6-PHASE-D-ATTACK-CONNECTOR-VISIBILITY-01 — Distinct Attack ribbons

- Ordinary Attack authorship now uses a straight 4px green source ribbon with
  no arrow; direction uses a straight 7px red target ribbon with a 30×22px
  marker. A successful Dodge's public source tether is straight green at
  3.5px. Screenshot review covered 390×844, 480×900, wide, and supported dense
  graphs. Browser evidence checks path shape, computed strokes, marker size,
  containment, and card geometry.
- Repairing CI exposed stale pre-CardFace dimensions, dense cases that asserted
  graph visibility despite approved safe fallback, unsupported layouts inside
  the repeated-graph-only matrix, and a Dodge helper waiting on a client
  response instead of the subsequent server proof. Assertions now reflect the
  approved size/fallback contract; Dodge observation waits for the submitted
  request while the existing authoritative room projection remains the
  success proof. Build, targeted ESLint, `git diff --check`, and the focused
  server-backed browser matrix passed 12/12. Reviewer acceptance is not
  claimed.

### UX2.6-PHASE-D-ATTACK-CARD-FACE-SCALE-01 — Authentic Attack/Dodge cards

- The real server-backed Attack root and successful Dodge now render genuine
  portrait `CardFace` artwork. Collision-aware sizing keeps the root stable
  (≤1 CSS px) as Dodge appears; unsupported dense geometry fails closed rather
  than forcing overlap. The focused browser matrix passed 7/7 at 390×844,
  480×900, 1440×900, and dense 6/8-player layouts; build, targeted ESLint,
  `git diff --check`, and Wrangler supervisor tests (3/3) passed. The exact
  pre-commit Actions run `37869008461` failed only Browser shard 1 after the
  known ready ProxyWorker network-disconnect caused port 3137 refusals and 71
  cascading failures. A bounded restart-policy repair is included with this
  task; outgoing Actions validation remains pending. Reviewer acceptance is
  not claimed.

### UX2.6-PHASE-D-ATTACK-WHOLE-SEAT-DOCK-HIGHLIGHT-01 — Full Attack target emphasis

- Attack target emphasis now follows the authoritative physical player anchor
  and covers the complete opponent Seat or local Dock, rather than only the
  Hero portrait. The active ring is 3.5px with an 18px restrained red glow;
  the public, proof-backed Dodge-blocked state reduces it to a neutral 2px
  ring/8px glow at 40% opacity. The SVG overlay remains pointer-transparent
  and does not change Seat/Dock geometry.
- Six real server-backed browser cases passed at 390×844, 480×900, and
  1440×900, measuring full-anchor coverage for opponent and local targets,
  stable layout, normal Inspect/Dodge/Confirm interaction, and active-to-blocked
  state. Fresh active/blocked screenshots were visually reviewed. Build,
  targeted ESLint, and `git diff --check` passed. The exact pre-commit parent
  Actions run and outgoing validation are recorded in HANDOVER. Reviewer
  acceptance is not claimed.

### UX2.6-PHASE-D-ATTACK-DODGE-CARD-INTERCEPTION-01 — Physical Dodge interception

- The real server-proven Dodge now physically intercepts the incoming red
  Attack path, while its actual player's green source tether remains
  arrowless. The Attack root remains stable; placement checks collision,
  path projection, and the card/path contact, with a measured adjacent-contact
  fallback or fail-closed Stage when no safe position exists. No Dodge-to-target
  arrow, counter triangle, or misleading Dodge status is rendered.
- Real server-backed interception geometry passed 7/7 at 390×844, 480×900,
  1440×900, and dense 6/8-player scenes; unsupported dense placement safely
  falls back. The §6.27.4 stability regression passed 1/1 across ten distinct
  ordinary Attack rooms, both participants, repeated public room polling, and
  continuous RAF samples including a 13-second mobile observation. Build,
  targeted ESLint, `git diff --check`, and visual screenshot review passed.
  Reviewer acceptance is not claimed.

### UX2.6-PHASE-D-ATTACK-MOBILE-GEOMETRY-REMEASURE-01 — Mobile viewport changes

- The real Attack graph synchronously remeasures on window and visual-viewport
  resize/scroll and observes responsive root/response card dimensions. Browser
  proof retained the same server-proven root for attacker and defender at
  390×844 and 480×900; ready connectors ended within 2.1 CSS px of measured
  anchors. At 390×724 the solver explicitly failed closed as
  `geometry-unavailable`, restoring 390×844 restored that same graph, and
  480×780 remained ready. There was no natural page-scroll range at the
  tested sizes, so the test did not manufacture overflow. The focused mobile
  browser case passed 1/1 and the ten-window continuity case passed 1/1 after
  the remeasurement change; build, targeted ESLint, `node --check`, and
  `git diff --check` passed. Playwright emulation is not real-device
  validation; Reviewer acceptance is not claimed.

### UX2.6-PHASE-D-ATTACK-RESPONSE-TIMEOUT-CLEANUP-01 — Real timeout settlement

- A real browser Attack response with no Dodge or manual Skip remained open
  through its server-owned 30-second deadline. The page automatically sent
  the existing `decline_response`; the server published exactly one
  `ATTACK_DAMAGE_APPLIED` proof tied to the same proven root and applied one
  damage. The graph visibly showed the exact settlement, then removed its
  root card without a stale table reveal or duplicate Stage. Focused
  server-backed browser proof passed 1/1 (48.9s), including the actual request,
  exact public proof, HP change, and graph removal. Pre-commit Actions run
  `37882419728` for parent SHA `13b5641bd9a108c2a5eda39cb9df9e4cc9946910`
  failed in Browser shard 1 because the desktop Attack→Dodge spec made
  sequential queries against its 600ms settlement graph. The spec now captures
  rendered DOM, styles, and measured geometry on the first settlement frame,
  then asserts the same semantic/layout conditions from that snapshot while
  still verifying transition and removal. CSS animation sampling allows at
  most 0.01px stroke and 0.005 opacity rounding. The focused set passed 4/4
  across 390×844, 480×900, 1440×900, and the real timeout path; the desktop
  case passed 3/3 repeats with 2 workers. Targeted ESLint, `node --check`, and
  `git diff --check` passed. The test preserves the existing response duration
  and does not change the separate 60-second Bumper Harvest chooser timer.
  Reviewer acceptance is not claimed.

### UX2.6-PHASE-D-ATTACK-CONVERTED-CARD-ROOT-PROOF-01 — Longdan physical Dodge as Attack

- The public root contract now records semantic `Attack` separately from the
  real physical `Dodge` plus `playedAs: attack`. Snapshot/client boundaries
  reject malformed pairings; React requires one unique matching public root
  event before rendering the authentic card face. A real Longdan browser path
  exposed and fixed both the console's denial of a CurrentAction-authorized
  Dodge-as-Attack and mobile geometry that incorrectly keyed fit/reservation
  to the physical face. The engine-backed proof is viewer-equal and carries no
  private physical card ID.
- Focused Longdan browser proof passed 1/1 for source and defender, ordinary
  Attack timeout regression 1/1 (48.7s), PresentationClient 57/57, and
  `tests/api/presentation-v2-engine.test.mjs` 38/38. Build, targeted ESLint,
  and `git diff --check` passed. Repo-wide `tsc --noEmit` is non-green with
  broad type/environment errors and is not a configured CI job. Reviewer
  acceptance is not claimed.

### UX2.6-PHASE-D-ATTACK-DENSE-CONTINUITY-01 — Dense mobile Attack continuity

- Real server-backed 6/8-player Attack windows were observed at 390×844 and
  480×900 for both attacker and defender. Across all eight views, the exact
  public root identity remained stable during 12.1–13.0 seconds of consecutive
  RAF sampling and 11.0–12.0 seconds of repeated room polling (12–13 polls per
  view). Current geometry was explicitly classified as
  `geometry-unavailable`; the safe Stage remained exclusive, with no fabricated
  graph and no recurring reveal flash. All eight real screenshots and detailed
  layout/frame/poll JSON evidence are attached to the local Playwright HTML
  report. The focused browser test passed 1/1; `node --check`, targeted
  ESLint, and `git diff --check` passed. Exact parent SHA
  `365634de7d0ebd79384bab0ecc0a820eeba4419a` passed Actions run
  `37885948819` (4/4 jobs). Reviewer acceptance is not claimed.

### UX2.6-PHASE-D-ATTACK-WUSHENG-ROOT-PROOF-01 — Guan Yu converted Attack root

- Typed public root proof now preserves a valid non-Attack physical CardKind
  only when the exact root event carries server-authored
  `playedAs: attack`; the semantic action remains Attack and physical card ID
  is not copied into the root contract. Real Guan Yu play-phase flow proved
  CurrentAction exposes only the red Peach, rejects a forged black-Peach
  Attack with 409, and publishes the same Peach physical-card root for attacker
  and defender. Both pages showed the existing ready Attack graph with the
  authentic Peach face; attacker/defender screenshots are in the local
  Playwright HTML report. Engine projection passed 39/39, client/snapshot
  passed 75/75, and the real browser path passed 1/1; build, targeted ESLint,
  syntax checks, and `git diff --check` passed. Parent Actions run
  `37887836857` for exact SHA `f4c9574fbf7c6115e8d332292530062014bfcd13`
  had Lint/fast and API successful while both browser shards were still
  running (0/2); deploy had not started. Reviewer acceptance is not claimed.

### UX2.4.10-STARGAZING-DRAG-DROP-ACCEPTANCE-CLOSURE-01 — Real drag/drop completion

- The real server-backed Stargazing proof now covers touch reassignment between
  Top/Bottom and back to Revealed Cards, exact zone order and card conservation,
  lost-pointer-capture cancellation, keyboard Enter operation of the Move menu,
  the resulting live announcement/focus restoration, compact empty Revealed
  geometry, and stale completion-payload rejection after the server has already
  accepted the arrangement. Drag coordinates re-resolve after scrolling; no
  arbitrary waits, forced interactions, or production/API changes were added.
- The focused real-gameplay browser spec passed 4/4 across 390×844, 480×900,
  320×640, and 1440×900. Targeted ESLint, `node --check`, and `git diff --check`
  passed. Pre-commit parent SHA
  `457d12444ae41da2e264344f79ee212cb1fcaa0d` passed Actions run
  `37855563197` (#923); CI for this task's outgoing SHA is pending. Reviewer
  acceptance is not claimed.

### UX2.6-PHASE-D-ATTACK-MULTI-TARGET-PROOF-AUDIT-01 — Halberd ordered-root audit

- Real API equipment tests passed 20/20. They prove the server stores one
  held physical Attack, an ORDERED causal target list, public participant
  progress, response order, and child-Dying pause/resume. The existing
  Halberd ordered-progress browser test passed 1/1 but is fixture-only; there
  is no real server-backed Halberd browser proof.
- PresentationV2's typed group progress omits root event/physical-card identity;
  `rootContext` is compatibility data. `singleTargetAttackRootActionFor`
  requires one `attack` continuation/target, while the page's active group
  graph candidate accepts only GROUP Raining Arrows/Barbarian Invasion, not
  Halberd ORDERED. Group terminal proof also excludes Halberd, and the generic
  Attack-hit proof rejects child group frames. Therefore the legacy Stage
  fallback for this path is an explicit proof/rendering gap, not evidence that
  an authoritative Halberd graph is intermittently ready. A typed ordered-root
  projection is the smallest prerequisite; do not infer branches from timeline
  order, seat positions, or card display.
- Focused API harness: 20/20; existing fixture browser proof: 1/1. The first
  bare `node --test` invocation had no API server and was not a product failure;
  rerunning through `tests/run-tests.mjs` produced the 20/20 result. Reviewer
  acceptance is not claimed.

### UX2.6-PHASE-D-HALBERD-ORDERED-ATTACK-ROOT-PROJECTION-01 — Typed public root proof

- PresentationV2 now links the exact held physical Halberd Attack (or a
  server-authored physical card with `playedAs: attack`) to its unique public
  play event, root causal frame, source, and server-ordered targets. Snapshot
  and client projections preserve the viewer-equal link only when it matches
  ordered progress; missing, duplicate, stale, or mismatched evidence fails
  closed. This is data authority only; graph rendering and terminal settlement
  remain separate work.
- Focused PresentationV2/Snapshot/Client tests passed 120/120, including direct
  and converted physical-card cases; real Halberd equipment API tests passed
  20/20 across response advance and child-Dying pause/resume. `npm run build`,
  targeted ESLint, and `git diff --check` passed. Parent Actions run
  `37888311102` succeeded 4/4 on SHA
  `30d145b24090bc5cc8d2ff26fef0b608429acf7f`; outgoing task CI is not yet
  observed. Reviewer acceptance is not claimed.

### UX2-4D-P3-HERO-SKILLS-REAL-GAME-REACHABILITY-01 — Real roster reachability

- Audited all 37 unique actionable/optional/response provider IDs mapped into
  the Local Hero Skills band across 25 Hero rows. Real server-seeded browser
  flows proved offered authority, Skills-band activation, exact payloads and
  required continuations; a server-backed non-actor matrix proved every mapped
  control remains disabled without viewer authority. Duplicate Action Row
  activation was checked in the real paths. No production routing gap was
  found.
- Focused real-gameplay browser runs passed 28/28 and 23/23. Evidence is
  server projection plus production-page interaction, not deployed-game
  screenshot or Reviewer acceptance.

### UX2 §10.17.1 BCP-1 — Bumper Harvest choice panel — 2026-10-18

- Separated the public revealed-card pool from the played Harvest root,
  compacted the pool, and added independent card details and actor-only
  confirmation. Selection remains viewer/action scoped and retaps deselect;
  server `choose_harvest` authorization and public taken status are unchanged.
- Commits `8b7fd9a` and `50e9bb6`. Focused real-gameplay browser checks passed
  6/6, including selection touch pass-through to TEST SWITCH; build passed.
  Exact-SHA Actions run
  [`39114579762`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39114579762)
  passed API, lint/fast, browser smoke, D1 migration, Worker deployment and
  production smoke for `50e9bb6f8c67574214436e3ca49a7547faca1b64`. Pending user
  phone review; Reviewer acceptance is not claimed.

### UX2 §10.17.1.2 BCP-1-F2 — Harvest pool during Negation — 2026-10-18

- Negation now carries a separate public, read-only Harvest pool only when the
  exact typed Bumper Harvest root and public reveal event match the server
  continuation and `PresentationV2` proof. The branch must prove `ACTIVE` or
  `BLOCKED` consistently; card identities and available/taken partitions must
  match. The DTO has no chooser actor or legal-action data. The UI preserves
  the same reveal/card keys when the authoritative chooser gains selection.
- Build passed; focused Worker/D1 API tests 44/44, room-safety tests 11/11 and
  mobile browser tests 2/2 passed. Browser checks cover four TEST SWITCH seats,
  independent viewer equality, read-only touch with no `choose_harvest` POST,
  Info/Inspector access, and promotion at 390×700 and 440×766. Exact-SHA
  Actions run [`39131345860`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39131345860)
  passed browser smoke, lint/fast, API, D1 migration, Worker deploy and
  production smoke for `6836aa2905a3dc71f7d8dfde8619ae190f6f4e14`. Worker
  version `705b26bf-2802-46d6-9869-e6aceaac282c`; production health returned
  available and the served page bundle contained the exact build SHA. Pending
  user phone review; Reviewer acceptance is not claimed.

### UX2 §10.17.2 BCP-2 — Steal / Burning Bridge picker — 2026-10-18

- Compact mandatory target-card choices inside the table corridor, with
  independent public-card details, same-card retap deselection and pinned
  Confirm. Actor legality remains `CurrentAction`-owned; no standalone Cancel
  or hidden Hand identity was added.
- Real-gameplay browser regression passed 21/21 at 390×700, 390×844, 440×766,
  480×900 and 1440×900, including Hand-only, Equipment-only, mixed zones,
  Inspector, SWITCH, privacy and legal submission. `test:fast` passed 280/280.
  Exact-SHA Actions run
  [`39116626824`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39116626824)
  passed lint/fast, API, browser smoke, D1 migration, Worker deployment and
  production smoke for `641bf4079c8a991c2c54a2a9f6d00fdf45875107` (API passed
  on the same-SHA rerun). Worker version:
  `ec194d74-7faf-4689-975a-20b092565cd6`. Pending user phone review; Reviewer
  acceptance is not claimed.

### UX2 §10.17.3 BCP-3 — Retaliation picker — 2026-10-18

- Sima Yi Retaliation reuses the compact battlefield picker, removes its
  redundant Cancel, and keeps authoritative Use/Skip actions side by side.
  Re-tapping an opaque Hand position clears that local selection. Server
  authorization, hidden-card projection and game semantics remain unchanged;
  Frost Sword and Kirin Bow retain their existing authorization-driven
  actions.
- Focused real Worker/D1 browser regression passed 22/22, including 390×700 and
  440×766 touch, actor/nonactor privacy, Inspector and Card Details without an
  action, one submission, and distinct Skip. The two viewport screenshots were
  captured and visually reviewed. Active-skill tests passed 45/45; build,
  browser-test ESLint, CI lint/fast, API tests, and browser smoke passed.
  Exact-SHA Actions run
  [`39117542770`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39117542770)
  passed D1 migration, Worker deploy and production smoke for
  `f0df9b63fe417f6b2bcc3b743616f9527bdcc2d7`. Worker version:
  `736e1301-bc09-4346-b4ac-962a098dfc09`; production `/api/health` returned
  `{"ok":true,"worker":"available"}`. Pending user phone review; Reviewer
  acceptance is not claimed.

### UX2 §10.17.1.1/.2 BCP-1 F1/F2 follow-up — 2026-10-18

- Commit `22e20ba6517fc2fe45d589a6ee2bd9f612d409fa` completes the directed
  root-thumbnail / public-pool layer correction and public current-chooser hint.
  During the proof-backed read-only Negation pool, the genuine root card parks
  at 40×60 in the lower-left rail below the selectable-card layer, with zero
  measured overlap against the pool, H4, timer, activity chip, seats or Dock at
  390×700 and 440×766. Original card/event IDs are preserved; the no-proof path
  retains the existing reveal/move. The generic Negation status remains visible.
- The chooser hint uses only the validated shared Bumper Harvest progress and
  public player name. It matches across authenticated views and TEST SWITCH;
  missing or mismatched progress removes the hint and retains generic
  Negation status. No chooser control, `choose_harvest` action, private
  responder, response identity or Hand data is exposed.
- Focused mobile Worker/D1 browser coverage passed 3/3, including true-root
  identity, mobile geometry/screenshots, actual SWITCH/Inspector/Card Details
  touch, actor selection/Confirm preservation and fail-closed proof mismatch.
  Local build and `git diff --check` passed. The focused local ESLint process
  exceeded the machine's default 2GB Node heap; exact-SHA Actions
  [`39147264299`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39147264299)
  passed full lint/fast, API, browser startup/room smoke, D1 migration, Worker
  deploy and production `/` + `/api/health` smoke. Worker version:
  `263e76a7-49c5-4e93-94ed-b1d1d015311c`. Focused gameplay replay used the
  local Worker/D1 browser harness; no production four-client interaction replay
  is claimed. **IMPLEMENTED / DEPLOYED — PENDING USER PHONE REVIEW**, not
  accepted. H4 stays accepted and Q1–Q4 stay paused.

### UX2 §10.17.1.2 BCP-1-F2 re-audit — 2026-10-20

- Re-reviewed the current mobile implementation against the latest concise-copy
  and shared-proof requirements. The existing Harvest-specific Negation path
  already suppresses the generic phase suffix and fails closed without a proven
  current chooser; no additional product-code change was needed.
- Existing mobile browser coverage passed for the committed Negation/counter
  chain with four authenticated views at 390×700, 390×844, 440×766 and 440×894,
  including refresh and progression to the next chooser (1/1). The TEST SWITCH
  and proof-mismatch flow passed at a phone viewport (1/1); public announcement
  assertions passed 3/3, including source-equals-recipient and generic fallback.
- Exact source SHA `4c75ec2af9166304b0e09b07367e4ab681371faf` passed all required
  Actions jobs on rerun [`39341070164`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39341070164)
  attempt 2. Worker version `9d312402-ad06-43c2-b885-37852c8df297` deployed;
  production `/` and `/api/health` smoke passed, and a direct health check
  returned `{"ok":true,"worker":"available"}`. No production multi-viewer
  gameplay replay is claimed. **IMPLEMENTED / DEPLOYED — PENDING USER PHONE
  REVIEW**, not accepted.

### UX2 §10.17.1.2 BCP-1-F2 public response continuity repair — 2026-10-20

- Corrected the confirmed stage-transition gap: a publicly committed Harvest
  Negation/counter card was projected from the live reaction chain only during
  `NEGATION`, so the physical response identity could be lost when Harvest
  advanced to `SEQUENTIAL_CHOICE` or a viewer refreshed/joined late. The room
  route now retains exact root-bound public response records; presentation
  projection revalidates each against the public timeline and causal root, then
  carries the proof through the public snapshot/client path. The renderer
  restores genuine cards as parked minis using the real event/card/author. It
  does not replay historical cards as fresh reveals. No private hand or pending
  response is exposed.
- Scope stayed within BCP-1-F2: no F1 pool/root/seat changes, H4 changes, rules,
  deadlines, or new tests/fixtures. No manual iPhone or production
  multi-viewer gameplay replay is claimed; owner phone re-review is still
  required. **BCP-1-F1 remains USER-ACCEPTED/CLOSED; BCP-1-F2 is IMPLEMENTED /
  DEPLOYED — PENDING USER PHONE RE-REVIEW**, not accepted.
- Exact code SHA `a79b63282d986b14871bb78a21e9e2b63c2ac841` passed all required
  Actions jobs, including lint/fast, API, browser startup/room smoke, D1
  migration, Worker deploy, and production smoke in
  [`39342640589`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39342640589).
  Worker version `b744c3d4-50ef-471a-9a38-0527458815e0` deployed; direct
  `/api/health` returned `{"ok":true,"worker":"available"}`.

## Known deferred semantic gaps

These remain incomplete; where authoritative projection does not exist,
behavior must continue to fail closed:

- Unrelated Group semantics not covered by typed public proof remain deferred;
  Raining Arrows, Barbarian Invasion, and Bumper Harvest now have bounded,
  server-authored settlement proofs and browser-backed holds.
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

### UX2-FINAL-AOE-MULTI-TARGET-REVALIDATION-02 — Post-Halberd AOE matrix

- Revalidated production-path Raining Arrows, Barbarian Invasion, Oath,
  Bumper Harvest, and Halberd ordered Attack roots. The 21-case browser matrix
  passed serially at 390×844, 480×900, and 1440×900; an added 8-player
  Raining Arrows case measured all seven fixed-seat branches, next-target
  advancement, stable root geometry, containment, and no horizontal overflow
  at 390×844. Fresh screenshot/geometry attachments are in the Playwright
  report.
- The same Bumper Harvest workflow exposed a real stale-revision race: its
  visual-only `previewCardId` changed `actionRevision` between card preview
  and Confirm although the chooser and legal available cards were unchanged.
  Harvest preview is now omitted from that revision hash while the actor,
  phase, legal pending state, and hand revisions remain authoritative. The
  PresentationV2 engine API file passed 39/39, including preview-then-confirm
  with the same chooser revision. Build, targeted ESLint, and
  `git diff --check` passed.
- An earlier four-worker local run recorded a Wrangler `503` stating that the
  Worker restarted mid-request; the affected Raining settlement and Bumper
  hold cases passed in isolated and complete serial reruns. The exact remote
  base SHA `b98834674e32ecdd8faa6bccdcd64e699a4d93b6` passed all five jobs in
  Actions run `37902249037`; this task's outgoing SHA remains pending CI.
  Reviewer acceptance is not claimed.

### UX2-6.24-ATTACK-RECONNECT-FAIL-CLOSED-PROOF-01 — Attack root lifecycle

- Added a real server-backed browser lifecycle proof: ordinary Attack is played
  through the production page, both attacker and defender reload during the
  open response, and each restores the same authoritative root event and
  interaction. Sampled source/target connector residuals remain within 2.1px;
  every physical Seat/Dock anchor and root-card rectangle stays within 1px
  across reload. The graph is absent while the public root proof is withheld
  from the defender's room response, then the same root graph returns when the
  proof is restored. A real Skip advances the server; subsequent reloads do
  not revive the old root or its connectors.
- Focused browser case passed 1/1 at 390×844; targeted ESLint and
  `git diff --check` passed. Screenshots for both roles, missing-proof fallback,
  and proof recovery are attached to the Playwright report. This supplements,
  rather than replaces, the existing ten-window polling stability matrix.

### UX2-6.27-ATTACK-DODGE-FRESH-SCREENSHOT-AUDIT-01 — Visual audit

- Inspected fresh server-backed four-player Attack/Dodge screenshots at
  390×844, 480×900, and 1440×900. The inspected compositions show the green
  source tether, prominent red Attack direction, whole Seat/Dock emphasis,
  recognizable Attack/Dodge cards, and Dodge physically intercepting the red
  path without a duplicate central Stage. The focused screenshot matrix passed
  3/3 mobile/dense cases and 1/1 wide case after correcting a stale test that
  compared an animated CSS glow radius as an exact string instead of a numeric
  value.
- The real 6/8-player mobile cases can fail closed with
  `geometry-unavailable`, returning to the safe Interaction Stage. This is a
  measured remaining dense-layout limitation; it does not establish that every
  such scene is impossible. Preserve the fallback unless a collision-free
  root/response fit is proven. Reviewer visual acceptance is not claimed.

### UX2-6.27-DENSE-ATTACK-GEOMETRY-INVESTIGATION-01 — Fit diagnosis

- Added opt-in test-only fit snapshots for the Attack root and an actually
  submitted Dodge. They separate missing anchors, sampled root-candidate
  failures, absent root-adjacent pre-reservations, and direct/adjacent Dodge
  interception candidates; attached browser evidence includes the measured
  Seat/Dock and control rectangles. The pre-reservation result is not treated
  as proof that no actual Dodge interception slot exists.
- Real server-backed 6/8-player runs at 390×844 and 480×900 found no collision-
  free root placement in the current 108-point path-based sample for the local
  attacker at any fit size. Defender roots had collision-free candidates and
  display the graph even when the small root-adjacent response reservation is
  absent. On actual Dodge submission, 6-player 480×900 fits at minimum card
  size; the other three dense sizes have zero current direct/adjacent response
  candidates after Seat/Dock, control, and safe-region checks. Safe Stage
  fallback remains in those cases; these measurements do not prove that a
  broader root/response search could never find a valid placement.
- The four focused dense Attack→Dodge browser cases passed 4/4. The real
  ten-window Attack continuity regression passed 1/1. `npm run build`, targeted
  ESLint, and `git diff --check` passed. No Reviewer acceptance is claimed.

### UX2-6.27-ATTACKER-ROOT-FIT-SEARCH-01 — Dense local root placement

- Extended the 108-point path sample with a measured 4px placement-field scan
  for unanswered mobile Attack roots. Candidates stay within the table's 12px
  margin, the authored source→target relation range, and 12px then 8px
  obstacle-clearance passes; both source and target connector segments must
  remain clear of Seats, Dock, and controls. The existing fail-closed path is
  retained when no candidate qualifies.
- On the production server-backed build, the local attacker found a collision-
  free root at 6p 390×844 (compact fit, 12px), 6p 480×900 (target fit, 12px),
  and 8p 480×900 (minimum fit, 8px). At 8p 390×844, target/compact/minimum
  scans found zero card-clear/connector-clear placements at either clearance;
  safe Stage fallback remains. Selected root geometry stays within 1px when
  Dodge appears.
- Focused dense Attack→Dodge browser cases passed 4/4; dense attacker/defender
  stability passed 1/1; ten real Attack windows with RAF and room polling passed
  1/1. `npm run build`, targeted ESLint, and `git diff --check` passed. The
  pre-commit base `4ba3673cd31def3a4926c4a538c34e652dbddd34` passed all five
  Actions jobs in run `37911187593`; the outgoing revision is pending. No
  Reviewer acceptance is claimed.

### UX2-6.27-DODGE-INTERCEPTION-FIT-SEARCH-01 — Dense Dodge placement field

- Added a 2px full-card placement-field search only after the measured direct
  and adjacent candidate sets are exhausted. It retains the 12px table margin,
  avoids the Attack root, Seats/Dock, and controls with the required clearance,
  prefers the §6.27.2 35–70% segment, and records the complete search or a
  quantified fail-closed result.
- Real server-backed 6/8-player 480×900 Dodge responses use the field search to
  place the genuine 2:3 Dodge card directly on the Attack path. At 6-player
  390×844, the full scan found no collision-free direct or 12–20px adjacent
  position and the safe Stage remains. Rendered screenshots show the red path
  terminating at the interception mark; the Attack root remains stable within
  1px.
- Dense 6/8-player 390/480 browser matrix passed 4/4 after assertions for
  rendered size, table/obstacle/root clearance, selected-field-to-DOM agreement,
  and exhaustive-search accounting. Build, targeted ESLint, and `git diff
  --check` passed. Pre-commit `ffde77740c75ee974355ad68cf15fe4c5b6bfd1e`
  passed Actions run `37915411584`; outgoing task commit is pending. No Reviewer
  acceptance is claimed.

### UX2-6.27-ATTACKER-DODGE-GRAPH-CONTINUITY-01 — Dense response parity

- Extended the real server-backed 6/8-player 390/480 Attack→Dodge matrix to
  sample the first proven response frame for both local attacker and defender,
  compare their public causal projection, retain the Attack root position,
  measure safe geometry fallbacks, and verify the rendered settlement graph is
  removed. At 480px both roles render the intercepted graph; unsupported dense
  390px placements remain explicitly fail-closed rather than inventing edges.
- The focused browser matrix passed 4/4; targeted ESLint and `git diff
  --check` passed. Pre-commit SHA `1ec040679ae0e354394aa1db96312e39904734e8`
  passed Actions run `37917467356`. Outgoing task CI is pending; Reviewer
  acceptance is not claimed.

### UX2-6.27-CONVERTED-ATTACK-DODGE-PUBLIC-PROOF-01 — Longdan root response

- Extended the server-authored Attack→Dodge relation to a uniquely linked
  physical card explicitly converted with `playedAs: attack`; unmarked or
  malformed conversions fail closed. The public relation remains viewer-equal
  and excludes physical card IDs. A real Longdan browser flow now reaches an
  actual defender Dodge in attacker and defender views, preserves the physical
  Dodge root face and root position, reserves interception geometry before the
  response, and removes the graph after settlement.
- The focused engine-backed API case passed within 39/39 tests; the Longdan
  browser case passed 2/2 repeats. Build, test syntax, focused ESLint on the
  route/projection/overlay/specs, and `git diff --check` passed. ESLint on the
  large `app/page.tsx` exceeded the local 4GB Node heap. Pre-commit SHA
  `2ef038005ab4375a416c89fcfa2b0391479a1e86` passed Actions run `37921622267`;
  outgoing task CI is pending. No Reviewer acceptance is claimed.

### UX2-6.27-WUSHENG-ATTACK-DODGE-INTERCEPTION-01 — Guan Yu real response

- Extended the real Guan Yu red-Peach-as-Attack production flow through an
  actual defender Dodge. Engine-backed API proof and both browser viewers
  confirm viewer-equal, card-ID-free public causality while preserving the
  physical Peach root and Dodge response; the root stays within 1px, the Dodge
  directly/adjacently intercepts the red path, and the graph cleans up after
  settlement. Fresh attacker/defender screenshots capture the response graph
  on its first measured visible frame.
- The API file passed 39/39; the focused Guan browser path passed 1/1 after the
  screenshot-timing regression was added. Browser shard 1/2 passed 443 tests;
  two Group Negation cases were flaky on the full run but passed isolated 6/6.
  Build, targeted ESLint, syntax, and `git diff --check` passed. Reviewer
  acceptance is not claimed.

### UX2-FINAL-AOE-MULTI-TARGET-REVALIDATION-03 — Post-§6.27 AOE matrix

- Revalidated real server-backed Raining Arrows, Barbarian Invasion, Oath,
  Bumper Harvest, and ordered Halberd Attack after §6.27 changes. The focused
  browser matrix passed 23/23 serially at 390×844, 480×900, and 1440×900,
  including dense 8-player Raining Arrows and Barbarian Invasion. Halberd now
  includes the 480×900 viewport; Oath blocked/active screenshots cover all
  three widths. A follow-up Oath capture run passed 1/1. Fresh Group, Oath,
  Bumper Harvest, and Halberd screenshots were inspected; measured branch/Seat
  endpoints, root stability, settlement, Dock containment, and overflow checks
  passed. Focused ESLint and `git diff --check` passed.
- Exact pre-commit base `fa48e33cf11376f127536d10209c8652b140a1f1` passed all
  five Actions jobs in run `37932531424`. Reviewer acceptance is not claimed.

### UX2-6.32-PROCESS-TREE-MEMORY-PROFILE-01 — Local memory baseline and API runner

- Profiled on macOS 14.5 arm64 / 8 GiB, Node 26.3.0, npm 12.0.2; ESLint
  9.39.4, Playwright 1.63.0, Wrangler 4.128.0 and Vinext 1.0.0-beta.2.
  Process-tree RSS is sampled every 100ms from `ps`; this can miss brief peaks
  and summed RSS can double-count shared pages. No known child remained alive
  two seconds after any profiled command.
Profile command measurements:

| Command | Peak processes | Peak tree RSS | Duration | Result |
| --- | ---: | ---: | ---: | --- |
| `npm run build` | 2 | 784.8 MiB | 6.11s | pass |
| `npm run lint` | 2 | 1,457–1,774 MiB sampled | 28–30s | V8 heap OOM (~2.0 GiB used); not OS SIGKILL |
| `npm run test:fast` | 5 | 317.7 MiB | 12.43s | 264/264 pass |
| `npm run test:api` (4 groups) | 34 | 2,266–2,278 MiB | 50.15–50.35s | 266/266, 24 files |
| `npm run test:api` (2 groups) | 18 | 1,688 MiB | 54.92s | 266/266, same 24 files |
| `npm run test:browser:smoke` | 14 | 974–1,024 MiB | 8.04–8.22s | 1 passed |
- Rebalanced only the existing API runner groups; no test file or assertion was
  removed or changed. The two-group local sample cut peak tree RSS by about 26%
  for about five seconds more API runtime. Pre-change Actions run `38072401250`
  for `b84779c58de4a031f93e66250af63b9005a06c48` passed all jobs and deploy in
  3m07s; the runner-change SHA's full Actions result remains to be observed.
- Local lint OOM is specific to this Node 26 environment; repository CI uses
  Node 22.13.0 with `NODE_OPTIONS=--max-old-space-size=8192` and passed the
  recorded base SHA. React lint checks were not disabled; targeted diagnostics
  did not establish a safe rule-level fix. No root cause for the reported
  general 3–4 GB symptom is claimed.

### UX2-10.7.4.2-R4-G-OFFTURN-OWN-HAND-INSPECTION-01

- Added a private inspect-only focus for cards in the viewer's own Hand while
  no matching card-choice authority exists. The native game-card button stays
  disabled and unselected; a separate full-face hit target opens the accepted
  Card Details path without action submissions. Viewer/room changes, Hand card
  loss and newly authorized actions clear inspection; unchanged polling keeps
  it open. Genuine off-turn Dodge remains selectable through its normal
  server-projected action.
- Authenticated Worker/D1 two-player browser proof passed with private Hand
  isolation, no game-choice request from inspection, then a real Attack→Dodge
  response. Browser coverage passed 15/15 across 390×844, 390×700, 440×894,
  480×900 and 3/5/8-card Hands, including CDP touch-pan on an overlapping Hand;
  R4-F passed 17/17 and focused room render tests 20/20. Build and
  `git diff --check` passed. Local Node 26 ESLint on `app/page.tsx` exhausted a
  4 GiB heap without diagnostics; exact-SHA Actions run `39052060979` passed
  full React Compiler lint, browser smoke, API tests, migrations, deploy and
  production smoke for `9ba6c798d896b8a1fbf0721254eec87e3de11bb1`. Worker
  version `d4ad1709-f20c-43c8-ae80-9f29c6aca47d`. R4-G remains pending user
  phone review; Q3/Q4 remain deferred and accepted H4 is unchanged.

### 2026-10-17 refinement delivery context

- Q1 production diagnostics found public-root/settlement join gaps and a Group
  child-view crash caused by reading display-shaped fields from ID-shaped
  `rootOrigin` proof. Q2 repair `d2bd2d692153e9f054ef56a867e080124bf286fc`
  preserved the proven root, valid resolved participants, and public root
  through matching settlement proof; exact-SHA Actions run `39043497415`
  passed and deployed Worker version `5ef4a4fe-cd33-4a0c-93a3-cf9ef19d0a64`.
  Production Barbarian Invasion and Raining Arrows replays covered Negation,
  responses, damage/trigger, settlement, and four switched viewer seats. They
  used one browser controller, not four independent clients.
- R4-H `14cc15ba472ddef4de3c7d83e526860752666c42` passed exact-SHA Actions
  run `39045299780`, deployed Worker `ddd137c3-8317-4c66-aa79-0d8ec6d3c3bb`,
  and remains pending user review. U13-B-G passed focused local geometry and
  browser checks with the Worker/D1 fixture; it remains pending phone review.
- R4-I `85faaf793bdf1e494abbe2a7d9120f74968a6361` passed Actions run
  `39048830786` and deployed Worker `ebafe8d4-0644-4cbc-a1ef-c9c3a8e1b98c`;
  it remains pending phone review. U13-C has focused 390×844 long-name evidence
  with no horizontal/Hand overlap and remains pending phone review.
- U13-H §10.13.8 is implemented locally with focused geometry and gameplay
  evidence but has no exact-SHA CI/deployment yet. Its technical delivery and
  user review remain open. Q3 and Q4 are deferred by the user's reprioritization;
  accepted H4-A/B/C stays unchanged, and Q4 remains verification-first.

### UX2-10.13.5.1-U13-E-F-NAMES-TIGHT-FRAME-01 — 2026-10-17

- Source commits `206981568a1569d540624cee11f3488b581ca521` and
  `346b5f0df50f8cbbd44b13dd787e4c3c50ea6188` deliver authentic player names in
  the LUST Duel presentation and a compact 168×190 frame around the full
  90×135 paid card. The frame hides during the 380ms card move so the accepted
  H4 region stays clear.
- Exact-SHA Actions run [`39057243087`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39057243087)
  passed lint/fast, API, browser startup smoke, build, D1 migration, Worker
  deployment and production smoke. Worker version:
  `e643dff4-d028-416a-8177-e6ee6c673f8e`.
- Production Worker/D1 replay used four Test Switch viewer perspectives at
  390×700, 390×844, 440×894 and 480×900. It exercised the real LUST root,
  ordered Attack responses 1 and 2, Skip and damage settlement. Public
  accessible participant names and proof order matched across views; the
  projected exchange was equal after excluding the viewer-local countdown.
  The technical delivery remains pending user phone review. H4 was not changed.

### UX2-10.8.2.2-H2-G1-NAME-F — 2026-10-17 (technical delivery)

- Current production baseline showed a 28.8125px name scrim at 390×700 and
  440×894, although its font line-height was 10px. A more-specific final CSS
  override clears the legacy mobile `top: 60%` constraint and lets the lower
  scrim shrink-wrap one line. No JSX, server, selection or Inspector code
  changed.
- Focused browser regression failed against the old rendered geometry, then
  passed 5/5 after the fix: 4-seat Worker/D1 rooms at 390×700 and 440×894 plus
  6/8/10-seat side-column fixtures at 440×894. Final name heights were 13px
  for four seats and 16.5px for side seats. Long Latin/Chinese names remained
  available through matching `aria-label`/`title`, while visible text ellipsized.
  HP, status, SWITCH and stage/H4 safe-zone clearance assertions passed.
- Local build and targeted ESLint passed. Exact-SHA run `39059323732` passed
  all CI/deploy jobs for `8d63b56efac5255c4f2bb7108639dc8ee696275e` and
  production smoke; deployed Worker `1d83b4ad-8002-4494-9b4c-1144c3547189`.
  Active-room production Test Switch screenshots/measurements at 390×700 and
  440×894 confirmed 13px after-fix height versus the 28.8125px baseline, with
  full accessible names intact. Evidence: `/tmp/wtk-h2g1-name-f-production/`.
  H2-G1 overall remains not accepted due to separate Inspect feedback; this
  slice is pending user phone review. Q1–Q4 are deferred and accepted H4 remains
  unchanged.

### UX2-10.13.4.1-U13-D-F-OPPONENT-HP-GEAR-01 — 2026-10-17

- Commit `711756035ef83041ec26dec201b39501c0f5c59b` moved genuine occupied
  Equipment indicators to the right, retained HP at the left, enlarged the
  four-seat HP label and replaced the arrow-like Weapon mark with a sword.
  It changed no game rules, server data or local Equipment display.
- Exact-SHA Actions run
  [`39060346664`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39060346664)
  passed lint/fast, API, browser smoke, build, D1 migrations, Worker deploy and
  production smoke. Deployed Worker version:
  `11e4951b-1f14-42ed-b0ea-b7b73d718261`.
- Production Worker/D1 replay equipped one, two and four real cards. Four
  occupied slots stayed non-overlapping and right-aligned at 390×700, 390×844,
  440×894 and 480×900; evidence is in `/tmp/wtk-u13-d-f-production/`. Pending
  user phone review.

### UX2-10.13.6-U13-F safe-style gate — 2026-10-17 (NO CHANGE)

- A local pre-change Attack→Dodge browser run sampled the H4 band at 390×844
  and 440×894. At 390×844 the existing announcement falls back and intersects
  the revealed Dodge by 11px; at 440×894 it clears the card. The proposed
  6px vertical padding would enlarge the narrow band. Because U13-F is styling
  only and forbids H4 positioning changes, no U13-F CSS was applied. This
  local Chromium measurement does not revise the user's H4 phone acceptance.
  Screenshots and frame geometry are in `/tmp/wtk-u13-f-before/`.

### UX2-10.13.8-U13-H CI/deployment closure — 2026-10-17

- Existing equal-size Diao Chan skill controls were implemented in
  `4ceadd7a6aa883d6953107c60f88479a7b83bf87`; the commit is an ancestor of
  `711756035ef83041ec26dec201b39501c0f5c59b`. The latter's exact-SHA Actions
  run `39060346664` passed and deployed the bundled source. Focused geometry and
  gameplay evidence remains recorded in `docs/UX2-refine.md` §10.13.8.
- No U13-H reimplementation or separate production interaction proof was
  performed. It remains pending user phone review.

### UX2-10.13.7-U13-G-COMPACT-OPPONENT-INSPECTOR-ZONES-01 — 2026-10-17

- Commit `325cf7f67a1cc8960bba96bb825ec9007052fec8` renders the public
  Judgement and Equipment zones as one responsive 2+4 row. Four Equipment
  cells map to real equipment slots, empty cells remain outlined, and extra
  public Judgement cards open through an accessible overflow disclosure.
  Floating Inspector placement measures top-seat, Local Dock/Hand, table and
  `visualViewport` geometry; no gameplay or server projection changed.
- Focused browser coverage passed 42/42, including 390×700, 390×844, 440×894
  and 480×900, 4/6/8/10 seats, public-zone counts, Inspector details and
  non-overlap/no-horizontal-overflow checks. `git diff --check` passed.
- Exact-SHA Actions run
  [`39062564475`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39062564475)
  passed lint/fast, API, browser startup smoke, D1 migrations, Worker deploy and
  production smoke. Worker version `58f7e094-af7d-4b27-a19f-57ab0518f921`.
  Production smoke verified `/` and `/api/health`; no separate live-room
  interaction replay was claimed. Local ESLint on the changed TSX exceeded
  available Node heap limits; exact-SHA Actions lint passed. The delivery is
  pending user phone review.

### UX2-10.13.2.1-U13-B-F public-wait privacy audit — 2026-10-17 (BLOCKED)

- `game/capabilities/heroes/yue-jin-dauntless.ts` offers Dauntless only when
  the private source Hand contains at least one Basic card. The turn-end event
  opens `TriggerPending` only when `getTriggeredEffects` returns an option.
  During that opportunity, the public log/timeline also contains “may use
  Dauntless”. `derivePublicActivityStatus` otherwise falls back to `Resolving…`
  because the public `PresentationSnapshot` has no matching decision actor or
  stage for this trigger.
- A focused isolated Worker/D1 reproduction compared four authenticated tokens
  in the no-Basic and one-Basic states. No Basic advanced to the next turn and
  returned public activity `Alice's turn`; one Basic entered `response` and
  returned `Resolving…`. All four views had the same public log/timeline and
  snapshot in each state; only Yue Jin's local `CurrentAction` contained the
  Dauntless option. The turn-end opportunity and “may use” notice therefore
  track hidden Basic-card availability, making a named public waiter or public
  skill label unsafe under the approved privacy contract.
- The one-off audit ran through the local Worker/D1 harness (1/1 focused
  scenario); no production four-client replay or code change was made. The
  design's §10.13.2.1 stop boundary requires a user decision on the
  server-authoritative privacy contract before proceeding. Current handoff is
  blocked on that decision; Q3/Q4 remain paused and accepted H4 is unchanged.

### UX2-10.15-Q4-CROSS-CLIENT-H4-01 — cross-client public narration consistency — 2026-10-17

- Reproduced the three recorded Q3 Attack/Dodge geometry failures against a
  local Worker/D1 build of exact Q3 source `74f63fde` (4-seat 390×700 and 6/8
  seat side-column); current Q4 source passed the same three cases 3/3. This
  baseline reproduction used the Q3 source locally, not the deployed Q3 Worker.
- Barbarian Invasion and Raining Arrows each passed four independently
  authenticated local Worker/D1 clients through Negation, three target
  responses, damage/trigger and settlement (2/2). A separate TEST SWITCH
  browser completed 1→2→3→4→1 with stable root/event/copy and no reveal replay
  (1/1). Across clients, current proven H4 event/copy remained single,
  stage-current and safely placed; the accepted wording/type and U13-B chip
  were preserved. CI did not run these focused gameplay cases, and no live-room
  replay was performed after deployment.
- Exact-SHA Actions run
  [`39074505216`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39074505216)
  passed lint/fast, API, browser startup/room smoke, D1 migrations, build,
  Worker deployment and production `/` + `/api/health` smoke for
  `1c8ec9c1f3a0a23b40c9417fb34c68ce33f9dc43`. Deployed Worker version:
  `a941302b-bd58-4abe-bdcc-7e2c60067596`. Local build and `git diff --check`
  passed; local Node ESLint hit heap OOM, while CI lint passed after deleting
  one unused test capture. Q3 and Q4 remain pending human phone review; no
  reviewer acceptance is claimed.

### UX2-10.13.6-U13-F — public announcement ornament — 2026-10-17

- Styled the existing shared PublicCardAnnouncement frame with a thin warm-gold
  keyline, subdued black-green tint and 6px effective inner spacing. H3/H4 copy,
  accepted typography, placement and animation/collision logic remain intact.
- Focused real Worker/D1 browser checks passed: Attack→Dodge across 390×700,
  390×844, 440×894 and 480×900 (1/1), and Group/Negation through four
  authenticated viewers at those sizes (1/1). Assertions cover measured
  spacing, H4 drift/movement, readability, protected-area collisions and
  reduced motion. `npm run build` and `git diff --check` passed. Targeted local
  ESLint hit the Node heap limit.
- Commit `2d6c2bbb8a0770d13c3c9f0cadfbfcefecfcc44` passed exact-SHA Actions run
  [`39076355080`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39076355080):
  lint/fast, API, browser startup/room smoke, D1 migrations, build, Worker
  deploy and production `/` + `/api/health` smoke. Worker version
  `8bc9f9d4-699c-471b-bbf4-b02fd2fbedd5`. The CI browser job was startup/room
  smoke, not the focused gameplay specs. Pending user phone review; the earlier
  U13-F no-change measurement remains a pre-implementation baseline.

### UX2 §10.17.4 HUD-4 — four fixed public Equipment slots — 2026-10-18

- Commit `5a8505efa0d29e4eeea34e41baa5267956419efb` reserves fixed opponent
  positions Weapon | Armour | +1 Horse | −1 Horse, including neutral empty
  footprints, and redraws the sword as a diagonal blade with a shorter grip,
  crossguard and pommel. HP remains at the left with a stable visible gap.
  Public equipment projection and all game rules are unchanged.
- Local validation: build passed; server-render regression passed 20/20;
  occupied/empty slot geometry passed 37/37 across 0–4 items, Horse-only,
  Weapon-only, 4/6/8/10 seats and mobile layouts; Side Column/H2 geometry
  passed 8/8; actual viewer-switch and Inspector-touch regressions passed 2/2.
  Measured DOMRects and screenshots for 390×700 and 440×766 are in
  `/tmp/hud4-evidence/` (local evidence, not committed). `git diff --check`
  passed.
- Exact-SHA Actions run
  [`39118588563`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39118588563)
  passed lint/fast, API, browser startup smoke, build, D1 migrations, Worker
  deployment and production smoke. Worker version:
  `27ff6996-a6bc-4c39-ac5b-4c16461f1a61`. The technical delivery remains
  **IMPLEMENTED / DEPLOYED — PENDING USER PHONE REVIEW**, not accepted.
- The next separately bounded design slice is INS-5 (§10.17.5); see the current
  task in `HANDOVER.md`.

### UX2-10.17.4.1 HUD-4-F — compact diagonal sword silhouette — 2026-10-18

- Commit `e2e645f06bb24045be38a238f3f335f3cec08c7d` changes only the Weapon
  glyph SVG and its focused phone regression coverage. The icon now has a broad
  northeast diagonal blade with a center groove, short grip, distinct guard and
  pommel. Blade diagonal span is 1.94× the grip; every vector part stays inside
  the existing 18×18 viewBox. No equipment CSS, slot order, badge size, HP
  placement, projection or gameplay rule changed.
- Focused phone browser validation passed 47/47 across 390×700, 440×766,
  390×844, 440×894 and 480×900 four-seat layouts; 6/8/10-seat side columns;
  0–4 occupied slots, Weapon-only, Horse-only, equip/replace/discard and
  empty-to-occupied transitions. Four fixed slot DOMRects matched the
  390×700 baseline exactly (Weapon x=69.75, Armour x=83.25, +1 Horse
  x=96.75, −1 Horse x=110.25; 12×14 each). Targeted screenshot captures also
  passed 5/5 for 390×700/440×766 and side-column views, plus 3/3 empty/occupied
  6/8/10-seat checks. Native badges and zoomed vector diagnostics are in
  `/tmp/hud4-candidate/` (local evidence, not committed). Build and focused
  browser-spec ESLint passed; local app/page ESLint exceeded the Node heap
  limit, while full ESLint passed in CI.
- Exact-SHA Actions run
  [`39143287983`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39143287983)
  passed lint/fast, API, browser startup/room smoke, D1 migration, Worker deploy
  and production smoke. Worker version `182ff32a-807f-4e34-b423-5a000e5fa34b`.
  The result is **IMPLEMENTED / DEPLOYED — PENDING USER PHONE REVIEW**, not
  accepted. Next bounded task: BCP-1-F2 live public-proof audit.

### UX2-10.13.2.1-U13-B-F privacy-first unconditional public activity — 2026-10-18

- Commit `082091d752ff9e98a8eda23c8392b31396908022` opens the same private
  turn-end response window for living off-turn Yue Jin whether she has an
  eligible Basic card or not. Non-owner projections stay neutral and omit the
  actor, private action, skill eligibility, deadline/countdown and conditional
  timeline announcement. Owner-only Dauntless/cost actions or Pass, the
  existing 60-second timeout, and once-only turn-end continuation are retained.
- Focused Worker/D1 API proof passed 5/5 across four authenticated viewers,
  zero/one Basic-card cases, refresh, Quick Test view switching, owner-only
  timer/action, timeout, Pass, activation and continuation. `npm run build`,
  targeted ESLint and `git diff --check` passed.
- Exact-SHA Actions run
  [`39124315765`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39124315765)
  passed lint/fast tests, API tests, browser startup/room smoke, D1 migration,
  Worker deployment and production smoke. Deployed Worker version:
  `b08efa60-615f-4932-ae60-997ce8c889c8`; a direct production
  `/api/health` check returned `{"ok":true,"worker":"available"}`. The CI
  browser test was startup/room smoke, not a gameplay replay of this feature.
- Privacy-first latency tradeoff: if Yue Jin has no eligible Basic card and
  does not Pass, the unconditional window can add up to 60 seconds to a
  relevant turn. This was explicitly selected by the user. The delivery is
  **IMPLEMENTED / DEPLOYED — PENDING USER REVIEW**, not accepted. Q1–Q4 remain
  paused; accepted H4 positioning and wording are unchanged.

### UX2 §10.18.1 ST5-1 — compact five-player phone Seats — 2026-10-20

- Commit `76d5b89faad227725d3a184468f00e0cefb4a035` scopes two content-sized,
  top-aligned Seat rows to five-player phone boards. The original relative seat
  mapping and 108px Seat height remain unchanged; no author slots, gameplay,
  private projection, H4 or card timing changes were made.
- Mobile browser evidence passed at 390×700, 390×844, 440×766, 440×894 and
  480×900, including actual Hero Inspector and TEST SWITCH taps, Harvest-pool
  collision checks, and 8-player/6- and 10-player phone regressions. The real
  five-player Harvest + committed Negation author-parking scenario passed.
  Screenshots and geometry JSON were attached to the focused local Playwright
  runs; screenshots from the original five-player report remain the before
  evidence.
- Exact-SHA Actions run
  [`39504188992`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39504188992)
  passed lint/fast, API, browser startup/room smoke, D1 migration, Worker deploy
  and production smoke. Worker version `8e86bd75-5bfd-45c3-9420-7b8523870fe4`;
  direct production `/` returned 200 and `/api/health` returned
  `{"ok":true,"worker":"available"}`. **IMPLEMENTED / DEPLOYED — PENDING
  OWNER PHONE REVIEW**, not accepted. The next separately bounded item is
  INS5-2; no code for INS5-2 or BH5-1 is included.

### UX2 §10.13.4.2 E1-F — Equipment miniature waits for physical arrival — 2026-10-23

- Feature implementation `7745c6fc312687cb59858fb04f8470a9e614cb46` gates
  public Equipment miniatures on the committed card journey's actual arrival
  at the matching owner and slot. The central physical CardFace remains the
  same card, server Equipment ownership/effect is immediate, stable empty slot
  anchors preserve real destinations, and the legal Local Dock controls stay
  usable during this Equipment-only flight. Identity/arrival logic is isolated
  in `game/equipment-arrival.js` and its public Equip actor is server-derived.
- Focused local evidence: the four-player Worker/D1 mobile browser suite passed
  7/7 with an owner and independently authenticated observer, including public
  event/card/actor identity, no premature or duplicated miniature, exact target
  slot, settled refresh without replay, Reduced Motion, Armor/Horses,
  replacement, and 4/6/8/10-seat layouts. Equipment API tests passed 20/20;
  arrival identity unit tests passed 4/4; build and targeted ESLint passed.
- Feature-only exact-SHA Actions run [`39904085359`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39904085359)
  exposed two stale source assertions in the room-render fast suite. The
  test-only correction `3142f7b7eb718f15a7260471b573ef37590b7605` updates those
  assertions to the current empty-slot anchor and Equipment-arrival busy-state
  contracts; it does not change product behavior. The final deployed head
  passed every required exact-SHA job in [Actions 39904467908](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39904467908):
  browser startup/room smoke, lint/build/fast (292/292), API tests, D1 migration,
  Worker deployment and production smoke. Worker version
  `502ad7b4-63d8-4548-b877-0be433e2cc05`; direct production
  `/api/health` returned `{"ok":true,"worker":"available"}`.
- Status: **IMPLEMENTED / DEPLOYED — PENDING USER PHONE RE-REVIEW**. No user
  acceptance is inferred from automated or CI results.

### UX2 §10.7.2.1 R2-D — proven single-target Negation chronology — 2026-10-23

- Source commit `cd8615cd74fbc3c3a83343db6788bf0bf2c1b899` adds visible
  `#1…#N` badges to physical cards in a fully proven single-target Negation
  chain. The root and committed responses retain their genuine event, card and
  author identities; only the current card reveals large at centre, and
  previously committed cards stay at their actual author Seats. Group/Duel
  ordinal compatibility is preserved. Server legality, shared Negation timing,
  privacy and card identities are unchanged.
- Focused mobile Worker/D1 browser proof passed root plus four physical
  Negations in 4/6/8-seat rooms and four viewer identities, including refresh,
  TEST SWITCH, new-root reset and one-card-at-centre behavior. Duel/Group
  regression passed 6/6; focused presentation/client tests 9/9; API engine
  tests 45/45; full API suite 301/301 locally; build passed.
- The first exact-SHA workflow attempt recorded a Wrangler internal error in
  API shard 1 after that Worker stopped serving requests; the other shard
  passed 132/132 and the same full API suite passed locally. Re-running the
  same SHA as workflow attempt 2 passed all required jobs and deployed Worker
  `c291a53d-bd7b-490c-919c-55b3a4a15946` in Actions
  [`39912653852`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39912653852).
  Production `/api/health` returned `{"ok":true,"worker":"available"}`.
- Status: **IMPLEMENTED / DEPLOYED — PENDING USER PHONE RE-REVIEW**. No desktop
  UX review or user acceptance is inferred.

### UX2 §10.12.4.1 L4-F — retain Duel history during opponent Inspector — 2026-10-23

- Source commit `74b344d5b298907744918c6eb96ec5f8375e1484` keeps already parked,
  publicly proven Duel/LUST history mounted as a passive read-only presentation
  while an opponent Inspector is open. It preserves genuine event/card/actor
  identities and does not surface a new central reveal or announcement during
  inspection. Closing Inspect returns to the existing journey without replay.
- Mobile browser proof passed printed Duel Inspect→close→TEST SWITCH→refresh,
  the LUST-cost Inspector case, and a four-viewer LUST exchange with one genuine
  skill cost and three alternating Attacks at 390×844 and 440×894. All four
  viewers retained identical public history/author anchors, private Peach
  identity remained owner-only, Inspector operations sent no room POST, Skip
  stayed usable, and settled history retired after its read window.
- Focused local build and targeted ESLint passed (0 errors; 15 existing Hook
  warnings). Exact-SHA Actions
  [`39917886113`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39917886113)
  passed required browser startup/room smoke, lint/build/fast, API tests, D1
  migration, Worker deploy and production smoke. Worker version
  `23a48b13-c48b-409d-a388-741d3d8b26bf`; production `/` and `/api/health`
  returned 200, with health `{"ok":true,"worker":"available"}`.
- Adjacent phone-regression guards: ordinary Attack/Dodge and the proven
  single-target Negation history/narration check passed. The Da Qiao browser
  check reached correct current public copy but has an outdated `used
  Deflection` assertion (source renders `Deflection: DA QIAO redirected Attack
  to REPLACEMENT; discarded Eight Trigrams Formation.`). The four-viewer
  Group/Negation guard surfaced a separate U13-B-G status-chip placement issue
  before any Inspector interaction: at 390×844 the 249×44 chip is hidden
  because its 6px clearance rejects a measured non-overlapping 4.5px gap below
  the central CardFace. This independent follow-up is recorded in
  `docs/UX2-refine.md` §10.13.2.2 and HANDOVER; it is not part of L4's Inspector
  gate.
- Status: **IMPLEMENTED / DEPLOYED — PENDING USER PHONE RE-REVIEW**. CI and
  browser checks do not constitute owner acceptance; no desktop or real-phone
  review is claimed.


### UX2 §10.13.2.2 U13-B-G — Group/Negation activity-chip clearance correction — 2026-10-23

- Source commit `b70c003eca12e5097e75201f95b8b1faabedce72` uses a 2px
  collision clearance for the public activity plaque while retaining the
  existing 6px Harvest-pool clearance. At 390×844, this accepts the measured
  4.5px real gap below the current centre CardFace instead of hiding the shared
  waiting status. H4/card geometry, public identity/projection, gameplay, chip
  typography and touch behavior are unchanged.
- Focused mobile proof: the existing four-viewer Group/Negation guard passed at
  390×700, 390×844, 440×894 and 480×900; all four screenshots show the same
  status plaque visible without collision with the centre CardFace or Local
  Dock. The existing activity-chip mobile suite passed 4/4, covering the
  original 440×766 Duel parking case (12px offset, no 102.5px jump) and 4/6/8/10
  player arrangements. Targeted ESLint, build and `git diff --check` passed.
- Exact-SHA [Actions 39920246252](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39920246252)
  passed lint/build/fast, API, browser startup/room smoke, D1 migration, Worker
  deployment and production smoke. Worker version
  `cec77337-1ca5-412a-8120-b3468ec6d57b`; direct production `/` and
  `/api/health` returned 200, with health
  `{"ok":true,"worker":"available"}`.
- Status: **IMPLEMENTED / DEPLOYED — PENDING USER PHONE RE-REVIEW**. No user
  phone acceptance is inferred.

### UX2 §10.11 G1 — Stargazing whole-card touch origin — 2026-10-23

- Source commit `deab81974aa08ea8335579d058e0237a3494261f` removes the tiny-grip
  prerequisite for a touch drag. The whole private CardFace now captures touch;
  a 260ms hold activates drag, while pre-hold movement scrolls its card row or
  the three-zone sequence in the gesture's dominant direction. The Move menu,
  keyboard fallback, local-only arrangement and server submission contract are
  unchanged.
- Focused real Worker/D1 browser checks passed 3/3 at 390×844, 390×700 and
  320×640. They cover non-grip art touch, hold/move/drop, insertion/highlight,
  quick tap, horizontal swipe, pointer cancellation, Move-menu arrangement,
  card conservation and no request before explicit completion. Build and
  targeted ESLint passed; ESLint reported 3 existing React Hook warnings in
  `app/page.tsx` outside this change. Host WebKit validation was attempted but
  could not start because its Page protocol rejected `PushAPIEnabled`; no native
  Safari result is claimed.
- Exact-SHA [Actions 39922538234](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39922538234)
  passed lint/build/fast, API, browser startup/room smoke, D1 migration, Worker
  deployment and production smoke. Worker `e9a0cf99-5e4b-4213-8374-93fc0664beaf`;
  production `/api/health` returned `{"ok":true,"worker":"available"}`.
- Status: **IMPLEMENTED / DEPLOYED — PENDING USER PHONE RE-REVIEW**. G2
  all-zone/order/privacy end-to-end remains a separate uncompleted slice; no
  phone acceptance is inferred.

### UX2 §10.11 G2 — Stargazing all-zone ordering and privacy proof — 2026-10-23

- Source/test commit `ca82a1d340d979f30d4ca12c61afedd9701fccbc` converts the
  authenticated Stargazing end-to-end coverage to real mobile touch input.
  Against Worker/D1 it proves middle-to-Top/Bottom, Top↔Bottom, ordered
  insertion within both zones, Bottom reorder, Return to middle, empty zones,
  invalid drop/cancel, horizontal edge scrolling, rapid operations, exact
  submitted arrays, one-each identity conservation, `minTop/maxTop`,
  Complete-disabled safety and no server update before explicit completion.
- An independent-token viewer's raw room projection and visible DOM remain
  free of the owner's private card IDs and rearranged order. Focused browser
  coverage passed 5/5 across 390×844, 390×700, 440×894, 480×900 and the 320×640
  edge-scroll case; focused API tests passed 8/8. Build, targeted ESLint,
  syntax and diff checks passed. No desktop checks were run.
- Exact-SHA [Actions 39925022548](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39925022548)
  passed browser smoke, API, lint/fast, D1 migration, Worker deployment and
  production smoke. Worker version
  `c95b877a-b54d-459c-869c-6c281ddc8e78`; direct
  `/api/health` returned `{"ok":true,"worker":"available"}`.
- The installed host WebKit runner still fails before page setup with
  `Page.overrideSetting: Unknown setting: PushAPIEnabled`; no native Safari
  evidence is claimed. G1/G2 status: **IMPLEMENTED / DEPLOYED — PENDING USER
  PHONE RE-REVIEW**. No user acceptance is inferred.

### UX2 §10.10 T1 — Shared Steal/Burning Bridges choosing progress — 2026-10-23

- Source commit `5f6c2f76b3bc263739da33776e4dee0760367267` adds a public,
  server-proven choosing cue shared across the actor, target and unaffected
  viewers. The actor-only target-card picker remains private; selection zones,
  card identities, indexes and unconfirmed intent remain hidden. The cue is
  absent before Negation settles, after cancellation and once the choice
  settles.
- Four authenticated Worker/D1 mobile views passed focused browser coverage
  4/4 at 390×844 for Steal and Burning Bridges; focused API cue/privacy checks
  passed 9/9. Targeted ESLint, build, browser syntax and diff checks passed.
- Exact-SHA [Actions 39928183907](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39928183907)
  passed browser startup/room smoke, lint/fast, API, D1 migrations, Worker
  deployment and production smoke. Worker
  `6ae645da-7bff-4089-9ec6-0c7470ae9c0f`; live `/api/health` returned
  `{"ok":true,"worker":"available"}`.
- Status: **IMPLEMENTED / DEPLOYED — PENDING USER PHONE RE-REVIEW**. T2's
  public destination/real-card proof and T3's responsive end-to-end regression
  remain separate; no desktop or owner-phone acceptance is inferred.

### UX2 §10.10 T2 — Public target-card source/destination proof — 2026-10-23

- Source commit `8f4b13524236f2187217ffa85399584a2a7deea2` adds validated
  public source-zone, affected-owner and destination evidence for Steal and
  Burning Bridges. Hidden-Hand Steal never includes the selected CardFace;
  public Equipment/Judgement transfers and committed public discards retain
  the genuine authorized face. Presentation and timeline normalization fail
  closed on incomplete or mismatched proof.
- All six effect × source-zone cases passed the focused real Worker/D1 API
  matrix (29/29) and four-independent-viewer mobile browser matrix (one test,
  six cases at 390×844), including equal viewer proofs, actor-only picker
  privacy, public result attributes, reload, and Hand privacy. Focused copy and
  room-safety tests passed 14/14; targeted ESLint had zero errors and 15
  existing Hook dependency warnings; local build, browser syntax and diff
  checks passed. No desktop or owner-phone review is claimed.
- Exact-SHA [Actions 39932636158](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39932636158)
  passed browser startup/room smoke, lint/build/fast, API, D1 migration,
  Worker deployment and production smoke. Worker version
  `7fabca04-b429-46e2-8794-6d020cac85ef`; direct production `/api/health`
  returned `{"ok":true,"worker":"available"}`.
- Status: **IMPLEMENTED / DEPLOYED — PENDING USER PHONE RE-REVIEW**. T3
  responsive end-to-end regression is the next independent slice.

### UX2 §10.10 T3 — Responsive target-card end-to-end regression — 2026-10-23

- Source commit `2ccbd7bfd772c2a713c94bb37fbab614f5ada19d` fixes the
  `CurrentAction` target-card picker gate that disabled a valid restored Steal
  choice during root-card presentation, and keeps shared settlement readable
  across phone viewports. The real Worker/D1 mobile browser matrix passed four
  scenarios: 4 seats at 390×844 (Steal/Hand and fast next root), 6 seats at
  440×894 (Burning Bridges/Equipment and long names), 8 seats at 480×900
  (Steal/Judgement, reduced motion, reconnect/viewer switch), and 4 seats at
  390×700 (one-card Hand). A separate four-viewer 390×844 counter-Negation
  scenario verifies that cancelled roots do not expose the chooser, restored
  Steal stays legally selectable, and no target Hand identity leaks. All
  independent observers retained equivalent public proof and one authentic
  root card; the actor retained the private picker. Existing mobile
  Negated-Steal/Dismantle and Inspector/SWITCH regressions also passed.
- Local focused validation included API shard 1 (171/171, reproducing the
  transient first-attempt CI `fetch failed` as a clean pass), targeted mobile
  browser cases, build, ESLint, browser syntax, and `git diff --check`. The
  same-SHA rerun of exact Actions
  [39939272435](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39939272435)
  passed all required jobs and deployed Worker
  `dfcc8ba6-57e9-4fbd-b5e0-4f3afde9efe1`; production smoke and direct
  `/api/health` (`{"ok":true,"worker":"available"}`) passed.
- Status: **IMPLEMENTED / DEPLOYED — PENDING USER PHONE RE-REVIEW**. This
  completes T3 technically; T1/T2/T3 remain independently reviewable and no
  owner phone acceptance is inferred.

### UX2 §10.15 Q3 — Viewer/layout rebase without motion — 2026-10-23

- Source commit `1a0a5dc6185334353ab7e6148df4239c317888ef` adds the viewer/layout
  epoch barrier for parked public-card Journeys. A parked card is withheld
  until the current viewer's true-author anchor is measured, then snaps into
  place without replaying its reveal or animating from another viewer's old
  geometry. New committed-card REVEAL→MOVE behavior and game rules remain
  unchanged.
- Five focused mobile browser regressions passed across targeted runs:
  Group-root history, Attack/Dodge with an unmeasured author anchor,
  authenticated viewer change with single-target Negation history, Duel
  history through SWITCH/resize, and Lust's first visible frame. The checks
  confirmed current-view anchors, no stale first paint or transition, no
  reveal reset, and privacy of losing Negation cards. Focused build, lint,
  browser syntax and diff checks passed; no desktop or owner-phone acceptance
  is claimed.
- Exact-SHA [Actions 39945676809](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39945676809)
  passed API, browser startup/room smoke, lint/fast, D1 migration, Worker
  deployment and production smoke for this source SHA. Worker version
  `f7278550-b125-4c0a-9e25-667fc3eb9b97`; direct production `/api/health`
  returned `{"ok":true,"worker":"available"}`.
- Status at Q3 delivery: **IMPLEMENTED / DEPLOYED — PENDING USER PHONE REVIEW**. Q4 was subsequently completed and is recorded in the current design status index; no user acceptance is inferred.

### UX2 §10.19 NEG-A1 — Harvest choice recovery and Negation identity dedup — 2026-10-23

- P0 `UX2-10.19-NEG-A1-F1-HARVEST-CHOICE-UNBLOCK` restores the authentic server-authorized Bumper Harvest choice after a shared Negation window. An authenticated four-viewer Worker/D1 game proved card selection/deselection, one successful `choose_harvest`, refresh recovery, spectator read-only state, and authority moving to only the next chooser. P0 exact-SHA [Actions 40014350901](https://github.com/dmoneyUK/three-kingdoms/actions/runs/40014350901) passed required CI and deployment; Worker `6a2b406b-82d7-4040-ae39-09178148d39f`.
- F2 `UX2-10.19-NEG-A1-F2-NEGATION-CARD-DEDUP` first source `7944ff26b59f259c1d67926ddaa3288f141bca10` validated public event/card identity across `responses` and `responseHistory`, but did not pass owner phone review. Continuous animation-frame capture later reproduced the remaining transition race: the same event/card appeared in both legacy `settled-table-card` and Journey `parked` renderers before parent ownership acknowledgement.
- Corrected F2 source `f392c463b0ceaa6563812a8d9ef5b1ea41c81d0f` passes exact authenticated public `responseHistoryOwnership` event/card IDs into the Journey and gates the response-history mini until the parent confirms ownership, aligning legacy removal with mini visibility in one render. The existing focused mobile regression captured all frames across four authenticated viewers, a two-counter chain, late refresh, readonly active-counter pool and legal next chooser/TEST SWITCH; three runs recorded zero duplicate physical-card frames. Focused local build, ESLint (0 errors; 15 existing Hook warnings) and `git diff --check` passed. No game rules, privacy, actual public card identity, desktop UX or accepted Harvest geometry changed.
- Corrected F2 passed every required exact-SHA CI and deployment job in [Actions 40025900210](https://github.com/dmoneyUK/three-kingdoms/actions/runs/40025900210). Worker version `c2860e1b-39a6-4bdb-82f0-6474b449328a`; direct production `/api/health` returned `{"ok":true,"worker":"available"}`. **P0, P1 and parent NEG-A1 status: IMPLEMENTED / DEPLOYED — PENDING OWNER PHONE RE-REVIEW; the owner's previous acceptance remains NOT PASSED.** No desktop UX review was run.


### UX2 §10.19.4.1a P0 F1-R2 — Harvest terminal finalization after final Negation — 2026-10-23


- Production repair source `11cb6ab00228a0adffbf5372fd42289e63843fd5` makes `advance_timers` an authenticated, membership-checked maintenance action while preserving playing-state validation, the authoritative completion deadline and existing D1 CAS. It adds sanitized mismatch/deadline/CAS diagnostics, omits viewer action context from the client maintenance request, and retries only after refreshing the same expired completed Harvest with bounded, single-flight recovery.
- That implementation passed exact-SHA [Actions 40032054377](https://github.com/dmoneyUK/three-kingdoms/actions/runs/40032054377); deployed Worker `7991772e-b65e-456f-8986-94558b332611`; direct production `/api/health` returned `{"ok":true,"worker":"available"}`. Focused local API tests passed 45/45, Stratagem API 29/29, build passed, focused ESLint had zero errors and three existing Hook warnings, and the original Harvest browser file passed 3/3.
- Follow-up browser coverage commit `65e58acc8fb8b05cd6615f1b503228d03937f953` adds the four phone viewport sizes 390×700, 390×844, 440×956 and 440×766 while the completed hold persists, plus refresh, hidden→visible recovery and TEST SWITCH while a timer request is in flight. The full focused Harvest browser file passed 3/3 locally; ESLint and `git diff --check` passed. Exact-SHA [Actions 40034117287](https://github.com/dmoneyUK/three-kingdoms/actions/runs/40034117287) passed all required jobs (API, lint/fast, browser smoke, deployment and production smoke); Worker `4fab79d8-f52b-466e-a311-0e251e3ec306`; direct production `/api/health` returned `{"ok":true,"worker":"available"}`.
- Status remains **IMPLEMENTED / DEPLOYED — PENDING OWNER REAL-PHONE RE-REVIEW**. The owner's 2026-10-23 acceptance remains failed pending fresh phone review; no desktop or real-phone acceptance is inferred. The separate Harvest miniature parking observations remain outside this gameplay repair.

### UX2 §10.23 P0 — Play-Phase action liveness — 2026-10-24

- F1 stabilizes the public-event presentation timer on genuine event identity and safely retires only the matching event. F2 lets an authorized ordinary turn Play/Confirm/End proceed independently of an older decorative reveal while preserving `CurrentAction`, target eligibility, request-busy and server validation. Source `fcc35a9be3365193996e603cbf2a624eb9626b68` passed exact-SHA [Actions 40038794768](https://github.com/dmoneyUK/three-kingdoms/actions/runs/40038794768); Worker `502d9941-4f90-4317-ab04-8a0a3f0651b3`.
- On descendant `099a77c30352774511d07bfd5ade43460f9875ab`, the focused real Worker/D1 browser command `npm run test:browser -- --grep 'P0 F[12]:' --workers=1` passed 2/2, covering repeated harmless polling and Halberd / Overindulgence submission during an older committed reveal. The same descendant passed exact-SHA [Actions 40040588051](https://github.com/dmoneyUK/three-kingdoms/actions/runs/40040588051) and deployed Worker `7d52ff19-48de-41b6-9ca7-7e13e2db7acc`; direct production `/api/health` returned `{"ok":true,"worker":"available"}` and `/` returned 200.
- Status is **IMPLEMENTED / DEPLOYED — PENDING OWNER REAL-iPHONE RE-REVIEW**. This focused regression is not a claim of a fresh owner phone replay of the complete Duel/Retaliation sequence.

### UX2 §10.22 S1 — Reusable Harvest stage shell and placement — 2026-10-24

- Source `099a77c30352774511d07bfd5ade43460f9875ab` extracts Harvest's pure lane/top placement helpers and `BattlefieldChoiceStage` wrapper while preserving the existing adapter, controls and event flow. The 390×700 before/after phone geometry for table/stage/panel/H4/timer matched; focused real-Worker Harvest choice and reveal/MOVE browser checks passed. Targeted build passed; ESLint had zero errors and three existing Hook warnings.
- Exact-SHA [Actions 40040588051](https://github.com/dmoneyUK/three-kingdoms/actions/runs/40040588051) passed API, lint/fast, browser startup/room smoke, deployment and production smoke. Worker `7d52ff19-48de-41b6-9ca7-7e13e2db7acc`; direct `/api/health` returned `{"ok":true,"worker":"available"}`. Known Harvest geometry failures were reproduced unchanged on base `9cc450b`; they remain limitations, not S1 changes.
- Status: **IMPLEMENTED / DEPLOYED — PENDING USER PHONE REVIEW**. S2 is the next bounded task; no owner phone acceptance is inferred.

### UX2 §10.22 S2 — Reusable public CardPoolPanel — 2026-10-24

- Source `3b75703b354676036d0955856a71bb018a136a48` extracts Harvest's public-card row, available/taken/selected state, independent Info control, optional swipe cue and pinned Confirm footer into `app/card-pool-panel.tsx`. Harvest supplies only projected public CardFaces and retains `CurrentAction`-gated selection and submit callbacks. Existing Harvest classes, IDs, card geometry, status labels and CSS are preserved; no gameplay or permission behavior changed.
- Mobile browser evidence: five/eight-seat public pool geometry, touch swipe and Info passed 1/1 using the existing Harvest density scenario narrowed to these phone cases; real server chooser/Confirm and four-viewer NEG-A1 readonly/identity checks passed 2/2. The broader pre-existing density scenario still fails at the first 4-seat/390×700 one-card case on the documented 1px pool/timer overlap reproduced on base `9cc450b`; this S2 extraction changes no geometry and leaves that assertion intact. Production build passed; targeted ESLint had 0 errors and 3 existing Hook warnings.
- Exact-SHA [Actions `40042140294`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/40042140294) passed API, lint/fast, browser startup/room smoke, deploy and production smoke. Worker `89e4983f-f811-47bb-a64c-1fd9c1745aa6`; direct production `/api/health` returned `{"ok":true,"worker":"available"}` and `/` returned HTTP 200.
- Status: **IMPLEMENTED / DEPLOYED — PENDING USER PHONE REVIEW**. S3 is next; owner acceptance is not inferred.

### UX2 §10.21 TGT-A2 — five-seat mobile ordinary Attack affordance — 2026-10-24

- The approved five-seat phone behavior is implemented in `a9fccfa73dc82edc9e30f4ba992132ac2ece20eb` and present in deployed descendant `9912674ec273c1f0940c9c694c7611e896202b49`. Exact-SHA [Actions 40052561794](https://github.com/dmoneyUK/three-kingdoms/actions/runs/40052561794) passed lint/fast, API, browser smoke, deployment and production smoke; deployed Worker `6e6d4350-88d3-4015-bc99-4dab9c529861`.
- The focused mobile Playwright group passed 13/13 across 390×700, 390×844, 440×766, 440×894 and 480×900, covering target selection/retap, invalid-target rejection, Inspector/Details, TEST SWITCH and four/six/eight-seat control retention. The current suite's obsolete central Attack Response assertion was updated to verify local Inspector closure and authoritative response actor transfer. This status is **IMPLEMENTED / DEPLOYED — PENDING USER PHONE REVIEW**; no phone acceptance is inferred.

### UX2 §10.17.3 BCP-3 — Sima Yi Retaliation selection and Skip controls — 2026-10-24

- Existing implementation `f0df9b6` provides the compact phone picker, retap-to-deselect, no redundant Cancel, legal Use/Skip side-by-side, and actor-only opaque hand-position choices. Focused real Worker/D1 Playwright tests passed 2/2 at 390×700 and 440×766, proving authorized selection/Skip, privacy, inspection without action, and single submit.
- Exact-SHA [Actions 40054343222](https://github.com/dmoneyUK/three-kingdoms/actions/runs/40054343222) passed lint/fast, API, browser smoke, deployment and production smoke for descendant `e6c8551850be0a6f6af2178498b7379a4e240b8a`; Worker `cfaf3ef0-5e32-4e16-8520-37f887812bc1`, production `/api/health` and `/` returned 200. Status: **IMPLEMENTED / DEPLOYED — PENDING USER PHONE REVIEW**; no acceptance is inferred.

### UX2 §10.17.4 HUD-4 — fixed opponent Equipment slots and diagonal sword — 2026-10-24

- Fixed four-slot footprints were implemented in `5a8505e`; the clearer diagonal blade/crossguard/grip/pommel glyph was refined in `e2e645f`. The focused `tests/browser/u13-d-f-opponent-hp-gear.spec.mjs` passed 47/47, covering 0–4 equipment, horse-only/weapon-only, equip/replace/discard, five phone sizes from 390–480px, 6/8/10-seat side columns and sword geometry.
- Both changes are present in deployed descendant `e6c8551850be0a6f6af2178498b7379a4e240b8a`; exact-SHA [Actions 40054343222](https://github.com/dmoneyUK/three-kingdoms/actions/runs/40054343222) passed all required checks and deployed Worker `cfaf3ef0-5e32-4e16-8520-37f887812bc1`; production health/root returned HTTP 200. Status: **IMPLEMENTED / DEPLOYED — PENDING USER PHONE REVIEW**, not accepted.

### UX2 §10.12.6 L5-F — generated-Duel result lifetime through damage triggers — 2026-10-24

- Current Worker/D1 reproduction used authenticated four-viewer mobile games and reproduced both the committed-Attack chain and immediate decline→damage→Legacy Skip gaps. Root cause crossed the public settlement projection, same-root damage continuation, delayed first-paint expiration and H4 placement after mobile reflow.
- The source fix retains only the exact public settlement through a bounded 8-second reconnect buffer and proven child DAMAGE continuation, gives each viewer a two-second hold from its first visible paint, recalculates mobile H4 geometry after the centre card clears, and lets a newer committed root supersede the result. It does not change game deadlines, legality, privacy or card conservation.
- Three authenticated Worker/D1 repeats passed all 9 focused L5 cases. Normal first paint was 12–983ms; late reconnect first paint was 2,543–2,577ms and stayed visible 2,014–2,027ms. The decline/damage/Skip branch painted across four phone sizes at 390×700–440×956 for 2,002–2,041ms with 0–36ms maximum hidden gap. Four viewers received the same public proof; the unspent Peach remained owner-private. The fixture exposes no Standard LUST damage-prevention provider, so no prevented-damage game result is claimed.
- Exact deployed source `c0529f3c197fafcac628b2843085f70ffd969685` passed [Actions 40073732791](https://github.com/dmoneyUK/three-kingdoms/actions/runs/40073732791), including API, lint/fast, browser smoke and Worker deployment. Worker `766e3ff0-d7de-4eb4-a891-a924396c8a73`; production health and root returned HTTP 200. **IMPLEMENTED / DEPLOYED — PENDING OWNER PHONE RE-REVIEW**; no user acceptance is inferred.

### UX2 §10.9 W2 — shared proof-fed public Card Frames — 2026-10-24

- Source `2b99e7b4e05dc41b86c81185b83ca6e22e76fdad` adds a validated public-proof view and reusable responsive 1/2/N CardFace frame, event/card/activation/material-owner identifiers, accessible frame details, and exact-event duplicate notice suppression. Diao Chan's existing LUST cost frame uses it as the first baseline. For supported single-owner groups, physical history follows the actual material owner's Seat.
- Authenticated Worker/D1 mobile L5 passed across four concurrent viewers at 390×700, 390×844, 440×766 and 480×900, plus a 440×894 late join with reduced motion. It checked public card identity and owner parity, the genuine one-card frame, owner-seat parking, retained history through refresh/reconnect, rapid real Duel responses, and the legal next response. The narrow-phone terminal result keeps the established center while increasing from 224px to 260px where the earlier width no longer fits the final copy. Focused Deflection regressions passed 2/2; frame layout/factory tests passed 4/4; production build and `git diff --check` passed. Focused ESLint reported zero errors and 16 Hook-dependency warnings.
- Exact-SHA [Actions 40080892236](https://github.com/dmoneyUK/three-kingdoms/actions/runs/40080892236) passed lint/fast, API, browser startup/room smoke, D1 migration, Worker deployment and production smoke. Worker `dcc9d350-68bf-4fb5-b262-02784f714eb3`; direct production `/api/health` returned `{"ok":true,"worker":"available"}` and `/` returned HTTP 200. Status: **IMPLEMENTED / DEPLOYED — PENDING USER PHONE REVIEW**. W3 is the next bounded §10.9 slice; no user acceptance is inferred.

### UX2 §10.9 W4 — Hua Tuo First Aid AS PEACH conversion frame — 2026-10-24

- Source `f8d002f9b03331f57e6d7585cf43dcc8313c6c74` adds a proof-gated W2 Frame for the exact public First Aid conversion event, retaining the genuine red non-Peach physical card, Hua Tuo as activation/material owner, actual Dying target, and AS PEACH meaning. It changes no server rule or legal response path and fabricates no Peach CardFace.
- Four authenticated Worker/D1 viewers passed the focused mobile browser scenario (1/1) at 390×844 and 440×894. It verified matching public identity/frame/narration, actual rescue completion, true actor Seat/Dock parking, one announcement and private unspent Hand identity. `npm run build` and `git diff --check` passed.
- Exact release SHA `48e2853c6ee5c87e29892967f7bdfbeabb7e16ca` passed [Actions `40120389446`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/40120389446), including lint/fast, API, browser smoke, D1 migration, Worker deployment and production smoke. Worker `e060f574-06ec-4662-ae85-153b977c3126`; direct production `/` and `/api/health` returned HTTP 200 with `{"ok":true,"worker":"available"}`. Status: **IMPLEMENTED / DEPLOYED — PENDING USER PHONE REVIEW**; no acceptance inferred.

### UX2 §10.9 W4-F2 — Braveheart Dodge AS ATTACK — 2026-10-25

- Exact source SHA `ee45af2e8b1df7039db821e8edce7e54bc89f0fb` adds the proof-gated `BRAVEHEART · DODGE AS ATTACK` frame only for the real Zhao Yun Dodge card used as an Attack in the active Play Phase. The public source/target and existing authoritative response remain intact; ordinary or mismatched proof stays on the generic Attack presentation.
- Focused authenticated mobile browser regression passed 2/2 at 390×844 for Zhao Yun and an independent observer, verifying the identical physical Dodge CardFace/frame/narration, legal target Dodge, privacy and announcement geometry. Build passed.
- Exact-SHA [Actions `40149627373`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/40149627373) passed lint/fast, API, browser startup/room smoke, D1 migration, Worker deployment and production smoke. Worker `cc6b2005-d6fc-4ac6-b1cd-dc41b76fca31`; production `/` and `/api/health` returned HTTP 200, health `{"ok":true,"worker":"available"}`. **IMPLEMENTED / DEPLOYED — PENDING USER PHONE RE-REVIEW**; no acceptance inferred.

### UX2 §10.9 W4-F3 — Braveheart Attack AS DODGE in Attack response — 2026-10-25

- Exact source SHA `5967adb3e8808f189bd5caaf56f42671009bedcb` proof-gates the `BRAVEHEART · ATTACK AS DODGE` Frame to the genuine Zhao Yun physical Attack card played as Dodge, its exact committed response event, and the server-proven original Attack root/target. Existing authoritative response, card identity, source/target, privacy and turn flow are unchanged.
- Focused authenticated phone browser regression passed 1/1 at 390×844 with Zhao Yun and an independent observer. Both saw the same real Attack CardFace, conversion Frame/narration and legal response; unspent Hand identity stayed private and announcement did not overlap the frame. `npm run build` passed.
- Exact-SHA [Actions `40150717558`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/40150717558) passed API, lint/fast, browser startup/room smoke, D1 migration, Worker deployment and production smoke. Worker `c48a01ed-934d-4070-b567-49f832cb706d`; direct production `/` and `/api/health` returned HTTP 200, health `{"ok":true,"worker":"available"}`. **IMPLEMENTED / DEPLOYED — PENDING USER PHONE RE-REVIEW**; no owner acceptance inferred.

### UX2 §10.9 W4-F6 — Da Qiao Captivating AS OVERINDULGENCE — 2026-10-25

- Source `6a80c7c5f60730c56a46bba699af3cc66932f92a` binds the authentic Diamond play and Da Qiao's public conversion proof to the semantic Overindulgence Negation root, keeping the actual target and final Judgement/Discard lifecycle. The shared Frame/narration appears consistently for actor, target and observer. No gameplay rule or legal-action change.
- Da Qiao API coverage passed 16/16. Focused mobile browser passed 1/1 at 390×844 across three viewer identities; the public projection kept private hand IDs absent while the responding observer retained their own legal Negation option. Build, targeted ESLint (zero errors; three existing Hook warnings), and `git diff --check` passed.
- Exact-SHA [Actions `40160617069`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/40160617069) passed API, lint/fast, browser startup/room smoke, D1 migration, Worker deployment and production smoke. Worker `29a86931-2b47-4d81-af75-91d00218d4cf`; direct production `/` and `/api/health` returned HTTP 200 with `{"ok":true,"worker":"available"}`. **IMPLEMENTED / DEPLOYED — PENDING USER PHONE REVIEW**; no acceptance inferred.

### UX2 §10.9 W4-F7 — Yue Jin Dauntless target Equipment EFFECT frame — 2026-10-25

- Source `2131052c4967e7d83053ce30a1b9d2092cd25f4c` adds a separate proof-gated public Frame for the target's committed Equipment discard. It validates the unique event and snapshot proofs, exact Equipment CardFace and Equipment→Discard material, Yue Jin activation owner, affected-player material owner, and `DAMAGE_PREVENTED`; the genuine card parks at the affected player's Seat/Dock. No server rule, choice, privacy, or legality changed.
- The existing four-viewer mobile Dauntless browser test passed 1/1 at 390×844, including the target-owned EFFECT Frame, Seat/Dock parking, no-damage outcome and private unspent Hands. `npm run build` passed; targeted ESLint had zero errors and three existing Hook warnings; `git diff --check` passed.
- Exact-SHA [Actions `40161339965`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/40161339965) passed API, lint/fast, browser startup/room smoke, D1 migration, Worker deployment and production smoke. Worker `981c8d60-d419-4546-b635-e77f2970f547`; Actions smoke passed production `/` and `/api/health`. Status: **IMPLEMENTED / DEPLOYED — PENDING USER PHONE REVIEW**; no phone acceptance is inferred.

### UX2 §10.9 W4-F8 — Sima Yi Necromancy JUDGEMENT replacement frame — 2026-10-25

- Source `5275756d2a79d39c411b6a11f994f9ca0610c41d` shows only the genuine committed replacement CardFace under the proven `sima_yi_guicai` JUDGEMENT proof and shared W2 frame. Original/replacement Judgement identities, authoritative final Judgement/Discard transitions, privacy and one revelation are preserved; game rules are unchanged.
- Focused authenticated mobile browser regression passed 1/1 at 390×844 with Sima Yi and an independent observer, checking matching real CardFace/frame/owner, one announcement, no overlap, and hidden-Hand privacy. Build, focused ESLint (0 errors; 16 existing Hook-dependency warnings) and `git diff --check` passed.
- Exact-SHA [Actions `40163024440`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/40163024440) passed API, lint/fast, browser startup/room smoke, D1 migration, Worker deployment and production smoke. Worker `2e82235b-687c-49bd-b958-2b5d65422b8e`; direct production `/` and `/api/health` returned HTTP 200, health `{"ok":true,"worker":"available"}`. **IMPLEMENTED / DEPLOYED — PENDING USER PHONE RE-REVIEW**; no acceptance inferred.

### UX2 §10.9 W4 — Xiahou Dun Stauchness discard COST frame — 2026-10-25

- Source `b9b207699e54c22f9f81af8d1658168ae29ec6d8` shows the two genuine Hand CardFaces only after the unique public `xiahou_dun_ganglie` COST proof confirms the linked root, actual source-owned Hand→Discard movement and `SOURCE_DISCARDED_TWO` outcome. Xiahou Dun remains the skill actor; the damage source owns and parks the materials. The take-damage branch has no fabricated cost Frame; gameplay authority and rules are unchanged.
- Focused real-gameplay mobile regression passed 2/2 at 390×844, covering both choices and all three relevant viewers (skill actor, payer and observer), exact card identities/owners, one announcement and private-Hand isolation. Local build and `git diff --check` passed; targeted ESLint had zero errors and three existing Hook-dependency warnings.
- Exact-SHA [Actions `40164369644`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/40164369644) passed lint/fast, API, browser startup/room smoke, D1 migrations, Worker deployment and production smoke. Worker `f2cea127-8470-495e-a707-ba016b0f5521`; direct production `/` and `/api/health` returned HTTP 200 with `{"ok":true,"worker":"available"}`. **IMPLEMENTED / DEPLOYED — PENDING USER PHONE RE-REVIEW**; no owner acceptance inferred.
### UX2 §10.9 W5 — Rock Cleaving Axe two-card COST Frame — 2026-10-25

- Source `ae0ae940aad953b9d1764881a91d78365017c5e0` adds a fail-closed shared W2 Frame for the unique proven `rock_cleaving_axe_attack_dodged` COST event, validating the linked Attack root, true activation owner and target, and both genuine Hand/Equipment→Discard CardFaces. It preserves the original Attack/Dodge and force-hit continuation, the equipped Axe, and private unspent Hands; no gameplay rules changed.
- The focused authenticated mobile real-gameplay regression passed 1/1 at 390×844 for attacker, target and observer, including identical two-card frame/narration, true Dodge and HP result, and privacy. Build and `git diff --check` passed; targeted ESLint had zero errors and three Hook-dependency warnings.
- Exact-SHA [Actions `40165496466`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/40165496466) passed lint/fast, API, browser startup/room smoke, D1 migrations, Worker deployment and production smoke. Worker `7f8f06e4-a0fe-4abb-8263-b4c9da156c38`; direct production `/api/health` returned `{"ok":true,"worker":"available"}` and `/` returned HTTP 200. **IMPLEMENTED / DEPLOYED — PENDING USER PHONE REVIEW**; no user acceptance inferred.

### UX2 §10.9 W5 — Kirin Bow target-Mount EFFECT Frame — 2026-10-25

- Source `39b44e16eb75697d3eb204821319414238cc5c1d` admits only a unique committed target-owned Equipment→Discard Mount event whose raw and projected `kirin_bow_damage_about_to_apply` proofs match the genuine original Attack/root resolution, activation owner, target and `MOUNT_DISCARDED_DAMAGE_CONTINUES` outcome. The shared W2 Frame shows the real Mount and truthful damage continuation while parking it at the target-owner Seat; gameplay, legal responses and private Hands are unchanged.
- Focused authenticated mobile real-gameplay regression passed 1/1 at 390×844 for attacker, target and observer: all saw the same Shadowrunner Frame and announcement, the target lost the Mount, damage resolved and unspent Hands stayed private. Build passed; targeted ESLint had zero errors and three existing Hook warnings; `git diff --check` passed.
- Exact-SHA [Actions `40166206959`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/40166206959) passed lint/fast, API, browser startup/room smoke, D1 migrations, Worker deployment and production smoke. Worker `93b8cd79-e36b-46aa-8dae-9da2ba111c51`; direct production `/api/health` returned `{"ok":true,"worker":"available"}` and `/` returned HTTP 200. **IMPLEMENTED / DEPLOYED — PENDING USER PHONE REVIEW**; no user acceptance inferred.

### UX2 §10.9 W5 — Yin-Yang Swords target-discard EFFECT Frame — 2026-10-25

- Source `1edee84047f76966880c6cc7949e4167c5886df4` gates the public Frame on the exact committed target-owned Hand→Discard proof linked to the real Attack root in both raw event and projected snapshot. It presents the genuine discarded CardFace at the target's Seat after commit; the unchosen Hand identity and attacker's private Draw 1 remain private. Game rules, legal Dodge and server authority are unchanged.
- Focused authenticated Worker/D1 mobile regression passed 1/1 at 390×844: attacker, target and observer saw the same CardFace/frame/announcement; pre-commit and remaining Hand identities stayed private; the target completed the real Dodge response without damage. Build passed; targeted ESLint had 0 errors and three existing Hook warnings; `git diff --check` passed.
- Exact-SHA [Actions `40167157872`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/40167157872) passed lint/fast, API, browser startup/room smoke, D1 migration, Worker deployment and production smoke. Worker `000ac9fe-ba4e-4406-a9ca-36392a07d4db`; production `/` returned HTTP 200 and `/api/health` returned `{"ok":true,"worker":"available"}`. **IMPLEMENTED / DEPLOYED — PENDING USER PHONE REVIEW**; no owner acceptance inferred.

### UX2 §10.9 W3-F2-R1 — committed Negation chain during TEST SWITCH — 2026-10-25

- Focused authenticated Worker/D1 mobile regression on a real committed Negation/counter-Negation chain during viewer switching reproduced the public announcement becoming hidden after the viewer layout changed. The correction invalidates stale viewer geometry and reruns the existing bounded safe-placement search only when the layout viewer changes; card ownership, event identity, legal responses, privacy and gameplay rules are unchanged.
- Code source `94a3297206be4027331d6849aa22e7c79b42994a`; a subsequent lint-only repair removes an unused test callback argument at `9770ca21f53bc5a33bbbd2a732aab33b81fa98ea`. The exact source SHA's [Actions `40169042442`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/40169042442) passed lint/fast, API, browser startup/room smoke, D1 migration, deployment and production smoke. Worker `1a379b16-5f3a-4c3c-8e4e-f6fc2e64f2ba`; production `/` and `/api/health` returned HTTP 200, with `{"ok":true,"worker":"available"}`.
- `npm run build`, `node --check tests/browser/test-mode-viewer-switch-real-gameplay.spec.mjs`, targeted ESLint and `git diff --check` passed. The focused regression failed before the correction and captured the unsafe announcement state; post-fix focused browser verification was **SKIPPED — five-minute local UI limit reached**. GitHub's browser smoke covers room startup, not this new regression. **IMPLEMENTED / DEPLOYED — PENDING USER PHONE RE-REVIEW; post-fix visual behavior remains unverified.**

### UX2 §10.9 W5 — Serpent Spear AS ATTACK conversion Frame — 2026-10-25

- Feature source `1be2e8c79fed2658797a66c97f7c1c5e1afababd` presents the two genuine Hand materials as one Serpent Spear `AS ATTACK` Frame, without an invented physical Attack CardFace. Proof gates preserve the actual root source/target, normal Dodge continuation, real card identities/owners and private remaining Hands; no server rules or legal actions changed.
- Focused authenticated Worker/D1 phone-viewport browser regression passed 1/1 at 390×844 across actor, target and observer, including the target's real Dodge and public/private identity checks. Build and focused API equipment tests passed; the mobile browser run stayed within the five-minute UI-test cap.
- The feature commit's initial Actions run `40170719201` failed lint and API tests. Two lint errors were corrected in `a742f0aba4137c42e91fdea35c35fbe55611b48b`; exact-SHA [Actions `40170972100`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/40170972100) then passed lint/fast, API, browser startup/room smoke, Worker deployment and production smoke. Deployed Worker `fb48eb68-1fb8-481e-8227-612396af93cf`; direct production `/` returned HTTP 200 and `/api/health` returned `{"ok":true,"worker":"available"}`. **IMPLEMENTED / DEPLOYED — PENDING USER PHONE REVIEW**; no acceptance inferred.

### UX2 §10.9 W5 — Frost Sword target-forced DISCARD EFFECT Frame — 2026-10-25

- Source `cc77190b41fef0199d7092349d48b239917ef3ed` admits only the matching committed raw-event and projected `PROVEN` effects for the unique two-card target-owned Hand/Equipment→Discard event, linked to the exact real Attack root/resolution and `DAMAGE_PREVENTED` outcome. The Frame uses those two physical CardFaces, attributes activation to the Frost Sword owner, parks the cards with their target-owner journey, and keeps both players' unspent Hand identities private; no gameplay/rules/legality changed.
- Focused authenticated Worker/D1 mobile browser regression passed 1/1 at 390×844 for attacker, target and observer, checking exact card IDs, shared narration, damage prevention and private Hands. Local build, `node --check`, targeted ESLint (0 errors; 3 existing Hook warnings) and `git diff --check` passed.
- Exact-SHA [Actions `40172211440`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/40172211440) passed browser startup/room smoke, API, lint/fast, Worker deployment and production smoke. Worker version `8877dc17-a9b6-4279-ac00-5132d1688eee`; direct production `/` and `/api/health` returned HTTP 200 with `{"ok":true,"worker":"available"}`. **IMPLEMENTED / DEPLOYED — PENDING USER PHONE REVIEW**; no owner acceptance inferred.

### UX2 §10.8.2.2 H2-G3 F2-R2 — fixed-size mobile Inspector (technical delivery; owner review pending) — 2026-10-28

- Source `35a785364cd893049b4bff186f72b7ee324fb40c` moves the 6/8-seat phone Inspector identity and skills beside a taller genuine portrait and aligns the two Judgement plus four Equipment slots in a shared lower strip, preserving the original outer frame. It changes no seat direction, game rules, server authority or privacy projection.
- Focused phone-sized checks passed at 390×700 (six-seat long names/skills and Inspector geometry) and 390×844 (eight-seat Inspector geometry); both frames stayed within 0.15 CSS px of their baseline and six slot sizes matched within 1 px. Build and diff check passed; targeted ESLint had zero errors and two existing Hook warnings.
- Exact-SHA [Actions `40606189056`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/40606189056) passed browser startup/room smoke, lint/fast, API, D1 migration, Worker deploy and production smoke. Worker `344ea0ab-8dfb-429c-8ed8-b89d3a3991bf`; production `/` and `/api/health` returned HTTP 200. Status: **IMPLEMENTED / DEPLOYED — PENDING OWNER iPHONE REVIEW**; no owner acceptance inferred.
