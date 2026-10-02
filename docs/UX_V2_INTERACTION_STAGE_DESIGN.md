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
│ │ Judgement      │   │ LARGE SKILLS                        │  │
│ │ overlays       │   │ [ Skill ] [ Skill ] [ Skill ]       │  │
│ │                │   │                                     │  │
│ │   LARGE HERO   │   │          LARGE HAND AREA            │  │
│ │      ART       │   │                                     │  │
│ │                │   │ [CARD][CARD][CARD][CARD][CARD]       │  │
│ │                │   │   overlap / fan when necessary      │  │
│ └────────────────┘   └─────────────────────────────────────┘  │
│   compact equipment                                            │
├───────────────────────────────────────────────────────────────┤
│ Guidance / current requirement                 action buttons │
└───────────────────────────────────────────────────────────────┘
```

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

1. **UX2.1 — Seat topology:** fixed 4–10 player thumbnail layout and distance presentation.
2. **UX2.2 — Local Dock + single-target Interaction Stage:** establish the large-hand / large-hero dock hierarchy, fixed bottom guidance bar, then one selected opponent with public detail and target replacement.
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
- how Current Effect, Reaction Chain, and Current Decision are arranged inside the Interaction Stage,
- where the Reaction Chain sits relative to enlarged hero panels,
- how the Interaction Stage coexists with draw / discard / resolution animation,
- how long Reaction Chains collapse / expand on constrained layouts,
- mobile layout for the same state,
- whether defeated players remain as a separate compact history strip.
