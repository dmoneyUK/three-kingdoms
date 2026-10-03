# WTK UX V2 — Current Task Handoff

## REMOTE HANDOVER RULE
HANDOVER.md is tracked remote coordination state. Commit and push it to origin/ux-v2. After implementation append the result, push implementation and HANDOVER, fetch origin, verify origin/ux-v2:HANDOVER.md contains the result, then STOP.

**CLEANLINESS:** keep only this current task. Read docs/PLANNER_DEVELOPMENT_WORKFLOW.md.

# NEXT TASK — UX2.0UI-17: Semantic Scene Transition Contract

## Objective
UI-16 is accepted and closed. Introduce the first bounded transition layer that classifies changes between consecutive accepted PresentationClientView snapshots so later animation can react to semantic change without reading gameplay/timeline heuristics.

This task defines transition semantics and minimal DOM hooks only. Do NOT add visual animation yet.

## Locked transition hierarchy
Classify an accepted previous -> next presentation pair as exactly one of:
1. CONTENT_UPDATE — same interaction, same active frame/stage/focus identity; content/checkpoint may update.
2. FOCUS_UPDATE — same interaction/frame/stage, but proven current participant/active focus/decision actor changes.
3. FRAME_TRANSITION — same interaction, active frame or parent/child relation changes.
4. INTERACTION_TRANSITION — interaction starts, ends, or interactionId changes.
5. NONE — no semantic transition worth presenting.

The strongest applicable class wins in the order INTERACTION > FRAME > FOCUS > CONTENT > NONE.

## Authority rules
1. Use only accepted PresentationClientView / PresentationSnapshot semantic identities and continuity.
2. interactionId owns interaction continuity.
3. active/root/parent frame identity and continuity relation own frame transition.
4. proven participant/focus/decision identities own focus update.
5. checkpointId/presentationRevision may identify content progress but must not override stronger semantic classes.
6. actionRevision, timeline, actionPlayerId, turn owner, pending compatibility fields, card selection, HP-only changes, and local controls are not public transition authority.
7. Viewer-private differences must not change the public transition class.
8. REST -> interaction and interaction -> REST are INTERACTION_TRANSITION.
9. Fail closed to NONE when the pair is incoherent/unproven.

## Step 1 — inventory current semantic surfaces
Trace how Interaction Stage, Hero Focus, Reaction Chain, Dying handoff, seat roles, and local console consume PresentationClientView. Record which IDs/fields can truthfully classify each transition level.

## Step 2 — pure transition classifier
Add a pure helper/module, e.g. buildPresentationTransition(previous, next), returning a bounded model:
- kind;
- previous/next interactionId;
- previous/next frame identity where already exposed/proven;
- previous/next checkpointId/revision;
- optional reason enum based only on semantic comparison.

Do not store history in the server. Do not derive from timeline. Do not invent frame identity if PresentationClientView does not expose it; extend the client adapter only with already-present snapshot fields if needed.

## Step 3 — minimal client integration
Track only the immediately previous accepted public semantic view on the client and expose non-visual/scoped DOM hooks on the existing game/Interaction Stage surface, e.g. data-presentation-transition.

Requirements:
- no layout movement;
- no CSS animation/transition effects yet;
- no gameplay side effects;
- local-control-only changes do not emit public transition;
- reconnect/repeated identical snapshot yields NONE;
- first proven interaction after REST yields INTERACTION_TRANSITION.

## Step 4 — scenario proof
Use retained real semantic fixtures to prove classification for at least:
- ordinary same-checkpoint/repeated read -> NONE;
- checkpoint/content progress -> CONTENT_UPDATE;
- Duel responder handoff -> FOCUS_UPDATE;
- Group participant progression -> FOCUS_UPDATE;
- Negation responder/counter within same frame -> FOCUS_UPDATE or CONTENT_UPDATE according to proven identities;
- Damage -> Dying child frame -> FRAME_TRANSITION;
- Dying rescue -> parent resume -> FRAME_TRANSITION;
- interaction start/end -> INTERACTION_TRANSITION;
- unrelated new interactionId -> INTERACTION_TRANSITION;
- viewer-private CurrentAction/options difference -> same public transition classification.

## Step 5 — negative tests
Prove mutations only to timeline, actionPlayerId, turnSeat/isMyTurn, actionRevision/localControl, private hand/options, HP, compatibility Pending fields cannot promote a transition class.

Malformed/incoherent snapshot pairs must fail closed.

## Step 6 — docs
Update README, ROADMAP, and docs/UX_V2_INTERACTION_STAGE_DESIGN.md with the four-level transition contract and explicitly state that animation is NOT implemented in UI-17.

