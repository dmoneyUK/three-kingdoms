# WTK UX V2 — Current Task Handoff

## REMOTE HANDOVER RULE — MANDATORY

`HANDOVER.md` is a tracked remote coordination file.
It MUST be committed and pushed to `origin/ux-v2`.
Do NOT keep it local-only, gitignore it, untrack it, revert it, discard it, or omit it from pushed work.
After implementation, append the execution result to THIS file, commit and push it to `origin/ux-v2`, run `git fetch origin`, verify `origin/ux-v2:HANDOVER.md` contains the result, then STOP.

## Reviewer status

UX2.0C3-04 is **ACCEPTED**.
UX2.0C3 is therefore **FORMALLY CLOSED / ACCEPTED**.

Reviewed implementation:
`1b7243e22dbba33ce5de383d29dde2ad6439edb3`

Accepted evidence:
- the real Ma Chao Cavalry Attack -> Judgement path is correctly characterized from production authority;
- `declaration.causal` is carried into Judgement;
- production re-stages the same active/root frame `ATTACK_RESPONSE -> JUDGEMENT -> ATTACK_RESPONSE`;
- no child frame or reconstructed history is invented;
- interaction/root/active-frame identity stays stable while checkpoint/stage/revision progress;
- the real engine test proves the Attack scene, Judgement scene, exact Dodge resume, viewer-equivalent public scene after resume, and terminal clearing;
- no projector change was necessary;
- the final C3 cross-family audit found no concrete legacy compatibility contradiction.

Accepted bounded limitations:
- historical delayed `originRef` remains PARTIAL and is not fabricated;
- a single snapshot exposes structural continuity, not directional animation history;
- Dying/Peach current state is characterized, but stable Dying presentation/barrier semantics belong to C4.

Reported validation:
- projector/causality: 29/29;
- focused API: 73/73;
- test:fast: 113/113;
- test:api: 238/238;
- build/lint/diff-check: PASS.

C3 is closed. Start C4 only. Do not start C5 or React/CSS migration.

---

# NEXT TASK — UX2.0C4-01: Dying / Peach Stable Presentation Barrier

## Objective

Implement and prove the first C4 slice: a server-side stable public Dying/rescue presentation boundary that React can later render without reconstructing rescue priority from transient Pending states.

Required semantic outcome:

When a player is Dying:
- the dying player remains the stable public focus;
- the original causal interaction/frame context remains authoritative;
- only a player who is genuinely blocking progress with a legal rescue decision is exposed as the current decision actor;
- automatic/ineligible rescue scans must not become presentation checkpoints;
- when one real rescuer declines and another real rescuer becomes blocking, preserve the same Dying scene/interaction and advance only the meaningful checkpoint/decision context;
- private Peach/card/provider options remain viewer-private.

This is server model/projector/orchestrator/test/documentation work only.
No React/CSS.

## Step 1 — inventory the real Dying engine flow

Trace production code for:
- `startDyingRescue`;
- `advanceDyingRescue`;
- Peach/rescue submission;
- skip/decline rescue;
- rescue priority/order;
- no-eligible-rescuer automatic progression;
- successful recovery;
- death/failure settlement;
- continuation back to parent Damage/Group/Attack interaction;
- any Dying-triggered skills that temporarily interrupt rescue.

Document which transitions are:
1. internal automatic scans;
2. real blocking player decisions;
3. meaningful public results;
4. final settlement/resume.

Do not derive this from logs or UI behavior.

## Step 2 — define the C4 stable Dying contract

Extend PresentationV2 with the smallest typed public semantic structure needed to represent a stable Dying barrier.

Prefer a dedicated typed projection attached to the existing `interactionScene`/PresentationV2 contract rather than a parallel rules model.

It must expose public facts only, sufficient to represent:
- dying player ID;
- current HP / rescue threshold only if already public and authoritative;
- original/root causal context through existing interaction/frame IDs;
- Dying stage/frame identity;
- current genuine blocking rescuer ID, or null when no player input is blocking;
- semantic state such as RESCUE_CHOICE / RESCUED / FAILED only when authoritative state supports it;
- checkpoint/presentation revision through existing causal authority.

