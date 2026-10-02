# WTK UX V2 — Current Task Handoff

## Reviewer status

UX2.0C2 is **CLOSED / ACCEPTED**.

Final implementation reviewed:
`ba75dbf9e8352ea3829faaf398192bd5174dc6c4`

Final verification report:
`6fc71998e3c1a5d815b2fcadab08953e30988b87`

Final validation:
- focused causal/API: 98 passed, 0 failed;
- test:fast: 108 passed, 0 failed;
- test:api: 238 passed, 0 failed across 4 shards;
- build: PASS;
- lint: PASS;
- git diff --check: PASS;
- verification changed no production files.

Accepted deferred boundaries:
- historical delayed originRef remains PARTIAL/intentionally unsupported because there is no stable typed historical provenance;
- synchronous Judgement-Negation parent is NOT IMPLEMENTED IN GAME;
- Dying presentation barrier belongs to a later milestone.

C2 causal propagation is complete for current production gameplay.

---

# NEXT TASK — UX2.0C3-01: Define and Prove Group Presentation Semantics

## Objective

Begin C3 by converting the now-authoritative Group causal state into stable PresentationV2 semantics.

This task is NOT a React/UI migration. It is projector/model/test work only.

The goal is to make Group interactions project a stable public semantic scene that distinguishes:
- the Group source/effect;
- the ordered affected target set;
- the current participant being resolved;
- a nested Damage child when one exists;
- return from child Damage to the same Group scene;
- terminal Group settlement.

Use the C0 source-of-truth interaction design and the completed C2 causal envelope. Do not infer presentation identity from logs, event IDs, card names, phase transitions, or actionRevision.

## Step 1 — inspect current PresentationV2 Group projection

Audit:
- `game/presentation-v2.ts`;
- PresentationV2 types;
- Group-related projector tests;
- C0 Group semantics in `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`;
- C2 Group causal envelope/frame fields.

Document current behavior and gaps before changing code.

## Step 2 — define the Group public semantic contract

For one Group Interaction, the projected public scene must stably expose enough semantic information for a future client to render:

1. source actor;
2. Group effect/card semantic identity;
3. ordered affected target IDs;
4. current resolving participant;
5. Group stage/frame identity;
6. nested child Damage stage/frame identity when active;
7. return to the same Group parent scene after child settlement;
8. final terminal transition only when the Group Interaction truly ends.

Do not expose private hand/options.

Do not redesign engine rules.

## Step 3 — source/targets/current actor separation

The projector must not collapse these concepts:

- source: player who created the Group effect;
- affected targets: public ordered target set;
- current target/participant: the participant currently being processed;
- decision actor: player who currently has a response/trigger choice.

These may be different players.

Add explicit projector semantics/types only where the existing model cannot represent this correctly.

## Step 4 — stable identity across participant progression

Use C2:
- interactionId for the whole Group interaction;
- Group frameId for the parent Group scene;
- checkpointId/presentationRevision for semantic progression.

Prove moving A -> B -> C does not create a new Interaction or Group frame.

Participant progression may advance semantic checkpoint/revision when public meaning changes.

Do not key scene continuity from actionRevision.

## Step 5 — nested Damage child projection

Use the FIX14/FIX15 real Group->Damage child envelope.

While Damage child FD is active:
- interactionId remains Group interaction;
- parent Group frame FG remains present;
- active frame is FD;
- stage projects DAMAGE;
- current source/target/resolver come from the active child;
- Group affected-target context remains available for scene continuity.

After Damage settles:
- active frame returns to the exact FG;
- Group scene resumes rather than appearing as a new Group interaction;
- current participant advances correctly.

Do not create synthetic presentation frames.

## Step 6 — Group Negation SAME_FRAME compatibility

Preserve the accepted C2 rule: nested Group Negation is SAME_FRAME, not a child frame.

Add/adjust projector evidence showing:
- Group interaction/frame identity remains stable;
- stage/current semantic state may change for Negation;
- after Negation settlement projection returns to Group resolution without a fake child frame.

## Step 7 — Group Damage -> Dying boundary

Do not implement the later Dying presentation barrier.

Characterize current projection for real lethal Group Damage -> Dying -> Peach -> Group resume.

Require only:
- same interactionId;
- Group parent remains available;
- active child/current semantic state does not lose the Group causal context;
- after rescue, projector returns to the original Group frame.

If the current PresentationV2 model cannot express a future Dying barrier, document that as later work rather than broadening C3-01.

## Step 8 — reconnect and viewer invariants

Using real engine/API-backed snapshots:
- repeated projection of unchanged state is byte/deep equal for public Group semantics;
- second viewer sees the same public Group source/targets/frame/checkpoint semantics;
- viewer-private currentAction/options remain outside public Group semantic identity.

## Step 9 — malformed/legacy compatibility

When causal envelope is NULL/malformed:
- projector must not fabricate Group interaction/frame identity from Pending, logs, card names, resolutionId, event IDs or actionRevision;
- legacy presentation fields may remain available only according to existing compatibility contract;
- no crash.

## Step 10 — tests

Add focused projector/engine-backed tests for at least:
- Raining Arrows A -> B -> C participant progression;
- Barbarian Invasion equivalent;
- Group nested SAME_FRAME Negation;
- Group -> Damage child -> Group resume;
- Group -> Damage -> Dying -> Peach -> Group resume characterization;
- repeated read;
- second viewer;
- NULL/malformed envelope.

Prefer extending existing PresentationV2 engine fixtures rather than duplicating game setup.

## Step 11 — documentation

Update the appropriate UX V2 presentation/design document with the exact C3 Group projection contract and remaining later-stage gaps.

Do not rewrite C0 or C2 history.

README should receive only a concise current-stage update.

## Step 12 — validation

Run focused PresentationV2/Group/Negation/Damage/Dying tests, then:
- `npm run test:fast`
- `npm run test:api`
- `npm run build`
- `npm run lint`
- `git diff --check`

Report exact commands/counts.

## Evidence matrix

Append an exact C3-01 matrix with:
- Group source projected correctly;
- ordered affected targets projected;
- current participant distinct from source/target set;
- Group interaction/frame stable across participants;
- semantic checkpoint/revision progression;
- nested Group Negation remains SAME_FRAME;
- Damage child becomes active without losing Group parent;
- Damage settlement returns to same Group frame;
- lethal Damage/Dying/rescue preserves Group causal context;
- repeated projection stable;
- second viewer public semantics identical;
- NULL/malformed does not fabricate identity.

Use PROVEN / PARTIAL / UNPROVEN / NOT IMPLEMENTED IN GAME.

## Scope exclusions

Do not:
- modify React/CSS;
- implement visual Interaction Stage;
- implement Dying presentation barrier;
- change gameplay rules;
- redesign causal identity;
- implement historical originRef;
- start C4/C5;
- infer semantic identity from logs/events/card names/actionRevision.

## Execution result

Append only a `C3-01 execution result` with full implementation SHA, files changed, projector contract, type changes, real fixtures, exact evidence matrix, validation results and remaining C3 work.

Push implementation plus appended result to `origin/ux-v2` and STOP.

## Acceptance

C3-01 passes only if Group public presentation semantics are driven by authoritative C2 causal identity, remain stable across participant progression and nested child/resume, preserve SAME_FRAME Negation semantics, do not leak private controls, do not fabricate identity in malformed/legacy state, and all regressions are green.
