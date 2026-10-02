# WTK UX V2 — Current Task Handoff

## REMOTE HANDOVER RULE — MANDATORY

HANDOVER.md is a tracked remote coordination file. It MUST be committed and pushed to origin/ux-v2. Do not keep it local-only, gitignore it, untrack it, revert it, discard it, or omit it. After implementation, append the execution result, commit/push to origin/ux-v2, run git fetch origin, verify origin/ux-v2:HANDOVER.md contains the result, then STOP.

## Reviewer status

UX2.0C4-01-FIX1 implementation 8f55dba4fdf12566ea7adea58502391285541e99 is **PARTIAL — FIX2 REQUIRED**.

Accepted:
- nextDyingResponder correctly centralizes semantic eligibility scanning with responseDecisionFor;
- startDyingRescue now selects a real blocker before the first stable DYING checkpoint;
- expireDyingRescue selects the next real blocker before publishing it;
- shared dyingDecisionProof correctly adds Pending causal + active resolver coherence;
- dyingBarrier and interactionScene now share fail-closed decision-actor proof;
- malformed actor/resolver mismatch coverage is improved.

Blocking defect 1 — skip_rescue still has the exact transient persistence window FIX1 was asked to remove.

In the live give_peach/skip_rescue handler, after claiming phase=resolving, the no-Peach branch still does:

- build nextPending from pending.remainingIds[0];
- UPDATE rooms SET phase='dying', pending_json=nextPending;
- only then await advanceDyingRescue(room.id).

That write does not update the causal envelope in the same operation. A concurrent GET can therefore observe Pending actor B while the envelope/checkpoint/resolver still belongs to rescuer A. The strengthened projector now fails closed for this state, which prevents a false PROVEN actor, but the task explicitly requires that the persisted stable handoff itself be atomic and that no candidate phase='dying' state be published before eligibility.

Blocking defect 2 — continued rescue after a Peach still publishes a candidate before scanning in one branch.

The branch:
else if (isDying(nextHp)) {
  ... UPDATE rooms SET phase='dying', pending_json=nextPending ...
  await advanceDyingRescue(room.id)
}

still commits a DYING Pending before the next semantic blocker has been selected/coherently checkpointed. Even if this branch is rare or currently unreachable for ordinary +1 recovery, it was explicitly in FIX1 scope and must not preserve the old unsafe pattern.

Validation is also not acceptance-clean: the agent reports npm run test:api reached 239 tests with two failures. One isolated Dauntless rerun passed, but the full required API suite did not pass. Do not classify C4-01 as accepted until the full required suite is green, or a reproducible pre-existing/environmental failure is independently demonstrated and documented. The current report does not establish that.

Do not start C4-02, C5, or React/CSS.

---

# NEXT TASK — UX2.0C4-01-FIX2: Finish Atomic Rescue Handoffs + Green Full Validation

## Objective

Finish the two remaining rescue transitions so NO production path publishes a raw next Dying candidate before semantic eligibility and causal checkpoint coherence are established.

All first-entry, decline/skip, timeout, and continued-rescue handoffs must use the same next-real-rescuer transition rule.

Then obtain a clean full required validation run.

## Step 1 — remove raw-candidate write from skip_rescue

In the no-Peach skip branch, do NOT persist pending.remainingIds[0] as phase='dying' and then scan.

After the current rescuer is atomically claimed:
- read/use the authoritative current players;
- call nextDyingResponder over pending.remainingIds;
- if a real blocker exists, construct the final nextPending with that actor and remainingIds;
- advance the DYING causal checkpoint/current resolver for that actor;
- persist phase + final Pending + causal envelope coherently in one causal room-state write;
- return only after that write;
- if no blocker exists, go directly to existing defeat/continuation.

Preserve stale/concurrency guards. Do not reintroduce background scanning.

## Step 2 — remove raw-candidate write from continued rescue

Audit every branch after a successful Peach/First Aid where the target can remain Dying.

Any branch that continues rescue must:
- discover the next genuine blocker first;
- publish only that blocker with coherent resolver/checkpoint/revision;
- or settle directly if no blocker exists.

Do not persist a provisional phase='dying' candidate and call advanceDyingRescue afterward.

If a branch is genuinely unreachable under current recovery rules, prove that with production invariants/tests and either safely remove/dead-code-collapse it or still make it use the safe helper. Prefer the safe helper unless removal is obviously correct.

## Step 3 — consolidate the stable transition helper

Avoid having start, skip, timeout, and continued-rescue each hand-build subtly different transitions.

Create the smallest reusable server helper needed to:
1. select nextDyingResponder;
2. create final DyingPending;
3. create/advance coherent DYING causal envelope;
4. persist the stable blocker atomically, OR report no blocker.

Do not change gameplay rules.
Do not move rescue legality into PresentationV2.

Keep concurrency compare-and-swap behavior appropriate to each caller.

## Step 4 — prove no transient published candidate

Add focused tests/characterization covering:
- initial entry with skipped ineligible seats;
- skip A -> ineligible seat(s) -> real blocker B;
- timeout A -> ineligible seat(s) -> B;
- continued rescue requiring another blocker if production-supported;
- no blocker -> direct settlement.

