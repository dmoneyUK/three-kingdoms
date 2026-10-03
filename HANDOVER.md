# WTK UX V2 — Current Task Handoff

## REMOTE HANDOVER RULE — MANDATORY

HANDOVER.md is tracked remote coordination state. It MUST be committed and pushed to origin/ux-v2. Never keep it local-only, ignore, untrack, revert, discard, or omit it. After implementation append the execution result, push implementation + HANDOVER, git fetch origin, verify origin/ux-v2:HANDOVER.md contains the result, then STOP.

**HANDOVER CLEANLINESS RULE:** This file contains only the current task. Previous tasks, reviewer verdicts, completion summaries, and historical execution results must be removed when the Planner writes the next task. Git history and architecture docs preserve history; HANDOVER does not.

Read and follow `docs/PLANNER_DEVELOPMENT_WORKFLOW.md`.

---

# NEXT TASK — UX2.0C7-01-FIX1: Make PresentationSnapshot Public Authority Fail Closed Atomically

## Objective

Fix one bounded authority/coherence defect in the first `PresentationSnapshot` implementation.

The C7-01 implementation established the correct overall architecture and is accepted as a strong partial result, but reviewer inspection found that the snapshot can currently expose contradictory public authority when a proven scene and `stableBoundary` disagree.

Current production behavior in `game/presentation-snapshot.ts`:

- `isProvenScene(...)` can accept the scene;
- `identity`, `interaction`, and `decision` are then populated;
- `stableFor(...)` independently detects a mismatched/REST/reserved boundary and returns identity-free REST;
- the resulting snapshot can therefore contain **non-null authoritative identity/interaction/decision together with REST stable state**.

That is not an atomic fail-closed snapshot.

C7 must not hand future React two conflicting public truths.

## Required invariant

Public snapshot authority is one coherent unit.

For the first C7 contract:

### authoritative active snapshot

A public active snapshot may expose non-null:
- `identity`
- `interaction`
- `decision` as applicable
- non-REST stable boundary

only when the proven typed scene and accepted stable boundary are mutually coherent.

At minimum coherence requires:
- scene semantics = PROVEN;
- scene has valid interaction/checkpoint/revision/frame/stage proof already accepted by PresentationV2;
- stable boundary is not reserved SETTLEMENT;
- stable boundary is not REST;
- boundary interactionId == scene interactionId;
- boundary checkpointId == scene checkpointId;
- boundary presentationRevision == scene presentationRevision;
- CHOICE decisionActorId is coherent with the scene decision actor.

### fail-closed snapshot

If public scene/boundary coherence fails, the public snapshot must fail closed **atomically**:
- `identity = null`
- `interaction = null`
- `decision = null`
- `stable = identity-free REST`
- `settlement = null`
- `transitionEvents = []`

Do not preserve scene identity while only downgrading `stable` to REST.

`localControl` may remain a thin viewer-specific CurrentAction reference because it is not public semantic authority, but it must not recreate public identity.

## Step 1 — add a single coherence gate

Refactor composition so public authority is admitted by one explicit coherence decision before populating identity/interaction/decision/stable.

Do not add a second rules engine.

Prefer a small pure helper such as an accepted/coherent public scene-boundary check.

Do not infer missing values or repair mismatches.

## Step 2 — CHOICE actor coherence

For CHOICE:
- boundary decisionActorId must match the proven scene semantic decisionActorId;
- mismatch must fail closed atomically.

Do not silently replace a mismatched boundary actor with the scene actor and continue.

For SPECIAL, preserve the accepted semantics already supported by PresentationV2; do not invent a decision actor.

SETTLEMENT remains reserved and must fail closed to REST.

## Step 3 — focused negative tests

Extend `tests/presentation-snapshot.test.mjs` with explicit cases for at least:

1. proven scene + mismatched boundary interactionId;
2. proven scene + mismatched boundary checkpointId;
3. proven scene + mismatched boundary presentationRevision;
4. proven scene + CHOICE boundary decisionActorId mismatch;
5. proven scene + REST boundary;
6. proven scene + reserved SETTLEMENT boundary.

For every case assert the entire public authority fails closed:
- identity null;
- interaction null;
- decision null;
- identity-free REST;
- settlement null;
- transitionEvents empty.

Also assert localControl does not populate any public identity.

## Step 4 — preserve valid positive behavior

