# WTK UX V2 — Current Task Handoff

## REMOTE HANDOVER RULE — MANDATORY

HANDOVER.md is a tracked remote coordination file. It MUST be committed and pushed to origin/ux-v2. Do not keep it local-only, gitignore it, untrack it, revert it, discard it, or omit it. After implementation, append the execution result, commit/push to origin/ux-v2, run git fetch origin, verify origin/ux-v2:HANDOVER.md contains the result, then STOP.

## Reviewer status

UX2.0C5-01-FIX1 implementation e9f118fabc95cbdb383fe108094adaba5f4ab429 is **ACCEPTED**.

C5-01 is CLOSED / ACCEPTED.

Reviewer verified:
- all ten exported PresentationV2 fields are now explicitly classified in the design migration table;
- interactionScene and dyingBarrier are the proven public causal semantic core;
- activeContext and parentContext intentionally preserve Pending-first legacy compatibility and are explicitly non-authoritative;
- rootContext is correctly documented as mixed-authority rather than globally authoritative;
- decision remains CurrentAction/control-derived and is not a causal identity source;
- settlement and transitionEvents are explicitly descriptive timeline compatibility data, not a transition protocol;
- the misleading causal-authority comment in presentation-v2.ts was corrected;
- a conflicting-metadata regression proves legacy activeContext can remain Pending-first while interactionScene remains envelope-owned;
- strict Group typed-link and fail-closed behavior from C5-01 remain intact;
- no compatibility field was prematurely removed;
- no React/CSS/gameplay scope creep occurred;
- reported validation is green: fast 116/116, API 239/239, build/lint/diff-check PASS.

C5 is NOT closed yet. The migration map identifies the next concrete gap: the typed semantic core does not yet expose a complete typed participant-role surface for all supported interaction families, so legacy participants/groupResolution still carry information future React would otherwise have to reconstruct.

Do not start C6/C7/React.

---

# NEXT TASK — UX2.0C5-02: Typed Participant Roles and Group Compatibility Derivation

## Objective

Make the authoritative typed interactionScene sufficient for public participant-role rendering across the already-supported interaction families, without forcing future React to read legacy participants or groupResolution to determine who is source, affected target, current participant, decision actor, or nested resolver.

Then derive legacy participants/groupResolution from the typed core where behavior-preserving and proven.

This is server PresentationV2 work only. Do not change gameplay or React/CSS.

## Step 1 — inventory participant-role needs from real supported families

Using existing engine/API fixtures, enumerate public roles needed for:
- Attack / Attack response;
- Attack -> Judgement -> Attack resume;
- Duel;
- Group/AOE;
- Group -> Negation;
- Group -> Damage child;
- Group -> Damage -> Dying;
- independent Damage;
- inherited Lightning Damage;
- Judgement;
- root/nested Negation;
- Dying/rescue handoff;
- Borrowed Sword if its existing scene uses distinct source/effect-target/decision roles.

For each family record which public roles actually exist in authoritative source:
- interaction source;
- original/effect target(s);
- active/current target(s);
- current group participant if applicable;
- decision actor;
- active resolver;
- parent participant when nested.

Do not invent roles unsupported by production semantics.

## Step 2 — define the smallest typed participant-role contract

Extend PresentationInteractionScene with one typed public participant-role structure sufficient for the inventory.

Prefer explicit semantic fields over generic arrays when roles differ. Reuse existing scene fields when they already carry the role unambiguously.

Requirements:
- public only;
- viewer-independent;
- IDs come from proven causal envelope / accepted family-specific typed continuation proof;
- no hand/card/provider/legal-option data;
- no new identity model;
- no duplicated engine legality.

If a role cannot be proven, represent it as null/empty rather than infer from legacy participants.

## Step 3 — Group/AOE must be complete without legacy participant reconstruction

For real Group fixtures prove the typed scene can represent:
- source;
- original group targets;
- current participant;
- decision actor when blocked;
- active resolver;
- nested Damage/Dying participant;
- return/resume to parent Group.

The future consumer must not need recursive Pending inspection or groupResolution to answer those public role questions.

