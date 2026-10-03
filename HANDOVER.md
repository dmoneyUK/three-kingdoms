# WTK UX V2 — Current Task Handoff

## REMOTE HANDOVER RULE — MANDATORY

HANDOVER.md is tracked remote coordination state. It MUST be committed and pushed to origin/ux-v2. Never keep it local-only, ignore, untrack, revert, discard, or omit it. After implementation append the execution result, push implementation + HANDOVER, git fetch origin, verify origin/ux-v2:HANDOVER.md contains the result, then STOP.

**HANDOVER CLEANLINESS RULE:** This file contains only the current task. Previous tasks, reviewer verdicts, completion summaries, and historical execution results must be removed when the Planner writes the next task. Git history and architecture docs preserve history; HANDOVER does not.

Read and follow `docs/PLANNER_DEVELOPMENT_WORKFLOW.md`.

---

# NEXT TASK — UX2.0C6-03: Classify Non-Transition Checkpoint Cases and Close C6 Documentation

## Objective

Resolve the final two C6 matrix cells without inventing semantic checkpoints.

C6-02 implementation `7a3a5ac3a9ef74c37bac3e484e89d7c46d32f697` is accepted as evidence work. It closed 21 of the 23 bounded gaps with direct real Worker/D1/API assertions and made no production/gameplay changes.

Two cells remain:
- Attack / Dodge — column `C`
- independent/root Damage — column `C`

Reviewer decision: these are **not missing production evidence that should be forced into a second checkpoint**. In the mapped real scenarios each interaction has one meaningful semantic checkpoint, repeated reads preserve its checkpointId/presentationRevision, and then the interaction settles/clears. There is no second in-interaction semantic checkpoint whose progression can legitimately be asserted.

Therefore, for the matrix column specifically defined as **checkpoint/revision progression**, these two cells are genuine **N/A (no semantic transition exists in this scenario)**, not GAP.

This is an application of the standing rule: do not force a requested semantic state to exist merely to make a matrix green.

This task is documentation/closure only. Do not add a fake checkpoint and do not modify production code.

## Step 1 — update the matrix truthfully

In `docs/UX_V2_INTERACTION_STAGE_DESIGN.md` section `0.103`:

- Attack / Dodge `C`: change `GAP` -> `N/A`.
- independent/root Damage `C`: change `GAP` -> `N/A`.

Final count must be:

- **128 P**
- **2 N/A**
- **0 GAP**
- **0 unclassified**
- total **130**

Do not change any of the existing 128 P cells.

## Step 2 — define why N/A is correct

Update the section text/ledger so `C` remains a strict invariant and is not weakened.

For these two rows state explicitly:

- the real fixture exposes exactly one semantic checkpoint;
- repeated reads at that checkpoint preserve checkpointId and presentationRevision;
- terminal settlement clears the causal identity;
- no second meaningful semantic checkpoint exists inside that interaction;
- therefore “checkpoint/revision progression between semantic checkpoints” is not applicable;
- this does **not** mean checkpoint behavior is untested: stability is covered by `Q`, terminal clearing by `T`.

Do not redefine `C` to include Q/T merely to call it P.

## Step 3 — close C6 in documentation

Update the C6 section to state that the architecture invariant matrix is complete:

- 128 applicable cells explicitly proven;
- 2 genuine N/A progression cells;
- 0 GAP;
- no production contradiction found;
- C6 verification is ready for reviewer closure.

Do not claim C7 has started.

## Step 4 — update README

README should state:

- C6 engine-backed architecture verification is complete/ready for reviewer closure;
- final matrix = 128 P / 2 N/A / 0 GAP;
- the two N/A cells are single-checkpoint flows, not missing evidence;
- no PresentationSnapshot or React/UI migration has started.

## Step 5 — no unnecessary code/test changes

Expected changed files:
- `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`
- `README.md`
- `HANDOVER.md`

Do not modify engine, projector, API gameplay code, React/CSS, or tests unless a documentation validation failure requires a trivial non-semantic correction. If any unexpected code/test change seems necessary, STOP and report it instead.

## Validation

Run:
- `npm run build`
- `npm run lint`
- `git diff --check`

The C6-02 test evidence is already accepted; do not create new fixtures merely to turn N/A into P.

## Scope exclusions

Do not:
- create a second checkpoint for Attack/Dodge or root Damage;
- alter checkpoint/revision semantics;
- change gameplay;
- change PresentationV2 authority;
- start C7;
- create PresentationSnapshot;
- modify React/CSS;
- add synthetic positive evidence;
- reclassify any other matrix cell;
- perform unrelated refactors.

## Execution result

Append only the C6-03 result to this HANDOVER.

Include:
- full implementation SHA;
- files changed;
- final matrix count 128 P / 2 N/A / 0 GAP / 130;
- exact N/A reasons for the two cells;
- confirmation no production/test semantic changes were made;
- build/lint/diff-check result;
- whether C6 documentation is ready for reviewer closure.

Push the documentation + appended HANDOVER to `origin/ux-v2`, fetch, verify remote HANDOVER contains the result, then STOP.

## Acceptance

C6-03 passes only if the two non-transition cases are represented honestly as N/A without weakening the checkpoint invariant, the final matrix is internally consistent, C6 documentation/README no longer claim unresolved GAPs, no semantic checkpoint is fabricated, and no C7/UI work begins.