Do not duplicate private Peach eligibility/options.
Do not create `canUsePeach` or card-specific UI legality fields.

If existing `interactionScene` fields already carry part of this, reuse them instead of duplicating them.

## Step 3 — define what constitutes a presentation barrier

The barrier must be semantic, never timer-based.

A stable rescue-choice checkpoint exists only when the engine is genuinely blocked for authoritative player input.

Prove that:
- ineligible players are skipped internally;
- dead players are skipped internally;
- players with no legal rescue action are not emitted as fake decision checkpoints;
- no “Waiting for P2 -> P3 -> P4” sequence appears merely because the engine scans P2/P3 before finding P4;
- the projected decision actor is the same public actor for every viewer at the same authoritative checkpoint.

Do not make the projector independently calculate Peach legality. The engine/CurrentAction remains authority.

## Step 4 — preserve Dying continuity across rescuer handoff

Create a real multiplayer engine/API fixture with:
- one dying target;
- at least two seats traversed by rescue priority;
- at least two genuine rescue decisions where practical;
- one rescuer declines/skips;
- another rescuer becomes the next blocking decision.

Assert:
- same `interactionId`;
- correct root/active/parent frame relationship;
- stage remains `DYING`;
- dying player remains the same;
- new meaningful checkpoint/revision when the blocking decision changes;
- decision actor changes from rescuer A to rescuer B;
- public Dying semantic object remains structurally continuous rather than clearing/recreating unrelated identity.

If current C2 uses a child Dying frame under Damage, preserve that exact production relationship.

## Step 5 — skip non-decisions

Add a real fixture where rescue priority passes over one or more players who cannot legally rescue before reaching a player who can.

The API-visible stable state must land directly on the real blocking rescuer.

Do not add checkpoints for non-decisions.
Do not use sleeps, fake delays, or client timing.

If current engine exposes intermediate API-visible states today, fix the orchestration boundary minimally so automatic scans complete before publishing the stable room state. Do not redesign unrelated gameplay.

## Step 6 — viewer privacy and equality

At a stable rescue checkpoint compare:
- dying player's viewer;
- acting rescuer's viewer;
- at least one uninvolved viewer when practical.

Assert the public Dying/interaction semantic object is deep-equal across viewers.

Only the acting rescuer may receive private rescue card/provider options in authoritative `CurrentAction`.

Other viewers may know the public decision actor but must not receive:
- Peach card IDs;
- private hand contents;
- private provider choices;
- concealed eligibility details.

## Step 7 — successful Peach rescue

Use a real Peach rescue path.

Prove:
- the Dying checkpoint is stable before submission;
- Peach submission produces the correct authoritative recovery;
- the rescue actor/action is not confused with the original effect source;
- after the player leaves Dying, the Dying barrier clears or resumes the parent interaction exactly according to production;
- no stale Dying scene remains after final recovery/resume;
- causal identity is not regenerated by the projector.

If further rescue is still required because HP remains at/below the rescue threshold, preserve the Dying interaction and advance to the next real decision instead of clearing early.

## Step 8 — decline-to-death / no-rescue settlement

Use a real path where rescue ultimately fails.

Prove:
- meaningful decline checkpoints only;
- final no-rescue/death outcome does not leave a stale RESCUE_CHOICE;
- Dying presentation reaches an authoritative terminal/cleared state according to current production;
- parent continuation/Group progression is resumed exactly once when applicable.

Do not invent a settlement model that the engine does not yet expose. Characterize the actual production boundary.

## Step 9 — nested/parent context characterization

Use the strongest existing Group -> Damage -> Dying fixture and one non-Group Damage -> Dying fixture if available.

Assert:
- Dying does not erase the original causal interaction;
- parent/root context remains available;
- active Dying semantics identify the dying player and current rescuer;
- returning from Dying does not fabricate a new root.

