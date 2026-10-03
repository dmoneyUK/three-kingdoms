# WTK UX V2 — Current Task Handoff

## REMOTE HANDOVER RULE
HANDOVER.md is tracked remote coordination state. Commit and push it to origin/ux-v2. After implementation append the result, push implementation and HANDOVER, fetch origin, verify origin/ux-v2:HANDOVER.md contains the result, then STOP.

**CLEANLINESS:** keep only this current task. Read docs/PLANNER_DEVELOPMENT_WORKFLOW.md.

# NEXT TASK — UX2.0UI-10-FIX1: Make Console Decision Model Govern the Actual Controls

## Objective
UI-10 is PARTIAL. Commit 848de1b51b44b74c58b307cd4cf886f941747748 added a useful pure buildConsoleDecisionDisplay model, but it currently governs mainly guidance/data attributes. Actual footer controls are still rendered from independent legacy JSX booleans.

This defeats the central acceptance condition: consoleDecision can be incoherent / primary null while old JSX still renders unrelated primary submit buttons.

Fix integration so the accepted console model actually governs primary/local-cancel/authoritative-decline exposure, without changing callbacks, action names, payloads, legality, or server behavior.

## Reviewer evidence
In app/page.tsx around the local operation console:
- consoleDecision is rendered in decision-status;
- rescue, Borrowed Sword, trigger, active skill, response, discard and turn primary buttons are still independently rendered by legacy booleans;
- buildConsoleDecisionDisplay can fail closed on an equal-priority contradiction, yet that result does not fail-close the real buttons.

A display-only fail-closed model is insufficient.

## Step 1 — map model primary IDs to existing control surfaces
Use/refine explicit IDs for target-card, target-card-trigger, borrowed-sword, active-skill, trigger-cards, trigger-target, response, rescue, harvest if applicable, discard, and turn.

Do not move callbacks into the pure model. Keep existing handlers/payloads, but gate actual primary controls with the selected model result.

## Step 2 — gate real footer controls
- Render/enable a footer primary only when its ID equals consoleDecision.primary.id.
- If controlsVisible=false or coherent=false, render no authoritative footer primary.
- No legacy boolean may bypass this gate.
- Local Cancel is exposed only when consoleDecision.localCancel.visible.
- Skip/Decline is exposed only when consoleDecision.authoritativeDecline exists.
- Busy/enabled state must agree with the model and existing stronger safety guards.
- Provider/mode selectors may remain secondary only when they belong to the current authoritative decision.

## Step 3 — preserve special/dialog ownership
Do not create duplicate footer controls for dialogs that already own submission: pending target-card picker, target-card trigger picker, Harvest, private distribution, deck reorder, mandatory choice.

Console may show guidance/summary, but dialog remains sole submit surface. The model must not advertise a second footer primary.

## Step 4 — correct authority composition
Audit consolePrimaryCandidates, consoleKind, consoleAuthoritativeDecision, decline and secondary candidates. A candidate may exist only when the existing authoritative control path is legal for this viewer; priority must not hide an unauthorized candidate.

Test stale overlaps:
- isMyTurn/canPlay true while response/trigger CurrentAction owns decision;
- stale rescue + response;
- trigger + active-skill overlap;
- stale provider after actionRevision;
- PresentationSnapshot decision actor mismatch vs CurrentAction actor.

CurrentAction/capabilities win; public presentation never grants control.

## Step 5 — mounted tests of actual rendered controls
Pure-model tests are insufficient. Add mounted GameRoom regressions proving:
1. ordinary turn: one Play/Confirm primary plus independent End secondary;
2. response: only response primary when needed + authoritative Skip;
3. rescue: Peach + Skip, no stale turn primary;
4. trigger target/card: one applicable Confirm, local Cancel if applicable, Skip if authorized;
5. active skill: one Confirm, no unrelated turn/trigger primary;
6. Borrowed Sword: one Confirm + local Cancel;
7. discard: one discard primary, no Play primary;
8. equal-priority contradiction: no footer primary;
9. stale lower-priority turn facts cannot leak Play during response/trigger;
10. coherent=false removes/disables real primary buttons, not only data attributes;
11. Cancel absent when model says hidden;
12. Skip absent when model says no authoritative decline;
13. dialog-owned target-card/Harvest/private-choice submission not duplicated in footer;
14. PresentationSnapshot-only mutation cannot expose footer control;
15. retained actions/payloads unchanged;
16. UI-07..09 Confirm/Cancel behavior remains green;
17. <=650/<=480 contained.

Use mounted DOM/button/callback assertions, not source-regex-only proof.

## Step 6 — docs
Correct README/ROADMAP/design wording: console model governs actual footer exposure; dialog-owned submissions remain outside it. Do not claim callback generation.

## Validation
Run focused mounted console tests plus retained UI-01..09 tests, npm run test:fast, npm run test:api, npm run build, npm run lint, git diff --check. Report exact counts.

## Scope exclusions
No server/game-rule/action payload changes; no projector/snapshot authority expansion; no moving dialog-owned submissions into footer; no topology/dock redesign; no Hero Focus controls; no animation/settlement work; no unrelated refactor.

## Execution result
Append only FIX1 result: SHA, files, actual-control gating map, authority corrections, mounted contradiction evidence, dialog ownership evidence, unchanged action/payload proof, responsive evidence, exact validation counts, closure recommendation. Push and verify remote HANDOVER, then STOP.

## Acceptance
Pass only if the pure console decision model controls actual footer submit/Cancel/Skip exposure: fail-closed/coherence results are reflected in real rendered controls, no stale legacy boolean bypasses the gate, dialog-owned submissions remain singular, and gameplay actions/payloads are unchanged.
