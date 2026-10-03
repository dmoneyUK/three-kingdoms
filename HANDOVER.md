# WTK UX V2 — Current Task Handoff

## REMOTE HANDOVER RULE — MANDATORY

HANDOVER.md is tracked remote coordination state. It MUST be committed and pushed to origin/ux-v2. Never keep it local-only, ignore, untrack, revert, discard, or omit it. After implementation append the execution result, push implementation + HANDOVER, git fetch origin, verify origin/ux-v2:HANDOVER.md contains the result, then STOP.

**HANDOVER CLEANLINESS RULE:** This file contains only the current task. Previous tasks, reviewer verdicts, completion summaries, and historical execution results must be removed when the Planner writes the next task. Git history and architecture docs preserve history; HANDOVER does not.

---

# NEXT TASK — UX2.0C6-01: Engine-Backed Presentation Architecture Invariant Matrix

## AUTHORITATIVE IMPLEMENTATION RULES — APPLY BEFORE CODING

These rules are mandatory for C6 and should be treated as the default standard for later semantic/presentation tasks unless a future HANDOVER explicitly overrides one.

1. **Correlation is not authority.** Do not infer a public semantic fact merely because some field usually accompanies it.
2. **Name the proof source.** Every asserted semantic field/invariant must identify the exact authoritative production source that proves it.
3. **CurrentAction is control/legality authority, not public semantic authority**, unless this HANDOVER explicitly grants a narrowly defined exception.
4. **Timeline/eventId/resolutionId/finalResult/actionRevision are descriptive or compatibility data**, not causal identity or public semantic proof unless an accepted contract explicitly proves otherwise.
5. **Pending-derived semantics require causal linkage.** Validate the Pending interactionId/frameId (and any family-specific ownership requirement) against the already-proven scene before using Pending metadata as semantic evidence.
6. **Never fill an unknown semantic value with a convenience fallback.** Missing proof must remain null, empty, UNPROVEN, REST, or N/A as appropriate.
7. **Fail closed.** Malformed, contradictory, stale, viewer-only, or incompletely linked data must not upgrade public semantics.
8. **Positive claims require real engine/API evidence.** Synthetic tests may supplement malformed/negative/impossible-state coverage but do not count as the primary proof of a real interaction family's positive semantics.
9. **A green existing fixture is not evidence unless it explicitly asserts the new invariant.** Add the missing assertion instead of citing the test by existence.
10. **Inventory all affected production paths before changing a transition invariant.** If a semantic invariant can be reached through multiple write/resume/skip/timeout/continuation paths, enumerate them and ensure all paths preserve the same invariant.
11. **Do not change gameplay to satisfy presentation architecture.** Presentation tests characterize existing accepted game behavior.
12. **Do not force requested semantics to exist.** If the production architecture cannot prove a proposed state/role/relation, report it as unsupported/N/A/reserved rather than manufacturing authority.

## EVIDENCE LEDGER — REQUIRED OUTPUT

Before implementation is considered complete, maintain a concise evidence ledger for every required C6 matrix row.

Each row must identify:

`family/checkpoint -> exact real fixture/test -> authoritative production source -> explicit assertion(s) -> PASS / N/A / GAP`

Rules:
- PASS requires an explicit assertion of the C6 invariant, not merely a passing fixture.
- N/A requires a short reason grounded in production behavior.
- GAP means the real fixture contradicts or cannot prove the accepted model.
- Synthetic positive happy paths cannot convert GAP to PASS.
- The execution result must summarize the ledger and list every GAP/N/A explicitly.

## CONTRADICTION PROTOCOL — DO NOT PATCH AROUND EVIDENCE

If a real engine/API fixture contradicts accepted C1-C5 semantics:

1. Mark that matrix row/cell GAP.
2. Identify the exact observed production state and the accepted invariant it contradicts.
3. Do **not** weaken the assertion, change the expected value, add a fallback/heuristic, reclassify authority, or alter gameplay merely to make the matrix green.
4. A production change is allowed only when the defect is clearly inside the already-accepted presentation projector/orchestrator contract and the smallest fix preserves existing gameplay.
5. If the correct fix would require a new semantic rule, causal model change, gameplay change, or ambiguous design decision, do not implement it. Report the GAP for reviewer follow-up.
6. Continue independent matrix rows when safe; do not claim C6 closure while a required GAP remains.

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

