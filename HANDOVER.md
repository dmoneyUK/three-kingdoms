# WTK UX V2 — Current Task Handoff

## Reviewer status

UX2.0C2-FIX13 is **ACCEPTED**.

Reviewed implementation: `37cc4b595ebd6c83c4325a662239b4f1bd04cbc1`.
Verification report: `0d0e8f23237215336ab8c03074926d200d12ceb3`.

Accepted: the exact transferred Lightning survives Alice to Bob, Alice's activation settles, Bob later activates that same card with a fresh interaction/frame and no parent frame, repeated reads are stable, and the card is not duplicated. Validation: focused 51/51, fast 108/108, API 234/234, build/lint/diff-check pass. Historical delayed originRef remains PARTIAL; synchronous Judgement-Negation parent restore remains runtime UNPROVEN.

C2 remains open. Do not start C3.

---

# NEXT TASK — UX2.0C2-FIX14: Group-Nested Damage Child Frame

## Objective

Implement and prove the next C0 gap: when a Group participant launches an independently resolving Damage effect, Damage must run as a child frame of the Group frame in the same Interaction, then resume the exact Group parent once.

Required model: Group frame FG is GROUP_RESOLUTION. Damage frame FD has the same interactionId, stage DAMAGE, and parentFrameId=FG. While Damage is unresolved FD is active. On settlement, return to FG with one semantic resume checkpoint/revision and continue the exact Group order.

Do not start C3 or solve the Dying presentation barrier.

## Work

1. Audit real Group paths that can launch Damage: Barbarian Invasion, Hail of Arrows, response failure, and trigger/provider Damage while Group continuation is unresolved. Record entry, participant, Damage call, causal handle, envelope behavior and resume destination. Choose the smallest stable real API path that genuinely has independent settlement/resume semantics.

2. Reuse the existing child-frame and parent-resume primitives. Carry only typed server-owned causal context. No full envelope in Pending; no IDs inferred from resolution/event IDs, card names or logs; no hidden carrier; no normal-path authority recovery; NULL/malformed authority is never reconstructed.

3. At the real independent Damage boundary create exactly one FD, preserve the Group interactionId, set parentFrameId=FG and stage DAMAGE, make FD active, and give it the real Damage source/target origin/current state. Do not create a child merely for HP arithmetic.

4. While the child blocks, Damage Pending/Continuation causal context must point to FD. The Group continuation must retain parent context. Any CurrentAction actor must match the child resolver. Public envelope contains FG+FD.

5. At true child settlement switch FD back to the original FG without recreating it. Keep the interactionId, restore GROUP_RESOLUTION and the exact participant/remaining order, and advance exactly one semantic parent-resume checkpoint/revision.

6. Mandatory real multi-participant fixture: participant A resolves/responds; participant B fails and launches nested Damage; Damage child resolves; Group resumes; participant C is processed afterward. Prove one interactionId, stable FG, distinct FD, FD.parentFrameId=FG, active frame FG->FD->FG, B exactly once, C exactly once/in order, and root clears only after all participants finish.

7. If a real nested Damage path exposes damage_suffered/source-consequence/another blocking choice, prove Pending causal points to FD and resolver matches CurrentAction. Otherwise mark this PARTIAL with exact code evidence; do not invent gameplay.

8. If nested Damage naturally enters Dying, only prove the Group parent is not lost and interactionId remains. Do not implement the Dying presentation barrier. Mark PARTIAL if this would broaden scope.

9. Where a real child command boundary exists, prove stale/duplicate commands cannot create a second child frame or duplicate Damage. If unavailable, mark PARTIAL honestly.

10. NULL/malformed test: corrupt only causal envelope storage during a real Group continuation, continue into Damage, and prove no 500, no authority reconstruction and no fake child frame.

11. During active child, repeated GET and a second viewer must preserve the same public interaction/FG/FD/active frame/checkpoint/revision. After child settlement FG resumes once; after final Group settlement envelope clears.

## Exact FIX14 matrix

Include exactly these rows with PROVEN/PARTIAL/UNPROVEN/NOT IMPLEMENTED IN GAME:

- real Group participant launches independently resolving Damage
- nested Damage preserves Group interactionId
- nested Damage creates one child frame
- Damage child parentFrameId equals Group frameId
- activeFrameId switches Group -> Damage child
- child Pending/Continuation causal points to Damage frame
- blocking child actor matches envelope resolver
- child settlement resumes original Group frame
- parent resume creates one semantic checkpoint/revision
- Group participant is not duplicated/skipped after resume
- multi-participant Group order survives child Damage
- Group root settles only after all participants finish
- nested Damage -> Dying does not lose Group parent
- stale/duplicate child decision cannot duplicate frame/Damage
- repeated read preserves active child identity
- second viewer sees same public child envelope
- NULL/malformed Group->Damage never reconstructs authority

PROVEN requires named real API/engine evidence.

## Documentation and audit

Update `docs/UX_V2_0C2_CAUSAL_PROPAGATION.md` with Group-parent/Damage-child semantics, child creation boundary, parent resume boundary, participant-order invariant, settlement and honest gaps. Add one concise README FIX14 paragraph.

Search and report GroupContinuation, Barbarian Invasion, Hail of Arrows, Damage entry helpers, child-frame/resume helpers, Group resume paths and authority-recovery calls. List each production Group->Damage child creation and parent-resume site.

## Validation

Preserve FIX13 Lightning, FIX12 Judgement, FIX10 Negation actor alignment, FIX9 Group/Duel Negation, Attack ownership, Borrowed Sword child/resume, lethal Attack->Damage->Dying->rescue and PresentationV2.

Run focused Group/Barbarian/Hail/Damage/concurrency/causal/PresentationV2 tests, then `npm run test:fast`, `npm run test:api`, `npm run build`, `npm run lint`, and `git diff --check`. Report exact commands/counts.

## Scope exclusions

Do not start C3; implement historical originRef; invent synchronous Judgement-Negation parent gameplay; solve the Dying presentation barrier; generalize every independent Damage root; migrate PresentationV2; modify React/CSS; or redesign Group gameplay/order.

## Execution result

Append only a C2-FIX14 execution result with branch/full implementation SHA, files changed, path inventory, child creation, causal transport, parent resume, multi-participant proof, blocker/Dying/race/NULL evidence, reconnect/viewer proof, exact matrix, docs/search audit, exact validation results, and remaining C2 work. Push implementation plus appended result to origin/ux-v2 and STOP.

## Acceptance

FIX14 passes only if a real Group Damage path proves same Interaction, distinct child Damage frame parented to Group, child active while unresolved, child causal context, exact one-time parent resume, no participant duplication/skip, root alive until final settlement, stable reconnect/viewer state, no malformed-state reconstruction, honest evidence, green regressions, and no C3/UI work.
