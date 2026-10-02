# UX V2 — Player Dock, Seat Topology, and Interaction Stage

**Status:** discussion draft — saved for design review, **do not implement yet**  
**Date:** 2026-10-02

## Goal

Make the local player's operational area the stable center of interaction while preserving table position, distance, target selection, and public information for every other player.

The screen should have three persistent conceptual layers:

1. **Seat thumbnails** — fixed relative seating / distance context for all living opponents.
2. **Interaction Stage** — dynamic enlarged presentation of the players involved in the current action, response, or resolution.
3. **Local Player Dock** — persistent lower-screen controls for the viewer's hero, skills, equipment, Judgement Zone, hand, instructions, and action buttons.

The Local Player Dock should remain stable regardless of whose turn it is.

## 0. Stable Presentation Architecture

UX V2 must not render every authoritative engine transition directly.

The game engine may legitimately move through many short-lived Pending, trigger, response, damage, rescue, and settlement states while resolving one command. Those states matter to gameplay correctness, but most are not meaningful screen states. Rendering them one-for-one would make Hero Focus panels, waiting labels, controls, and Reaction Chain content flicker or repeatedly reflow.

> **The UI renders stable, player-meaningful checkpoints, not engine transitions.**

Game state may be fine-grained. Presentation state must be coarse-grained and semantically stable.

### 0.1 Three-layer responsibility

~~~text
AUTHORITATIVE GAME ENGINE
Rules / Pending / Trigger / Response / Damage / Dying / etc.
                  |
                  v
SERVER-SIDE PRESENTATION PROJECTOR
Suppress transient transitions
Preserve causal context
Identify real blocking decisions
Build public interaction presentation
                  |
                  v
CLIENT UI
Seat Topology / Interaction Stage / Local Dock / animation
~~~

- **Game Engine / Orchestrator:** decides what happens, legality, responders, distance, targets, effects, triggers, damage, rescue, and settlement.
- **Presentation Projector:** decides which already-authoritative facts form the current stable player-facing presentation.
- **React client:** primarily renders that projection plus local-only selection, inspection, submitting, and animation state.

The Projector must not become a second rules engine. It must not independently decide Attack legality, target distance, Negation eligibility, rescue eligibility, or other gameplay rules.

### 0.2 Stability is semantic, never timer-based

Never define stability by waiting 100/200/300 ms to see whether state changes again.

A state is presentation-stable when authoritative flow reaches a meaningful boundary:

1. engine progress is genuinely blocked waiting for player input;
2. a meaningful public result has been produced and must be presented;
3. a persistent special interaction context must remain visible;
4. the game has returned to a normal observable resting state.

Network latency, server speed, test speed, and animation duration must not change which checkpoints exist.

### 0.3 Do not make the Projector guess whether the Engine will continue

Preferred control flow:

~~~text
COMMAND
  -> ENGINE / ORCHESTRATOR
  -> automatic transitions
  -> semantic boundary: BLOCKED / SETTLED / RESTING / persistent SPECIAL
  -> PRESENTATION PROJECTOR
  -> PresentationSnapshot
  -> CLIENT
~~~

The orchestrator knows whether it can continue automatically or requires authoritative input. The Projector should consume that fact instead of inspecting transient states and guessing.

### 0.4 Run until a stable boundary and coalesce intermediate transitions

Example:

~~~text
A submits Attack on B
-> validate
-> consume card
-> create pending effect
-> check triggers
-> check responses
-> apply automatic effects
-> B enters Dying
-> C can actually choose Peach / decline
-> BLOCKED FOR INPUT
~~~

Do not publish a complete screen for every intermediate step. Coalesce them into one stable projection:

~~~text
Root: A Attack B
Public events:
  B takes 1 damage
  B enters Dying
Current Effect: B is Dying
Decision Actor: C
Stable UI: Waiting for C
~~~

This is **state coalescing**, not artificial delay.

### 0.5 Stable state and Transition Events are different

Suppressing transient states must not discard meaningful animation information.

~~~text
Presentation update
= STABLE STATE
+ TRANSITION EVENTS
~~~

Example:

~~~text
stable:
  B is Dying
  C is blocking progress

transitionEvents:
  A played Attack
  B took 1 damage
  B entered Dying
~~~

The client may animate those meaningful events and land on the already-known stable Dying scene.

**Animations come from events, not from rendering short-lived engine states as screens.**

### 0.6 Conceptual PresentationSnapshot

The exact TypeScript contract remains an implementation task. The intended shape is:

~~~text
PresentationSnapshot
|
+-- identity
|   +-- presentationRevision
|   +-- interactionId
|   +-- checkpointId
|
+-- stable
|   +-- kind: REST | CHOICE | SETTLEMENT | SPECIAL
|
+-- interaction
|   +-- rootEvent
|   +-- currentEffect
|   +-- sourceId
|   +-- targetIds
|   +-- resolvingPlayerId
|   +-- publicReactionChain[]
|
+-- decision
|   +-- actorId
|   +-- reason
|
+-- localControl
|   +-- authoritative CurrentAction / thin viewer projection
|
+-- settlement
|
+-- transitionEvents[]
~~~

Do not duplicate existing protocol fields unnecessarily. Reuse the current authoritative action protocol wherever possible.

### 0.7 Four identities have different jobs

**interactionId** — answers: *is this still the same causal interaction?*

Keep it stable across checkpoints belonging to one root interaction. The client uses it to preserve Interaction Stage geometry and participant continuity.

~~~text
interactionId = attack-483

Attack
-> response decision
-> meaningful reaction
-> damage
-> Dying
-> rescue
-> settlement
~~~

**checkpointId** — answers: *has this interaction reached a new stable semantic point?*

Examples:

~~~text
attack-483-response-b
attack-483-third-party-trigger-c
attack-483-dying-rescue-d
attack-483-settlement
~~~

A new checkpoint does not imply destroying/rebuilding the Interaction Stage.

**presentationRevision** — answers: *did observable presentation information change?*

Internal transitions that do not change player-facing meaning must not require a new presentation revision.

**actionRevision** — retains its existing gameplay purpose: stale-submission protection for authoritative actions and local selections.

Mental model:

~~~text
interactionId        -> preserve causal stage
checkpointId         -> stable semantic step
presentationRevision -> observable presentation update
actionRevision       -> gameplay submission validity
~~~

### 0.8 Decision actor means real blocking input

Projected decision.actorId exists only when authoritative progress is genuinely blocked waiting for that player's input.

It must not mean:

- a player currently being checked for a possible trigger,
- a potential responder with no legal response,
- the next player in an automatic scan,
- a temporary pending owner,
- a participant briefly touched during internal resolution.

Thus:

~~~text
check C -> no legal response
check D -> no legal response
B must choose Dodge / decline
~~~

projects directly to:

~~~text
decision.actorId = B
~~~

Never flash Waiting for C -> Waiting for D -> Waiting for B.

### 0.9 CHOICE is viewer-projected

One authoritative CHOICE checkpoint can look different by viewer.

If B is decision actor, B sees:

~~~text
YOUR DECISION
Local Dock: cyan decision treatment
Respond with Dodge
[Dodge] [Skip]
~~~

A/C/D see:

~~~text
A -- Attack --> B
Waiting for B...
~~~

Do not create separate authoritative LOCAL_CHOICE and WAITING_FOR_OTHER_PLAYER states merely for viewer presentation.

### 0.10 Preserve CurrentAction authority

Existing authoritative action concepts include CurrentAction, legalActions, trigger/response options, selection constraints, targetIds, targetMin/targetMax, declineAction, and actionRevision.

Do not replace them with a duplicate UI legality system such as canClickAttack, canTargetZhaoYun, or canSkip.

The Presentation layer may expose or thinly project the viewer's authoritative CurrentAction; gameplay legality remains owned by the existing rules/action system.

### 0.11 Local-only UI sessions stay outside authoritative Presentation

These do not create server checkpoints by themselves:

- unsubmitted card/skill/target selection,
- Inspect,
- selection hover/focus,
- submitting state while a command is in flight,
- animation queue/progress.

~~~text
Final UI
=
Stable Server Presentation
+ Local Selection Session
+ Local Inspect Session
+ Transition Animation
~~~

### 0.12 Selection Preview handoff

Before Confirm, selectionSession contains the selected card/skill, targetIds, and local PREVIEW. It is not a public event and creates no public Reaction Chain root.

On Confirm:

1. keep selected Hero Focus and target presentation in place;
2. mark the local selection as submitting;
3. remove Cancel / prevent mutation of submitted selection;
4. optionally show a restrained submitting/resolving affordance;
5. await authoritative acknowledgement;
6. hand the visually continuous Preview to the authoritative interaction.

Do not clear the centre immediately and wait for the server to recreate the same target.

If rejected, including stale actionRevision, reconcile against newest authoritative state and show a concise state-changed message. Rejection must not create a fake authoritative interaction.

### 0.13 Transition Events, Reaction Chain, and Game Log are separate

**Transition Events**
- short-lived;
- animate movement between stable checkpoints;
- examples: card played, damage applied, entered Dying, Judgement revealed.

**Public Reaction Chain**
- lives with the current causal interaction;
- explains meaningful public actions/results from root to current point;
- stays concise enough for active play.

**Game Log**
- game-lifetime audit/history;
- may contain much more detail;
- is not the Interaction Stage.

Do not use Game Log as Reaction Chain. Do not use transient engine state as an animation queue.

### 0.14 Pass / decline semantics

Ordinary Pass / Skip / decline should not automatically create a visible Reaction Chain node merely because an authoritative decline action occurred.

Avoid:

~~~text
A Attack B
B Skip
B No Dodge
Attack resolving
Damage pending
B Damage
~~~

when the meaningful causal presentation is:

~~~text
A Attack B
B takes 1 damage
~~~

Do not hard-code decline_response => invisible in React. A particular rule may make refusal itself a meaningful public choice with independent consequences. The server-side projection decides whether it belongs in the public causal chain.

### 0.15 Attack / Dodge validation

Before Confirm:

~~~text
LOCAL SELECTION PREVIEW

       [B HERO]

YOU -- Attack --> B

Cancel       Confirm
~~~

Keep Preview visually stable while submitting.

If Engine reaches a real response decision:

~~~text
interactionId = I100
checkpoint = CHOICE
decision.actorId = B
root = A Attack B
~~~

A sees:

~~~text
       [B HERO]

A -- Attack --> B

Waiting for B...
~~~

B sees:

~~~text
       [A HERO]
          |
        Attack
          v

████ LOCAL DOCK ████
Target: RED
Decision: CYAN

Respond with Dodge
[Dodge] [Skip]
~~~

If B plays Dodge, validation/card consumption/pending closure must not each become a screen. Project the meaningful settlement:

~~~text
A · Attack -> B
B · Dodge
No damage
~~~

If B declines and damage follows, an ordinary decline need not be a chain node:

~~~text
A · Attack -> B
B · Damage -1 HP
~~~

### 0.16 Negation-chain validation

For A uses Stratagem on B, C may Negate, D may later counter-Negate, preserve A -> B as the root.

When C genuinely blocks progress:

~~~text
interactionId = I200
checkpointId = I200-C1
decision.actorId = C

PRIMARY EVENT
A -- Stratagem --> B

Waiting for C...
~~~

After C publicly submits Negation, if Engine later genuinely blocks on D:

~~~text
interactionId = I200
checkpointId = I200-C2

Reaction Chain:
A · Stratagem -> B
C · Negation

decision.actorId = D
~~~

Do not rebuild the scene as C vs D. Do not expose automatically checked players as waiting actors. If later declines have no independent causal meaning, do not fill the chain with pass nodes.

### 0.17 Dying / rescue validation

Suppose Attack causes damage, B reaches 0 HP, and rescue priority is checked.

If P2/P3 have no real decision but P4 can choose Peach/decline, project directly to:

~~~text
Root: original causal action
Current Effect: B is Dying
Decision Actor: P4

        [B]
       DYING
       HP 0

Waiting for P4...
~~~

Do not flash Waiting for P2/P3.

If P4 declines and P5 becomes the next genuine blocking rescuer:

- preserve the Dying scene,
- preserve interactionId,
- advance checkpointId,
- change only the semantically different decision context.

The Dying Hero must not repeatedly disappear/reappear as rescue priority advances.

### 0.18 Judgement validation

Judgement may internally include draw, reveal, suit/rank evaluation, modifier checks, priority scans, and effect application. Do not map each step to a top-level UI state.

If a real modifier decision exists:

~~~text
JUDGEMENT

Target
  |
[revealed judgement card]

Waiting for Sima Yi...
~~~

If nobody can meaningfully modify it, advance directly to the meaningful Judgement result. The reveal may be a Transition Event while the stable snapshot already describes the resulting Judgement context.

### 0.19 Persistent interaction geometry

A checkpoint change inside the same interactionId should normally update content **in place**.

Examples:
- Attack -> Dodge decision,
- Stratagem -> Negation -> counter-Negation,
- Damage -> Dying -> rescue,
- Judgement reveal -> modifier -> result.

Do not unmount/rebuild the Interaction Stage merely because CurrentAction, trigger ownership, or actionRevision changed. Hero positions and root relationship stay stable unless the meaningful interaction itself changes, such as authoritative target redirect.

### 0.20 Projector implementation constraints

When implementation begins:

- keep projector server-side/authoritative;
- keep it pure/deterministic where practical;
- derive presentation from authoritative state and meaningful authoritative events;
- never introduce timer-based stability;
- never duplicate legality;
- never expose another viewer's private response possibilities;
- never leak concealed hand identities;
- keep viewer-private localControl separate from shared public interaction facts;
- make projection testable without React;
- test the same interaction from source, target, decision actor, and observer perspectives.

### 0.21 Required architecture tests before visual UX implementation

Validate:

