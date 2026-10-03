# WTK UX V2 — Current Task Handoff

## REMOTE HANDOVER RULE
HANDOVER.md is tracked remote coordination state. Commit and push it to origin/ux-v2. After implementation append the result, push implementation and HANDOVER, fetch origin, verify origin/ux-v2:HANDOVER.md contains the result, then STOP.

**CLEANLINESS:** keep only this current task. Read docs/PLANNER_DEVELOPMENT_WORKFLOW.md.

# NEXT TASK — UX2.0UI-15: Reaction Chain Public Causality & Private Response Boundary

## Objective
UI-14 is accepted and closed. Harden the Reaction Chain UX for Negation/counter-Negation and nested reactions so the public chain shows causal structure without pass-node spam, while each viewer's response options remain private and CurrentAction-authoritative.

Do not change Negation rules, response order, actions/payloads, causal identity rules, or card visibility.

## Locked UX rules
1. Preserve the causal root/effect being reacted to; do not flatten the chain into timeline chronology.
2. A declined/pass response must not become a fake public chain node unless the existing server model already defines a semantic event for it.
3. Public chain content must be viewer-equal.
4. Private legal response cards/providers come only from CurrentAction/capabilities.
5. PresentationSnapshot/causal envelope may describe proven public frame relationships; they never grant local control.
6. No client calculation of next responder or chain winner.
7. Cancel is local-only; Skip/Decline is authoritative.
8. Unsupported chain semantics fail closed rather than using timeline/resolutionId/actionPlayerId correlation.

## Step 1 — inventory real reaction families
Trace production paths for:
- root Negation on a stratagem;
- counter-Negation;
- Group/AOE -> Negation -> resume;
- Duel -> Negation -> resume;
- any Judgement/other effect that can enter the same response-chain machinery;
- decline/pass progression and terminal resolution.

For each, record Pending/continuation type, causal frame relation, CurrentAction actor/options, public events, resume target, and exact action/payload.

## Step 2 — define/read a bounded Reaction Chain display model
Prefer a pure read-only projection from already-proven public causal/presentation data. It may expose:
- causal root/effect label;
- ordered proven reaction frames/nodes;
- active frame/node;
- current public decision actor if proven;
- parent/child relation;
- terminal/resumed state when proven.

Do not reconstruct nodes from timeline order alone. Do not include private card candidates. Do not emit pass nodes merely because a viewer declined.

If existing PresentationSnapshot lacks enough proven public data for a truthful chain, expose only the proven subset and document the GAP; do not expand projector authority in this task.

## Step 3 — UI integration
Add/upgrade a read-only Reaction Chain region within the existing Interaction Stage when a proven reaction chain exists:
- same public content for all viewers;
- visually distinguish causal root, nested reaction, and active node;
- keep local response controls in the local console, never inside the public chain;
- no seat movement/replacement;
- no duplicate submit/Skip surfaces.

Keep it compact; this is semantic hierarchy, not a full event log.

## Step 4 — private response boundary
For the CurrentAction actor:
- eligible Negation/provider choices remain private;
- selection remains local until existing Confirm;
- exact existing response action/payload remains unchanged;
- authoritative Skip/Decline remains separate;
- actionRevision/actor handoff clears stale local selection.

For non-actors:
- no private candidate identity/control leaks into chain DOM/data attributes.

## Step 5 — tests
At minimum cover:
1. root Negation chain preserves original effect/root;
2. counter-Negation adds a proven nested/child reaction without replacing root;
3. Group/AOE -> Negation -> resume retains group causal context;
4. Duel -> Negation -> resume retains Duel causal context;
5. decline/pass advances server response order but does not create fake public pass node;
6. public chain is viewer-equal;
7. only CurrentAction actor sees private response options/Confirm/Skip;
8. selection sends zero action until Confirm;
9. Confirm/Skip use exact existing action/payload;
10. stale actionRevision/actor clears local selection;
11. timeline/actionPlayerId/resolutionId-only mutation cannot add chain nodes or grant controls;
12. unsupported/malformed causal linkage fails closed;
13. Interaction Stage/Hero Focus and seat anchors remain stable;
14. local amber selection does not overwrite public semantic roles;
15. UI-07..14 regressions remain green.

Use real engine/API fixtures for causal/resume proof and mounted GameRoom tests for chain rendering/privacy/control ownership.

## Step 6 — docs
Update README, ROADMAP, and docs/UX_V2_INTERACTION_STAGE_DESIGN.md with the Reaction Chain authority model, pass-node rule, privacy boundary, and truthful GAPs.

## Validation
Run focused Negation/reaction API/presentation/mounted tests plus retained UI-01..14 tests, then npm run test:fast, npm run test:api, npm run build, npm run lint, git diff --check. Report exact counts.

## Scope exclusions
No Negation/gameplay rule changes; no new response action/payload; no projector authority expansion; no timeline-as-authority; no topology redesign; no animation/settlement work; no UI-11 pixel-gap claim.

## Execution result
Append only UI-15 result: SHA, files, reaction-family inventory, display-model source/limits, causal root/nested/resume evidence, pass-node evidence, privacy/control evidence, malformed/stale negative tests, exact validation counts, remaining GAPs, next bounded recommendation. Push and verify remote HANDOVER, then STOP.

## Acceptance
Pass only if the displayed reaction hierarchy is backed by proven causal/public authority, preserves the original causal root across nested Negation and resume, does not manufacture pass nodes, is viewer-equal, keeps response options private and CurrentAction-owned, and leaves gameplay actions/payloads unchanged.
