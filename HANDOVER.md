# WTK UX V2 — Current Task Handoff

## REMOTE HANDOVER RULE — MANDATORY

`HANDOVER.md` is a tracked remote coordination file.
It MUST be committed and pushed to `origin/ux-v2`.
Do NOT keep it local-only, gitignore it, untrack it, revert it, discard it, or omit it from pushed work.
After implementation, append the execution result to THIS file, commit and push it to `origin/ux-v2`, run `git fetch origin`, verify `origin/ux-v2:HANDOVER.md` contains the result, then STOP.

## Reviewer status

UX2.0C3-03 is **PARTIAL / NOT ACCEPTED**.

Reviewed implementation:
`26237e3dd165672ccf9b9f69dea76e3ce72948ed`

Accepted:
- real Attack scene coverage;
- physical Duel exchange scene coverage and stable interaction/frame across alternation;
- real Judgement scene coverage;
- delayed placement vs activation fresh identity proof;
- real independent/root Negation coverage;
- Group SAME_FRAME/CHILD_FRAME regressions remain intact;
- malformed authority remains fail-closed;
- reported focused/full suites are green.

### Blocking issue 1 — Damage evidence is overclassified

C3-03 reports **Independent/root Damage = PROVEN** using:

`delayed Lightning damage keeps one Judgement Interaction across three Legacy opportunities`

But that fixture explicitly says:
- “delayed Lightning post-damage reactions retain the Judgement causal root”;
- “the inherited Judgement/Damage root is public and viewer-stable”.

This is a real DAMAGE-stage scene, but it is not evidence for a universally independent/root Damage interaction. It originates from delayed Lightning/Judgement activation and intentionally retains that causal history.

The C3-03 task explicitly said not to overclaim this exact category.

Therefore the evidence matrix and design doc classification are currently too strong.

### Blocking issue 2 — required Duel second-viewer proof is missing

C3-03 Step 8 required second-viewer equality for:
- Attack;
- Duel;
- one of Damage/Judgement.

The implementation proves Attack and Damage viewer equality, but the Duel additions only prove repeated reads from the host. They do not compare the same Duel `interactionScene` from two different viewers.

This is a required acceptance item, not merely documentation.

Do not start C3-04/C4/C5.

---

# NEXT TASK — UX2.0C3-03-FIX1: Correct Damage Evidence and Complete Duel Viewer Proof

## Objective

Close C3-03 without changing gameplay.

1. Correct the classification of the delayed-Lightning DAMAGE evidence.
2. Determine whether a genuinely independent/root Damage production path already exists and prove it if it does.
3. Add the missing real Duel second-viewer public-scene equality proof.

Keep this narrow.

## Step 1 — audit Damage production roots

Inspect actual C2 production constructors/call sites that create a causal frame with stage `DAMAGE`.

Classify each real path as one of:
- genuinely independent/root Damage;
- Damage child under another causal frame;
- inherited/re-staged continuation of an existing interaction such as delayed Judgement;
- unsupported/no stable production path.

Do not classify based only on the frame having `parentFrameId === null`. Semantic origin/history matters.

Document exact production call sites/typed continuation responsible for the classification.

## Step 2 — fix delayed Lightning wording/evidence

The existing Lightning/Guo Jia fixture may continue to prove:
- a real `DAMAGE` stage public scene;
- stable interaction/frame/checkpoint across repeated Legacy opportunities;
- viewer equality;
- final clearing.

But do NOT call it “independent/root Damage” unless Step 1 proves that this is semantically the production model.

If it inherits the Judgement activation interaction, label it accordingly in:
- execution result;
- C3 non-Group semantic matrix;
- README if necessary;
- test description/assertion messages where wording is misleading.

Do not alter correct causal behavior merely to make the label fit.

## Step 3 — prove genuine independent/root Damage if production-supported

If a genuinely independent/root Damage entry point already exists:
- use a real engine/API fixture;
- assert `interactionScene.semantics === PROVEN`;
- assert interaction/root/active/checkpoint/revision;
- assert source only when production actually has one;
- assert target/current participant/resolver/decision actor;
- assert repeated read stability;
- assert second-viewer equality where applicable;
- assert settlement/clearing.

