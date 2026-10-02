# WTK UX V2 — Current Task Handoff

## REMOTE HANDOVER RULE — MANDATORY

HANDOVER.md is tracked remote coordination state. It MUST be committed and pushed to origin/ux-v2. Never keep it local-only, ignore, untrack, revert, discard, or omit it. After implementation append the execution result, push implementation + HANDOVER, git fetch origin, verify origin/ux-v2:HANDOVER.md contains the result, then STOP.

## Reviewer status

UX2.0C5-03-FIX1 implementation `02846df937f225389469993468a46282cdacee68` is **ACCEPTED**.

C5-03 is CLOSED / ACCEPTED.

C5 PresentationV2 projector migration is now CLOSED / ACCEPTED for its defined pre-C6 scope.

Verified closure:
- stableBoundary is public, typed and fail-closed;
- CHOICE comes only from proven semantic decision authority;
- SETTLEMENT remains reserved because current production state has no durable viewer-independent settlement occurrence proof;
- legacy settlement may remain viewer/control-selected descriptive compatibility data but cannot influence stableBoundary;
- Borrowed Sword SPECIAL requires Pending causal interaction/frame linkage to the proven scene;
- Judgement SPECIAL and nested Damage CHILD_FRAME SPECIAL are scene-owned;
- malformed/unlinked metadata falls back to identity-free REST;
- CurrentAction does not establish public stable-boundary semantics;
- settlement and transitionEvents remain explicitly bounded compatibility surfaces for later C7 migration;
- reported validation is green: focused 50/50, fast 123/123, API 238/238, build/lint/diff-check PASS.

Do not start React/CSS. C6 is the next architecture stage.

---

# NEXT TASK — UX2.0C6-01: Engine-Backed Presentation Architecture Invariant Matrix

## Objective

Turn the accepted C1-C5 presentation semantics into an engine-backed architecture regression matrix before C7 creates the final PresentationSnapshot.

This task is primarily characterization and invariant testing. Do not redesign PresentationV2 merely to make tests convenient.

The matrix must prove that real game flows preserve:
- causal identity;
- frame/checkpoint continuity;
- participant roles;
- stable-boundary classification;
- viewer equality/privacy;
- reconnect/repeated-read stability;
- child-frame/resume semantics;
- fail-closed behavior.

No React/CSS and no final PresentationSnapshot.

## Step 1 — define the C6 invariant matrix

Create a concise documented matrix with rows for real interaction families and columns for the invariants below.

Required families:
- Attack / Dodge;
- Attack -> Judgement -> Attack resume;
- Duel responder handoff;
- Group/AOE normal participant progression;
- Group -> Negation -> resume;
- Group -> Damage child -> resume;
- Group -> Damage -> Dying -> rescue -> resume;
- independent/root Damage;
- delayed Lightning Judgement -> Damage;
- root Negation / counter-Negation;
- standalone Judgement replacement;
- Dying rescue handoff;
- Borrowed Sword.

Required invariant columns:
1. interaction identity continuity;
2. root/active/parent frame relation;
3. checkpoint/revision progression;
4. source/original target/current participant;
5. decision actor/active resolver;
6. stableBoundary kind;
7. viewer public equality;
8. private control separation;
9. repeated-read/reconnect stability;
10. terminal clear/resume behavior.

For non-applicable cells state N/A; do not invent behavior.

## Step 2 — map each matrix row to real fixtures

Prefer existing engine/API tests. For every row identify the exact test file/test case providing evidence.

If an existing fixture already proves an invariant, add only the missing assertion rather than duplicating setup.

Synthetic projector tests do not count as the primary evidence for a real family.

## Step 3 — causal identity and checkpoint assertions

For each applicable real flow assert:
- interactionId remains stable within one causal interaction;
- child frame gets a distinct frameId only where CHILD_FRAME is intended;
- parentFrameId is correct;
- checkpointId and presentationRevision change only at semantic checkpoints already defined by the engine;
- SAME_FRAME flows do not accidentally create child frames;
- resume returns to the expected parent/root frame.

Do not require exact generated ID strings; compare relationships and before/after identity.

## Step 4 — participant and decision assertions

For each row assert the accepted typed public roles:
- sourceId;
- originalTargetIds;
- activeTargetIds;
- currentParticipantId where applicable;
- decisionActorId;
- activeResolverId;
- parentParticipantId/participantIds where applicable.

Unsupported roles must be null/empty.

Do not reconstruct roles in the test from legacy Pending heuristics and then compare them to themselves; use known fixture actors/targets.

