# WTK UX V2 — Current Task Handoff

## REMOTE HANDOVER RULE — MANDATORY

HANDOVER.md is tracked remote coordination state. It MUST be committed and pushed to origin/ux-v2. Never keep it local-only, ignore, untrack, revert, discard, or omit it. After implementation append the execution result, push implementation + HANDOVER, git fetch origin, verify origin/ux-v2:HANDOVER.md contains the result, then STOP.

**HANDOVER CLEANLINESS RULE:** This file contains only the current task. Previous tasks, reviewer verdicts, completion summaries, and historical execution results must be removed when the Planner writes the next task. Git history and architecture docs preserve history; HANDOVER does not.

Read and follow `docs/PLANNER_DEVELOPMENT_WORKFLOW.md`.

---

# NEXT TASK — UX2.0C6-02: Close the 23 Bounded Real-Evidence GAPs

## Objective

Close the remaining C6 verification gaps identified by the accepted truthful C6-01-FIX1 audit.

The accepted baseline is the 13-family × 10-column matrix in `docs/UX_V2_INTERACTION_STAGE_DESIGN.md` section `0.103`:
- 130 total cells;
- 107 explicitly proven;
- 23 GAP;
- 0 N/A.

This task is **evidence closure**, not semantic redesign. Prefer adding direct assertions to already-existing real Worker/D1/API paths. Do not change production gameplay or presentation authority merely to make the matrix green.

C6 may be declared ready for closure only if every applicable GAP is resolved by explicit real evidence, or a genuine architecture contradiction is reported to the reviewer.

## Authority and evidence rules

1. Keep the C6-01-FIX1 meaning of `P`: exact real engine/API fixture + explicit assertion for that exact invariant.
2. Do not disturb the existing 107 P cells except where a real contradiction is discovered.
3. Do not use synthetic happy paths as positive family evidence.
4. Do not infer a cell from a nearby assertion.
5. Do not create convenience fallbacks, weaken expected values, redefine a column, or alter gameplay.
6. CurrentAction remains private control/legality authority; it cannot create public semantic authority.
7. Pending-derived semantics require accepted causal linkage.
8. A repeated read must compare the same semantic checkpoint without mutation.
9. Checkpoint/revision evidence must distinguish `presentationRevision` from `actionRevision`; action-only changes do not prove semantic checkpoint progression.
10. Terminal/resume evidence must actually execute and assert the intended terminal clear or parent/root resume.
11. If a GAP exposes a genuine contradiction rather than missing assertions, follow the contradiction protocol and report it. Do not patch around it.

## Step 1 — lock the exact 23-GAP checklist

Before changing tests, use section `0.103` as the source of truth and create a working checklist for exactly these gaps:

- Attack / Dodge: `I,F,C,Q` (4)
- Attack -> Judgement -> Attack resume: `C,B,P` (3)
- Duel responder handoff: `C` (1)
- Group -> Negation -> resume: `C,T` (2)
- Group -> Damage -> Dying -> rescue -> resume: `V,P,Q` (3)
- independent/root Damage: `C` (1)
- delayed Lightning Judgement -> Damage: `P` (1)
- root Negation / counter-Negation: `V,P,Q,T` (4)
- standalone Judgement replacement: `C,T` (2)
- Borrowed Sword: `C,T` (2)

Total = 23.

Do not silently add/remove GAPs. If re-audit changes this set, explain the exact evidence/contradiction.

## Step 2 — close observation-only gaps first

Where the real fixture already traverses the needed state, add only direct assertions.

Priority:
- viewer equality `V`;
- private separation `P`;
- repeated read/reconnect `Q`;
- root/frame identity `I/F`;
- stableBoundary `B`.

For viewer equality compare the public typed objects directly:
- `interactionScene`;
- `participantRoles`;
- `stableBoundary`.

For privacy, explicitly show the acting viewer has the relevant private control/options and an uninvolved viewer does not, while public semantic objects remain equal.