---

## Execution result — UX2.0C6-01 CI preflight test correction — 2026-10-02

Implementation commit: `93223a39404c50e53d322ea177e835362251c3ae`.
The execution result and documentation are included in that commit.

Changed files: `tests/api/ma-chao.test.mjs`, `README.md`, and `HANDOVER.md`.

The first C6 preflight exposed a stale assertion in the real Ma Chao Cavalry
Attack -> Judgement fixture. The source-owned `attack_targeted_event` trigger
does not establish public semantic decision authority at the initial
`ATTACK_RESPONSE` checkpoint because the authoritative causal frame resolves
the target. The test now explicitly asserts `decisionActorId: null` and
`activeResolverId: target.id`. This preserves the C5 proof rule: Pending actor
and causal `resolvingPlayerId` must agree before a public decision actor or
`CHOICE` boundary is emitted; CurrentAction ownership is not promoted into
public identity.

No production gameplay, orchestrator, projector, React/CSS, or
PresentationSnapshot code changed. No C6 matrix row is claimed complete by
this preflight; the full engine-backed invariant matrix remains the next task.

Evidence ledger impact: Attack -> Judgement -> Attack resume now has a green
real API assertion for the initial participant-role authority boundary; the
remaining C6 identity, checkpoint, viewer, reconnect, child/resume, terminal,
and malformed-state rows remain to be audited under the task above.

Validation: focused `tests/api/ma-chao.test.mjs` passed 10/10; `npm test`
passed build, fast 123/123, and API 239/239 across 23 files and 4 shards;
`npm run lint` and `git diff --check` passed. C6-01 remains open and is not
ready for reviewer acceptance.

---

## Execution result — UX2.0C6-01 engine-backed invariant matrix — 2026-10-03

Implementation commit: `d63386e` (the source/docs commit immediately before
this handover-result correction).

Changed files:
`tests/api/presentation-v2-engine.test.mjs`,
`tests/api/lobby-heroes-wei.test.mjs`,
`tests/presentation-v2.test.mjs`, `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`,
and `README.md`. No production gameplay, API route, React/CSS, or
PresentationSnapshot code changed.

The C6 matrix is complete for all required real families: Attack/Dodge;
Attack -> Judgement -> Attack resume; Duel responder handoff; Group/AOE
progression; Group -> Negation -> resume; Group -> Damage child -> resume;
Group -> Damage -> Dying -> rescue -> resume; independent/root Damage; delayed
Lightning Judgement -> Damage; root Negation/counter-Negation; standalone
Judgement replacement; Dying rescue handoff; and Borrowed Sword. The design
doc section `0.103` maps every row to the exact Worker/D1/API test case and
records the ten required invariant columns.

Evidence now explicitly covers stable Interaction identity, ROOT/SAME/CHILD
frame relations, parent-frame resume, semantic checkpoint/revision changes,
typed source/target/current-participant roles, decision actor versus active
resolver, and CHOICE/SPECIAL/REST boundary classification. Acting and
uninvolved viewers are compared for Attack, Duel, Group, Negation, Judgement,
Dying, Borrowed Sword, root Damage, and delayed Lightning. Repeated reads,
reconnects, timer barriers, private control/options separation, and terminal
clearing are asserted on real paths. Malformed checkpoint/frame/linkage,
Dying resolver, Judgement, Duel/Group, and unlinked Borrowed Sword authority
remain fail-closed; `SETTLEMENT` is guarded as reserved and is never emitted
from final-result or viewer-control metadata.

N/A boundaries are limited to roles that have no applicable parent or ordered
participant in a root/standalone flow; those values are asserted null/empty.
There are no remaining required-family architecture GAPs. C7,
`PresentationSnapshot`, UI migration, animation semantics, durable transition
occurrence IDs, and gameplay changes remain explicitly out of scope.

Validation: focused C6 real API shard passed 239/239 across 23 files and 4
shards; `npm run test:fast` passed 124/124 across 15 files; `npm run build`
passed; `npm run lint` passed; `git diff --check` passed. C6-01 is ready for
reviewer acceptance. The final handover-result correction is documentation-only
and must be pushed together with the implementation commit to `origin/ux-v2`.
