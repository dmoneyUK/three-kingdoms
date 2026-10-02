# WTK UX V2 — Current Task Handoff

## Reviewer status

UX2.0C2-FIX10 is **ACCEPTED for the scoped Negation decision-actor gate**.

Reviewed implementation: `39f960491c537dbbcf45a993b994930563c907a6`.

Do not start C3. C2 remains open.

Accepted from FIX10:
- eligibility scanning now selects the real Negation blocker before publishing state;
- Pending and causal resolver are updated together on decline/timeout handoff;
- real actor changes preserve Interaction/Frame and advance one checkpoint/revision;
- Group/Duel nested Negation remains SAME_FRAME;
- independent Negation, NULL/malformed compatibility and documentation corrections are covered;
- reported validation passed: fast 108/108, API 228/228 and focused suites green.

The remaining PARTIAL FIX10 rows are honest evidence gaps, not blockers to this scoped acceptance.

## Why the next task is Judgement

Actual code review shows Judgement is still largely legacy continuation state. `beginJudgementResolution()` can write trigger Pending/phase/deck/discard/log without a complete causal transition. Delayed activation may create a Negation root only when a responder exists, while the delayed activation itself is not consistently an authoritative Interaction. Cavalry and other synchronous Judgements do not yet prove one causal lifetime through reveal, replacement, result and resume.

The UX design requires Judgement reveal -> modifier -> result continuity, SAME_FRAME Judgement-card modification, synchronous continuation in the same Interaction, and a NEW Interaction for a future delayed activation after the placement Interaction has settled.

---

# NEXT TASK — UX2.0C2-FIX11: Make Judgement Causal Lifetime Authoritative

## Objective

Make real Judgement flows carry server-owned causal identity through reveal, optional replacement, effective result, resume and settlement.

Mandatory rules:

1. Judgement inside an unresolved parent Interaction stays in that Interaction.
2. Judgement-card modification is SAME_FRAME unless the engine genuinely launches an independent effect.
3. A delayed effect activating in a later turn starts a NEW Interaction. It must never reopen its old placement interactionId.
4. Historical delayed provenance may use `originRef`, but provenance is not parenthood.
5. Automatic reveal/evaluation/eligibility scans do not create fake blocking checkpoints.

Do not start C3.

## Workflow

Work only on `ux-v2`. Fetch/pull it first. Read this HANDOVER, the Judgement and deferred-activation sections of `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`, the C0 causal design, C2 propagation document, all Judgement continuation types, and all production Judgement entry/resume functions.

Do not modify/merge `main`. Append execution result only.

## Step 1 — complete Judgement path inventory

Audit every production Judgement entry/resume, including:
- Overindulgence;
- Rations Depleted;
- Lightning;
- Cavalry;
- Stauchness/Ganglie;
- Luo River;
- response/provider Judgement;
- every other `JudgementContinuation.resume.kind`.

For each record entry function, source/target, whether a parent Interaction is unresolved, NEW vs INHERIT Interaction rule, blocking decisions, resume destination, current causal handle, and envelope write/clear site.

Do not omit untested paths.

## Step 2 — typed causal transport

Extend Judgement continuation/resume types minimally so they carry `CausalContext` when authority exists.

Constraints:
- no full envelope in Pending;
- server owns IDs;
- no identity inferred from resolutionId, event ID, card ID/name or logs;
- no normal-path `recoverCausalEnvelope()`;
- NULL/malformed envelope is never reconstructed from a Judgement handle;
- legacy records remain readable;
- a new Judgement root returns/persists its exact envelope explicitly.

## Step 3 — meaningful Judgement checkpoints

Use the minimum existing/required Judgement causal stage. Do not model engine microsteps as presentation states.

No checkpoint for top-card draw, suit/rank calculation, eligibility scan or deck/discard movement.

A real replacement decision must satisfy:
- Pending.actorId = actual replacement actor;
- envelope resolver = same actor;
- correct Interaction/Frame;
- one semantic checkpoint for that blocking decision.

No legal replacement actor means no fake decision checkpoint.

## Step 4 — delayed activation starts a fresh Interaction

For each delayed card activation:
- prove the old placement Interaction is settled;
- create a fresh root for later activation;
- root origin describes the activation and target;
- interactionId/frameId differ from placement IDs;
- persist root with first authoritative activation state;
- root creation must not depend on whether a Negation responder exists;
- automatic resolution may settle without a fake response Pending.

