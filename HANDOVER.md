# WTK UX V2 — Current Task Handoff

## REMOTE HANDOVER RULE
HANDOVER.md is tracked remote coordination state. Commit and push it to origin/ux-v2. After implementation append the result, push implementation and HANDOVER, fetch origin, verify origin/ux-v2:HANDOVER.md contains the result, then STOP.

**CLEANLINESS:** keep only this current task. Read docs/PLANNER_DEVELOPMENT_WORKFLOW.md.

# NEXT TASK — UX2.0UI-16: Dying / Peach Rescue Player-Facing Handoff

## Objective
UI-15 is accepted and closed. Harden the player-facing Dying/Peach rescue flow so every viewer can understand who is dying and who is currently deciding, while only the authoritative CurrentAction actor receives rescue controls.

C4 already established the causal Dying barrier. Do not redesign or re-prove the engine from scratch; consume the accepted server-owned semantics and close the UI handoff/regression boundary.

## Authority rules
1. Pending/continuation and causal envelope own Dying/rescue progression and rescue order.
2. CurrentAction/capabilities own whether the local viewer may give Peach/other rescue provider or decline.
3. PresentationSnapshot owns proven public dying subject/current participant/decision actor/resolver.
4. Hero Focus must prioritize the proven dying/current participant semantics; never infer from lowest HP, timeline, turn owner, actionPlayerId, or local controls.
5. UI must never calculate the next rescuer.
6. Local card/provider selection is preview only until existing submit boundary.
7. Cancel is local-only; Skip/Decline is authoritative.
8. Death/rescue completion must follow server state; UI must not predict terminal outcome.

## Step 1 — inventory the real Dying lifecycle
Trace:
- entry from ordinary/root Damage;
- entry from child Damage (including Duel);
- initial rescue actor;
- Peach/rescue provider submission;
- successful rescue and HP recovery;
- insufficient rescue / next rescuer handoff;
- decline/pass handoff;
- terminal death;
- return/resume to parent frame where applicable.

Record exact Pending/continuation, CurrentAction, action/payload, causal frame relation, PresentationSnapshot roles, and terminal/resume behavior.

## Step 2 — player-facing Dying semantic model
Using existing InteractionStage/HeroFocus/PresentationClientView, add only a bounded read-only display model if needed. It may expose proven:
- dying player;
- current rescue decision actor;
- active resolver;
- root vs child-frame context;
- neutral rescue status/guidance.

Do not expose private hand/provider identities. Do not infer rescue order or number of future rescuers.

## Step 3 — UI behavior
Within existing Interaction Stage/Hero Focus/local console:
- make the dying subject unmistakable as the focus;
- show current public rescue decision actor when proven;
- keep seat anchors stable;
- keep local rescue controls only in local console;
- no duplicate Peach/Skip controls in Interaction Stage;
- distinguish public dying focus from local amber card/target selection;
- when actor hands off, public decision highlight follows server checkpoint and stale local controls disappear.

Do not add a new modal that replaces the table/dock.

## Step 4 — private rescue controls
For CurrentAction actor:
- existing Peach/provider options remain private;
- selecting card/provider sends zero action until existing Confirm/submit;
- exact existing give_peach/trigger/decline action and payload remain unchanged;
- actionRevision/actor handoff clears stale selection.

For non-actors:
- no private rescue candidate identity/control leaks through public stage/focus/data attributes.

## Step 5 — tests
At minimum cover:
1. root Damage -> Dying initial focus;
2. Duel child Damage -> Dying preserves parent context;
3. current rescuer is public decision actor while dying player remains Hero Focus;
4. actor viewer sees one coherent rescue primary + authoritative Skip/Decline;
5. non-actor sees same public Dying scene but no private rescue options;
6. selecting Peach/provider sends zero action until submit;
7. submit preserves exact existing action/payload;
8. decline/pass advances only from server-owned handoff and creates no client next-rescuer inference;
9. actionRevision/actor change clears stale selection and controls;
10. successful rescue exits/returns according to existing causal contract;
11. terminal death clears/settles according to existing server contract;
12. timeline/actionPlayerId/turn/HP-only mutations cannot grant controls or change focus;
13. seat anchors/topology remain stable;
14. local amber selection does not overwrite public dying/decision roles;
15. UI-07..15 regressions remain green.

Use real engine/API fixtures for rescue progression/causality and mounted GameRoom tests for focus/privacy/control ownership.

## Step 6 — docs
Update README, ROADMAP, and docs/UX_V2_INTERACTION_STAGE_DESIGN.md with the Dying player-facing authority/handoff contract and truthful remaining GAPs.

## Validation
Run focused Dying/Peach API/presentation/mounted tests plus retained UI-01..15 tests, then npm run test:fast, npm run test:api, npm run build, npm run lint, git diff --check. Report exact counts.

## Scope exclusions
No Dying/gameplay/rescue-order changes; no new action/payload; no projector authority expansion; no client next-rescuer logic; no topology redesign; no animation/settlement redesign; no UI-11 pixel-gap claim; no Reaction Chain historical-model expansion.

## Execution result
Append only UI-16 result: SHA, files, Dying lifecycle inventory, semantic/focus model, root/child rescue evidence, private-control/privacy evidence, rescue/decline/handoff/terminal evidence, stale/inference negatives, exact validation counts, remaining GAPs, next bounded recommendation. Push and verify remote HANDOVER, then STOP.

## Acceptance
Pass only if the dying subject remains the clear public focus, current rescuer/control ownership is server-authoritative, private rescue choices stay private/local until submission, handoff/resume/death follows existing causal state without client inference, seat topology remains stable, and actions/payloads/rules are unchanged.