1. Attack -> Dodge.
2. Attack -> no response -> Damage.
3. Stratagem -> Negation -> counter-Negation.
4. Damage -> Dying -> multi-player rescue.
5. Judgement -> modifier -> result.
6. Target redirect/transfer while preserving original causal history.
7. Stale local submission/actionRevision rejection.
8. Quick Test viewer switching without changing public causal facts.

For every scenario assert:

- transient automatic actors never become blocking decision actors;
- interactionId stays stable across one causal interaction;
- checkpointId changes only at meaningful stable boundaries;
- Reaction Chain contains meaningful public causal nodes, not engine-log noise;
- private options are visible only to entitled viewer;
- final stable snapshot is sufficient for React without reconstructing gameplay rules.

### 0.22 Architecture invariant

Target:

~~~text
ENGINE STATE
  -> RUN AUTOMATIC TRANSITIONS UNTIL SEMANTIC BOUNDARY
  -> PRESENTATION PROJECTOR
  -> STABLE PresentationSnapshot + meaningful Transition Events
  -> REACT
~~~

Not:

~~~text
ENGINE STATE CHANGE
  -> REACT SCREEN CHANGE
~~~

This architecture is a prerequisite for the rest of UX V2. Seat Topology, Hero Focus, Reaction Chain, Multi-target, AOE, Dying, Judgement, and other visual work must consume stable presentation semantics rather than independently interpreting transient engine transitions.


### 0.23 Semantic hierarchy: Interaction -> Frame -> Stage -> Checkpoint

After pressure-testing the stable-presentation model against Borrowed Sword, Duel/Lust, AOE, Dying/rescue, Judgement modification, target redirect, equipment triggers, delayed effects, defeat/topology changes, nested triggered skills, and ordered multi-target resolution, use the following semantic hierarchy:

~~~text
INTERACTION
    |
    +-- Root Event
    |
    +-- Causal Frame Stack
           |
           +-- Parent Frame(s)
           |
           +-- Active Frame
                  |
                  +-- Stage
                         |
                         +-- Checkpoint
~~~

Definitions:

- **Interaction** = one continuous causal context that a player can reasonably understand as "the same thing still being resolved."
- **Causal Frame** = one independently resolving effect inside that Interaction.
- **Stage** = the player-meaningful resolution phase of the active Frame.
- **Checkpoint** = the stable player-facing point inside that Stage.

These are presentation semantics, not a replacement for the Engine's execution structures.

### 0.24 Interaction lifetime

Keep the same interactionId while unresolved causal work from the root event is still being synchronously resolved.

Example:

~~~text
A Attack B
-> B takes damage
-> B enters Dying
-> C may Peach
-> B survives
~~~

remains one Interaction. Dying and rescue do not automatically start new Interactions because they are a direct continuation of the unresolved root event.

An Interaction ends when:

- the root effect is settled,
- all causally nested independently resolving effects are settled,
- no blocking decision remains,
- no unresolved synchronous causal work remains.

A later independent gameplay initiation starts a new Interaction.

### 0.25 Deferred and persistent future activation

Causal history may outlive a Presentation Interaction.

If an effect is placed now but activates after the original Interaction has fully settled, do not reopen the old interactionId.

Examples include delayed effects, future turn triggers, and equipment/persistent statuses that activate during a later event.

Use a new Interaction with an optional originRef:

~~~text
Interaction I35
rootEvent:
  Delayed Effect activates on B

originRef:
  persistent/delayed effect identity
  optional historical source reference
~~~

Rule:

~~~text
synchronous causal continuation
-> same Interaction

future activation after previous Interaction settled
-> new Interaction + originRef
~~~

Historical causality does not imply an indefinitely long Presentation Interaction.

### 0.26 Causal Frame boundary

Do not create a Frame merely because another card was played or another player became involved.

A response that modifies, satisfies, cancels, redirects, or otherwise participates directly in the current effect's resolution normally remains in the same Frame.

Typical same-Frame cases:

- Dodge satisfying an Attack response,
- Negation / counter-Negation modifying the current trick effect,
- Peach used as part of the current Dying/rescue protocol,
- Judgement-card modification,
- target redirect of the current effect,
- Duel response cards used to satisfy the Duel exchange,
- ordinary per-target resolution inside an AOE,
- ordinary ordered target resolution inside one multi-target effect.

Create a **Child Frame** when a response/trigger launches a new independently resolving effect with its own effect context and resolution lifecycle.

Rule:

~~~text
modifies/satisfies current effect
-> SAME FRAME

launches independently resolving effect
-> CHILD FRAME
~~~

The decisive concept is the authoritative effect instance and its semantics, not card name.

### 0.27 Borrowed Sword boundary case

Borrowed Sword demonstrates why participant count and card count cannot determine Frame boundaries.

Conceptually:

~~~text
Interaction I100

Frame F1:
Borrowed Sword
Source: A
primary target: B
required Attack target: C

Stage:
FORCED_ACTION

Checkpoint:
B must make the authoritative Borrowed Sword choice
~~~

The requirement for B to Attack C belongs to Borrowed Sword's own resolution protocol and remains in F1.

If B's submitted Attack creates a normal independently resolving Attack effect capable of its own Dodge, damage, Dying, and triggered effects, that Attack becomes a Child Frame:

~~~text
F1 Borrowed Sword
|
+-- F2 Attack B -> C
       -> Dodge
       -> Damage
       -> Dying

F2 settles
-> return to F1
-> continue Borrowed Sword settlement
~~~

By contrast, an Attack card submitted merely to satisfy a Duel exchange does not become a normal Attack Child Frame if the rules treat it only as the Duel response.

### 0.28 Duel and Lust

Duel should normally remain one Frame:

~~~text
Interaction I200

Frame F1:
Duel A <-> B

Stage:
DUEL_EXCHANGE

Checkpoint C1: A decision
Checkpoint C2: B decision
Checkpoint C3: A decision
...
~~~

The two Hero positions stay fixed. decisionActor changes; the presentation must not swap the Hero panels on every response.

For an ordered Duel-like hero skill such as Lust, preserve the selected target order as authoritative semantic information:

~~~text
Lust
targets:
  1. A
  2. B

Stage:
DUEL_EXCHANGE
~~~

Do not infer effect order from seat position. Position represents table topology; explicit order represents effect semantics.

### 0.29 Frame stack and nested independent effects

Frames may nest.

Example:

~~~text
F1 Attack A -> B
|
+-- B takes damage
|
+-- F2 B triggered skill -> C
       |
       +-- C takes damage
       |
       +-- F3 C triggered skill -> D
~~~

The active Frame is the current independently resolving effect. When a Child Frame settles, return to its Parent Frame and continue authoritative resolution.

A tree is useful for causal history; a stack is useful for current resolution/presentation context.

However:

> **Presentation Frame Stack is not the Engine Pending Stack.**

Do not expose pending objects directly as presentation Frames. One Presentation Frame may span multiple engine pending/action objects, and engine execution structures may not correspond one-to-one with player-meaningful effects.

The Engine/Orchestrator must provide enough authoritative semantic information for the Projector to identify the active effect and causal parent relationship. The Projector must not invent gameplay execution order.

### 0.30 Frame origin vs current effect

A Frame needs an immutable origin and an authoritative current projection.

Example target redirect:

~~~text
Interaction root:
A Attack B

Frame F1 origin:
Attack -> B

Reaction:
C redirects B -> D

Frame F1 current:
Attack -> D
~~~

Do not rewrite the Frame origin after redirect, and do not restore the stale original target when returning from a Child Frame.

Conceptually:

~~~text
CausalFrame {
  id
  parentFrameId?
  causeNodeId?

  origin {
    sourceId
    effect
    originalTargetIds
  }

  current {
    sourceId
    effect
    targetIds
    resolvingPlayerId?
  }

  resolutionSemantics
  stage
}
~~~

This is conceptual; do not duplicate authoritative game state unnecessarily when implementing the contract.

### 0.31 causeNodeId

When a Child Frame is created, preserve why it exists.

Example:

~~~text
F1:
A Attack B

Reaction node N2:
B takes Damage

F2:
B damage-triggered Skill -> C
parentFrameId = F1
causeNodeId = N2
~~~

This allows the presentation to explain:

~~~text
ORIGIN
A Attack B

CONTEXT
Triggered by B taking damage

CURRENT
B Skill -> C
~~~

without reconstructing causality from timestamps or card names.

### 0.32 Stage is not Engine State

Stage represents a meaningful phase of the active Frame, not every internal transition.

Examples:

~~~text
Attack Frame
Stage: ATTACK_RESPONSE

Attack Frame
Stage: DYING

Duel Frame
Stage: DUEL_EXCHANGE

AOE Frame
Stage: AOE_RESOLUTION

Delayed-effect Frame
Stage: JUDGEMENT

Borrowed Sword Frame
Stage: FORCED_ACTION
~~~

This refinement prevents Dying, Judgement, or AOE progress from being mistaken for separate Interactions merely because the presentation composition changes.

Example:

~~~text
Interaction I1
Frame F1: Attack A -> B
Stage: DYING B
Checkpoint: Waiting for C to rescue
~~~

If C declines and D becomes the next genuine rescuer:

~~~text
same Interaction
same Frame
same Stage
new Checkpoint: Waiting for D
~~~

### 0.33 Nested effects during a special Stage

A special Stage may be temporarily covered by a Child Frame without ending the parent context.

Example:

~~~text
F1 Attack / Stage: DYING B
|
+-- F2 B's Dying-triggered Skill -> C
~~~

While F2 is active, the central Current Effect may show B's Skill -> C, but retain a lightweight breadcrumb such as:

~~~text
During: B is Dying
~~~

When F2 settles, return to F1's Dying Stage.

Do not imply that Dying ended merely because a triggered Child Frame temporarily became active.

### 0.34 Reaction Chain hierarchy and default presentation

Causal history may be hierarchical even though the default UI should remain compact.

Data may conceptually represent:

~~~text
F1 Attack
+-- Damage B
+-- F2 B Skill
    +-- F3 C Skill
~~~

Default UI may flatten/collapse this into a readable causal sequence:

~~~text
A · Attack -> B
B · Skill
  -> C · Skill -> D
+ earlier events
~~~

Do not send preformatted indentation/arrows as authoritative server text. Preserve structured semantics and let the UI decide compact/collapsed rendering.

Third-party participants do not automatically receive full Hero Focus panels merely because they appear in causal history.

### 0.35 AOE and ordered multi-target effects

Ordinary per-target processing in one AOE or multi-target effect normally remains in one Frame.

Example:

~~~text
Interaction I300
Frame F1: Group Effect
Stage: AOE_RESOLUTION

targets:
B resolved
C resolved
D CURRENT
E pending
F pending

current.resolvingPlayerId = D
~~~

Do not create a Frame per target unless processing a target launches a genuinely independent effect.

If C triggers an independent Skill while C is being resolved:

~~~text
F1 AOE
|
+-- C [paused/current]
|
+-- F2 C Skill -> E
~~~

After F2 settles, return to F1 and continue the Engine-owned target resolution order.

For ordered multi-target selection, preserve explicit target order:

~~~text
targets:
1. B
2. C
3. D
~~~

Do not infer order from visual seat position.

### 0.36 Resolution semantics are explicit

Do not infer player-facing simultaneity/order merely from the Engine's implementation loop.

A multi-participant Frame may conceptually expose semantic resolution mode such as:

~~~text
SEQUENTIAL
ORDERED
GROUP
~~~

- **SEQUENTIAL**: participants are resolved one by one according to authoritative rules.
- **ORDERED**: explicit gameplay order is meaningful and must be preserved.
- **GROUP**: rules semantics present the effect as a group/simultaneous outcome even if deterministic internal processing is required.

The Engine/Rules layer owns these semantics. The Projector must not invent ordering from iteration order.

For sequential/group effects, distinguish:

- originalTargetIds: historical/root target set,
- current/resolving participant,
- current authoritative participants/eligibility where relevant.

Never reuse originalTargetIds as current legality.

### 0.37 Engine owns Frame/effect execution order

If a Skill creates multiple independently resolving effects, the Projector must not choose their order.

Example:

~~~text
F1 Skill X

Engine chooses/prescribes:
push F2 Damage B
-> settle F2
push F3 Effect C
-> settle F3
return F1
~~~

The Projector presents the authoritative active Frame. It does not sort child effects, infer next effects, or create gameplay ordering.

### 0.38 Equipment triggers

Equipment effects follow the same Frame rule as all other effects.

If equipment merely modifies the current effect, remain in the same Frame and optionally add a meaningful public Reaction node.

If equipment launches an independently resolving effect, create/project a Child Frame.

If equipment/persistent state activates in a future Interaction after the original event settled, start a new Interaction and preserve an originRef where useful.

Do not keep the Interaction that originally equipped the item alive across turns.

### 0.39 Defeat and topology changes

Defeat may be both a meaningful settlement and an immediate authoritative gameplay topology change.

Example:

~~~text
A Attack B
-> B Damage
-> B Dying
-> no rescue
-> B Defeated
~~~

The current Interaction should be able to present a defeat settlement before disappearing.

However, once the Engine marks B defeated, all gameplay legality, distance, targetability, and subsequent decisions must immediately use the new authoritative game topology.

The client may temporarily retain B's thumbnail as a **presentation-only exit state**:

~~~text
authoritative:
  B.alive = false
  new distance/topology already active

presentation:
  B seat = EXITING
  show DEFEATED
  animate removal/reflow
~~~

A visually retained defeated seat must never remain selectable, targetable, or part of distance calculations.

If a new actionable CHOICE arrives while the exit animation is still playing, authoritative CHOICE takes priority; cosmetic seat animation may fast-forward.

### 0.40 AOE plus defeat/topology mutation

An Interaction does not freeze gameplay topology.

If B is defeated while an AOE is still resolving and the rules immediately change effective distance/topology, subsequent Skills and target choices must use the newest authoritative state.

Preserve historical facts such as originalTargetIds for explanation, but never use them as current eligibility or distance data.

This is a critical separation:

~~~text
causal history may be stable
gameplay legality remains live and authoritative
~~~

### 0.41 Turn-owner defeat

If the active turn owner is defeated during an Interaction, the Engine may immediately terminate that turn and advance authoritative turn state.

Presentation may still show the meaningful Defeated settlement before visually settling into the next table state.

Do not preserve dead-player controls merely to finish an animation.

If the next authoritative player already has an actionable CHOICE, actionable input takes priority over nonessential defeat animation.

### 0.42 Client presentation priority

Client animation must never reduce a player's effective response opportunity.

Recommended priority:

~~~text
ACTIONABLE CHOICE / SPECIAL CHOICE   highest
meaningful settlement               medium
transition animation                medium
REST                                low
cosmetic animation                  lowest
~~~

If a new actionable CHOICE arrives, cosmetic or nonessential settlement animation may fast-forward. Causal information remains available through the Interaction/Reaction Chain even when animation is shortened.

### 0.43 Consolidated semantic rules

Use these rules when deciding presentation identity:

~~~text
1. Interaction
   = continuous player-understandable causal context.

2. Frame
   = independently resolving effect inside that context.

3. Stage
   = meaningful phase of the active Frame.

4. Checkpoint
   = stable player-facing point inside the Stage.

5. Response that modifies/satisfies the current effect
   = same Frame.

6. Response/trigger that launches an independently resolving effect
   = Child Frame.

7. Child settles
   = return to Parent Frame and continue authoritative resolution.

8. Root + descendants settle with no unresolved synchronous causal work
   = Interaction ends.

9. Future delayed/persistent activation after settlement
   = new Interaction + originRef.

10. Engine/Rules own effect order, target order, simultaneity semantics,
    topology, distance, and legality. Presentation never invents them.
~~~

The practical identity stack is therefore:

~~~text
interactionId
activeFrameId
stage
checkpointId
presentationRevision
actionRevision
~~~

Each has a distinct purpose. Do not collapse them into one generic UI state or revision.

### 0.44 Pressure-test acceptance criteria

The semantic model is considered suitable for UX V2 only while it can express these cases without card-name-specific React state machines:

- normal Attack -> Dodge,
- Attack -> Damage -> Dying -> rescue,
- Negation -> counter-Negation,
- target redirect,
- Borrowed Sword with a nested normal Attack effect,
- Duel / Lust ordered exchange,
- sequential AOE,
- ordered multi-target effect,
- AOE target triggering an independent Child Frame,
- Dying-triggered independent Skill and return to Dying,
- Judgement modification,
- Judgement-triggered independent effect and return,
- equipment modifier vs independent equipment effect,
- delayed/persistent future activation via new Interaction + originRef,
- nested Child Frames,
- defeat with presentation-only seat exit,
- defeat/topology mutation during an unresolved group effect,
- active-turn-player defeat,
- one Skill producing multiple Engine-ordered independent effects,
- GROUP semantics where internal Engine order must not be misrepresented as player-facing sequential semantics.

If implementation requires React to infer any of these causal relationships from card names, timers, animation completion, or raw pending-stack shape, stop and extend the authoritative semantic projection instead.



### 0.48 Presentation Contract audit against the current protocol

Before implementing new visual components, UX V2 must reuse the semantic authority already present in the current protocol and Pending/Continuation model.

The existing `CurrentAction` remains the canonical local decision and legality contract. It already carries the authoritative actor, deadline, legal actions, response requirement/options, trigger options, decline action, and selection constraints. UX V2 must not duplicate these as Presentation fields such as `canRespond`, `canSkip`, `legalTargets`, or hero/card-specific legality flags.

Likewise, the existing Pending/Continuation model already carries substantial causal execution context. Attack, Group/AOE, Duel, Negation, Borrowed Sword, Damage, Judgement, Dying, recovery, and trigger continuations preserve source/target and resume information. In particular, nested fields such as `resumeGroup`, `resumeDamageSuffered`, `resumePending`, `resumeTrigger`, Judgement `resume`, and Dying resume data demonstrate that the Engine already owns nested effect execution. The Presentation Projector must project this information; it must not recreate an independent execution stack.

This leads to the following boundary:

~~~text
ENGINE / ORCHESTRATOR
  owns legality, execution, continuation and resolution order
             |
             v
PRESENTATION PROJECTOR
  projects stable public causal meaning
             |
             v
CLIENT
  viewer projection, layout, local preview/inspect, animation
~~~

### 0.49 Active Effect presentation must remain thin

The active Presentation effect is a player-facing projection of an already-authoritative Engine effect. It is not a new gameplay object.

Conceptually it may expose:

~~~text
activeFrame
  frameId
  parentFrameId?
  stage
  eventObject?
  participants[]
  groupResolution?
  parentSummary?
~~~

Participant roles are semantic and may be layered. A player may simultaneously be a source, effect target, primary subject, secondary participant, or currently resolving participant.

Do not encode local legality roles such as:

~~~text
LEGAL_TARGET
ILLEGAL_TARGET
SELECTED
~~~

inside the authoritative active effect. Those belong to CurrentAction and the Local Selection Session.

Likewise, the server should not prescribe responsive layout sizes such as LARGE / MEDIUM / COMPACT. The Projector provides semantic importance/roles; the client chooses the appropriate visual density for Top Row Mode, Side Column Mode, phone, tablet, or desktop.

The current decision actor should reuse `CurrentAction.actorId` unless implementation tests prove that a separate presentation-level blocking actor is required. Do not duplicate an existing authoritative field merely to make the contract look symmetrical.

### 0.50 Public event object and immutable root

The Interaction Stage needs a structured public representation of the thing being resolved, for example a card, skill, Judgement card, damage occurrence, or public status.

This should reuse existing public card/skill/event descriptors wherever possible rather than copy domain objects into a second model.

The Interaction root is immutable historical context:

~~~text
rootEvent
  eventId
  kind
  sourceId?
  originalTargetIds[]
  object?
~~~

If a target is redirected, `rootEvent.originalTargetIds` remains unchanged while the active Frame's current effect changes.

Historical root targets must never be reused for current target legality.

~~~text
Historical presentation only.
Never use rootEvent.originalTargetIds for gameplay legality.
~~~

### 0.51 Group-resolution projection

The current `GroupContinuation` already provides authoritative group execution information such as source, card kind, required response and remaining participants. The Presentation Projector may add a public summary suitable for rendering without requiring React to reconstruct the group from Pending state.

Conceptually:

~~~text
groupResolution
  semantics: SEQUENTIAL | ORDERED | GROUP
  participants[]
  activeParticipantId?

participant
  playerId
  status: PENDING | CURRENT | PAUSED | RESOLVED | NO_LONGER_APPLICABLE
  order?
  outcome?
~~~

The exact enum names remain an implementation detail.

`resolutionSemantics` must come from authoritative gameplay semantics. The Projector must not infer player-facing simultaneity/order from the Engine's implementation loop.

A group participant's status is not target legality. Do not add `legal: true/false` here.

Outcome summaries must remain small and public, for example Damage, Avoided, Negated, Recovered, Defeated, Completed, with only necessary public values such as damage amount. Detailed causal history belongs in the Reaction Chain.

### 0.52 Reaction Chain contract

Reaction Chain nodes should be structured semantic records rather than preformatted UI strings or raw Engine log entries.

Conceptually:

~~~text
ReactionChainNode
  nodeId
  frameId
  causedByNodeId?
  actorId?
  kind
  object?
  targetIds?
  outcome?
~~~

`frameId` associates a meaningful public node with the effect being resolved. `causedByNodeId` or equivalent causal identity can preserve a nested branch without forcing the client to infer causality from timestamps.

The Reaction Chain remains a concise explanation of the active causal interaction. It is not a full Frame tree and not the Game Log.

### 0.53 Parent context is a projection, not another source of truth

When a Child Frame is active, the UI needs a lightweight breadcrumb such as:

~~~text
During B's Dying
During Barbarian Invasion · resolving D
~~~

The server must project this from authoritative continuation/resume context. React must not inspect `resumeGroup`, `resumeDamageSuffered`, `resumePending`, `resumeTrigger`, or Judgement resume variants.

Do not expose an unbounded ancestor stack merely for layout. The stable snapshot normally needs the active Frame, immediate parent summary, root context, and nesting depth. Detailed causal history remains available through semantic history/Reaction Chain data.

### 0.54 Settlement and Transition Event contracts

Settlement should be structured public meaning, not free text and not something React guesses from HP differences.

Conceptually:

~~~text
settlement
  frameId
  outcome
  subjectIds[]
~~~

Transition Events are ephemeral presentation deltas used for animation:

~~~text
transitionEvent
  eventId
  frameId?
  kind
  subjectIds[]
  payload?
~~~

Transition Event identity must be stable/idempotent so React rerenders, polling, and reconnects do not replay the same damage/card/Judgement animation repeatedly.

A single authoritative semantic occurrence may project into stable state, a Reaction Chain node, a Settlement summary, and a Transition Event when each representation serves a different lifetime/purpose. These projections must derive from one authoritative occurrence rather than become independent competing truths.

### 0.55 Reconnect invariant

A latest stable PresentationSnapshot must be independently renderable.

Example: if a viewer reconnects after:

~~~text
Attack
-> Damage
-> Dying
-> C Peach
~~~

while B is still Dying and D is now the blocking rescuer, the latest snapshot must be sufficient to render:

~~~text
Root: A Attack B
Active: B DYING
Public causal context: C Peach / relevant chain
Decision: D
~~~

The client must not need to replay old Attack, Damage, or Peach animations to reconstruct the correct screen.

Transition Events enhance movement between snapshots; they are not prerequisites for reconstructing stable state.

### 0.56 Quick Test viewer-switch invariant

Changing Quick Test viewer must not rewrite shared public causal facts.

For one authoritative snapshot such as:

~~~text
A Attack B
B must decide Dodge / decline
~~~

viewer A may see B centrally and "Waiting for B"; viewer B projects B into the Local Dock with target + decision treatment; viewer C sees A/B centrally and "Waiting for B".

The following shared facts must remain stable across viewer switching:

~~~text
rootEvent
activeFrame
publicReactionChain
groupResolution
settlement
~~~

Only viewer projection and viewer-private CurrentAction/control data may differ.

### 0.57 Existing client causal reconstruction is migration debt

The current client reconstructs active causal presentation from a combination of Pending projections, card identity, phase and timeline scanning. For example, the existing sequence presentation locates a source from several `pendingX` shapes, derives an expected card/effect, searches backward through timeline events, and slices a presentation sequence.

UX V2 should remove this responsibility from React.

Target architecture:

~~~text
Existing authoritative Engine
        |
        +-- CurrentAction
        +-- Pending / Continuations
        +-- semantic public events
        |
        v
Pure server-side Presentation Projector
        |
        v
presentationV2
        |
        v
Interaction Stage
~~~

Do not delete or rewrite the existing timeline animation system in the first UX2.0 change. Introduce the stable projection alongside it, test it independently, then migrate visual consumers incrementally.

### 0.58 Identity audit before finalising interactionId/frameId

The current code already uses `resolutionId`, timeline event IDs, `readyAfterEventId`, and `actionRevision`. Do not introduce new identity fields until their actual lifetimes have been audited.

Before finalising the contract, trace these identities through:

1. Attack -> Dodge;
2. Attack -> Damage;
3. Damage -> Dying -> rescue;
4. Group/AOE -> response -> damage -> resumeGroup;
5. Duel exchange;
6. Negation -> counter-Negation;
7. Borrowed Sword -> forced Attack;
8. Judgement -> modifier -> result;
9. Damage trigger -> secondary effect -> nested damage.

For each flow determine:

~~~text
where resolutionId is created
whether it survives the entire causal Interaction
whether nested independent effects reuse or replace it
where it is lost
what readyAfterEventId protects
whether a decision deadline starts before its presentation barrier opens
whether actionRevision changes for every real blocking decision
whether timeline event IDs can support idempotent Transition Events
~~~

Only then decide whether existing `resolutionId` maps to `interactionId`, `frameId`, or neither.

### 0.59 Presentation barrier safety

The current protocol already exposes:

~~~text
CurrentAction.presentation
  resolutionId
  readyAfterEventId
~~~

and the client uses `readyAfterEventId` to delay enabling a response/trigger decision until a particular public presentation event has been presented.

Preserve the intent: a new decision should not visually appear before the event that explains it.

However, UX2.0 must verify that a cosmetic presentation barrier does not consume a player's real response window. A server deadline and a client-side presentation gate must not combine to leave the player with less usable decision time.

Actionable CHOICE remains higher priority than cosmetic animation. If necessary, cosmetic presentation must fast-forward rather than delay access to a genuine authoritative choice.

Do not remove the barrier mechanism until its existing semantics and timer interaction have been tested.

### 0.60 CurrentAction, actionRevision and checkpoint identity

`CurrentAction` remains authoritative for local control. `actionRevision` remains authoritative for stale-submission protection and already provides a useful boundary for clearing obsolete local selections/providers.

Do not automatically equate `actionRevision` with `checkpointId`.

A meaningful public settlement may create a new Presentation checkpoint without creating a new local action. Conversely, a decision actor/action revision may change while the same Interaction geometry and Stage remain stable.

Mental model remains:

~~~text
actionRevision       -> command validity
checkpointId         -> stable presentation identity
presentationRevision -> observable presentation change
interaction/frame    -> causal continuity
~~~

### 0.61 First Presentation Projector scope

The first Projector does not need to expose a complete causal Frame tree to React.

Prefer the minimum sufficient stable projection:

~~~text
PresentationSnapshot
  identity
    presentationRevision
    interactionId
    checkpointId

  rootEvent

  activeFrame
    frameId
    parentFrameId?
    stage
    eventObject?
    participants[]
    parentSummary?
    groupResolution?

  publicReactionChain[]

  settlement?

  transitionEvents[]

  CurrentAction / existing viewer control contract
~~~

