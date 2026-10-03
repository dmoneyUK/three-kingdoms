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

## FIX1 result — feca695

- SHA: `feca695` (`Wire UX console decision model to footer controls`).
- Files: `app/page.tsx`, `tests/active-skill-interactions.test.mjs`, `README.md`, `ROADMAP.md`, and `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`.
- Actual-control gating: footer primary IDs now map to `borrowed-sword`, `active-skill`, `trigger-cards`, `trigger-target`, `response`, `rescue`, `discard`, and `turn`; each rendered primary requires the matching `consoleDecision.primary.id` and model-enabled state. `target-card`, `target-card-trigger`, `harvest`, private distribution, deck reorder, and mandatory choice remain dialog-owned and are not advertised as footer primaries.
- Authority corrections: candidates require the relevant `CurrentAction.legalActions` capability; turn/discard candidates also require `currentActionOwnedByViewer`, so stale `isMyTurn`/`canPlay` facts cannot expose Play or End during a response/trigger. Local Cancel is rendered only from `consoleDecision.localCancel.visible`; Skip/Decline is rendered only from `consoleDecision.authoritativeDecline`. PresentationSnapshot remains descriptive and cannot grant controls.
- Mounted evidence: ordinary turn has one footer primary plus independent End; Borrowed Sword Confirm remains local and its Cancel appears only after local input; trigger with a stale `isMyTurn` flag exposes no footer primary or End; target-card and target-card-trigger dialogs expose no duplicate footer primary; existing UI-07..09 mounted Confirm/Cancel/payload regressions remain green. The pure model contradiction test proves equal-priority candidates fail closed; no natural production state was added solely to manufacture a contradictory pair.
- Dialog ownership: pending target-card and semantic target-card trigger submissions retain their existing dialog callbacks, opaque keys, local Cancel/Skip behavior, and no footer duplicate. Harvest, private distribution, deck reorder, and mandatory choice remain outside the footer model's primary candidates.
- Action/payload proof: existing mounted assertions still verify `choose_borrowed_sword_target` with `{ targetId }`, target-card `choose_target_card` with opaque zone/card payload, and semantic `trigger` with `{ providerId, cardKeys }`; no server route, action name, or payload changed.
- Responsive evidence: existing console wrapper containment remains in `app/globals.css` with wrapping and `max-width:520px` behavior; the retained responsive/style assertions and production build passed.
- Validation: focused mounted/UI tests `38/38`; `npm run test:fast` `170/170`; `npm run test:api` `239/239`; `npm run build` passed; `npm run lint` passed; `git diff --check` passed.
- Closure recommendation: implementation acceptance is met for actual footer gating, fail-closed viewer authority, dialog singularity, and action compatibility. Reviewer should verify the pushed `ux-v2` commit and the remote handover before closing UI-10-FIX1.

## Acceptance
Pass only if the pure console decision model controls actual footer submit/Cancel/Skip exposure: fail-closed/coherence results are reflected in real rendered controls, no stale legacy boolean bypasses the gate, dialog-owned submissions remain singular, and gameplay actions/payloads are unchanged.
