# WTK UX V2 — Current Task Handoff

## REMOTE HANDOVER RULE — MANDATORY

`HANDOVER.md` is a tracked remote coordination file.

It MUST be committed and pushed to `origin/ux-v2`.
Do NOT keep HANDOVER.md local-only.
Do NOT gitignore, untrack, revert, discard, or omit it from the pushed work.
After implementation, append the execution result to THIS file, commit it, push it to `origin/ux-v2`, verify the remote branch contains the appended result, then STOP.

## Reviewer status

UX2.0C3-01 is **PARTIAL — semantic role separation needs one correction**.

Reviewed implementation:
`5fcb891199bd0588ecb923f51d87581dba74ac9a`

Accepted:
- PresentationV2 now consumes the parsed authoritative C2 causal envelope.
- Group interactionId/groupFrameId/activeFrame/checkpoint/revision are projected from causal authority rather than logs/events/actionRevision.
- ordered Group targetIds come from the Group frame origin.
- Group -> Damage child keeps the Group parent available and resumes the same parent frame.
- nested Group Negation remains SAME_FRAME.
- NULL/malformed envelope does not fabricate causal identity.
- repeated/second-viewer public Group semantics are covered.
- real Raining Arrows, Barbarian Invasion and lethal Group/Dying/rescue fixtures are used.
- reported validation is green: projector 19/19; focused API 27/27; fast 110/110; API 238/238; build/lint/diff-check PASS.

### Blocking semantic defect

`groupPresentation()` currently computes:

`currentParticipantId = firstString(activeCurrent?.resolvingPlayerId, current?.resolvingPlayerId, group.activeParticipantId, group.currentParticipantId)`

This collapses the Group participant with the active child resolver.

That is not the C3-01 contract. The Group participant is the Group target currently being processed. During nested Damage/Dying, the active child resolver may be a trigger owner or Peach rescuer and can differ from the Group participant.

The implementation already exposes `decisionActorId` separately, but `currentParticipantId` can still switch to the child resolver because active-frame `resolvingPlayerId` has highest precedence.

The lethal Group -> Damage -> Dying fixture asserts stage/identity but does not assert that `currentParticipantId` remains the original Group participant while the Peach decision actor/resolver changes.

Therefore C3-01 cannot yet be accepted.

Do not start C3-02/C4/C5.

---

# NEXT TASK — UX2.0C3-01-FIX1: Preserve Group Participant Across Nested Child Resolvers

## Objective

Correct the semantic separation between:
- Group source;
- Group affected target set;
- current Group participant;
- active child source/targets/resolver;
- decision actor.

Do not redesign C2 causal identity. This should be a small projector/test correction.

## Step 1 — establish the authoritative Group participant source

Inspect the real typed Group continuation and Group parent frame across:
- normal Group response;
- Group -> Damage child;
- Damage -> post-damage trigger;
- Damage -> Dying;
- Peach rescue;
- return to Group.

Determine which existing authoritative field consistently identifies the Group participant currently being processed.

Prefer the Group parent frame's semantic current target/participant or typed Group continuation state. Do not derive it from logs, card names, event IDs, actionRevision, or the active child resolver.

Document the choice in the execution result.

## Step 2 — fix projector role separation

Change `groupPresentation()` so `currentParticipantId` means only:

**the Group participant/target currently being resolved by the parent Group interaction.**

It must NOT become:
- a Damage trigger resolver merely because the Damage child is active;
- a Peach rescuer during Dying;
- a Negation responder unless that player is also the Group participant.

Keep separate semantics for:
- `decisionActorId` = current CurrentAction actor;
- active child source/targets;
- if useful and already justified by the model, an explicit active child resolver field may be added, but do not overload `currentParticipantId`.

Do not create new causal authority.

## Step 3 — prove normal participant progression

Using a real Raining Arrows or Barbarian Invasion Group flow, prove:
- source remains source;
- targetIds remain the full ordered affected set;
- currentParticipantId is A while A is processed;
- then B when B is processed;
- then C when C is processed;
- interactionId and groupFrameId remain stable.

## Step 4 — prove nested Damage separation

For a real Group participant B that fails response and enters Damage child:
- currentParticipantId remains B;
- activeFrameId is the Damage child;
- activeTargetIds identify the Damage target;
- decisionActorId may equal B or another actor depending on the live decision;
- Group source/targetIds/groupFrameId remain unchanged.

If a post-damage trigger resolver differs from B, explicitly assert that difference.

## Step 5 — prove Dying/Peach separation

Extend the existing lethal Raining Arrows fixture.

At Dying:
- currentParticipantId must remain the Group participant who suffered the Group Damage;
- decisionActorId must equal the current Peach/rescue decision actor;
- when the rescuer is a different player, explicitly assert `currentParticipantId !== decisionActorId`;
- interactionId/groupFrameId remain the Group identities;
- active child remains the existing Damage/Dying causal child according to current C2 behavior.

