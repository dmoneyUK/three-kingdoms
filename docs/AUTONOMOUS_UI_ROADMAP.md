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
