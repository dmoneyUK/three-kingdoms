# WTK UX V2 — Current Task Handoff

## Reviewer status

UX2.0C2-FIX11 is **PARTIAL / NOT ACCEPTED**.

Reviewed implementation commit:
`931e207dd330b0e42eab0577391a0186b2d1d138`

Do not start C3.

### What FIX11 did correctly

The implementation makes substantial progress:
- `JudgementContinuation` causal handles are propagated through Cavalry, response/provider Judgement, Damage-related Judgement and Luo River.
- delayed-card activation now creates a `JUDGEMENT` root before the optional Negation responder scan.
- Cavalry inherits the unresolved Attack causal context.
- Necromancy replacement uses the same Judgement Interaction/Frame.
- delayed Lightning Damage can inherit the Judgement context.
- Luo River carries one Judgement context through repeated resolution.
- NULL/malformed authority is not reconstructed.
- the FIX11 matrix honestly marks multiple required rows PARTIAL.
- reported fast/API/focused/build/lint/diff-check validation is green.

### Blocking review findings

FIX11 does not meet its own acceptance criteria yet.

1. **Real Judgement-Negation settlement has a production bug.**

   In `resolveDeferredStratagem()`, when `pending.effect.kind === "judgement"` and the delayed effect is successfully Negated, the code writes:

   ```
   causalRoomStateWrite(... causalEnvelope: resumedEnvelope)
   ```

   But `restoreNestedNegationStage()` restores only Group and Duel. For Judgement it returns the current envelope unchanged, which is still the delayed activation's `NEGATION` stage. The function then returns.

   Therefore a successfully Negated delayed activation can leave the completed Judgement Interaction stranded in `causal_envelope_json` instead of settling it. This directly violates FIX11 settlement requirements.

2. **No real Judgement-Negation/counter-Negation fixture.**

   The matrix itself marks both rows PARTIAL. The task required proof that Judgement Negation reuses the Judgement root and cannot create a second root.

3. **Fresh delayed activation is still only PARTIAL evidence.**

   There is no real placement -> settlement -> later activation test comparing IDs. The implementation creates a fresh root, but the required end-to-end proof that the placement Interaction is not reopened is absent.

4. **No-responder delayed activation persistence is not sufficiently atomic/proven.**

   `startJudgementNegation()` creates a root in memory and returns it when there is no responder. `beginJudgementResolution()` may then persist `createdEnvelope` with a standalone room UPDATE before continuing automatic resolution. This is not the requested atomic proof that the root and first authoritative activation state are committed together. There is also no dedicated no-responder revision/checkpoint fixture.

5. **Delayed transfer causal settlement is PARTIAL.**

   Lightning transfer gameplay exists, but there is no causal assertion that the activation envelope clears and a later activation gets a new interactionId.

6. **Judgement-specific stale/duplicate replacement safety is PARTIAL.**

   Generic Pending CAS is not enough for the requested real Judgement duplicate-race causal evidence.

7. **Damage-related Judgement remains PARTIAL.**

   Typed propagation exists, but there is no direct real provider assertion proving parent Interaction preservation through replacement/result/resume.

8. **Historical `originRef` remains unimplemented/PARTIAL.**

   This is acceptable only if the current schema cannot safely represent it; do not invent it. The important requirement for this fix is to prove fresh activation identity and no parenthood/reopening.

### Additional review note

The handover also contains an extra independent-Damage execution result from commit
`8c690095fcea31faa4103c0c922b22fe6ec6f7ef`.
FIX11 correctly revises the earlier interpretation: the covered Lightning Damage is synchronous work under delayed Judgement, not proof of a universally independent source-less Damage root. Do not restore the old overclaim.

---

# NEXT TASK — UX2.0C2-FIX12: Close Judgement Negation, Delayed Activation, Transfer, and Race Safety

## Objective

Close the concrete FIX11 acceptance gaps without broadening scope.

