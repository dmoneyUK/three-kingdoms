# UX2 Refinement Decisions

This document records reviewer-approved UX2 refinement requirements that remain authoritative until merged into the primary UX2 design. It defines expected player-facing behavior and acceptance criteria only.

## 1. Local Hero Skill Controls — Single Activation Surface and Readable Adaptive Layout

### 1.1 Final player-facing result

The Local Hero Skills band beside the local Hero artwork is the single primary activation surface for Hero skills.

A player must never need to search the bottom Action Row for a second `Use <Hero Skill>` control. The Hero portrait area, Skills band, Equipment band, Hand, Guidance, and Action Row must each keep one clear responsibility:

- **Hero artwork:** local Hero identity.
- **Skills band:** Hero skills and Hero-skill activation.
- **Equipment band:** equipped cards.
- **Hand:** private playable/selectable cards.
- **Guidance:** what the player is currently expected to do.
- **Action Row:** generic continuation controls such as Confirm, Cancel, Skip, End, Play, or other non-Hero-skill decisions.

The expected mobile presentation is:

```text
┌──────────── Local Hero ────────────┬──────────── Skills ────────────┬── Equipment ──┐
│                                    │  TREACHERY  │    ENTOURAGE     │                │
│            Hero artwork            │             │                  │                │
└────────────────────────────────────┴────────────────────────────────┴────────────────┘
```

For Cao Cao specifically, `TREACHERY` and `ENTOURAGE` must use the available Skills width instead of remaining as narrow content-sized buttons. At 390px and 480px portrait widths, `ENTOURAGE` should remain on one line.

### 1.2 Skills band must use the available width

The Skills band must fill the horizontal space allocated to it.

Required behavior:

- The Skills container must not shrink-wrap to its text content.
- One visible skill uses the available Skills width.
- Two visible skills share the available Skills width evenly.
- Peer skill buttons for the same Hero use equal width and equal height.
- Empty horizontal space must not be left unused while a skill label is wrapping unnecessarily.
- A skill's enabled/disabled/passive state must not change its geometry.
- The Skills band must remain inside the Local Dock and must not overlap Equipment, Hand, Hero artwork, Guidance, or Action controls.

For the current Standard roster, the layout must be optimised for one- and two-skill Heroes. If a future Hero has more visible skills, use a balanced responsive grid rather than shrinking buttons below readable/touchable dimensions.

### 1.3 Skill-name typography

Skill names must be visually balanced, readable, and stable across Heroes.

Rules:

- Prefer one line whenever the complete label naturally fits.
- A single word must not be split across lines merely because the button failed to use available width.
- Multi-word names may wrap only at word boundaries.
- Maximum visible label depth is two lines.
- Never use character-by-character wrapping.
- Never use arbitrary word breaking such as `overflow-wrap: anywhere` for Hero skill names.
- Do not hyphenate Hero skill names.
- Do not truncate the skill name with ellipsis.
- Center the label horizontally and vertically.
- Keep line height compact but readable.
- Prefer giving the button more width before reducing font size.
- Peer buttons must use the same typography scale.

Examples:

```text
Correct:
┌─────────────┐  ┌─────────────┐
│  TREACHERY  │  │  ENTOURAGE  │
└─────────────┘  └─────────────┘

Correct when a natural two-line label is required:
┌────────────────┐
│     SOWING     │
│    DISTRUST    │
└────────────────┘

Incorrect:
┌──────────┐
│ ENTOUR-  │
│   AGE    │
└──────────┘

Incorrect:
┌──────┐
│ E N  │
│ T O  │
│ U R  │
│ A G  │
│ E    │
└──────┘
```

### 1.4 Consistent button geometry

All Hero skill buttons must belong to one visual system.

Requirements:

- Minimum touch target: 44px × 44px.
- Buttons belonging to one Hero must be equal height.
- Two peer buttons must be equal width to within normal sub-pixel rendering tolerance.
- A long skill name must not make one peer button visibly larger than another.
- A short skill name must not collapse into a visibly smaller button.
- Active, available, passive, and unavailable states are communicated through state styling, not through different button sizes.
- The active skill state must be visually unmistakable.
- Disabled/passive skills remain legible and visually present without looking like an unrelated control.