The complete causal tree may remain internal to the Engine/Projector. The client normally needs root context, active Frame, immediate parent context, meaningful history, and current authoritative controls.

### 0.62 Revised UX2.0 implementation sequence

Do not begin UX2.0 by rewriting Interaction Stage React components.

Use this order:

~~~text
UX2.0A
Audit resolutionId, readyAfterEventId,
timeline event identity and actionRevision lifetimes.

UX2.0B
Build a pure Presentation Projector over existing
Game / Pending / CurrentAction / semantic events.

UX2.0C
Finalise semantic identity:
Interaction / Frame / Checkpoint.

UX2.0D
Project:
Root Event
Active Effect
participants
parent context
group context
Reaction Chain
Settlement
Transition Events.

UX2.0E
Run architecture tests without React.

UX2.0F
Expose presentationV2 in the room protocol.

UX2.1+
Begin visual Interaction Stage migration.
~~~

The Projector must not become a second rules engine. It consumes authoritative Engine semantics and produces stable public causal meaning.

### 0.63 Coding-agent audit task

Before implementing the Projector contract, give the coding agent this task:

~~~text
UX2.0A — AUDIT EXISTING RESOLUTION / PRESENTATION IDENTITY

Do not change gameplay or UX yet.

Trace the lifecycle of:
- resolutionId
- readyAfterEventId
- timeline event IDs
- actionRevision

through:
- normal Attack -> Dodge
- Attack -> Damage
- Damage -> Dying -> rescue
- Group/AOE -> response -> damage -> resumeGroup
- Duel exchange
- Negation -> counter-Negation
- Borrowed Sword -> forced Attack
- Judgement -> modifier -> result
- Damage trigger -> secondary effect -> nested damage

For each scenario document:
1. where resolutionId is created,
2. whether it survives the whole causal interaction,
3. whether nested independent effects reuse or replace it,
4. where it is lost,
5. what readyAfterEventId protects,
6. whether a decision deadline can begin before the presentation barrier opens,
7. whether actionRevision changes at every real blocking decision,
8. whether timeline event IDs are stable enough for idempotent transition events.

Do not introduce interactionId/frameId/checkpointId until this audit shows
which existing identities can be reused.

Also identify every place in app/page.tsx where React reconstructs causal
context from:
- pendingX fields,
- card names,
- timeline scanning,
- phase,
- timers.

The goal is to move causal interpretation into a pure server-side
Presentation Projector without creating a second legality/rules engine.
~~~



### 0.64 Scene continuity invariant

Within one Interaction, preserve the current scene by default. Recompose the Interaction Stage only when the player-meaningful active relationship changes.

A change to `checkpointId`, `actionRevision`, decision actor, HP, status, or Reaction Chain content does not by itself justify moving Hero Focus panels.

Use four client-side semantic transition levels:

~~~text
LEVEL 0 — CONTENT UPDATE
LEVEL 1 — FOCUS UPDATE
LEVEL 2 — FRAME TRANSITION
LEVEL 3 — INTERACTION TRANSITION
~~~

These are rendering concepts, not gameplay protocol states.

**Level 0 — Content Update**

Keep geometry unchanged. Update only content such as HP, status, decision highlight, waiting text, Group status, or appended Reaction nodes.

Examples:

~~~text
B deciding -> B played Dodge
HP 3 -> HP 2
Waiting for C -> Waiting for D
~~~

Hero positions must not move merely because the blocking decision changes.

**Level 1 — Focus Update**

The Interaction and active Frame remain the same, but the current primary/resolving participant or current target changes.

Typical examples:

~~~text
AOE: C CURRENT -> C RESOLVED, D CURRENT
Redirect: A Attack B -> current target becomes C
~~~

Keep Root Context, Group Timeline and surrounding scene geometry stable; transition only the Active Focus relationship.

**Level 2 — Frame Transition**

A Child Frame is pushed or popped while the same Interaction remains active.

Example:

~~~text
AOE resolving D
-> D Skill -> E
-> Child Frame settles
-> return to AOE resolving D
~~~

Keep Root Context stable. Compact the parent into a breadcrumb while the child is active, transition only the Active Effect, then visually return to the preserved parent context.

**Level 3 — Interaction Transition**

Only a genuinely new `interactionId` permits a complete scene exit/enter transition.

If a new authoritative CHOICE is already available, it takes priority over completion of the old scene's cosmetic exit animation.

### 0.65 Redirect continuity

An authoritative redirect normally remains the same Interaction and Frame while changing the current semantic target.

Example:

~~~text
Root:    A Attack B
Current: A Attack C
Chain:   X redirected the effect to C
~~~

Preserve immutable root history while updating the current Focus.

A rule-caused redirect must be represented by authoritative semantic presentation/event data. A stale-client reconciliation is not a redirect and must not create a Reaction Chain node.

~~~text
RULE-CAUSED CHANGE
-> semantic Reaction / Transition presentation

STALE CLIENT RECONCILIATION
-> correct to latest authoritative state
-> concise state-changed feedback
-> no invented gameplay event
~~~

### 0.66 Viewer reprojection is not an Interaction transition

Quick Test or another supported perspective change may substantially change layout because the viewer's own hero must move into the Local Dock instead of appearing centrally.

This is **Viewer Reprojection**, not a new authoritative Interaction.

Do not replay card-play, damage, Reaction, or settlement animations merely because the viewer changed.

Shared public facts remain unchanged; only self-projection and viewer-private controls are recomputed.

### 0.67 Preview adoption

When an unsubmitted Local Selection Preview is confirmed and the server accepts the same semantic action/targets, adopt the existing preview geometry into the authoritative Interaction where practical.

~~~text
PREVIEW
YOU -- Attack --> B

CONFIRM / SUBMITTING
YOU -- Attack --> B

AUTHORITATIVE
YOU -- Attack --> B
~~~

Do not unnecessarily clear and re-enter the same Hero Focus.

The visual state may morph from local selected/amber treatment to authoritative active treatment while the public root and Reaction Chain become available.

If the command is rejected, exit the Preview and reconcile to the newest authoritative snapshot. Never create a fake public cancellation/reaction for an action that was never accepted.

### 0.68 Reaction Chain continuity and bounded layout

Reaction nodes append or update within a bounded Resolution Context region. Do not rebuild the entire chain or allow unbounded history growth to push the Active Effect around the screen.

As the chain grows:

1. retain Root Context;
2. retain current/recent meaningful reactions;
3. collapse older history behind an Earlier ×N affordance;
4. preserve current decision clarity;
5. keep Hero Focus geometry stable where possible.

Reaction Chain collapse/expansion is presentation state and must not alter authoritative causal identity.

### 0.69 Interaction Safe Zone space budget

Treat the central Interaction Safe Zone as three semantic regions with unequal priority:

~~~text
ROOT CONTEXT
  compact / stable

ACTIVE EFFECT
  flexible / highest visual priority

RESOLUTION CONTEXT
  flexible but bounded
~~~

Space priority:

~~~text
Active Effect readability
> Current Decision clarity
> current Group progress
> recent Reaction context
> old Reaction history
> decorative metadata
~~~

When space becomes constrained, reduce in this order:

1. collapse old Reaction detail;
2. compact Group Resolution detail;
3. compact secondary metadata;
4. compact secondary external participants;
5. compact parent breadcrumb/context;
6. only then slightly reduce the primary Hero Focus.

Never solve Interaction Stage pressure by making the Local Hand unusable, covering the fixed bottom controls, or moving Side Seat topology into the central safe zone.

### 0.70 Group Timeline continuity

Group Resolution presentation must not change height unpredictably as individual outcomes become available.

Responsive projections may include:

~~~text
COMFORTABLE
B -1♥   C CURRENT   D ...   E ...

COMPACT
B ✓   C ▶   D ·   E ·

CRITICAL
1/4 resolved · C ▶
~~~

These are visual projections of the same authoritative semantic state.

The currently resolving participant and the viewer's own affected/decision state must never be hidden by density reduction.

### 0.71 Current Decision is orthogonal to geometry

Current Decision is not a large independent panel that repeatedly appears and disappears.

Project decision state onto the relevant participant and Local Dock:

~~~text
external decision actor
-> cyan decision treatment + concise Waiting for X

viewer is decision actor
-> cyan Local Dock treatment + authoritative controls
~~~

Changing the decision actor should normally be a Content Update, not a scene reconstruction.

### 0.72 Settlement continuity and actionable-choice priority

Present settlement in the existing scene where possible.

Example:

~~~text
A -- Attack --> B
                 -1♥
~~~

If the same Interaction immediately enters Dying, morph the active scene directly:

~~~text
B -1♥
-> B DYING
~~~

Do not clear the Interaction Stage, show a separate result modal, then rebuild the Dying scene.

If a new authoritative CHOICE becomes available while a cosmetic settlement animation is still running:

~~~text
ACTIONABLE CHOICE
> cosmetic settlement animation
~~~

The animation may finish quickly, fast-forward, or collapse into a static result. It must not block access to the real decision.

This rule must be considered when auditing `readyAfterEventId` and server deadlines.

### 0.73 Client presentation identity

The client may derive rendering-only keys such as:

~~~text
InteractionKey = interactionId
EffectKey      = activeFrameId
FocusKey       = active semantic participant relationship
ViewerKey      = viewerId
~~~

A composite SceneKey may be useful for animation/layout continuity, but it is not a protocol field and must never control gameplay legality or stale-action validity.

Do not reset gameplay selection merely because a rendering key changes. Selection reconciliation remains based on authoritative `actionRevision`, `CurrentAction`, phase and projected legality.

Avoid using `actionRevision` as the React key for the whole Interaction Stage; decision revisions inside one causal Interaction should not destroy stable scene geometry.

### 0.74 Animation semantics

Use animation only for meaningful presentation transitions:

~~~text
ENTER
MORPH
EXIT
~~~

- **ENTER:** a genuinely new public participant/effect enters the current scene.
- **MORPH:** the same semantic object changes state, for example Target -> Dying or Current -> Resolved.
- **EXIT:** an Interaction/Frame/participant genuinely leaves the active presentation.

Do not animate every React state change.

Animation must never carry the only copy of important semantic information. Redirect, damage, Dying, decision changes, and other meaningful states must remain understandable in static/reduced-motion presentation.

Respect reduced-motion preferences by replacing spatial motion with restrained crossfade or immediate semantic updates without changing information content.

### 0.75 Continuity acceptance tests

Before visual implementation is considered stable, test:

~~~text
Attack -> Dodge decision -> Dodge settlement
Attack -> Damage -> Dying without scene teardown
Negation -> counter-Negation with stable root relationship
AOE participant C -> D focus progression
AOE -> Child Frame -> return to parent
authoritative target redirect
Borrowed Sword -> forced Attack Child Frame -> return
Judgement reveal -> modifier -> result
Preview -> Confirm -> authoritative adoption
stale Preview rejection
Quick Test viewer reprojection
new CHOICE arriving during settlement animation
long Reaction Chain collapsing without moving primary Hero Focus
~~~

For each scenario verify:

- same Interaction does not unnecessarily remount;
- Root Context remains stable;
- decision changes do not move Hero panels by themselves;
- Child Frame push/pop preserves parent context;
- viewer switching does not replay authoritative events;
- actionable controls are never delayed for cosmetic continuity;
- local hand and bottom controls remain protected.



### 0.76 Mobile portrait vertical-space ownership

Mobile portrait is the primary UX V2 layout target. The Local Player Dock has a minimum usable space budget and must not be treated as whatever vertical space remains after the Interaction Stage grows.

The Battlefield may compact under pressure, but central presentation growth must not make the local hand, Hero, or controls unusable.

In Side Column Mode, left/right Seat Columns terminate at the Battlefield/Dock boundary and never continue beside the Local Dock.

> **The Local Player Dock always owns the full usable screen width.**

This vertical ownership rule does **not** redefine the internal Dock composition. The established Local Dock composition in section 2 remains authoritative.

### 0.77 Fixed Local Dock composition

The Local Dock has a deliberately fixed composition. Do not reinterpret the size-priority list as a top-to-bottom ordering.

~~~text
┌────────────────┬──────────────────────────────────────┐
│ Judgement      │ SKILLS                 EQUIPMENT     │
│ overlays       │ [Skill 1] [Skill 2]    ⚔  🛡  🐎    │
│      ↓         │                                      │
│ ┌────────────┐ │                                      │
│ │            │ │          LARGE HAND AREA             │
│ │ LARGE HERO │ │                                      │
│ │    ART     │ │ [CARD][CARD][CARD][CARD][CARD]... →  │
│ │            │ │                                      │
│ │    HP      │ │                                      │
│ └────────────┘ │                                      │
├────────────────┴──────────────────────────────────────┤
│ Guidance / current requirement          Action buttons│
└───────────────────────────────────────────────────────┘
~~~

The structural rule is:

~~~text
LEFT
Hero portrait + HP
Judgement overlays on the Hero portrait

RIGHT TOP
Skills | Equipment

RIGHT MAIN
Large single-layer Hand area

BOTTOM
Guidance / current requirement | Action controls
~~~

This composition remains stable as hand size and interaction complexity change.

Do not move the Hero above the Hand, move the Hand above the Hero, create a separate Judgement row, or move Equipment beneath the Hero merely to handle responsive pressure.

### 0.78 Size priority is not position priority

The established Dock priority describes **size/readability allocation**, not spatial ordering.

Use the section 2 priority:

1. **Hand — highest priority and largest variable area.**
2. **Hero art — second primary visual area; keep large for identity and immersion.**
3. **Skills and frequent action controls — large, reliable interaction targets.**
4. **Bottom guidance/action bar — compact but persistent and always readable/reachable.**
5. **Equipment — compact but individually inspectable/selectable.**
6. **Judgement — compact overlay on the Hero rather than a permanent independent zone.**

Therefore:

> **Hand largest, Hero second, high-frequency controls next — without changing the fixed left/right/bottom composition.**