If no such production path exists:
- mark **NOT IMPLEMENTED IN GAME** or **UNPROVEN**, whichever accurately describes the code;
- do not create a new gameplay path;
- do not use a synthetic projector fixture to upgrade the evidence status.

Historical source-less Damage must not be inferred from Lightning.

## Step 4 — add real Duel second-viewer proof

Extend the existing physical Duel engine fixture.

At a stable Duel response checkpoint:
- read room state as the acting player;
- read the same room state as a different viewer;
- assert the full public `presentationV2.interactionScene` is deep-equal;
- assert private response options/cards remain outside the public scene;
- keep interactionId/rootFrameId/checkpoint/revision unchanged.

Repeat after at least one Duel response handoff if practical, so decision ownership changes while public semantic identity remains coherent.

Do not compare only legacy `rootContext`.

## Step 5 — verify public decisionActor semantics

Because `interactionScene.decisionActorId` is public, explicitly verify in the Duel second-viewer test that both viewers receive the same decisionActorId at the same checkpoint.

If the current API actually redacts or changes actor identity by viewer, do not force equality; report the concrete conflict and mark C3-03 PARTIAL. Do not leak private options to solve it.

## Step 6 — evidence matrix correction

Re-report:
- Attack public scene;
- Attack response-Judgement continuity;
- Duel scene/exchange stability;
- Duel second-viewer equality;
- genuine independent/root Damage;
- inherited delayed-Lightning DAMAGE-stage scene;
- Judgement;
- delayed Judgement fresh activation;
- historical delayed originRef;
- root Negation;
- Group regressions;
- repeated-read stability;
- settlement clearing;
- malformed fail-closed behavior.

Use PROVEN / PARTIAL / UNPROVEN / NOT IMPLEMENTED IN GAME literally.

Do not combine “independent/root Damage” and “Lightning DAMAGE-stage scene” into one row.

## Step 7 — documentation

Correct `docs/UX_V2_INTERACTION_STAGE_DESIGN.md` so the non-Group matrix no longer overstates Damage evidence.

Record the real production distinction found in Step 1.

README only needs a concise correction if its current wording becomes inaccurate.

## Step 8 — validation

Run focused PresentationV2 + Duel + Damage/Judgement tests, then:
- `npm run test:fast`
- `npm run test:api`
- `npm run build`
- `npm run lint`
- `git diff --check`

Report exact commands/counts.

## Scope exclusions

Do not:
- modify React/CSS;
- add a new Damage gameplay path just to satisfy evidence;
- redesign C2 causal identity;
- change delayed Lightning/Judgement behavior merely to obtain a “root Damage” label;
- implement Dying barrier;
- fabricate historical originRef;
- start C3-04/C4/C5.

## Execution result

Append only a `C3-03-FIX1 execution result` containing:
- full implementation SHA;
- files changed;
- exact Damage production inventory/classification;
- whether genuine independent/root Damage exists;
- corrected Lightning classification;
- Duel two-viewer evidence;
- corrected evidence matrix;
- exact validation commands/counts;
- remaining C3 gaps.

Push implementation AND appended HANDOVER result to `origin/ux-v2`.
Then run `git fetch origin` and verify remote HANDOVER contains the result.
Then STOP.

## Acceptance

FIX1 passes only if Damage evidence is classified without overclaiming, any genuine independent/root Damage claim is backed by a real production path, the physical Duel flow proves public scene equality across two viewers, private controls remain private, existing non-Group/Group semantics remain intact, and all regressions are green.

## C3-03-FIX1 execution result

- Implementation/docs/tests commit: `eadce7147774a232612eade483e56025595667d1` (`test: close C3 damage and duel evidence gaps`).
- Files changed: `README.md`, `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`, `tests/api/presentation-v2-engine.test.mjs`, and `tests/api/yue-jin-dauntless.test.mjs`.
- No gameplay, React/CSS, C2 identity, delayed Lightning behavior, or Dying barrier was changed.

### Damage production inventory and classification

