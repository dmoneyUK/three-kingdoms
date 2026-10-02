# WTK UX V2 — Current Task Handoff

## REMOTE HANDOVER RULE — MANDATORY

`HANDOVER.md` is a tracked remote coordination file.
It MUST be committed and pushed to `origin/ux-v2`.
Do NOT keep it local-only, gitignore it, untrack it, revert it, discard it, or omit it from pushed work.
After implementation, append the execution result to THIS file, commit and push it to `origin/ux-v2`, run `git fetch origin`, verify `origin/ux-v2:HANDOVER.md` contains the result, then STOP.

## Reviewer status

UX2.0C3-02 + FIX1 is **ACCEPTED / CLOSED**.

Reviewed:
- C3-02: `419231d09acced82d6ab59af3a044b96e54734f9`
- C3-02-FIX1: `cfe36dcae322e8a5c0b1968265492b31630e9303`

Accepted evidence:
- typed public `presentationV2.interactionScene` exists;
- causal identity remains envelope-owned;
- Group semantic values are shared with compatibility `groupResolution`;
- Group participant / decision actor / active resolver remain distinct;
- Group Negation is SAME_FRAME;
- Group -> Damage/Dying is CHILD_FRAME with Group parent retained;
- viewer equality and reconnect stability are covered;
- NULL/malformed authority does not fabricate causal identity;
- active frame/checkpoint coherence is now required before the scene can be PROVEN;
- cross-frame and cross-stage checkpoint mismatches fail closed;
- real valid Group/Damage/Dying/Negation flows remain PROVEN.

FIX1 reported validation:
- projector + causality: 28/28;
- focused engine/API: 27/27;
- test:fast: 112/112;
- test:api: 238/238;
- build/lint/diff-check: PASS.

The parser intentionally remains structural; semantic active/checkpoint coherence is defended at the PresentationV2 authority boundary. This is acceptable for C3-02 because persisted incoherent authority is explicitly characterized and projects UNPROVEN.

C3 remains active. Do not start C4/C5 or React migration.

---

# NEXT TASK — UX2.0C3-03: Generalize Interaction Scene Beyond Group

## Objective

Prove that the typed public `interactionScene` is genuinely reusable beyond Group by projecting the current production semantics for the major non-Group causal roots already completed in C2.

This remains server projector/model/test/documentation work only.

Target production families:
1. Attack / Attack Response;
2. Duel;
3. independent Damage;
4. Judgement;
5. independent/root Negation where it exists in production.

Do NOT add gameplay behavior and do NOT implement the future Dying presentation barrier.

## Step 1 — inventory real non-Group causal envelopes

Inspect C2 production entry points and existing engine/API fixtures for:
- Attack;
- Attack response Judgement where applicable;
- Duel;
- independent Damage;
- Judgement, including delayed Judgement activation;
- independent/root Negation.

For each family document:
- root stage;
- source;
- effect;
- ordered/public targets;
- current target/participant;
- resolver;
- decision actor;
- whether child frames exist in current production;
- terminal/settlement behavior;
- known unsupported cases.

Use real C2 state. Do not infer from logs/timeline/card names/actionRevision.

## Step 2 — define generic semantic ownership

Refactor only as necessary so `interactionScene` obtains non-Group public semantics from:
- causal envelope frame origin/current for authoritative public causal content;
- CurrentAction only for the public decision actor identity where appropriate;
- typed Pending only when a semantic value is not represented by the envelope and the usage is explicitly justified.

Do not introduce recursive generic Pending inference.

Causal IDs remain envelope-only.

## Step 3 — Attack projection

Using real Attack fixtures prove:
- interactionId/rootFrameId/activeFrameId/checkpoint/revision;
- stage ATTACK_RESPONSE at the response checkpoint;
- source attacker;
- effect Attack;
- original target(s);
- active/current target;
- resolver;
- decision actor;
- unchanged repeated reads stable.

Include a real response-Judgement path if current C2 production already carries the Attack causal handle through it. Characterize current state only; do not invent a new child-frame model.

## Step 4 — Duel projection

Using a real physical Duel card flow prove:
- root interaction/frame identity;
- source and target;
- DUEL_EXCHANGE stage;
- current exchange target/resolver;
- decision actor;
- stable identity across alternating Duel responses;
- settlement clears/ends according to current production behavior.

Do not model Duel as Group.

## Step 5 — independent Damage projection

Use the strongest real current C2 fixture for independent/root Damage.

Prove:
- Damage root interaction/frame;
- source when production has one;
- target;
- DAMAGE stage;
- resolver/decision actor semantics;
- repeated/viewer stability.

Do not overclaim source-less independent Damage if the existing fixture is actually a synchronous child of Judgement or another root. Mark unsupported variants honestly.