Under pressure, compact lower-priority information before aggressively reducing Hand or Hero readability.

### 0.79 Judgement belongs to the Hero portrait

Persistent delayed/Judgement cards are attached to or overlaid on the local Hero portrait, consistent with section 2.6.

They do not receive an independent row or permanent large zone.

Conceptually:

~~~text
     [Judgement] [Judgement]
            ↓
      ┌────────────┐
      │            │
      │ LARGE HERO │
      │    ART     │
      │            │
      │    HP      │
      └────────────┘
~~~

When a Judgement actually resolves, the active Judgement interaction is promoted into the Interaction Stage. The persistent Hero overlay may remain as the local-state anchor until authoritative resolution removes/changes it.

> **Persistent Judgement state = Hero overlay. Active Judgement resolution = Interaction Stage.**

### 0.80 Skills and Equipment share the right-top control band

Equipment is positioned to the **right of Skills**, not below the Hero.

Conceptually:

~~~text
SKILLS                              EQUIPMENT
[Skill 1] [Skill 2] [Skill 3]      ⚔  🛡  🐎
~~~

Skills retain larger/high-frequency interaction treatment.

Equipment remains more compact because slot count is limited and it changes less frequently, but each equipped object must remain independently identifiable, inspectable, and selectable when authoritative legality requires it.

Do not merge Skills and Equipment into one indistinguishable button style. Their semantic categories must remain visually understandable even though they share the same horizontal band.

### 0.81 Single-Layer Hand Rail inside the right-main Hand area

The Large Hand Area occupies the main right-side operational region beneath the Skills/Equipment band.

The Hand is always one horizontal layer.

> **Never add a second hand row merely because the player has many cards.**

The Hand uses the following progression:

~~~text
small hand
-> large cards with little/no overlap

more cards / less available width
-> increase horizontal overlap

required overlap exceeds usable limit
-> clamp overlap
-> enable horizontal pan
~~~

Large-hand growth changes navigation inside the existing Hand area. It does not change the Dock composition or add another row.

### 0.82 Hand fitting and overflow

Hand fitting is geometry-driven rather than based on fixed card-count thresholds.

Conceptually consider:

~~~text
available Hand-area width
preferred usable card width
required overlap
minimum usable exposed width
maximum usable overlap
~~~

If the hand fits while preserving readable/tappable cards, show it naturally.

If overlap can make it fit without exceeding the usable overlap limit, increase overlap.

If it still cannot fit, preserve usable card dimensions and overlap, place additional cards outside the visible Hand viewport, and allow horizontal swipe/pan to bring those cards onto the screen.

Do not continuously shrink cards to expose the whole hand.

The 5 / 10 / 15 / 20 / 25+ card counts are validation benchmarks, not hard-coded layout thresholds.

### 0.83 Horizontal hand navigation

Horizontal swiping lets the player bring off-screen cards into the visible Hand area.

~~~text
[1][2][3][4][5][6][7][8]  ->

swipe

<- [7][8][9][10][11][12][13][14]
~~~

Cards retain a usable visual/touch size while panning.

Use restrained overflow affordances where useful so the player can discover that more cards exist off-screen, without consuming significant vertical space.

Do not solve overflow by progressively thinning or miniaturising hidden cards.

### 0.84 Tap versus swipe

The Hand must distinguish card activation from horizontal navigation.

A normal tap selects/activates according to the current authoritative mode.

Horizontal movement beyond an implementation-tuned gesture threshold becomes Hand Pan. Once the gesture is classified as Pan, that gesture must not select or play the touched card.

Do not hard-code a final pixel threshold in this design document. Tune it on real touch devices.

UX V2 does not require drag-to-play. Prefer the established:

~~~text
Tap
-> local selection / preview
-> target or other required selection
-> explicit Confirm
~~~

### 0.85 Selected-card visibility

A selected card rises upward from the Hand, receives higher stacking priority, and remains sufficiently readable.

If a selected card is partially clipped or heavily obscured, the Hand viewport may make a restrained horizontal adjustment to bring it sufficiently into view.

Do not reset the Hand to its beginning merely because a card was selected.

The selected card remains conceptually the same card in the Hand. Avoid presenting a second duplicate full card as if two copies exist.

For multi-card selection, use restrained lift/selection treatment for all selected cards; do not expand every selected card into a large independent panel.

### 0.86 Hand viewport anchor

Horizontal Hand position is local UI state and should survive unrelated authoritative presentation updates.

Preserve the viewport across:

- target selection;
- Reaction Chain changes;
- decision-actor changes;
- Interaction Stage content/focus updates;
- ordinary HP/status changes.

Example:

~~~text
viewer sees:
12 13 14 [15] 16 17 18

15 is played/removed

preserve nearby context:
12 13 14 16 17 18 19
~~~

Do not jump back to the first cards after routine React/server updates.

If the anchor card disappears, prefer the nearest surviving visible card as the next viewport anchor.

Viewer change, new game, or materially replaced hand may establish a new anchor.

### 0.87 New cards and hand growth

Drawing cards must not unnecessarily steal the current Hand viewport.

If newly added cards are outside the visible portion while the player is actively inspecting/selecting elsewhere, preserve the current viewport and use a restrained new-card/overflow indication when useful.

Do not automatically pan to new cards in a way that interrupts an active response or selection.

### 0.88 Multi-card and authoritative eligibility

Authoritative multi-card choices use the same Hand area.

Selected cards lift and receive clear selected treatment while remaining in the single layer.

Guidance may show:

~~~text
Select 2 cards · 2/2
~~~

or:

~~~text
Select 1–3 cards · 2/3
~~~

Minimum/maximum and eligibility remain authoritative CurrentAction/selection data. The Hand must not implement its own gameplay legality.

When the server projects eligible card IDs:

- eligible cards remain clearly selectable;
- ineligible cards are visually subdued;
- ineligible cards remain in their stable Hand positions rather than disappearing.

Inspection of an ineligible card may remain possible through a non-conflicting inspect affordance, but it must not appear gameplay-selected/actionable.

### 0.89 Bottom Guidance / Action Bar

The bottom Guidance / Action Bar spans beneath both the left Hero area and the right Skills/Equipment/Hand area.

It remains the smallest major visual region but is structurally protected:

- never covered by selected cards;
- never covered by Hero art;
- never covered by the Interaction Stage;
- always respects the bottom safe area;
- remains readable and reachable.

Its compact size must not be confused with low gameplay importance.

The established Cancel / Confirm / Skip semantics remain unchanged.

### 0.90 Responsive pressure must preserve the composition

Responsive pressure may change density and detail, but it must not rearrange the established composition.

A client-only pressure model may use levels such as LOW / MEDIUM / HIGH / CRITICAL based on actual usable geometry, safe-area insets, Hand requirements, and Interaction Stage pressure.

Under pressure, prefer this response order:

1. collapse old/non-current Interaction Stage history;
2. compact secondary Interaction Stage metadata;
3. compact lower-priority Dock metadata;
4. increase Hand overlap until the usable limit;
5. use Hand horizontal pan;
6. compact Equipment presentation while keeping objects identifiable;
7. compact non-critical Skill detail while keeping actionable controls usable;
8. only then reduce Hero/Hand presentation within their validated minimums.

Do not respond to pressure by moving Equipment below the Hero, creating a separate Judgement row, creating a second Hand row, or replacing the established Dock geometry with a generic vertical stack.

Density is a client presentation concern, not authoritative game state.

### 0.91 Mobile portrait invariants and validation

~~~text
COMPOSITION
1. Local Dock owns the full usable screen width.
2. Left = Hero + HP, with Judgement overlaid on Hero.
3. Right Top = Skills, with Equipment to the right of Skills.
4. Right Main = Large Hand Area.
5. Bottom = Guidance / current requirement + Action controls.
6. Size priority does not redefine these positions.
7. Side Seat Columns stop above the Local Dock.

HAND
8. Hand is always a single horizontal layer.
9. Hand preserves a minimum usable card size/exposed width.
10. Hand growth increases overlap, then uses horizontal pan.
11. Hand never adds a second row to solve overflow.
12. Hand does not continuously shrink to expose every card.
13. Off-screen cards are reached by swiping/panning.
14. Selected cards remain readable and can be brought into view.
15. Hand viewport/anchor survives unrelated presentation updates.
16. Removing/playing a card preserves nearby Hand context.
17. Horizontal swipe must not accidentally trigger card selection.

OTHER DOCK CONTENT
18. Hero remains the second primary visual area after Hand.
19. Judgement does not reserve a separate permanent row.
20. Equipment remains to the right of Skills.
21. Equipment remains compact but individually interactive.
22. Guidance/Action Bar is compact but always protected.
23. Safe-area insets are part of usable geometry.

VALIDATION
24. Validate the same composition at 5, 10, 15, 20, and 25+ cards.
25. Validate no selection, single selection, multi-selection, response mode,
    selected cards near viewport edges, card removal, card draw, and
    authoritative updates while horizontally panned.
26. Validate reduced-height portrait viewports without changing the
    composition.
27. Portrait remains the primary UX2 target; landscape/tablet/desktop
    adaptation is a separate design exercise.
~~~

Success means Hand count and Interaction Stage complexity can change without destroying the player's spatial memory of:

~~~text
Hero = left
Skills + Equipment = right top
Hand = right main
Guidance + Actions = bottom
Judgement = on Hero
~~~


## 0.92 UX2.0B review gate — projector foundation is not yet identity evidence

UX2.0B introduced an additive pure projector in `game/presentation-v2.ts`, route exposure as `presentationV2`, and focused tests. This is a useful foundation, but review found that it must **not** yet be treated as proof of the final Interaction / Frame / Stage / Checkpoint contract.

The current tests are primarily synthetic projector fixtures. They exercise hand-built Pending/Continuation-shaped objects and verify deterministic projection, but they do not yet drive the real engine/orchestrator through all nine flows. Therefore statements such as “proven lifecycle” must be interpreted narrowly as **projector-fixture characterization**, not end-to-end proof of actual runtime creation, propagation, replacement, resume, reconnect, or deadline behavior.

Before UX2.0C finalises semantic identities, add engine-backed characterization tests for the high-risk flows, especially Duel, Borrowed Sword forced Attack, Judgement modifier/resume, Group/AOE nested damage/resume, Dying/rescue, and damage-trigger nested effects.

### 0.92.1 Root context must be immutable

The current foundation derives `rootContext.originalTargetIds` from the active context. That is acceptable only as a temporary placeholder. It does not satisfy the UX V2 invariant that Root Context preserves the original public event when the active/current target later changes.

Redirect/retarget tests must prove:

~~~text
root original target = unchanged
active current target = may change
~~~

The projector must derive the root from authoritative origin/event data, not simply copy the current active target.

### 0.92.2 Group detection must be semantic, not “has cardKind”

The current foundation's generic record inspection can treat a context as Group-like merely because a `cardKind` exists. A normal single-target card may also have a card kind.

Group projection must require an authoritative Group continuation/type or equivalent explicit engine semantic. Never infer Group/AOE solely from card identity or the existence of `cardKind`.

### 0.92.3 Transition events must be causally scoped

`transitionEvents` must not become “all presentable timeline events”. The timeline is history; Transition Events are bounded deltas relevant to the current presentation checkpoint.

The foundation may temporarily reference existing `event.id`, but before client migration it must guarantee that unrelated historical events cannot enter the current Interaction Stage merely because no reliable resolution marker was available.

Similarly, `activeContext.eventIds` must describe the relevant active causal context, not every event sharing a broad/legacy grouping marker when that would cross frame boundaries.

### 0.92.4 Parent direction and continuation semantics require engine-backed tests

Resume data is valuable evidence for parent context, but generic recursive object inspection is not the final semantic contract. The engine/orchestrator owns whether a continuation is:

- the active effect;
- the parent to resume;
- a child effect;
- a Group resume;
- a trigger resume;
- or a delayed future interaction.

The projector should eventually consume explicit typed continuation semantics rather than discover causality by probing arbitrary field names.

### 0.92.5 Timer/barrier result remains a guard, not a completed fairness proof

The foundation correctly demonstrates at the data level that a persisted non-zero deadline can exist while a presentation barrier is closed. The synthetic helper test does **not** prove the complete runtime timing behavior.

Before changing timer semantics, test the actual server/client lifecycle for:

- response timer arming;
- rescue timer arming;
- delayed essential presentation;
- reconnect;
- poll delay;
- timeout submission;
- reduced-motion / fast-forward.

The invariant remains:

> **Cosmetic presentation must never silently consume the player's intended usable authoritative decision window.**

### 0.92.6 UX2.0B status after review

Accepted as a **foundation**, not accepted as the final semantic projector contract.

Keep:

- additive `presentationV2`;
- pure/server-side projection direction;
- CurrentAction as the only legality authority;
- no final Interaction/Frame/Checkpoint IDs yet;
- `resolutionId` as legacy/reference metadata;
- `event.id` as persisted public-event reference;
- React migration deferred.

Required before UX2.0C identity finalisation:

1. engine-backed characterization for high-risk causal flows;
2. immutable-root/redirect coverage;
3. authoritative Group detection;
4. causally bounded active/transition event projection;
5. typed parent/child/resume semantics where generic probing is ambiguous;
6. end-to-end barrier/deadline fairness characterization.

Do not migrate the Interaction Stage UI onto `presentationV2` until these review gates pass.


## 1. Seat thumbnails

Seat topology is designed **mobile portrait first**. Its purpose is to preserve relative seating, distance context, targetability, and player status without consuming the central Interaction Stage.

The viewer is represented by the persistent Local Player Dock at the bottom and therefore does not receive a duplicate seat thumbnail.

### 1.1 Two layout modes only

Do not use a mixed top + side arrangement and do not use diagonal / horseshoe placement.

Choose the layout solely from total player count:

- **2–4 total players: Top Row Mode.**
- **5–10 total players: Side Column Mode.**