- `app/api/rooms/route.ts:2666` is the shared `resolveSourcedDamage` boundary. Its `inheritedCausal` value comes from explicit causal/resume handles; absent such a handle, `damageSufferedTriggerPending` at line 2726 creates a new `DAMAGE` root through `createCausalRoot`.
- `app/api/rooms/route.ts:4249-4263` is a real independent/root production path: Yue Jin Dauntless calls `resolveSourcedDamage` without a causal or resume causal handle and labels the effect `Dauntless`. The real Sima Yi and Cao Cao branches now prove this path.
- `app/api/rooms/route.ts:4369` is a second independent/root production path: Sowing Distrust calls the same boundary without causal input. It was audited but not duplicated as a new fixture because Dauntless already proves the shared production path.
- `app/api/rooms/route.ts:1137-1152` is not independent/root Damage: delayed Lightning passes `judgement.causal` into `resolveSourcedDamage`; the resulting `DAMAGE` frame intentionally inherits the delayed Judgement interaction, retains Guo Jia as historical origin, and has a null current source.
- Attack, Duel, Group child Damage, Judgement replacement, and other resumed damage call sites pass existing causal/resume handles or use their established parent/child continuation. They are not independent roots merely because the active frame stage is `DAMAGE`.

### Evidence correction and Duel proof

- Genuine independent/root Damage: **PROVEN** by the real Dauntless engine/API fixture. It asserts one root frame, `DAMAGE` stage, source Yue Jin, target/current participant/resolver/decision actor, interaction/root identity, repeated public scene across Yue Jin and Sima Yi viewers, and final clearing in the no-post-reaction Cao Cao branch. Sima Yi additionally proves continuation through a real Fankui reaction without changing the root identity.
- Inherited delayed-Lightning `DAMAGE` stage: **PROVEN** as inherited Damage-stage presentation only. The existing Guo Jia fixture proves one Judgement-owned interaction, repeated Legacy re-entry, viewer equality, and final clearing. It is no longer classified as independent/root Damage.
- Physical Duel: **PROVEN** across two viewers before and after one response handoff. Both viewers receive equal full `interactionScene`, including equal public `decisionActorId`, while response options remain absent from the non-acting viewer. Interaction/root identity remains unchanged.

### Corrected evidence matrix

| Evidence | Result |
| --- | --- |
| Attack public scene | PROVEN |
| Attack response-Judgement continuity | PARTIAL; existing causal support remains without a new child model |
| Duel public scene and exchange stability | PROVEN |
| Duel second-viewer equality and public decision actor | PROVEN before and after response handoff |
| Genuine independent/root Damage | PROVEN through Dauntless; Sowing Distrust shares the audited production entry point |
| Inherited delayed-Lightning Damage-stage scene | PROVEN, explicitly not independent/root |
| Judgement | PROVEN |
| Delayed Judgement fresh activation identity | PROVEN |
| Historical delayed `originRef` | PARTIAL; not fabricated |
| Independent/root Negation | PROVEN |
| Group SAME_FRAME Negation regression | PROVEN |
| Repeated-read stability | PROVEN across the existing Attack, Duel, Damage, Judgement, Negation, and Group fixtures |
| Settlement / scene clearing | PROVEN for real terminal Attack, inherited Lightning, and independent Dauntless Damage paths where the fixture reaches settlement |
| Malformed/non-authoritative fail-closed behavior | PROVEN |
| Compatibility-field divergence | NONE FOUND |

### Validation

- Focused projector and causality: `node --test tests/presentation-v2.test.mjs tests/presentation-causality.test.mjs` — 29/29.
- Focused real PresentationV2/Duel/Damage/Judgement tests: `GAME_TEST_FILES=tests/api/presentation-v2-engine.test.mjs,tests/api/presentation-causality.test.mjs,tests/api/lobby-heroes-wei.test.mjs,tests/api/judgement.test.mjs,tests/api/yue-jin-dauntless.test.mjs ... node tests/run-tests.mjs` — 64 tests, 63 passed, 1 assertion was corrected, then the final focused subset `presentation-v2-engine + yue-jin-dauntless` passed 27/27. The final full suite below is the acceptance evidence.
- Full fast suite: `npm run test:fast` — 113/113.
- Full API suite: `npm run test:api` — 238/238 across 4 shards.
- `npm run build` — PASS.
- `npm run lint` — PASS.
- `git diff --check` — PASS.

### Remaining C3 gaps

FIX1 is implemented and validated. Remaining boundaries are the historical
delayed `originRef`, explicit Attack-response-to-Judgement child continuity,
transition-direction/animation semantics, and the Dying presentation barrier.
Do not start C3-04, C4, C5, React/CSS migration, or gameplay changes in this
handoff.