If a Dying-triggered child effect already exists in production, characterize it.
Do not create a new gameplay mechanic just to prove nested Dying.

## Step 10 — reconnect/repeated-read stability

At an unchanged rescue checkpoint:
- repeated reads are deep-equal for the public Dying semantic object;
- reconnect/read by the same viewer does not create new IDs/revisions;
- another viewer sees the same public causal facts.

No presentation identity may be generated during projection.

## Step 11 — malformed/fail-closed behavior

Add pure projector and/or API characterization for incoherent Dying authority:
- missing causal envelope;
- checkpoint/active-frame mismatch;
- Dying Pending that cannot be coherently tied to authoritative causal state.

The projector must not fabricate Dying interaction/frame/checkpoint IDs from:
- Pending alone;
- phase;
- HP;
- logs/timeline;
- actionRevision;
- card names;
- resolutionId.

If public Dying details can be shown without proven causal identity, mark them explicitly UNPROVEN under the established contract rather than synthesizing authority.

## Step 12 — C4-01 evidence matrix

Report PROVEN / PARTIAL / UNPROVEN / NOT IMPLEMENTED IN GAME for:
- Dying stable focus;
- first real rescue decision;
- skipping ineligible/non-decision seats;
- rescuer decline -> next real rescuer;
- same interaction across rescue handoff;
- meaningful checkpoint progression;
- viewer equality;
- private Peach/options isolation;
- successful rescue;
- multi-Peach/continued rescue if production supports it;
- no-rescue/death settlement;
- parent Damage/Group continuity;
- nested Dying-trigger child effect if production-supported;
- reconnect/repeated-read stability;
- malformed authority fail-closed behavior.

Do not overclaim unsupported production paths.

## Step 13 — documentation

Update `docs/UX_V2_INTERACTION_STAGE_DESIGN.md` with:
- implemented Dying barrier semantics;
- authoritative vs private boundary;
- checkpoint rules;
- rescue handoff behavior;
- evidence matrix;
- remaining C4 gaps.

README: concise current C4-01 status only.

Do not rewrite C0-C3 history.

## Step 14 — validation

Run focused PresentationV2/causality + Dying/Peach/Group/Damage tests, then:
- `npm run test:fast`
- `npm run test:api`
- `npm run build`
- `npm run lint`
- `git diff --check`

Report exact commands and counts.

## Scope exclusions

Do not:
- modify React/CSS;
- implement Interaction Stage visuals;
- implement animation timing;
- create client-side rescue legality;
- expose private Peach/card/provider information;
- redesign C2/C3 causal identity;
- fabricate historical `originRef`;
- add new gameplay mechanics solely for evidence;
- start C5;
- remove legacy PresentationV2 fields wholesale.

## Execution result

Append only a `C4-01 execution result` containing:
- full implementation SHA;
- files changed;
- exact production Dying/rescue flow inventory;
- new/changed PresentationV2 types;
- barrier rule and why it is engine-authoritative;
- real fixtures used;
- evidence matrix;
- any unsupported Dying cases;
- exact validation commands/counts;
- remaining C4 gaps.

Push implementation AND appended HANDOVER result to `origin/ux-v2`.
Then run `git fetch origin` and verify remote HANDOVER contains the result.
Then STOP.

## Acceptance

C4-01 passes only if Dying/rescue is represented as a stable authoritative presentation barrier, automatic/non-eligible rescue scans do not become fake public decisions, the dying player and causal interaction remain continuous across real rescuer handoffs, public semantics are viewer-stable while private Peach/options remain private, successful/failing rescue settles without stale presentation, malformed authority fails closed, and all regressions are green.

## C4-01 execution result

Implementation commit: `489276eb09dc3e8a6cc42f57cd6ea164495ce289`

Files changed:
- `app/api/rooms/route.ts`
- `game/presentation-v2.ts`
- `tests/presentation-v2.test.mjs`
- `tests/api/presentation-v2-engine.test.mjs`
- `tests/api/privacy-response.test.mjs`
- `tests/api/huang-gai.test.mjs`
- `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`
- `README.md`

