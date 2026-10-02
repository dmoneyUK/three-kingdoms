# WTK UX V2 — Current Task Handoff

## REMOTE HANDOVER RULE — MANDATORY

HANDOVER.md is a tracked remote coordination file. It MUST be committed and pushed to origin/ux-v2. Do not keep it local-only, gitignore it, untrack it, revert it, discard it, or omit it. After implementation, append the execution result, commit/push to origin/ux-v2, run git fetch origin, verify origin/ux-v2:HANDOVER.md contains the result, then STOP.

## Reviewer status

UX2.0C5-01 implementation e8dfa43ec14173cb8dc208dfa5afc09ce3fc64fa is **PARTIAL — C5-01-FIX1 REQUIRED**.

Accepted:
- recursive arbitrary-Pending Group discovery was removed;
- Group authority now requires typed continuation linkage and an explicit causal frame reference;
- stage-only Group-frame guessing was removed;
- malformed nested Group data no longer fabricates PROVEN Group semantics;
- C1-C4 regressions are reported green: fast 115/115, focused PresentationV2 24/24, API 239/239, build/lint/diff-check PASS;
- no React/CSS/gameplay scope creep.

Blocking issue 1 — required PresentationV2 inventory/migration map is incomplete.

The task explicitly required an inventory for every exported field and a migration table with:
field / current authority-source / replacement-core field / KEEP-DERIVE-DEPRECATE-LATER / reason / removal prerequisite.

The implementation documentation adds only a short prose section. It does not provide the required table, and does not classify all exported fields. In particular the current PresentationV2 type still exports:
rootContext, activeContext, parentContext, participants, interactionScene, dyingBarrier, groupResolution, decision, settlement, transitionEvents.

The execution result discusses only a subset in enough detail. C5 cannot be considered consolidated until every field has an explicit authority and migration status.

Blocking issue 2 — authority wording and implementation disagree for legacy active/parent contexts.

The implementation comment says that once causal metadata exists, Pending-derived values “cannot override authoritative causal state”, and the execution result says legacy causal source/target values use envelope metadata when present.

But current code constructs:
- activeContext.sourceId as active?.sourceId ?? causalActiveFrame.current.currentSourceId;
- activeContext.currentTargetIds as active?.targetIds ?? causalActiveFrame.current.currentTargetIds;
- parentContext.sourceId as parent?.sourceId ?? causalParentFrame.origin.originSourceId;
- parentContext.targetIds as parent?.targetIds ?? causalParentFrame.origin.originalTargetIds.

Therefore Pending-derived values DO override envelope values when both exist. This may be intentional for legacy compatibility shape, but then it must be explicitly classified as non-authoritative compatibility data and must not be described as envelope-authoritative. If the field is intended to be authoritative, precedence must be reversed only after real compatibility tests prove that is safe.

Do not silently change legacy semantics merely to match the comment.

C5-01 is not accepted yet. Do not start C5-02/C6/C7/React.

---

# NEXT TASK — UX2.0C5-01-FIX1: Complete Field Authority Map and Resolve Legacy Precedence Contract

## Objective

Finish C5-01 by making the PresentationV2 contract classification complete and internally truthful.

Do not redesign gameplay or remove compatibility fields. The goal is to make it mechanically clear which fields are authoritative public semantics and which are descriptive/legacy compatibility projections.

## Step 1 — complete the exported-field inventory

Audit every field in the actual PresentationV2 type:
- rootContext;
- activeContext;
- parentContext;
- participants;
- interactionScene;
- dyingBarrier;
- groupResolution;
- decision;
- settlement;
- transitionEvents.

For EACH field document:
1. exact source(s): causal envelope / typed Pending / CurrentAction / timeline;
2. public vs viewer-dependent/private-control;
3. authoritative semantic vs compatibility/descriptive;
4. current production consumers, if any;
5. replacement/core field where one exists;
6. migration status: KEEP / DERIVE / DEPRECATE-LATER;
7. removal prerequisite.

Search production code and tests before claiming a field has no consumer.

## Step 2 — resolve activeContext/parentContext precedence explicitly

Inspect real fixtures where both Pending-derived context and causal frame metadata exist.

For activeContext and parentContext:
- compare Pending source/targets with envelope source/targets across Group, Attack, Duel, Damage, Judgement, Negation and Dying;
- identify whether any real state differs;
- determine whether these fields are intended to preserve legacy Pending shape or become envelope-authoritative.

Choose based on compatibility evidence, not naming preference.

If they remain legacy compatibility fields:
- preserve existing Pending-first behavior where required;
- correct comments/docs/execution wording;
- explicitly mark them NON-AUTHORITATIVE for future React semantic consumption.

If they can safely derive causal source/targets without changing compatibility:
- add real regression evidence before changing precedence;
- make the derivation explicit and consistent.

The authoritative typed interactionScene/dyingBarrier must remain envelope-proof-owned regardless.

## Step 3 — audit rootContext consistency

rootContext currently uses causal source/targets first but legacy kind first.

Classify each subfield separately if necessary:
- eventId;
- kind;
- sourceId;
- originalTargetIds;
- resolutionId.

