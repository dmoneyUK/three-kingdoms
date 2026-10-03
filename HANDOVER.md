# WTK — Current Task Handoff

# NEXT TASK — BUG-ZHANG-LIAO-ASSAULT-01: Reproduce and Fix Real Draw-Phase Assault UI

## User-reported defect
Real game sequence: Draw Phase offers Assault; activate it; select two legal players; no Confirm button appears; clicking Assault again cancels the local selection; Zhang Liao then cannot successfully activate/resolve Assault.

Existing synthetic mounted coverage claims Confirm works, so it is insufficient and must not be used to dismiss this real defect.

## Reviewer findings
Server contract in game/capabilities/heroes/zhang-liao-assault.ts is Draw Phase replacement, target min 1/max 2, submitted by trigger with providerId zhang_liao_assault and targetIds. app/page.tsx routes it through activeSkillTargetSelection. A second click on an active target skill calls resetLocalTargetFlow(active-skill), matching the observed cancellation. tests/active-skill-interactions.test.mjs contains a synthetic Assault test expecting Confirm; identify which real API/presentation/busy/revision state that fixture misses.

## Objective
Reproduce the real Draw Phase state end-to-end, identify the exact state mismatch suppressing Confirm or invalidating the active skill, and make the smallest fix. Do not change Assault gameplay rules.

## Required work
1. Build a real API-backed Zhang Liao Draw Phase fixture through normal turn progression, not only a constructed GameRoom object.
2. Capture before activation, after activation, after first target, after second target, and after second Assault click: CurrentAction kind/actor/actionRevision/triggerOptions, Assault targetIds/min/max, presentation-busy inputs, active local skill state, console primary, and emitted actions.
3. Reproduce the missing Confirm in mounted/browser UI using the real projected room state. If not reproducible, identify the exact difference from the reported sequence; do not guess.
4. Fix only the root cause. Confirm must be visible during active Assault selection and enabled after 1 or 2 legal targets while the authoritative trigger remains current. Submission must remain exactly trigger with providerId zhang_liao_assault and targetIds.
5. Do not leave the player trapped after local cancellation. Explicit Cancel must send zero gameplay action and reactivation must work while the same CurrentAction remains authoritative. Prefer one clear Cancel surface over ambiguous double-cancel behavior.
6. Prove one-target and two-target submission, Cancel then reactivate, stale actionRevision fail-closed behavior, invalid target rejection, and zero draw/replacement action before Confirm.
7. Add a browser regression for the reported sequence if the browser harness can drive the API fixture; after two targets it must assert a visible enabled Confirm.
8. Run focused Zhang Liao tests, browser regression, test:fast, test:api, build, lint, and git diff --check. Report actual counts only.

## Scope
No Assault rule/target/random-card/draw-replacement changes, no causal/projector authority changes, no unrelated hero or UX redesign. Pause UI-20 closure until this functional defect is reviewer-accepted.

## Execution result
Append only this bug-fix result: root cause, reproduction evidence, SHA/files, behavior before/after, API/browser regression evidence, exact action payload, validation counts, remaining gaps. Push and verify remote HANDOVER, then STOP.

## Acceptance
Pass only if the real Draw Phase flow proves Confirm visible/enabled after legal target selection, exact Assault submission resolves, Cancel/reactivation cannot strand the skill, stale authority fails closed, and regression coverage goes beyond the old synthetic fixture.
