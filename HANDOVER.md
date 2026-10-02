# WTK UX V2 — Current Task Handoff

## REMOTE HANDOVER RULE — MANDATORY

`HANDOVER.md` is a tracked remote coordination file.

It MUST be committed and pushed to `origin/ux-v2`.
Do NOT keep HANDOVER.md local-only.
Do NOT gitignore, untrack, revert, discard, or omit it from pushed work.
After implementation, append the execution result to THIS file, commit it, push it to `origin/ux-v2`, run `git fetch origin`, verify `origin/ux-v2:HANDOVER.md` contains the appended result, then STOP.

## Reviewer status

UX2.0C3-01 + FIX1 is **ACCEPTED / CLOSED**.

Reviewed implementation:
- C3-01: `5fcb891199bd0588ecb923f51d87581dba74ac9a`
- C3-01-FIX1: `bc985397563d2e8c409ab0b843b1723a5ffe3924`

Accepted evidence:
- authoritative C2 causal envelope drives Group presentation identity;
- Group source and ordered affected target set remain distinct;
- `currentParticipantId` now represents the Group participant rather than the active child resolver;
- `decisionActorId` and `activeResolverId` are separate roles;
- real A -> B -> C Group progression keeps one interactionId/groupFrameId;
- nested Damage keeps parent Group context;
- lethal Group Damage -> Dying -> Peach keeps the damaged Group participant while a different Peach actor decides, then resumes the exact Group parent;
- nested Group Negation remains SAME_FRAME;
- second-viewer public Group semantics remain equivalent;
- NULL/malformed causal state remains UNPROVEN and does not fabricate causal identity.

FIX1 validation reported:
- projector: 19/19;
- focused PresentationV2 engine: 23/23;
- test:fast: 110/110;
- test:api: 238/238;
- build: PASS;
- lint: PASS;
- git diff --check: PASS.

Reviewer note:
FIX1 adds a recursive Pending fallback (`groupParticipantOwner`) only for Group participant semantic content. It does not create causal interaction/frame/checkpoint authority; those remain envelope-owned. Future C3 work should reduce ad-hoc Pending traversal by introducing a typed public semantic projection contract rather than expanding recursive inference.

Do not start C4/C5. C3 remains the active milestone.

---

# NEXT TASK — UX2.0C3-02: Formalize Typed Public Interaction Scene Projection

## Objective

Continue C3 by turning the currently Group-specific semantic fields into a typed, reusable public Interaction Scene contract inside PresentationV2.

This is projector/model/test/documentation work only.

The goal is NOT to migrate React yet. The goal is to establish one stable server-owned public semantic scene that a later client can consume without interpreting raw Pending, CurrentAction, timeline events, or causal-envelope internals.

Preserve the accepted C3-01 Group behavior exactly while making the public semantic boundary explicit.

## Step 1 — audit current PresentationV2 semantic duplication

Inspect:
- `game/presentation-v2.ts`;
- current `groupResolution`;
- `activeContext`, `parentContext`, `participants`, `decision`, `settlement`, and `transitionEvents`;
- `game/presentation-causality.ts`;
- C0 scene hierarchy in `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`;
- real C3-01/FIX1 Group fixtures.

Document which existing PresentationV2 fields are:
1. authoritative public semantic fields;
2. legacy compatibility fields;
3. viewer-private/control fields;
4. timeline/event-derived compatibility fields.

Do not delete legacy fields in this task.

## Step 2 — define a typed public Interaction Scene

Add a typed public semantic object to PresentationV2 (choose a clear name such as `interactionScene`; follow existing naming conventions if a better one already exists).

It must model the C0 hierarchy:

INTERACTION -> FRAME -> STAGE -> CHECKPOINT

At minimum expose, when causal authority is PROVEN:
- semantics/proven status;
- interactionId;
- activeFrameId;
- parentFrameId when applicable;
- checkpointId;
- presentationRevision;
- stage;
- public source actor;
- public effect identity;
- ordered public affected target IDs;
- current semantic participant/target;
- decision actor when public;
- active resolver when public;
- active source/targets for the current frame;
- continuity relationship needed to distinguish same-frame update vs child-frame transition.

Do not expose private hand/options or raw CurrentAction option payloads.

Do not copy the entire causal envelope into the scene.

## Step 3 — make causal authority explicit

Causal identity fields in the new scene must come only from the parsed authoritative causal envelope.

NULL/malformed envelope must never produce invented:
- interactionId;
- frameId;
- parentFrameId;
- checkpointId;
- presentationRevision.

Pending may provide typed semantic content only where already accepted/necessary, but it must not manufacture causal identity.