### 1.5 The Skills band is the only Hero-skill activation entry point

Every **voluntary Hero skill** that the authoritative `CurrentAction` makes available must be activated from its corresponding button in the Skills band, regardless of how the capability is represented internally.

This applies to:

- Play-Phase Hero skills;
- optional phase-triggered Hero skills;
- optional damage/recovery/event-triggered Hero skills;
- explicit Hero response providers;
- Hero skills that enter a card-selection flow;
- Hero skills that enter a target-selection flow;
- Hero skills that enter a target-card selection flow.

The UI must not require the player to use a generic bottom control carrying the Hero skill name.

Examples of the required routing include, but are not limited to:

- **Cao Cao:** Treachery, Entourage.
- **Sima Yi:** Retaliation, Necromancy.
- **Ma Chao:** Horse Riding remains visible as a passive/unavailable skill when appropriate; Cavalry becomes actionable in the Skills band when authoritative capability exists.
- **Zhou Yu:** Heroic and Sowing Distrust use the same peer-button geometry.
- **Hua Tuo:** First Aid must use the Hero Skills band when it is a legal response provider; Prodigal Healer uses the same Hero-skill activation surface.
- **Zhuge Liang:** Stargazing is activated from the Hero Skills band when offered.
- **Lady Gan:** Divine Wisdom and Prudence are activated from the Hero Skills band when offered.
- **Huang Gai:** Self Sacrifice is activated from the Hero Skills band when legal.
- **Guan Yu / Zhao Yun:** transformation-response skills remain controlled from their Hero skill button rather than a duplicate generic action entry.

The complete implemented Standard Hero roster must be audited; the examples above are not an exhaustive allow-list.

### 1.6 Passive and automatic skills

A passive or automatic Hero skill must still have a stable visual home in the Skills band, but it must not create a false activation affordance.

Expected behavior:

- Passive skill: visible in the Skills band, non-actionable unless the rules explicitly create a voluntary decision.
- Automatic effect with no player decision: no duplicate Action Row button.
- Optional trigger: the existing skill button becomes enabled only while the authoritative trigger option is available.
- If the same Hero skill changes between passive/unavailable and actionable states, the button stays in the same location and changes state rather than appearing elsewhere.

### 1.7 Activation and continuation behavior

Clicking a Hero skill button may do one of two things:

1. **Immediate authoritative activation**
   - If the projected skill requires no further selection, the Skills button may submit that Hero-skill action directly.

2. **Enter an authoritative selection flow**
   - If the skill requires cards, targets, target cards, or another projected selection, clicking the Skills button activates that flow.
   - Eligible cards/targets are then highlighted or made selectable using the existing authoritative selection surfaces.
   - The bottom Action Row may show generic `Confirm` / `Cancel` after activation.
   - The Action Row must not repeat `Use <Skill Name>` as a second activation button.

A mandatory follow-up decision created *after* a Hero skill has resolved or entered a new authoritative sub-state is not considered a duplicate activation. Such follow-up decisions may use the normal decision controls appropriate to that state.

### 1.8 No duplicate Hero-skill controls in the bottom Action Row

For a Hero-skill capability that has a Skills-band control:

- Do not also render `Use <Skill>`, `<Skill>`, or another equivalent activation button in the generic action-extras area.
- Generic action controls may contain only continuation/decision actions that are not duplicate Hero-skill activation.
- Equipment providers and non-Hero providers may continue to use their appropriate existing generic response surface when they do not belong to the Hero Skills band.
- Moving a Hero skill into the Skills band must not change server legality, provider IDs, target legality, response privacy, or resolution semantics.

### 1.9 Responsive acceptance

Validate the Local Hero Skills system at minimum at:

- 320px portrait;
- 390px portrait;
- 480px portrait;
- a wide desktop/tablet viewport.

For every implemented Standard Hero:

- every metadata Hero skill appears in the Skills band;
- peer buttons have consistent geometry;
- buttons remain inside the Skills panel;
- no skill overlaps Equipment, Hero artwork, Hand, Guidance, or Action Row;
- no skill name is clipped;
- no skill name overflows its button;
- no character-by-character wrapping occurs;
- no single-word skill wraps when the available Skills width is sufficient;
- multi-word labels use no more than two natural lines;
- no horizontal document overflow is introduced;
- touch targets remain at least 44px × 44px.

Specific visual regression cases must include at least:

- Cao Cao — `Treachery` / `Entourage`;
- Zhou Yu — `Heroic` / `Sowing Distrust`;
- Ma Chao — `Horse Riding` / `Cavalry`;
- Sima Yi — `Retaliation` / `Necromancy`;
- a Hero with one skill;
- a Hero with two long multi-word skills.

### 1.10 Functional acceptance across all implemented Heroes

The audit must use the implemented Standard roster as the source set rather than testing only one representative Hero.

For each implemented Hero capability:

- If the server does not currently offer the capability, the skill button must not become falsely actionable.
- If an optional Hero capability is authoritatively offered, the corresponding Skills-band button must become the activation point.
- If the capability requires a selection, activating the button must enter the correct existing authoritative selection flow.
- If the capability is already active, the Skills button must visibly reflect that state.
- If the active local flow is cancelled or invalidated by a new action revision, the skill control must return to the correct inactive state.
- A mapped Hero skill must not also appear as a duplicate bottom action-extra control.
- Response-provider privacy must remain unchanged.
- React must not reconstruct Hero-skill legality from Hero name, phase, HP, card colour, target distance, or any other local guess when the authoritative action does not expose that option.

### 1.11 Completion criterion

This refinement is complete only when the Local Hero Skills band functions as a consistent, readable, single Hero-skill control surface across the entire implemented Standard roster.

The player should be able to look beside their Hero portrait and immediately answer:

- What skills does my Hero have?
- Which skill is available now?
- Which skill is active?
- Where do I press to use it?

They should never need to scan the bottom Action Row to discover a Hero-skill activation that should have been available beside the Hero.

## 2. Single-Target Stratagem Negation Flow — Minimal Causal Composition

### 2.1 Final player-facing result

A single-target Stratagem that opens a Negation window must be presented as a visual causal relationship, not as a text-heavy state explanation.

The default mobile causal composition is:

```text
        SOURCE
          ↓
      ROOT CARD
          ↓
        TARGET
```

The Stage must communicate primarily through:

- participant artwork;
- the real action card;
- causal arrows/lines;
- active-card highlight;
- compact public response branches.

The Local Guidance Strip communicates the viewer's private next action.

Do not require the player to read implementation-state labels such as:

- `NEGATION RESPONSE`;
- `EFFECT`;
- `REACTION CHAIN`;
- `ORIGINAL EFFECT`;
- `NEGATION WINDOW`;
- `CURRENT PARTICIPANT`;
- `PUBLIC CAUSAL CONTEXT`;
- `Waiting for response...`.

For a legal private Negation opportunity, the local instruction should normally be only:

```text
Play Negation or Skip.
```

The player should be able to understand the public event by looking at the spatial relationship and current highlighted card.

### 2.2 Fixed mobile causal geometry

At mobile portrait widths, the single-target ACTIVE scene uses one stable vertical spine:

```text
         [Source portrait]
               ↓
          [Root card]
               ↓
         [Target portrait]
```

The Source, Root Card, and Target positions must remain stable throughout:

- open Negation window;
- first public Negation;
- counter-Negation;
- Negation settlement;
- return to the root action when the counter-chain is defeated.

The Stage must not reconstruct itself into a different layout merely because the current active public response changes.

For a 390px portrait viewport:

- Stage horizontal inset target: approximately 16px per side;
- Source portrait target size: approximately 64 × 82px;
- Root action card target width: approximately 84–92px;
- Root action card target height: approximately 120–132px;
- Source-to-root vertical gap: approximately 12–16px;
- the final Stage visual element should sit no more than 24px above the Local Guidance Strip.

