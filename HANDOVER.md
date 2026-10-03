# WTK UX V2 — Current Task Handoff

## REMOTE HANDOVER RULE
HANDOVER.md is tracked remote coordination state. Commit and push it to origin/ux-v2. After implementation append the result, push implementation and HANDOVER, fetch origin, verify origin/ux-v2:HANDOVER.md contains the result, then STOP.

**CLEANLINESS:** keep only this current task. Read docs/PLANNER_DEVELOPMENT_WORKFLOW.md.

# NEXT TASK — UX2.0UI-11: Responsive Table Topology & Local Console Regression Hardening

## Objective
UI-10-FIX1 is accepted and UI-10 is closed. The next bounded slice is a responsive/topology hardening pass for the existing UX V2 surfaces at desktop, <=650px, and <=480px.

Do not redesign the board. Prove and minimally fix containment/readability so seat topology, Interaction Stage/Hero Focus, and the persistent local dock/console remain usable together without hiding, duplicating, or moving authoritative controls.

## Locked UX invariants
1. Local dock remains persistent and is never replaced by Interaction Stage/Hero Focus.
2. Opponent seat anchors remain stable; semantic focus/highlights must not move seats.
3. 2–4 total players use the established top-row topology; 5–10 use established side-column topology. Do not invent a new layout.
4. Hand remains the largest local working area, hero second, controls third as size priority; do not reinterpret this as vertical ordering.
5. Interaction Stage/Hero Focus are public semantic consumers only and never gain gameplay controls.
6. Local operation console remains the only footer control surface; dialog-owned submissions remain singular.
7. No gameplay, legality, payload, projector, snapshot, or visibility changes.

## Step 1 — inventory real responsive geometry
Inspect current JSX/CSS for:
- play-table;
- player-board and all seat-position classes for 2–10 players;
- Interaction Stage and Hero Focus;
- game messages / notices / resolution overlays;
- LocalPlayerDock;
- hero/skills/equipment/hand rail;
- turn-controls local operation console;
- target-card and mandatory/private dialogs.

Document exact existing breakpoints and identify concrete overflow/overlap risks. Do not claim visual correctness from source inspection alone.

## Step 2 — add deterministic topology/layout contracts
Add testable DOM/CSS invariants for player counts 2, 3, 4, 5, 6, 8, and 10:
- exactly N-1 opponent seat anchors plus one local dock anchor;
- no duplicate local player in player-board;
- seat semantic classes do not change anchor count/order;
- Interaction Stage/Hero Focus insertion does not replace/remove seat anchors;
- local dock and console exist exactly once;
- dialog ownership does not duplicate footer submit surfaces.

Use existing production components/fixtures.

## Step 3 — harden <=650px and <=480px containment
Make only minimal scoped CSS changes required by evidence:
- prevent Interaction Stage/Hero Focus text from overflowing its bounded stage;
- keep local hero/skills/equipment/hand/console within viewport width;
- allow console controls and guidance to wrap without covering hand cards;
- keep touch controls readable/tappable without creating duplicate mobile-only controls;
- ensure long player/hero/action labels wrap or truncate safely;
- keep target-card/private dialogs within viewport with scroll where needed.

Do not hide gameplay information merely to make tests pass.

## Step 4 — hand and console coexistence
Prove the hand rail remains usable with representative hand sizes (1, 5, 10+ cards) while the console wraps. Preserve existing overlap/fan behavior and selection states.

The console must not consume the hand's interaction area or become an overlay over cards at <=650/<=480.

## Step 5 — semantic overlap regression
For at least ordinary target, source-owned trigger, Group/AOE current participant, child Damage, Dying, and local amber selection:
- public red/cyan/gold/gray semantic classes remain on stable seat anchors;
- amber local selection remains distinguishable and does not change topology;
- Hero Focus remains derived from semantic IDs and does not enlarge/replace the opponent seat;
- REST hides semantic focus without collapsing seat topology.

Do not alter semantic authority to solve CSS issues.

## Step 6 — responsive evidence
Prefer deterministic rendered-DOM/style contract tests available in the repo. If an existing browser/screenshot harness exists, use it for desktop, 650px, and 480px evidence. Do not introduce a large new browser framework solely for this task.

Be truthful: source/CSS assertions prove declared layout contracts, not pixel-perfect visual appearance. Record any remaining visual-only GAP.