After Peach rescue:
- projector returns to the exact Group parent frame;
- currentParticipantId advances to the next Group participant;
- no new Group interaction/frame is created.

This is the key acceptance regression.

## Step 6 — Negation separation

For nested Group Negation:
- SAME_FRAME remains unchanged;
- currentParticipantId must represent the Group participant if participant processing has begun;
- decisionActorId represents the Negation responder;
- do not let responder handoff rewrite Group participant semantics.

If initial pre-participant Group Negation genuinely has no current Group participant yet, project null rather than inventing one. Document/test the actual production state.

## Step 7 — public/viewer invariant

Repeat one second-viewer assertion where currentParticipantId and decisionActorId differ.

The public Group semantic fields must match between viewers; viewer-private options remain outside groupResolution.

## Step 8 — malformed compatibility

Retain C3-01 behavior:
- NULL/malformed causal authority => UNPROVEN/null causal identity;
- do not reconstruct identity/participant from logs/events/card names/actionRevision.

## Step 9 — tests and validation

Run focused projector + PresentationV2 engine tests, then:
- `npm run test:fast`
- `npm run test:api`
- `npm run build`
- `npm run lint`
- `git diff --check`

Report exact commands and exact pass/fail counts.

## Scope exclusions

Do not:
- modify React/CSS;
- implement visual Interaction Stage;
- implement the Dying presentation barrier;
- change gameplay rules;
- redesign causal identity;
- implement historical originRef;
- start C3-02/C4/C5;
- infer semantic roles from logs/events/card names/actionRevision.

## Execution result

Append only a `C3-01-FIX1 execution result` containing:
- full implementation SHA;
- files changed;
- authoritative source chosen for currentParticipantId and why;
- before/after semantic behavior;
- real A->B->C evidence;
- nested Damage role-separation evidence;
- lethal Dying/Peach role-separation evidence;
- Negation behavior;
- second-viewer evidence;
- malformed behavior;
- exact validation results.

Push implementation AND this appended HANDOVER result to `origin/ux-v2`.

Before stopping, run:
`git fetch origin`
and verify that `origin/ux-v2:HANDOVER.md` contains the `C3-01-FIX1 execution result`.

Then STOP.

## Acceptance

FIX1 passes only if `currentParticipantId` remains the parent Group participant across nested child resolvers, `decisionActorId` remains separately correct, Group identity/target context remains stable, real Dying/Peach and Negation cases prove the distinction, malformed state remains non-authoritative, and all regressions are green.

## C3-01-FIX1 execution result

- Full implementation SHA: `bc985397563d2e8c409ab0b843b1723a5ffe3924` (`fix: preserve Group participant across child resolvers`).
- Files changed: `game/presentation-v2.ts`, `tests/presentation-v2.test.mjs`, `tests/api/presentation-v2-engine.test.mjs`, and `README.md`.
- Authoritative source: `currentParticipantId` is taken from the Group parent frame when it has one current target; for a linked `DAMAGE` or `DYING` child, the child frame's authoritative target is used because it identifies the parent participant being processed, never the child `resolvingPlayerId`. A typed Group continuation owner is only the fallback for direct Group decisions. This preserves the parent participant while keeping `decisionActorId` from CurrentAction and `activeResolverId` from the active child frame separate.
- Before/after: before, active child `resolvingPlayerId` could replace the Group participant. After, Group participant, decision actor, active resolver, and active child targets are distinct projected fields.
- Real A->B->C evidence: the Raining Arrows engine flow now asserts the initial participant, the next participant after the nested Damage trigger declines, and the third participant after the next response declines. `interactionId` and `groupFrameId` remain stable across all three states.
- Nested Damage: the real Group Damage child keeps the Group participant equal to the Group continuation target, while `activeResolverId` comes from the active child; source, ordered `targetIds`, parent frame, and child `activeTargetIds` remain stable.
- Dying/Peach: the lethal Group fixture asserts the damaged Group participant remains `currentParticipantId`, while the different Peach decision actor is `decisionActorId`; after rescue, the exact Group parent resumes and advances to the next participant without a new Group identity.
- Negation: nested Group Negation remains `SAME_FRAME`; participant selection continues to use the parent Group/typed continuation semantics and never the Negation responder merely because that responder is active.
- Viewer/malformed: the second-viewer assertion confirms public Group semantics are equivalent while private options stay outside `groupResolution`; NULL/malformed envelopes remain `UNPROVEN`/null and no identity is reconstructed from logs, events, card names, or action revisions.
- Validation: projector `node --test tests/presentation-v2.test.mjs` 19/19; focused engine `GAME_TEST_FILES=tests/api/presentation-v2-engine.test.mjs ... node tests/run-tests.mjs` 23/23; `npm run test:fast` 110/110; `npm run test:api` 238/238; `npm run build` PASS; `npm run lint` PASS; `git diff --check` PASS.

Implementation and this tracked HANDOVER result must be pushed to `origin/ux-v2`. Stop here; do not start C3-02/C4/C5.