## Step 3 — close checkpoint/revision gaps carefully

Affected families:
- Attack / Dodge;
- Attack -> Judgement -> Attack;
- Duel;
- Group -> Negation;
- independent/root Damage;
- standalone Judgement;
- Borrowed Sword.

For each:
- capture before/after causal envelope at meaningful semantic checkpoints already produced by the real flow;
- assert interaction/frame relationship;
- assert checkpointId/presentationRevision behavior exactly as production defines it;
- explicitly distinguish same semantic checkpoint + changed actionRevision from a true semantic checkpoint advance.

Do **not** manufacture a checkpoint solely for testing.

If production intentionally has no semantic checkpoint transition for the family-level scenario, document the real behavior and report the cell for reviewer decision rather than inventing one.

## Step 4 — close terminal/resume gaps by completing real flows

Affected:
- Group -> Negation -> resume;
- root Negation / counter-Negation;
- standalone Judgement replacement;
- Borrowed Sword.

Drive the existing real scenario far enough to prove the intended outcome.

Assert as applicable:
- resume returns to the expected parent/root interaction/frame;
- or terminal completion clears stale causal envelope/typed identity;
- resulting `stableBoundary` is identity-free REST unless another proven interaction immediately owns the room;
- legacy descriptive fields cannot resurrect typed causal identity.

Borrowed Sword may enter a subsequent Negation chain. Follow the real chain; do not bypass it with database mutation or a synthetic terminal state.

## Step 5 — close Group Damage -> Dying viewer/reconnect gaps

For the existing FIX15 lethal Group Damage -> Dying -> Peach rescue path add:
- acting versus uninvolved viewer deep equality for public typed scene/roles/boundary at the same Dying checkpoint;
- explicit private Peach/control separation;
- unchanged repeated read/reconnect proof for checkpointId, presentationRevision, interactionScene and stableBoundary.

Do not duplicate the Dying scenario if the existing FIX15 path can be extended.

## Step 6 — close Lightning privacy gap

In the existing delayed Lightning Judgement -> Damage real fixture:
- identify the actual acting viewer at the relevant decision checkpoint;
- prove its private CurrentAction/options;
- compare with an uninvolved viewer where those controls are absent;
- keep public scene/roles/boundary equal.

Do not expose private card/provider details into public semantics.

## Step 7 — update the evidence ledger only after tests prove it

Update section `0.103` cell-by-cell.

For every closed GAP:
- change GAP -> P only after the exact assertion exists;
- update the evidence ledger with exact test name, authoritative source and assertion relationship.

If any GAP remains, preserve it honestly and explain why.

Do not write an all-P table first and then attempt to justify it.

## Step 8 — C6 closure decision

At the end:
- if 130/130 are genuinely P, document C6 verification as ready for reviewer closure;
- if any GAP remains, document C6 as PARTIAL and list the exact remaining cells;
- if a real contradiction is found, prominently report it and do not claim closure.

Do not start C7 in this task.

## Step 9 — README

README must match the actual evidence state.

It may say C6 verification is complete/ready for reviewer closure only when the ledger supports it.

No PresentationSnapshot or UI migration claim.

## Validation

Run all changed focused real fixtures, then:
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
- change projector/orchestrator authority merely to satisfy a test;
- add synthetic positive fixtures;
- use direct DB mutation to fabricate positive terminal/checkpoint states;
- redefine P/GAP/N/A;
- remove reserved SETTLEMENT;
- perform unrelated refactors.

## Execution result

Append only the C6-02 result to this HANDOVER.

Include:
- full implementation SHA;
- files changed;
- starting GAP count = 23;
- exact closed GAP cells and the real fixture/assertion that closed each;
- final P/N/A/GAP counts out of 130;
- exact remaining GAPs or contradictions, if any;
- confirmation whether production code changed (expected: no; explain if unexpectedly necessary);
- focused and full validation counts;
- whether C6 is genuinely ready for reviewer closure.

