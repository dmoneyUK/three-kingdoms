# WTK UX V2 — Current Task Handoff

## Reviewer status

UX2.0C2-FIX12 is **PARTIAL / NOT ACCEPTED**.

Reviewed implementation commit:
`ca3e2277d2280c1f0cbcba394782063092a649f7`

Do not start C3.

## Accepted from FIX12

Preserve these changes:

- the stranded top-level delayed-Judgement `NEGATION` envelope is fixed;
- successful delayed Judgement Negation now clears the completed root;
- a real two-card Judgement Negation/counter-Negation fixture proves one Interaction/Frame;
- real delayed placement -> later activation proves fresh activation IDs for the same Overindulgence card;
- the standalone envelope-only write in `beginJudgementResolution()` was removed;
- real Necromancy stale/duplicate replacement race was added;
- Stauchness now has direct Damage-parent causal evidence;
- NULL/malformed non-reconstruction remains intact;
- reported validation is green: fast 108/108, API 234/234.

## Blocking review finding

The Lightning transfer evidence is invalid for the requirement it claims to prove.

In test:

`Lightning transfer settles its activation before a later fresh activation`

the first physical Lightning is:

`transfer-first`

and is correctly transferred from Alice to Bob.

But before the supposed "later activation", the test creates a **different card**:

`transfer-later`

and calls:

`setJudgement(bobPlayer.id, [laterLightning])`

This replaces the actually transferred `transfer-first` card in Bob's Judgement Zone. The test therefore proves only that an unrelated newly injected Lightning can later create a fresh root. It does **not** prove:

> the same transferred persistent Lightning settles activation A, survives in Bob's Judgement Zone, and later activates as a fresh Interaction B.

Consequently these FIX12 claims remain PARTIAL:
- Lightning transfer clears first activation and preserves the persistent card into the next lifecycle: first half proven;
- **transferred Lightning later activation gets fresh interactionId: NOT PROVEN**;
- persistent delayed-effect provenance across transfer remains unproven;
- README/C2 wording saying this requirement is closed is too strong.

## Secondary review note

`JudgementNegationCausalResume.kind === "parent"` is currently a typed branch but production search shows only `{ kind: "root" }` is constructed by `startJudgementNegation()`. Do not claim a real synchronous-parent Judgement-Negation restore path unless a production entry actually constructs `kind: "parent"`.

The next task is intentionally very small. Fix the invalid transfer proof and documentation. Do not broaden it into another Judgement rewrite.

---

# NEXT TASK — UX2.0C2-FIX13: Prove the Same Transferred Lightning Gets a Fresh Activation Interaction

## Objective

Close one specific evidence hole:

> The exact physical Lightning card transferred from player A's Judgement Zone to player B's Judgement Zone must later activate from B's Judgement Zone in a NEW Interaction, after A's activation Interaction has settled.

Do not substitute a new Lightning card.
Do not use `setJudgement()` to replace the transferred card after transfer.
Do not start C3.

## Step 1 — fix the existing transfer test, do not add a fake parallel proof

Rewrite:

`Lightning transfer settles its activation before a later fresh activation`

Use one physical card ID for the entire lifecycle, for example:

`transfer-persistent`

Required real sequence:

```
Lightning transfer-persistent exists in A Judgement Zone
-> A delayed activation starts Interaction IA
-> real gameplay outcome transfers that exact card to B
-> IA settles and causalEnvelope becomes null
-> verify B Judgement Zone contains exact card id transfer-persistent
-> progress/set only turn/phase/deck/hand prerequisites as necessary
-> DO NOT replace B judgement_json
-> B later draw/Judgement processing activates transfer-persistent
-> capture Interaction IB
```

It is acceptable for test setup to move the turn/phase forward deterministically, but the delayed card itself must remain the exact transferred persisted object produced by the first API flow.

## Step 2 — assert physical-card continuity

Immediately after transfer capture the full transferred card from the public/player state and, where useful, persisted `judgement_json`.

Before B activation assert:
- B still owns the exact transferred card ID;
- card kind is Lightning;
- no test helper replaced/reinserted it;
- A no longer has it.

After B activation starts assert the activation/timeline references that same card ID.

The test must fail if someone changes the second activation back to a newly injected Lightning.

## Step 3 — assert causal discontinuity across the persistent-card continuity

For activation A capture:
- interactionId IA;
- frameId FA;
- origin;
- parentFrameId.

After transfer:
- `causalEnvelope === null`;
- no old Pending remains;
- card persists in B Judgement Zone.

For activation B capture:
- interactionId IB;
- frameId FB;
- origin;
- parentFrameId.

