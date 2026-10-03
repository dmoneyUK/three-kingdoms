# WTK UI / Layout — Current Task Handoff

## Status
BUG-ZHANG-LIAO-ASSAULT-01 is reviewer-accepted and closed at implementation commit fe5ab574a0f896e7807c8cb221236dc3cbc12642.

Do not resume the old UI-20 release-close task yet. A real mobile screenshot exposed a material visual-architecture mismatch between the accepted UX V2 design and the rendered game.

# NEXT TASK — UX2.0VIS-01: Interaction Stage & Seat Topology Visual Architecture Audit

## Objective
Audit the original UX V2 visual-layout contract against the current rendered implementation before changing CSS. Produce an implementation-ready gap map. This task is audit/design only: do not redesign or patch production layout yet.

## Required sources
Read and cross-reference:
- docs/UX_V2_INTERACTION_STAGE_DESIGN.md
- ROADMAP.md
- app/page.tsx
- app/globals.css
- game/interaction-stage.ts / presentation client helpers as applicable
- tests/browser responsive/layout coverage

## Known user-observed mismatch
On a real iPhone during Barbarian Invasion / Group Resolution, the current Interaction Stage appears as a wide information panel across the top/centre. The original design instead requires fixed small opponent seat thumbnails around a protected central Interaction Safe Zone; active/involved public hero focus should be enlarged inside that centre stage without moving/removing the original seat anchors.

The screenshot also suggests the 4-player visual topology may still resemble the legacy horseshoe arrangement rather than the intended 2–4-player top-row mode.

## Audit questions
1. Quote the exact design requirements for:
   - 2–4 player topology;
   - 5–10 player topology;
   - protected Interaction Safe Zone;
   - fixed seat thumbnails;
   - enlarged Hero Focus/current participant;
   - local dock;
   - controls vs read-only public stage.
2. Map each requirement to the current DOM/component and CSS implementation.
3. Identify where temporary semantic consumers became treated as final visual composition. Trace relevant UI milestone wording where possible.
4. Separate:
   - semantic architecture that should be preserved;
   - layout implementation that violates design;
   - genuinely unspecified visual details.
5. Inspect current browser tests and explain exactly why they passed despite the screenshot mismatch. Distinguish DOM/geometry assertions from art-direction/composition assertions.
6. Produce a target structural layout for desktop and mobile using simple ASCII/component hierarchy, not new artwork.
7. Define concrete invariants for the future implementation:
   - opponent anchors never move/disappear;
   - central safe zone is not occupied by a top-wide dashboard;
   - active/involved hero presentation is enlarged in centre;
   - 2–4 uses intended top-row composition;
   - 5–10 uses intended side-column composition;
   - local dock remains fixed;
   - Interaction Stage remains public/read-only and local controls stay in console;
   - no gameplay/presentation authority changes.
8. Recommend the smallest implementation slices, likely VIS-02 seat topology, VIS-03 central stage/enlarged hero composition, VIS-04 responsive real-device/browser validation. Adjust names/order if audit evidence supports a better split.

## Deliverable
Create docs/UX_V2_VISUAL_ARCHITECTURE_AUDIT.md containing:
- design-vs-current matrix;
- root-cause/task-drift analysis;
- DOM/CSS evidence;
- test blind spots;
- target component/layout hierarchy;
- implementation invariants;
- proposed bounded follow-up slices.

Update ROADMAP only enough to state that UX V2 visual architecture is reopened and Feature Complete is blocked pending these slices.

## Scope
No production CSS/layout/component changes. No gameplay/API/projector/causal changes. No hero/card fixes. No speculative graphic redesign. Do not claim the screenshot issue fixed.

## Validation
Run git diff --check and any doc/link checks available. No need to rerun gameplay suites for documentation-only audit.

## Execution result
Append only VIS-01 result: SHA/files, key mismatches found, test blind spots, recommended slices, validation status. Push and verify remote HANDOVER, then STOP.

## Acceptance
Pass only if the audit demonstrates from repo evidence exactly why current rendering diverges from the original design and gives bounded implementation tasks without changing semantic/gameplay authority.
