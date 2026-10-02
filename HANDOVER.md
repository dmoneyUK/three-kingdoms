# WTK UX V2 — Current Task Handoff

## Reviewer status

UX2.0C2-FIX15 is **CODE-ACCEPTED / C2 CLOSURE VERIFICATION INCOMPLETE**.

Reviewed implementation:
`ba75dbf9e8352ea3829faaf398192bd5174dc6c4`

Reviewed report-record commit:
`9836cc867341a510f5af045e1dc302113cdad427`

### Reviewer findings

The production changes and focused evidence are consistent with the FIX15 objective:

- the failed Attack response-Judgement path now passes `response.causal` into `resolveSourcedDamage()`, preserving Attack causal authority;
- lethal Group Damage keeps the Damage child through Dying/Peach and explicitly restores the Group parent before Group progression resumes;
- real Raining Arrows lethal Damage -> Dying -> Peach -> Group continuation is covered;
- real Barbarian Invasion characterization proves the same Group Damage child boundary;
- historical delayed `originRef` is honestly deferred rather than fabricated;
- synchronous Judgement-Negation parent is correctly classified as NOT IMPLEMENTED IN GAME;
- no C3/UI/presentation-barrier work was started.

Focused causal/API validation is reported as **98 passed, 0 failed**.

However, the appended execution result does **not contain the results of the mandatory final validation commands**. It says those commands “are run after this handover entry is amended” and lists:
- `npm run test:fast`
- `npm run test:api`
- `npm run build`
- `npm run lint`
- `git diff --check`

but gives no final counts/status for them.

Therefore the implementation can be code-accepted, but C2 must not be formally closed until those final validations are recorded.

Do not change production code unless a validation failure proves a real defect. Do not start C3.

---

# NEXT TASK — UX2.0C2-FIX15-VERIFY: Run Final Validation and Close C2 Only If Green

## Objective

Verify the already-reviewed FIX15 implementation. This is a validation-only gate unless a test/build/lint failure reveals a real defect.

## Step 1 — sync exact branch

Run:
```
git fetch origin
git checkout ux-v2
git pull --ff-only origin ux-v2
git status --short
git rev-parse HEAD
```

Record the starting HEAD. Confirm it contains implementation `ba75dbf9e8352ea3829faaf398192bd5174dc6c4`.

## Step 2 — rerun focused causal suite

Run the same focused causal/API coverage used by FIX15, including:
- PresentationV2 engine;
- equipment / Eight Trigrams response-Judgement regression;
- Judgement;
- stratagems;
- Borrowed Sword;
- concurrency;
- presentation causality;
- FIX15 lethal Raining Arrows Group->Damage->Dying->Peach->Group;
- FIX15 Barbarian Invasion Group child characterization.

Report exact command and exact pass/fail count.

## Step 3 — mandatory full validation

Run all of these and report the actual result of each:

```
npm run test:fast
npm run test:api
npm run build
npm run lint
git diff --check
```

For test commands, record exact passed/failed totals. For build/lint/diff-check, record PASS/FAIL and relevant failure details if any.

Do not write “will run”, “to be run”, or merely list the commands.

## Step 4 — failure handling

If every validation is green:
- do not change production code;
- state exactly `C2 READY TO CLOSE — VERIFIED`.

If any validation fails:
- state `C2 NOT READY TO CLOSE`;
- identify the exact failing test/command;
- fix only if the failure is caused by FIX15 and the correction is small and directly evidenced;
- otherwise stop and report the blocker for reviewer follow-up.

Do not weaken/delete tests to obtain green status.

## Step 5 — final C2 boundary statement

If green, explicitly retain these deferred/non-blocking boundaries:
- historical delayed `originRef`: PARTIAL / intentionally unsupported because no stable typed historical provenance exists;
- synchronous Judgement-Negation parent: NOT IMPLEMENTED IN GAME;
- Dying presentation barrier: later milestone, not part of C2;
- C3: not started.

Confirm no logs/event IDs/card names/actionRevision are used to fabricate causal authority.

## Execution result

Append only a `C2-FIX15-VERIFY execution result` to this HANDOVER containing:
- branch and starting HEAD;
- focused command + exact result;
- `test:fast` exact result;
- `test:api` exact result;
- build result;
- lint result;
- diff-check result;
- whether any production files changed;
- deferred-boundary confirmation;
- exactly one closure line:
  - `C2 READY TO CLOSE — VERIFIED`, or
  - `C2 NOT READY TO CLOSE`.

Push the appended report to `origin/ux-v2` and STOP.

## Acceptance

C2 closes only if all mandatory final validation is actually executed and recorded green. Do not start C3 in this task.