## Step 7 — docs
Update README, ROADMAP, and docs/UX_V2_INTERACTION_STAGE_DESIGN.md with:
- responsive topology contract;
- exact breakpoints;
- what was actually proven;
- any visual-only GAP requiring later browser/manual validation.

## Validation
Run focused topology/responsive/UI-01..10 regressions, then npm run test:fast, npm run test:api, npm run build, npm run lint, git diff --check. Report exact counts.

## Scope exclusions
No server/game rules; no action/payload changes; no projector/snapshot changes; no seat topology redesign; no new mobile-only gameplay controls; no animation/settlement work; no broad CSS rewrite; no unrelated refactor.

## Execution result
Append only UI-11 result: SHA, files, breakpoint/topology inventory, concrete defects found, minimal fixes, player-count evidence, hand/console coexistence evidence, semantic overlap evidence, browser/screenshot evidence if available, truthful visual-only GAPs, exact validation counts, next bounded recommendation. Push and verify remote HANDOVER, then STOP.

## Acceptance
Pass only if existing topology and control ownership are preserved across representative 2–10-player renders, responsive containment is improved only where evidence requires it, hand/console remain usable together, semantic/local highlights do not move seats, and claims clearly distinguish deterministic contract proof from pixel-perfect visual proof.

## Execution result — UX2.0UI-11 — 2026-10-03

- Implementation SHA: `23698fb` (`feat(ux): harden responsive table topology`).
- Files changed: `app/page.tsx`, `app/sequence-overrides.css`,
  `tests/room-safety-render.test.mjs`, `README.md`, `ROADMAP.md`, and
  `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`.
- Responsive inventory recorded: existing desktop/global table and seat rules;
  existing compact table/dock rules at <=700px, compact board variables at
  <=520px, Interaction Stage/Hero Focus rules at <=650px and <=480px, and
  local dock rules at <=700px, <=480px, and <=360px. UI-11 adds only the
  requested side-column and containment rules at <=650px and <=480px.
- Concrete defect found: the mobile absolute-position rules only declared
  relative opponent seats `player-square-1`, `-2`, and `-3`; 5–10-player
  renders had no declared placement for relative seats 4–9. The minimal fix
  adds `data-player-count`/`data-seat-topology` and a two-column side-column
  grid in stable DOM order with row budgets 2/3/4/5 for 5/6–7/8–9/10.
- Topology evidence: real `GameRoom` SSR fixtures cover 2, 3, 4, 5, 6, 8,
  and 10 players. Each renders exactly N−1 opponent anchors plus one local
  dock anchor, has no local anchor inside `player-board`, keeps one local dock,
  one `data-console-surface="local-operation"`, and never renders
  `player-square-0`.
- Hand/console evidence: real SSR fixtures for 1, 5, and 10 physical hand
  cards retain one `local-hand-rail` with one `data-hand-card-id` per card and
  one footer console. Existing fan/selection markup and ordering remain
  unchanged; the console wraps in place.
- Semantic evidence: existing rendered Interaction Stage, Hero Focus,
  ordinary target, source-owned trigger, Group/AOE, child Damage, Dying,
  overlapping local amber-selection, and REST regressions remain green. Stage
  insertion and REST hiding were additionally checked for unchanged anchor
  counts and one dock/console.
- Dialog/containment fix: stage/focus copy wraps at arbitrary long tokens;
  target-card, hidden-card, and deck-reorder surfaces receive <=650px bounded
  viewport scroll; no information or gameplay control was hidden or moved.
- Browser/screenshot evidence: unavailable; this checkout has no browser or
  screenshot harness. Remaining desktop/650px/480px pixel appearance, touch
  ergonomics, and device-specific wrapping are recorded as visual-only GAPs,
  not claimed as pixel-proven.
- Validation: focused rendered UI `18/18`; `npm run build` passed; fast suite
  `172/172`; API suite `239/239`; `npm run lint` passed; `git diff --check`
  passed.
- Boundaries preserved: no gameplay, legality, payload, projector, snapshot,
  visibility, animation, or provider-specific control changes; CurrentAction
  remains authoritative and the local console/dialog ownership is unchanged.
- Next recommendation: reviewer closure of UI-11, followed by manual/browser
  checks at desktop, 650px, and 480px before authorizing the next UX slice.
