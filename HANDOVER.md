# WTK UX V2 — Current Task Handoff

## REMOTE HANDOVER RULE
HANDOVER.md is tracked remote coordination state. Commit and push it to origin/ux-v2. After implementation append the result, push implementation and HANDOVER, fetch origin, verify origin/ux-v2:HANDOVER.md contains the result, then STOP.

**CLEANLINESS:** keep only this current task. Read docs/PLANNER_DEVELOPMENT_WORKFLOW.md.

# NEXT TASK — UX2.0UI-19: Browser Responsive & Accessibility Validation Harness

## Objective
UI-18 is accepted and closed. Close the long-standing UI-11/UI-18 browser-validation GAP by adding a bounded, reproducible browser-level validation harness for the existing UX V2 layout and transition accessibility contracts.

This is validation-first. Do not redesign the UX. Fix only concrete defects exposed by the new browser checks, and keep any fixes minimal and evidence-backed.

## Required viewport matrix
Validate at minimum:
- desktop: 1440x900;
- compact/tablet: 650x900;
- mobile: 480x900.

Exercise representative 2-, 4-, 6-, and 10-player table states where fixtures support them. At 480/650 prioritize 4, 6, and 10 players.

## Required semantic states
Browser scenarios must cover representative:
- REST / normal turn;
- Interaction Stage + Hero Focus;
- multi-target/AOE preview;
- Duel responder handoff;
- Negation/Reaction Chain;
- Dying/Peach handoff;
- at least one non-NONE UI-18 transition marker;
- reduced-motion mode.

Use deterministic local fixtures/test routes or existing browser-capable test infrastructure. Do not depend on live multiplayer timing or production data.

## Visual/layout invariants
Prove with browser geometry/visibility assertions where practical:
1. all expected opponent seat anchors are visible and not replaced by Interaction Stage;
2. local hero/dock remains visible;
3. hand remains accessible and is the dominant local card area;
4. local console primary/secondary controls remain visible/usable;
5. Interaction Stage does not cover critical local controls;
6. no horizontal page overflow at required viewports;
7. no unintended seat overlap severe enough to hide identity/HP/decision state;
8. 10-player topology remains usable at desktop and bounded at mobile;
9. dialogs/pickers used by retained flows remain within viewport or scroll safely;
10. semantic seat highlights and local amber selection remain distinguishable by DOM role/class even when geometry is compact.

Do not turn subjective pixel taste into fake assertions. Record screenshots/artifacts only if the chosen test runner supports them cleanly.

## Accessibility/motion checks
At minimum:
- emulate prefers-reduced-motion: reduce and prove UI-18 keyframe motion is disabled/effectively absent;
- Interaction Stage/Hero Focus/Dying/Reaction Chain semantic labels remain present without motion;
- controls remain keyboard-focusable where they already are native controls;
- no animation introduces pointer blocking;
- public semantic meaning is not available only through color/motion.

Do not claim full WCAG certification.

## Implementation rules
1. Prefer existing test dependencies/infrastructure; inspect package.json/config before adding a new dependency.
2. If no browser runner exists, add the smallest maintainable browser-test setup compatible with the repo/CI. Document exact install/runtime requirements.
3. Browser fixtures must consume existing presentation/game UI contracts; do not add production-only backdoors that change gameplay.
4. No gameplay/API/projector/causal authority changes.
5. Any CSS/layout fix must have a failing browser assertion first and a regression assertion after.
6. Do not alter transition classification or private-control ownership.

## Validation
Run the browser suite if environment permits and report exact scenario/viewports/counts. Also run retained focused UI tests, npm run test:fast, npm run test:api, npm run build, npm run lint, git diff --check. If browser binaries or local execution are unavailable, the task is not complete merely because harness code exists: report the exact blocker and do not claim the browser GAP closed.

## Docs
Update README, ROADMAP, and docs/UX_V2_INTERACTION_STAGE_DESIGN.md with:
- browser harness command/setup;
- viewport/state matrix actually executed;
- concrete defects found/fixed;
- remaining visual/manual GAPs;
- explicit statement that this is not full WCAG or subjective art-direction approval.

## Scope exclusions
No UX redesign; no new gameplay; no server authority changes; no Reaction Chain history expansion; no settlement animation; no sound/haptics; no broad CSS cleanup unrelated to a reproduced browser defect.

## Execution result
Append only UI-19 result: SHA, files, browser tooling used, exact viewport/state matrix, executed browser counts, geometry/accessibility assertions, defects found/fixed with before/after evidence, retained validation counts, remaining GAPs/blockers, next bounded recommendation. Push and verify remote HANDOVER, then STOP.

## Acceptance
Pass only if real browser execution validates the required responsive/motion contracts across the bounded viewport/state matrix, any fixes are tied to reproduced failures, reduced-motion behavior is browser-proven, no gameplay/authority semantics change, and remaining subjective/manual gaps are reported truthfully.
