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

## 1. Seat thumbnails

Opponent thumbnails remain visible in fixed relative-seat positions in the upper battlefield.

- Do not move a seat thumbnail when that player is enlarged in the Interaction Stage.
- Layout must support the full Standard 4–10 player range.
- Position seats relative to the viewer:
  - clockwise neighbours on the right,
  - counter-clockwise neighbours on the left,
  - an exact opposite seat may use top-centre.
- Keep seats reasonably compact and close enough to make relative position obvious.
- Where practical, show projected effective distance from the viewer.
- Defeated players must no longer occupy the active distance topology. They may remain visible separately as defeated history/status, but must not visually imply that they still sit between living players.

Suggested thumbnail information:

- hero portrait,
- player / hero name,
- HP,
- hand count,
- distance,
- lightweight status markers.

### Visual-state language

Use distinct meanings rather than one generic highlight:

- **Gold:** current turn owner.
- **Cyan / teal:** current decision actor.
- **Red:** current affected / targeted player.
- **Amber / selected border:** target currently selected by the local player.
- **Dim / grey:** defeated or currently illegal.
- **Legal-target affordance:** selectable but not yet selected.

Red must not mean merely "your decision".

## 2. Local Player Dock

The local player's area occupies the lower portion of the screen and does not move.

It contains:

- hero portrait and HP,
- role when locally visible,
- hero skills,
- equipment,
- Judgement Zone,
- hand,
- decision / guidance text,
- Confirm / Cancel / Skip / End controls as applicable.

Core rule: **do not duplicate the local hero in the Interaction Stage when the local player is the target.** Highlight the existing Local Player Dock instead.

When the viewer becomes an effect target, apply a strong red target treatment to the local dock. When the viewer is the required decision actor, show a separate decision treatment.

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
- multi-stage target-zone choices.

React should primarily render projected legality rather than learn more card-specific rules.

## 12. Proposed implementation slices — not approved for implementation yet

When implementation is approved, split it into reviewable steps:

1. **UX2.1 — Seat topology:** fixed 4–10 player thumbnail layout and distance presentation.
2. **UX2.2 — Single-target Interaction Stage:** one selected opponent, public detail, target replacement.
3. **UX2.3 — Selection controls:** unified Cancel / Confirm state and reset semantics.
4. **UX2.4 — Multi-target:** projected min/max, deselection, max feedback, ordered-target markers.
5. **UX2.5 — AOE:** automatic participants plus resolved/current/pending state.
6. **UX2.6 — Other-player actions:** source/target/current-actor presentation.
7. **UX2.7 — Local incoming effects:** persistent local red-target state and response controls.
8. **UX2.8 — Special flows:** Negation, Duel, Dying, Judgement, Steal/Dismantle, Borrowed Sword, target shifting.
9. **UX2.9 — Mobile and 7–10 player compaction.**
10. **UX2.10 — Quick Test perspective switching and regression coverage.**

Do not implement all slices in one change. Review the real screen after UX2.1–UX2.3 before committing to later layout details.

## Current open design discussion

The next design discussion should settle **UX2.1 + UX2.2** before coding:

- exact 4–10 player seat-thumbnail geometry,
- portrait / label / distance density,
- upper battlefield height,
- exact single-target Focus dimensions,
- how the Interaction Stage coexists with draw / discard / resolution animation,
- mobile layout for the same state,
- whether defeated players remain as a separate compact history strip.
