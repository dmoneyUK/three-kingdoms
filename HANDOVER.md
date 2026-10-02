# WTK UX V2 — Current Task Handoff

## REMOTE HANDOVER RULE — MANDATORY

`HANDOVER.md` is a tracked remote coordination file.
It MUST be committed and pushed to `origin/ux-v2`.
Do NOT keep it local-only, gitignore it, untrack it, revert it, discard it, or omit it from pushed work.
After implementation, append the execution result to THIS file, commit and push it to `origin/ux-v2`, run `git fetch origin`, verify `origin/ux-v2:HANDOVER.md` contains the result, then STOP.

## Reviewer status

UX2.0C3-03 + FIX1 is **ACCEPTED / CLOSED**.

Reviewed:
- C3-03: `26237e3dd165672ccf9b9f69dea76e3ce72948ed`
- C3-03-FIX1: `eadce7147774a232612eade483e56025595667d1`

Accepted evidence:
- Attack public scene is engine-backed and viewer-stable;
- physical Duel keeps one interaction/root frame across exchange and now proves full public scene equality across two viewers before and after a response handoff;
- Duel public `decisionActorId` is equal across viewers while private response options remain private;
- Judgement and delayed fresh activation identity are characterized;
- root/independent Negation is characterized;
- Group SAME_FRAME/CHILD_FRAME regressions remain intact;
- malformed/incoherent authority remains fail-closed;
- delayed Lightning is correctly classified as inherited Judgement-owned DAMAGE-stage presentation, not independent Damage;
- a genuinely independent/root Damage production path is now proven by Yue Jin Dauntless.

Reviewer verified the Dauntless production classification in source:
- `resolveSourcedDamage` creates/uses inherited authority only from explicit causal/resume handles;
- `TurnEndTriggerContinuation` itself has no causal field;
- Dauntless invokes `resolveSourcedDamage` without `causal`, `resumeGroup`, `resumePending`, or `resumeDamageSuffered`;
- therefore the Dauntless post-damage reaction creates a genuine new DAMAGE causal root;
- the real Dauntless fixture proves source/target/roles, two-viewer equality, continuation through Sima Yi Fankui, and clearing in the no-post-reaction Cao Cao branch.

Reported validation:
- projector/causality: 29/29;
- final focused PresentationV2 + Dauntless subset: 27/27;
- test:fast: 113/113;
- test:api: 238/238;
- build/lint/diff-check: PASS.

C3 is not yet globally closed. One final C3 closure slice remains before C4.

---

# NEXT TASK — UX2.0C3-04: Final C3 Semantic Closure and Attack-Judgement Characterization

## Objective

Finish C3 by closing the last actionable Interaction Scene semantic gap and producing a final evidence audit that determines whether C3 can be closed.

Primary target:
- Attack response -> Judgement continuity in real production, where supported.

Also perform a final cross-family consistency audit of the typed public `interactionScene`.

Do NOT implement the C4 Dying presentation barrier.
Do NOT add visual/animation direction state merely to make C3 look complete.

## Step 1 — trace real Attack -> Judgement production

Inspect the real Attack response flow and all production Judgement entry points associated with Attack, including hero/equipment mechanics that can invoke Judgement during Attack response/targeting.

Identify the strongest existing real engine/API fixture.

Document:
- the Attack interaction/frame before Judgement;
- how the Judgement continuation receives causal authority;
- whether Judgement is SAME_FRAME, CHILD_FRAME, or another currently implemented relationship;
- activeFrameId/parentFrameId before, during, and after;
- checkpoint/stage/revision progression;
- exact resume behavior back to Attack.

Do not infer this from timeline events or legacy resolution IDs.

## Step 2 — characterize, do not redesign

If current C2 production already carries coherent Attack -> Judgement causal continuity:
- project/assert it through `interactionScene`;
- preserve the actual relationship already implemented;
- add only the minimum projector change if a real semantic field is missing.

If current production does NOT model a child/relationship needed to prove continuity:
- do not invent a new C2 model in C3;
- mark the boundary PARTIAL with exact code evidence;
- explain whether it belongs to a later causal-design task or is intentionally unnecessary for PresentationSnapshot.

C3 acceptance does not require fabricating unsupported history.

## Step 3 — real engine/API proof

For the strongest real Attack -> Judgement path, assert as much as production supports:

Before Judgement:
- Attack interactionId/rootFrameId;
- ATTACK_RESPONSE or actual Attack stage;
- source/target/current roles.

During Judgement:
- interactionId continuity or documented fresh identity, exactly as production implements;
- active frame/stage;
- parent relationship if present;
- source/effect/targets;
- current participant/resolver/decision actor;
- checkpoint/revision coherence.

After Judgement:
- exact resume stage/frame;
- whether the original Attack interaction/frame is restored;
- no stale Judgement scene after resume.

