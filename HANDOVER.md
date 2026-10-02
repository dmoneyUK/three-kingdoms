# WTK UX V2 — Current Task Handoff

## REMOTE HANDOVER RULE — MANDATORY

HANDOVER.md is a tracked remote coordination file. It MUST be committed and pushed to origin/ux-v2. Do not keep it local-only, gitignore it, untrack it, revert it, discard it, or omit it. After implementation, append the execution result, commit/push to origin/ux-v2, run git fetch origin, verify origin/ux-v2:HANDOVER.md contains the result, then STOP.

## Reviewer status

UX2.0C5-02 implementation 839464073c035f197a2d783a1306dd319382dbaa is **PARTIAL — C5-02-FIX1 REQUIRED**.

Accepted:
- a typed public participantRoles surface was added to interactionScene;
- fail-closed empty participantRoles are emitted when the generic scene is UNPROVEN;
- Attack and Group child engine fixtures add useful role evidence;
- proven legacy participants are derived from participantRoles;
- no React/CSS/gameplay scope creep;
- reported validation is green: fast 116/116, API 239/239, focused engine 24/24, build/lint/diff-check PASS.

Blocking issue 1 — decisionActorId in participantRoles is still taken from CurrentAction for every non-Dying proven scene.

Current code:
decisionActorId: dyingProof ? pending.actorId : dyingPending ? null : currentAction?.actorId ?? null

This violates the C5-02 contract that public participant-role IDs come only from proven causal envelope / accepted family-specific typed continuation proof. CurrentAction remains legality/control authority and can be viewer-dependent. Generic checkpoint coherence does not prove that a viewer's CurrentAction actor is the public semantic decision actor.

The old top-level interactionScene.decisionActorId also still uses this CurrentAction fallback. C5-02 cannot call participantRoles viewer-independent/proven while copying a viewer control actor without a family-specific authority gate.

Blocking issue 2 — parentParticipantId contains an unproven fallback to currentParticipantId.

Current child-frame code uses:
firstString(parentFrame single target, groupValues.parentParticipantId, currentParticipantId)

If neither the parent frame nor accepted Group parent-participant evidence proves a parent participant, falling back to the current child participant invents a parent role. The task explicitly required unsupported roles to be null/empty rather than guessed.

Blocking issue 3 — migration-map status vocabulary regressed.

C5-01 FIX1 explicitly constrained migration status to KEEP / DERIVE / DEPRECATE-LATER. C5-02 changed groupResolution to RETAIN-COMPAT, introducing an undocumented fourth status. Keep the established vocabulary; retained compatibility should be expressed by KEEP or DEPRECATE-LATER plus its prerequisite/reason.

Blocking issue 4 — evidence breadth is below the task acceptance bar.

The implementation adds direct new role assertions only for Attack and one Group Damage child path, plus synthetic malformed Group. The execution result claims role coverage for Duel, Judgement, independent Damage, inherited Lightning Damage, root/nested Negation, Dying/rescue, Borrowed Sword, Group Negation, Group Dying and resume, but this commit does not add explicit participantRoles assertions for those real paths.

Existing scene equality tests are useful regressions but do not prove each new role field is semantically correct. C5-02 explicitly required real-path role evidence for these families.

Do not start C6/C7/React.

---

# NEXT TASK — UX2.0C5-02-FIX1: Prove Decision/Parent Roles and Complete Real-Path Role Evidence

## Objective

Make participantRoles genuinely authoritative and viewer-independent.

No participant role may be populated merely because CurrentAction or a convenient child target contains an ID. Every populated role must have an accepted public semantic proof source.

Then add real-path evidence for the interaction families claimed by C5-02.

## Step 1 — inventory decision-actor authority by family

For each supported family inspect the production causal/Pending contract and identify the public semantic source of decisionActorId:
- Attack response;
- Duel response;
- Group/AOE response;
- Group Negation;
- root/nested Negation;
- Judgement choice if any;
- Damage checkpoint if any;
- Dying rescue;
- Borrowed Sword;
- any other existing response family covered by PresentationV2.

For each family classify:
- proven public decision actor source;
- no public decision actor at this checkpoint;
- CurrentAction-only control actor.

Do not treat CurrentAction-only actor as authoritative public participant role.

## Step 2 — centralize semantic decision-actor proof

Create the smallest helper needed to resolve public semantic decisionActorId from accepted evidence.

Requirements:
- Dying continues to use dyingDecisionProof;
- Group uses accepted typed Group continuation/frame ownership where proven;
- generic frame resolver may be used only if the game contract proves that resolver is the semantic decision actor for that stage/family;
- otherwise return null;
- CurrentAction must not be the proof source for participantRoles.