## Validation
Run focused presentation/client/mounted regressions plus retained UI-01..16 tests, then npm run test:fast, npm run test:api, npm run build, npm run lint, git diff --check. If local execution is unavailable, do not claim pass; report exact unrun status and any remote CI evidence actually inspected.

## Scope exclusions
No visual animation; no timers; no settlement animation; no gameplay/API action changes; no projector authority expansion; no server history; no Reaction Chain historical expansion; no topology redesign; no UI-11 pixel-gap claim.

## Execution result
Append only UI-17 result: SHA, files, semantic-surface inventory, classifier contract, scenario mapping, mounted integration evidence, negative authority tests, exact validation status/counts, remaining GAPs, next bounded recommendation. Push and verify remote HANDOVER, then STOP.

## Acceptance
Pass only if every emitted transition class is derived solely from proven public semantic identity/continuity, viewer-private changes cannot alter it, repeated/reconnect state is stable, stronger transitions dominate weaker ones, no animation/gameplay behavior is introduced, and unsupported pairs fail closed.

## UI2.0UI-17 Execution Result — 2026-10-03

Implementation SHA: `3f6fbf4` (`feat: add semantic presentation transitions`).

### Changed files

- `game/presentation-transition.ts` — added the pure bounded
  `buildPresentationTransition(previous, next)` classifier and runtime
  fail-closed semantic-pair validation.
- `game/presentation-client.ts` — exposed the already-proven snapshot
  `rootFrameId` and `activeFrameId` through `PresentationClientView`; REST
  remains identity-free.
- `app/page.tsx` — tracks only the immediately previous client semantic view
  and exposes `data-presentation-transition` on `GameRoom` and the existing
  Interaction Stage. No visual or gameplay behavior was added.
- `tests/presentation-client.test.mjs` — covers the pure hierarchy, semantic
  scenario mapping, private/legacy negative mutations, and malformed/
  `UNPROVEN` fail-closed pairs.
- `tests/active-skill-interactions.test.mjs` — adds mounted REST-to-interaction,
  private-only, and content-update DOM-hook coverage.
- `README.md`, `ROADMAP.md`,
  `docs/UX_V2_INTERACTION_STAGE_DESIGN.md` — document the UI-17 contract and
  explicitly leave animation unimplemented.

### Semantic-surface inventory and authority

Interaction Stage consumes the public stage/effect, interaction/checkpoint/
revision, frame and continuity identities, source/target scope, current
participant, decision actor, and active resolver. Hero Focus consumes the
proven current participant or active-target focus without creating authority.
Reaction Chain consumes only the proven Negation root/active facts in the same
public frame. Dying handoff consumes the proven dying participant, decision/
resolver identities, and parent/child continuity. Seat role projection uses
the same public source/target/participant identities; its viewer marker is
local-only. The local console remains CurrentAction/private capability UI and
is not transition authority.

The classifier hierarchy is `INTERACTION_TRANSITION` > `FRAME_TRANSITION` >
`FOCUS_UPDATE` > `CONTENT_UPDATE` > `NONE`. Interaction continuity uses
`interactionId`; frame changes use active/root/parent frame IDs plus continuity
and stage; focus changes use proven public participant/scope/decision/resolver/
source identities; checkpoint, presentation revision, and effect are content
progress only. The result is bounded to public previous/next identities and a
semantic reason; it stores no server history and reads no timeline or
gameplay compatibility fields.

### Scenario and negative proof

- Repeated same checkpoint/reconnect -> `NONE`.
- Checkpoint/revision/effect progress -> `CONTENT_UPDATE`.
- Duel responder, Group participant, and same-frame Negation counter changes
  -> `FOCUS_UPDATE`.
- Damage -> Dying child and Dying -> parent resume -> `FRAME_TRANSITION`.
- REST start/end and unrelated interaction IDs -> `INTERACTION_TRANSITION`.
- Timeline, action player, turn/isMyTurn, action revision/local control,
  private hand/options, HP, and Pending compatibility mutations do not promote
  a public class; malformed or `UNPROVEN` pairs return `NONE` with no exposed
  identity.

### Validation and remaining boundaries

Focused tests were updated but not run locally, and no local full tests,
build, lint, or diff check was run, per the project workflow. GitHub Actions
is the validation gate; CI status and workflow logs were not inspected, so no
remote pass is claimed. No animation, timer, settlement animation, gameplay
or API change, projector-authority expansion, server history, Reaction Chain
history, topology redesign, or UI-11 pixel-gap claim was introduced. The
existing browser/manual responsive GAP remains open.

Recommended next bounded task: reviewer-authorize a separate visual consumer
of `data-presentation-transition` (including motion/accessibility boundaries);
do not begin that work as part of UI-17.
