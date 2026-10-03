# WTK UX V2 — Current Task Handoff

## REMOTE HANDOVER RULE
HANDOVER.md is tracked remote coordination state. Commit and push it to origin/ux-v2. After implementation append the result, push implementation and HANDOVER, fetch origin, verify origin/ux-v2:HANDOVER.md contains the result, then STOP.

**CLEANLINESS:** keep only this current task. Read docs/PLANNER_DEVELOPMENT_WORKFLOW.md.

# NEXT TASK — UX2.0UI-18: Semantic Transition Visual Consumer & Motion Safety

## Objective
UI-17 is accepted and closed. Add a restrained visual consumer for the accepted semantic transition classes so players can perceive focus/frame/interaction changes without layout movement, gameplay delay, or animation-driven authority.

Use the existing data-presentation-transition / buildPresentationTransition contract. Do not reclassify transitions in CSS/components and do not add a second history model.

## Visual intent
- CONTENT_UPDATE: subtle content refresh only; no whole-stage movement.
- FOCUS_UPDATE: emphasize the newly focused semantic subject/decision context.
- FRAME_TRANSITION: clearly signal nested frame enter/return without replacing the table.
- INTERACTION_TRANSITION: strongest but still short transition for interaction enter/exit/change.
- NONE: no transition effect.

Motion must be restrained and functional, not decorative.

## Authority rules
1. UI-17 transition kind is the sole transition-class authority.
2. CSS/React visual code must not inspect timeline, CurrentAction, turn, HP, Pending, card identity, or actionPlayerId to decide transition strength.
3. Animation never delays or blocks controls, network actions, snapshot application, or server handoff.
4. Seat topology/local dock remain fixed.
5. Public transition visuals are viewer-equal; local amber selection remains separate.
6. prefers-reduced-motion must suppress nonessential motion while preserving semantic state.
7. Repeated NONE/reconnect must not replay animation.
8. No animation-completion callback may mutate gameplay/presentation authority.

## Step 1 — inventory existing visual surfaces
Identify the smallest existing elements suitable for each class: Interaction Stage shell, Hero Focus/current participant, frame/context region, and/or public semantic seat highlights. Do not animate the entire table if a smaller semantic surface is sufficient.

## Step 2 — implement scoped visual states
Consume only the existing transition hook. Add scoped classes/data selectors and short CSS effects appropriate to each class.

Requirements:
- no seat/local-dock positional animation;
- no hand-card layout animation caused by public transitions;
- no modal;
- no permanent opacity reduction;
- no pointer-events/control blocking;
- effects must settle to the exact existing static UI.

If React needs a bounded replay key/token, derive it only from accepted public semantic identities/checkpoint/revision; do not use timers as authority.

## Step 3 — reduced motion and accessibility
Add @media (prefers-reduced-motion: reduce) coverage that removes/reduces transforms/keyframes/transitions. The semantic focus, labels, roles, and controls must remain fully understandable without motion.

Do not rely on animation alone to communicate decision ownership.

## Step 4 — regression tests
At minimum prove:
1. NONE has no animation class/state;
2. CONTENT_UPDATE maps only to subtle content visual state;
3. FOCUS_UPDATE maps to focus emphasis;
4. FRAME_TRANSITION maps to frame emphasis;
5. INTERACTION_TRANSITION maps to interaction emphasis;
6. stronger class is not re-derived/overridden by legacy/private fields;
7. same public transition hook yields same public visual marker for different viewers;
8. no transition visual adds/removes/reorders seat anchors;
9. local dock/console and hand remain present and usable;
10. transition visuals add no buttons/actions;
11. repeated identical/reconnect NONE does not replay;
12. reduced-motion CSS explicitly suppresses nonessential motion;
13. UI-07..17 regressions remain green.

Tests may assert deterministic DOM classes/data markers and CSS contracts; do not claim pixel quality from SSR/unit tests.

## Step 5 — docs
Update README, ROADMAP, and docs/UX_V2_INTERACTION_STAGE_DESIGN.md with the visual mapping, reduced-motion contract, and truthful browser/manual GAP.

## Validation
Run focused mounted/presentation/style tests plus retained UI-01..17 tests, then npm run test:fast, npm run test:api, npm run build, npm run lint, git diff --check. If execution is unavailable, report it as unrun; do not claim pass.

## Scope exclusions
No gameplay/API changes; no transition classifier changes unless a reviewer-proven bug is found; no server history; no settlement/event-card animation; no sound/haptics; no topology redesign; no full visual redesign; no browser pixel-quality claim.

## Execution result
Append only UI-18 result: SHA, files, surface inventory, exact class-to-visual mapping, motion durations/effects, reduced-motion behavior, DOM/CSS regression evidence, exact validation status/counts, remaining manual/browser GAPs, next bounded recommendation. Push and verify remote HANDOVER, then STOP.

## Acceptance
Pass only if the existing semantic transition contract drives restrained non-blocking visual feedback, NONE is stable, private/legacy state cannot promote effects, seat/dock/control topology stays fixed, reduced-motion is respected, no gameplay authority changes, and browser pixel quality is not overclaimed.

## UI-18 execution result — 2026-10-03

- Implementation SHA: `ad2b39a` (`feat: add semantic transition visual feedback`).
- Changed files: `app/globals.css`, `tests/room-safety-render.test.mjs`,
  `README.md`, `ROADMAP.md`, `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`.
- Surface inventory: the existing Interaction Stage shell is the visual
  consumer for content, frame, and interaction transitions; the existing Hero
  Focus panel receives the additional focus emphasis. Seats, local dock,
  hand, console, table, and event/settlement surfaces are unchanged.
- Exact mapping: `NONE` has no selector/effect; `CONTENT_UPDATE` uses
  `presentationContentRefresh` on the stage for 180ms; `FOCUS_UPDATE` uses
  `presentationFocusEmphasis` on the stage and
  `presentationFocusPanelEmphasis` on Hero Focus for 240ms;
  `FRAME_TRANSITION` uses `presentationFrameEmphasis` on the stage for 280ms;
  `INTERACTION_TRANSITION` uses `presentationInteractionEmphasis` on the
  stage for 320ms. All effects are border/shadow-only and settle to the
  existing static stage/panel styles.
- Reduced motion: `@media(prefers-reduced-motion:reduce)` sets every UI-18
  animation to `none !important`; semantic markup, labels, roles, controls,
  and decision ownership remain present without motion.
- DOM/CSS evidence: added deterministic coverage for all five markers, no
  transition controls, repeated `NONE` stability, viewer-equal public
  markers, explicit reduced-motion suppression, data-selector-only authority,
  and absence of seat/dock/hand layout or pointer/opacity/transform changes.
  Existing mounted UI-17 coverage continues to prove private/legacy changes
  remain `NONE` and public semantic changes retain their accepted marker;
  existing topology assertions retain both anchors, one dock, console, and
  hand.
- Validation: no local focused tests, retained UI tests, `npm run test:fast`,
  `npm run test:api`, build, lint, or diff check were run, per the project
  remote-validation workflow. GitHub Actions owns validation after push; CI
  status was not inspected and no CI success is claimed.
- Remaining GAPs: browser pixel quality and assistive-technology smoke testing
  remain manual/browser validation items; no pixel claim is made.
- Next bounded recommendation: wait for the reviewer/GitHub Actions result;
  begin another task only after a new remote reviewer handover authorizes it.
