# WTK UX V2 — Current Task Handoff

## REMOTE HANDOVER RULE — MANDATORY

HANDOVER.md is a tracked remote coordination file. It MUST be committed and pushed to origin/ux-v2. Do not keep it local-only, gitignore it, untrack it, revert it, discard it, or omit it. After implementation, append the execution result, commit/push to origin/ux-v2, run git fetch origin, verify origin/ux-v2:HANDOVER.md contains the result, then STOP.

## Reviewer status

UX2.0C4-01 implementation 489276eb09dc3e8a6cc42f57cd6ea164495ce289 is **PARTIAL — FIX REQUIRED**.

Accepted: the typed PresentationDyingBarrier is a useful minimal contract; normal settled rescue checkpoints preserve causal identity and advance checkpoint/revision; viewer privacy/equality coverage is directionally correct; malformed causal authority fails closed in dyingBarrier; synchronous completion before the skip_rescue POST response is an improvement; reported suites are green.

Blocking defect: the implementation still commits API-readable transient phase="dying" candidate states before proving that candidate is a genuine semantic rescue blocker.

1. startDyingRescue commits DyingPending.actorId=first candidate plus a coherent DYING envelope/resolvingPlayerId for that raw candidate, then calls advanceDyingRescue. A concurrent GET between committed writes can observe a PROVEN barrier even when that candidate has no legal rescue option.
2. skip_rescue and expireDyingRescue commit the next raw candidate first, then scan. During that gap Pending can name B while the causal checkpoint/resolver still describes A. dyingBarrierFor does not require activeFrame.current.resolvingPlayerId === pending.actorId, so this can still project PROVEN.
3. interactionSceneFor uses a Dying Pending actor whenever the generic envelope is proven, without validating the Pending causal handle or resolver coherence. A malformed/transient Dying Pending can therefore disagree with dyingBarrier fail-closed behavior.

Awaiting the scanner before returning a mutating POST is insufficient because the intermediate committed room state remains independently readable.

C4-01 is not closed. Do not start C4-02, C5, or React/CSS.

---

# NEXT TASK — UX2.0C4-01-FIX1: Atomic Dying Rescue Barrier

## Objective

Eliminate API-readable fake Dying checkpoints. A PROVEN RESCUE_CHOICE may exist only after the engine identifies a genuine semantic rescue blocker. Candidate scanning must occur before publishing the stable Dying Pending/envelope, or any internal state must be explicitly non-authoritative/non-PROVEN.

The generic interactionScene and dyingBarrier must share one coherent Dying decision proof.

## Step 1 — reproduce the boundary defect

Add deterministic projector/persistence tests for:
- coherent DYING envelope + Dying Pending actor different from active resolver;
- coherent DYING envelope + Pending causal interaction/frame mismatch;
- post-decline shape where Pending names candidate B but envelope/checkpoint still belongs to A;
- initial raw candidate before eligibility has been established.

Do not rely only on normal POST responses because those already await advanceDyingRescue. Exercise the state/projection boundary a concurrent GET can observe.

## Step 2 — centralize next-real-rescuer discovery

Extract/reuse one server helper that scans ordered candidates using the existing semantic response resolver: living actor + responseDecisionFor + actual rescue options/providers.

Return the next genuine blocker plus remaining ordered candidates. Do not duplicate Peach legality in PresentationV2 and do not infer from card names alone.

## Step 3 — publish only the first real blocker

Refactor startDyingRescue so the first committed stable phase="dying" checkpoint names the first genuine blocker, not the first seat.

If no genuine blocker exists, do not publish RESCUE_CHOICE; continue directly through the existing authoritative defeat/continuation path.

Preserve HP/player/deck/discard/log writes and concurrency correctness. If an internal resolving state is necessary, it must not project a PROVEN Dying decision.

## Step 4 — atomic semantic handoff

For skip_rescue, expireDyingRescue, and continued rescue when the target is still Dying, identify the next genuine blocker before publishing the next stable checkpoint.