This gives the Interaction Stage only two predictable geometry classes instead of a different shape for every player count.

### 1.2 Top Row Mode — 2–4 total players

All opponents appear across the top of the battlefield. No opponent seat thumbnails appear on the left or right sides.

Examples:

```text
3 players

┌─────────────────────────────┐
│       [P3]    [P2]          │
│                             │
│       INTERACTION           │
│          STAGE              │
│                             │
├─────────────────────────────┤
│      LOCAL PLAYER / YOU     │
└─────────────────────────────┘
```

```text
4 players

┌─────────────────────────────┐
│ [P4]      [P3]      [P2]    │
│                             │
│       INTERACTION           │
│          STAGE              │
│                             │
├─────────────────────────────┤
│      LOCAL PLAYER / YOU     │
└─────────────────────────────┘
```

Top Row Mode deliberately prioritises full-width central interaction space. Do not move opponents to side positions merely to imitate a physical round table.

### 1.3 Side Column Mode — 5–10 total players

All opponent seats appear in left or right vertical columns. **There is no top seat row in this mode.**

- Clockwise seats from the viewer occupy the **right column**.
- Counter-clockwise seats from the viewer occupy the **left column**.
- The nearest neighbour on each side is placed nearest to the Local Player Dock.
- Seats grow upward as their relative seat distance from the viewer increases.
- If the opponent count is odd, use one deterministic side for the extra seat rather than changing sides for visual balance.
- Initial design choice: assign the extra / exact-opposite seat to the clockwise **right column**. Validate this during visual prototyping, but keep whichever rule is chosen deterministic.

Examples:

```text
5 players

┌─────────────────────────────┐
│[P5]                     [P3]│
│[P4]   INTERACTION       [P2]│
│          STAGE              │
├─────────────────────────────┤
│            YOU              │
└─────────────────────────────┘
```

```text
7 players

┌─────────────────────────────┐
│[P7]                     [P4]│
│[P6]   INTERACTION       [P3]│
│[P5]      STAGE          [P2]│
├─────────────────────────────┤
│            YOU              │
└─────────────────────────────┘
```

```text
10 players

┌─────────────────────────────┐
│[P10]                    [P6]│
│[P9]                     [P5]│
│[P8]   INTERACTION       [P4]│
│[P7]      STAGE          [P3]│
│                         [P2]│
├─────────────────────────────┤
│            YOU              │
└─────────────────────────────┘
```

Side columns must remain entirely above the Local Player Dock. They must never intrude into the local hero, hand, skills, or bottom guidance/action bar.

### 1.4 Central Interaction Safe Zone

The remaining centre of the battlefield is a protected **Interaction Safe Zone**.

Seat thumbnails must not diagonally drift into this area as player count increases.

The safe zone is reserved for:

- selected-target preview,
- enlarged public hero focus,
- Current Effect,
- Reaction Chain,
- Duel,
- Judgement,
- Dying / rescue,
- AOE resolution,
- card / skill presentation and resolution animation.

For 5–10 players, prefer reducing seat-thumbnail density before sacrificing the usability of the central current interaction or the Local Player Dock.

### 1.5 Responsive thumbnail presentation

Seat thumbnails may use different presentation shapes while preserving the same information model.

**Top Row Mode** may use a wider compact thumbnail because horizontal width is available and vertical height is valuable.

**Side Column Mode** should use a narrow portrait thumbnail to minimise loss of central width.

Suggested information, subject to real-device validation:

- hero portrait / face,
- hero or player identity,
- HP,
- concealed hand count,
- projected effective distance,
- lightweight important status markers.

Do not attempt to place full skills, full equipment names, full Judgement cards, role details, or long status text in seat thumbnails. Those belong in public inspect / Interaction Stage presentation.

Equipment and Judgement presence may use small status icons where useful.

### 1.6 Seat position versus gameplay distance

Seat position communicates **relative seating topology**.

Displayed distance communicates **authoritative current gameplay distance**.

These are not interchangeable. Equipment, skills, defeated-player handling, and other effects may cause effective gameplay distance to differ from the apparent number of seat steps.

Where distance is useful, display the server-projected effective value. Do not infer target legality in React merely from visual seat position or from a client-side `distance <= range` calculation.

Final target legality remains authoritative server state.

### 1.7 Target-selection behaviour

During target selection:

- legal seat thumbnails receive a clear selectable affordance,
- illegal targets are visually de-emphasised,
- clicking a legal thumbnail selects / deselects it according to the current selection mode,
- a selected local target receives the amber selected-target treatment,
- single-target selection may replace the previous selected target directly,
- multi-target selection follows projected min/max rules,
- seat thumbnails stay in their fixed positions while the selected player's enlarged preview appears in the Interaction Stage.

Public inspection must remain distinct from targeting.

Recommended interaction:

- in target-selection mode, thumbnail body = target selection,
- a dedicated info affordance = public inspect,
- outside target-selection mode, thumbnail body may open public inspect.

Inspect must not mutate target selection.

### 1.8 Layered visual states

Do not model a seat thumbnail with one mutually exclusive colour/state.

A player may simultaneously be:

- turn owner,
- current effect target,
- current decision actor,
- locally selected target,
- legal / illegal for the current local selection.

Use composable visual channels, for example:

- **Gold:** current turn owner marker.
- **Cyan / teal:** current decision actor.
- **Red:** current affected / effect-target treatment.
- **Amber:** locally selected target.
- **Dim / grey:** defeated or currently illegal.
- **Subtle legal affordance:** legal selectable target.

A decision treatment must not erase target state, and a local selection treatment must not erase public event state.

### 1.9 Defeated players and authoritative topology

The UI must not independently decide how defeat changes gameplay distance.

Instead:

- render active seating / distance according to authoritative game state,
- if the rules engine removes defeated players from active distance topology, reflect that projection,
- if the rules engine applies different semantics, follow those semantics,
- never recalculate gameplay distance solely from DOM / visual positions.

If defeated players no longer belong to active topology, they may move to a compact defeated/history treatment outside the active seat columns. This should not consume significant battlefield space.

### 1.10 Responsive Interaction Stage consequence

The two seat modes intentionally create two Interaction Stage geometry classes:

- **Top Row Mode (2–4 players):** wide central interaction area.
- **Side Column Mode (5–10 players):** narrower but taller central interaction area.

Future Full Hero Focus, Reaction Chain, AOE, Judgement, and special-event presentation should adapt to these two geometry classes rather than simply scaling one fixed desktop card.

### 1.11 Seat topology invariants

1. Mobile portrait is the primary design target.
2. Never mix top-row seats and side-column seats in the same layout.
3. Never use diagonal / horseshoe seat placement if it narrows the central Interaction Stage.
4. Viewer remains anchored at the bottom through the Local Player Dock.
5. Seat thumbnails remain fixed while players are enlarged or involved in interactions.
6. Seat position communicates relative seating; authoritative projected distance communicates gameplay distance.
7. Seat topology never intrudes into the Local Player Dock.
8. Increasing player count compresses opponent-seat presentation before it damages local hand / hero / controls.
9. Target legality and distance remain server-authoritative.
10. Quick Test perspective changes must rebuild the same topology from the selected viewer's perspective.


## 2. Local Player Dock

The Local Player Dock is the viewer's persistent operational area. It occupies the lower portion of the screen and must remain stable regardless of turn owner or Interaction Stage complexity.

The dock must not distribute space evenly between all information. Space should follow actual gameplay frequency and readability needs.

### 2.1 Space priority

Use this priority when the dock becomes constrained:

1. **Hand — highest priority and largest variable area.**
2. **Hero art — keep large for identity and immersion.**
3. **Skills and frequent action controls — large touch/click targets.**
4. **Bottom guidance and action bar — persistent and always readable.**
5. **Equipment — compact but still individually inspectable/selectable.**
6. **Judgement indicators — normally overlaid on the hero rather than reserving a permanent large zone.**

The hand and hero art are the two primary visual areas. Do not shrink either aggressively merely to give equal space to lower-frequency information.

### 2.2 Hand area

The hand changes constantly and requires close inspection, comparison, selection, and repeated interaction. It should receive the largest flexible horizontal area in the Local Player Dock.

Design rules:

- Keep card faces as large as practical.
- Prefer increasing overlap / fan density as hand size grows rather than continuously shrinking every card.
- A selected card should rise upward from the hand.
- Card selection must expand **upward only** and must never cover the bottom guidance/action bar.
- Preserve enough visible card identity for scanning when cards overlap.
- Large hands such as 10, 15, or 20 cards require an explicit overflow strategy; prefer large cards with overlap/fan and horizontal navigation over tiny cards.
- The exact large-hand overflow interaction remains to be validated visually before implementation.

Conceptually:

```text
few cards    -> large cards, little overlap
more cards   -> same/near-same card size, increased overlap
large hand   -> overlap/fan + horizontal navigation
selected     -> card rises upward
```

Local hand usability takes precedence over allowing the Interaction Stage or Reaction Chain to consume additional vertical space.

### 2.3 Hero art

The local hero should remain visually large. It is both gameplay identity and a major source of immersion.

Do not reduce the local hero to a small avatar merely to fit more metadata.

The hero area should include the hero's essential stable status, such as name and HP, without covering important artwork unnecessarily.

Core viewer-centric rule: **the local hero is never duplicated in the Interaction Stage.** If the viewer is a source, target, decision actor, or resolving participant, that semantic role is projected onto the Local Player Dock.

### 2.4 Skills and frequent controls

Skills are high-frequency gameplay controls and should use large, easy-to-hit interaction targets.

- Active skills should look actionable when legal.
- Disabled / unavailable skills should remain identifiable but clearly inactive.
- Skill names should remain readable without requiring hover.
- Detailed skill rules may open through inspect/detail behaviour rather than permanently consuming dock space.
- Do not reduce skills to tiny text links merely to save room.

### 2.5 Equipment

Equipment may be significantly more compact than hand cards or hero art because the number of equipment slots is limited and the information changes less frequently.

Equipment must nevertheless remain separate interactive game objects because equipment may need to be:

- inspected,
- selected by an effect,
- replaced,
- stolen / dismantled,
- used as a skill source,
- involved in effects such as Borrowed Sword.

Compact equipment may sit beside or around the hero area, but its identity and selection state must remain readable.

### 2.6 Judgement presentation

Do not reserve a large permanent Judgement Zone in the Local Player Dock.

Delayed / Judgement cards normally appear as compact overlays or badges on the local hero artwork, for example along the top edge of the hero portrait.

This is appropriate because Judgement-related state is important but normally does not require a large continuous interaction area.

When a Judgement actually resolves, promote it into the Interaction Stage where the game can show:

- the delayed effect / Judgement source,
- the revealed Judgement card,
- the affected player,
- any Judgement modifier,
- the resulting Reaction Chain / current decision.

Therefore:

**persistent Judgement state = hero overlay; active Judgement resolution = Interaction Stage.**

Judgement overlays remain inspectable and, when authoritative legality requires it, selectable.

### 2.7 Persistent bottom guidance/action bar

The lowest part of the Local Player Dock is a fixed guidance/action bar.

This bar is a stable UX anchor and must never be covered by the hand, selected cards, hero artwork, or Interaction Stage.

It may show states such as:

```text
Your turn · Play Phase                              End Turn
Attack selected · Select 1 target          Cancel   Confirm
Select 1–3 targets · Selected 2/3          Cancel   Confirm
Respond with Dodge                          Confirm   Skip
Select 2 cards to discard · 1/2            Cancel   Confirm
Waiting for Zhao Yun...
```

Rules:

- guidance stays at the bottom rather than above the hand,
- selected hand cards rise away from it,
- controls stay in predictable positions where practical,
- Confirm remains disabled until the current local selection is valid,
- Cancel and Skip retain their distinct semantics defined later in this document,
- the bar must remain readable during complex Reaction Chains.

A player who is uncertain what the game currently expects should be able to look at the bottom of the screen and immediately understand the next local action.

### 2.8 Local Dock semantic states

The dock needs layered visual states rather than one generic highlight:

- **Normal** — no special incoming effect or required decision.
- **Target** — strong red structural treatment when the viewer is currently affected.
- **Decision** — cyan / teal decision treatment when the viewer currently owns the decision.
- **Target + Decision** — retain both meanings simultaneously; for example a red target border plus a cyan decision badge/pulse.

A decision highlight must not erase the fact that the viewer is also the current target.

### 2.9 Proposed desktop/tablet composition

The exact dimensions remain subject to visual validation, but the intended hierarchy is:

```text
┌───────────────────────────────────────────────────────────────┐
│                                                               │
│ ┌────────────────┐   ┌─────────────────────────────────────┐  │
│ │ Judgement      │   │ LARGE SKILLS             EQUIPMENT │  │
│ │ overlays       │   │ [Skill] [Skill] [Skill]   ⚔ 🛡 🐎 │  │
│ │                │   │                                     │  │
│ │   LARGE HERO   │   │          LARGE HAND AREA            │  │
│ │      ART       │   │                                     │  │
│ │                │   │ [CARD][CARD][CARD][CARD][CARD]... → │  │
│ │      HP        │   │ overlap, then horizontal navigation │  │
│ └────────────────┘   └─────────────────────────────────────┘  │
├───────────────────────────────────────────────────────────────┤
│ Guidance / current requirement                 action buttons │
└───────────────────────────────────────────────────────────────┘
```

This composition is intentional: Hero remains on the left; Skills and Equipment share the right-top band with Equipment to the right of Skills; the large Hand occupies the right-main area; Judgement overlays the Hero; guidance/actions span the bottom. The size priority does not redefine these positions.

This is a hierarchy, not a requirement to hard-code percentages.

The key constraint is that increasing Interaction Stage complexity must not make the hand or primary controls unusably small.

### 2.10 Interaction with the upper stage

The Local Player Dock is persistent while the upper battlefield / Interaction Stage is elastic.

When upper-screen content becomes complex:

- collapse older Reaction Chain detail before shrinking the local hand excessively,
- use compact third-party reaction identities instead of adding unnecessary full hero panels,
- preserve the large local hero where practical,
- preserve large hand cards and skill touch targets,
- never allow upper-stage expansion to cover the fixed bottom guidance/action bar.


## 3. Interaction Stage

Do not model the centre of the UI as a hard-coded "1v1" state.

Use a general **Interaction Stage** capable of representing separately:

- initiator / source,
- effect target or targets,
- current decision actor,
- current resolving participant.

Most interactions may visually appear as 1v1, but the presentation model must support 3+ relevant players. This is required for cases such as:

- Negation by a third player,
- Dying / Peach rescue,
- Judgement modification,
- target shifting,
- Borrowed Sword,
- Lord / delegated responses,
- third-party triggered abilities.

## 3A. Viewer-centric interaction presentation

All players should see the same public event facts, but the Interaction Stage is presented from the current viewer's perspective.

Core rule: **the viewer's own hero is never duplicated into the Interaction Stage.** The local hero remains in the Local Player Dock.

For an event where A is the source, B is the effect target, and C is a third-party decision actor:

- A's view: show B and C in the Interaction Stage; A remains in the local dock.
- B's view: show A and C; B remains in the local dock and receives the red target treatment.
- C's view: show A and B; C remains in the local dock and receives the current-decision treatment.
- An uninvolved viewer D may see A, B, and C in the Interaction Stage.

The public event relationship must remain stable across viewers:

- original source / target relationship stays visible,
- current decision actor is highlighted separately,
- third-party intervention must not rewrite the event as an artificial "C vs A" battle.

The Interaction Stage should use **semantic event positions** rather than attempting to preserve physical seat positions inside the stage. For example, source may be presented to the left and target to the right, while actual table position remains represented by the persistent seat thumbnails.

A player may carry multiple visual roles simultaneously. For example, a player can be both:

- **Red:** current effect target,
- **Cyan / teal:** current decision actor.

Do not let one role erase the other.

## 3B. Public Reaction Chain

The Interaction Stage must show not only the current decision but also the causal path from the root event to the current state.

Define the Interaction Stage as:

**Current Effect + Public Reaction Chain + Current Decision Context**

Example:

```text
CURRENT EFFECT
A ── Attack ──▶ B

REACTION CHAIN
① A · Attack → B              ✓
② B · Dodge                   ✓
③ A · Green Dragon Blade      ▶

CURRENT DECISION
Waiting for A
```

### Reaction Chain purpose

The Reaction Chain is **not** the normal Game Log.

- Game Log = historical record of completed events.
- Reaction Chain = structured explanation of the currently unresolved interaction.

When the interaction settles, the chain may collapse and the final result may be written to normal history.

### Shared public facts

Every viewer should see the same public Reaction Chain order and the same public state-changing actions.

What differs by viewer is only private/local presentation such as:

- the viewer's own hand,
- available response cards,
- private skills / providers,
- local Confirm / Cancel / Skip controls,
- local guidance.

A viewer who does not own the current decision must see only a public status such as:

```text
Waiting for C...
```

They must not see C's private response options.

Only after C submits a public action does that action become a visible Reaction Chain node.

### Root event must remain visible

The root event should remain available even when the chain becomes long.

Example:

```text
ROOT
A · Steal → B

... earlier reactions ▸

⑤ C · Negation                ✓
⑥ D · Negation                ✓
⑦ E · deciding               ▶
```

Older chain nodes may be collapsed for space, especially on mobile, but they must remain inspectable. The root event should not disappear.

### Reaction Chain visibility rule

**Do not render ordinary Pass / Skip / Decline actions as Reaction Chain nodes when they produce no independent gameplay effect.**

Do not show:

```text
C · Pass
D · Pass
E · Pass
```

and do not normally show aggregate noise such as:

```text
3 players passed
```

Instead, while a response window is open, show only the current decision actor:

```text
Waiting for D...
```

If D declines, advance directly to:

```text
Waiting for E...
```

without leaving a visible Pass node.

Pass / decline state may still be retained internally by the engine because it is required to advance response windows correctly.

The local player's Skip / decline control remains visible whenever the authoritative `currentAction` permits it.

The visible Reaction Chain should therefore contain **meaningful state-changing or causally important events**, such as:

- card use,
- skill activation,
- Dodge / required response,
- Negation / counter-Negation,
- target redirection,
- Judgement reveal / replacement,
- damage,
- Dying,
- rescue / Peach,
- other public effects that alter the interaction.

### Long chains

For long interactions, show the root plus the most recent relevant nodes and collapse earlier details.

Target approximately 3–5 visible recent nodes on constrained layouts.

Example:

```text
ROOT
A · Attack → B

①–④ Earlier interaction ▸
⑤ B · Skill                   ✓
⑥ C · Negation                ✓
⑦ D · deciding               ▶
```

### Target redirection

When an effect changes target, update the Current Effect but preserve the causal history.

Example:

```text
CURRENT EFFECT
A ── Attack ──▶ C

REACTION CHAIN
① A · Attack → B             ✓
② B · Redirect Skill         ✓
③ Target B → C               ↪
④ C · Dodge?                 ▶
```

Do not rewrite history as though A originally targeted C.

### Third-party intervention

Third-party intervention is represented as an addition to the current event, not as a replacement event.

Example:

```text
PRIMARY EFFECT
A ── Steal ──▶ B

REACTION CHAIN
① A · Steal → B              ✓
② C · Negation               ✓
③ D · Negation               ✓

CURRENT DECISION
Waiting for E...
```

This model must support deeper intervention chains without losing A → B as the root relationship.

### Dying / rescue

A Dying sequence remains causally attached to the event that caused it.

Example:

```text
ROOT
A · Attack → B

REACTION CHAIN
① A · Attack                 ✓
② B · No Dodge               ✓
③ B · Takes 1 damage         ✓
④ B · DYING                  !
⑤ C · Peach                  ✓
⑥ D · Rescue decision        ▶
```

The visual focus may shift to the dying player, but the originating event remains available.

### Judgement

Judgement also uses the same chain model.

Example:

```text
① Lightning judgement starts ✓
② Reveal 7♠                  ✓
③ Sima Yi · Judgement Skill  ✓
④ Replace with 5♥            ✓
⑤ Final Judgement            ▶
```

### Duel

Keep Duel participants in stable visual positions while the decision actor alternates.

Example:

```text
① A initiates Duel           ✓
② B · Attack                 ✓
③ A · Attack                 ✓
④ B · Attack                 ▶
```

Do not swap the hero panels each time the responder changes.

### AOE

For AOE, preserve the root group effect while showing sequential resolution.

Example:

```text
ROOT
A · Raining Arrows

Affected:
B ✓   C ✓   D ▶   E ○   F ○
```

If D's response causes another intervention, that intervention attaches to the current AOE interaction rather than creating an unrelated visual battle.

### Authoritative Reaction Chain

Do not let each browser infer public chain history from animations.

The server should eventually project enough authoritative public interaction data to reconstruct:

- root event,
- public chain nodes,
- current effect,
- current decision actor,
- current resolving participant,
- final / settled result.

Private choices remain projected only to the player who owns that decision.

## 3C. Responsive Hero Focus and participant presentation

The Interaction Stage must not simply enlarge the existing opponent card. It needs a dedicated public **Hero Focus** presentation whose job is to explain a participant's public state and relationship to the current interaction.

The three layers have different responsibilities:

- **Seat Thumbnail:** find the player, understand seat topology, distance, and lightweight status.
- **Hero Focus / Interaction Stage:** understand a participant's public state and role in the current event.
- **Local Player Dock:** operate the viewer's own cards, skills, and decisions.

### Hero Focus information priority

For a focused opponent, prioritise:

1. hero art,
2. HP / essential hero state,
3. public skills,
4. equipment,
5. Judgement state,
6. concealed hand count / backs,
7. lower-priority player metadata.

Hero art should be materially larger than the Seat Thumbnail so that entering Focus has a meaningful visual and immersive benefit.

Opponent hand presentation is informational, not equivalent to the viewer's operational hand. Normally show a compact concealed count / small backs rather than consuming the stage with one back for every card.

### Four Hero Focus states

Use one coherent Hero Focus presentation with four semantic states rather than unrelated modals:

1. **INSPECT**
   - viewer is voluntarily reading public information,
   - does not mutate gameplay target selection,
   - may open skill / equipment / Judgement explanations.

2. **PREVIEW**
   - local player has selected this participant as an unsubmitted target,
   - selected Seat Thumbnail and Focus stay synchronised,
   - clearly distinguish this from an authoritative event,
   - no public Reaction Chain node exists yet.

3. **ACTIVE**
   - participant belongs to the authoritative current interaction,
   - role markers may include source, effect target, decision actor, or resolving participant,
   - Current Effect and public Reaction Chain are shown as applicable.

4. **SELECTABLE DETAIL**
   - an authoritative multi-stage choice requires selection from this player's cards / zones,
   - legal equipment, Judgement cards, or concealed hand positions become individually selectable,
   - hidden information remains hidden.

Prefer state transitions inside the same visual structure instead of replacing the centre with a separate modal.

### Top Row Mode / wide centre

With 2–4 total players, the Interaction Stage has a relatively wide centre.

For a single external focused participant, use a large central Hero Focus.

For an interaction between two external participants, horizontal semantic presentation is preferred when it fits:

```text
[SOURCE HERO] ── [CARD / SKILL] ──▶ [TARGET HERO]
```

If the viewer is one of those semantic participants, do not duplicate the viewer centrally. Project the viewer's role into the Local Player Dock and show only the external participant centrally.

### Side Column Mode / narrow centre

With 5–10 total players, the Interaction Stage is narrower and taller.

Use a portrait-oriented Hero Focus rather than shrinking a wide desktop card.

For two external semantic participants, prefer vertical relationship presentation:

```text
      [SOURCE]
          │
     [CARD/SKILL]
          │
          ▼
      [TARGET]
```

This is the responsive equivalent of source-left / target-right. Semantic direction remains source → target; only the spatial projection changes.

Do not force two equally large hero panels into a narrow centre if doing so makes the Reaction Chain or current decision unreadable. The current primary Focus / resolving participant may use a **Large Hero Focus**, while the other external participant uses a **Medium Participant Card**.

The hierarchy should communicate who is currently being resolved without losing the root source / target relationship.

### Self-projection rule

The viewer's own hero never appears as a duplicate Hero Focus.

If the viewer is the source:

```text
      [TARGET HERO]
            ▲
            │
        [CARD/SKILL]
            │
           YOU
       Local Dock
```

If the viewer is the target:

```text
       [SOURCE HERO]
            │
        [CARD/SKILL]
            │
            ▼
           YOU
   red Local Dock state
```

If the viewer is the current decision actor, emphasise the Local Player Dock with the decision treatment and keep private options there.

### Preview to authoritative interaction transition

When the local player confirms a Preview, preserve visual continuity where possible.

Example:

```text
PREVIEW
[Zhao Yun]
YOU ─ Attack ─▶ Zhao Yun
```

should transition directly into:

```text
CURRENT EFFECT
[Zhao Yun]
YOU ─ [Attack] ─▶ Zhao Yun
```

without unnecessarily removing and rebuilding the focused hero in another location.

After submission:

- Preview styling ends,
- authoritative event styling begins,
- Cancel disappears for the submitted selection,
- Reaction Chain may now receive the authoritative root node,
- current decision / resolution presentation follows server state.

**Preview ≠ Event.**

### Public skills

Opponent public skills must remain readable and inspectable but should not look like the viewer's large actionable skill buttons.

- local skill controls communicate "I can do this",
- opponent skill chips / labels communicate "this player has this public ability".

Detailed public rules may expand on inspect instead of permanently occupying central space.

### Equipment in Hero Focus

Equipment remains compact, but it may be more explicit than on Seat Thumbnails because it can materially affect target decisions.

Each equipment object must retain an independent inspect / selection identity.

Do not flatten equipment into decorative text because it may participate in:

- Steal,
- Dismantle,
- Borrowed Sword,
- replacement,
- equipment skills,
- other server-projected card choices.

### Judgement in Hero Focus

In ordinary Inspect / Preview / Active presentation, show persistent delayed/Judgement state as compact overlays or badges associated with the hero.

When Judgement itself becomes the active interaction, promote it into the Interaction Stage and show the revealed card, modifier, and resolution chain.

When an effect requires selecting a Judgement-zone card, SELECTABLE DETAIL may expand those compact indicators into individually selectable cards.

### Concealed opponent hand

Normally use a compact representation such as:

```text
[card back] ×4
```

rather than spending central space on four large backs.

When an authoritative choice requires selecting a concealed hand position, expand only as much as necessary:

```text
HAND
[back] [back] [back] [back]
  1      2      3      4
```

All backs remain indistinguishable unless the server explicitly projects additional information. Entering Hero Focus must never reveal private card identities.

### Inspect versus target selection

Inspection and targeting are independent operations.

During target selection:

- Seat Thumbnail body selects / deselects according to target rules,
- a dedicated info affordance opens INSPECT,
- inspecting must not clear, replace, or submit the current target selection.

Outside target selection, the Seat Thumbnail body may open INSPECT.

### SELECTABLE DETAIL continuity

Multi-stage effects such as Steal / Dismantle should not jump into an unrelated generic modal.

Preferred flow:

```text
select card/skill
→ choose player
→ PREVIEW / Confirm as required
→ authoritative next stage
→ same Hero Focus becomes SELECTABLE DETAIL
→ choose legal zone/card
→ Confirm
```

The server projection determines which objects are selectable.

A focused player may therefore move naturally from:

```text
Equipment: [weapon] [armor]
Hand:      [back] ×4
Judgement: [delayed effect]
```

to:

```text
SELECT ONE LEGAL CARD

Equipment: [weapon]* [armor]*
Hand:      [back]* [back]* [back]* [back]*
Judgement: [delayed effect]*
```