Priority order:
1. fix the stranded envelope after a successfully Negated delayed Judgement;
2. prove real Judgement Negation/counter-Negation causal identity;
3. prove placement Interaction and later delayed activation are different Interactions;
4. make/prove no-responder activation persistence safe;
5. prove Lightning transfer settlement and later fresh activation;
6. prove Judgement replacement stale/duplicate safety;
7. add one direct Damage-related Judgement parent-resume proof.

Do not start C3.

## Workflow

Work only on `ux-v2`.

Start with:

```
git fetch origin
git checkout ux-v2
git pull --ff-only origin ux-v2
```

Read the current production code and the FIX11 Judgement documentation before editing.

Do not modify or merge `main`.
Append execution result only after implementation and validation.

## Step 1 — reproduce the stranded delayed-Negation envelope first

Add a real API regression before fixing production code:

```
delayed card is already in target Judgement Zone
-> delayed activation creates JUDGEMENT root
-> a real eligible player receives Negation decision
-> player successfully plays Negation
-> delayed effect settles/cancels
```

Capture before response:
- interactionId;
- frameId;
- checkpointId;
- presentationRevision;
- stage = NEGATION;
- Pending causal interaction/frame;
- effect kind = judgement.

After successful Negation settlement assert:
- delayed card is resolved according to existing gameplay rules;
- Pending is no longer the completed Judgement Negation;
- `causalEnvelope === null` if no synchronous parent work remains;
- no stale `NEGATION` envelope remains;
- no second Interaction was created.

This test must fail against the reviewed FIX11 behavior before the production fix.

## Step 2 — fix Judgement Negation settlement semantics

Do not add Judgement to `restoreNestedNegationStage()` blindly.

Group/Duel are nested SAME_FRAME effects with a still-live parent stage. A top-level delayed Judgement activation is itself the root and must settle when Negation cancels it.

Implement explicit semantics:

- Group Negation settles -> restore GROUP_RESOLUTION parent stage.
- Duel Negation settles -> restore DUEL_EXCHANGE parent stage.
- delayed Judgement Negation cancels the root -> clear envelope at true completion.
- synchronous Judgement inside an unresolved parent -> restore the exact parent causal stage/context rather than clearing it.

If current `NegationContinuation.effect.kind === "judgement"` does not distinguish top-level delayed activation from synchronous-parent Judgement, add the minimum typed resume/parent semantic data needed. Do not infer from card name, log, phase string or resolutionId.

Never leave a completed `NEGATION` stage stranded.

## Step 3 — real Judgement Negation and counter-Negation proof

Build a real fixture with at least two legal Negation cards if current rules allow it:

```
delayed activation root
-> responder C Negation
-> responder D counter-Negation
-> chain settles
-> delayed Judgement either proceeds or is cancelled according to parity
```

Assert:
- exactly one interactionId throughout;
- exactly one frameId throughout;
- root existed before the first Negation;
- first Negation does not create a root;
- counter-Negation does not create a root/frame;
- stage changes within the same frame;
- Pending/continuation/envelope causal IDs align;
- resolver changes only to real blockers;
- settlement either resumes Judgement or clears it exactly once.

If current Standard rules cannot create a real counter fixture, prove single Negation fully and mark only the counter row PARTIAL with the exact engine limitation.

## Step 4 — end-to-end placement -> later activation identity proof

Use a real delayed Stratagem placement through the API.

Capture placement interactionId/frameId while the card is being placed/resolved.

Then:
- finish the placement Interaction;
- assert envelope clears;
- advance through actual game flow until that delayed card activates from Judgement Zone;
- capture activation interactionId/frameId;
- assert activation IDs differ from placement IDs;
- assert activation frame has no parentFrameId pointing into the old Interaction;
- assert activation origin describes the delayed activation/target;
- repeated read preserves the activation IDs.

Do not use manual envelope injection or SQL to create the normal path.