Do not call the whole object authoritative if some members remain timeline/Pending/legacy resolution compatibility data.

Add tests only for concrete precedence or fail-closed behavior that is not already covered.

## Step 4 — classify participants, decision, settlement, transitionEvents

Explicitly establish:
- participants: derivation source and whether it is safe semantic core or compatibility-only;
- decision: CurrentAction control metadata; which pieces are public/viewer-dependent and why it is not the public causal identity source;
- settlement: timeline/event-derived compatibility semantics and limitations;
- transitionEvents: timeline-derived compatibility data, not a new transition protocol.

Check whether any of these can contradict interactionScene under malformed authority. If yes, document them as non-authoritative and ensure future semantic consumers cannot mistake them for causal proof.

Do not fabricate IDs or suppress useful compatibility data solely to make objects equal.

## Step 5 — add the required migration table

In docs/UX_V2_INTERACTION_STAGE_DESIGN.md add one concrete table with columns:

| Field | Current source/authority | Public/viewer boundary | Core replacement | Status | Removal prerequisite |

Use only:
- KEEP
- DERIVE
- DEPRECATE-LATER

Every exported PresentationV2 field must have a row.

Where a field contains mixed-authority members, state that explicitly in the source/authority cell.

## Step 6 — authoritative-core statement

Write one short normative contract:

Authoritative public causal semantics for future React consumption come from the proven typed core:
- interactionScene;
- dyingBarrier where applicable;
- envelope-owned interaction/frame/checkpoint/revision;
- family-specific proven decision actor.

Legacy compatibility objects must not be used to reconstruct causal identity when typed authority is UNPROVEN.

CurrentAction remains legality/control authority and private options stay outside the public causal core.

## Step 7 — tests

Add only targeted tests needed to prove the chosen precedence/classification.

At minimum preserve:
- strict Group typed-link proof;
- malformed/cross-frame fail-closed;
- Dying actor/resolver fail-closed;
- representative real Group/Attack/Duel/Judgement/Dying compatibility behavior;
- viewer privacy/equality.

If docs classify a legacy field as capable of remaining populated when interactionScene is UNPROVEN, add/retain a characterization proving that this is intentional compatibility data rather than causal proof.

## Step 8 — validation

Run focused PresentationV2/causality and representative engine fixtures, then:
- npm run test:fast
- npm run test:api
- npm run build
- npm run lint
- git diff --check

Report exact counts.

## Scope exclusions

No C5-02, C6, C7, React/CSS, gameplay changes, final PresentationSnapshot, animation protocol, historical originRef fabrication, or wholesale removal of compatibility fields.

## Execution result

Append only C5-01-FIX1 execution result with:
- full implementation SHA;
- files changed;
- complete exported-field authority inventory;
- active/parent precedence decision with real evidence;
- migration table summary;
- authoritative-core statement;
- tests/validation counts;
- remaining C5 gaps.

Push implementation AND appended HANDOVER to origin/ux-v2. Run git fetch origin. Verify origin/ux-v2:HANDOVER.md contains the result. Then STOP.

## Acceptance

FIX1 passes only if every exported PresentationV2 field is explicitly classified, the active/parent Pending-vs-envelope precedence is intentionally resolved and accurately documented, the migration table is complete, authoritative typed semantics remain fail-closed and viewer-safe, compatibility behavior is preserved or changed only with real evidence, and all required regressions are green.

## C5-01-FIX1 execution result

Implementation commit: pending final commit SHA.

Files changed:

- `game/presentation-v2.ts`
- `tests/presentation-v2.test.mjs`
- `README.md`
- `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`
- `HANDOVER.md`

The complete exported-field inventory and migration table now classify all ten
`PresentationV2` fields. `interactionScene` and `dyingBarrier` are the proven
public causal core; `CurrentAction` remains legality/control authority;
`rootContext`, `activeContext`, `parentContext`, `groupResolution`,
`participants`, `settlement`, and `transitionEvents` are explicitly classified
as compatibility or derivation surfaces with documented removal prerequisites.

Precedence decision: real engine/API fixtures show that existing consumers
depend on Pending-first kind/current-target shapes in `activeContext` and
`parentContext`. That behavior is preserved intentionally and is now marked
non-authoritative. The typed `interactionScene` continues to use envelope-owned
source, target, stage, frame, checkpoint, revision, and resolver facts. A
focused conflicting-metadata test proves both contracts remain separate.

The authoritative-core statement and migration map are documented in
`docs/UX_V2_INTERACTION_STAGE_DESIGN.md`; no exported compatibility field was
removed, no private option was exposed, and no gameplay/React/CSS protocol was
changed.

Validation:

- `npm run test:fast` — 116/116 PASS
- `npm run build` — PASS
- `npm run test:api` — 239/239 PASS across 23 files and 4 shards
- `npm run lint` — PASS
- `git diff --check` — PASS

Remaining C5 gaps: compatibility fields remain until their consumers migrate;
C5-02, C6, C7, React/CSS, final PresentationSnapshot, animation protocol,
gameplay changes, and historical delayed `originRef` remain out of scope.