## Step 6 — Judgement projection

Using real Judgement production fixtures prove:
- JUDGEMENT interaction/frame identity;
- judged/source actor semantics as represented by C2;
- effect;
- current resolver/target;
- checkpoint/revision;
- delayed Judgement activation receives its fresh activation identity;
- placement identity is not reused as activation identity.

Preserve accepted limitation:
historical delayed `originRef` is PARTIAL / unsupported. Do not fabricate it.

## Step 7 — Negation projection

Characterize real independent/root Negation production state separately from Group SAME_FRAME Negation.

If a standalone/root Negation exists:
- prove its interaction/frame/stage/source/target/resolver/decision semantics.

If no standalone/root production path exists for a requested variant:
- mark NOT IMPLEMENTED IN GAME;
- do not create synthetic gameplay merely to satisfy the matrix.

Keep Group nested Negation SAME_FRAME regression coverage.

## Step 8 — public/viewer boundary

For at least Attack, Duel, and one of Damage/Judgement:
- compare two viewers;
- `interactionScene` public semantic object must be deep-equal;
- private cards/options/legal actions remain outside the scene.

Do not expose private response availability.

## Step 9 — stability and settlement

For each supported family:
- repeated unchanged reads deep-equal;
- projector never generates IDs/revisions;
- authoritative checkpoint/revision drives the scene;
- terminal settlement does not leave a stale PROVEN scene attached to a completed interaction.

If current production intentionally retains a terminal SETTLEMENT checkpoint, characterize it rather than guessing.

## Step 10 — malformed/non-authoritative states

For at least one non-Group family and generic pure-projector cases:
- NULL envelope;
- malformed envelope;
- active/checkpoint mismatch.

No PROVEN causal identity may be fabricated from Pending, CurrentAction, timeline, logs, card names, resolutionId, phase, or actionRevision.

Preserve C3-02-FIX1 fail-closed behavior.

## Step 11 — compatibility boundary

Do not remove `rootContext`, `activeContext`, `parentContext`, `participants`, `decision`, `settlement`, `transitionEvents`, or `groupResolution` in this task.

Document which remain legacy compatibility fields and whether any can disagree semantically with the new scene.

If a disagreement is found, do not hide it: either derive the compatibility field from the shared semantic projection where safe, or mark the concrete migration gap for later C3 work.

## Step 12 — tests

Add focused pure-projector and real engine/API tests for:
- Attack;
- Attack response-Judgement characterization if production-supported;
- physical Duel;
- independent/root Damage;
- Judgement including delayed activation;
- root/independent Negation if production-supported;
- Group SAME_FRAME Negation regression;
- second viewer;
- repeated read;
- settlement/clear;
- malformed/non-authoritative state.

Tests must assert `presentationV2.interactionScene` directly.

Prefer extending existing C2 engine fixtures rather than creating synthetic-only proofs.

## Step 13 — documentation

Update `docs/UX_V2_INTERACTION_STAGE_DESIGN.md` with a C3 non-Group semantic matrix:
- family;
- root/child/same-frame relationship;
- source/effect/targets;
- current/resolver/decision roles;
- settlement behavior;
- evidence status;
- known gaps.

README: concise current-stage update.

Do not rewrite C0/C2 history.

## Step 14 — validation

Run focused PresentationV2 + Attack/Duel/Damage/Judgement/Negation tests, then:
- `npm run test:fast`
- `npm run test:api`
- `npm run build`
- `npm run lint`
- `git diff --check`

Report exact commands/counts.

## Evidence matrix

Report PROVEN / PARTIAL / UNPROVEN / NOT IMPLEMENTED IN GAME for:
- Attack public scene;
- Attack response-Judgement continuity;
- Duel public scene and exchange stability;
- independent/root Damage;
- Judgement;
- delayed Judgement fresh activation identity;
- historical delayed originRef;
- independent/root Negation;
- Group SAME_FRAME Negation regression;
- second-viewer equality;
- repeated-read stability;
- terminal settlement/scene clearing;
- malformed/non-authoritative fail-closed behavior;
- compatibility-field divergence.

## Scope exclusions

Do not:
- modify React/CSS;
- implement visual Interaction Stage;
- implement Dying presentation barrier;
- alter gameplay rules;
- redesign C2 causal identity;
- fabricate historical originRef;
- create unsupported gameplay paths just for tests;
- remove legacy PresentationV2 compatibility fields wholesale;
- start C4/C5.

## Execution result

Append only a `C3-03 execution result` containing:
- full implementation SHA;
- files changed;
- per-family semantic ownership;
- real fixtures used;
- evidence matrix;
- compatibility divergences found;
- exact validation commands/counts;
- remaining C3 gaps.