These are layout targets rather than gameplay semantics. The implementation may adjust exact pixels for real card aspect ratio and responsive fit, but it must preserve the same hierarchy and measurable containment.

### 2.3 Source presentation

The Stage Source is a compact event identity, not a second full player card.

Show:

- Hero portrait/artwork;
- player name.

Do not repeat:

- HP;
- Hero name;
- Hand count;
- Equipment;
- role/faction;
- `SOURCE` heading.

Those facts already exist in the fixed Seat or Local Dock.

The Source must come from authoritative presentation data. React must not infer it from turn owner, seat position, timeline order, animation state, or card ownership guesses.

### 2.4 Root action card

The root Stratagem card is the main visual node of the interaction.

Requirements:

- Render the actual public card identity/artwork when authoritative card/effect identity is proven.
- Do not replace the card with a separate text-only `EFFECT` panel.
- Do not repeat the card name in a second `ORIGINAL EFFECT` block.
- The root card is highlighted while it is the newest unresolved public action head.
- When a public Negation is submitted, the root card remains visible but becomes visually subdued.
- If the Negation chain is defeated and the original effect resumes, the root card becomes the active highlight again without moving.

The root card's position must not move by more than 2 CSS pixels when a public Negation branch appears or disappears.

### 2.5 Target presentation

For an ordinary non-self target:

```text
        Cao Cao
       [portrait]
           ↓
        [STEAL]
           ↓
       Gan Ning
      [portrait]
```

The target presentation should contain only:

- compact Hero portrait/artwork;
- player name.

Do not repeat HP, Hero name, Hand count, Equipment, `TARGET`, `FOCUS`, or decision metadata.

The target must come from authoritative presentation data.

### 2.6 Self-target composition

If the authoritative source and target are the same player, do not render the same participant twice.

For a self-target Stratagem such as Something Out of Nothing, use one participant node and a compact self-return relationship:

```text
             Player1
           [portrait]
               │
               ▼
  [SOMETHING OUT OF NOTHING]
               ╰────↗
```

The return curve/loop means that the root action resolves back to the same participant.

Visible text such as:

```text
Player1 → Player1
SELF TARGET
SOURCE
TARGET
```

must not be required.

A small self marker may be used only if usability testing shows that the loop alone is ambiguous, but duplicating the participant remains forbidden.

Measurable rule:

- In a self-target ACTIVE Stage, the same participant must have exactly one visible participant representation in the causal composition.

### 2.7 Open Negation window — no Reaction Chain panel

An open Negation opportunity is not yet a public reaction chain.

Before anybody actually submits Negation:

```text
             Player1
           [portrait]
               ↓
  [SOMETHING OUT OF NOTHING]
             ACTIVE
               ╰────↗
```

The public Stage must not render a large Reaction Chain panel or a placeholder Negation card.

The following visible headings/copy must be absent from the normal simple open-Negation Stage:

- `NEGATION RESPONSE`;
- `EFFECT`;
- `REACTION CHAIN`;
- `ORIGINAL EFFECT`;
- `NEGATION WINDOW`;
- `A Negation may be played now.`;
- `Waiting for response...`.

The eligible viewer's Local Guidance Strip supplies the private instruction:

```text
Play Negation or Skip.
```

No public player name may be shown merely because that player is currently being privately offered a Negation decision.

### 2.8 Active-card visual state

At any moment, the public root/response chain has exactly one active visual head.

Recommended visual treatment:

**Active card**
- full opacity;
- approximately 2px emphasized border;
- restrained outer glow of approximately 6–10px;
- highest visual contrast in the chain.

**Inactive causal predecessor**
- opacity approximately 0.60–0.72;
- no outer glow;
- lower-emphasis border.

Hard rule:

- exactly one public card in the current root/response chain is marked active at a time.

Do not use competing simultaneous highlights that make it unclear which card is currently responseable.

### 2.9 First public Negation — branch from the root card