Keep CurrentAction as legality/control authority outside the public role proof.

Audit the existing top-level interactionScene.decisionActorId too. It must not claim stronger authority than participantRoles. Prefer one shared semantic decision-actor value for both.

## Step 3 — remove parent-participant guessing

For child scenes parentParticipantId may come only from:
- a coherent parent frame whose semantics prove the participant;
- accepted typed Group parent-participant linkage.

Remove fallback to currentParticipantId.

Add a negative test where child current participant exists but parent participant is not provable; parentParticipantId must be null.

## Step 4 — preserve fail-closed behavior

For UNPROVEN scenes all participantRoles remain empty/null.

For a PROVEN scene with no proven decision actor or parent participant:
- scene remains PROVEN;
- unsupported role is null;
- do not downgrade the entire scene solely because an optional role is unavailable.

Do not recover missing roles from legacy participants, timeline, resolutionId, actionRevision, or viewer CurrentAction.

## Step 5 — real-path role assertions

Extend existing engine/API fixtures with explicit participantRoles assertions for all applicable covered families:

1. Attack response.
2. Attack -> Judgement -> Attack resume.
3. Duel before and after responder handoff.
4. Group normal participant.
5. Group -> Negation.
6. Group -> Damage child.
7. Group -> Damage -> Dying.
8. Group resume after child.
9. Independent Damage.
10. Inherited Lightning Damage / Judgement-owned Damage.
11. Root Negation.
12. Nested Negation.
13. Dying rescue before and after rescuer handoff.
14. Borrowed Sword if current production fixture exposes a scene.

For any listed path that truly has no public decision/parent role at a checkpoint, assert null explicitly rather than omitting the assertion.

Use real engine/API paths where they already exist. Synthetic tests may supplement negative/malformed cases only.

## Step 6 — viewer equality/privacy proof

For at least Attack, Duel, Group and Dying:
- compare participantRoles across acting viewer and uninvolved viewer;
- deep-equal public roles;
- demonstrate that viewer-specific CurrentAction/options can differ without changing participantRoles.

Add a targeted regression where possible that supplies different CurrentAction actor/control data to otherwise identical authoritative causal state; participantRoles.decisionActorId must not change unless that actor is independently proven by the semantic family contract.

## Step 7 — legacy participants compatibility

After changing semantic decision/parent proof:
- verify participantsFromScene still preserves existing observable source/target/current_target/group_participant shape;
- do not add decision_actor or parent_participant legacy labels unless they already existed;
- unproven/legacy fallback behavior remains unchanged.

## Step 8 — fix migration-map vocabulary

Use only the established statuses:
- KEEP
- DERIVE
- DEPRECATE-LATER

Replace RETAIN-COMPAT for groupResolution with the correct existing status and explain retention in the reason/removal prerequisite.

Update participantRoles wording so it does not claim CurrentAction-derived IDs are authoritative.

## Step 9 — documentation

Update the C5-02 section with:
- per-family decision-actor authority rule;
- parentParticipantId proof rule;
- explicit null-when-unprovable rule;
- real-path evidence summary;
- corrected migration status.

Do not overclaim unsupported families.

## Step 10 — validation

Run focused PresentationV2/causality plus all touched real engine/API fixtures, then:
- npm run test:fast
- npm run test:api
- npm run build
- npm run lint
- git diff --check

Report exact counts.

## Scope exclusions

No C6/C7, React/CSS, gameplay changes, final PresentationSnapshot, new causal IDs, animation protocol, historical originRef fabrication, client legality, or private option exposure.

## Execution result

Append only C5-02-FIX1 execution result with:
- full implementation SHA;
- files changed;
- per-family decision-actor authority inventory;
- semantic decision helper/rules;
- parent-participant proof change;
- explicit real-path participantRoles evidence;
- viewer/privacy evidence;
- migration-map correction;
- exact validation counts;
- remaining C5 gaps.

Push implementation AND appended HANDOVER to origin/ux-v2. Run git fetch origin. Verify origin/ux-v2:HANDOVER.md contains the result. Then STOP.

## Acceptance

FIX1 passes only if participantRoles contains no CurrentAction-only or guessed parent identities, top-level scene decisionActorId uses the same public semantic authority, all claimed supported families have explicit real-path role evidence or explicit null assertions, viewer-specific controls cannot change public roles, migration status vocabulary is restored, compatibility remains intact, and all required regressions are green.