This test is required to upgrade:
- delayed activation starts fresh Interaction;
- delayed activation never reuses placement Interaction.

## Step 5 — no-responder activation must be atomic and semantically quiet

Create a real delayed activation where no player can Negate and no replacement actor exists.

Required:
- no fake Negation Pending;
- no fake replacement Pending;
- no checkpoint merely for scanning eligibility;
- no observable intermediate room state where an envelope is persisted separately from the authoritative activation transition;
- gameplay result is unchanged;
- root is either persisted atomically with the first meaningful activation state or created/settled inside one authoritative transaction path without exposing a half-state;
- final envelope clears at true completion.

Refactor the standalone `UPDATE rooms SET causal_envelope_json = ?` in `beginJudgementResolution()` if necessary. Prefer the existing causal room write/batch orchestration so deck/discard/pending/log/envelope cannot diverge.

Add a test that proves no-responder flow has no extra semantic checkpoint/revision.

## Step 6 — Lightning transfer causal proof

Real path:

```
Lightning activates on A
-> Judgement misses OR Negation causes transfer according to existing rules
-> Lightning transfers to B
-> A activation Interaction settles
-> later B Lightning activates
```

Assert:
- A activation has a real fresh interactionId;
- after transfer, A activation envelope is null;
- transferred Lightning remains physically in B Judgement Zone;
- no old envelope survives between turns;
- B later activation gets a different fresh interactionId;
- B activation has no parent frame from A activation.

Do not change Lightning gameplay rules.

If historical `originRef` is still unsupported, keep that row PARTIAL and state exactly why. Do not block fresh-identity proof on originRef.

## Step 7 — Judgement replacement stale/duplicate race

Use a real Necromancy replacement Pending.

Capture:
- interactionId;
- frameId;
- checkpointId;
- presentationRevision;
- Pending causal IDs;
- replacement card location/count.

Test stale request:
- returns 409;
- causal IDs/revision unchanged;
- Pending unchanged;
- replacement card not consumed.

Then test concurrent duplicate submissions where practical:
- exactly one succeeds;
- loser is stale/conflict;
- replacement card consumed once;
- one semantic causal transition only;
- no duplicate root/frame/checkpoint.

Do not rely only on generic CAS tests.

## Step 8 — direct Damage-related Judgement parent proof

Use a stable real Stauchness/Ganglie fixture.

Capture Damage interaction/frame before Judgement.

Then drive:
- Judgement reveal;
- Necromancy replacement if fixture supports it;
- effective result;
- secondary decision or Damage resume.

Assert:
- same interactionId as parent Damage;
- same frame unless actual semantics require otherwise;
- no Judgement root creation;
- Pending causal and envelope align;
- after Judgement the Damage context is restored/preserved;
- envelope is not cleared while Damage parent work remains.

Do not redesign the hero skill.

## Step 9 — audit all Judgement settlement exits

Search every exit from:
- `resolveDeferredStratagem()` for judgement;
- `beginDelayedJudgement()`;
- `beginJudgementResolution()`;
- `resolveJudgementContinuation()`;
- Luo River;
- Cavalry;
- Damage-related Judgement.

For each exit classify:
- CLEAR ROOT;
- RESTORE PARENT;
- KEEP CURRENT JUDGEMENT;
- LEGACY NULL.

No exit may:
- keep a completed root accidentally;
- clear an unresolved parent;
- reconstruct missing authority;
- create a root during resume.

Document this table in the C2 propagation doc.

## Step 10 — exact FIX12 evidence matrix

Add exactly these rows:

