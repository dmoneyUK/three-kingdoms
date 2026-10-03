# WTK UI / Layout — Current Task Handoff

## REMOTE HANDOVER RULE
HANDOVER.md is tracked remote coordination state. Commit and push the task result to origin/ux-v2. After execution append only the current execution result, push, fetch origin, verify the remote HANDOVER contains it, then STOP.

**CLEANLINESS:** this file contains only the current UI/Layout task. Read docs/PLANNER_DEVELOPMENT_WORKFLOW.md.

# NEXT TASK — UX2.0VIS-01: Interaction Stage & Seat Topology Visual Architecture Audit

## Why this task exists
A real iPhone game screenshot exposed a material mismatch between the original UX V2 layout contract and the rendered game.

Observed during Barbarian Invasion / Group Resolution:
- the current Interaction Stage renders as a wide information/dashboard panel across the upper/central play area;
- its compact Hero Focus is only a small portrait inside that dashboard;
- the actual central battlefield remains largely unused;
- opponent hero cards remain large around the board rather than acting as small fixed seat thumbnails around a protected central stage;
- the 4-player composition visually resembles the legacy horseshoe/physical-table layout rather than the intended 2–4-player top-row mode.

The original UX V2 intent was different:
- opponent seats remain small, fixed relative-position thumbnails;
- the centre is a protected Interaction Safe Zone;
- the active/involved public hero presentation is enlarged in that centre without moving/removing the original seat anchors;
- current effect / Duel / Judgement / Dying / Reaction / AOE context belongs in that centre;
- the local player dock remains persistent at the bottom;
- public Interaction Stage remains read-only; gameplay controls remain in the local console.

## Objective
Audit the original UX V2 visual-layout contract against the current DOM/CSS/rendered architecture and produce an implementation-ready gap map.

**This task is intentionally audit-only. Do not patch production layout yet.** The purpose is to prevent another sequence of locally-green CSS/DOM changes that preserve the wrong overall composition.

## Required sources
Cross-reference:
- docs/UX_V2_INTERACTION_STAGE_DESIGN.md
- ROADMAP.md
- app/page.tsx
- app/globals.css
- game/interaction-stage.ts
- game/hero-focus.ts
- game/presentation-client.ts and seat-role helpers as needed
- tests/browser responsive/layout coverage
- any retained UI-03/UI-06/UI-11/UI-19 tests that froze the temporary composition

## Step 1 — extract the authoritative visual-layout contract
Quote/identify the exact design requirements for:
1. 2–4 total players;
2. 5–10 total players;
3. fixed seat thumbnails / distance context;
4. protected central Interaction Safe Zone;
5. enlarged active/involved hero presentation;
6. source vs current participant/target vs decision actor;
7. local player dock;
8. public/read-only Interaction Stage vs private local controls.

Be explicit about whether the design requires one enlarged focus hero or can show multiple involved heroes for an interaction. Do not assume; derive from the design text.

## Step 2 — map design to current production DOM/CSS
For each requirement, identify the exact current component/element/CSS rule that implements, partially implements, or contradicts it.

At minimum inspect:
- player-board and player-square-* positioning;
- data-seat-topology / player-count hooks;
- InteractionStage placement and sizing;
- HeroFocus placement and portrait/card sizing;
- z-index / absolute positioning / reserved centre geometry;
- LocalPlayerDock placement;
- responsive <=650px and <=480px overrides.

Call out exact rules responsible for the top-wide dashboard and any legacy horseshoe positioning.

## Step 3 — identify task drift/root cause
Trace where the implementation intentionally created temporary semantic consumers and where later milestones accidentally treated those temporary consumers as the final layout.

At minimum review the design notes for:
- UI-03 small read-only Interaction Stage;
- UI-04 focus summary;
- UI-06 compact Hero Focus and its explicit future larger redesign;
- UI-11 topology/containment contract;
- UI-18 no-layout-movement transition visuals;
- UI-19 browser geometry tests.

Explain which milestones should be preserved semantically and which visual assumptions must now be reopened.

## Step 4 — explain why tests passed
Inspect the browser/SSR/layout tests and classify what they actually prove:
- anchor count/order;
- no horizontal overflow;
- visibility/containment;
- stable DOM;
- reduced motion;
versus what they do NOT prove:
- intended top-row vs horseshoe visual composition;
- protected central empty/safe zone;
- enlarged central hero composition;
- correct hierarchy between seats and stage;
- art-direction/player-facing readability.

Name the specific blind spots that allowed the real screenshot mismatch to pass.

## Step 5 — define the target structural composition
Produce component/ASCII layouts for:
- 2-player;
- 3–4-player top-row mode;
- 5–10-player side-column mode;
- mobile narrow mode for 4 players;
- mobile narrow mode for 6–10 players.

The target must preserve:
- N-1 fixed opponent seat anchors;
- one persistent local dock;
- a reserved central Interaction Safe Zone;
- enlarged presentation of the currently involved semantic hero(s) in the centre;
- source/current target/current participant/decision information as secondary context rather than a full-width dashboard;
- no controls inside the public centre stage.

Do not design new art assets in this task.

## Step 6 — define implementation invariants
At minimum:
- opponent anchor identity/order never changes because an interaction starts;
- no opponent seat is moved into the centre; centre uses a presentation copy/projection;
- Interaction Stage cannot cover the seat row/columns or local dock;
- central stage is geometrically reserved, not merely created by z-index overlay;
- 2–4 total players use the intended top-row composition;
- 5–10 use the intended side-column composition;
- active/involved hero presentation is materially larger than seat thumbnails;
- Hero Focus identity still comes only from accepted semantic authority;
- source/decision/resolver distinctions remain truthful;
- local console remains the only gameplay-control surface;
- gameplay, target legality, causal/projector semantics and payloads remain unchanged.

## Step 7 — propose bounded implementation slices
Recommend the smallest safe implementation sequence. Expected shape unless evidence says otherwise:
- VIS-02: real seat topology + reserved central safe-zone geometry;
- VIS-03: central enlarged Hero Focus / involved-hero composition, remove top-wide dashboard hierarchy;
- VIS-04: responsive/mobile composition and real-browser visual contract;
- VIS-05 only if needed: final layout regression/polish.

For each slice state exact files/components, invariants, and browser evidence required.

## Deliverable
Create docs/UX_V2_VISUAL_ARCHITECTURE_AUDIT.md containing:
- design-vs-current matrix;
- exact DOM/CSS evidence;
- root-cause/task-drift analysis;
- test blind spots;
- target structural layouts;
- implementation invariants;
- proposed slices.

Update ROADMAP only enough to state that UX V2 visual architecture is reopened and Feature Complete is blocked pending the visual-layout slices.

## Scope exclusions
No production CSS/component/layout changes.
No gameplay/API/projector/causal changes.
No card/hero skill fixes.
No new artwork.
No speculative redesign beyond the existing UX V2 layout contract.
Do not claim the screenshot problem fixed.

## Validation
Run git diff --check and any documentation/link validation available. No gameplay suite is required for this documentation-only audit.

## Execution result
Append only VIS-01 result:
- full SHA;
- files changed;
- key mismatches;
- exact root cause/task drift;
- browser-test blind spots;
- target layout summary;
- recommended VIS-02+ slices;
- validation status.

Push and verify remote HANDOVER, then STOP.

## Acceptance
Pass only if the audit proves from repository evidence why the current visual composition diverges from the original UX V2 design, preserves the already-accepted semantic architecture, and gives implementation-ready bounded layout tasks without changing gameplay authority.