Production flow inventory:
- `startDyingRescue` creates ordered `DyingPending`, preserves the inherited causal handle, and persists the `DYING` envelope with the first resolver candidate.
- `advanceDyingRescue` evaluates real semantic Peach/First Aid options, scans dead or ineligible seats without publishing a decision checkpoint, persists the causal barrier for the first real blocker, and invokes defeat settlement when no blocker remains.
- `give_peach` and `skip_rescue` claim the pending decision; skip awaits the next scanner before returning a room snapshot, so no intermediate fake actor is exposed.
- `expireDyingRescue` follows the same ordered continuation and scanner.
- `continueDyingResolution`, `continueAfterDefeat`, and existing Group/Damage resume helpers remain the parent continuation boundaries.
- `causalEnvelopeAtStage` and `advanceCausalSemanticCheckpoint` remain server-only causal checkpoint writers; no React or provider-specific route was added.

PresentationV2 changes:
- Added typed `PresentationDyingBarrier` with `semantics`, causal Interaction/root/active/parent/checkpoint/revision fields, `DYING` stage, dying player, rescuer/decision actor, and `RESCUE_CHOICE`/`UNPROVEN` state.
- `dyingBarrier` is nullable on `PresentationV2`.
- Public Dying `interactionScene.decisionActorId` uses the persisted pending actor only after causal proof, keeping public actor identity viewer-stable; private `CurrentAction` options remain viewer-scoped.

Barrier rule: the barrier is `PROVEN` only when the persisted causal envelope is valid, its active frame and checkpoint are the same `DYING` frame/stage, and the pending causal handle points to that active frame and Interaction. Otherwise the typed barrier is `UNPROVEN` and causal IDs/rescuer/decision actor are null. This is engine-authoritative because the server's live semantic response resolver determines whether a seat genuinely blocks; the projector never derives legality from HP, order, logs, timers, or private card data.

Real fixtures used:
- engine-backed Attack -> Damage -> Dying timer arm, reconnect, repeated-read, viewer-private Peach options, and timeout settlement;
- four-seat Dying flow with target/empty-seat scan, Bob skip, Carol real Peach decision, same Interaction/Frame, advanced checkpoint/revision, and viewer equality;
- existing Group -> Damage -> Dying Peach rescue and parent resume fixtures, including FIX15 lethal Group Damage;
- existing non-Group Damage/Dying, multiple-Peach, partial-Peach, First Aid, failed rescue, concurrency, and hero continuation fixtures;
- pure malformed/missing/cross-frame authority projection fixtures.

Evidence matrix:

| Evidence | Result |
| --- | --- |
| Stable Dying focus and first real rescue decision | PROVEN |
| Automatic dead/ineligible scan without fake checkpoint | PROVEN |
| Rescuer decline -> next real rescuer | PROVEN |
| Same Interaction/root/active Frame across handoff | PROVEN |
| Meaningful checkpoint/revision progression | PROVEN |
| Viewer equality and private Peach/options isolation | PROVEN |
| Successful Peach and multi-Peach/partial rescue | PROVEN by existing fixtures |
| No-rescue/death settlement | PROVEN |
| Parent Damage/Group continuity | PROVEN |
| Reconnect/repeated-read stability | PROVEN |
| Malformed causal authority fail-closed | PROVEN |
| Dying-triggered child effect | NOT IMPLEMENTED IN GAME |

Validation:
- focused engine API: `24/24`;
- focused Huang Gai API: `6/6`;
- `npm run test:fast`: `114/114`;
- `npm run test:api`: `239/239` across 23 files and 4 shards;
- `npm run build`: PASS;
- `npm run lint`: PASS;
- `git diff --check`: PASS.

Remaining C4 gaps: C4-02 and later presentation consumer work, animation/transition direction, historical delayed `originRef`, and a Dying-triggered child-effect path if one is added to production. React/CSS migration and C5 remain unstarted.