Push implementation AND appended HANDOVER result to `origin/ux-v2`.
Then run `git fetch origin` and verify the remote HANDOVER contains the result.
Then STOP.

## Acceptance

C3-03 passes only if the typed public Interaction Scene accurately represents the supported real non-Group causal families without private leaks or invented identity, remains viewer/reconnect stable, fails closed for non-authoritative state, preserves Group semantics, honestly marks unsupported production paths, and all regressions are green.

## C3-03 execution result

- Implementation/docs/tests commit: `26237e3dd165672ccf9b9f69dea76e3ce72948ed` (`test: characterize C3 non-group interaction scenes`).
- Files changed: `README.md`, `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`, `tests/presentation-v2.test.mjs`, `tests/api/presentation-causality.test.mjs`, `tests/api/presentation-v2-engine.test.mjs`, `tests/api/lobby-heroes-wei.test.mjs`, and `tests/api/stratagems.test.mjs`.
- Scope: the existing typed projector is now covered against real non-Group causal roots; no React/CSS, gameplay, C2 identity, Dying barrier, or legacy-field removal was introduced.

### Semantic ownership and real fixtures

- Attack / Attack Response: `PROVEN` from the authoritative root `ATTACK_RESPONSE` frame; source and original targets come from frame origin, while current participant, resolver, and public decision actor remain distinct. Real Attack/Dodge fixture and causal room-read fixture cover reconnect/repeated reads.
- Duel: `PROVEN` from the root `DUEL_EXCHANGE` frame; original target IDs preserve both Duel participants and the active participant/resolver/decision actor alternate through the real response exchange. Physical Duel fixture covers repeated reads and legacy root compatibility.
- Independent/root Damage: `PROVEN` from the delayed Lightning `DAMAGE` frame; source/effect/targets remain envelope-owned through repeated Legacy opportunities and fresh activation. No nested Dying presentation model was added.
- Judgement: `PROVEN` from the real Guo Jia replacement/reveal/resume fixture; resolver and source/effect remain causal, while the public decision actor follows the live action. Delayed placement/activation uses a fresh causal identity; the activation fixture first exposes its real `NEGATION` window before Judgement.
- Root Negation: `PROVEN` from the real Dismantle/Negation and counter-Negation fixture; the source/effect/targets remain available while resolver and decision ownership change.
- Group compatibility: existing Group `SAME_FRAME` Negation and `CHILD_FRAME` Damage behavior remains covered and unchanged.

### Evidence matrix

| Evidence | Result |
| --- | --- |
| Attack public scene | PROVEN |
| Attack response-Judgement continuity | PARTIAL; existing causal support remains, but C3-03 does not invent a new child model |
| Duel public scene and exchange stability | PROVEN |
| Independent/root Damage | PROVEN |
| Judgement | PROVEN |
| Delayed Judgement fresh activation identity | PROVEN |
| Historical delayed `originRef` | PARTIAL; not fabricated |
| Independent/root Negation | PROVEN |
| Group SAME_FRAME Negation regression | PROVEN |
| Second-viewer equality | PROVEN for real Attack, Damage, and Group public scene reads; decision actor remains subject to existing private/public CurrentAction projection |
| Repeated-read stability | PROVEN for Attack, Duel, Damage, Judgement activation, and Group fixtures |
| Terminal settlement / scene clearing | PROVEN where the real fixture reaches a null causal envelope; no timer-based clearing was added |
| Malformed/non-authoritative fail-closed behavior | PROVEN; malformed and incoherent authority remains `UNPROVEN` with no fabricated IDs |
| Compatibility-field divergence | NONE FOUND; Group compatibility values remain derived from shared semantics |

### Validation

- Focused projector and causality: `node --test tests/presentation-v2.test.mjs tests/presentation-causality.test.mjs` — 29/29.
- Focused real API families: `GAME_TEST_FILES=tests/api/presentation-v2-engine.test.mjs,tests/api/presentation-causality.test.mjs,tests/api/lobby-heroes-wei.test.mjs,tests/api/stratagems.test.mjs ... node tests/run-tests.mjs` — 70/70.
- Full fast suite: `npm run test:fast` — 113/113.
- Full API suite: `npm run test:api` — 238/238 across 4 shards.
- `npm run build` — PASS.
- `npm run lint` — PASS.
- `git diff --check` — PASS.

### Remaining C3 gaps and handoff

C3-03 is implemented and validated. Remaining boundaries are the historical
delayed `originRef`, explicit Attack-response-to-Judgement child continuity,
transition-direction/animation semantics, and the Dying presentation barrier.
Do not start C3-04, C4, C5, React/CSS migration, or gameplay changes in this
handoff.