Assert:
- `IB !== IA`;
- `FB !== FA`;
- B root `parentFrameId === null`;
- B root origin source/target is B according to current delayed-activation model;
- B root effect is Lightning;
- same physical card ID is the activated delayed card;
- repeated GET preserves IB/FB/checkpoint/revision.

This is the distinction we need:

```
persistent gameplay object continuity != causal Interaction continuity
```

## Step 4 — settle the second activation

Finish B's activation using real gameplay.

Assert:
- no resurrection of IA/FA;
- final envelope settles/continues according to the real Lightning outcome;
- no duplicate Lightning exists in Judgement Zones/discard;
- the same card appears in exactly one legal final location.

Do not change Lightning rules to make the fixture easier.

## Step 5 — audit the test for forbidden replacement

Before commit run:

```
rg "transfer-first|transfer-later|transfer-persistent" tests/api/stratagems.test.mjs
```

For the FIX13 fixture there must be:
- one persistent Lightning card creation;
- no `setJudgement(bobPlayer.id, [newLightning])` after transfer;
- no SQL replacement of Bob's `judgement_json` after transfer.

Report this audit explicitly.

## Step 6 — correct the evidence matrix/documentation

Update `docs/UX_V2_0C2_CAUSAL_PROPAGATION.md`.

Only after the corrected real test passes may these rows be PROVEN:
- Lightning transfer clears first activation envelope;
- transferred Lightning later activation gets fresh interactionId.

Evidence must name the corrected same-card fixture.

Keep historical delayed `originRef` as PARTIAL unless a typed implementation actually exists. Fresh interaction identity does not by itself prove historical originRef.

Update README so it says:
- same physical transferred Lightning now has fresh later activation identity, if proven;
- historical originRef remains PARTIAL;
- Group-nested Damage and Dying presentation work remain outside this slice.

## Step 7 — audit `causalResume.parent` claims

Search:

```
rg "causalResume" app game tests docs README.md
```

If no production path constructs `{ kind: "parent" }`:
- keep the type/defensive branch if useful;
- document it as reserved/unproven;
- do not describe synchronous Judgement-Negation parent restore as runtime-proven.

Do not invent a fixture or gameplay path merely to exercise it.

## Step 8 — exact FIX13 evidence table

Add:

| Requirement | Status | Exact evidence | Remaining gap |
| --- | --- | --- | --- |
| exact transferred Lightning card persists A -> B | ... | ... | ... |
| A activation Interaction settles before B activation | ... | ... | ... |
| B activates the same transferred physical card | ... | ... | ... |
| B activation gets fresh interactionId/frameId | ... | ... | ... |
| B activation has no parent frame from A | ... | ... | ... |
| repeated read preserves B activation identity | ... | ... | ... |
| second activation settles without duplicating the card | ... | ... | ... |
| historical delayed originRef | ... | ... | ... |
| synchronous Judgement-Negation parent restore runtime evidence | ... | ... | ... |

Statuses:
`PROVEN | PARTIAL | UNPROVEN | NOT IMPLEMENTED IN GAME`.

## Step 9 — regression validation

Run the corrected focused Lightning/Stratagem fixture plus:
- Judgement Negation/counter;
- delayed placement -> activation;
- no-responder delayed Judgement;
- Necromancy replacement race;
- Stauchness parent resume.

Then:

```
npm run test:fast
npm run test:api
npm run build
npm run lint
git diff --check
```

Report exact counts.

## Scope exclusions

Do NOT:
- start C3;
- redesign Lightning;
- implement broad originRef infrastructure;
- solve Group nested Damage;
- solve Dying presentation barrier;
- migrate PresentationV2;
- modify React/CSS;
- change unrelated causal code unless the corrected same-card fixture exposes a real production defect.

## Execution result format

Append only:

```
---

## C2-FIX13 execution result — <date>

Branch:
Implementation commit:
Files changed:

### Same-card Lightning lifecycle
...
### Causal identity proof
...
### Card continuity/final-location proof
...
### Forbidden-replacement audit
...
### causalResume.parent audit
...
### Exact FIX13 table
...
### Documentation
...
### Validation
...
### Remaining C2 work
...
```

Push implementation + appended result to `origin/ux-v2` and STOP.

## Acceptance criteria

FIX13 passes only if:
- the exact card transferred from A is later activated by B;
- no helper replaces/reinserts that card between transfer and activation;
- A activation is fully settled before B activation;
- B activation has a fresh interactionId/frameId and no parent frame from A;
- repeated read is stable;
- second lifecycle settles without duplicating the physical card;
- documentation no longer overclaims originRef or unused parent-resume runtime evidence;
- full validation passes;
- no C3/UI work begins.