Persist Pending actor, active-frame current resolver, checkpoint and presentation revision coherently as one semantic transition. Never commit pending.actorId=B while the causal checkpoint/resolver still belongs to A.

If no blocker remains, continue directly to existing settlement/continuation.

## Step 5 — one shared Dying proof

Create one shared projector helper/value used by BOTH PresentationV2.dyingBarrier and the Dying-specific interactionScene.decisionActorId.

PROVEN Dying decision authority must require at minimum:
- parsed envelope;
- active frame exists and stage=DYING;
- checkpoint frame equals active frame;
- checkpoint stage=DYING;
- Pending kind=dying;
- Pending causal interaction/frame equals envelope interaction/active frame;
- non-empty Pending actor;
- active frame current resolver equals Pending actor.

On failure:
- dyingBarrier semantics=UNPROVEN;
- barrier causal IDs/rescuer/decision actor null under the established convention;
- interactionScene MUST NOT publish the unproven Dying Pending actor as decisionActorId.

The projector must not calculate rescue legality; the engine establishes eligibility before coherent state is persisted.

## Step 6 — viewer/privacy proof

At a stable blocker compare acting rescuer, Dying target, and uninvolved viewer:
- dyingBarrier deep-equal;
- public interactionScene decision actor equal;
- only acting viewer receives private rescue card/provider options;
- no private card/provider IDs enter public semantic objects.

## Step 7 — prove skipped candidates never become stable checkpoints

Use a real 4+ player fixture:
- initial candidate(s) unable to rescue;
- first real blocker later in order;
- after that blocker declines, additional ineligible candidate(s) before a second real blocker.

Assert stable persisted/API state jumps directly real blocker A -> real blocker B. Checkpoint/revision changes only for the meaningful handoff. Inspect persisted Pending + envelope together where practical.

## Step 8 — regressions

Keep/prove successful Peach recovery, partial/multi-Peach rescue, no-rescue defeat settlement, timeout handoff, Group->Damage->Dying continuity, non-Group Damage->Dying, repeated read/reconnect, malformed envelope, checkpoint mismatch, Pending causal mismatch, and Pending actor/resolver mismatch.

Dying-triggered child effect remains NOT IMPLEMENTED IN GAME unless already present. Do not add gameplay only for evidence.

## Step 9 — docs

Correct C4-01 docs to state the actual post-fix invariant:

**Only a semantically eligible rescue blocker is committed as a stable DYING rescue checkpoint; Pending actor + active resolver + checkpoint are coherent before the state is publicly projectable.**

README concise. Do not rewrite C0-C3 history.

## Step 10 — validation

Run focused PresentationV2/causality/Dying/privacy/Group/Damage tests, then:
- npm run test:fast
- npm run test:api
- npm run build
- npm run lint
- git diff --check

Report exact commands/counts.

## Scope exclusions

No C4-02, C5, React/CSS, timer-based presentation stability, client rescue legality, private-option exposure, C2/C3 identity redesign, historical originRef fabrication, unsupported Dying-trigger gameplay, or weakening concurrency/stale-action guards.

## Execution result

Append only C4-01-FIX1 execution result with:
- full implementation SHA;
- files changed;
- root cause;
- exact persistence-boundary change;
- shared Dying proof invariants;
- real fixtures used;
- evidence no ineligible candidate can be a PROVEN API-visible checkpoint;
- viewer/privacy evidence;
- exact validation commands/counts;
- remaining C4 gaps.

Push implementation AND appended HANDOVER to origin/ux-v2. Run git fetch origin. Verify origin/ux-v2:HANDOVER.md contains the result. Then STOP.

## Acceptance

FIX1 passes only if the persisted authoritative boundary prevents fake rescue candidates becoming stable public Dying decisions, Pending actor/resolver/checkpoint move coherently, both dyingBarrier and interactionScene fail closed from the same Dying proof, viewer privacy remains intact, normal rescue/settlement/parent-continuation behavior remains correct, and all regressions are green.