## Step 5 — stableBoundary assertions

For every meaningful checkpoint assert the expected public boundary:
- CHOICE only for proven blocker;
- SPECIAL only for accepted persistent special contexts;
- REST for cleared/non-blocking unsupported contexts;
- SETTLEMENT is currently reserved and must not appear from legacy finalResult/control metadata.

Add a repository-wide C6 assertion/search-backed test or focused projector guard ensuring current production fixtures do not unexpectedly emit SETTLEMENT.

Do not remove SETTLEMENT from the type.

## Step 6 — viewer equality and privacy

For at least Attack, Duel, Group, Negation, Judgement, Dying and Borrowed Sword:
- compare interactionScene, participantRoles and stableBoundary across acting and uninvolved viewers;
- assert deep equality of public semantics;
- where CurrentAction/options differ, explicitly assert that difference remains outside the public semantic objects.

Do not expose private hand/card/provider/legal-option data.

## Step 7 — reconnect/repeated-read stability

For at least Attack, Group child/resume, Duel, Judgement and Dying:
- read the same checkpoint twice without mutation;
- assert interactionScene and stableBoundary deep-equal;
- assert checkpointId/presentationRevision unchanged;
- assert projection creates no new IDs.

Where existing API fixture can simulate another viewer/reconnect, use it.

## Step 8 — child-frame and resume matrix

Give extra coverage to:
- Group -> Damage;
- Group -> Damage -> Dying;
- Attack -> Judgement;
- Lightning Judgement -> Damage.

Explicitly prove which are SAME_FRAME vs CHILD_FRAME and what resumes afterward.

Do not normalize these families into one model if production semantics intentionally differ.

## Step 9 — terminal clearing

For representative Attack, Duel, Group and Dying completion:
- prove stale interaction/frame/checkpoint identity is not retained after the causal interaction clears;
- stableBoundary is identity-free REST unless another proven interaction immediately owns the room;
- legacy settlement/transitionEvents may remain descriptive but cannot restore typed causal identity.

## Step 10 — malformed/fail-closed architecture cases

Keep focused malformed tests for:
- checkpoint/active mismatch;
- missing frame;
- Group typed-link mismatch;
- Dying actor/resolver mismatch;
- unlinked Borrowed Sword Pending;
- viewer-control-selected finalResult.

These may remain synthetic because they characterize invalid states.

Assert malformed compatibility data never upgrades typed public semantics.

## Step 11 — identify architecture gaps, do not silently fix them

If a real engine fixture contradicts the accepted C1-C5 model:
- stop treating that row as proven;
- document the exact mismatch;
- make the smallest production fix only if it is clearly a projector/orchestrator defect within accepted semantics;
- otherwise report the gap for reviewer follow-up.

Do not change gameplay to satisfy the matrix.

## Step 12 — documentation

Add a C6 section to the interaction-stage design doc containing:
- the invariant matrix;
- exact fixture references;
- any N/A cells;
- any remaining architecture gaps;
- explicit statement that C6 is verification before C7, not PresentationSnapshot implementation.

README should state current C6 verification stage without claiming UI migration has begun.

## Step 13 — validation

Run the focused matrix fixtures first, then:
- npm run test:fast
- npm run test:api
- npm run build
- npm run lint
- git diff --check

Report exact test counts and any skipped/N/A matrix cells.

## Scope exclusions

Do not:
- start C7;
- create PresentationSnapshot;
- modify React/CSS;
- redesign gameplay;
- add animation timing/direction;
- add durable transition occurrence IDs;
- fabricate historical originRef;
- expose private CurrentAction options;
- remove legacy compatibility fields wholesale.

## Execution result

Append only C6-01 execution result with:
- full implementation SHA;
- files changed;
- completed invariant matrix summary;
- exact real fixture mapping;
- gaps/N/A cells;
- any production change and why;
- viewer/reconnect evidence;
- terminal/fail-closed evidence;
- exact validation counts;
- whether C6-01 is ready for reviewer acceptance.

Push implementation AND appended HANDOVER to origin/ux-v2. Run git fetch origin. Verify origin/ux-v2:HANDOVER.md contains the result. Then STOP.

## Acceptance

C6-01 passes only if every required real interaction family is mapped to engine/API evidence, the matrix proves the accepted causal/participant/boundary invariants without relying on synthetic happy paths, public semantics are viewer-stable and privacy-safe, reconnect/repeated reads are stable, child/resume relationships are explicit, terminal clearing is proven, malformed states fail closed, and all required regressions are green.
