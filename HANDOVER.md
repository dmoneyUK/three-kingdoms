# WTK UX V2 — Current Task Handoff

## REMOTE HANDOVER RULE
HANDOVER.md is tracked remote coordination state. Commit and push it to origin/ux-v2. After implementation append the result, push implementation and HANDOVER, fetch origin, verify origin/ux-v2:HANDOVER.md contains the result, then STOP.

**CLEANLINESS:** keep only this current task. Read docs/PLANNER_DEVELOPMENT_WORKFLOW.md.

# NEXT TASK — UX2.0UI-12: AOE / Group Automatic Scope Preview

## Objective
UI-11 is accepted for deterministic topology/containment contracts; pixel-level desktop/650/480 appearance remains a truthful manual/browser GAP.

Implement the locked UX V2 rule for Group/AOE cards: when the local viewer selects an AOE/group card whose affected scope is already determined by authoritative play legality, show a read-only automatic target-scope preview. The player must not click individual seats and must not Confirm a fabricated target list.

This is preview only. Preserve the existing play action/payload and server-owned participant progression.

## Authority rules
1. CurrentAction play-phase capability/card legality is the only authority that the card may be played.
2. AOE/group affected scope must come from an existing authoritative/public rule source already used by gameplay. Do not infer scope from PresentationSnapshot participantIds, current participant, seat highlights, timeline, or pending continuation.
3. Preview != event/resolution. Selecting a card sends zero action.
4. Do not add targetIds to an action whose existing payload does not use them.
5. Server participant order/progression remains authoritative after submission.
6. If a group card has conditional/excluded recipients that cannot be proven before submission, preview only the provable scope or document the GAP; never guess.
7. Public red semantic target/current-participant roles remain server presentation facts. Local pre-submit preview must use a distinct local preview decoration and must not mutate public semantic roles.

## Step 1 — inventory all group/AOE play paths
Trace at least Bumper Harvest, Oath, Barbarian Invasion, Raining Arrows, and any other standard card implemented as group/AOE.

For each record:
- existing card legality source;
- existing payload;
- whether target IDs are submitted;
- server participant construction/filtering/order;
- exclusions (self, dead, immune/skill-based, etc.);
- whether recipient scope is fully knowable before submission;
- current client selection/highlight behavior.

Name exact files/functions.

## Step 2 — pure local preview projection
Add a bounded pure helper/model for pre-submit group scope. Inputs must be already-proven local play/card facts and public player facts required by the existing rule. Output should contain only:
- preview active;
- effect/card kind;
- provable affected player IDs;
- optional neutral scope label.

Do not consume PresentationSnapshot/Pending/timeline to manufacture pre-submit scope.

## Step 3 — UI behavior
When an eligible AOE/group card is locally selected:
- automatically decorate the provable affected seats as LOCAL PREVIEW;
- do not make those seats clickable solely for AOE selection;
- do not require target Confirm;
- existing Play remains the only authoritative submission;
- deselect/change card clears preview;
- busy/stale CurrentAction/legality change clears or suppresses preview.

Use a visual class/data attribute distinct from public semantic red target/current-participant and amber explicit local target selection.

## Step 4 — Interaction Stage / Hero Focus separation
Before Play:
- local AOE preview must not create/change InteractionStageView, HeroFocusView, public seat semantic roles, interactionId, checkpoint, or public decision owner.

After server accepts and emits Group/AOE PresentationSnapshot:
- existing public Interaction Stage/current participant behavior continues unchanged;
- local preview must not remain as a second authoritative-looking state.

## Step 5 — tests
At minimum prove:
1. selecting each supported AOE/group card sends zero action;
2. correct provable scope IDs are previewed;
3. seats are not individually target-clickable solely because of AOE;
4. Play sends exactly the existing action/payload with no invented targetIds;
5. self-including vs self-excluding cards follow existing server rule;
6. defeated/nonparticipant handling matches existing server participant construction where knowable;
7. deselect/change card clears preview;
8. stale CurrentAction/actionRevision suppresses preview;
9. local preview does not change PresentationClientView/InteractionStage/HeroFocus/public semantic roles;
10. public semantic red + local preview overlap remains distinguishable if a server interaction is already visible;
11. after authoritative Group/AOE snapshot, existing current-participant focus remains unchanged;
12. ordinary single/multi target UI-07, Borrowed Sword UI-08, private picker UI-09, console UI-10 remain green;
13. topology anchor count/order from UI-11 remains unchanged;
14. <=650/<=480 preview decoration introduces no duplicate controls.

Use mounted GameRoom assertions, not helper-only tests.

## Step 6 — docs
Update README, ROADMAP, and docs/UX_V2_INTERACTION_STAGE_DESIGN.md. Explicitly document Preview != Event and list any AOE whose pre-submit scope cannot be fully proven.

## Validation
Run focused AOE/group + retained UI-01..11 tests, then npm run test:fast, npm run test:api, npm run build, npm run lint, git diff --check. Report exact counts.

## Scope exclusions
No server/game-rule/action payload changes; no participant-order changes; no projector/snapshot authority changes; no per-target AOE confirmation; no Hero Focus controls; no topology redesign; no animation/settlement work; no attempt to close UI-11 pixel-level visual GAP by assertion.

## Execution result
Append only UI-12 result: SHA, files, complete group/AOE inventory, exact authority source per card, preview helper API, mounted preview/action evidence, public-semantic separation, unsupported/conditional GAPs, exact validation counts, next bounded recommendation. Push and verify remote HANDOVER, then STOP.

## Acceptance
Pass only if AOE/group selection is an automatic local preview with zero target clicking and zero pre-submit action, existing Play payload remains unchanged, preview scope is backed by existing gameplay authority rather than presentation inference, and public semantic interaction state remains independent.