Preserve effect order where production exposes it.

## Step 4 — non-Group families

Prove the role contract does not become Group-specific.

At minimum cover:
- Attack;
- Duel;
- Judgement;
- independent Damage;
- inherited Lightning Damage;
- Dying;
- Negation.

For each, unsupported Group-only roles must be null/empty rather than populated by guesses.

## Step 5 — viewer equality and privacy

For representative Attack, Duel, Group and Dying checkpoints compare at least two viewers.

The new participant-role structure must be deep-equal across viewers.

CurrentAction/private options remain viewer-specific and outside the public role contract.

Do not expose:
- card IDs;
- Peach/Dodge/Attack provider identities when private;
- hand contents;
- hidden eligibility.

## Step 6 — fail-closed authority

When interactionScene is UNPROVEN because of:
- null/malformed envelope;
- checkpoint/active mismatch;
- missing frame;
- Group typed-link failure;
- Dying causal/resolver mismatch;

the new authoritative participant-role structure must not recover identities from legacy participants, groupResolution, Pending scans, timeline, resolutionId, or actionRevision.

Use null/empty fail-closed values.

## Step 7 — derive compatibility surfaces where safe

Audit legacy participants and groupResolution against the new typed roles.

If a legacy field can be derived from typed roles without changing its existing observable shape:
- derive it from the typed core;
- add compatibility tests.

If not:
- leave it unchanged;
- document the exact remaining dependency and why;
- do not force a migration merely to reduce code.

groupResolution semantics must remain PROVEN/UNPROVEN compatible with the accepted typed Group authority.

## Step 8 — reconnect/stability

For Group, Duel and Dying:
- repeated projection at unchanged checkpoint is deep-equal;
- another viewer sees identical public participant roles;
- no IDs/revisions are generated by projection;
- role changes happen only with authoritative checkpoint/current changes.

Include Group rescuer/participant handoff if supported by existing fixture.

## Step 9 — update migration map

Update the C5 migration table rows for:
- participants;
- groupResolution;
- interactionScene.

State exactly which legacy dependencies C5-02 removes and which remain.

Do not claim DEPRECATE-LATER prerequisites are satisfied unless tests prove future React no longer needs the information.

## Step 10 — tests

Prefer real existing engine/API fixtures.

Focused evidence should include:
- Group normal participant;
- Group nested Damage;
- Group nested Dying;
- Group resume;
- Attack;
- Duel;
- Judgement;
- Damage;
- Dying handoff;
- malformed Group link;
- malformed Dying resolver;
- viewer equality.

Synthetic projector tests may supplement but must not replace real path evidence.

## Step 11 — validation

Run focused PresentationV2/causality and representative API fixtures, then:
- npm run test:fast
- npm run test:api
- npm run build
- npm run lint
- git diff --check

Report exact counts.

## Scope exclusions

Do not:
- modify React/CSS;
- start C6/C7;
- create final PresentationSnapshot;
- redesign causal IDs;
- change gameplay/target legality;
- add animation timing/direction;
- fabricate historical delayed originRef;
- expose private CurrentAction options;
- remove rootContext/activeContext/parentContext/settlement/transitionEvents wholesale;
- invent unsupported interaction roles.

## Execution result

Append only C5-02 execution result with:
- full implementation SHA;
- files changed;
- participant-role inventory;
- new/changed typed contract;
- Group role evidence;
- non-Group role evidence;
- viewer/privacy evidence;
- fail-closed evidence;
- compatibility fields derived vs retained;
- migration-map changes;
- exact validation commands/counts;
- remaining C5 gaps.

Push implementation AND appended HANDOVER to origin/ux-v2. Run git fetch origin. Verify origin/ux-v2:HANDOVER.md contains the result. Then STOP.

## Acceptance

C5-02 passes only if future presentation consumers can obtain all proven public participant roles for the covered interaction families from the typed authoritative scene without reconstructing them from legacy Pending/timeline objects, viewer equality/privacy remains correct, malformed authority fails closed, compatibility behavior is preserved, and all required regressions are green.
