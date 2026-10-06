# UX2 Refinement Decisions

This document is the current UX2 product/UI design authority for the refinement phase. It records reviewer-approved expected behavior, interaction presentation, responsive requirements, and measurable acceptance criteria. It is not a task queue.

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

## 3. Group / AOE Response Refinement — Direct Actions, Local System Controls, and Recognisable Combat Actors

### 3.1 Final player-facing result

Group/AOE response scenes must preserve the proven causal structure while making the current response immediately understandable on a phone.

Raining Arrows is the reference flow:

```text
             Source
            [portrait]
                ↓
       [RAINING ARROWS]
                │
          ──────┼──────
           │    │    │
        Target Target Target
          ✓     ♥↓    CURRENT

                        ⌛ 18s   [☰]
────────────────────────────────────
Respond to Raining Arrows.
────────────────────────────────────
Local Hero / Skills / Equipment / Hand
────────────────────────────────────
                      Confirm / Take Damage
```

The Stage must rely primarily on recognisable Hero artwork, the real public root card, visible causal connectors, compact authoritative outcomes, and one unmistakable current-participant highlight.

Do not return to metadata-heavy `Group Resolution` presentation.

### 3.2 One stable target strip

All affected Group/AOE participants appear once in one stable target strip.

Do not reintroduce a separate large Current Target Hero.

Every target marker, including the viewer, uses the same structural grammar:

- recognisable Hero portrait;
- player name;
- compact authoritative state;
- current-state highlight when applicable.

The viewer's target-strip marker represents the viewer's public role in the event. The Local Player Dock remains the viewer's operational Hero surface.

Viewer and opponent target markers must not use visibly different dimensions merely because one is local.

### 3.3 Enlarge central combat Hero artwork

Current Group/AOE participant portraits are too small to identify reliably on phone screens. The central combat view must give Hero artwork enough visual weight to be recognisable without reading the player name first.

For a three-target reference case at 390px and 480px portrait widths:

- Source portrait preferred width: 92–112px;
- Source portrait preferred height: 112–140px;
- Group target portrait preferred width: 72–84px;
- Group target portrait preferred height: 88–104px;
- target portraits use equal dimensions within 2 CSS px;
- the current target may gain glow/border emphasis but must not become a differently sized card.

For four or five simultaneous targets, responsive compression may reduce target portraits to approximately 56–68px wide while preserving recognisable artwork and equal geometry.

For larger Group/AOE sets, use the existing COMPACT/CRITICAL density model rather than shrinking every Hero into an unreadable thumbnail. The current participant must remain individually recognisable.

The current participant must not be indicated primarily by a `▶` text glyph. Prefer:

- gold border/glow;
- a small downward current marker;
- stronger contrast;
- stable underline/accent.

Accessible text may still announce `Current`.

### 3.4 Show the AOE relationship as a visible branch

The root AOE card should visibly distribute to the affected target set.

Preferred relation:

```text
        [RAINING ARROWS]
               │
          ─────┼─────
           │   │   │
          P1  P2  P3
```

A single arrow ending above a row of unrelated-looking labels is not sufficient when space permits a clearer branch.

The connector remains lightweight and must not compete visually with the active card or current participant.

Branch geometry must remain stable as participants move from Pending to Current to Resolved.

### 3.5 Compact, non-numeric participant outcomes

Participant outcomes remain authoritative and visually compact.

Preferred visible semantics:

- successful required response: `✓`;
- damaged: a non-numeric damage/heart-loss marker such as `♥↓`;
- negated for this participant: `⊘`;
- defeated: compact defeated marker;
- pending: neutral/subdued state;
- current: highlight/marker rather than a `▶` character.

Do not hard-code a visible numeric damage amount such as `-1♥` unless the authoritative presentation explicitly supplies the resolved amount and the product intentionally needs that number.

The AOE progress display communicates outcome category; it must not reconstruct damage arithmetic from the card's normal text.

### 3.6 Direct local guidance

The Local Guidance Strip must never use `Group Resolution` as the primary player instruction.

For Raining Arrows, use a short event-facing instruction such as:

```text
Respond to Raining Arrows.
```

Do not use as primary guidance:

- `Group Resolution`;
- `0 cards selected`;
- `Current Participant`;
- `Active Scope`;
- other implementation-state terminology.

A secondary selection count may appear only after the player has entered a real selection flow and when it materially helps.

### 3.7 Raining Arrows response action — TAKE DAMAGE

When the current Raining Arrows participant may satisfy the response with Dodge, the meaningful choices are:

- use an authoritative Dodge provider; or
- accept the unresolved effect.

The red alternative action is:

```text
TAKE DAMAGE
```

Do not label this control:

- `SKIP`;
- `Take 1 Damage`;
- `Lose 1 HP`.

The action deliberately does not encode a numeric amount. Damage can be modified, redirected, prevented, amplified, or otherwise affected by authoritative rules and abilities. The control expresses the player's decision, not a predicted final damage amount.

If no legal Dodge provider exists:

- `TAKE DAMAGE` becomes the sole main response action;
- do not require the player to press a semantically vague `SKIP`;
- do not show a disabled Confirm as though card selection were still possible.

If one or more legal Dodge providers exist:

- legal Dodge cards/providers are visually selectable using authoritative response surfaces;
- unrelated Hand cards remain visible but visually quieter;
- `Confirm` becomes available only when a complete legal response selection exists;
- `TAKE DAMAGE` remains the explicit alternative.

This changes presentation and decision labels only. It does not change damage settlement semantics.

### 3.8 Discoverable legal response providers

During a required-card response such as Raining Arrows → Dodge:

- authoritative legal response cards/providers should be visually emphasised enough to be found in approximately one second;
- unrelated Hand cards should remain visible but slightly subdued;
- React must not reconstruct legality from card colour, name, Hero, or local heuristics;
- Equipment and Hero response providers remain in their established surfaces.

The emphasis must not resemble a modal picker unless the interaction has actually entered a dedicated picker state.

### 3.9 Minimise the top system-control area during active combat

The active combat screen should not reserve a large top-row area for Exit, secondary event/system controls, and the response timer.

During an Interaction Stage, move secondary system controls into one compact System Menu cluster at the lower-right edge of the Stage, immediately above the Local Guidance Strip.

Reference placement:

```text
                         ⌛ 18s   [☰]
─────────────────────────────────────  Stage bottom
Respond to Raining Arrows.
─────────────────────────────────────  Guidance
```

The fixed opponent Seat topology remains at the top. Do not insert another persistent control bar between the Seats and the interaction.

The active game event itself remains visible in the Stage as the causal card/relationship. Only secondary system/navigation controls move into the System Menu.

### 3.10 System Menu

Provide one compact System Menu control inside the lower-right of the Interaction Stage.

Requirements:

- one stable menu icon such as `☰` or an equivalent established system icon;
- minimum touch target: 44 × 44px;
- anchored inside the Stage, not inside the Local Player Dock;
- preferred right inset: 12–16px;
- preferred bottom inset above Guidance: 8–12px;
- it must not overlap the target strip, public response branch, or Guidance.

Existing secondary system/navigation actions that currently occupy the top combat area should move into this menu where compatible with their semantics.

`Exit Game` belongs inside this menu rather than as a persistent large button.

Exit remains destructive and should keep its existing confirmation/safety behavior. Moving it into the menu must not make accidental exit easier.

### 3.11 Response timer placement

The response timer moves with the System Menu cluster.

Placement:

- immediately to the left of the System Menu;
- stable throughout the same response state;
- approximately 8px gap from the menu;
- visually compact;
- close enough to the Local Guidance/action region to remain in the player's response attention zone.

Suggested mobile timer footprint:

- width: approximately 52–68px;
- height: approximately 36–44px.

The timer must not reveal a private responder identity and must not overlap the target strip or Guidance.

The old large top-right timer block should not reserve persistent vertical space during active combat.

### 3.12 Content-driven Stage ending

After the target strip and any compact public response branch, the Stage should end promptly.

For ordinary mobile Group/AOE scenes:

- target-strip/last-causal-element to system cluster: enough space for non-overlap only;
- system cluster to Guidance: 8–12px preferred;
- unused trailing Stage space must not remain merely to preserve an old fixed-height composition.

The Local Guidance Strip should feel visually attached to the current combat decision.

### 3.13 Measurable acceptance

Validate at minimum:

- 390 × 844 portrait;
- 480 × 900 portrait;
- one wide desktop/tablet viewport.

Required checks:

| Requirement | Expectation |
| --- | --- |
| Target representation | Every affected participant appears once |
| Target portrait geometry | Equal within 2 CSS px for the same density mode |
| Hero recognition | Current participant has a recognisable portrait, not text-only `You ▶` |
| Current indication | No `▶` glyph required as the primary current marker |
| AOE connector | Root visibly branches to the target set |
| Damaged marker | No hard-coded numeric amount required |
| No-Dodge action | Visible primary action is `TAKE DAMAGE` |
| No-Dodge action | No visible `SKIP` used as the damage-acceptance label |
| No-Dodge action | No disabled Confirm implying an unavailable selection |
| Legal Dodge | Authoritative legal Dodge provider is visually discoverable |
| Guidance | Primary visible copy does not say `Group Resolution` |
| System menu | 44 × 44px minimum touch target |
| Exit | Not persistently displayed as a large top combat button |
| Timer | Immediately left of System Menu in the Stage lower-right cluster |
| Stage/Guidance | Overlap = 0 |
| Stage/Dock | Overlap = 0 |
| System cluster/targets | Overlap = 0 |
| Horizontal document overflow | 0 |
| State progression | Source/root/target-strip anchors remain stable as Current advances |

### 3.14 Completion criterion

This refinement is complete when a player can follow a Group/AOE sequence by recognising the source Hero, the root action card, the affected Hero portraits, the current highlight, and compact outcomes without reading implementation-state text.

The response controls must describe the player's actual decision. In particular, accepting unresolved Raining Arrows is represented as `TAKE DAMAGE`, never as a generic `SKIP` or a guessed numeric damage amount.

## 4. Zhuge Liang Skill Presentation — Actionable Stargazing and Clearly Passive Empty Fortress Strategem

### 4.1 Reference behavior

Zhuge Liang has two official Standard skills:

- **Stargazing** — an optional Preparation Phase action;
- **Empty Fortress Strategem** — a passive targeting prohibition.

Use the authoritative printed project spelling **Empty Fortress Strategem**. Do not silently rename or "correct" the printed player-facing skill name.

These two skills must occupy the same Local Hero Skills band but must not look like two equivalent disabled action buttons.

### 4.2 Visual hierarchy

The two skill tiles/buttons share equal geometry, but their interaction roles are visually distinct.

Reference layout:

```text
┌──────────────────┬──────────────────┐
│    STARGAZING     │  EMPTY FORTRESS  │
│                   │    STRATEGEM     │
│  optional action  │      passive     │
└──────────────────┴──────────────────┘
```

The role labels above are explanatory only; the production UI should use concise visual state treatment rather than adding full descriptive sentences.

Required geometry:

- equal width within 1 CSS px;
- equal height within 1 CSS px;
- minimum 44 × 44px touch geometry for the actionable Stargazing control;
- maximum two visible text lines;
- no character-by-character wrapping;
- no clipping or ellipsis;
- no arbitrary word breaking.

At 390px and 480px portrait widths:

- `STARGAZING` should remain one line;
- `EMPTY FORTRESS STRATEGEM` should render as exactly two balanced lines when the full name does not fit on one line;
- preferred phrase grouping is `EMPTY FORTRESS` / `STRATEGEM`;
- the full skill name remains visible.

At 320px portrait, the same name may use two lines with reduced typography only after the Skills band has used all available width.

### 4.3 Stargazing states

Stargazing is an optional Hero action, not a permanently disabled label.

The Stargazing control has three presentation states:

**Unavailable**
- visible in its stable Skills-band position;
- subdued;
- not actionable;
- does not move or resize.