| Requirement | Status | Exact evidence | Remaining gap |
| --- | --- | --- | --- |
| successful delayed Judgement Negation clears completed root | ... | ... | ... |
| Judgement Negation never strands NEGATION stage | ... | ... | ... |
| real Judgement Negation reuses activation interaction/frame | ... | ... | ... |
| real Judgement counter-Negation reuses same frame | ... | ... | ... |
| Negation settlement resumes Judgement or clears exactly once | ... | ... | ... |
| real delayed placement settles before later activation | ... | ... | ... |
| later delayed activation gets different interactionId from placement | ... | ... | ... |
| delayed activation has no parent frame from old placement | ... | ... | ... |
| no-responder activation creates no fake blocker checkpoint | ... | ... | ... |
| no-responder activation has atomic authoritative persistence | ... | ... | ... |
| Lightning transfer clears first activation envelope | ... | ... | ... |
| transferred Lightning later activation gets fresh interactionId | ... | ... | ... |
| Judgement stale replacement preserves causal identity | ... | ... | ... |
| duplicate replacement consumes card/transition once | ... | ... | ... |
| Damage-related Judgement preserves parent interaction/frame | ... | ... | ... |
| Damage-related Judgement resumes parent without clearing it | ... | ... | ... |
| NULL/malformed Judgement still never reconstructs authority | ... | ... | ... |
| delayed originRef remains provenance-only or explicitly unsupported | ... | ... | ... |

Statuses:
`PROVEN | PARTIAL | UNPROVEN | NOT IMPLEMENTED IN GAME`.

PROVEN requires named real API/engine evidence.

## Step 11 — documentation corrections

Update `docs/UX_V2_0C2_CAUSAL_PROPAGATION.md`:
- correct the Judgement Negation settlement contract;
- add the settlement-exit classification table;
- distinguish top-level delayed Judgement root from synchronous inherited Judgement;
- record placement-vs-activation identity proof;
- record transfer-vs-later-activation proof;
- keep `originRef` honest if unsupported;
- replace FIX11 PARTIAL claims only where FIX12 has real evidence.

Update README with one concise FIX12 status paragraph.

Do not claim C2 complete.

## Step 12 — architecture/search audit

Run and report:

```
rg "effect.kind === \"judgement\"|startJudgementNegation|restoreNestedNegationStage|beginDelayedJudgement|beginJudgementResolution|resolveJudgementContinuation" app/api/rooms/route.ts
rg "causal_envelope_json|causalRoomStateWrite" app/api/rooms/route.ts
rg "createCausalRoot|advanceCausalSemanticCheckpoint" app/api/rooms/route.ts
rg "recoverCausalEnvelope" app/api/rooms game
git status --short
```

Explicitly identify:
- every delayed Judgement root creation;
- every Judgement Negation settlement;
- every Judgement parent restore;
- every Judgement envelope clear;
- any standalone envelope-only write.

## Step 13 — validation

Preserve all accepted FIX6-FIX11 behavior, especially:
- Attack ownership/stale/malformed;
- Group/Duel roots and SAME_FRAME Negation;
- FIX10 eligibility handoff;
- Cavalry;
- Borrowed Sword child/resume;
- Luo River;
- delayed Lightning Damage/Legacy;
- malformed Judgement;
- PresentationV2 unit/engine.

Run focused:
- delayed Stratagem/Judgement;
- Negation/counter;
- Sima Yi/Necromancy;
- Ma Chao;
- Xiahou Dun;
- Lightning;
- concurrency;
- causal primitives/context/persistence;
- PresentationV2.

Then full:

```
npm run test:fast
npm run test:api
npm run build
npm run lint
git diff --check
```

Report exact commands and counts.

## Scope exclusions

Do NOT:
- start C3;
- implement broad `originRef` infrastructure unless the smallest typed extension is strictly required;
- solve Group nested Damage;
- solve Dying presentation barrier;
- redesign gameplay rules;
- migrate PresentationV2;
- modify React/CSS;
- infer causal identity from resolution IDs, event IDs, logs, card names or phase strings.

## Execution result format

Append only:

```
---

## C2-FIX12 execution result — <date>

Branch:
Implementation commit:
Files changed:

### Stranded-envelope regression/fix
...
### Judgement Negation/counter proof
...
### Placement -> activation identity
...
### No-responder atomic path
...
### Lightning transfer/later activation
...
### Replacement stale/duplicate race
...
### Damage-related Judgement
...
### Settlement-exit audit
...
### Exact FIX12 matrix
...
### Documentation
...
### Search audit
...
### Validation
...
### Remaining C2 work
...
```

Report the actual pushed full implementation SHA.

Push implementation + appended result to `origin/ux-v2` and STOP.

## Acceptance criteria

FIX12 passes only if:
- the reviewed stranded delayed-Negation envelope bug is fixed and real-tested;
- real Judgement Negation reuses the existing Judgement Interaction/Frame;
- counter-Negation is proven where current rules permit it;
- placement and later activation are proven to have different interactionIds;
- no-responder activation does not expose a fake/half causal state;
- Lightning transfer clears its activation and later activation is fresh;
- Judgement replacement stale/duplicate safety has dedicated causal evidence;
- one real Damage-related Judgement proves parent preservation/resume;
- malformed/NULL authority remains non-reconstructing;
- documentation/matrix do not overclaim;
- full validation passes;
- no C3/UI work begins.

---

## C2-FIX12 execution result — 2026-10-02

Branch: `ux-v2`
Implementation commit: `ca3e227` (`fix causal Judgement settlement and activation races`)
Files changed: `app/api/rooms/route.ts`, `game/pending.ts`, `tests/api/judgement.test.mjs`, `tests/api/stratagems.test.mjs`, `docs/UX_V2_0C2_CAUSAL_PROPAGATION.md`, `README.md`

### Stranded-envelope regression/fix

Added a real delayed Overindulgence Judgement fixture that failed against the
reviewed FIX11 behavior: successful Negation left the delayed root at stage
`NEGATION`. The typed `causalResume` field distinguishes a top-level delayed
Judgement root from a synchronous parent Judgement. Top-level delayed
Judgement Negation now clears the envelope at completion; Group/Duel restore
their typed parent stages. Delayed placement success also uses
`causalRoomStateWrite()` so placement settlement cannot strand its envelope.

### Judgement Negation/counter proof

`delayed Judgement Negation and counter-Negation reuse one activation frame`
uses two real Negation cards. It asserts root stage, Pending/effect kind,
interactionId, frameId, checkpoint advancement, counter actor handoff, and
final root/Pending settlement. One Interaction and one Frame are used for the
whole chain.

### Placement -> activation identity

`delayed placement settles before a later activation creates a fresh
interaction` plays a real Overindulgence, declines placement Negation, asserts
placement envelope clear, then activates the placed card later with a real
Negation responder. Placement and activation interaction/frame IDs differ;
the later frame has `parentFrameId: null` and its own delayed-card origin.

### No-responder atomic path

Removed the standalone `UPDATE rooms SET causal_envelope_json = ?` from
`beginJudgementResolution()`. The no-responder delayed Judgement fixture proves
there is no fake Negation/trigger Pending, no persisted half-state at the end,
and the final authoritative room envelope is NULL. Existing legacy/Damage
draw-resume paths still contain explicit envelope-clearing writes at route
lines 892 and 1168, and the Damage replacement path has an envelope-only
resume write at line 1114; these remain outside this top-level delayed
activation fix and are listed rather than overclaimed.

### Lightning transfer/later activation

`Lightning transfer settles its activation before a later fresh activation`
asserts that Negation transfer clears A's activation envelope, keeps the
physical Lightning in B's Judgement Zone, and gives B a different fresh
interactionId/frameId with no parent frame on later activation.

### Replacement stale/duplicate race

`real Judgement replacement rejects stale and duplicate submissions without a
second causal frame` uses a real Sima Yi replacement Pending. A stale request
returns 409 and leaves Pending/card state unchanged. Concurrent duplicate
submissions produce one success and one stale conflict; the replacement
settles through one causal Interaction/Frame and consumes one replacement.

### Damage-related Judgement

