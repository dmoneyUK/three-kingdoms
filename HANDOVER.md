# WTK UX V2 — Current Task Handoff

## REMOTE HANDOVER RULE
HANDOVER.md is tracked remote coordination state. Commit and push it to origin/ux-v2. After implementation append the result, push implementation and HANDOVER, fetch origin, verify origin/ux-v2:HANDOVER.md contains the result, then STOP.

**CLEANLINESS:** keep only this current task. Read docs/PLANNER_DEVELOPMENT_WORKFLOW.md.

# NEXT TASK — UX2.0UI-08: Borrowed Sword Forced-Attack Target Selection UX

## Objective
UI-07 is accepted and closed. Address the explicit remaining player-target GAP: Borrowed Sword forced-Attack target picker currently submits choose_borrowed_sword_target immediately from target click.

Migrate only this flow to the UX V2 local selection boundary if the existing server action contract permits deferred client selection without changing gameplay semantics. Do not touch opaque private target-card pickers.

## Authority rules
1. Server CurrentAction/legal IDs remain the only legality authority.
2. Public PresentationSnapshot/Interaction Stage/Hero Focus never determines selectable targets.
3. Local Borrowed Sword selection is private/unsubmitted amber state.
4. Confirm is the only submission boundary if migration is proven safe.
5. Cancel clears only the unsubmitted local Borrowed Sword choice and sends zero gameplay/decline actions.
6. Do not change choose_borrowed_sword_target payload or server resolution semantics.
7. If immediate submission is semantically required, do not force migration: document the exact blocker and leave behavior unchanged.

## Step 1 — trace the complete production flow
Inventory the CurrentAction/legal action, eligible target IDs, current client click handler, payload, server handler/validation, Pending/continuation before and after, and any other side effect of target click. Name exact files/functions.

## Step 2 — decide migration safety
Prove whether delaying the existing action until Confirm changes server-visible state, timeout behavior, or legal revision assumptions.

If safe: introduce local selected Borrowed Sword target ID; seat click updates amber only; Confirm sends the existing action exactly once with unchanged payload; Cancel sends nothing; stale action revision/state change clears or invalidates local choice.

If unsafe: leave behavior unchanged, add tests/docs proving the blocker, and report a truthful GAP.

## Step 3 — visual/semantic separation
If migrated, reuse local amber selection language. Public red active/current target remains independent. Local selection must not alter InteractionStageView, HeroFocusView, or public semantic roles. Use existing local guidance/action area; no modal or duplicate seat.

## Step 4 — tests
If safe, prove: target click sends zero actions; amber local state; Confirm one unchanged payload; Cancel zero actions and clear; restart after Cancel; ineligible/defeated remain unselectable; stale revision/action clears choice; public semantics unchanged; red+amber overlap distinguishable; one Confirm/Cancel surface; other UI-07 flows unchanged; authoritative timeout/decline controls separate.

If unsafe, replace migration assertions with exact contract/blocker assertions.

## Step 5 — docs
Update README, ROADMAP, and UX design doc. Close the Borrowed Sword GAP only if safely migrated; otherwise state exact blocker. Opaque private target-card picker remains separate GAP.

## Validation
Run focused Borrowed Sword tests plus retained UI-01..07 tests, npm run test:fast, npm run test:api, npm run build, npm run lint, git diff --check. Report exact counts.

## Scope exclusions
No game-rule changes; no new server action/payload; no projector/snapshot authority changes; no opaque target-card picker migration; no Hero Focus controls; no topology/dock redesign; no animation/settlement work; no unrelated refactor.

## Execution result
Append only UI-08 result: SHA, files, full flow trace, safety decision/proof, implementation or blocker, stale-state handling, semantic separation, tests/validation counts, remaining GAPs, next bounded recommendation. Push and verify remote HANDOVER, then STOP.

## Acceptance
Pass if either the existing contract safely supports deferred selection and target click becomes local until Confirm with zero-action Cancel and unchanged server semantics, or the agent proves migration unsafe and leaves gameplay unchanged with precise evidence. Never change authoritative gameplay semantics just to obtain the UX.

## EXECUTION RESULT — UX2.0UI-08

- Implementation SHA: `b823748` (`feat: defer borrowed sword target confirmation`).
- Files changed: `app/page.tsx`, `tests/active-skill-interactions.test.mjs`, `README.md`, `ROADMAP.md`, and `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`. No server, pending, projector, snapshot, or gameplay files changed.
- Full flow trace: `app/page.tsx` reads `room.pendingBorrowedSword` and `currentAction` in `canChooseBorrowedSword`, receives server-projected `eligibleTargetIds`, routes eligible opponent-seat clicks through `chooseBorrowedSwordTarget`, stores only `borrowedSwordTargetId`, and submits through `confirmBorrowedSwordTarget`. The existing server path remains `app/api/rooms/route.ts` action options for `borrowed_sword/choose_target` (around line 3381), the `pendingBorrowedSword` compatibility projection (around line 3515), and the unchanged `choose_borrowed_sword_target` handler (around lines 5167–5206). `game/pending.ts` still defines the same `BorrowedSwordPending` stage and continuation contract.
- Safety decision: migration is safe. During `stage='choose_target'`, the room remains in `response`, the source actor remains the only action owner, no server deadline is armed for this selection, and the existing handler performs all live holder/weapon/target legality checks plus the CAS claim only after the action arrives. Delaying the same action until Confirm therefore creates no server-visible reservation, timeout, or resolution change. Confirm sends exactly the unchanged `choose_borrowed_sword_target` action with `{ targetId }` once.
- Local behavior: the old duplicate target dialog was removed. Eligible board seats become local amber selection; Confirm is the only submission boundary; Cancel clears `borrowedSwordTargetId` and sends zero gameplay/decline actions. Ineligible holder/defeated seats remain disabled from the server-projected eligible set.
- Stale-state handling: the local target is cleared on `actionRevision` changes and whenever the authoritative `eligibleTargetIds` set no longer contains it. A new selection can restart without stale target state.
- Semantic separation: local Borrowed Sword selection only changes React-local target state and the existing local target-selection guidance. `PresentationSnapshot`, `InteractionStageView`, `HeroFocusView`, public seat roles, legality, action names, payloads, and server routing are unchanged.
- Regression evidence: mounted tests prove zero-action target click, amber selection, one Confirm/Cancel surface, exact existing payload, Cancel reset, restart after Cancel, defeated/ineligible rejection, public presentation attributes unchanged, and action-revision invalidation. Existing API Borrowed Sword/CAS/continuation coverage remains green.
- Retained GAP: opaque private target-card pickers remain separate card-zone flows and are not generalized into player target selection.
- Validation: focused mounted/UI tests `37/37`; `npm run test:fast` `166/166`; `npm run test:api` `239/239`; `npm run build` passed; `npm run lint` passed; `git diff --check` passed. Fast/API were rerun serially after the final build because parallel build/test execution can remove `dist` manifests during test startup.
- Closure recommendation: UI-08 is complete for reviewer closure. The Borrowed Sword player-target GAP is closed without changing authoritative gameplay semantics; proceed only with the next separately bounded UX slice after review.