Use two viewers at one stable checkpoint if practical.

## Step 4 — final cross-family Interaction Scene audit

Audit the accepted C3 families:
- Group/AOE;
- Attack;
- Duel;
- independent Damage;
- inherited Lightning Damage;
- Judgement;
- root Negation;
- nested Group/Duel Negation;
- Group -> Damage -> Dying current-state characterization.

For each, verify the same field meanings:
- `interactionId`;
- `rootFrameId`;
- `activeFrameId`;
- `parentFrameId`;
- `stage`;
- `sourceId`;
- `effect`;
- `targetIds`;
- `currentParticipantId`;
- `decisionActorId`;
- `activeResolverId`;
- `activeSourceId`;
- `activeTargetIds`;
- `continuity.relation`;
- checkpoint/revision.

Do not change a field merely for naming aesthetics. Fix only concrete semantic divergence.

## Step 5 — legacy compatibility audit

Re-check:
- `rootContext`;
- `activeContext`;
- `parentContext`;
- `participants`;
- `decision`;
- `settlement`;
- `transitionEvents`;
- `groupResolution`.

The typed `interactionScene` is the future public semantic contract. Legacy fields may remain, but identify any concrete case where they contradict it.

If a safe small derivation removes a contradiction, fix it.
Otherwise document the migration gap for C5.

Do not wholesale-remove legacy fields.

## Step 6 — explicitly freeze accepted C3 limitations

Document these as intentional boundaries unless source inspection proves otherwise:

1. Historical delayed `originRef` remains PARTIAL and must not be fabricated.
2. A single snapshot exposes structural continuity facts but does not claim directional animation such as “enter child” versus “return parent”; the future consumer compares snapshots/revisions.
3. Dying/Peach has current causal/scene characterization, but the presentation barrier itself belongs to C4.
4. React/CSS consumption belongs after the later PresentationSnapshot stages.

These are not automatic C3 failures.

## Step 7 — final C3 evidence matrix

Produce one consolidated matrix using:
PROVEN / PARTIAL / UNPROVEN / NOT IMPLEMENTED IN GAME.

Include:
- Group source/ordered targets/participant progression;
- Group SAME_FRAME Negation;
- Group -> Damage child/resume;
- Dying/Peach current-state characterization;
- Attack;
- Attack -> Judgement continuity;
- Duel exchange;
- Duel viewer equality;
- independent/root Damage;
- inherited Lightning Damage;
- Judgement;
- delayed fresh activation identity;
- historical delayed originRef;
- root Negation;
- viewer equality;
- repeated-read/reconnect stability;
- checkpoint coherence/fail-closed;
- settlement/clearing;
- legacy compatibility divergence;
- snapshot-only transition-direction limitation.

For every PARTIAL row, state whether it blocks C3 closure and why.

## Step 8 — tests

Add only tests required by the Attack -> Judgement characterization or a concrete final-audit defect.

Do not add redundant synthetic tests just to increase counts.

Preserve all accepted C3 regressions.

## Step 9 — documentation

Update `docs/UX_V2_INTERACTION_STAGE_DESIGN.md` with:
- Attack -> Judgement result;
- final C3 evidence matrix;
- explicit C3 closure boundaries;
- handoff boundary to C4.

README: concise C3 status only.

Do not rewrite C0/C2 history.

## Step 10 — validation

Run focused PresentationV2 + Attack/Judgement/Group/Duel/Damage/Negation tests, then:
- `npm run test:fast`
- `npm run test:api`
- `npm run build`
- `npm run lint`
- `git diff --check`

Report exact commands/counts.

## Scope exclusions

Do not:
- modify React/CSS;
- implement the Dying presentation barrier;
- redesign C2 causal identity;
- fabricate historical delayed originRef;
- add animation-direction state from a single snapshot;
- change gameplay rules;
- start C4/C5;
- remove legacy PresentationV2 fields wholesale.

## Execution result

Append only a `C3-04 execution result` containing:
- full implementation SHA;
- files changed;
- exact Attack -> Judgement production relationship;
- any projector change and why;
- final cross-family audit result;
- legacy compatibility divergences;
- consolidated C3 evidence matrix;
- explicit recommendation: `C3 READY TO CLOSE` or `C3 NOT READY TO CLOSE`, with concrete blockers only;
- exact validation commands/counts.

Push implementation AND appended HANDOVER result to `origin/ux-v2`.
Then run `git fetch origin` and verify remote HANDOVER contains the result.
Then STOP.

## Acceptance

C3-04 passes if the real Attack -> Judgement path is accurately characterized without inventing causal history, the typed Interaction Scene has consistent field semantics across accepted C3 families, remaining PARTIAL items are explicitly bounded to later stages rather than hidden, no private data or fabricated identity is introduced, all regressions are green, and the evidence is sufficient for the reviewer to decide whether C3 can be formally closed.