A Negation card appears only after it is actually submitted and becomes public.

Transition:

```text
BEFORE

            Player1
               ↓
  [SOMETHING OUT OF NOTHING]
             ACTIVE


AFTER

            Player1
               ↓
 [Something Out of Nothing] ───── [NEGATION]
          subdued                    ACTIVE
               ╰────↗
```

Requirements:

- Source position does not move.
- Root card position does not move.
- Target/self relationship does not move.
- The new Negation card branches directly from the root card.
- The root card remains visible as causal context.
- The new Negation becomes the only active highlight.
- Do not create a separate text-heavy Reaction Chain panel containing the same facts.

Recommended first-branch card size on 390px portrait:

- approximately 72–78px wide;
- approximately 102–112px high;
- approximately 14–20px horizontal gap from the root card where space permits.

The connecting line should visually attach the Negation to the root card.

### 2.10 Public actor of a submitted Negation

Once Negation is publicly submitted, the identity of the player who actually played it may be shown if that identity is public under the game rules.

Preferred presentation:

```text
[NEGATION]
 Cao Cao
```

or a very small Hero/avatar badge plus the player name.

Do not expand this into prose such as:

```text
NEGATION 1
Cao Cao played this card.
```

Do not reveal who *could* play Negation before they actually submit one.

### 2.11 Counter-Negation

Each new public counter-response extends the same compact branch:

```text
[Something Out of Nothing] ─ [Negation] ─ [NEGATION]
          subdued               subdued       ACTIVE
```

Rules:

- the newest unresolved public response is the only active highlight;
- previous public cards remain visible as causal predecessors;
- Source and Target do not move;
- no large Reaction Chain panel is introduced;
- the chain remains inside the Stage and does not create page-level horizontal overflow.

On narrow screens, display at most:

- the root card;
- the most recent two public response cards at full readable size.

If more public counter-responses exist, compact older history:

```text
[ROOT] ─ [+3] ─ [Negation] ─ [NEGATION]
                               old          ACTIVE
```

The compact history indicator must never replace either the root identity or the current active head.

### 2.12 Negation settlement

#### Negation succeeds against the root effect

When the final Negation cancels the original effect:

- settle/collapse the public response branch;
- show a brief compact cancelled/negated state on the root action, e.g. `⊘`;
- exit the interaction when authoritative settlement completes.

Do not add explanatory prose such as:

- `Negation succeeded`;
- `Effect cancelled`;
- `Resolution complete`.

#### Negation is defeated by counter-Negation

When the counter-chain restores the root effect:

- collapse/settle the public response branch;
- keep Source and Target positions unchanged;
- restore the root action card as the active highlighted card;
- continue the authoritative root action.

The root card must return to active state without a layout jump.

### 2.13 Local Guidance

The Local Guidance Strip immediately below the Stage owns the viewer's private next-step instruction.

For the open Negation decision:

```text
Play Negation or Skip.
```

Do not duplicate that instruction in the public Stage.

The visible `YOUR RESPONSE` prefix is optional and should be removed if the action remains clear without it.

Preferred Guidance characteristics:

- one primary instruction;
- one line whenever practical;
- maximum two lines;
- approximately 52–64px total height on mobile;
- no duplicated event explanation.

The Stage tells the player what is happening; the Guidance Strip tells the local player what to do.

### 2.14 Response timer

If the response decision is timed, the response timer remains in one stable top-right location.

The timer itself already communicates that the interaction is waiting.

Therefore the public Stage should not repeat `Waiting for response...`.

The timer must:

- not reveal a private responder identity;
- not overlap Exit;
- remain stable when root/branch active state changes;
- appear consistently for the authoritative timed response state.

### 2.15 Content-driven Stage height

A simple single-target Negation window must not reserve a large empty Stage merely because a generic Interaction Stage supports more complex scenes.

The Stage height should be content-driven.

For a simple self-target open-Negation scene at 390px portrait, the intended visible interaction content should normally fit within approximately 240–300px, excluding the fixed opponent Seat area and Local Dock.

Hard acceptance rule:

- vertical gap between the lowest visible Stage causal element and the Local Guidance Strip must be no more than 24px unless a proven responsive constraint requires a documented compact alternative.

Do not preserve large unused blank areas below a completed causal composition.

### 2.16 Generic single-target Stratagem grammar

The design is not specific to Something Out of Nothing.

All proven single-target Stratagem/effect flows should converge on the same visual grammar when compatible with their semantics:

```text
Source
  ↓
Root Action
  ↓
Target
```

Examples include, when authoritative semantics permit:

- Steal;
- Dismantle;
- Duel;
- Overindulgence;
- Rations Depleted;
- Something Out of Nothing;
- other single-target Negatable effects.

Their public Negation grammar is always:

```text
Root Action ─ Negation ─ Counter-Negation
```

The active highlight always identifies the newest unresolved public action head.

Do not hard-code card-name-specific layout behavior when one generic authoritative composition can express the same relationship.

### 2.17 Relationship to Group/AOE composition

Single-target and Group/AOE compositions share the same causal visual language.

**Single target**

```text
Source
  ↓
Root Card
  ↓
Target
```

**Group/AOE**

```text
Source
  ↓
Root Card
  ↓
Group Target Strip
```

Both use the same public counter-response rule:

```text
Root Card ─ Negation ─ Counter-Negation
```

This consistency is intentional. Players should not need to learn a separate reaction language for single-target and Group effects.

### 2.18 Privacy and authority

This refinement changes presentation only.

React must not infer:

- Source;
- Target;
- self-target legality;
- Negation eligibility;
- current private responder;
- public response actor;
- response order;
- settlement;
- whether the root effect resumes;

from:

- turn owner;
- card name;
- player name;
- seat order;
- HP change;
- timeline order;
- local animation state.

Use authoritative `CurrentAction`, Presentation, and causal/reaction projections.

If a relationship is not authoritatively proven, fail closed rather than fabricating a visually complete chain.

### 2.19 Measurable browser acceptance

Validate at minimum at:

- 390 × 844 portrait;
- 480 × 900 portrait;
- one wide desktop/tablet viewport.

Required reference states:

1. open Negation window, no submitted Negation;
2. first Negation publicly submitted;
3. counter-Negation publicly submitted;
4. chain resolves with root cancelled;
5. chain resolves with root restored;
6. ordinary non-self target;
7. self-target root action.

Acceptance metrics:

| Requirement | Measurable expectation |
| --- | --- |
| Self-target participant count | Same player appears once in the Stage causal composition |
| Open Negation window | Large Reaction Chain panel count = 0 |
| Open Negation window | Visible Negation branch card count = 0 |
| Active public card | Exactly 1 active card in root/response chain |
| First Negation | Root card coordinate delta ≤ 2 CSS px |
| First Negation | Source coordinate delta ≤ 2 CSS px |
| First Negation | Target/self relationship coordinate delta ≤ 2 CSS px |
| Stage/Dock | Overlap = 0 |
| Stage/Guidance | Overlap = 0 |
| Horizontal document overflow | 0 |
| Private responder leakage | No private responder name in public Stage before public submission |
| Banned visible headings in simple open window | `EFFECT`, `REACTION CHAIN`, `ORIGINAL EFFECT`, `NEGATION WINDOW` count = 0 |
| Primary local instruction | One main Guidance instruction |
| Stage trailing blank space | Lowest causal element to Guidance ≤ 24px |
| Mobile typography | No character-by-character wrapping |
| Multi-Negation branch | Root and newest active head always remain visible |
| Long counter chain | Older history compacts without page-level overflow |

### 2.20 Completion criterion

This refinement is complete when a player can understand the entire Negation flow primarily by watching cards and participant relationships rather than reading state descriptions.

At a glance, the player should be able to answer:

- Who caused the action?
- What root card/effect is being resolved?
- Who is the target?
- Which public card is currently being responded to?
- What do I personally need to do?

The public Stage should answer the first four visually.

The Local Guidance Strip should answer the last one with one short instruction.

