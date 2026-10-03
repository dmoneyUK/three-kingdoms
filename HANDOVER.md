# WTK UX V2 — Current Task Handoff

## REMOTE HANDOVER RULE
HANDOVER.md is tracked remote coordination state. Commit and push it to origin/ux-v2. After implementation append the result, push implementation and HANDOVER, fetch origin, verify origin/ux-v2:HANDOVER.md contains the result, then STOP.

**CLEANLINESS:** keep only this current task. Read docs/PLANNER_DEVELOPMENT_WORKFLOW.md.

# NEXT TASK — UX2.0UI-14: Judgement / Replacement Semantic Flow Regression

## Objective
UI-13 is accepted and closed. Harden the existing Judgement UX, including replacement-card decisions, so public focus and local controls follow existing server-owned Judgement causal state without client inference.

Do not change Judgement rules, card outcomes, replacement legality, action names/payloads, or visibility.

## Authority rules
1. Pending/continuation and causal envelope own Judgement execution and resume.
2. CurrentAction/capabilities own replacement/control legality and private eligible-card options.
3. PresentationSnapshot owns only proven public source/target/current participant/decision actor/resolver.
4. The revealed judgement card is public only when the existing server contract reveals it; replacement candidates remain private to entitled viewer.
5. Timeline/log/card animation is descriptive, not decision authority.
6. Hero Focus must use semantic IDs only.
7. Cancel is local-only; Skip/Decline is authoritative only where the existing contract provides it.
8. No convenience fallback from pending card owner, turn owner, actionPlayerId, timeline, or last revealed card.

## Step 1 — inventory real Judgement families
Trace production paths for at least:
- delayed Lightning Judgement;
- Overindulgence;
- Rations Depleted;
- standalone/skill-triggered Judgement if implemented;
- Sima Yi replacement;
- any other replacement provider.

For each record trigger, source/subject, revealed-card visibility, replacement actor/options, action/payload, causal frame/stage, resume path, and terminal outcome.

## Step 2 — prove public semantic checkpoints
Using real engine/API fixtures where available, prove:
- Judgement source/subject roles;
- current participant and active resolver;
- replacement decision actor only when CurrentAction proves it;
- interaction/frame continuity through replacement;
- checkpoint/revision progression;
- resume to parent interaction where nested;
- terminal clear where root;
- viewer-equal public scene.

Unsupported semantic roles must remain null rather than inferred.

## Step 3 — private replacement controls
For entitled viewer:
- existing eligible replacement cards/providers come only from CurrentAction;
- selecting replacement is local until the existing submit boundary;
- one coherent primary submit and authoritative decline/skip only if contract permits;
- actionRevision/current actor change clears stale local selection.

For non-entitled viewers:
- no private candidate identity or control leaks through public DOM, data attributes, Interaction Stage, Hero Focus, logs before authoritative reveal.

## Step 4 — Hero Focus and revealed-card presentation
Keep Judgement subject/focus tied to proven semantic participant. Publicly revealed judgement card may be displayed only from the existing public field/event that authorizes reveal.

Do not let replacement selection change public focus or semantic seat roles before submission.

## Step 5 — tests
At minimum cover:
1. Lightning Judgement initial semantic checkpoint;
2. Overindulgence Judgement;
3. Rations Depleted Judgement;
4. Sima Yi replacement actor receives private options;
5. another viewer sees same public scene but no private options;
6. replacement selection sends zero action until existing Confirm/submit boundary;
7. submit preserves exact existing action/payload;
8. decline/skip preserves exact existing semantics;
9. stale actionRevision/actor clears local replacement selection;
10. replacement checkpoint keeps correct interaction/frame continuity;
11. nested Judgement resumes parent interaction correctly where applicable;
12. root Judgement clears correctly;
13. revealed judgement identity is public only at the existing reveal boundary;
14. private replacement identity never leaks before submission;
15. timeline/actionPlayerId/turn mutations cannot grant controls or change focus;
16. seat anchors/topology remain stable;
17. UI-07..13 regressions remain green.

Prefer engine/API proof for lifecycle/causality and mounted GameRoom proof for controls/privacy/focus.

## Step 6 — docs
Update README, ROADMAP, and docs/UX_V2_INTERACTION_STAGE_DESIGN.md with exact Judgement authority, reveal, replacement, and resume boundaries. List truthful GAPs.

## Validation
Run focused Judgement API/presentation/mounted tests plus retained UI-01..13 tests, then npm run test:fast, npm run test:api, npm run build, npm run lint, git diff --check. Report exact counts.

## Scope exclusions
No Judgement/gameplay rule changes; no new action/payload; no visibility expansion; no projector authority expansion; no topology redesign; no animation/settlement work; no UI-11 pixel-gap claim.

## Execution result
Append only UI-14 result: SHA, files, complete Judgement family inventory, authority/reveal mapping, real causal/resume evidence, private-control/privacy evidence, stale-state tests, exact validation counts, remaining GAPs, next bounded recommendation. Push and verify remote HANDOVER, then STOP.

## Acceptance
Pass only if Judgement/replacement focus and controls are demonstrably server-owned, private replacement choices remain private until authoritative submission/reveal, causal continuity/resume is proven without client inference, existing actions/payloads/rules remain unchanged, and unsupported semantics fail closed.