without exposing concealed identities.

### Reaction Chain coexistence

Hero Focus must leave room for Current Effect and Reaction Chain.

In a wide centre, a typical relationship may be:

```text
[SOURCE] ── [CARD] ──▶ [TARGET]

REACTION CHAIN
① ...
② ...
③ current ▶
```

In a narrow centre:

```text
      [SOURCE]
          ↓
        [CARD]
          ↓
      [TARGET]

──────────────
ROOT ...
Earlier ×N ▸
recent ...
current ... ▶
```

When space is constrained:

1. collapse older Reaction Chain detail,
2. reduce non-primary external participants from Large to Medium / Compact,
3. compact secondary public metadata,
4. only then consider reducing the primary Hero Focus.

Do not solve Reaction Chain growth by making the local hand unusable.

### Participant-size hierarchy

Interaction participants do not all require identical full-size hero panels.

Use semantic presentation levels:

- **Large Hero Focus:** current primary focus / resolving participant.
- **Medium Participant Card:** important source / target whose relationship must remain visible.
- **Compact Reaction Identity:** third-party reactor whose public action is represented primarily in the Reaction Chain.

A third-party Negation participant, for example, normally does not need another full hero panel merely because they contributed one reaction. Their Seat Thumbnail can receive the appropriate public state while the Reaction Chain records their action.

This prevents complex 5–10 player interactions from filling the centre with enlarged heroes.


## 4. Single-target selection

When the local player selects a card or skill requiring one target:

- Enter target-selection mode.
- Legal target thumbnails become clearly selectable.
- Clicking a legal opponent selects that player.
- The selected thumbnail receives the selected-target border.
- The selected opponent is enlarged in the Interaction Stage.
- Clicking a different legal opponent replaces the old target immediately.
- The previous thumbnail loses selection and the Interaction Stage switches to the new target.
- Confirm remains explicit; selecting the target must not auto-submit.
- Cancel must always be available before submission.
- Re-clicking the selected card / skill may cancel as a shortcut, but must not be the only cancellation method.

The enlarged opponent view should show public information:

- hero image,
- hero / player name,
- HP,
- public skills,
- equipment,
- Judgement Zone,
- concealed hand backs and hand count.

It must never reveal:

- private hand identities,
- hidden role information,
- private capability/provider information not projected to the viewer.

Inspecting public information must be separate from target selection. Selecting a player must not prevent the user from opening hero / equipment / Judgement explanations.

## 5. Multi-target selection

When a card or skill requires more than one but not all players:

- Use projected target minimum / maximum values.
- Show a clear instruction such as:
  - "Select exactly 2 targets",
  - "Select 1–3 targets",
  - "Selected 2 / 3".
- Selected thumbnails receive the target treatment.
- Selected heroes appear in the Interaction Stage.
- Clicking a selected target removes it.
- Clicking another target while below max adds it.
- Clicking another target after max is reached must leave the current selection unchanged and show a clear max-target message.
- Confirm remains visible but disabled until the minimum is satisfied.
- After removal or replacement, re-layout the visible target heroes cleanly.

### Target ordering

Ordinary target groups may be displayed in seat order.

However, **do not use visual seat order as semantic resolution order** when order matters.

Order-sensitive effects (for example Diao Chan's Lust) must retain semantic selection order and display explicit markers such as:

- ① first target,
- ② second target.

This keeps seat position and effect order as separate concepts.

## 6. AOE / all-player effects

AOE or automatic-group effects do not require manual target selection.

On selection / declaration:

- automatically preview all affected players,
- distinguish "all players" from "all other players",
- show affected heroes in seat order,
- keep the local dock in place rather than duplicating the local hero.

During resolution, do not imply that every player resolves simultaneously. Show participant state such as:

- resolved,
- currently responding,
- pending.

The currently resolving participant should be visually dominant.

For large player counts, Interaction Stage density must scale:

- 1 participant: full detail,
- 2–3 participants: medium detail,
- 4+ participants: compact cards,
- allow one compact participant to be inspected in detail without disturbing seat topology.

## 7. Other-player turns

When another player is the turn owner:

- their thumbnail keeps the turn-owner marker,
- their hero may enter the Interaction Stage when they initiate an action,
- the target hero appears opposite / alongside them,
- the current decision actor is highlighted independently.

If the local player is the target:

- do not add a duplicate local hero card,
- highlight the persistent Local Player Dock red,
- show the response instruction and controls in the local dock,
- remove the red target treatment when the target state resolves or shifts.

If the local player is not a target:

- show the source and target(s) in the Interaction Stage,
- keep the local dock available for possible third-party responses such as Negation or triggers,
- clear the transient Interaction Stage when the action / turn context ends.

## 8. Control semantics

Keep these meanings strictly separate:

### Cancel

Cancels an **unsubmitted local selection** only.

Examples:

- deselect current card,
- deselect skill activation,
- clear chosen targets,
- return to the prior local selection state.

Cancel does not send a gameplay decline.

### Confirm

Submits the currently selected legal action to the server.

After Confirm:

- remove or disable Cancel for that submitted action,
- enter resolving / busy presentation,
- do not allow the browser to pretend the submitted action was locally undone.

### Skip

Skip is an authoritative gameplay decision, not a local-selection reset.

Only show Skip when the authoritative action exposes the corresponding semantic decline, such as:

- decline_response,
- decline_trigger,
- skip_rescue.

Never merge Cancel and Skip.

### End Turn

End Turn should not visually compete with an active target-selection confirmation.

## 9. Selection reset / reconciliation

Selection must reconcile with authoritative state.

Clear or rebuild transient selection when relevant authoritative context changes, including:

- actionRevision,
- phase,
- viewer / Quick Test perspective,
- authoritative currentAction,
- legal target projection.

Changing from one selected card or skill to a different one should clear old targets unless the authoritative model explicitly says the target selection remains valid.

Never silently carry a target from Attack into Steal, Duel, another skill, etc.

## 10. Multi-step and special interaction flows

UX V2 must explicitly cover these before being considered complete:

- Attack / Dodge,
- Duel,
- Negation chains,
- AOE / group responses,
- Dying / Peach rescue,
- Judgement and Judgement modification,
- Steal / Dismantle target-zone selection,
- Borrowed Sword,
- target-shifting skills,
- ordered multi-target skills such as Lust,
- self-target and no-target cards / skills,
- defeated-player distance recalculation,
- Quick Test perspective switching.

### Steal / Dismantle

Treat as a two-stage interaction:

1. select target player,
2. select a legal public zone card or concealed hand position according to the server-projected choice.

Do not reveal concealed hand identities.

### Duel

Keep both duel participants in stable positions in the Interaction Stage while the decision-actor highlight alternates. Do not swap their visual positions on each response.

### Dying / rescue

Present the dying player as the event focus and the current rescuer as the decision actor. Do not present rescue as a misleading 1v1 battle.

### Judgement

Present the affected player, delayed / judgement context, revealed card, and any current modifier actor separately.

### Borrowed Sword

Support source, weapon holder, and forced Attack target as distinct participants.

## 11. Authoritative-state and architecture constraints

Preserve the project's existing semantic gameplay architecture.

- `currentAction` remains the authoritative decision contract.
- Preserve server-owned legality.
- Do not add hero-specific or card-specific HTTP actions.
- Do not add new client-only gameplay rules.
- Preserve private hand / provider projection boundaries.
- Preserve stale / replay rejection and actionRevision behaviour.
- Preserve semantic response / trigger continuations.
- Preserve normal multiplayer and Quick Test behaviour.

For future Play-phase targeting, prefer server-projected information such as:

- legal target IDs,
- target min / max,
- whether target order is semantically meaningful,
- automatic all-target semantics,
- multi-stage target-zone choices,
- authoritative public root-event information,
- public Reaction Chain nodes,
- current effect / resolving participant,
- current decision actor.

React should primarily render projected legality and public interaction state rather than learn more card-specific rules or infer chain history from animations.

## 12. Proposed implementation slices — not approved for implementation yet

When implementation is approved, split it into reviewable steps:

1. **UX2.0 — Stable Presentation Contract:** implement the server-side Presentation Projector contract and validate semantic boundaries, interaction/checkpoint identity, blocking decisions, Transition Events, and Reaction Chain projection before relying on it for visual UX.
2. **UX2.1 — Mobile-first seat topology:** implement Top Row Mode for 2–4 total players and Side Column Mode for 5–10, including responsive thumbnail variants, protected central safe zone, projected distance, layered seat states, and Quick Test perspective remapping.
3. **UX2.2 — Local Dock + responsive Hero Focus:** establish the large-hand / large-hero dock hierarchy and fixed bottom guidance bar; add INSPECT / PREVIEW / ACTIVE / SELECTABLE DETAIL Hero Focus states; use wide horizontal event presentation for Top Row Mode and narrow vertical presentation for Side Column Mode; preserve self-projection and Preview → authoritative-event continuity.
4. **UX2.3 — Selection controls:** unified Cancel / Confirm state and reset semantics.
5. **UX2.4 — Multi-target:** projected min/max, deselection, max feedback, ordered-target markers.
6. **UX2.5 — AOE:** automatic participants plus resolved/current/pending state.
7. **UX2.6 — Other-player actions:** source/target/current-actor presentation.
8. **UX2.7 — Local incoming effects:** persistent local red-target state and response controls.
9. **UX2.8 — Special flows:** Negation, Duel, Dying, Judgement, Steal/Dismantle, Borrowed Sword, target shifting.
10. **UX2.9 — Mobile and 7–10 player compaction.**
11. **UX2.10 — Quick Test perspective switching and regression coverage.**

Do not implement all slices in one change. Review the real screen after UX2.1–UX2.3 before committing to later layout details.

## Current open design discussion

The next design discussion should settle **UX2.1 + UX2.2** before coding:

- validate Top Row Mode (2–4) and Side Column Mode (5–10) on real portrait-phone widths,
- validate deterministic odd-seat assignment / exact-opposite placement in Side Column Mode,
- validate top-row versus side-column thumbnail dimensions, labels, HP, hand count, distance, and status density,
- validate the minimum protected Interaction Safe Zone width / height without hard-coding desktop assumptions,
- validate battlefield height above the persistent Local Player Dock,
- validate Large / Medium / Compact participant dimensions in both wide-centre and narrow-centre geometry,
- validate how much hero art can remain visible while public skills/equipment/hand count remain readable,
- validate PREVIEW → ACTIVE transition without unnecessary hero repositioning,
- validate SELECTABLE DETAIL for Steal / Dismantle without a separate modal or hidden-information leak,
- how Current Effect, Reaction Chain, and Current Decision are arranged inside the Interaction Stage,
- where the Reaction Chain sits relative to enlarged hero panels,
- how the Interaction Stage coexists with draw / discard / resolution animation,
- how long Reaction Chains collapse / expand on constrained layouts,
- mobile layout for the same state,
- whether defeated players remain as a separate compact history strip.

### 0.92 UX2.0B Verification / Fix Gate

This gate preserves the prior review history and does not finalise
`interactionId`, `frameId`, `checkpointId`, or `presentationRevision`.

- Engine-backed A-I characterization: **PARTIAL**. Real Attack/Dodge,
  Borrowed Sword forced Attack, viewer reprojection, response timer arming,
  reconnect, and the single-target Group negative case are covered. The
  remaining nested stable points retain explicit projector-only fixtures.
- Root/Active separation: **PARTIAL**. Root targets are explicit-only and
  cannot be copied from an active target; a universal engine root marker is
  still open.
- Group/AOE semantics: **PASS** for detection; **OPEN** for ordering. Only a
  typed Group continuation creates group presentation, while ordering remains
  `UNPROVEN`.
- Causal event scoping: **PASS**. Direct sequence, barrier, parent, and
  settlement references are bounded; unrelated same-resolution history is
  excluded.
- Typed continuation direction: **PARTIAL**. Known discriminators govern
  parent extraction; missing resume data is not inferred.
- Timer/barrier proof: **PARTIAL**. Ordinary response arming and reconnect are
  engine-backed; rescue's separate five-second arm path needs a dedicated
  real Dying/reconnect/timeout test.
- Viewer safety and CurrentAction authority: **PASS** for this foundation.

UX2.0C identity design and React migration remain gated on the open engine
semantics above.

### 0.92.7 UX2.0B-FINAL gate status — 2026-10-02

This final verification pass preserves all preceding review history. It adds
real engine-backed evidence without introducing final presentation IDs.

- Dying/rescue timer: **PARTIAL**. Real Dying, explicit rescue arm,
  reconnect-preserved deadline, and timeout are proven. The route does not
  currently expose `readyAfterEventId` for Dying, so barrier-to-deadline
  linkage is not proven as a universal contract.
- Group parent/resume: **PASS** for the exercised real Group damage-trigger
  path. Active nested damage returns to the authoritative Group continuation
  and advances to the next participant. Ordering remains **OPEN** and is kept
  `UNPROVEN` rather than inferred.
- Duel actor alternation: **PASS**. Real alternating responses change the
  actor and action revision while preserving the causal source/kind/target
  context. `resolutionId` changes and is not promoted.
- Negation root preservation: **PARTIAL**. Real counter-Negation preserves
  stable root source/kind/target projection and the legacy resolution
  reference, but the public event reference changes and the engine does not
  expose a typed parent at that boundary.
- Judgement parent/resume: **PASS** for the exercised reveal/replacement path;
  revealed-event, target, delayed parent, effective result, and resume are
  authoritative.
- Nested damage parent/resume: **PASS** for the exercised Group damage trigger
  path; broader secondary-effect families remain **OPEN**.
- Viewer privacy and CurrentAction authority: **PASS**. No private-data leak
  was found in the real multi-viewer checks.

Overall UX2.0C status is **NOT READY**. Identity design still needs a
universal root/parent lifetime and a bounded barrier/reference contract. No
React, CSS, visual UX, gameplay-rule, or final identity change is authorized
by this gate.