**Available**
- enabled only when the authoritative `zhuge_liang_stargazing` option is projected;
- clear actionable border/highlight;
- remains in the same position and dimensions;
- clicking the skill starts the authoritative Stargazing flow.

**Active / selection in progress**
- uses the standard active-skill visual state;
- remains visibly associated with the Stargazing flow while the authoritative deck-reorder decision is active;
- bottom Action Row must not add a duplicate `Use Stargazing` activation control.

React must not enable Stargazing by inferring Preparation Phase, turn owner, deck state, or Hero identity alone.

### 4.4 Empty Fortress Strategem is passive, not a disabled action

Empty Fortress Strategem must remain visible in the Skills band because it is part of Zhuge Liang's Hero identity, but it must not visually pretend to be a temporarily unavailable button.

Preferred passive treatment:

- same outer geometry as the peer Stargazing tile;
- neutral/passive surface treatment rather than action-button treatment;
- a small passive/shield semantic marker may be used;
- no pressed/hover affordance implying activation;
- accessible name identifies it as passive.

Do not create:

- a bottom Action Row control;
- an enabled click action;
- a fake provider;
- an explanatory modal merely because the skill is passive.

If the server/presentation layer later provides explicit authoritative proof that Empty Fortress is currently in-force, the passive tile may gain a mild "active passive" emphasis. React must not infer that state directly from local Hand count unless that relationship is part of an approved authoritative presentation contract.

### 4.5 Actionable and passive skills must be distinguishable without size changes

The player should be able to tell which skill can be pressed without relying on trial-and-error.

Use role/state styling such as:

- actionable available skill: stronger gold border/contrast;
- active selected skill: established active glow;
- unavailable optional skill: subdued action styling;
- passive skill: stable neutral/passive styling plus a compact semantic icon/marker.

Do not communicate the difference by making one button smaller, narrower, or shorter.

Do not rely on colour alone; preserve accessible role/state semantics.

### 4.6 No duplicate Stargazing entry point

When Stargazing is authoritatively available:

- the Skills-band Stargazing control is the activation entry point;
- no `Stargazing`, `Use Stargazing`, or equivalent activation control may appear in generic bottom action extras;
- after activation, generic continuation controls such as Confirm/Complete may appear where required by the deck-reorder decision;
- cancelling or replacing the authoritative action revision returns the skill control to the correct inactive/unavailable state.

### 4.7 Screenshot-specific acceptance

The current Zhuge Liang mobile layout is considered refined only when:

- both skill controls use the full Skills allocation rather than narrow content-sized boxes;
- the two peer controls are equal width and equal height;
- `STARGAZING` is one line at 390px and 480px;
- `EMPTY FORTRESS STRATEGEM` is no more than two lines and is not clipped;
- the passive skill is visually distinguishable from an unavailable optional action;
- no skill text collides with Equipment or the Local Hero artwork;
- the skill band does not cause horizontal document overflow;
- the bottom Action Row contains no duplicate Hero-skill activation.

### 4.8 Functional acceptance

Add focused Zhuge Liang proof for at least:

1. **Rest / unrelated interaction**
   - Stargazing visible but unavailable;
   - Empty Fortress Strategem visible as passive;
   - neither creates a bottom activation control.

2. **Authoritative Stargazing offer**
   - Stargazing becomes enabled in-place;
   - Empty Fortress Strategem remains passive;
   - clicking Stargazing submits/enters the existing authoritative `zhuge_liang_stargazing` flow.

3. **Stargazing selection active**
   - Stargazing has the established active state;
   - no duplicate activation entry exists;
   - the private deck-reorder interaction remains private and authoritative.

4. **Action revision / cancellation**
   - stale local active state clears;
   - skill geometry does not move.

Validate at minimum at 320px, 390px, 480px, and one wide viewport.

### 4.9 Completion criterion

Zhuge Liang's Skills band is complete when the player can immediately distinguish:

- `Stargazing` as an optional action that becomes pressable only when offered;
- `Empty Fortress Strategem` as an always-present passive skill;

while both remain visually balanced, readable, and stable beside the Hero portrait.