Keep positive tests proving a coherent real/typed CHOICE snapshot still exposes:
- exact scene identity;
- exact interaction;
- correct stable boundary;
- semantic decision;
- viewer-local control reference.

Do not weaken or delete the C7-01 real engine/API assertions.

## Step 5 — real API regression

Use at least:
- Attack/Dodge active CHOICE;
- one SPECIAL/non-REST scenario if a real accepted fixture currently exposes SPECIAL;
- terminal clear/REST.

Prove the route still emits the expected snapshot through the real projection path.

If no real SPECIAL fixture exists, do not manufacture one as positive evidence; document it as not exercised in this fix.

## Step 6 — documentation correction

Update `docs/UX_V2_INTERACTION_STAGE_DESIGN.md` C7 section and README so they state the atomic public-authority invariant.

Do not claim C7 closed until reviewer acceptance.

## Scope exclusions

Do not:
- change gameplay;
- redesign C1-C6 semantics;
- modify React/CSS;
- start UI migration;
- populate settlement;
- populate transitionEvents;
- generate IDs/revisions;
- reconstruct authority from CurrentAction/timeline/legacy fields;
- change legacy PresentationV2 semantics merely to satisfy the snapshot;
- perform unrelated refactors.

## Validation

Run:
- focused `tests/presentation-snapshot.test.mjs`;
- relevant real API snapshot fixture(s);
- `npm run test:fast`;
- `npm run test:api`;
- `npm run build`;
- `npm run lint`;
- `git diff --check`.

Report exact counts.

## Execution result

Append only the C7-01-FIX1 result to this HANDOVER.

Include:
- full implementation SHA;
- files changed;
- exact coherence gate implemented;
- all negative mismatch cases and assertions;
- real positive regression evidence;
- whether a real SPECIAL fixture was exercised;
- confirmation settlement/transitionEvents remain reserved;
- confirmation gameplay/React/CSS did not change;
- exact validation counts;
- whether C7-01 is ready for reviewer acceptance.

Push implementation + appended HANDOVER to `origin/ux-v2`, fetch, verify remote HANDOVER contains the result, then STOP.

## Acceptance

FIX1 passes only if no snapshot can expose non-null public semantic identity/interaction/decision while its stable boundary has failed closed to REST; CHOICE actor mismatch also fails closed; valid real snapshots remain unchanged; localControl cannot recreate public authority; reserved settlement/transition semantics remain unpopulated; and there is no gameplay/UI scope creep.

## Execution result — UX2.0C7-01-FIX1 atomic PresentationSnapshot authority — 2026-10-03

- Implementation SHA: `1f0721cb8d3ff1eef762404e894641583e2b22d8` (`fix(ux-v2): make presentation snapshot authority atomic`).
- Files changed: `game/presentation-snapshot.ts`, `tests/presentation-snapshot.test.mjs`, `tests/api/presentation-v2-engine.test.mjs`, `README.md`, and `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`.
- Exact gate: `coherentPublicAuthority` admits public identity, interaction, decision, and stable boundary only when the scene is proven, the boundary is neither `REST` nor reserved `SETTLEMENT`, all interaction/checkpoint/revision IDs match, and a `CHOICE` boundary actor matches the scene actor. Any failure returns one identity-free `REST` result. `localControl` remains an isolated CurrentAction reference.
- Negative coverage: mismatched `interactionId`, `checkpointId`, `presentationRevision`, and `CHOICE decisionActorId`, plus `REST` and `SETTLEMENT` boundaries. Every case asserts null identity/interaction/decision, exact identity-free REST, null settlement, empty `transitionEvents`, and localControl without public identity.
- Positive regression: focused typed CHOICE behavior remains covered; the real engine/API suite passed `24/24`, including active Attack/Dodge CHOICE projection and terminal REST behavior, with existing Borrowed Sword, Dying, Group/Damage, Duel, Negation, and Judgement projection checks preserved. No real SPECIAL fixture is currently exposed by the accepted API fixtures, so SPECIAL was not exercised and no synthetic positive claim was added.
- `settlement` and `transitionEvents` remain reserved (`null` and `[]`); no gameplay, React, or CSS changed.
- Validation: focused snapshot test `4/4`; `npm run test:fast` `128/128`; `npm run test:api` `239/239`; `npm run build` passed; `npm run lint` passed; `git diff --check` passed.
- C7-01-FIX1 is ready for reviewer acceptance.