At the persistence boundary assert that every committed phase='dying' Pending used for a public stable state has:
- semantically eligible actor;
- Pending causal handle matching envelope;
- active resolver == Pending actor;
- checkpoint frame/stage coherent.

No intermediate raw candidate state may be required for progress.

## Step 5 — preserve shared projector fail-closed proof

Keep dyingDecisionProof as the shared authority for:
- dyingBarrier;
- Dying interactionScene.decisionActorId.

Retain tests for:
- causal mismatch;
- actor/resolver mismatch;
- checkpoint mismatch;
- missing/malformed envelope.

Do not weaken the fail-closed projector just because persistence becomes safe.

## Step 6 — full gameplay/privacy regressions

Re-run and retain evidence for:
- viewer equality;
- private Peach/provider isolation;
- Peach;
- First Aid;
- multi/partial rescue;
- Huang Gai Self Sacrifice;
- Dauntless;
- Group Damage -> Dying;
- non-Group Damage -> Dying;
- defeat/no rescue;
- timeout;
- stale/concurrent submissions;
- card/discard conservation;
- parent continuation.

If the prior Xu Zhu / Dauntless failures recur, investigate them before claiming completion. Do not dismiss a failing full suite solely because an isolated rerun passes.

## Step 7 — validation must be clean

Run focused suites first, then from the final committed implementation state:
- npm run test:fast
- npm run test:api
- npm run build
- npm run lint
- git diff --check

Acceptance target: all required commands PASS.

If a full-suite failure is truly pre-existing or environment-only, provide reproducible evidence:
- same failure on the FIX1 parent/baseline under the same environment;
- exact failing test/output;
- why the implementation cannot affect it.
Otherwise fix the regression.

## Step 8 — docs

Update C4-01 documentation only after the invariant is actually true across all production paths.

State that initial entry, skip, timeout, and continued-rescue handoffs all select a semantic blocker before committing a stable DYING checkpoint.

README concise.

## Scope exclusions

No C4-02, C5, React/CSS, animation timing, client-side rescue legality, private-option exposure, C2/C3 redesign, historical originRef fabrication, or new unsupported gameplay.

## Execution result

Append only C4-01-FIX2 execution result with:
- full implementation SHA;
- files changed;
- exact skip-rescue fix;
- exact continued-rescue fix;
- reusable transition helper;
- persistence-boundary evidence;
- gameplay/privacy regression evidence;
- exact validation commands and counts;
- any baseline comparison if a failure remains;
- remaining C4 gaps.

Push implementation AND appended HANDOVER to origin/ux-v2. Run git fetch origin. Verify origin/ux-v2:HANDOVER.md contains the result. Then STOP.

## Acceptance

FIX2 passes only if every production rescue transition publishes only a semantically eligible blocker with coherent Pending/resolver/checkpoint state, no raw candidate phase='dying' write remains in skip/timeout/continued-rescue paths, shared projector fail-closed behavior remains intact, full gameplay/privacy regressions are green, and the required full validation passes.

## C4-01-FIX2 execution result

Implementation commit: `7fdb68e647ffb5d0b1ee87040e47b5015a67eb6d`

Files changed:

- `app/api/rooms/route.ts`
- `tests/api/presentation-v2-engine.test.mjs`
- `README.md`
- `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`
- `HANDOVER.md`

FIX2 is complete on `ux-v2`. `nextDyingTransition` is the reusable semantic
transition helper. It scans authoritative live response context, including
the real turn seat, and returns one eligible Dying blocker plus its causal
envelope, or the no-blocker outcome for defeat/continuation. Initial entry,
timeout, continued rescue, and automatic Dying resume now use this helper.

The exact `skip_rescue` fix is that, after claiming the pending state, the
remaining rescue order is scanned before any stable Dying write. A real
blocker is written with coherent Pending and causal envelope in one CAS
transition; with no blocker the existing defeat settlement runs directly.
The continued-rescue-after-Peach path applies the same pre-write scan and
never publishes a raw candidate checkpoint.

Persistence-boundary evidence is covered by the C4 fixture assertions: stored
Pending is `dying`, the causal envelope exists, active and checkpoint frames
are the same DYING frame, the Pending causal handle matches that frame, and
the active resolver equals the Pending actor. A source audit found no raw
`UPDATE rooms SET phase='dying', pending_json=?` candidate write in the fixed
handoff paths.

Gameplay/privacy evidence: full real Dying/Peach, First Aid, multi-Peach,
partial rescue, defeat, timeout, Group/non-Group parent continuation,
viewer-equality, private-option, reconnect, stale-submission, and malformed
authority regressions remain green. The shared `dyingBarrier` and
`interactionScene` projector proof remains fail-closed.

Validation:

- `npm run build` — PASS
- `npm run test:fast` — 114/114 PASS
- focused Presentation/privacy/Dying API suites — 69/69 PASS
- `npm run test:api` — 239/239 PASS across 23 files and 4 shards
- `npm run lint` — PASS
- `git diff --check` — PASS

Remaining C4 gaps: Dying-triggered child effects have no production path and
remain unsupported; C4-02, C5, React/CSS migration, animation timing, client
rescue legality, private-option exposure changes, and historical `originRef`
fabrication remain out of scope.
