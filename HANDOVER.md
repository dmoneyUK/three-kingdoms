# WTK UX V2 — Current Task Handoff

## REMOTE HANDOVER RULE — MANDATORY

HANDOVER.md is tracked remote coordination state. It MUST be committed and pushed to origin/ux-v2. Never keep it local-only, ignore, untrack, revert, discard, or omit it. After implementation append the execution result, push implementation + HANDOVER, git fetch origin, verify origin/ux-v2:HANDOVER.md contains the result, then STOP.

**HANDOVER CLEANLINESS RULE:** This file contains only the current task. Previous tasks, reviewer verdicts, completion summaries, and historical execution results must be removed when the Planner writes the next task. Git history and architecture docs preserve history; HANDOVER does not.

---

# NEXT TASK — UX2.0C6-01-FIX1: Make the C6 Evidence Matrix Truthful Cell-by-Cell

## Objective

The C6 implementation commit `d63386eeedfe5618b011d67efeac3ce818777e88` added useful real engine/API assertions and did not introduce production/gameplay/UI scope creep, but C6-01 is **PARTIAL** because the documentation/evidence matrix overclaims proof.

The current section `0.103` marks **every one of the 13 families as P in every one of the 10 invariant columns**. That is not supported by the mapped fixtures. The task required each cell to be backed by an explicit assertion, and required honest N/A/GAP values.

Concrete examples already found by reviewer:
- **Attack / Dodge** is mapped to one response checkpoint plus settlement. It proves public roles/boundary/viewer privacy and terminal REST, but the mapped test does not explicitly prove every claimed checkpoint/revision progression invariant across multiple semantic checkpoints.
- **Borrowed Sword** proves the forced-Attack choice, viewer/reconnect stability and timer barrier, but the mapped fixture shown does not execute the interaction through a terminal clear/resume; therefore its current `T = P` claim is not justified by that fixture.
- The matrix text says N/A cells exist, but the actual table contains no N/A cells.
- The required evidence ledger format was `family/checkpoint -> exact real fixture/test -> authoritative production source -> explicit assertion(s) -> PASS/N/A/GAP`; the current all-P matrix does not provide that cell-level traceability.

Do not solve this by weakening the meaning of P.

## Authoritative rules

Read and follow `docs/PLANNER_DEVELOPMENT_WORKFLOW.md`.

For this FIX specifically:

1. `P` means a real engine/API fixture contains an explicit assertion that proves that exact cell.
2. A nearby assertion, a generally green fixture, or an inferred consequence does not count.
3. `N/A` means the invariant genuinely does not apply to that family/checkpoint and must include a short reason.
4. `GAP` means the invariant should apply but no real fixture currently proves it, or real behavior contradicts the accepted contract.
5. Do not change expected values, add heuristics, or alter gameplay to eliminate GAP.
6. Synthetic projector tests may support malformed/fail-closed guards but cannot provide positive P evidence for a real family.
7. Do not mark a whole family P because another fixture elsewhere happens to test the same mechanism. Every P cell must cite the exact real fixture/assertion used for that cell.
8. If adding a missing assertion to an existing real fixture is small and observes already-accepted behavior, do that rather than leaving an avoidable GAP.
9. If proving a cell would require a new semantic rule, production behavior change, or large new scenario, leave GAP and report it.

## Step 1 — audit all 130 cells

Audit 13 required families × 10 invariant columns.

For each current P:
- locate the exact assertion(s);
- decide P / N/A / GAP;
- record the exact fixture/test;
- record the authoritative production source being observed;
- record what relationship/value is explicitly asserted.

Do not begin by assuming the existing table is correct.

## Step 2 — correct the matrix

Update `docs/UX_V2_INTERACTION_STAGE_DESIGN.md` section `0.103`.

The table must honestly contain P/N/A/GAP.

Do not claim that N/A exists only in prose while the table shows P.

