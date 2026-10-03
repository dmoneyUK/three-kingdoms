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

## Execution result — UX2.0C6-01-FIX1 truthful evidence audit — 2026-10-03

Implementation SHA: `eb530e1` (`docs: make UX2 C6 evidence matrix truthful`).

Files changed:

- `README.md`
- `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`
- `tests/api/presentation-v2-engine.test.mjs`
- `HANDOVER.md`

Audit result: 13 required interaction families × 10 columns = 130 cells;
**107 P, 0 N/A, 23 GAP, 0 unclassified**. No N/A is claimed: every required
column applies at the family level, so missing explicit evidence is GAP.

Exact GAP cells and reasons:

- Attack / Dodge — `I,F,C,Q`: the mapped fixture proves one response
  checkpoint and settlement, but not multi-checkpoint/frame relations or an
  unchanged repeated read.
- Attack -> Judgement -> Attack — `C,B,P`: the mapped Ma Chao fixtures do
  not explicitly prove checkpoint progression, `stableBoundary`, and private
  control separation together.
- Duel responder handoff — `C`: the real handoff changes `actionRevision`
  while retaining the same causal checkpoint; it does not prove a complete
  checkpoint/revision transition contract.
- Group -> Negation -> resume — `C,T`: the mapped same-frame tests do not
  explicitly assert checkpoint/revision progression or terminal clear after
  Group resumes.
- Group -> Damage -> Dying -> rescue -> resume — `V,P,Q`: FIX15 does not
  explicitly compare two viewers, private `CurrentAction` options, or an
  unchanged reconnect read at the Dying checkpoint.
- independent/root Damage — `C`: the one-root fixture does not assert a
  semantic checkpoint/revision transition.
- delayed Lightning Judgement -> Damage — `P`: the fixture does not
  explicitly compare private `CurrentAction`/options at that checkpoint.
- root Negation / counter-Negation — `V,P,Q,T`: the fixture lacks explicit
  viewer equality, private control separation, repeated-read identity, and
  terminal clear after counter response.
- standalone Judgement replacement — `C,T`: the fixture does not explicitly
  assert checkpoint/revision progression or final delayed-effect clear.
- Borrowed Sword — `C,T`: the forced-Attack fixture does not compare a
  before/after semantic checkpoint revision and reaches a subsequent
  Negation chain after decline without driving it to terminal clear.

Previously overclaimed P cells corrected: the prior all-P matrix is replaced
by the 107/23 cell-level result; specifically Attack/Dodge `C`, Duel `C`, and
Borrowed Sword `T` are no longer overclaimed, and the prose/table mismatch for
N/A is removed. The design ledger also records every remaining GAP above.

Real fixture assertions added in this FIX1: the Borrowed Sword Worker/D1
fixture now asserts the private forced-Attack response control, proven
`CHILD_FRAME` scene and parent frame, and the live decline response. Existing
real C6 assertions for viewer/reconnect equality, repeated reads, frame
relations, and stable boundaries remain mapped in section `0.103`; no
synthetic happy path is used as positive family evidence.

Traceability: every P cell is mapped in section `0.103` to an exact real test
name/file and authoritative production sources S1-S5 (`rooms.pending_json`,
`causal_envelope_json`, causal-envelope transitions, room writes, the
presentation projector, and viewer-specific `CurrentAction` projection).
Synthetic malformed/SETTLEMENT fixtures remain negative fail-closed evidence
only.

Validation:

- focused `presentation-v2-engine.test.mjs`: **24/24 passed**;
- `npm run test:fast`: **124/124 passed** across 15 files;
- `npm run test:api`: **239/239 passed** across 23 files;
- `npm run build`: passed;
- `npm run lint`: passed;
- `git diff --check`: passed.

Readiness: C6 is **PARTIAL**, not ready for closure, because 23 applicable
cells remain GAP. C7, PresentationSnapshot, React/CSS migration, gameplay
changes, and unrelated refactors remain out of scope.