Do not use logs, event IDs, card names, phase, resolutionId, or actionRevision as causal identity.

## Step 4 — preserve Group semantics through the typed scene

Map the accepted C3-01/FIX1 Group contract into the new scene.

Prove for real Raining Arrows and Barbarian Invasion:
- source;
- effect;
- full ordered affected target set;
- current Group participant;
- decision actor;
- active resolver;
- stable interactionId/group parent frame;
- active child Damage frame;
- resume to same Group frame.

The existing `groupResolution` compatibility object may remain, but its semantic values should not diverge from the new typed scene.

Avoid two independent implementations of the same Group rules. Prefer one semantic projection source with compatibility fields derived from it.

## Step 5 — encode continuity level semantically

Using the C0 continuity model, make the scene distinguish at least:
- same-frame semantic/content update;
- child-frame transition;
- return/resume to parent frame;
- interaction transition/terminal absence.

Do not implement visual animations.

Do not derive continuity from actionRevision.

If the existing envelope lacks enough previous-state information to label a transition direction deterministically from one snapshot alone, do NOT invent it. Expose only snapshot facts that allow the client to compare revisions/frames, and document the limitation.

## Step 6 — Group Negation SAME_FRAME

Using real nested Group Negation/counter-Negation:
- interactionId stable;
- activeFrameId remains Group frame;
- stage becomes NEGATION as appropriate;
- no child frame appears;
- current Group participant semantics remain correct for the actual production point;
- decision actor/resolver semantics are separate;
- returning to GROUP_RESOLUTION does not create a new frame.

## Step 7 — Damage child and Dying characterization

Using real C3 fixtures:
- Group -> Damage: active child frame with parent Group frame retained;
- Group -> Damage -> Dying -> Peach: preserve the same Group context and accepted role separation;
- after rescue: exact Group parent resumes.

Do NOT implement the future Dying presentation barrier.
Do NOT broaden into C4.

The typed scene must accurately characterize current production state only.

## Step 8 — viewer/public boundary

Prove with two viewers during a state where decision actor differs from Group participant:
- the new public interaction scene is deep-equal between viewers;
- private options/cards are not embedded;
- viewer-specific CurrentAction controls remain outside public semantic identity.

If any proposed field is viewer-private, keep it outside the public scene.

## Step 9 — reconnect/stability

For unchanged authoritative state:
- repeated reads return deep-equal public interaction scene;
- checkpointId/presentationRevision remain stable;
- no IDs are regenerated by projection.

For semantic progression:
- projector reflects the authoritative checkpoint/revision already persisted by C2;
- projector itself does not increment identity/revision.

## Step 10 — malformed and legacy compatibility

Test:
- causal envelope NULL;
- malformed stored envelope;
- typed Group Pending still present while causal authority is unavailable.

Expected:
- new scene is absent or explicitly UNPROVEN according to the chosen typed contract;
- no causal identity fabricated;
- existing legacy compatibility fields continue to behave according to current contract;
- no crash.

## Step 11 — tests

Add focused pure-projector and real engine/API tests covering at minimum:
- Raining Arrows participant progression;
- Barbarian Invasion equivalent;
- Group SAME_FRAME Negation;
- Group -> Damage child;
- Group -> Damage -> Dying -> Peach -> Group resume;
- participant != decisionActor != activeResolver where production permits;
- second viewer;
- repeated read;
- NULL/malformed authority.

Tests must assert the new typed public scene itself, not merely `causalEnvelope` or old `groupResolution`.

## Step 12 — documentation

Update `docs/UX_V2_INTERACTION_STAGE_DESIGN.md` with:
- exact typed public Interaction Scene contract;
- field ownership/source;
- public vs viewer-private boundary;
- continuity semantics;
- legacy compatibility boundary;
- known later gaps.

README: concise current-stage update only.

Do not rewrite C0/C2 history.

## Step 13 — validation

Run focused PresentationV2/Group/Negation/Damage/Dying tests, then:
- `npm run test:fast`
- `npm run test:api`
- `npm run build`
- `npm run lint`
- `git diff --check`

Report exact commands and exact counts.

## Evidence matrix

Report PROVEN / PARTIAL / UNPROVEN / NOT IMPLEMENTED IN GAME for:
- typed public scene exists;
- causal IDs envelope-owned;
- source/effect/ordered targets correct;
- current participant separated from decision actor/resolver;
- Group participant progression stable;
- Group Negation SAME_FRAME;
- Damage child parent relationship;
- parent resume;
- Dying/Peach current-state characterization;
- second-viewer public equality;
- repeated-read stability;
- NULL/malformed non-fabrication;
- legacy compatibility does not diverge from typed scene.

## Scope exclusions