For compactness, a cell may use a short evidence key such as `P[A3]`; define each evidence key immediately below the table with:
- exact test file + test name;
- authoritative source;
- explicit assertion/relationship.

The documentation must make it possible for the reviewer to trace every P without guessing.

## Step 3 — fill small evidence holes where appropriate

Add assertions to existing real fixtures only when the production path is already present and the assertion directly observes accepted C1-C5 semantics.

Pay particular attention to:
- checkpointId/presentationRevision progression versus same-checkpoint repeated reads;
- SAME_FRAME versus CHILD_FRAME relationships;
- parent resume;
- viewer equality of `interactionScene`, `participantRoles`, and `stableBoundary`;
- private CurrentAction/options separation;
- repeated-read/reconnect identity stability;
- terminal clear versus resume.

Do not create artificial state transitions just to turn cells green.

## Step 4 — explicitly resolve the reviewer examples

At minimum, re-audit and correct:
- Attack / Dodge column C;
- Borrowed Sword column T;
- all claimed N/A cells.

If a real existing path can cheaply prove the missing invariant, add the assertion. Otherwise mark GAP/N/A truthfully.

## Step 5 — re-audit required special flows

Explicitly verify the matrix evidence for:
- Attack -> Judgement -> Attack resume;
- Group -> Negation -> resume;
- Group -> Damage child -> resume;
- Group -> Damage -> Dying -> rescue -> resume;
- delayed Lightning Judgement -> Damage.

For each, the evidence must distinguish SAME_FRAME/CHILD_FRAME and prove the expected resume relationship where applicable.

## Step 6 — stableBoundary and SETTLEMENT

Keep the accepted rule:
- CHOICE only from proven blocker;
- SPECIAL only from accepted persistent special;
- REST when cleared/non-blocking;
- SETTLEMENT remains reserved and is not manufactured from legacy finalResult/control metadata.

The synthetic SETTLEMENT guard may remain as negative evidence, but it is not positive engine-family evidence.

## Step 7 — decide whether C6 has real gaps

After the truthful audit:
- if all required applicable cells are P and only genuine N/A cells remain, state that clearly;
- if any required applicable cell remains GAP, do **not** claim C6 closure. Report the exact gap for reviewer.

Do not hide a GAP by changing the column interpretation.

## Step 8 — README

README may say C6 verification is complete only if the corrected evidence ledger supports that conclusion.

Otherwise describe C6 as verification in progress with the exact bounded gap.

No C7/UI claim.

## Validation

Run the exact focused fixtures changed by FIX1, then:
- `npm run test:fast`
- `npm run test:api`
- `npm run build`
- `npm run lint`
- `git diff --check`

Report exact counts.

## Scope exclusions

Do not:
- start C7;
- create PresentationSnapshot;
- modify React/CSS;
- change gameplay;
- redesign causal semantics;
- add a fallback/heuristic to make evidence green;
- redefine P to mean indirect/inferred coverage;
- remove reserved SETTLEMENT;
- perform unrelated refactors.

## Execution result

Append only the C6-01-FIX1 execution result to this HANDOVER.

Include:
- full implementation SHA;
- files changed;
- count of audited cells: 130;
- final P/N/A/GAP counts;
- exact list/reasons for every N/A and GAP;
- which previously overclaimed P cells were corrected;
- which real fixtures gained assertions;
- confirmation that each P is traceable to exact real evidence;
- exact validation counts;
- whether C6 is genuinely ready for closure.

Push implementation + appended HANDOVER to `origin/ux-v2`, fetch, verify remote HANDOVER contains the result, then STOP.

## Acceptance

FIX1 passes only if the 13 × 10 matrix is truthful cell-by-cell, every P is traceable to an explicit real engine/API assertion, N/A/GAP are used honestly, the reviewer examples are resolved, no synthetic happy path is used as positive proof, no gameplay/authority shortcut is introduced, and documentation/README no longer claim more than the evidence proves.