If authoritative placement provenance exists, preserve it only as historical `originRef`. If current persistence cannot represent it safely, document the schema gap before adding the smallest typed server-owned field. Never encode provenance in logs.

A transferred delayed card must not keep an old envelope alive. Its later activation is another fresh Interaction.

## Step 5 — Cavalry Judgement inherits Attack

Cavalry Judgement occurs while Attack-targeted work is unresolved.

Required real API evidence:
- Attack root exists first;
- Judgement keeps the same interactionId;
- no fresh root and no resolutionId reconstruction;
- replacement decision is causally attached;
- use SAME_FRAME unless actual engine semantics prove an independent child effect;
- after result, Attack-targeted flow resumes with the correct causal identity;
- Attack authority is not cleared/recreated by Judgement.

## Step 6 — Necromancy replacement is SAME_FRAME

Drive a real replacement flow from reveal through effective result and resume.

Assert:
- same Interaction/Frame;
- immutable origin;
- current result/context may change;
- replacement Pending causal IDs match envelope;
- Pending actor equals envelope resolver;
- replacement card creates no new root/child;
- checkpoint changes only at meaningful decision/result boundaries;
- final resume restores parent stage or settles the root exactly once.

## Step 7 — Judgement Negation must reuse Judgement authority

Integrate FIX10 Negation with Judgement.

- delayed activation root must exist before optional Negation;
- `startJudgementNegation()` must not create a second root inside that Judgement;
- synchronous parent Judgement reuses its context;
- Negation/counter-Negation remains SAME_FRAME;
- after Negation, restore the Judgement semantic context through explicit checkpoint transition.

Preserve the real WTK rule ordering. Do not alter gameplay to fit presentation.

## Step 8 — Damage-related Judgement and response resume

For Stauchness/Ganglie and response-Judgement paths:
- inherit unresolved parent context;
- replacement stays in same Interaction;
- effective result resumes exact parent continuation;
- do not clear authority while parent work remains;
- do not create a new root on resume;
- any next blocking choice must update resolver/checkpoint.

Add real evidence for at least one Damage-related Judgement if a stable fixture exists; otherwise mark PARTIAL with exact code evidence.

## Step 9 — Luo River lifetime

Determine its lifetime from actual continuation semantics, not card name. Repeated Judgements must not accidentally recreate roots or strand an envelope. Replacement must remain attached and loop end must settle correctly.

If the current engine does not make the boundary authoritative enough to decide, mark PARTIAL instead of guessing.

## Step 10 — delayed Lightning lifecycle

Cover both resolution branches.

For a damaging result:
- delayed activation is a fresh Interaction;
- Judgement/result stays attached;
- resulting synchronous Damage stays causally attached according to the established Frame rule;
- do not clear before synchronous damage work finishes.

For a transfer result:
- activation Interaction settles;
- no envelope survives into a future turn;
- transferred card remains in Judgement Zone;
- later activation gets a fresh interactionId.

Do not solve the Dying presentation barrier in this task.

## Step 11 — settlement, reconnect and stale safety

Envelope clears only when the root and all synchronous work are settled.

Prove where practical:
- ordinary delayed Judgement clears at completion;
- Cavalry does not clear Attack on resume;
- Damage-related Judgement does not clear unresolved Damage parent;
- Luo River does not strand authority;
- delayed damaging resolution does not clear prematurely;
- future activation never revives a cleared Interaction.

For at least one delayed and one synchronous Judgement:
- repeated GET preserves interaction/frame/checkpoint/revision;
- second viewer sees the same public envelope;
- private choices stay private through CurrentAction;
- stale/duplicate replacement cannot duplicate causal transition or consume a replacement twice;
- reads do not advance presentationRevision.

## Step 12 — legacy/malformed safety

Reach a real Judgement continuation, then set only `causal_envelope_json` to NULL/malformed via test DB seam.

Continue and assert:
- no 500;
- public envelope remains null;
- no identity is reconstructed from continuation/resolution/event/card/log data;
- legacy gameplay resumes where supported;
- a later genuinely new delayed activation can create a fresh root.

SQL mutation is allowed only for corruption/legacy evidence, never normal root proof.

## Step 13 — exact FIX11 evidence matrix

Add exactly these rows:

| Requirement | Status | Exact evidence | Remaining gap |
| --- | --- | --- | --- |
| delayed activation starts fresh Interaction | ... | ... | ... |
| delayed activation never reuses placement Interaction | ... | ... | ... |
| delayed provenance/originRef is historical only | ... | ... | ... |
| delayed Judgement root exists before optional modifier | ... | ... | ... |
| no replacement actor creates no fake decision checkpoint | ... | ... | ... |
| replacement Pending actor matches envelope resolver | ... | ... | ... |
| Necromancy replacement stays same Judgement frame | ... | ... | ... |
| effective result preserves Judgement causal lifetime | ... | ... | ... |
| Judgement Negation does not create a second root | ... | ... | ... |
| counter-Negation remains same Judgement frame | ... | ... | ... |
| Cavalry Judgement preserves Attack interaction | ... | ... | ... |
| Cavalry resume returns to Attack causal context | ... | ... | ... |
| Damage-related Judgement preserves parent interaction | ... | ... | ... |
| Luo River repeated Judgement lifetime is authoritative | ... | ... | ... |
| delayed damaging result keeps synchronous damage attached | ... | ... | ... |
| delayed transfer settles activation Interaction | ... | ... | ... |
| transferred delayed card later activation gets fresh Interaction | ... | ... | ... |
| Judgement settlement clears only at true root settlement | ... | ... | ... |
| repeated read/reconnect preserves Judgement identity | ... | ... | ... |
| second viewer sees same public Judgement envelope | ... | ... | ... |
| stale/duplicate replacement cannot duplicate causal transition | ... | ... | ... |
| NULL/malformed Judgement does not reconstruct authority | ... | ... | ... |

Statuses: `PROVEN | PARTIAL | UNPROVEN | NOT IMPLEMENTED IN GAME`.

PROVEN requires named real API/engine evidence. Synthetic/manual envelope injection is not proof.

## Step 14 — documentation and audit

Add `### Judgement causal lifetime` to the C2 document. Document stable checkpoints, SAME_FRAME replacement, synchronous inheritance, delayed NEW Interaction, provenance-only originRef, settlement, and honest gaps.

Add one concise FIX11 README status paragraph.

Search every production occurrence of:
- Judgement continuation/entry/resume;
- causal root/child/resume/checkpoint helpers;
- resolutionId/revealedEventId around Judgement;
- `recoverCausalEnvelope`.

List every Judgement root creation, inherited entry, semantic transition, resume and clear site in the execution result.

## Step 15 — validation

Preserve FIX10 Negation, FIX9 Group/Duel, Attack ownership, Cavalry gameplay, Borrowed Sword, lethal Attack->Damage->Dying->rescue, existing Necromancy/Luo River/delayed-card behavior, and PresentationV2 tests.

Run focused Judgement, Ma Chao, Xiahou Dun/Sima Yi/Zhen Ji where available, Negation, causal, concurrency and PresentationV2 tests, then full:

```
npm run test:fast
npm run test:api
npm run build
npm run lint
git diff --check
```

Report exact commands/counts.

## Scope exclusions

Do NOT:
- start C3;
- redesign Judgement gameplay;
- solve Dying presentation barrier;
- solve unrelated Group nested Damage;
- migrate PresentationV2;
- modify React/CSS;
- create client causal IDs;
- infer causal identity from card names/logs/resolution/event IDs.

## Execution result format

Append only a `C2-FIX11 execution result` containing:
- branch and actual pushed full implementation SHA;
- files changed;
- Judgement path inventory;
- causal transport;
- delayed activation/provenance;
- Cavalry;
- Necromancy/replacement;
- Judgement Negation;
- Damage-related Judgement;
- Luo River;
- delayed-card lifecycle;
- settlement/reconnect/stale;
- legacy/malformed;
- exact FIX11 matrix;
- documentation/search audit;
- exact validation commands/counts;
- remaining C2 work.

Push implementation + appended result to `origin/ux-v2` and STOP.

## Acceptance criteria

FIX11 passes only if:
- delayed activation starts a fresh authoritative Interaction before optional responses;
- old placement Interaction is never reopened;
- provenance is not causal parenthood;
- synchronous Judgement preserves unresolved parent Interaction;
- replacement modifies the same Judgement Frame/context;
- Judgement Negation cannot create a second root;
- replacement/Negation actor aligns with envelope resolver;
- internal scans do not create fake checkpoints;
- Cavalry resumes Attack without losing/recreating identity;
- delayed damage/transfer cannot strand or incorrectly reuse an Interaction;
- settlement happens only at true root completion;
- reconnect/viewer/stale behavior is stable;
- legacy/malformed state never fabricates authority;
- evidence is honest and real-flow based;
- validation passes;
- no C3/UI work begins.