Do not:
- modify React/CSS;
- implement visual Interaction Stage;
- implement Dying presentation barrier;
- change gameplay rules;
- redesign C2 causal identity;
- implement historical originRef;
- start C4/C5;
- remove legacy PresentationV2 fields wholesale;
- infer causal identity from Pending/logs/events/card names/resolutionId/actionRevision.

## Execution result

Append only a `C3-02 execution result` containing:
- full implementation SHA;
- files changed;
- exact new typed scene contract;
- source/ownership of every semantic field;
- compatibility mapping;
- real fixtures used;
- evidence matrix;
- exact validation commands/counts;
- remaining C3 gaps.

Push implementation AND appended HANDOVER result to `origin/ux-v2`.

Then run `git fetch origin` and verify `origin/ux-v2:HANDOVER.md` contains the C3-02 execution result.

Then STOP.

## Acceptance

C3-02 passes only if PresentationV2 exposes a stable typed public Interaction Scene driven by authoritative causal identity, preserves accepted Group semantics and role separation, represents SAME_FRAME vs child-frame structure without fabricated transitions, remains viewer-invariant and reconnect-stable, does not leak private controls, does not fabricate identity for malformed/legacy state, and all regressions are green.

## C3-02 execution result

- Full implementation SHA: `419231d09acced82d6ab59af3a044b96e54734f9` (`feat: add typed public interaction scene`, rebased onto the latest remote HANDOVER baseline).
- Files changed: `game/presentation-v2.ts`, `tests/presentation-v2.test.mjs`, `tests/api/presentation-v2-engine.test.mjs`, `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`, and `README.md`.
- Typed public scene: **PROVEN**. `presentationV2.interactionScene` models the public Interaction -> Frame -> Stage -> Checkpoint snapshot with explicit semantics, causal IDs, source/effect/targets, participant/actor/resolver roles, active child context, and structural continuity.
- Causal IDs envelope-owned: **PROVEN**. `interactionId`, `rootFrameId`, `activeFrameId`, `parentFrameId`, `checkpointId`, and `presentationRevision` are populated only from a proven parsed envelope. NULL or malformed Group authority yields an explicit `UNPROVEN` scene with null causal IDs.
- Source/effect/ordered targets: **PROVEN** for real Raining Arrows and Barbarian Invasion. Group source/effect/ordered target values are computed once and used to derive both `interactionScene` and legacy `groupResolution`.
- Participant separation: **PROVEN**. `currentParticipantId`, `decisionActorId`, and `activeResolverId` remain distinct through nested Damage and Dying where production actors differ.
- Group progression: **PROVEN**. Real Raining Arrows covers A -> B -> C with stable interaction and parent-frame identity; repeated reads are deep-equal.
- Group Negation SAME_FRAME: **PROVEN**. Nested Group Negation keeps one active frame, projects `SAME_FRAME`, and returns to Group resolution without a new frame.
- Damage child and parent resume: **PROVEN**. Raining Arrows and Barbarian Invasion expose `CHILD_FRAME` with the Group parent retained, then resume the exact parent frame.
- Dying/Peach current-state characterization: **PROVEN**. The lethal Group fixture preserves the damaged participant while Peach decision ownership remains separate; the future Dying presentation barrier is not implemented.
- Viewer/public boundary: **PROVEN**. A second viewer receives deep-equal `interactionScene` public semantics; private CurrentAction controls/cards remain outside it.
- Repeated-read stability: **PROVEN**. Unchanged authoritative state returns deep-equal scene data and does not regenerate IDs or revisions.
- NULL/malformed non-fabrication: **PROVEN**. Legacy compatibility remains safe, while both missing and malformed stored causal authority keep the new scene `UNPROVEN`.
- Legacy compatibility: **PROVEN**. `groupResolution` remains present and is derived from the same semantic projection values as `interactionScene`; no legacy fields were removed.
- Continuity limitation: **DOCUMENTED / PARTIAL**. `CHILD_FRAME` and Group `NEGATION` `SAME_FRAME` are structural snapshot facts. A single snapshot cannot prove whether a root-frame observation is a same-frame update or a return from a child, so no transition direction or animation timing is invented.
- Validation: projector `node --test tests/presentation-v2.test.mjs` 19/19; focused engine `GAME_TEST_FILES=tests/api/presentation-v2-engine.test.mjs ... node tests/run-tests.mjs` 23/23; `npm run test:fast` 110/110; final `npm run test:api` 238/238; `npm run build` PASS; `npm run lint` PASS; `git diff --check` PASS.

Implementation and this tracked HANDOVER result must be pushed to `origin/ux-v2`. C3 remains active; do not start C4/C5 or React/CSS migration.
