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

1. **UX2.1 — Mobile-first seat topology:** implement Top Row Mode for 2–4 total players and Side Column Mode for 5–10, including responsive thumbnail variants, protected central safe zone, projected distance, layered seat states, and Quick Test perspective remapping.
2. **UX2.2 — Local Dock + responsive Hero Focus:** establish the large-hand / large-hero dock hierarchy and fixed bottom guidance bar; add INSPECT / PREVIEW / ACTIVE / SELECTABLE DETAIL Hero Focus states; use wide horizontal event presentation for Top Row Mode and narrow vertical presentation for Side Column Mode; preserve self-projection and Preview → authoritative-event continuity.
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
