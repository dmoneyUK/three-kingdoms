# WTK UX V2 — Current Task Handoff

## REMOTE HANDOVER RULE
HANDOVER.md is tracked remote coordination state. Commit and push it to origin/ux-v2. After implementation append the result, push implementation and HANDOVER, fetch origin, verify remote HANDOVER contains the result, then STOP.

**CLEANLINESS:** keep only this current task. Read docs/PLANNER_DEVELOPMENT_WORKFLOW.md.

# NEXT TASK — UX2.0UI-04-FIX1: Remove Unproven Target Progress Semantics

## Objective
UI-04 direction is accepted, but one display claim is stronger than the accepted semantics prove. Fix only that authority issue and preserve the focus-summary hierarchy.

Use implementation commit 08ae73b71703768ab6e8c321c13d435a49877e40.

## Reviewer finding
buildInteractionStageDisplayModel currently derives an ordinal "Target N of M" from currentParticipant position inside activeTargets.

The accepted contract proves original target IDs, active target IDs, and current participant ID. It does NOT prove that array position is an ordinal progress counter or that activeTargets length is the total number of resolution steps. A filtered/resumed Group state can therefore display misleading progress.

## Required fix
1. Remove targetProgress as an ordinal/progress claim unless an already accepted authoritative field explicitly proves it. Do not add server authority here.
2. Do not derive N-of-M, completed count, remaining count, or sequence position from array index/length.
3. Keep directly proven current participant, active target scope, original target scope when different, source, decision owner, distinct resolver when useful, and child-frame context.
4. Group/AOE may show compact active/original scope using the accepted arrays, but do not label it progress.
5. Preserve the full underlying InteractionStageView.

## Tests
Replace the test expecting "Target 2 of 2" with authority-safe assertions.

Add negative evidence:
- original [B,C,A], active [B,C], current C must not produce "2 of 2", "2 of 3", or another ordinal progress claim;
- reordering activeTargets while keeping currentParticipant must not create a different progress position;
- one active target from a larger original scope must not imply a completion count.

Retain ordinary target-owned, Ma Chao decision-vs-resolver, changed scope, CHILD_FRAME, viewer equality, REST, missing names, and legacy-independence tests.

## Render regression
Assert InteractionStage contains no PROGRESS label or Target N of M text derived from target arrays. Scope context may remain.

## Documentation
Correct README and docs/UX_V2_INTERACTION_STAGE_DESIGN.md if they describe target progress. State that current participant and target scopes are facts; ordinal progress is intentionally not inferred because no accepted authoritative progress field exists.

## Validation
Run focused display/render tests and retained UI-01..04 tests, then npm run test:fast, npm run test:api, npm run build, npm run lint, and git diff --check. Report exact counts.

## Scope exclusions
No gameplay/server/projector/snapshot changes; no new progress field; no causal redesign; no hero/card assets; no seat/dock/control/target-selection changes; no animation/settlement/transition changes; no unrelated visual redesign.

## Execution result
Append only FIX1 result: SHA, files, removed inference, replacement Group/AOE context, negative tests, retained hierarchy evidence, scope confirmation, validation counts, and closure recommendation. Push and verify remote HANDOVER, then STOP.

## Acceptance
Pass only if no player-facing ordinal target progress is inferred from activeTargets/currentParticipant array position or length; Group/AOE shows only directly proven participant/scope facts; UI-04 hierarchy otherwise remains intact; and validations pass.

## Execution result — UX2.0UI-04-FIX1

- Implementation SHA: `a7991aa88b4344cbb651aa10f8b2e6133e587b97` (`fix(ux-v2): remove inferred target progress`)
- Files: `game/presentation-client.ts`, `app/page.tsx`, `tests/presentation-client.test.mjs`, `tests/room-safety-render.test.mjs`, `README.md`, `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`.
- Removed inference: deleted `targetProgress` and the `Target N of M` calculation from the display model; React no longer renders a `PROGRESS` row. No server, projector, snapshot, or new progress field was added.
- Group/AOE replacement: the display keeps the proven current participant and, when materially useful, renders the ordered active target scope as `Active scope`; changed original scope remains the existing `ORIGINAL SCOPE` context. Array order is presented only as scope data, never as ordinal position, completion, remaining, or sequence progress.
- Negative evidence: focused tests cover original `[B,C,A]`, active `[B,C]`, current `C` without `2 of 2`/`2 of 3` or other progress wording; active-target reordering preserves only scope facts; narrowing to one active target does not imply a completion count. Render regression asserts no `PROGRESS` or `Target N of M` output.
- Retained hierarchy: ordinary target-owned CHOICE, source-owned Ma Chao decision/resolver distinction, Group/AOE current and scope facts, CHILD_FRAME context, changed/equal targets, viewer equality, missing names, REST, and legacy independence remain covered.
- Scope confirmation: no gameplay/server/projector/authority redesign, causal changes, hero/card assets, seat/dock/control/target-selection changes, animation, settlement, transition, or unrelated visual redesign.
- Validation: focused display/render tests `38/38`; `npm run build` passed; `npm run test:fast` `155/155`; `npm run test:api` `239/239`; full `npm test` passed with the same build/fast/API counts; `npm run lint` passed; `git diff --check` passed.
- Closure recommendation: this FIX1 is ready for reviewer verification and closure. Keep any next Hero Focus or target-highlighting work as a separately authorized slice.