Push implementation + appended HANDOVER to `origin/ux-v2`, fetch, verify remote HANDOVER contains the result, then STOP.

## Acceptance

C6-02 passes only if each claimed closure is backed by explicit real engine/API assertions, checkpoint/revision semantics are not confused with actionRevision, terminal/resume paths are actually executed, viewer/private/reconnect evidence is direct, the matrix remains truthful, no authority/gameplay shortcut is introduced, and any unresolved contradiction remains visible rather than being patched around.

## Execution result — UX2.0C6-02 evidence closure — 2026-10-03

Implementation SHA: `7a3a5ac3a9ef74c37bac3e484e89d7c46d32f697`.

Files changed:

- `README.md`
- `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`
- `tests/api/presentation-v2-engine.test.mjs`
- `tests/api/ma-chao.test.mjs`
- `tests/api/lobby-heroes-wei.test.mjs`
- `tests/api/borrowed-sword.test.mjs`
- `tests/api/stratagems.test.mjs`
- `HANDOVER.md`

Starting GAP count: 23.

Closed real GAP cells (21):

- Attack/Dodge: `I`, `F`, `Q` — the real engine-backed fixture now asserts
  causal-envelope identity, ROOT_FRAME relation, and repeated public identity.
- Attack -> Judgement -> Attack: `C`, `B`, `P` — the real Ma Chao Cavalry
  fixtures assert checkpoint/revision advance, `CHOICE`, and actor-private
  versus uninvolved controls.
- Duel: `C` — the real FIX9 ordinary Duel Negation fixture asserts the
  checkpoint/revision transition back to Duel.
- Group -> Negation: `C`, `T` — the real FIX9 fixture asserts the
  checkpoint/revision transition and executes authoritative responses through
  terminal clear/`REST`.
- Group -> Damage -> Dying: `V`, `P`, `Q` — the real FIX15 fixture asserts
  viewer-equal public state, Peach privacy, and repeated checkpoint/revision.
- delayed Lightning: `P` — the real Legacy fixture asserts private trigger
  controls for the acting viewer and empty controls for an uninvolved viewer.
- root Negation/counter: `V`, `P`, `Q`, `T` — the engine-backed fixture asserts
  public/private/repeated identity, while the real delayed Judgement
  Negation/counter fixture executes terminal clear/`REST`.
- standalone Judgement replacement: `C`, `T` — the real fixture asserts
  effective replacement checkpoint/revision advance and executes the resumed
  path through terminal clear/`REST`.
- Borrowed Sword: `C`, `T` — the real forced-Attack fixture asserts the
  refusal checkpoint/revision transition, and the real successful forced
  Attack fixture asserts terminal causal-envelope clear.

Final matrix: **128 P, 2 GAP, 0 N/A, 0 unclassified = 130 cells**.

Remaining GAPs:

- Attack/Dodge `C`: the exact real one-response fixture has one semantic
  response checkpoint and then settles, so it exposes no second semantic
  checkpoint transition to compare.
- independent/root Damage `C`: the exact real one-root Damage fixture repeats
  the same Damage checkpoint and settles, so it exposes no semantic checkpoint
  transition to compare.

No contradiction requiring production change was found. Production code did
not change; this pass added only direct assertions to existing real Worker/D1
fixtures and synchronized the evidence ledger and project documentation. No
synthetic positive fixture or direct database fabrication was used for positive
evidence.

Validation:

- changed real fixtures: **81/81 passed**;
- `npm run test:fast`: **124/124 passed**;
- `npm run test:api`: **239/239 passed**;
- `npm run build`: passed;
- `npm run lint`: passed;
- `git diff --check`: passed;
- matrix count: **13 rows, 130 cells, 128 P / 2 GAP / 0 N/A**.

C6 is **PARTIAL and not yet ready for reviewer closure** because the two
bounded checkpoint-progression GAPs remain visible. C7 remains out of scope.