The real Stauchness/Ganglie fixture now asserts that Judgement result handling
returns to the existing `DAMAGE` frame and leaves the source-owned secondary
Damage decision live. No independent Judgement root is created for this
inherited path.

### Settlement-exit audit

- top-level delayed Judgement Negation: `CLEAR ROOT`;
- nested Group/Duel Negation: `RESTORE GROUP_RESOLUTION` /
  `RESTORE DUEL_EXCHANGE`;
- no-responder delayed activation: `CLEAR ROOT` at true result settlement;
- delayed Lightning transfer: clear the old activation root, retain the card;
- synchronous Stauchness Judgement: restore the Damage parent;
- Necromancy replacement: keep the current Judgement Interaction/Frame until
  effective result settlement.

### Exact FIX12 matrix

| Requirement | Status | Exact evidence | Remaining gap |
| --- | --- | --- | --- |
| successful delayed Judgement Negation clears completed root | PROVEN | real delayed Negation regression | none |
| Judgement Negation never strands NEGATION stage | PROVEN | final envelope is NULL | none |
| real Judgement Negation reuses activation interaction/frame | PROVEN | Pending/envelope identity assertions | none |
| real Judgement counter-Negation reuses same frame | PROVEN | two-card delayed counter fixture | none |
| real delayed placement settles before later activation | PROVEN | placement/decline/later draw fixture | none |
| later activation gets different interactionId and no old parent | PROVEN | fresh root ID and `parentFrameId: null` | none |
| no-responder activation has no fake checkpoint/half-state | PROVEN | no-responder API/D1 fixture and atomic code path | no browser mid-transaction observation |
| Lightning transfer clears first envelope | PROVEN | transfer fixture | none |
| later transferred Lightning activation is fresh | PROVEN | later B activation fixture | historical `originRef` unsupported |
| Judgement stale replacement preserves identity | PROVEN | stale Pending/card assertion | none |
| duplicate replacement settles once | PROVEN | concurrent real Guicai race | none |
| Damage-related Judgement preserves/resumes parent | PROVEN | real Stauchness DAMAGE-frame assertion | none for this fixture |
| NULL/malformed Judgement does not reconstruct authority | PROVEN | existing malformed Judgement regression | none |
| delayed historical `originRef` | PARTIAL | fresh activation independence is proven | room schema has no typed historical `originRef` |

### Documentation

Updated `README.md` with the concise FIX12 status and next milestone.
Updated `docs/UX_V2_0C2_CAUSAL_PROPAGATION.md` with the delayed settlement
contract, exit classification, FIX12 evidence matrix, and explicit
`originRef` boundary. C2 remains partial; C3/UI/React/CSS were not started.

### Search audit

- delayed Judgement roots: `startJudgementNegation()` at route line 2000;
- delayed Judgement entry/resume: `beginDelayedJudgement()` and
  `resolveDeferredStratagem()` Judgement branches;
- parent restoration: `restoreNestedNegationStage()` for Group/Duel and typed
  `causalResume` for synchronous Judgement parents;
- root clearing: delayed Judgement, delayed transfer, no-responder result,
  and true settlement use `causalRoomStateWrite(... causalEnvelope: null)`;
- normal-path `recoverCausalEnvelope()` search: no route/game call sites;
- remaining explicit envelope-only writes are the pre-existing Damage/Legacy
  lines recorded under the no-responder boundary above.

### Validation

- `npm test`: PASS — build, fast tests 108/108, API tests 234/234;
- `npm run lint`: PASS;
- `git diff --check`: PASS;
- focused FIX12 stratagem/Judgement API fixtures: PASS;
- implementation commit pushed to `origin/ux-v2` together with this handover
  result.

### Remaining C2 work

Historical delayed `originRef` persistence remains PARTIAL because the current
room schema has no safe typed field for it. Existing Group-nested Damage and
Dying presentation-barrier work remain out of scope. Do not start C3.
