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

Cross-Hero passive-trigger choices are decisions for the viewer, not activations of the viewer's Hero skill. When another Hero's passive grants the current viewer a voluntary choice through `CurrentAction`, render its choice actions in the Local Player Dock Action Row, alongside `Skip`/decline only when that action is authoritative. Do not place the foreign skill as an actionable item in the viewer's Skills band. For example, Triumphant belongs to Hua Xiong, but the source of the qualifying Attack chooses whether to recover or draw; only that source viewer receives the private choice controls.

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

## 2. Single-Target Stratagem Negation Flow — Card/Response Refinement Only

### 2.1 Current refinement boundary

The central Interaction Stage participant/Hero presentation is **frozen for the current refinement phase**.

Do not change, resize, replace, reposition, deduplicate, reconnect, or otherwise redesign the Interaction Stage Hero/player nodes as part of UX2 refinement. Their future presentation will be handled by a separate interaction-visualization refactor.

This section therefore governs only non-Hero response presentation that remains valid across the future refactor:

- root and public response cards;
- active-card state;
- public Negation branch/history;
- Local Guidance;
- response timer/system controls where applicable;
- privacy and server-authority rules.

Existing participant/Hero composition may remain as the current implementation baseline until the later refactor.

### 2.2 Open Negation window

An open Negation opportunity is not yet a public reaction chain.

Before anybody actually submits Negation:

- the root action card remains the active public card;
- no placeholder Negation card is rendered;
- no large Reaction Chain panel is required;
- the public Stage must not name a private responder;
- the Local Guidance Strip supplies the viewer's private instruction.

Preferred local instruction:

```text
Play Negation or Skip.
```

Avoid player-facing implementation-state copy such as:

- `NEGATION RESPONSE`;
- `EFFECT`;
- `REACTION CHAIN`;
- `ORIGINAL EFFECT`;
- `NEGATION WINDOW`;
- `A Negation may be played now.`;
- `Waiting for response...`.

Do not modify participant/Hero geometry to achieve this cleanup.

### 2.3 Active public card

At any moment, the public root/response chain has exactly one active visual head.

Recommended treatment:

**Active card**
- full opacity;
- emphasized border;
- restrained outer glow;
- highest visual contrast in the public chain.

**Inactive causal predecessor**
- lower opacity;
- no outer glow;
- lower-emphasis border.

Hard rule:

- exactly one public card in the current root/response chain is active at a time.

This rule applies independently of the later Interaction Stage Hero refactor.

### 2.4 First public Negation

A Negation card appears only after it is actually submitted and becomes public.

When first submitted:

- keep the root action card visible as causal context;
- make the root card visually subdued;
- add the submitted Negation as a compact public response node;
- make the Negation the only active public card;
- do not create a duplicate text-heavy Reaction Chain panel;
- do not reveal who could have responded before submission.

If the actor identity of a submitted Negation is public, it may be represented compactly near the public Negation card.

Do not change Interaction Stage Hero/player layout as part of this work.

### 2.5 Counter-Negation

Each new public counter-response extends the compact public card history.

Rules:

- newest unresolved public response = only active card;
- older public response cards remain subdued causal context;
- root identity remains available;
- long history compacts rather than causing page-level horizontal overflow;
- private Pass/Skip/Decline and private responder scanning create no public card node.

On narrow screens, preserve at minimum:

- root identity;
- recent public response context;
- current active head.

### 2.6 Negation settlement

If Negation cancels the root effect:

- settle/collapse the public response history cleanly;
- a compact cancelled/negated root state may be shown;
- exit the interaction when authoritative settlement completes.

If counter-Negation restores the root effect:

- settle/collapse the public response history;
- restore the root action card as the active public card;
- continue the authoritative root action.

Do not infer settlement from animation, timeline position, HP change, or local state.

### 2.7 Local Guidance

The Local Guidance Strip owns the viewer's private next-step instruction.

For an eligible Negation opportunity:

```text
Play Negation or Skip.
```

Keep the instruction short and direct.

Do not duplicate the same instruction in the public Stage.

The visible `YOUR RESPONSE` prefix is optional when the action remains clear without it.

### 2.8 Privacy and authority

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
- whether the root effect resumes.

Use authoritative CurrentAction / Presentation / causal-response projections.

If the required public card relationship is not proven, fail closed.

### 2.9 Measurable acceptance

Validate at minimum:

- 390 × 844 portrait;
- 480 × 900 portrait;
- one wide viewport.

Required checks:

| Requirement | Expectation |
| --- | --- |
| Open Negation | Placeholder Negation card count = 0 |
| Open Negation | Large Reaction Chain panel count = 0 |
| Active public card | Exactly 1 |
| Submitted Negation | New public response becomes active |
| Counter-Negation | Newest public response is active; older cards subdued |
| Long public chain | No page-level horizontal overflow |
| Private responder leakage | None before public submission |
| Guidance | One short primary instruction |
| Banned visible headings in simple open window | `EFFECT`, `REACTION CHAIN`, `ORIGINAL EFFECT`, `NEGATION WINDOW` count = 0 where the refined composition is active |
| Stage/Dock | Overlap = 0 |
| Stage/Guidance | Overlap = 0 |
| Hero/player composition | No refinement task changes its geometry or representation |

### 2.10 Completion criterion

This section is complete when the public Negation state is understandable from the root/response card state and the Local Guidance instruction without relying on text-heavy implementation-state panels, while the existing Interaction Stage Hero/player presentation remains untouched pending the later refactor.

## 3. Group / AOE Response Refinement — Non-Hero Controls Only

### 3.1 Current refinement boundary

The Group/AOE Interaction Stage Hero/player presentation is **deferred**.

Do not modify during current UX2 refinement:

- central Source Hero artwork;
- Group target Hero portraits;
- target-strip Hero geometry;
- viewer-vs-opponent target Hero representation;
- current-participant Hero highlight/marker;
- Source/target Hero positions;
- Hero-to-card or card-to-Hero connector geometry;
- participant deduplication strategy;
- seat-as-node / physical-player-node interaction graph.

Those surfaces will be redesigned together in the later interaction-visualization refactor.

Current UX2 refinement may change only the non-Hero controls and response semantics below.

### 3.2 Direct local guidance

The Local Guidance Strip must not use `Group Resolution` as the primary player instruction.

For Raining Arrows, use concise event-facing guidance such as:

```text
Respond to Raining Arrows.
```

Do not use as the primary instruction:

- `Group Resolution`;
- `0 cards selected`;
- `Current Participant`;
- `Active Scope`;
- other implementation-state terminology.

A selection count may appear only after the player has entered a real selection flow and when it materially helps.

### 3.3 Raining Arrows response action — TAKE DAMAGE

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

- `TAKE DAMAGE` is the sole main response action;
- do not require a semantically vague `SKIP`;
- do not show a disabled Confirm that implies a card selection is still possible.

If one or more legal Dodge providers exist:

- legal Dodge cards/providers are visually discoverable using authoritative response surfaces;
- unrelated Hand cards remain visible but visually quieter;
- `Confirm` becomes available only when a complete legal response selection exists;
- `TAKE DAMAGE` remains the explicit alternative.

This changes presentation and decision labels only. It does not change damage settlement semantics.

### 3.4 Discoverable legal response providers

During a required-card response such as Raining Arrows → Dodge:

- authoritative legal response cards/providers should be visually emphasised enough to be found quickly;
- unrelated Hand cards should remain visible but slightly subdued;
- Equipment and Hero response providers remain in their established surfaces;
- React must not reconstruct legality from card colour, card name, Hero name, phase, or local heuristics.

The emphasis must not create a modal picker unless the interaction has actually entered a dedicated picker state.

### 3.5 Minimise the top system-control area

The active combat screen should not reserve a large top-row area for Exit, secondary event/system controls, and the response timer.

Move secondary system/navigation controls into one compact System Menu cluster at the lower-right edge of the Interaction Stage, immediately above the Local Guidance Strip.

Reference placement:

```text
                         ⌛ 18s   [☰]
─────────────────────────────────────  Stage bottom
Respond to Raining Arrows.
─────────────────────────────────────  Guidance
```

The fixed opponent Seat topology remains at the top.

Do not use the future combat-Hero layout as an anchor for this cluster. Anchor it to the Stage/Guidance boundary so the control placement survives the later interaction-visualization refactor.

### 3.6 System Menu

Provide one compact System Menu control inside the lower-right of the Interaction Stage.

Requirements:

- one stable system/menu icon;
- minimum touch target: 44 × 44px;
- anchored relative to the Stage/Guidance boundary;
- preferred right inset: 12–16px;
- preferred bottom inset above Guidance: 8–12px;
- must not overlap public interaction content or Guidance.

Existing secondary system/navigation actions that currently occupy the top combat area should move into this menu where compatible with their semantics.

`Exit Game` belongs inside this menu rather than as a persistent large button.

Exit remains destructive and must keep its confirmation/safety behavior.

### 3.7 Response timer placement

The response timer moves with the System Menu cluster.

Placement:

- immediately to the left of the System Menu;
- approximately 8px gap from the menu;
- stable throughout the same authoritative response state;
- visually compact;
- close to the Guidance/action attention zone.

Suggested mobile footprint:

- width: approximately 52–68px;
- height: approximately 36–44px.

The timer must not reveal private responder identity.

The old large top-right timer block should not reserve persistent combat-screen space.

### 3.8 Content-driven Stage ending

After the public interaction content, the Stage should end promptly.

For ordinary mobile response scenes:

- system cluster to Guidance: 8–12px preferred;
- no unnecessary trailing Stage space should remain solely to preserve the old top-control layout;
- Guidance should feel visually attached to the current response.

Do not resize or reposition central Hero/player content to achieve this; only adjust the non-Hero system/control spacing covered by this section.

### 3.9 Measurable acceptance

Validate at minimum:

- 390 × 844 portrait;
- 480 × 900 portrait;
- one wide viewport.

Required checks:

| Requirement | Expectation |
| --- | --- |
| No-Dodge action | Visible primary alternative is `TAKE DAMAGE` |
| No-Dodge action | No `SKIP` used as the damage-acceptance label |
| No-Dodge action | No guessed numeric damage amount |
| No-Dodge action | No disabled Confirm implying an unavailable selection |
| Legal Dodge | Authoritative legal Dodge provider is visually discoverable |
| Guidance | Primary copy does not say `Group Resolution` |
| System Menu | Minimum 44 × 44px touch target |
| Exit | Not persistently displayed as a large top combat button |
| Timer | Immediately left of System Menu |
| System cluster/Guidance | Overlap = 0 |
| Stage/Dock | Overlap = 0 |
| Horizontal document overflow | 0 |
| Hero/player composition | No refinement task changes central Hero/player geometry or representation |

### 3.10 Completion criterion

This section is complete when Group/AOE response controls describe the player's real decision, legal response providers are easy to discover, and Timer/Exit no longer consume a large top combat area, while all central Interaction Stage Hero/player presentation remains untouched pending the separate refactor.

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


### 4.10 Stargazing — drag-and-drop private deck arrangement (single refinement task)

**Reviewer design revision, 8 October 2026.** The previously implemented
Earlier / Later / To top / To bottom button grid is **not** the approved primary
Stargazing interaction. A production mobile screenshot showed four revealed
cards in the Top zone with twelve large buttons underneath. The cards were
finally visible, but the controls consumed most of the useful dialog space
and made arranging the deck unnecessarily cumbersome.

Replace that presentation with **one drag-and-drop arrangement task**. This
whole subsection is **one task**, including interaction, responsive layout,
accessibility, authority, and validation. Do not split it into several
HANDOVER tasks or treat any individual bullet as a separate feature.

#### Approved three-zone composition

The dialog has three clearly labelled areas, in this vertical order:

1. **TOP OF DECK** — an initially empty, compact drop zone;
2. **REVEALED CARDS** — the four privately revealed cards, initially placed
   here side by side at the center of the dialog;
3. **BOTTOM OF DECK** — an initially empty, compact drop zone.

Example *initial state*:

~~~text
                 STARGAZING
       Drag each card to the top or bottom.

  TOP OF DECK                          Draws first →
  ┌────────────────────────────────────────────┐
  │           Drop cards here                  │
  └────────────────────────────────────────────┘

  REVEALED CARDS                             4 left
           [Card A] [Card B] [Card C] [Card D]
              Touch and hold, then drag

  BOTTOM OF DECK                  After remaining deck →
  ┌────────────────────────────────────────────┐
  │           Drop cards here                  │
  └────────────────────────────────────────────┘

                 0 / 4 arranged
             [ COMPLETE STARGAZING ]
~~~

Four is the normal illustrated case, not an assumption that the authoritative
reveal always contains exactly four cards. Render the actual privately
authorized card count. On activation, **all revealed cards begin in the
unassigned center area**, not automatically in Top or Bottom. Top and Bottom
start empty.

A card occupies exactly one zone at a time. Do **not** leave a duplicate
card in the middle when a card is moved to Top or Bottom.

The center zone shrinks as cards are assigned. It should never retain a large
empty panel once all cards have been placed.

#### Core drag-and-drop behavior

On mobile, the primary gesture is **touch-and-hold a card and drag**. Mouse
and pointer dragging must also work on desktop.

- Drag from Revealed Cards to Top or Bottom to assign that card.
- Drag a card already in Top or Bottom to another position **within the same
  zone** to reorder it.
- Drag a card from Top to Bottom, or Bottom to Top, to reassign it.
- Permit moving an already assigned card back to Revealed Cards if the player
  wants to undo its assignment.
- While dragging, show a recognizable floating/raised preview of the
  **same card** and visibly highlight eligible destination zones.
- Show a clear insertion indicator between existing cards so the user can
  understand *where* the dragged card will be placed, not merely which zone.
- Releasing in an empty zone appends/inserts the card as its first item;
  releasing at the end of an occupied zone appends it; releasing between two
  cards inserts it at that exact position.
- Dragging outside valid destinations, releasing without an accepted drop,
  cancelling the pointer, or losing pointer capture must **not** silently
  move or discard a card; preserve its previous position.
- A drag must never duplicate a card, lose a card, submit a request, or change
  the underlying game deck before the explicit Complete action.
- Do not use a full rerender/remount as a substitute for a smooth in-place
  reorder interaction.

**Important touch detail:** support real iOS Safari touch/pointer interaction.
Do not rely on desktop-only native HTML5 `draggable` behavior. A deliberate
hold-to-drag gesture should avoid accidental drag initiation during ordinary
page/modal scrolling. Prevent page scrolling only for an active card drag;
otherwise allow deliberate scrolling in the designated contained scroll
region. Do not make a card disappear under the user's finger.

#### Ordering semantics

Each zone is an ordered list with visually evident left-to-right sequence.

**Top**: first item at the left is the next card drawn, followed by the
remaining Top cards from left to right.

**Bottom**: cards will be placed after the cards remaining in the deck, in
their submitted left-to-right order. The player must be able to see the
relative order and rearrange it.

Keep small instructional hints such as `Draws first →` and
`After remaining deck →`; avoid long explanatory paragraphs and multiple
control rows underneath every card.

A sample intermediate state:

~~~text
  TOP OF DECK                                      Draws first →
  [Card C] [Card A]   |   (drop indicator)

  REVEALED CARDS                               1 left
  [Card D]

  BOTTOM OF DECK                        After remaining deck →
  [Card B]

                  3 / 4 arranged
             [ COMPLETE STARGAZING ]  (disabled)
~~~

The visual order, not the order of drag gestures, determines what is submitted.

#### Size, readability, and mobile layout

The priority is **the four recognizable cards and clear drop targets**, not
large ornamental boxes or button grids.

- The dialog stays within 390×844 and 480×900 mobile viewports; include a
  narrow 320px-class case and a wide viewport.
- On a typical four-card 390px phone layout, the center cards should be
  displayed together in one readable row where feasible.
- Top and Bottom may be empty, but they must remain clearly usable drop
  targets with sufficient target height and visible border/label; they must
  **not** expand into huge blank areas.
- As cards move into Top/Bottom, the zone grows only as necessary. Do not
  jump the dialog into an enormous scrolling page.
- A selected/dragged card must preserve readable rank, suit and identity;
  avoid scaling the card to a tiny sliver.
- If a zone contains more cards than fit, use contained horizontal scrolling
  with clear overflow affordance and edge auto-scroll while actively dragging,
  where necessary to reach insertion points.
- The active drag preview and insertion marker must not be clipped by the
  zone's scroll container or modal backdrop.
- Do not reproduce the previous twelve-button arrangement below four cards.
- Keep `COMPLETE STARGAZING` visible or immediately reachable, and do not
  move underlying Seats, Interaction Stage, or Local Dock.
- Only the actor may see card faces. Observer/public projection remains
  private.

#### Completion, validation, and authority

Stargazing's existing authoritative API contract must stay unchanged:

~~~ts
{
  providerId: "private_deck_reorder",
  topCardIds: string[],
  bottomCardIds: string[]
}
~~~

The UI maintains three local ordered lists: `unassigned`, `top`, and
`bottom`.

- On dialog open, `unassigned` contains every authoritative revealed card
  once; `top` and `bottom` are empty.
- Every transfer or reorder is a local UI change only.
- Each card ID appears in **exactly one** of those lists at all times.
- `COMPLETE STARGAZING` is enabled only when `unassigned` is empty,
  `top.length` satisfies authoritative `minTop/maxTop`, and all revealed
  cards occur exactly once across Top+Bottom.
- All-to-Top and all-to-Bottom are legal if and only if the existing
  authoritative min/max constraints allow them. **Do not impose a new
  requirement that both zones contain a card.**
- Submitting uses exactly the visually displayed Top and Bottom orders.
- Submission remains a single explicit action; preserve stale-action/revision
  invalidation, busy/disabled behavior, server validation, card conservation,
  reload safety, and the existing Draw-phase continuation.
- Do not leak card details into observer views, public snapshots, logs, or
  accessibility output visible to a different player.

#### Accessibility and non-drag fallback

Drag-and-drop is the primary **visual** interaction, not the only possible
way to operate the dialog.

Provide a keyboard/screen-reader-accessible alternative for moving a card
to Top/Bottom and moving it earlier/later. This may be a compact contextual
action menu or accessible move controls, but **must not recreate the large
three-buttons-per-card grid** in the normal mobile layout.

- Each card identifies its visible name and current zone/position to the
  acting viewer.
- Each drop zone is clearly named.
- Announce successful moves/reorders to assistive technology.
- Provide an obvious way to undo or reassign an accidental drop.
- Maintain usable focus management and avoid trapping the user's finger or
  focus on a card that moves to another zone.

#### Production-path acceptance for this one task

Do not claim completion solely from a synthetic fixture, DOM node count,
unit-only drag logic, or a screenshot of the idle layout.

Use a real server-backed Zhuge Liang Stargazing decision and validate:

1. initial four-card presentation: four revealed cards centered, empty Top and
   Bottom drop zones, completion disabled;
2. touch long-press + drag from center to Top, with card still visible and
   accurate insertion position;
3. touch drag to Bottom, including a mixed Top/Bottom arrangement;
4. reorder at least two cards within Top, and at least two within Bottom;
5. cross-zone reassignment and optional return to center;
6. dropped card exists once only in the UI state; cancel/invalid release
   leaves the old order unchanged;
7. the completed submitted `topCardIds` and `bottomCardIds` match the
   exact visible sequence and the authoritative deck order afterward;
8. server rejection or changed action revision cannot submit stale cards;
9. long-lasting card-face visibility (including after normal played-card
   animation time), privacy for observing players, and no underlying Dock
   movement;
10. 390×844, 480×900, 320px-class, and wide layouts: clear empty/filled drop
    zones, readable cards, no unintended page overflow, no inaccessible
    completion action;
11. pointer/mouse drag and keyboard/non-drag movement also function correctly.

The existing Stargazing API and gameplay rules are **not** to be changed for
this UX task. This is a replacement of the already completed button-based
Stargazing UI, not a new mechanic and **not multiple tasks**.

**Scheduling/gate:** This reviewer change reopens the same §4.10
Stargazing UX refinement. Because it supersedes the previous button-based
acceptance, do not represent the old button-based implementation as the final
approved UX. Close this single drag-and-drop refinement before advancing to
further Section 6 work. Do not edit the agent-owned `HANDOVER.md` from a
design-review pass.


## 4A. Transient Event Timers and Compact Event Overlays

### 4A.1 Scope and purpose

Timed transient events such as Private Draw must use the same compact lower-right system-control language as response timing instead of reserving a separate large timer block at the top of the combat screen.

This section applies to non-response timed event presentation, including at minimum:

- Private Draw / `Cards close in`;
- Bumper Harvest choosing/closing countdowns;
- temporary card-reveal or event-hold countdowns that are visible to the viewer;
- other non-response event timers that currently use the generic `Countdown` presentation.

This section does **not** change event timing, card privacy, reveal duration, or server/gameplay semantics.

### 4A.2 One timer location during active play

All visible combat/event countdowns should converge on the Stage lower-right system cluster whenever that cluster is available.

Reference placement:

```text
                         2s   [☰]
─────────────────────────────────────  Stage/event bottom
Current local guidance / turn status
─────────────────────────────────────
Local Hero / Skills / Hand
```

Requirements:

- the timer sits immediately to the left of the System Menu;
- preferred gap between timer and menu: approximately 8px;
- the System Menu keeps the same lower-right anchor used by response states;
- the timer must not create a second top-right control block;
- do not reserve a dedicated top band for `Cards close in`, `Choosing`, `Closing`, or similar countdown labels.

The existing System Menu remains the place for Exit and other secondary system controls.

### 4A.3 Compact event-timer visual treatment

A transient-event timer should be visually compact.

Preferred mobile footprint:

- width: approximately 44–64px;
- height: approximately 36–44px;
- touch/pointer behavior remains non-interactive unless the timer itself has an explicit product action;
- numeric time is the dominant content.

For Private Draw, the visible timer should normally be:

```text
2s
```

or the same compact timer treatment already used for response timing.

Do not render a large timer box containing:

```text
CARDS CLOSE IN
2s
```

at the top of the table.

The event title already explains what is happening. Repeating the timer meaning in a large separate heading is unnecessary.

Accessible text may still expose the full meaning, e.g. `Cards close in, 2 seconds`.

### 4A.4 Private Draw event content

Private Draw remains a private viewer-only event.

The central event content should retain:

- `PRIVATE DRAW`;
- `ONLY YOU CAN SEE THESE CARDS`;
- the actual privately drawn cards.

Those elements explain the event and its privacy boundary and should remain near the cards.

The countdown is not part of that title block and should not appear above the opponent Seats.

Reference composition:

```text
          PRIVATE DRAW
   ONLY YOU CAN SEE THESE CARDS

        [Card] [Card]


                         2s   [☰]
────────────────────────────────────
Player / decision guidance
```

The private cards remain the visual focus.

### 4A.5 Content-driven transient-event height

Transient event content must not use a full-height presentation merely because the underlying table is tall.

In particular, Private Draw must not rely on a layout equivalent to:

```text
position: absolute;
inset: 0;
justify-content: center;
```

when that produces a large empty region below the event cards.

The event presentation must be content-driven relative to the usable space between the opponent Seat area and the lower system/guidance cluster.

Requirements on 390px and 480px portrait:

- event title and cards remain fully visible;
- the lowest visible event card/content should normally sit within 16–24px of the lower system-control cluster;
- the lower system-control cluster should sit 8–12px above Guidance;
- no large unused vertical band should remain solely because the event overlay fills the entire play-table height;
- the event must not overlap the Local Guidance Strip or Local Dock;
- the event must not force the Local Dock lower merely to preserve old overlay height.

A full-area dimming/backdrop layer may still cover the table for privacy/focus, but the **event content layout itself** must remain compact and must not create artificial blank space.

### 4A.6 Deck and Discard relationship

Deck/Discard remain table objects and must not be used as spacing anchors for the transient event.

Private Draw cards may visually occupy the central event area without preserving a large gap simply to leave Deck/Discard visible underneath.

Requirements:

- transient event content may visually sit above or partially obscure Deck/Discard when the event is active;
- the timer/System Menu cluster remains readable above Guidance;
- Deck/Discard state must not move because the timer migrated;
- no extra vertical padding is reserved between event cards and Deck/Discard.

### 4A.7 Bumper Harvest and other timed event states

Bumper Harvest and similar event-specific countdowns should use the same lower-right timer location.

Each Bumper Harvest participant receives a server-owned 60-second countdown
when their card-choice decision becomes active. It is presentation timing only:
reaching zero does not choose a card, skip the participant, or settle the
effect. The authoritative choice remains available until the server accepts a
legal selection or another game event invalidates it.

Labels such as:

- `Choosing`;
- `Closing`;
- `Cards close in`;

should not become large top-of-table control panels.

The event-specific central UI may still explain the current event state when needed, but countdown placement remains consistent.

Do not merge distinct event semantics into one generic modal. This section standardizes timer location and space usage, not the entire event interaction.

### 4A.8 Timer state consistency

A timer must appear consistently for the authoritative timed state.

Requirements:

- if the authoritative countdown is active and visible to this viewer, the compact timer is present;
- if the countdown has not reached its visible-at threshold, no placeholder timer box is reserved;
- when the timer becomes visible, event content must not jump materially;
- timer appearance/disappearance must not move the Local Guidance Strip or Local Dock;
- timer urgency styling may change without changing timer geometry.

Preferred geometry stability:

- System Menu coordinate delta when timer appears/disappears: ≤ 2 CSS px;
- Guidance top coordinate delta caused only by timer visibility: ≤ 2 CSS px.

### 4A.9 Privacy and accessibility

Transient event timer migration must preserve privacy.

For Private Draw:

- only the viewer sees the private cards and private event title;
- no public player surface exposes private card identity;
- the timer itself reveals only time remaining, not hidden card information.

Accessibility:

- timer keeps an accessible full label;
- Private Draw retains a clear private-event accessible name;
- System Menu remains keyboard/focus accessible;
- moving the timer must not alter the logical order of the private card interaction.

### 4A.10 Measurable acceptance

Validate at minimum:

- 390 × 844 portrait;
- 480 × 900 portrait;
- one wide viewport.

Required states:

1. Private Draw with two cards;
2. Private Draw with the largest supported visible private-draw count;
3. Bumper Harvest active choice countdown;
4. Bumper Harvest closing countdown;
5. event countdown hidden before its visibility threshold;
6. event countdown visible and approaching zero.

Acceptance:

| Requirement | Expectation |
| --- | --- |
| Private Draw timer | No large top-right `CARDS CLOSE IN` timer panel |
| Timer location | Immediately left of lower-right System Menu |
| System Menu | Remains in the same lower-right anchor |
| Timer visibility | No placeholder space before timer becomes visible |
| Event content | Title/cards fully visible |
| Bumper Harvest choice | Fresh server-owned 60-second countdown for each active chooser; expiry does not auto-select or skip |
| Event trailing gap | Lowest event content to system cluster normally ≤ 24px |
| System cluster to Guidance | Preferred 8–12px |
| Guidance/Dock | No overlap |
| Timer appearance | System Menu coordinate delta ≤ 2 CSS px |
| Timer appearance | Guidance top delta ≤ 2 CSS px |
| Horizontal overflow | 0 |
| Privacy | Private Draw remains viewer-only |
| Deck/Discard | No movement caused by timer relocation |

### 4A.11 Completion criterion

This refinement is complete when transient event timing uses one consistent lower-right control location and event overlays no longer create large artificial empty regions.

For Private Draw specifically, the viewer should see:

- the private event title;
- the private cards;
- a compact countdown beside the System Menu;
- the current Guidance/turn status immediately below;

without a large top timer box and without a large unused vertical gap.

## 4B. Compact Inspect Panel for Other Players

### 4B.1 Scope and purpose

The current Inspect view for another player uses too much vertical space, leaves large unused areas, and presents the inspected Hero and public information at a size that is too small for fast mobile reading.

This refinement defines a **compact mobile Inspect panel** for another player's public state.

Goals:

- enlarge the inspected Hero portrait and identity text;
- remove unnecessary empty space;
- keep public information readable on mobile;
- avoid taking over the full Interaction Stage;
- preserve privacy and authoritative visibility.

### 4B.2 Do not occupy the full Interaction Stage

Inspect must render as a **compact floating panel inside the Stage**, not as a full-height Stage replacement.

Requirements:

- center the panel within the usable Stage area;
- leave visible Stage context around the panel;
- height is content-driven;
- do not push Local Guidance or the Local Dock downward;
- no overlap with Local Guidance or the Local Dock;
- a dimmed/backdrop layer may cover the Stage, but the panel itself remains compact.

Preferred mobile footprint:

- width: approximately 88–92% of usable Stage width;
- max-height: approximately 60–72% of the usable Stage area above Guidance;
- outer inset to Stage edge: approximately 12–16px.

### 4B.3 Header

Use one compact header row:

```text
INSPECT · Player1                              [X]
```

Requirements:

- one title only;
- close control top-right on the same row;
- remove duplicated decorative labels such as a second `INSPECT`;
- no empty header band.

### 4B.4 Identity block

The inspected Hero identity is the visual focus.

Layout:

- large Hero portrait on the left;
- player/Hero identity on the right.

Show:

- player name;
- Hero name;
- current HP;
- public role/faction only when already public;
- `Explain Hero` action.

Preferred mobile proportions:

- Hero portrait width: approximately 38–44% of panel width;
- identity column: approximately 56–62%;
- portrait remains recognisable and card-like;
- Player name and Hero name use a visibly larger type scale than the current Inspect implementation.

Avoid:

- tiny identity text;
- excessive line wrapping;
- duplicate HP/identity blocks elsewhere inside Inspect.

### 4B.5 Public skills

Place public skills directly below or beside the identity block, depending on available width.

Requirements:

- heading: `PUBLIC SKILLS`;
- skill names render as readable compact chips/cards;
- no tall empty skill container when only one skill exists;
- if concise explanation text is shown, it wraps cleanly and remains secondary;
- if there are no public skills, show compact `None`.

### 4B.6 Public zones

Equipment, Judgment Zone, and Hand should form a compact public-information section.

Preferred mobile layout:

- one row of up to three compact groups when space permits;
- otherwise use a compact two-row arrangement;
- each group sizes to its actual content.

#### Equipment

- show only publicly visible equipment;
- equipment cards must be visually identifiable;
- a single equipment card must not be squeezed into a narrow unreadable slot;
- multiple equipment cards may use compact wrapping or horizontal scrolling.

#### Judgment Zone

- show public judgment cards if present;
- otherwise show compact `None`;
- do not reserve a tall empty box.

#### Hand

Hand privacy remains authoritative.

- if only hand count is public, show only the count;
- do not reveal hidden hand-card identity;
- real face-up Hand cards may appear only when they are authoritatively public.

Preferred compact form:

```text
HAND · 1
```

or the established face-down/back representation.

### 4B.7 Empty-space reduction

The panel must end close to its actual content.

Requirements:

- normal bottom padding after the last visible content row: approximately 12–20px;
- no large unused vertical band below zones;
- no zone grows merely because the Stage is tall;
- panel height tracks content;
- the Inspect panel must not preserve old full-stage empty space.

### 4B.8 Stage/control relationship

Inspect is temporary Stage content, not a replacement for the entire game layout.

Requirements:

- System Menu must not overlap the Inspect panel;
- Guidance remains below and visually separate;
- Local Dock remains unchanged;
- opening/closing Inspect must not move the Local Dock;
- Inspect should feel like a temporary focused overlay.

### 4B.9 Privacy and authority

Inspect may render only authoritative public information.

React must not infer or expose:

- hidden Hand identities;
- hidden role/faction;
- hidden skills;
- non-public equipment/judgment information.

If a field is not public, omit it or render only the permitted summary.

### 4B.10 Measurable acceptance

Validate at minimum:

- 390 × 844 portrait;
- 480 × 900 portrait;
- one wide viewport.

Required cases:

1. one public skill + one equipment;
2. multiple public skills;
3. empty Judgment Zone;
4. multiple equipment cards;
5. public hand count with private card identities.

Acceptance:

| Requirement | Expectation |
| --- | --- |
| Full-stage takeover | Inspect does not consume full Interaction Stage height |
| Hero focus | Inspected Hero portrait is substantially larger than current implementation |
| Identity readability | Player name, Hero name, and HP are easy to read on mobile |
| Empty space | No large unused vertical area inside the panel |
| Public zones | Equipment / Judgment / Hand are compact and content-driven |
| Equipment readability | Single equipment card is not squeezed into a narrow unusable slot |
| Hand privacy | Only authoritative public hand information is shown |
| Guidance overlap | 0 |
| Dock overlap | 0 |
| System Menu overlap | 0 |
| Horizontal overflow | 0 |
| Open/close stability | Local Dock position delta ≤ 2 CSS px |

### 4B.11 Completion criterion

The mobile Inspect view is complete when it behaves as a compact, readable floating panel:

- larger Hero portrait;
- larger player/Hero identity text;
- compact public skills;
- compact public zones;
- no large internal blank area;
- no full-stage takeover;
- privacy preserved.


## 4C. Unified Target Card Selection Modal — Opponent Hand / Equipment / Judgment

### 4C.1 Purpose and design decision

Any interaction in which the local player must choose one or more specific cards from another character's eligible card zones should use one shared **Target Card Selection Modal** rather than a bespoke picker for each Hero skill, Stratagem, or Equipment effect.

This is a UX2 design rule, not a Sima Yi-only treatment.

The objective is to make interactions such as Retaliation, Dismantle, Steal, and Frost Sword feel like the player is directly choosing from the target character's real card zones while preserving all hidden-information rules.

The modal should create three clear impressions:

1. the player is acting on a specific opponent;
2. that opponent's eligible card zones are physically separated and readable;
3. hidden Hand cards are individually selectable only as anonymous positions, never as revealed identities.

The picker is a transient decision surface layered above the current game state. It must not permanently replace the Interaction Stage, Local Dock, opponent Seat, or public Inspect panel.

### 4C.2 Shared visual structure

The preferred mobile composition is:

~~~text
┌──────────────────────────────────────────┐
│                 ACTION NAME              │
│          Choose N card(s) to ...         │
│──────────────────────────────────────────│
│                                          │
│  HAND · 4                 EQUIPMENT      │
│  [?] [?] [?] [?]          [Weapon]       │
│                            [Armour]       │
│                                          │
│  JUDGMENT                                │
│  [Delayed Stratagem]                     │
│                                          │
│────────────── N / M selected ────────────│
│                                          │
│      [ PRIMARY ACTION ]   [ CANCEL ]     │
└──────────────────────────────────────────┘
~~~

Only eligible zones and eligible cards should be actionable.

If a zone has no legal selectable cards, it should normally be omitted rather than shown as a large empty panel.

The modal shell, spacing, typography, selection treatment, confirmation row, and privacy treatment should be shared across all supported effects.

### 4C.3 Modal placement and background treatment

The picker should appear as a large centered modal over the current game screen.

Requirements:

- preserve the underlying game context as a dimmed background;
- keep enough background visibility to recognize the current Interaction Stage, target Seat, Local Hero, Hand, timer, and menu;
- do not destroy or re-layout the underlying Stage solely because the picker opens;
- do not move opponent Seats or the Local Player Dock;
- do not create document-level horizontal overflow;
- modal content should remain fully usable at 390 × 844 and 480 × 900 portrait sizes;
- on short-height viewports, the card-zone content may scroll inside the modal while the title/instruction and action row remain stable where practical.

The modal is a focused decision layer. Background controls should not remain accidentally clickable through it.

### 4C.4 Header and action-specific copy

The modal header uses the action, skill, or equipment name as the primary title.

Examples:

**Retaliation**
~~~text
RETALIATION
Choose 1 card to obtain
~~~

**Dismantle**
~~~text
DISMANTLE
Choose 1 card to discard
~~~

**Steal**
~~~text
STEAL
Choose 1 card to obtain
~~~

**Frost Sword**
~~~text
FROST SWORD
Choose 1–2 cards to discard
~~~

**Kirin Bow**
~~~text
KIRIN BOW
Choose 1 Mount to discard
~~~

The instruction must describe the real effect, not generic picker mechanics.

Do not use vague copy such as:

- "Choose a zone";
- "Choose target card";
- "Select option";

when the actual rule can be stated directly.

### 4C.5 Hand presentation — individual anonymous positions

When the authoritative action contract provides opaque per-Hand positions such as hand:0, hand:1, hand:2, and so on, the Hand must be represented as separate face-down selectable card positions.

Example:

~~~text
HAND · 4

[ ? ] [ ? ] [ ? ] [ ? ]
  1     2     3     4
~~~

The numeric labels above are conceptual only and do not need to be visibly printed if card position is already clear.

Requirements:

- every hidden Hand position is an independent selectable control;
- every hidden Hand card uses the same face-down card-back treatment;
- no rank, suit, card kind, art, text, category, or inferred identity is exposed;
- selecting one hidden position must not reveal the card before the authoritative result reveals it;
- accessibility names should distinguish positions without revealing identity, for example "Hidden hand card 1" and "Hidden hand card 2";
- the public Hand count must remain accurate;
- selected card position uses the shared selection highlight/check treatment.

This replaces the less immersive treatment where the entire Hand is a single oversized HAND ×4 / Random card block whenever the server already provides safe opaque per-card positions.

### 4C.6 Hand fallback when per-card authority is unavailable

The UI must not manufacture separate selectable Hand positions if the authoritative action contract does not provide them.

If the only legal semantic key is a single Hand-zone key such as hand, the modal must retain the grouped anonymous Hand-zone fallback.

Example:

~~~text
HAND · 4
[ face-down fan / compact stack ]
Random card
~~~

This means:

- clicking the Hand chooses the Hand zone;
- the resulting individual card is server-authoritative/random according to the rule;
- the client must not pretend that selecting "the second card" has meaning when no such authoritative position exists.

This fallback is required for fail-closed compatibility and privacy.

### 4C.7 Hand size and responsive overflow

Small Hands should be shown as clearly separated card backs.

Preferred behavior:

- 1–4 cards: display all individual positions at readable width;
- 5–6 cards: display all if they fit without excessive compression;
- larger Hands: use horizontal scrolling, slight controlled overlap, or another contained layout that still preserves one independent position per authoritative key.

Do not reduce hidden cards into tiny unusable slivers merely to fit the entire Hand on one line.

Do not change the authoritative Hand count.

Do not collapse supported per-card positions back into one random-zone control solely because the Hand is large.

### 4C.8 Equipment presentation

Equipment is public information and should be displayed as real face-up cards.

The Equipment section should:

- show only equipment currently eligible under the authoritative selection;
- preserve recognizable card art/name where space allows;
- keep Weapon, Armour, +1 Horse, and -1 Horse as distinct selectable cards;
- not present Equipment as a generic text row if actual card art is available;
- use the same selected-state border/check marker as hidden Hand positions;
- omit ineligible equipment from the active selection set.

If useful for comprehension, ineligible public equipment may remain visually present but subdued only when the design clearly distinguishes "visible information" from "selectable target". The default simpler behavior is to show the selectable subset.

### 4C.9 Judgment Zone presentation

Effects such as Dismantle and Steal may legally choose cards from another character's Judgment Zone.

When Judgment cards are authoritative public eligible targets:

- render a distinct JUDGMENT section;
- show the real delayed Stratagem card face-up;
- allow each eligible Judgment card to be selected independently;
- use the same selection-state treatment as Equipment;
- do not merge Judgment cards into Equipment.

If there are no eligible Judgment cards, omit the section.

### 4C.10 Zone ordering

Use a stable zone order:

~~~text
HAND  →  EQUIPMENT  →  JUDGMENT
~~~

On wide layouts these may share one row or a balanced multi-column panel.

On mobile:

- Hand is normally the largest section and should receive the most horizontal space;
- Equipment may sit to the right when there is room;
- Judgment may appear below;
- if Equipment contains several cards, allow wrapping or contained horizontal scrolling rather than shrinking every card below a readable size.

The user should not need to relearn the zone arrangement for each different skill/card.

### 4C.11 Selection state

The selection language is shared across all picker users.

Unselected eligible card:
- normal readable card/back;
- subtle eligible border or hover/touch affordance.

Selected card:
- strong gold border/glow;
- clear check badge;
- optional slight lift/scale;
- must remain visually identifiable without relying on colour alone.

Ineligible card:
- not clickable;
- no selection glow;
- use subdued treatment only if it remains visible.

The selected-state marker should be the same for Retaliation, Dismantle, Steal, Frost Sword, and related future effects.

### 4C.12 Selection count

A centered status line should show actual authoritative selection progress.

Examples:

~~~text
1 / 1 selected
~~~

~~~text
1 / 2 selected
~~~

~~~text
2 / 2 selected
~~~

For min/max ranges such as Frost Sword's 1–2 selection:

- the confirmation action becomes available as soon as the minimum valid selection is reached;
- selection may continue until the maximum;
- once max is reached, another selection must either replace/toggle an existing selection or be refused clearly;
- the UI must not submit more keys than allowed.

The status line is feedback, not the source of legality.

### 4C.13 Primary and cancel actions

The bottom of the modal contains a large primary action plus Cancel.

Examples:

- USE RETALIATION
- USE DISMANTLE
- USE STEAL
- USE FROST SWORD
- USE KIRIN BOW

Preferred presentation:

- primary: gold;
- cancel: red/dark red;
- both have touch targets of at least 44px height;
- confirmation remains disabled or unavailable until the authoritative minimum selection requirement is satisfied;
- Cancel closes the local selection state without silently submitting.

Do not add a second duplicate Confirm button in the Local Dock for the same modal decision.

### 4C.14 Retaliation — Sima Yi

Retaliation is the first Hero-skill reference implementation for the unified picker.

Current rule intent in the project is to obtain one card from the damage source's eligible Playing Area.

Preferred UI:

~~~text
RETALIATION
Choose 1 card to obtain

HAND · 4                  EQUIPMENT
[?] [?] [?] [?]           [Frost Sword]

             1 / 1 selected

[ USE RETALIATION ] [ CANCEL ]
~~~

If opaque per-Hand keys are available, each face-down card must be individually selectable.

If only a Hand-zone key is available, use the grouped Hand fallback defined in §4C.6.

The modal should feel like Sima Yi is actually choosing one possession from the damage source rather than choosing an abstract category tile.

### 4C.15 Burning Bridge / 过河拆桥

The approved player-facing English name for 过河拆桥 is **Burning Bridge**.

Existing internal protocol/model identifiers may continue to use `Dismantle` for
compatibility. Do not rename authoritative CardKind/protocol fields merely to
change presentation copy.

Burning Bridge uses the same picker structure.

Rule-facing zones:

- Hand;
- Equipment;
- Judgment Zone.

Preferred UI:

~~~text
BURNING BRIDGE
Choose 1 card to discard
~~~

Differences from Retaliation:

- result is discard, not obtain;
- Judgment may be present;
- action button text is `USE BURNING BRIDGE`.

A selected Equipment or Judgment card remains face-up.

A selected hidden Hand position remains face-down until the authoritative result reveals/removes the card.

All player-visible title, instruction, CTA, accessible naming, and browser-copy
assertions should use **Burning Bridge**. Internal `Dismantle` identifiers may
remain where they are part of the existing rules/protocol contract.

### 4C.16 Steal

Steal uses the same picker structure as Dismantle.

Rule-facing zones:

- Hand;
- Equipment;
- Judgment Zone.

Preferred UI:

~~~text
STEAL
Choose 1 card to obtain
~~~

Differences from Dismantle:

- result is obtain rather than discard;
- target character must already have passed all authoritative targeting/distance legality before this picker opens.

The modal must not recompute distance or target legality.

### 4C.17 Frost Sword

Frost Sword is the main multi-selection reference implementation.

Rule-facing zones:

- target Hand;
- target Equipment.

It can select 1–2 cards after the Equipment effect has been authoritatively offered.

Preferred UI:

~~~text
FROST SWORD
Choose 1–2 cards to discard

HAND · 4                  EQUIPMENT
[?] [?] [?] [?]           [Armour]

             2 / 2 selected

[ USE FROST SWORD ] [ CANCEL ]
~~~

Requirements:

- anonymous Hand positions are independently selectable when provided;
- Equipment cards are independently selectable;
- mixed selections are allowed when authoritative keys allow them, e.g. one hidden Hand position plus one Equipment card;
- the modal must visually handle two selected cards simultaneously;
- the effect-specific resolution remains server authoritative.

### 4C.18 Kirin Bow — simplified picker

Kirin Bow should share the same modal shell and selection language but does not need empty Hand or Judgment sections.

Its legal choice is an eligible Mount from the damaged character's Equipment Zone.

Preferred UI:

~~~text
KIRIN BOW
Choose 1 Mount to discard

EQUIPMENT
[ +1 Horse ] [ -1 Horse ]

1 / 1 selected

[ USE KIRIN BOW ] [ CANCEL ]
~~~

This is a simplified instance of the same component family, not a separate UX design.

### 4C.19 Effects that should not use a fake card picker

The shared picker should be used only when the player genuinely chooses among authoritative card positions/cards.

Do not apply it mechanically to every effect that later moves a card.

**Borrowed Sword**
- if the forced Attack is not played and the source obtains the target's Weapon, the Weapon is already determined;
- no "choose one card" picker should appear unless the rules/data model later create a real choice.

**Zhang Liao — Assault**
- the current project behavior selects one or two target characters;
- it does not currently grant the local client an authoritative choice of a specific hidden Hand position from each target;
- therefore do not render several clickable face-down cards and imply a choice that does not exist.

The rule is simple:

> No authoritative per-card choice -> no per-card picker.

### 4C.20 Other future applicable effects

Future Hero skills, Stratagems, and Equipment effects should reuse this picker whenever all of the following are true:

- the local viewer is the decision-maker;
- a specific other player or source-owned public card zone is already authoritatively identified;
- one or more legal card keys/positions are exposed by CurrentAction;
- the player must choose a subset of those legal keys;
- hidden identity can remain protected.

The picker may therefore support future operations such as:

- obtain;
- discard;
- transfer;
- replace;
- move to another zone;

provided the action-specific copy and authoritative key semantics are explicit.

### 4C.21 Authority and privacy boundary

This UI must preserve the existing architecture boundary.

CurrentAction owns the viewer's legal selectable keys.

Public presentation owns public target identity and public zone/card information.

React must not derive legal card choices from:

- opponent Hand count alone;
- visual card position;
- DOM order;
- card-back animation;
- public Equipment presence;
- inferred rule text;
- timeline order;
- previous selections from an older action revision.

Hidden Hand identities must remain absent from public projection.

Opaque Hand position keys may be used only as anonymous positions.

If action revision changes, the local selection must clear.

If the authoritative target changes, the local selection must clear.

If a previously selected card/key is no longer legal, it must be removed from the local selection.

### 4C.22 Interaction with the opponent Inspect panel

The Target Card Selection Modal and the passive opponent Inspect panel have different responsibilities.

**Inspect panel**
- informational;
- public-only;
- opened voluntarily;
- does not imply an active decision.

**Target Card Selection Modal**
- actionable;
- appears only during an authoritative selection decision;
- shows only legal/selectable positions/cards or clearly marks legality;
- owns temporary selection state.

Do not force the player to open Inspect first in order to choose a target card.

Do not reuse the passive Inspect layout as the active picker if doing so makes card positions too small or ambiguous.

### 4C.23 Interaction with Hero Focus / Interaction Stage

The current selectable Hero Focus can remain as a compatibility/fail-closed implementation while the unified modal is introduced.

The intended UX2 end state is:

- public Stage continues to explain the action/effect context;
- the modal handles the local card-selection decision;
- local legal controls do not need to be duplicated inside central public visualization;
- opening the modal does not require a duplicate central Hero portrait.

This section does not authorize unrelated Interaction Stage Hero/player redesign beyond the already-approved scopes elsewhere in this document.

### 4C.24 Responsive requirements

Validate at minimum:

- 390 × 844 portrait;
- 480 × 900 portrait;
- one wide viewport.

Required behavior:

- modal stays inside viewport;
- no document horizontal overflow;
- card selection remains comfortably tappable;
- individual hidden Hand cards remain visually separate;
- Equipment/Judgment cards remain recognizable;
- selected check badge is not clipped;
- primary and Cancel buttons remain visible or reachable without ambiguous page scrolling;
- Local Dock geometry underneath does not shift when the modal opens/closes.

At 320px-class widths, internal horizontal scrolling is preferred over compressing cards into unreadable slivers.

### 4C.25 Accessibility

Each selectable card position/card must have a meaningful accessible name.

Examples:

- Hidden hand card 1;
- Hidden hand card 2;
- Equipment: Frost Sword;
- Judgment: Overindulgence.

Selected state must expose aria-pressed, aria-selected, or the appropriate equivalent.

The modal itself should expose an accessible name such as:

- Retaliation target card selection;
- Burning Bridge target card selection;
- Steal target card selection.

Do not include private hidden-card identity in accessibility text.

### 4C.26 Measurable acceptance

The unified picker is acceptable only when all of the following hold:

| Requirement | Expectation |
| --- | --- |
| Shared component | Retaliation, Burning Bridge, Steal, and Frost Sword use the same picker design system |
| Retaliation Hand | Opaque per-card Hand keys render as separately selectable face-down cards |
| Privacy | Hidden Hand rank/suit/kind/art never leaks before authoritative reveal |
| Fallback | Zone-only hand authority retains grouped Random-card behavior |
| Burning Bridge | Can select legal Hand / Equipment / Judgment card |
| Steal | Can select legal Hand / Equipment / Judgment card |
| Frost Sword | Can select 1–2 legal Hand / Equipment cards, including mixed-zone selection |
| Kirin Bow | Uses simplified Equipment-only form |
| Borrowed Sword | No unnecessary picker when Weapon outcome is predetermined |
| Assault | No fake per-hidden-card choice without authoritative per-card keys |
| Revision safety | Selection clears on CurrentAction revision/target/key change |
| Touch | Selectable positions/cards and actions meet 44px minimum touch geometry |
| 390 × 844 | No modal clipping or page overflow |
| 480 × 900 | No modal clipping or page overflow |
| Wide | Zones remain balanced/readable |
| Background | Opening picker does not move Seats or Local Dock |
| Accessibility | Anonymous hidden positions and public cards have correct accessible names |

### 4C.27 Browser-proof scenarios

Add or adapt focused browser coverage for at least:

1. Retaliation with four authoritative anonymous Hand positions;
2. Retaliation grouped-Hand fallback when only a hand-zone key exists;
3. Retaliation selecting public Equipment;
4. Burning Bridge selecting anonymous Hand position;
5. Burning Bridge selecting Equipment;
6. Burning Bridge selecting Judgment;
7. Steal selecting anonymous Hand position;
8. Steal selecting Equipment;
9. Steal selecting Judgment;
10. Frost Sword selecting one hidden Hand card;
11. Frost Sword selecting two hidden Hand cards;
12. Frost Sword mixed Hand + Equipment selection;
13. max-selection enforcement;
14. CurrentAction revision clears selection;
15. target change clears selection;
16. large Hand remains independently selectable without page overflow;
17. Kirin Bow Equipment-only modal;
18. unsupported/unproven per-Hand authority fails closed to the safe fallback.

### 4C.28 Completion criterion

This UX2 refinement is complete when the game has one coherent card-selection language for acting on another character's cards:

~~~text
Who am I acting on?
        ↓
Which of their card zones are legal?
        ↓
Which exact anonymous/public card position do I choose?
        ↓
What will this action do to that card?
~~~

Retaliation, Burning Bridge, Steal, Frost Sword, and compatible future effects should feel like variations of one interaction system rather than unrelated custom interfaces, while preserving strict hidden-Hand privacy and server-owned legality.



### 4C.29 Mobile target-card modal layout refinement — single pre-Section-6 task

The shared target-card modal now reaches real gameplay, but the current mobile
layout is not yet the approved final UX.

Reviewer production screenshots of Burning Bridge at phone width show a
specific usability problem:

- the Hand zone is narrow;
- individual concealed Hand cards are too large;
- only part of the authoritative Hand is visible at once;
- the selected card becomes visually dominant enough that neighbouring hidden
  positions are easy to miss;
- large unused modal space remains beside the compressed Hand zone;
- the current composition does not scale naturally to the mixed
  Hand + Equipment + Judgment cases required by Burning Bridge and Steal.

This entire subsection is **one bounded refinement task**. The bullets below are
acceptance requirements for that one task, not separate tasks.

**Primary design goal**

When the modal opens, the player should understand immediately:

1. how many concealed Hand positions are available;
2. which public Equipment cards are available;
3. which public Judgment cards are available;
4. which one or more cards are currently selected.

The modal must optimize for **selection clarity and zone scanning**, not for
displaying anonymous Hand backs at near-full card-reading size.

**Hand-zone layout**

Anonymous Hand positions are choices, not information-rich card faces.

Required behavior:

- hidden Hand cards remain visually card-shaped and clearly separated;
- they should be materially smaller than full readable public Equipment /
  Judgment cards where that improves mobile fit;
- the Hand layout should make the authoritative count obvious at a glance;
- for a common 4-card Hand at 390×844, the player should not see only two cards
  and have to infer that additional hidden positions exist off-screen;
- all four positions should preferably be visible together;
- if larger Hands require scrolling, the existence of additional cards must be
  visually obvious and the contained scrolling behavior must be deliberate;
- cards must never collapse into narrow unreadable slivers;
- hidden-card identity remains fully private.

**Selected-state treatment**

Selection must be obvious without obscuring the rest of the Hand.

Required behavior:

- retain a clear gold selected state and non-colour marker such as a check;
- selected styling must not materially increase layout width/height;
- neighbouring unselected hidden cards must remain easy to see;
- the selected card must not cover, push away, or visually erase adjacent
  choices;
- \`0 / 1 selected\`, \`1 / 1 selected\`, and multi-select counts remain clearly
  visible.

**Use the modal width efficiently**

The modal should not compress selectable content into the left side while
leaving a large unused area on the right.

For a Hand-only target:

- allow the Hand zone to use the useful content width;
- center or balance the Hand composition rather than leaving a narrow fixed
  column.

For mixed zones:

- allocate width according to actual content;
- the Hand should normally receive the largest share because it can contain
  several anonymous positions;
- Equipment and Judgment should remain visually distinct and readable;
- avoid fixed columns that leave unused blank space when one zone is absent.

**Mixed Hand + Equipment + Judgment composition**

Burning Bridge and Steal must be designed from the mixed-zone case first, not as
a Hand-only layout with extra zones appended later.

The picker must support:

~~~text
HAND · N                 EQUIPMENT
[?] [?] [?] [?]          [Weapon] [Armour]

JUDGMENT
[Delayed Stratagem]
~~~

The exact responsive arrangement may change by width, but:

- Hand, Equipment, and Judgment remain separate labelled zones;
- public Equipment/Judgment cards remain face-up and readable;
- anonymous Hand cards remain face-down;
- one zone must not crowd another into an unusable strip;
- empty zones are omitted rather than reserving blank panels;
- zone order stays consistent with §4C.10.

At 390×844, a normal mixed case should fit without turning the modal into a
large vertically scrolling document.

**Card scale hierarchy**

Use different scale priorities intentionally:

- anonymous Hand position: compact selectable card back;
- public Equipment/Judgment: readable public card;
- selection badge/check: clear but spatially lightweight.

Do not apply one oversized card dimension to every zone merely for visual
uniformity.

**Burning Bridge naming**

The same refinement task must update the production presentation from
\`DISMANTLE\` to the approved player-facing name:

~~~text
BURNING BRIDGE
Choose 1 card to discard

[ USE BURNING BRIDGE ]   [ CANCEL ]
~~~

This applies to:

- modal title;
- primary CTA;
- accessible dialog name;
- user-facing Guidance/copy where the card name appears;
- browser assertions for presentation copy.

Internal rule/protocol identifiers may remain \`Dismantle\`.

**Required responsive proof**

Validate the finished layout with real authoritative selection data at:

- 390×844;
- 480×900;
- one wide layout.

At minimum prove:

1. Burning Bridge with 4 hidden Hand cards;
2. one selected hidden Hand card without obscuring neighbours;
3. Burning Bridge with Hand + Equipment;
4. Burning Bridge with Hand + Equipment + Judgment;
5. Steal with the same mixed-zone layout;
6. a larger Hand where contained overflow is genuinely required;
7. no page-level horizontal overflow;
8. selectable targets remain at least 44px touchable even when anonymous Hand
   card art is visually more compact;
9. CTA and Cancel remain reachable without excessive scrolling.

This refinement is not complete merely because all cards are technically
clickable. The reviewer must be able to see the available choice structure
immediately on a real phone-sized layout.

## 4D. Production-Path Completion Gate — Mandatory Before Section 6

### 4D.1 Why this gate exists

A component or fixture state is not sufficient evidence that a UX2 refinement is
implemented in the real game.

Reviewer-observed deployed-game screenshots have already demonstrated two cases
where the repository contained the intended component/test shape but the real
player experience did not match it:

- Steal / 顺手牵羊 reached the legacy target-card picker instead of the §4C
  unified modal;
- Zhuge Liang Stargazing reached an oversized deck-reorder dialog in which the
  actual card faces disappeared, leaving reorder controls without readable
  cards.

The code audit also confirmed that most browser specs directly load fixture
states rather than driving a server-created room all the way through the real
page. API tests and fixture browser tests remain useful, but they prove
different layers and must not be treated as equivalent to production-path
reachability.

From this point onward, a UX2 item must not be marked complete merely because:

- the component exists;
- a fixture can render it;
- an API test proves the server rule independently;
- a focused browser spec passes against a handcrafted projection.

For the affected refinements below, completion requires evidence that the real
server-generated state reaches the intended production UI.

The following are **five bounded pre-Section-6 tasks**. Each task is one task;
the bullets inside each task are acceptance requirements, not separate tasks.
The Coding Agent may choose the execution order, but all five plus §4.10 and
§4A must be closed before Section 6 begins.

### Task P1 — Restore real server-to-browser validation

The project must regain a working way to create/use a real room in local browser
validation and render the resulting server-generated state through the
production page.

The audit found a current local-development blocker in
\`app/api/rooms/route.ts\`: \`CausalCreation\` is declared twice, and the local
\`POST /api/rooms\` path was reported to return 500 under the development
runtime even though the production build succeeds.

Required outcome:

- local real-room creation works through the same route used by the product;
- a browser test can create/seed or otherwise enter a real room and observe the
  production page without substituting a handcrafted CurrentAction or
  PresentationSnapshot;
- the test path must be suitable for validating the UX2 flows in Tasks P2–P4;
- build success alone is not sufficient if the development/runtime route used
  for integration validation is broken.

This task is complete when at least one real server-seeded browser flow reaches
the production game page reliably on a clean run.

### Task P2 — Finish §4C in real gameplay, not only fixtures

The §4C Unified Target Card Selection Modal must be the normal player-facing
selection surface for the real authoritative flows it covers.

This task includes:

- Steal;
- Dismantle / Burning Bridges;
- Sima Yi Retaliation;
- Frost Sword;
- Kirin Bow.

The deployed-game Steal screenshot already proves that the old
\`table-hidden-card-picker\` remains reachable in normal play. Therefore §4C is
currently **not complete**.

Required outcome:

- an authoritative target-card decision with a valid target and legal
  selectable keys reaches the unified modal in real gameplay;
- ordinary Steal/Dismantle/Retaliation/Frost Sword/Kirin Bow decisions must not
  fall back to a visually unrelated legacy picker merely because Interaction
  Stage Hero Focus, Inspect state, or a transient target preview does not match
  an additional presentation condition;
- CurrentAction remains the legality/selection authority;
- Interaction Stage / Hero Focus presentation must not become a second,
  unrelated requirement for deciding whether the viewer receives the §4C
  selection UX;
- \`hand:n\` keys render as individually selectable anonymous face-down cards;
- a legacy/grouped \`hand\` key, when genuinely authoritative, uses the grouped
  Random-card fallback **inside the same §4C visual language**, not a different
  picker;
- Equipment and Judgment remain public face-up selections where legal;
- action identity/copy remains effect-specific:
  - \`STEAL — Choose 1 card to obtain\`;
  - \`DISMANTLE — Choose 1 card to discard\`;
  - \`RETALIATION — Choose 1 card to obtain\`;
  - equivalent specific copy for Frost Sword and Kirin Bow;
- primary actions use the approved effect-specific CTA;
- selected state, selection count, Cancel treatment, and 44px minimum touch
  geometry match §4C;
- no hidden Hand identity is leaked;
- stale/revision changes still clear local selection.

Required production-path proof:

1. real server-generated Steal reaches the unified modal;
2. real server-generated Dismantle reaches the unified modal;
3. real Retaliation reaches the unified modal with multiple anonymous Hand
   positions;
4. real Frost Sword selection reaches the unified modal;
5. real Kirin Bow selection reaches its simplified unified modal;
6. at least one real mixed-zone case proves Hand plus Equipment/Judgment
   presentation where the rules allow it;
7. no normal supported flow above reaches the legacy picker.

Fixture coverage may supplement this proof but may not replace it.

### Task P3 — Close the Hero Skills real-game reachability audit

Section 1.10 remains open until every implemented Hero capability that is meant
to be actionable from the Local Hero Skills band has been checked against the
real server-projected decision path.

The recent test-only skill commits are useful regression coverage, but a
fixture-proven button is not enough to claim that the real game reaches the same
state.

Required outcome:

- every implemented active/optional/response Hero capability has an identified
  authoritative provider/option from the real game;
- the Skills-band control becomes enabled only from that authority;
- activation submits the existing authoritative payload;
- required card/target/choice continuations are reachable in the real game;
- the same activation is not duplicated in the generic Action Row;
- absence of authority leaves the stable skill control unavailable/passive as
  appropriate;
- any capability found to exist only in fixture mapping, or whose real
  projection cannot reach the approved UX, is fixed as part of this task rather
  than merely documented.

The agent may batch capabilities by behavior family to finish this quickly.
This is one roster-completion task, not one task per Hero.

Completion evidence must distinguish:

- server/provider proof;
- production component routing;
- browser rendering/interaction proof.

Do not report a Hero skill complete solely because a fixture spec passes.

### Task P4 — Real production-path parity for already-claimed interaction UX

Several refinements have strong engine/API coverage and strong fixture-browser
coverage but no proof that the same server-generated state reaches the same UI.

Before Section 6, run real server-to-browser validation for at least:

- single-target Negation:
  - open window;
  - first public Negation;
  - counter-Negation;
  - settlement outcome;
- Raining Arrows:
  - Dodge available;
  - no Dodge / \`TAKE DAMAGE\`;
  - correct local Guidance and no obsolete duplicate controls;
- Opponent Inspect:
  - public Hero identity/skills;
  - Equipment;
  - Judgment;
  - Hand count without hidden Hand identity.

If the real server projection does not route to the already-approved UX, this
task includes repairing that mismatch. It is not an audit-only task.

The goal is not to duplicate every fixture test with a full end-to-end test.
The goal is to establish real production-path parity for the feature families
that were previously claimed complete primarily from separated API + fixture
evidence.

### Task P5 — Remove the confirmed mobile top dead-space before seat geometry is frozen

The audit confirmed that on phone layout the top-row \`player-board\` currently
starts around 55px below the table top while the corresponding status element
is absent, leaving a substantial unused band above the opponent seats.

This is a confirmed geometry issue and must be resolved before Section 6,
because Section 6 will use the physical Seat positions as graph anchors.

Required outcome:

- do not preserve a large empty top reservation when no visible UI occupies it;
- reclaim the unused phone vertical space for the table/interaction area;
- opponent seats remain aligned, readable, and non-overlapping;
- System Menu, timer, Guidance, and any genuine top control retain required
  clearance;
- 390×844 and 480×900 should not show an unexplained ~55px dead band above the
  first opponent row;
- the physical Seat geometry should be stable after this task so Section 6 can
  anchor interaction connectors against it.

### 4D.2 Evidence language for future completion reports

For all UX2 work from this point forward, completion reports must state which
evidence layer was actually observed.

Use separate statements such as:

- **Rules/API proven**
- **Server projection proven**
- **Fixture browser proven**
- **Real server-backed browser path proven**
- **Deployed-game screenshot/reviewer proof**

Do not collapse these into a generic statement such as "browser tests pass" or
"the feature is complete".

If real server-backed browser proof has not been run, report the UI reachability
as **Not proven**.

### 4D.3 Section 6 gate

Section 6 must not begin until:

- §4.10 Stargazing private deck-reorder UX is closed;
- §4C.29 mobile target-card modal layout refinement is closed;
- §4A, including Bumper Harvest active-choice timer authority, is closed;
- Task P1 real server-to-browser validation is available;
- Task P2 unified target-card production routing is closed;
- Task P3 full Hero Skills real-game reachability audit is closed;
- Task P4 real production-path parity is closed;
- Task P5 mobile top dead-space/seat geometry is closed.

This gate exists specifically to prevent a new Interaction Visualization layer
from being built on top of UX that only works in fixtures or whose real-game
routing is still inconsistent.

## 5. Interaction-Stage Hero / Player Presentation — DEFERRED TO UX2 INTERACTION VISUALIZATION REFACTOR

### 5.1 Current decision

All Interaction Stage Hero/player visualization work is deferred.

Do not implement further UX2 refinement tasks that change:

- central combat Hero portraits;
- Source Hero representation;
- Target Hero representation;
- Group target Hero representation;
- viewer Hero representation inside the Stage;
- Hero/player size, position, orientation, or duplication;
- current-participant Hero visual treatment;
- Hero/player-to-card connector geometry;
- physical Seat / Local Dock nodes as a new combat graph;
- a new seat-anchored interaction overlay;
- UX2 interaction-visualization graph-foundation work.

The current implementation remains the temporary baseline until the user explicitly resumes the interaction-visualization refactor.

### 5.2 Planning consequence

A HANDOVER task that alters Interaction Stage Hero/player presentation is not currently authorized by this design.

At the next task/planning boundary, the Coding Agent must:

1. finish only an already-running task that does not modify deferred Hero/player presentation;
2. re-read this document;
3. skip/defer any Hero/player interaction-graph task;
4. choose the next bounded task from the active non-Hero refinements in Sections 1–4;
5. preserve server-owned presentation authority and fail-closed behavior.

Do not delete existing Hero/player presentation code merely because it will be replaced later.

### 5.3 Active refinement scope while deferred

Current authorized refinement work includes:

- Local Hero Skills band consistency and activation;
- single-target Negation public-card/response presentation that does not alter Hero/player nodes;
- direct response Guidance;
- `TAKE DAMAGE` semantics for Raining Arrows;
- authoritative legal response-provider emphasis;
- System Menu / Exit relocation;
- response timer relocation;
- Zhuge Liang Stargazing / Empty Fortress Strategem skill presentation;
- transient event timer relocation and compact event-overlay spacing from §4A;
- compact other-player Inspect panel refinement from §4B;
- mandatory real-game production-path completion tasks from §4D.

### 5.4 Resume condition

The user has authorized the UX2 interaction-visualization refactor **after all active refinement sections before §5 are completed, including §4A and §4B**. This refactor is part of completing UX2, not a new UX version.

Therefore:

1. finish the remaining authorized refinement work before §5 first, including the Stargazing private deck-reorder usability task in §4.10, the mobile target-card modal refinement in §4C.29, §4A, and all mandatory production-path completion tasks in §4D;
2. do not interleave the UX2 interaction-visualization graph work with unfinished pre-§5 refinement tasks;
3. once those refinement items are closed at a clean planning boundary, Section 6 becomes the next authorized UX2 implementation work;
4. begin Section 6 from **§6.25 Phase A — physical-seat graph foundation** unless a newer direct user instruction changes the order;
5. continue to split the UX2 interaction-visualization refactor into bounded HANDOVER tasks rather than implementing all phases at once;
6. preserve all server-authority, privacy, fail-closed, and physical-seat-stability requirements in §6.

An older HANDOVER item does not by itself prove that the prerequisite refinement work is complete. The Coding Agent must re-read this document at the planning boundary before starting Section 6.

## 6. UX2 Interaction Visualization Refactor — Physical-Seat Anchored Causal Graph

### 6.1 Design decision and purpose

The next interaction-visualization direction removes duplicated combat Hero/player portraits from the central Interaction Stage.

The fixed physical player representations already present around the table become the only player nodes used by the interaction visualization:

- opponent Seats remain the public player anchors around the table;
- the Local Player Dock remains the viewer's physical player anchor;
- no second Source Hero portrait is created in the center;
- no second Target Hero portrait is created in the center;
- no separate compact participant strip is required merely to restate players who are already visible at their Seats/Dock.

The central combat area becomes a temporary public action/effect layer containing cards, response cards, relationship lines, settlement state, and lightweight effect feedback.

The basic visual grammar is:

~~~text
Physical Player  ── played-by tether ──  Action Card  ── target arrow ──▶  Physical Player
~~~

This preserves table spatial identity and makes the interaction read directly against the players who are actually involved.

This section records the reviewer-approved UX2 interaction-visualization refactor required to complete UX2. It does not by itself authorize a branch-wide implementation or gameplay/protocol change. Implementation still proceeds as bounded HANDOVER tasks under the sequencing in §5.4.

**UX2 completion gate:** UX2 must not be declared complete while the AOE / multi-target interaction presentation remains visually unacceptable. Section 6 is part of UX2 completion. Group/AOE scenes must be revalidated after the physical-seat causal-graph refactor, and Reviewer acceptance of those final screenshots is required before UX2 can be considered complete.

### 6.2 Core semantic invariant

Every visible relationship must represent one authoritative public fact.

The renderer must not infer causality from:

- timeline order;
- turn ownership;
- actionPlayerId;
- DOM order or physical seat order;
- Hero identity;
- card animation order;
- HP changes;
- local selection state;
- client-side guesses about what a card normally does.

CurrentAction continues to own viewer-private legality and available controls.

PresentationSnapshot / PresentationClientView, or an approved successor public-presentation model, owns public interaction facts.

Missing or ambiguous semantic proof must fail closed.

The visualization must therefore be treated as a renderer of a typed public interaction graph, not as an animation system that reconstructs gameplay meaning from events after the fact.

### 6.3 Graph vocabulary

The visual model should support the following conceptual node types.

**Physical Player node**
- not created by the interaction renderer;
- references an existing opponent Seat or Local Player Dock;
- identified by the existing authoritative player ID / data-player-anchor;
- never duplicated centrally.

**Action Card node**
- a temporary public card representation for the root action;
- examples: Attack, Steal, Duel, Raining Arrows;
- remains stable while its interaction is unresolved.

**Response Card node**
- a temporary public card representation for a committed response;
- examples: Dodge, Negation, an Attack played during Duel;
- appears only after the response is actually public;
- is not rendered merely because a player is privately eligible to respond.

**Effect/Event node**
- reserved for a later case where an authoritative public interaction has no physical card;
- examples may include Hero skills, triggered statuses, or other rule events;
- it should use the same graph grammar without inventing a fake card.

The visual model should support three primary relationship types.

**Played-by / source tether**

~~~text
Player ───── Card
~~~

Meaning:
- this player publicly produced/played/activated this action node.

Visual treatment:
- no arrowhead;
- visually lighter than the target relation;
- green may be used as the primary hue, but colour must not be the only semantic distinction.

**Target / affected-by relation**

~~~text
Card ─────▶ Player
~~~

Meaning:
- this public effect currently applies to, targets, or is resolving toward that player.

Visual treatment:
- explicit arrowhead;
- stronger line weight than the source tether;
- red/dark-red may be used as the primary hue.

**Counter / block relation**

~~~text
Response Card ──| Countered Card/Effect
~~~

Meaning:
- this public response directly counters, blocks, cancels, or otherwise opposes another public action/effect.

Visual treatment:
- must be topologically distinct from a target arrow;
- recommended forms include a dashed/double line, terminal bar, shield/break marker, or another clear non-target symbol;
- it must not be communicated by colour alone.

### 6.4 Active state versus causal context

Highlighting means **what is currently being processed or responseable**, not whether an action is generally valid or important.

At any instant:

- the newest unresolved public action/response head receives the strongest highlight;
- the currently resolving target relation receives the strongest target-arrow highlight;
- earlier causal cards remain visible only when they are still needed to explain why the current state exists;
- earlier relationships are subdued rather than competing for attention;
- settled relationships disappear after the settlement hold.

Recommended states:

**Active**
- full opacity;
- highest contrast;
- restrained glow;
- animated line energy/pulse may be used.

**Context**
- reduced opacity;
- no competing glow;
- preserves causal understanding.

**Blocked / countered**
- target/effect relation becomes dim, broken, crossed, or otherwise visibly interrupted.

**Settled**
- brief final-result hold;
- then card and relationship visuals fade out.

Exactly one public response head should be visually dominant inside one causal chain.

### 6.5 Physical-seat anchoring

The interaction graph must connect to the players' existing physical UI positions.

Do not create central proxy Hero/player cards merely to simplify line drawing.

Use the existing player anchor contract:

~~~text
data-player-anchor="<playerId>"
~~~

for:

- opponent Seats;
- the Local Player Dock.

The interaction overlay must span a coordinate space that can reach both the table and the Local Player Dock. It must therefore not be confined to a clipping region such as the existing .play-table { overflow: hidden } if that would cut a line leading to the local player.

Preferred rendering architecture:

- one interaction-overlay layer attached at .game-shell level;
- SVG or equivalent vector layer for connectors/arrows;
- HTML/CSS card nodes above the line layer;
- pointer-events: none for non-interactive visualization surfaces so existing Seat/Dock controls remain usable;
- card-info interaction, if later required, must be added deliberately without intercepting unrelated table input.

Physical Seat/Dock geometry must not move when interaction visuals appear, change head, settle, or disappear.

### 6.6 Card placement

The root action card should appear in the open battle space inside the table, spatially biased toward the player who produced it.

For an ordinary single-target action:

~~~text
[Source Seat]
      \
       \ source tether
        \
       [ROOT CARD]
             \
              \ target arrow
               ─────────────▶ [Target Seat]
~~~

Placement goals:

- visually close enough to the source that authorship is obvious;
- far enough from the Seat that it does not cover Hero information or controls;
- inside the battle/table area rather than inside a player Seat;
- stable for the lifetime of the root interaction;
- not directly on top of Deck/Discard piles;
- does not cover the response timer, System Menu, Guidance, or Local Dock controls.

Use curved/Bezier routing where helpful rather than forcing every relationship into a straight line through other cards or player panels.

Root-card position should remain stable when:

- a response card appears;
- the active responder changes;
- a counter-response appears;
- the current target advances;
- settlement state changes.

### 6.7 Ordinary single-target action

For a single-target action from Player A to Player B:

~~~text
A ───── [CARD] ─────▶ B
~~~

The source relation is a non-arrow tether.

The target relation is an arrow from the action card to the target player.

The target player itself may receive a restrained edge/halo emphasis while its target arrow is active, but the Seat/Dock must not be transformed into a new central participant card.

Example:

~~~text
Cao Cao ───── [STEAL] ─────▶ Gan Ning
~~~

The graph should visually answer three questions immediately:

- who created this action;
- what action/card is resolving;
- who the effect is directed toward.

### 6.8 Self-target action

If source and target are the same player, do not draw a target arrow back into the same physical player node.

Preferred treatment:

~~~text
Player ───── [SELF-TARGET CARD]
~~~

with:

- the card placed near/inward from that player's anchor;
- the source tether still visible;
- a restrained pulse/halo on the same physical player to indicate that the effect returns to self.

Do not draw a long loop solely for decorative symmetry if it makes the board harder to read.

Do not duplicate the same player elsewhere.

### 6.9 Multi-target action

A multi-target action uses one root card and one target branch per affected player.

Example:

~~~text
                     ┌────────▶ B
A ───── [AOE CARD] ──┼────────▶ C
                     └────────▶ D
~~~

All authoritative target relations may remain visible, but only the currently resolving target/participant receives the strong active highlight.

Recommended state:

- unresolved non-current targets: dark/subdued target arrows;
- current target: bright active target arrow plus restrained Seat/Dock emphasis;
- resolved targets: subdued or marked-complete relation until the root interaction advances or closes.

When authoritative resolution advances from B to C:

- the root card stays fixed;
- B's branch loses active emphasis;
- C's branch gains active emphasis;
- the physical Seats do not move;
- the card does not jump to a new location.

For ordered effects, a small order marker may be used only when the order is authoritative and genuinely helps comprehension.

### 6.10 Target-specific effect instances

A multi-target card can contain multiple independently resolving target effects.

The internal public-presentation model should therefore be capable of distinguishing:

- the root card action;
- the per-target effect instance/branch;
- the currently active target effect;
- the outcome of each target effect.

The visual UI does not need to render a separate visible "effect box" for every branch.

However, this distinction is important for correct response/counter semantics. A response that cancels only B's branch must not visually imply that the entire root card has been cancelled for C and D.

Counter relations should therefore attach to the correct authoritative target-effect instance when the rules distinguish that scope.

### 6.11 Defensive response such as Dodge

For an incoming Attack:

~~~text
A ───── [ATTACK] ─────▶ B
~~~

When B publicly plays Dodge, the Dodge card should appear on or immediately adjacent to the incoming Attack-to-B relationship.

Preferred visual meaning:

~~~text
A ───── [ATTACK] ────╳────▶ B
                         [DODGE]
                            │
                            B
~~~

A cleaner graph interpretation is:

~~~text
B ───── [DODGE] ──| [ATTACK → B effect]
~~~

while the incoming Attack target line is visibly interrupted.

Requirements:

- B-to-Dodge is a played-by/source tether;
- Dodge is a counter/block response to the incoming Attack/effect;
- Dodge does not need a separate target arrow pointing back to B;
- the incoming Attack-to-B line visually shows the block;
- if Dodge succeeds, the incoming target relation settles as avoided/blocked before disappearing;
- if a future rule produces a counter to Dodge, that counter must target the Dodge/effect node rather than being represented as a generic arrow to B.

The renderer must use typed public response proof. It must not infer that a newly played Dodge belongs to the current Attack merely because of timeline proximity.

### 6.12 Duel exchange

Duel is a persistent root cause with repeated alternating Attack responses.

The Duel card should remain visible throughout the exchange as contextual root state:

~~~text
A ───── [DUEL] ─────▶ B
~~~

When B is required to answer with Attack:

~~~text
A ───── [DUEL] ─────▶ B

B ───── [ATTACK] ─────▶ A
~~~

The current response Attack becomes the dominant active visual.

When A answers with another Attack:

~~~text
A ───── [DUEL] ─────▶ B

A ───── [ATTACK] ─────▶ B
~~~

The previous exchange Attack should settle/fade or collapse so that the screen does not accumulate every Attack in the Duel.

The important distinction is:

- DUEL remains visible because it explains **why** repeated Attack exchanges are occurring;
- the current Attack response explains **what is happening now**.

The root Duel card should not disappear and reappear each round.

The source/target direction of the current Attack response must come from authoritative Duel continuation data, not alternating-client assumptions.

### 6.13 Negation and third-party counter-response

Negation must be visualized as a response to the action/effect it counters, not as an ordinary target arrow to the affected player.

Base action:

~~~text
A ───── [STEAL] ─────▶ B
~~~

If C publicly plays Negation:

~~~text
C ───── [NEGATION 1] ──| [STEAL / Steal→B effect]

A ───── [STEAL] ─ - - ▶ B
~~~

The Steal-to-B target relation becomes visibly interrupted/subdued.

Do **not** represent this as:

~~~text
[NEGATION] ─────▶ B
~~~

because that visually says Negation targets B rather than countering the Stratagem effect.

If D then publicly plays a counter-Negation:

~~~text
D ───── [NEGATION 2] ──| [NEGATION 1]
~~~

The first Negation becomes subdued/blocked and the original Steal-to-B relation becomes active again.

The public causal meaning is therefore:

~~~text
D → Negation 2 counters Negation 1
C → Negation 1 counters Steal
A → Steal affects B
~~~

Do not create a redundant connection from the counter chain back through A. The existing A-to-Steal source tether already explains root authorship.

### 6.14 Negation chain layout

Negation response cards should stay visually close to the card/effect they counter.

For shallow chains:

~~~text
[ROOT CARD] ──| [NEGATION 1] ──| [NEGATION 2]
~~~

or an equivalent branch layout may be used, provided the counter direction remains unambiguous.

Rules:

- root card stays fixed;
- newest unresolved response is the only strong active card;
- older response cards are subdued;
- the root target relation changes between active and blocked states according to the authoritative chain outcome;
- no duplicate Hero portraits are introduced to label responders;
- each response card may use a small source tether back to the real physical player who played it.

For long chains, retain:

- the root card;
- the most recent one or two response cards at readable size;
- a compact older-history indicator such as +N.

Do not allow a long counter chain to force document-level horizontal overflow.

### 6.15 Response-card placement relative to player source

Every public response card should still show who played it.

For example, if C plays Negation against A's Steal:

~~~text
C ───── [NEGATION]
             │
             └──| [STEAL] ─────▶ B
                  │
                  A
~~~

The exact route may vary with table geometry.

The essential rule is that the response card has:

- one source tether to its real physical actor;
- one counter relation to the authoritative card/effect it opposes.

This allows third-party responses to remain understandable without central actor portraits.

### 6.16 Public graph versus private response opportunity

The public graph shows committed public actions, not private eligibility.

Before a player actually submits Dodge, Negation, Attack-for-Duel, Peach, or another response:

- do not show a placeholder response card;
- do not draw a source tether from a privately eligible responder;
- do not expose the identity of a private decision actor solely because the server is currently asking that player;
- do not add public prose such as "Waiting for Cao Cao to respond" unless that identity is explicitly public under an approved presentation contract.

The Local Guidance Strip continues to tell the viewer what they personally can or must do.

The public graph tells everyone what has already happened and what public effect is currently unresolved.

### 6.17 Settlement and removal lifecycle

Interaction visuals should not vanish in the exact same frame that authoritative settlement occurs.

Recommended presentation lifecycle:

1. **Action enters**
   - card appears from or near the source anchor;
   - source tether becomes visible;
   - target relation appears.

2. **Response window**
   - root remains stable;
   - current target/response relation is highlighted;
   - privately available choices remain outside the public graph.

3. **Public response**
   - response card appears;
   - its physical player source tether appears;
   - target/counter relation updates without moving the root card.

4. **Settlement**
   - show a short final-result state;
   - approximately 0.4–0.8 seconds is the preferred visual hold range where motion settings allow;
   - examples: target arrow breaks, Dodge shield/interrupt resolves, damage feedback occurs, root relation reactivates after counter-Negation.

5. **Exit**
   - temporary cards and lines fade;
   - physical player Seats/Dock remain unchanged;
   - durable history remains available through the existing log/history system rather than leaving stale battle objects on the table.

Reduced-motion mode should shorten or remove motion while preserving state changes and semantic markers.

### 6.18 Layering and routing

Recommended z-order:

1. board background;
2. relationship line layer;
3. temporary public action/response cards;
4. existing physical player Seats/Dock and their interactive controls where appropriate;
5. modal/private selection surfaces and system controls.

Connector routing should avoid:

- running directly through unrelated Hero faces;
- covering HP/hand/equipment information;
- crossing the Local Guidance Strip;
- crossing the response timer/System Menu;
- covering Deck/Discard when an alternate route is available.

Use stable anchor points on each Seat/Dock edge facing the battle area rather than always drawing from the geometric center of the entire player panel.

For example:

- top-row opponent: prefer the inward/bottom edge;
- left-side opponent: prefer the inward/right edge;
- right-side opponent: prefer the inward/left edge;
- local player: prefer the inward/top edge.

These are geometry rules only. They must not be used to infer gameplay roles.

### 6.19 Responsive behavior

The graph must work across mobile and wide layouts without moving physical players.

Validate at minimum:

- 390 × 844 portrait;
- 480 × 900 portrait;
- one wide viewport;
- dense 6–8 player table configurations where supported.

On narrow layouts:

- cards may scale down within a documented minimum readable size;
- response cards may stack/offset;
- long counter history may collapse;
- connectors may use stronger curvature;
- non-active relations may be simplified visually.

Do not solve space pressure by reintroducing duplicated central Hero portraits.

Do not create page-level horizontal scrolling.

### 6.20 Accessibility and non-colour semantics

The graph must not depend on red versus green alone.

Use structural differences:

- played-by/source tether: no arrowhead;
- target relation: clear arrowhead;
- counter relation: dashed/double/terminal-block or equivalent counter marker;
- active relation: stronger width/glow/pulse;
- blocked relation: break/cross/bar marker;
- settled relation: fade/complete state.

For screen readers, provide a concise semantic description of the current public interaction, for example:

~~~text
Cao Cao played Steal targeting Gan Ning.
Zhuge Liang played Negation countering Steal.
~~~

The accessible description must be generated from the same authoritative public graph data as the visual layer.

Do not use hidden text to expose private responder identity or private legality.

### 6.21 Presentation-model direction

The current Negation model already contains explicit public reaction-chain authority, but the UX2 interaction-visualization renderer should not be hard-coded around Negation alone.

Preferred direction is a typed public graph/view model containing concepts equivalent to:

~~~text
InteractionGraph
  players: references to physical player anchors
  actionNodes: root/response/effect nodes
  sourceRelations: player -> action
  targetRelations: action/effect -> player
  counterRelations: response -> action/effect
  activeHead
  activeTargetEffect
  settlementState
~~~

This does not require the renderer to expose these exact type names.

The important architectural boundary is:

- game engine / server projection proves the semantics;
- presentation adapter converts proof into a stable public graph;
- React renders the graph;
- React does not reconstruct missing relationships.

For multi-target effects, the model must be capable of representing target-specific effect instances even if those instances are not visible as separate UI boxes.

For Duel and defensive responses, the model must eventually provide explicit public response-card causality equivalent to what Negation already has.

Do not generalize by reading generic timeline events on the client.

### 6.22 Skills and non-card events

The interaction system must eventually support public actions that are not represented by a physical hand card.

Examples include:

- Hero skill activation;
- triggered equipment/status effects;
- judgement-driven effects;
- rule events that create a public response window.

These should use the same relationship grammar with an Effect/Event node instead of inventing a fake physical card.

Example:

~~~text
Player ───── [SKILL / EFFECT NODE] ─────▶ Target
~~~

The visual identity of such a node should be compact and visually distinct from a physical card while preserving the same source/target/counter semantics.

### 6.23 Required visual invariants

The UX2 interaction visualization must preserve all of the following:

- one physical player representation per player;
- no duplicate central Hero portrait for Source or Target;
- root action card remains spatially stable while unresolved;
- source tether always means "this player produced this node";
- target arrow always means "this effect is directed at this player";
- counter relation always means "this response opposes this action/effect";
- active highlight always identifies the current unresolved public head/current resolving branch;
- no public response node before the response is actually submitted;
- no semantic inference from DOM position or animation order;
- no movement of Seats/Dock caused by interaction presentation;
- no hidden/private information leakage;
- no gameplay legality moved from CurrentAction into React.

### 6.24 Acceptance scenarios

The design should eventually be proven against at least the following interaction families:

1. **Single-target action, no response**
   - A plays Attack/Steal/Dismantle on B;
   - one source tether;
   - one root card;
   - one target arrow;
   - settlement removes temporary graph.

2. **Self-target action**
   - A plays a self-target action;
   - one physical A representation;
   - no target arrow back to A;
   - self emphasis is readable.

3. **Attack + Dodge**
   - incoming Attack targets B;
   - B's Dodge appears only after submission;
   - Dodge visibly blocks the incoming relation;
   - no false Dodge-to-B target arrow.

4. **Duel**
   - Duel root remains visible;
   - alternating Attack response direction is authoritative;
   - only current Attack response remains visually dominant;
   - old exchange cards do not accumulate indefinitely.

5. **Single-target Negation**
   - A plays Steal on B;
   - C plays Negation;
   - Negation counters Steal/effect rather than targeting B;
   - root target relation becomes blocked.

6. **Counter-Negation**
   - D counters C's Negation;
   - first Negation becomes blocked/subdued;
   - original Steal-to-B relation becomes active again.

7. **Multi-target**
   - one root card fans out to several physical players;
   - only current target branch is strongly active;
   - branch highlight moves without root-card movement.

8. **Target-specific counter inside multi-target action**
   - only the affected target branch is blocked;
   - other branches do not visually appear globally cancelled.

9. **Local player involvement**
   - local player may be source, target, responder, or self-target;
   - lines reach the Local Player Dock without clipping;
   - local controls remain usable.

10. **Dense table / responsive**
   - 6–8 players;
   - no connector-driven page overflow;
   - no player geometry shift;
   - action cards remain readable.

11. **Unproven/stale/reconnect state**
   - graph fails closed rather than showing guessed lines/cards;
   - existing safe fallback presentation remains available until sufficient typed proof exists.

### 6.25 Suggested implementation sequence

Implementation should be incremental rather than replacing all UX2 interaction rendering in one change.

**Phase A — physical-seat graph foundation**
- top-level interaction overlay;
- reliable player-anchor geometry;
- one root card;
- single-target source tether and target arrow;
- self-target handling;
- fail-closed fallback.

**Phase B — generic response/counter grammar**
- public response-card nodes;
- explicit counter relationship;
- Attack/Dodge once typed causal proof exists;
- existing Negation migrated onto the same graph grammar.

**Phase C — persistent-root interactions**
- Duel exchange;
- multi-target root with active branch switching;
- target-specific effect instances and settlement outcomes.

**Phase D — extended event sources and polish**
- Hero skills/non-card effects;
- advanced routing/collision avoidance;
- long-chain collapse;
- reduced motion/accessibility narration;
- settlement animation polish.

Do not begin a later phase by adding client inference to compensate for missing typed authority.

### 6.26 Completion criterion

The interaction-visualization refactor is complete when a player can read combat directly from the real table:

~~~text
who acted  →  what card/effect  →  who is affected
                         ↘
                     what response counters it
~~~

without duplicated central Hero/player cards, while preserving authoritative semantics, private-information boundaries, stable physical Seat/Dock geometry, responsive containment, and the existing separation between public presentation and local legal-action controls.
### 6.27 Attack / Dodge: visual-first mobile refinement (approved 2026-10-09)

These are user-approved refinements to §§6.3, 6.5–6.7, 6.11, 6.17, 6.19–6.20. Preserve all server-authored causality, privacy, fail-closed behavior, responsive containment, stable Seat/Dock positions, and existing accessibility contracts.

**Visual grammar over gameplay prose:** The graph should explain action, author, direction, and interception through real card artwork, distinct connectors, and strong target emphasis. Do not add user-visible explanatory prose such as "PLAYED BY", "FROM PLAYER", "DODGE AVAILABLE", or lengthy instructions. Demote generic "ROOT ACTION" and textual "BLOCKED" labels when their meaning is visible through the graph; retain concise accessible screen-reader semantics without private information.

**Source:** Green means which physical player played a public card. Use a clearly visible, relatively narrow ribbon/tube-like connector, not a fine hairline. No arrowhead; shape must distinguish source from target even without colour. A publicly played Dodge also has a green source tether from its actual player.

**Attack target:** Red means the incoming attack direction. Increase connector thickness, contrast, and arrowhead size significantly, so direction is unmistakable at phone scale. It is valid for the red arrow to terminate at the **top edge of the local player's whole Dock**, not necessarily at their portrait; an opponent's existing Seat is also a valid endpoint. The **entire attacked player Seat or Local Dock** must receive a clearly noticeable but controlled highlight/glow, not merely the portrait. Do not shift panels or obstruct controls.

**Dodge interception:** When authoritative public Dodge succeeds, its **real card stands directly on or adjacent to the incoming Attack-to-target line, visibly intercepting it**. The red incoming line should terminate/break at the block; beyond it, the Attack path is absent or strongly subdued, with a clear block/bar/cross if necessary. Keep the green tether from the actual Dodge player to that card, but do not create a confusing separate three-sided/triangular causal diagram, a Dodge-to-self target arrow, or a second text-based explanation. What is blocked is **Attack**, never Dodge; do not label Dodge "BLOCKED". The source path must not obscure the block relationship.

**Cards and space:** Use the same genuine recognizable Attack/Dodge card face artwork and styling as hand cards. Make the central public cards as large as practical using available table space, instead of small text-only rectangles, while preserving root position, legible connectors, timer/menu/Guidance, all Seats/Dock and Deck/Discard, and preventing clipping or page overflow.

**Controls:** Keep the previously unified primary action button **CONFIRM**, including an ordinary Dodge response; never rename it "PLAY DODGE" or another per-card command. Preserve only already-approved semantic exceptions such as **TAKE DAMAGE**. Do not expand response Guidance with explanatory paragraphs. Available providers remain exclusively server-authorized through CurrentAction.

**Verification:** Review the real production-path Attack response, committed Dodge block, and settlement for local and opponent players at 390×844, 480×900, wide screen, and dense 6–8-player scenes where supported. Inspect screenshots, not only geometry/tests. Confirm at a glance: green authorship tether has no arrow; large red arrow indicates the actual target including Dock-top endpoint; whole target area is emphasized; Dodge visibly stops Attack without a triangle or contradictory status; authentic cards are large/readable; control labels remain consistent; no hidden/private leakage, guessed relationships, collisions, or lingering completed graph. Final reviewer visual approval is still required.
#### 6.27.1 Quantified size and placement targets (implementation guidance)

These values are concrete starting targets for implementation and screenshot review, **not permission to break collision/containment constraints**. Measure all dimensions in CSS pixels from real rendered elements, not screenshot-image pixels or device-pixel-ratio pixels. For each alternative choose the largest collision-free layout. Ratios below reference the current portrait hand-card face, approximately **68 × 102 CSS px (width × height; 2:3 aspect ratio)** in \`app/sequence-overrides.css\`. Do not use the current wide, shallow text placeholder's aspect ratio as the new card shape.

| Element | At 390px portrait | At 480px portrait | At >= 900px wide | Fit / ratio rule |
| --- | --- | --- | --- | --- |
| Attack root card | target 120 × 180px | target 132 × 198px | target 150 × 225px | 2:3 portrait; preferred width 1.6–1.9× hand-card width on portrait phones |
| Dodge response card | target 108 × 162px | target 116 × 174px | target 132 × 198px | 2:3 portrait; preferred width 1.35–1.7× hand-card width on phones |
| Dense/short view minimum if necessary | Attack 96 × 144px, Dodge 88 × 132px | adapt proportionally | adapt proportionally | Shrink **both** cards together in steps only when real geometry requires it; never crop art or overlap controls |
| Green source ribbon/tube | 3.5–4.5px visible body | 3.5–4.5px | 4–5px | Roughly 2–2.6× the previous generic 1.7px hairline; no arrowhead |
| Red Attack target ribbon/tube | 6–8px visible body | 6–8px | 7–9px | Roughly 2.1–2.9× the former generic 2.8px target stroke; always visually stronger than green source |
| Attack arrowhead | 26–32px axial length, 17–22px across | same / slight increase | 28–36px axial | About 1.3–1.6× the previous 20px Attack marker; arrow tip and silhouette stay visible at Dock boundary |
| Whole-target boundary emphasis | 3–4px clear ring plus restrained 14–24px halo | same | same | Covers **full existing Seat or Local Dock bounding box**, not only Hero art; no layout size/position change |

Colour semantics are fixed by §6.3 and user feedback: **green source**, **red Attack direction**. Use sufficiently luminous colours on the near-black board (initial design examples \`#86B9A2\` for green and \`#E06B5D\` for red), with subtle light/dark edge treatment to make strokes read as narrow tubes or ribbons, not flat hairlines. The currently committed Attack-only CSS overrides in \`app/sequence-overrides.css\` make the source cream (\`#e3dfc9\`) and the target/marker yellow (\`#ffd166\`); these **must be reconciled with the approved green/red visual grammar**, rather than silently retaining a contradictory colour exception. The numerical values are target appearance, not an instruction to hardcode all viewports identically.

**Root location:** Retain the root card inside the playable table, along the authored source → affected target relation, with preferred root-card centre around **30–42% of the source-to-target centreline length measured from the source**, allowing lateral routing to avoid obstacles. Existing code's ~36% source bias is a reasonable starting anchor. Maintain at least **12px outer margin** from the table safe region and **8–12px separation** from opponent Seat, Deck/Discard, timer, menu and Guidance rectangles. Once the authoritative root is displayed, preserve its top-left position to within **1 CSS px** during Dodge appearance and brief settlement, except a minimum correction required by a genuine viewport/obstacle change.

**Local Dock destination:** The red Attack arrow may terminate at the **top boundary of the whole Local Dock**. Preferred endpoint is within the centre **50% of Dock width**, choosing the segment that avoids system controls and other obstacles, with the arrow tip **0–5px above the Dock's outer border** so it does not vanish under the Dock. Do not reroute the Attack arrow to the Hero face solely to simplify geometry. Opponent targets use their existing Seat bounding box.

**Whole-panel highlighting:** For an Attack target use a full-perimeter **3–4px stroke/ring** and **14–24px restrained outer glow** on the *actual* target Seat/Dock. The identity panel, skills, equipment, hand and Confirm/Skip regions must remain clear and clickable. Do not add highlight-induced width, height, margin, transform, scroll or reflow. During Dodge resolution, visually reduce/neutralise the Attack-target emphasis once the authoritative block is applied; do not keep the panel signalling incoming unblocked damage.

#### 6.27.2 Direct Attack/Dodge interception geometry

Treat the root Attack card, its incoming target path, and the Dodge card as **one physical visual encounter**. Do not construct an abstract triangular edge network requiring mental decoding.

1. Start with the authoritative Attack root **rectangle**, authoritative target Seat/Dock **rectangle**, and the resulting actual red Attack path. Compute its open segment **from the root-card boundary to the target boundary**.
2. Place the Dodge **on this segment**, preferably with its card centre projected to **35–70% of the root-to-target path length**, measured from the Attack card edge, while staying outside all interactive panels. Its full portrait card should visibly occupy/intercept that path. Prefer about **45–55%** in open 390px 4-player scenes.
3. The graph should read as **Attack card → [Dodge physically blocks] → attacked player**. Make the red line *end at the leading Dodge edge* or clear terminal block; do not let a full-strength red arrow continue behind Dodge to the player. If the layout benefits from showing the historical route, any post-block remainder is **<=20% opacity, visibly broken/dashed, with no active arrowhead**. A short cross/bar at the interception point may be used, minimum **14–18px long** and **3–4px thick**.
4. The Dodge source's green tether connects from the **real Dodge-playing Seat/Dock** to the **Dodge card outer edge**, using no arrowhead. Route it as a lighter, narrower authorship connector around the card and target boundary. It must not obscure the blocked red path, merge into the target arrow, or visually create a new Dodge-to-player target relation.
5. If a portrait Dodge card cannot fit with its centre directly on the path, use the nearest collision-free adjacent position with its **nearest edge within 12–20px of the red path**, and add only a short perpendicular collision/bar contact at the proven intercept. This is a **fallback for compact layouts**, not permission to move Dodge toward an unrelated source or invent a triangle.
6. The **Dodge card is the successful response**. Do not place a visible \`BLOCKED\` heading on Dodge. If any short status is absolutely required, apply it to the Attack/effect, but prefer the broken red path and visual block rather than text.

The Attack root remains in its prior position as Dodge appears. Response placement must be computed around that stable root, not move the root to accommodate a Dodge card unless the current viewport truly becomes impossible.

#### 6.27.3 Rendered-card identity

Use the **same CardFace/game-card artwork and border/iconography family** as the hand for Attack and Dodge; scale by container dimensions without stretching or replacing art with a text box. Show short intrinsic card name/rank/suit if that is part of the real in-game card face, but **do not add second layers of explanatory titles** such as \`ROOT ACTION\`, \`FROM <player>\`, \`PLAYED BY\`, \`BLOCKED DODGE\`, \`AVAILABLE\`, or instructions to the player. Card art should remain the largest visual element; any readability treatment must follow existing card-face language.

#### 6.27.4 Attack graph stability: investigation and quality gate

**Observed problem (reported by user):** At times an Attack appears with the new physical-seat relationship, while at other times its relationship lines are absent or the older central-Hero interaction layout appears. This is an implementation quality defect until the specific causes are measured and addressed; do not report it fixed merely because a new graph can eventually appear.

**Confirmed code paths to audit:**

- \`app/page.tsx\`: \`rootActionOverlayEnabled\`, \`rootActionOverlayDisplayMode\`, \`rootActionLayoutState\`, \`rootActionTemporarilyBlocked\`, \`rootActionAwaitingReveal\` and \`rootActionOverlayOwnsComposition\`. Currently \`InteractionStage\` is restored when graph readiness is false.
- \`app/interaction-root-overlay.tsx\`: \`useLayoutEffect\`, \`ResizeObserver\`, measured card / source / target rectangles, candidate placement, state transitions \`measuring → ready / unavailable\`, effect cleanup resetting readiness, and the actual SVG element/path visibility. Do not conflate **proof missing**, **measurement pending**, **measurement invalid**, and **lines visually occluded**.
- \`game/presentation-v2.ts\`, \`game/presentation-snapshot.ts\`, \`game/presentation-client.ts\`: the exact constraints for root Attack proof, single-target \`ATTACK_RESPONSE\`, actual physical Attack card versus \`playedAs\` converted Attacks, multi-target Attack, nested child effects, and proven Attack settlement.
- The **current** Attack CSS white/yellow overrides versus the approved green/red connector conventions.

**Required diagnosis:** Retain existing privacy-safe diagnostic DOM attributes (display mode, layout state, fallback reason, root event/interaction identity). Add *test-only* frame/state snapshots so every absence of Attack lines can be assigned to exactly one source: (a) no authoritative proof/action, (b) temporary explicit local Inspect/Preview, (c) measuring/geometry unavailable, (d) event/reveal handoff, (e) graph exists but SVG line/marker is visually hidden or occluded. Do not fabricate a graph from timeline order or card name when server proof is unavailable.

**Stability requirement:** Once an ordinary **server-proven** single-target Attack graph reaches \`ready\` during the response window and no explicit local modal/Inspect intervenes, both source tether and red target arrow should remain visibly present through subsequent room polling and benign layout updates, **without unsolicited transitions to legacy Stage**. If the DOM anchors genuinely disappear or the server proof becomes invalid, fail closed as required by §6.2 and record the reason rather than masking it with guessed lines. While initial measurements are pending, prevent a visually jarring repeated Hero-card flash; retain a still-valid previously proven graph for the *same authoritative interaction* only if geometry remains valid, or show a neutral non-causal transition while measuring.

**Test matrix and observable thresholds:**

- Real server-backed normal Attack at **390×844**, **480×900**, **1440×900** for both local attacker and local defender; also **6- and 8-player** 390px and 480px boards.
- Sample **requestAnimationFrame** and graph DOM state for at least **12 continuous seconds** inside one open response window, plus a repeated server-poll/update sequence. Capture root identity, \`displayMode\`, \`layoutReadiness\`, \`fallbackReason\`, source and target SVG path presence, marker and computed visibility, and actual screenshot attachments.
- After first \`ready\`, require **zero unexpected graph → measuring/unavailable/fallback frames** during unchanged, valid response conditions. Any intentional Inspect/Preview/real geometry-loss transition is tested separately with an explicit expected reason and recovery to the **same** proven interaction root.
- Test **at least 10 repeated Attack windows** (not only one successful example) for regression. Verify both source and target paths and arrowhead are continuously present, not merely \`data-root-action-card\` eventually visible.
- Independently test **Dodge submission, successful interception, hit settlement, timeout/skip, viewport resize and mobile scroll/address-bar induced geometry changes**; ensure no duplicate central Hero Stage and new graph simultaneously, no stale graph from a preceding root, and no stuck public graph after settlement.
- Test real conversion/multi-target variants separately; if server proof is unsupported, document the scope clearly and schedule typed proof support. **Never fake links** to satisfy appearance-only assertions.
- Review actual screenshot/frame artifacts for visual quality and absence of green/red connector occlusion; CI pass alone is not Reviewer sign-off.

**Sequencing:** First diagnose and resolve intermittent ordinary Attack graph disappearance using the existing node sizes; then introduce larger authentic card geometry and stronger ribbon/arrow visuals with the placement and continuity tests. This separates a rendering-stability defect from the much larger responsive-layout design change. All agent-facing instructions for this refinement must be written in English, and implementation should be divided into bounded steps if needed.

### 6.28 Four-player Attack graph reliability and three-second public counter hold (User approved 2026-10-09)

This section is a **new, higher-priority acceptance correction** based on a real iPhone Safari screenshot, and a deliberate change to public counter-response timing. It extends §§6.17, 6.24, 6.27.1–6.27.4. It does **not** relax §§6.2–6.3 public causality, privacy, the fixed physical Seat/Local Dock grammar, or authoritative server gameplay timing.

#### 6.28.1 P0 regression: ordinary four-player Attack is visible without any relationship connectors

**Observed deployed-game reproduction reference:** A portrait iPhone view with **four players** (three opponents on the top row and local Lu Xun in the Dock), while the local player is answering **Dodge the Attack**, approximately **24 seconds remain**, and **one Dodge is selected but not yet confirmed**. The table shows only a **tiny Attack CardFace with a numbered gold "1" badge** near the middle. **No visible green attacker-source tether, red Attack-to-local-Dock arrow, or full-Dock target highlight** appears. The small numbered card resembles the old \`TableResolutionSequence\` / \`.table-played-card\` rendering, not the approved full-size \`InteractionRootOverlay\`. This is a concrete **four-player production UX regression**, not only the previously identified 6–8-player dense-seat fallback. The screenshot alone does not prove why the modern overlay was absent.

**Expected visual state during the entire uncommitted Dodge selection:**
- Root: one recognizable actual Attack card in the approved **120×180px portrait target size at 390px**, or a fit-proven **108×162 / 96×144px** smaller step as specified in §6.27.1. It is spatially related to the actual attacker and local defender; no tiny numbered settled card is accepted as a replacement graph.
- Source: an arrowless green ribbon **3.5–4.5px** wide from the real attacking opponent Seat to the Attack card. It must stay visible during response selection, room polling and ordinary hand-card lift.
- Target: a red ribbon **6–8px** wide ending at the **top boundary of the entire Local Player Dock**, with a clearly legible **26–32px** axial arrowhead. The **whole Dock** is emphasized by the approved **3–4px ring and 14–24px outer glow**, not just the portrait.
- Hand: the privately selected Dodge remains in its normal lifted state and ordinary **CONFIRM / SKIP** controls remain available. **Changing or selecting a response card before submission must not hide, suppress, or replace an already proven public Attack relation**. A selected private Dodge must not be shown as a public response node before the server commits it.
- No duplicated source/target Hero portraits, second generic action-card copy, or spurious "ROOT ACTION"/"PLAYED BY" explanatory text.

**Mandatory root-cause investigation:** Reproduce with a **real server-created four-player game** and browser-operated response (including selecting a Dodge but **not** submitting it), at **390×844**, **480×900**, and on at least one real or emulated iPhone Safari-sized viewport. Include an ordinary physical Attack and a converted physical-card Attack as separate cases. For each visible frame record a test-only, privacy-safe classification:
1. public root proof missing or rejected (and **which identity/phase/event check** rejected it);
2. permitted temporary local Inspect/Preview versus an accidental **selected-Dodge** presentation-precedence suppression;
3. \`measuring\`, root-card placement failure, **Attack root fits but reserved Dodge slot does not**, or another exact geometric rejection (use existing layout-fit diagnostics and stable physical anchor rectangles);
4. stale ready key, effect cleanup, polling or event/reveal sequencing handoff;
5. graph is \`ready\` but SVG source/target paths, marker, opacity, DOM visibility, stacking, or clipping make links disappear;
6. \`TableResolutionSequence\` has retained a numbered miniature Attack because \`rootActionOverlayOwnsComposition\` is false. Record the exact timeline/public-event identity and graph/fallback state; do not infer missing causality from this mini-card.

Do not blame geometry unless captured dimensions, candidate/obstacle diagnostics and failure reason prove it. In particular, investigate the impact of reserving a **future portrait Dodge slot before any Dodge is publicly played**, and whether the ordinary four-player response can instead render a valid root/target relation without violating the later physical-interception contract. Prefer a proven, collision-free root relationship over an unrelated miniature card when the **future optional response** cannot yet be placed. When a Dodge does arrive, compute its fit from the real committed response; any impossible combination must remain fail-closed, not silently overlap.

**Gate:** For normal, server-proven four-player Attacks with valid Seat/Dock anchors and no explicit Inspect/Preview, the full graph must be visible before private Dodge selection, remain unchanged **after selecting/unselecting the Dodge**, and persist for the remaining response period without unsolicited legacy switching. On repeated authoritative polls, preserve the exact root identity and action/card placement within **1 CSS px**. Test **at least ten independently seeded windows**, both source and defender viewers, response selection, timeout/Skip, converted Attack, layout remeasurement, and repeated updates. Require **zero unexplained missing-source or missing-target line frames** after initial graph readiness. Use screenshots and per-frame/DOM evidence rather than eventual root-card visibility alone. If a real scene remains infeasible, provide actual failure evidence and an explicit narrowly scoped follow-up; do **not** claim four-player Attack consistency accepted while this screenshot class is still reproducible.

#### 6.28.2 Visual timing: retain committed Dodge and Negation causal results for approximately three seconds

**New timing decision:** Any **server-committed, publicly observable counter-response**, initially **Dodge against Attack** and **Negation / counter-Negation** against a proven root/effect/earlier Negation, must remain **visibly understandable on the table for 3,000 milliseconds** after its complete public causal graph first becomes visible to each viewer. The retention applies to the **response card, root card/effect, source tethers, actual blocked/countered relation, active/blocked target effect, and relevant whole-target emphasis** as one composition. It is **not** a three-second hold for just an orphaned floating card.

This specifically **supersedes the ~0.4–0.8-second preference in §6.17 for these publicly committed counter-response outcome compositions**, and supersedes the existing ~600ms \`interactionSettlement\` / ~120ms reduced-motion removal for the affected visual response result. Other non-counter settlement durations remain unchanged unless separately approved.

**Precise presentation lifecycle (all durations measured from the first frame containing the complete, server-proven public counter graph for that particular viewer):**

1. **0–150ms arrival (optional):** Reveal the new committed Dodge/Negation card and connector, without moving the existing root or seats. Card movement and line-change effects may be brief; timing starts only when the whole causal result is visibly in place.
2. **0–3,000ms stable read window:** Keep the response/root/relationship diagram at normal readable opacity. Both public cards stay in their approved current relative positions. Source is still a green non-arrow tether; Dodge directly intercepts/breaks the red Attack arrow as in §6.27.2. Negation directly touches or counters the actual Stratagem/effect, and counter-Negation visually interrupts the preceding Negation as in §§6.13–6.14. Keep only server-authored public nodes; do not expose an uncommitted choice. **Do not collapse, reduce to a numbered thumbnail, or fade the main causal relation during this read window.**
3. **After 3,000ms:** Exit the completed interaction with a restrained **<=200ms** fade if it has genuinely settled and no newer response within the same authoritative root requires it. No long movement of cards back to players; no stale graph or residual glow after exit.
4. **Reduced motion:** Maintain the **same readable 3,000ms static state**; eliminate motion/fading rather than shortening the interpretation window to 120ms. Screen-reader announcements remain concise and causally correct. Do not add visible narration such as "PLAYED BY", "BLOCKED DODGE" or instructional paragraphs.
5. **Negation chain still open:** Public Negation card #1 remains visible while another player may answer with Negation #2. On a proven additional counter, show the updated chain immediately and give the **latest publicly committed response relation** a fresh 3,000ms readability interval. Do not prematurely remove earlier nodes needed to understand that counter, subject to the existing compact-chain/collapse rules when the chain becomes long.
6. **Players remain active:** This **must be a client presentation hold, not a 3-second server rule/turn/response delay**. Existing \`CurrentAction\`, response timers, auto-pass deadlines, card selection, CONFIRM/SKIP, and other real gameplay continue immediately. The read-only graph is pointer-transparent and must not obscure the next required controls. When a **new, independent authoritative root/action** needs the same board area before the old hold finishes, the new live action has priority; retire/supersede the old visualization safely rather than block the new decision or fabricate an overlapping graph. Same-interaction counter-Negation updates the existing root graph, not a second unrelated overlay. Never keep a completed response from an old interaction over a new root by identity accident.
7. **Multi-viewer delivery:** Each viewer's **local visible presentation** receives this reading time after actually receiving the committed public proof; do not anchor expiry only to the server's earlier event timestamp, which would make remote observers miss the counter after network/poll delay. Never use the local player's private button click as the proof of public response. Refresh/reconnect may restore a still-authoritative result but must not resurrect expired/unrelated graph state or invent proof when the public linkage is absent.

**Implementation constraints:** Audit \`app/page.tsx\` \`UI_TIMING.interactionSettlement\`, \`UI_TIMING.interactionSettlementReduced\`, \`activeAttackDodgeSettlement\`, Negation/reaction-chain routing, \`activeEvent\` / \`eventQueue\`, \`displayedSequenceEvents\`, and \`rootActionOverlayAction\` selection. Current visual proof may vanish when the server immediately advances or the client considers a 600ms result complete. Preserve an **immutable already-verified public root+response identity/projection** during the bounded hold if needed, always cross-checking the next public scene to prevent stale or mismatched render. Do not reconstruct a public counter from a locally selected card or from timeline order alone. Keep selected Local Dock cards and the central public CardFace separate.

**Three-second acceptance matrix:**
- Real server-backed **Attack → successful Dodge** at 390×844, 480×900 and 1440×900, attacker / defender / third-party observer where possible: capture a full causal frame at approximately **0ms, 1,000ms, 2,900ms and >3,000ms**; the complete counter relation remains present and readable to at least **3,000ms (±200ms browser scheduling tolerance)** when no new root supersedes it.
- Real server-backed **Stratagem → Negation**, **Negation → counter-Negation**, chain root restored/blocked, and a **late-joining or one-poll-delayed observer**. Check response cards and counter links at every frame, no false target arrows or visible private options.
- Real server-backed **successful Dodge as a converted response** if supported (for example Hero/Equipment provider); do not represent an uncommitted skill response as played. Preserve real physical card face and semantic Dodge role where proof exists.
- Submit the response through the **actual browser controls**, not exclusively an API POST; separately assert authoritative API/result state. Confirm game turn/response progression and timers are **not delayed** by the visual hold.
- Reduced-motion, 6–8-player mobile space, window resize, a new independent action arriving within 3s, viewer refresh/reconnect, and two rapid counter-Negations. Verify unique proof identity, graph/layout stability, safe z-index, no controls blocked, no duplicate mini-cards, and no stale reappearance.
- Capture PNGs and **time-stamped frame/DOM traces** for each important role and make successful CI screenshots/report artifacts retrievable for independent visual Reviewer approval. A green CI run does not constitute visual acceptance.

#### 6.28.3 Execution order and acceptance ownership

**Task A (P0, first):** Reproduce and repair the **four-player in-response missing-connector** screenshot class using the exact public data and geometry diagnostics above. Do not proceed merely because dense 8-player tests pass.

**Task B (new UX timing):** Implement the **3,000ms public counter-graph hold** for Attack/Dodge and Negation/counter-Negation, with tests proving the **complete public graph** (not only card visibility) persists and gameplay remains interactive. Keep this as a separate bounded commit from Task A so the appearance regression and timer change can be evaluated independently.

**Task C (visual acceptance):** Independently inspect real screenshots/recordings for (a) four-player **Dodge selected but uncommitted** with intact Attack tethers/highlight, and (b) each committed Dodge/Negation/counter-Negation at ~1s and ~2.9s. Maintain minimal visible copy and the globally approved **CONFIRM** vocabulary. Report unsupported situations precisely instead of claiming all Attack scenes are complete.

All coding-agent instructions and handoff task text for this work must be **in English**. Only \`docs/UX2-refine.md\` is owned by the UX Reviewer; \`HANDOVER.md\` remains Coding Agent-owned. Neither §4D completion nor unrelated Card/Skill work should be reopened as a prerequisite.

### 6.29 Consolidated causal-graph refinement: Attack/Dodge, Group/AOE, and relationship emphasis (User approved 2026-10-09)

**Status:** UX Reviewer-approved requirements for the Coding Agent's next task extraction. This specification consolidates the user's real iPhone screenshot feedback for **ordinary Attack/Dodge**, **Raining Arrows / Barbarian Invasion**, and **source/active/expired relationship lines**. It supplements §6.27 and §6.28; it is not a claim that these changes have been implemented or visually accepted.

**One visual language:** A public card should visually belong to the **physical player who played it**; a connector shows **what that card does**. Players understand the graph through authentic card faces, clear arrow direction, physical obstruction, and active/expired emphasis—not explanatory prose. Use the same physical Seat/Local Dock anchors throughout. The server owns public card identities, exact targets, ordered participant states, causal response links, and settlement; the viewer's CurrentAction alone owns private legality. If proof or geometry is inadequate, fail closed and log an exact, test-only reason rather than fabricating relations.

#### 6.29.1 Attack → Dodge: four-player missing-line regression and complete response hold

This is **P0**. A user-observed four-player iPhone Safari Attack response showed a tiny **numbered Attack card**, 24 seconds remaining, and a **privately selected but unsubmitted Dodge** in the Local Dock, yet **no green source tether, red target arrow, or whole-Dock target halo**. A mini card is not a substitute for the approved public Attack graph.

- Reproduce the exact **four-player ordinary Attack response**, including selecting and deselecting a hand Dodge without pressing CONFIRM. Once the authoritative Attack root is proven and its anchors fit, the existing full-size Attack card, attacker source tether, red arrow to the **top edge of the entire local Dock**, and whole-Dock target glow must remain continuously visible. A private selection **must not** become a public Dodge node, and must not suppress the public Attack.
- Inspect \`rootActionOverlayEnabled\`, \`rootActionOverlayLayoutReadiness\`, \`rootActionOverlayOwnsComposition\`, \`rootActionTemporarilyBlocked\`, event/reveal handoff, the root proof's frame/event identity, the optional future Dodge-slot reservation, SVG computed style/stacking/marker, and \`TableResolutionSequence\` miniature-card fallback. Capture the **specific** reason for every missing-line frame, including "root fits but reserved Dodge does not". Do not assume all failures are dense-layout geometry failures.
- Preserve the §6.27 authentic portrait Attack/Dodge sizes and collision constraints: at 390px, preferred **Attack 120×180 CSS px / Dodge 108×162**, compact **108×162 / 98×147**, minimum **96×144 / 88×132**; 2:3 aspect ratio. The physical Seat/Dock never moves. If an unsupported scene truly cannot fit, keep its fail-closed alternative and attach measured evidence; do not mark the reproduction fixed.
- A publicly committed Dodge must **directly interrupt the Attack-to-target red path**. The actual Dodge card blocks the path, the Attack line ends at the Dodge/contact mark, and the successful block does not retain a fully active arrow through to the player. A green arrowless tether connects the real Dodge-playing Seat/Dock to the public Dodge card. **No separate triangle**, no "PLAYED BY", and do not label the successful Dodge "BLOCKED".
- **Public visual hold:** After the entire committed Attack → Dodge graph first becomes visible, keep **the real Attack card, Dodge card, both source tethers, and the block relationship together for 3,000ms** on the viewer's screen, unless a newer authoritative live action must supersede it. Apply the same rule to **Negation / counter-Negation** with correct direct effect-to-counter semantics. Motion may end within 150ms; the hold is **static and legible**. Reduced-motion keeps the same 3,000ms readable state without movement. Remove/fade within **200ms** after expiry when the interaction is settled.
- This is a **client-only public presentation hold**, never a change to server response deadlines, legal actions, turn progression, timeouts, or card privacy. New public responses to the **same** interaction update the existing graph; a **different live root** takes priority. Keep response buttons generically **CONFIRM**, with existing approved exceptions such as TAKE DAMAGE. Do not add explanatory gameplay text.

**Acceptance:** Test ten independent four-player Attack windows from real server-generated rooms, at **390×844, 480×900, 1440×900** (both source and defender), sampling 12 seconds of response frames/polls and selected/unselected private Dodge. After readiness, there must be **zero unexplained frames missing a visible green source path, visible red target path/arrowhead, or target emphasis**. Commit Dodge from the browser UI, assert source/counter identities from the public server projection, and capture timestamps at **0ms, 1,000ms, 2,900ms, and >3,000ms**. Also cover observer polling, reduced motion, response timeout, converted Attack/Dodge and 6/8-player geometry without inventing links.

#### 6.29.2 Group/AOE cards: physical ownership and source-front anchoring

**Observed failure:** On a real four-player phone, the central **Raining Arrows** and **Barbarian Invasion** root plaques appear around the middle of the target resolution region, sometimes visually closer to the target than to the player who **played** the card. The user wants played cards to stay **in front of their owning player**, with the graph expressing the effect on other players. The root must not move toward each successive resolving participant.

**Root ownership:** One publicly proven group card/root belongs to its **original source Seat/Dock** for the entire interaction. The root remains in the **source's foreground zone**; it is not centred on a group-target centroid, not re-anchored near the active target, and not silently changed when the participant order advances. Existing \`layoutGroupRootAction()\` currently searches fractions **0.32–0.56** toward the target centroid; replace that placement preference with a **source-local search and objective**. Retain a single persistent root and per-target branches.

**Concrete source-front placement (all measurements in CSS px against actual measured rectangles):**

| Source physical location | Preferred root-card position | Acceptable source-local search before declaring no fit |
| --- | --- | --- |
| Top-row opponent Seat | Root **top edge 16–32px below Seat bottom**; root centre horizontally within **±35% of that Seat's width** from the Seat centre | Try vertical gap **12–48px** and lateral offset **±0.6 Seat widths**, constrained to clear table space |
| Viewer Local Dock | Root **bottom edge 16–32px above Dock top**; root centre horizontally within the central **60% of the Dock width**, or closer to the owner Hero zone if needed to keep clear of timer/menu | Try gap **12–48px**, then slide laterally within the safe local foreground without overlapping the Dock or Guidance |
| Side-column opponent Seat | Root nearest vertical **side edge 16–32px inward toward the table centre**; align root centre to the Seat centre on the other axis within **±35% of Seat height** | Try inward gap **12–48px** and an along-edge shift up to **0.6 Seat heights** |

These gaps measure **card outer edge to player-panel outer edge** (not card centre). This matters when replacing a shallow root plaque with a portrait real card. Use the **actual measured card width/height**, keep its authentic 2:3 face where a public physical card is available and use the §6.27 fit ladder when applicable; never stretch a portrait card to satisfy the gap. Use an initial **12px table safe inset** and **8–12px obstacle clearance** around cards and controls, including Seats, Dock, System Menu, countdown, public Deck/Discard, Guidance and previous public nodes. Consider source-local candidate orientations and fit steps before resorting to a generic placement; never relocate a root near the current target simply because that layout has more empty pixels.

For a standard four-player top-row source attacking the local Dock, the root must visibly read as **below that particular source Seat, in the source-side/upper portion of the table**, not as a floating label next to the lower local target. Its green tether should be short and unambiguous. For a local source, invert the orientation. The root's top-left rectangle should remain within **1 CSS px** across target advances, public Negation windows, and brief settlements, unless an actual viewport or obstacle change forces a documented fit correction. Position the root once per **same authoritative interaction/root event**, not once per target.

When no collision-free **source-owned** slot can be found, classify the exact obstacle/fit failure. Do not move physical Seats, overlap controls, fabricate a different causal root, or quietly pass off a target-adjacent placement as accepted source ownership.

#### 6.29.3 Group/AOE public target responses: show the played card in its player's foreground

**Observed failure:** A Barbarian Invasion participant can publicly answer with **Attack** (or a Raining Arrows participant with **Dodge**) yet the AOE graph shows only that the branch was satisfied/blocked, **without the actual response card and its visible causal connection**. A tiny independent numbered card from the old table sequence is not an acceptable substitute.

**Public-proof requirement:** The group participant's **committed physical response card**, its **semantic played-as response** (where valid), **responding player ID**, **specific AOE root/active group frame**, **exact group target branch ID**, **response event/resolution identity**, and **public avoided/damaged/negated outcome** must be linked by **server-projected, viewer-equal typed proof** and independently validated by snapshot/client adapters before rendering. Group Negation already has scoped counter proof; do **not** misrepresent an ordinary Barbarian **Attack response** or Raining **Dodge response** as a Negation, nor reuse private hand or a timeline-adjacency guess as evidence. If ordinary group Attack/Dodge response proof is missing, add a bounded public projection before building visual lines. Do not expose a privately selected response until the server has committed it.

**Placement rule for every publicly played response card:** Place the **actual card face in front of the player who played it**, including when that player is also the target of the group effect.

- **Top-row responder:** preferred response **top edge 12–28px below their Seat bottom**, centred within **±0.4 Seat widths** of the responding Seat centre; search down **12–44px** and laterally **±0.6 Seat widths** if root/other seats block it.
- **Local Dock responder:** preferred response **bottom edge 12–28px above the entire Dock top**, centred in a free Dock-facing region without covering countdown or System Menu; search upward **12–44px** and shift laterally as needed. The card must look emitted **from the Local Dock**, not from the central group root.
- **Side-column responder:** preferred response **near edge 12–28px inward from their Seat**; slide along that Seat by at most **0.6 of its height** before considering a justified collision-free alternative.
- Genuine public response portrait-card target at 390px: **~108×162px**, fit down with §6.27's compact/minimum ladder where necessary; use the **same game-card artwork, rank/suit, border and visual scale family as the hand**, not a small generic label.
- Keep a green **arrowless** source tether from that responder's existing Seat/Dock to the response card. Connect the card to the **specific server-proven group target-effect branch** by a short, direct intercept/contact relation at or near that participant's branch. A successful response visibly stops/satisfies **that participant's** incoming group effect; it must **not** block the entire AOE root or other participants. There must be **no response-to-own-Seat target arrow** and no confusing triangular counter diagram.

**Collision priority:** Card ownership near its real author takes precedence over putting the response portrait at the geometric midpoint of the root-to-target line. Where both can be satisfied, the edge of the response card should physically interrupt that target's incoming branch. Otherwise route a short **8–24px contact/intercept segment** from the card to its proven branch, with an explicit blocked/satisfied termination on that branch; the response card must remain clearly within the author's foreground. Do not draw a second active AOE arrow through a successfully answered card.

**Timing:** After a response becomes publicly committed and its complete relation is visible, keep the response card, source tether and **specific branch-resolution relation visible for the §6.28.2 3,000ms reading window** (unless superseded by a newer authoritative public action). The group root itself remains visible and fixed throughout the AOE. If the next participant becomes current before the hold ends, mark the previous branch completed/demoted **without removing its readable response card/causal trace before the viewer can identify what happened**, subject to safe space and newest-action precedence. Never delay actual game turn/response progression for this display.

#### 6.29.4 Group/AOE participant-progress grammar: completed vs current vs pending

The screenshot's tiny upper target check marks, subtle dashed branches and unchanging target visuals are **not sufficient**. Express branch progress without adding paragraphs or secondary player portraits. Use server-projected **status/outcome**, not guessed HP delta, role, line order, or turn ownership.

| Public state | Branch appearance | Player area and terminal marker |
| --- | --- | --- |
| **CURRENT** response required | **100% opacity**; width **4.5–6px** on 390px; strong existing gold/attack effect emphasis; clear target direction | Entire physical target Seat/Dock receives controlled focus; **18–22px** current/target emblem at end of active branch |
| **PAUSED** by nested public Dying/Negation/choice | **75–90% opacity**, distinguishable segmented/paused effect; maintain real target ownership | Target still identifiable; use distinct pause mark, not a false completed check |
| **RESOLVED: AVOIDED / successful required answer** | **30–45% opacity**, width **2.5–3.5px**, muted/desaturated, no active arrow glow | **18–22px** visible check/shield mark near branch's target end; show just-committed public response CardFace for 3s |
| **RESOLVED: DAMAGED / DEFEATED** | **30–45% opacity**, width **2.5–3.5px**; distinct muted outcome shape, not the successful-check style | **18–22px** unmistakable damage/broken-shield/HP-loss mark; do not infer loss from HP alone |
| **RESOLVED: NEGATED** (specific target effect) | **30–45% opacity**, interrupted target-specific branch; never suppress unrelated branches | **18–22px** crossed/negated mark, visually different from successful normal Attack/Dodge |
| **PENDING** | **20–35% opacity**, width **2–2.5px**, dashed and **without a completion mark or active arrow glow** | No active target halo; optional small neutral endpoint only |
| **NO_LONGER_APPLICABLE** | **20–30% opacity**, distinctly interrupted/empty branch | Neutral/disabled mark, never a false success/damage check |

The above numbers are visual **starting targets**, verified against actual rendered screenshot pixels and responsive collision constraints, not unconditional hard-coded CSS at every resolution. State cues must differ in **shape, saturation/brightness and stroke/dash**, not colour alone. Terminal glyphs should have an **18–22px legible footprint** with contrasting outline on a 390px screen; the current 9px branch-status text marker is too small to be the only cue. Ensure source tethers and group-target lines are not confused with one another. Do not use the miniature numbered-card badge as the only progress indicator.

**Active-focus invariant:** For ordered group progress, exactly the **server-proven current** target branch is strongest; all completed/expired branches are secondary and all pending branches weaker. If the original group semantic model is truly **simultaneous** (e.g. Oath), preserve its actual multiple-recipient scope; do **not** rewrite simultaneous semantics to fit an ordered visual pattern. AOE root remains fixed while target branch emphasis advances. Keep all participant outcomes visually inspectable for the current group while avoiding clutter or overlap.

#### 6.29.5 Stronger green source tether: global visual weight and accessibility

**Updated explicit user decision:** The author-to-card green tether is too thin compared with the prominent red Attack-to-target arrow, particularly on portrait phones. **Increase its visible body thickness for all active public source relationships**, including ordinary Attack, Dodge, Negation, AOE roots, AOE responses and Duel exchanges.

| CSS-pixel viewport | **Active source tether** | **Active Attack target arrow/strong target branch** | Relative visual weight |
| --- | --- | --- | --- |
| ~390px portrait | **5–6px** green body | **6–8px** red body | source about **75–90%** of target width |
| ~480px portrait | **5.5–6.5px** green | **7–8px** red | still slightly secondary |
| >=900px wide | **6–7px** green | **7–9px** red | still slightly secondary |

Use **green #86B9A2** and red **#E06B5D** as initial high-contrast reference colours against the dark table; refine for actual theme contrast. A narrow ribbon/tube effect may use **1px subtle bright edge and 2–4px restrained ambient glow**, without materially increasing the apparent interaction hitbox. The **green source line is always arrowless**; the red Attack/target line keeps its **26–32px axial arrowhead** on phones, and an explicit blocked/intercept mark where appropriate. Green means **authorship**, not a second attack direction. Even without colour, distinguish author tether by **no arrowhead + line treatment**.

**Normative override:** Replace earlier §6.27.1 / §6.28.1 **3.5–4.5px** green source-tether figures with the **5–6px** phone target above. Do not leave Attack-only 4px source strokes or generic 1.7px tethers as visibly inconsistent exceptions. Keep source lines lighter than attack/target relations, but never hairline-thin.

#### 6.29.6 Expired causal relationships: old link becomes subdued, current step takes focus

**Updated user decision:** In sequential interactions such as **Duel**, when an earlier exchange finishes and the next publicly committed **Attack** arrives, the previous source/response/target relationship should **not stay highlighted**, but a faint trace can remain so the user understands the chain. This is a **visual lifecycle state**, not a server game-state mutation.

**Semantics:**

- \`CURRENT\`: relation belonging to the newest server-proven active step/effect.
- \`RECENT_EXPIRED\`: immediately previous **public, verified** relation in the **same interaction/root** that is no longer the current focus.
- \`COLLAPSED_HISTORY\`: older verified public steps that no longer fit cleanly; show at most a compact neutral history cue, or omit their lines after the permitted read window. No new full Hero portraits or stacked orphaned card pile.
- A newly played card is not current until its exact public response/event identity has become authoritative. An earlier line becomes expired **only when authoritative public progress supersedes it**, not when a player merely selects a private hand card or a timer animation starts.

**Required styling for an expired relation:**

- body thickness **55–70%** of that relation's active body (e.g. source **3–4px** if active green is 5–6px; active Attack line 7px becomes **~4px**);
- opacity **25–40%** and desaturated **grey-green** for a source tether, **grey-red/warm grey** for an expired attack/target relation;
- no full-bright arrowhead, source/target glow, or whole-player target halo; a weak terminal shape may remain where necessary to show direction, without looking active;
- use a **5–7px dash / 4–6px gap** if helpful to distinguish expired from live, but do not use dash alone as the only signal;
- historical CardFace, if retained, loses glow and may scale to **80–90% of the active node's apparent size** **only when that can be done without moving the root or reflowing already laid-out cards**. Do not scale away rank/suit or remove proof-linked card identity.

**History limit on mobile:** Prefer **one current relation plus the immediately preceding expired relation**. A second older expired relation is optional **only if it fits**; collapse/remove older links before allowing overlaps. The true root card remains stable through the whole interaction. Do not preserve misleading ghost branches when the root action has fully ended and a new, independent root takes precedence.

**Duel example:** The Duel root remains the single unchanged authoritative card. After player B publicly commits Attack #1, its green author tether and Duel counter relation are active. When the next player publicly commits Attack #2 and the server proves the exchange advanced, **Attack #2's author tether + response-to-Duel relation become the only brightest pair**; Attack #1's source and response links become **RECENT_EXPIRED** at 25–40% opacity, not a second fully bright active exchange. The previous card/trace is readable enough to show why it continued, then collapses as subsequent exchanges accumulate. Do not infer Duel turns or response ownership from player position or turn seat.

**Negation example:** On counter-Negation, the just-superseded Negation-to-effect link loses emphasis, and the **new server-proven Negation-to-previous-Negation counter link** becomes the strongest. Keep exact scope: countering a specific Group target effect does not negate the whole AOE root. The 3-second readability hold from §6.28 remains: earlier public response cards and a subdued trace should remain **readable** when superseded quickly by another committed response, but only the current step stays **fully highlighted**. When a different root requires the board, new live gameplay takes precedence and stale history clears.

**Ordered AOE example:** Once player A's publicly answered target branch is resolved, its branch transitions to subdued **completed** styling, while player B's next authorised target branch becomes strongest. If the completed response is still inside its public read window, retain its authentic card in A's physical foreground with subdued linkage, as space permits, without covering B's controls. This styling expresses **completed vs current vs pending** per §6.29.4; do not invent old branches from timeline sequencing.

#### 6.29.7 Interaction-wide compositional and timing rules

- **One authored physical card, one owner:** Do not draw the same card as a large active root and a separate numbered floating duplicate. Hide/suppress the legacy \`TableResolutionSequence\` copy **only once** the server-proven graph actually owns the composition, so a legitimate fail-closed fallback still exists when proof is missing.
- **Spatial hierarchy:** Root and public response cards prefer their **own authors' foreground zones**; link routing expresses targets, intercepted effects and counter-actions; root and physical Seats/Dock stay fixed. For ordinary Attack/Dodge, retain the strict **direct Dodge interception** rule in §6.27.2 even where this requires a measured contact between responder-foreground card and red Attack path; do not replace it with a free-floating triangle.
- **Visual hierarchy:** Strong current target arrow/branch > robust active green source tether > completed/expired relationship > pending relationship. Use only genuine public authored proof for each element.
- **Three-second readable public response:** The public card + authored tether + exact effect/counter relation is readable for **3,000ms per viewer** after first full graph visibility for Dodge, Negation/counter-Negation, and **AOE committed Attack/Dodge answers**. An immediate next verified step may **demote** the previous relationship but should not erase its readable trace when safely displayable. A new independent live root and valid time-sensitive controls take priority. This is a UI presentation hold; response deadlines, turn progression and \`CurrentAction\` are never paused. Reduced-motion preserves the same readable time but removes motion.
- **Minimal text:** Card artwork carries identity. Do not add visible "PLAYED BY", "ROOT ACTION" where a real face is available, verbose response instructions, or bespoke primary button captions. Preserve **CONFIRM** and already-approved **TAKE DAMAGE** exceptions. Keep accessible, privacy-safe, screen-reader-only semantic descriptions and accessible controls.
- **No inference:** No client-only made-up source/target/counter relation, private card disclosure, guessed group response provenance, stale root reappearance, or a false whole-AOE block. All fallback/visibility decisions must have a reason observable in **test-only** evidence.

#### 6.29.8 Bounded Coding Agent task sequence and acceptance gates (in English)

The Coding Agent should extract **separate small tasks** at the next planning/handover boundary; do not attempt one giant multi-feature patch. Respect existing in-flight task ownership and do **not** edit this design document merely to report task results.

**Task A — P0: four-player Attack/Dodge continuity and 3-second public counter readability (§§6.28, 6.29.1).**
1. Reproduce the exact four-player "Dodge selected, Attack miniature without connectors" production UI using server-backed fixtures and browser hand selection.
2. Diagnose proof-vs-geometry-vs-visibility with frame-level evidence; repair the root cause without guessed relations.
3. Implement/verify the **3,000ms complete causal graph** for publicly committed Dodge and Negation/counter-Negation; preserve independent turn progression.
4. Test before/during private selection, after public response, reconnect, reduced motion, multi-viewer delivery, and correct cleanup. Close only with real browser screenshots.

**Task B — P1: source-owned AOE root geometry (§6.29.2).**
1. Replace target-centroid-biased AOE root placement with the **source-foreground position** and measured safe-region search above.
2. Keep same-interaction root position within **1 CSS px** while current target advances or Negation starts.
3. Test source at top/middle/end Seat and at Local Dock, 4/6/8 players, 390×844 / 480×900 / 1440×900. Record exact fallback cause for impossible layouts; do not move Seats or dock.

**Task C — P1: real public AOE answers and progress (§§6.29.3–6.29.4).**
1. Audit existing authoritative Group/AE target-response proof; add missing typed public exact-response links for Barbarian Invasion **Attack** and Raining Arrows **Dodge** (including \`playedAs\` variants where valid). Keep group Negation scope independent.
2. Render committed response CardFace **in front of its author Seat/Dock**, green author tether, short response-to-exact-target-branch contact/intercept; show it for the approved 3-second visual interval when safely possible. Do not show a privately selected card as public.
3. Apply large **18–22px** branch endpoint statuses with clear current, paused, completed-success, completed-damaged, negated and pending differences. No "all branches cancelled" when only one target's effect is negated.
4. Verify multi-player sequential responses and viewer equality; no duplicate miniature cards and no obscured local CONFIRM/SKIP.

**Task D — P1/P2: thick active source lines and proven expired-link treatment (§§6.29.5–6.29.6).**
1. Centralise and reconcile **green 5–6px** active source styling versus **red 6–8px** target line on 390px, including AOE, Duel, Negation and converted-card variants. Validate arrowhead/no-arrow semantics and contrast.
2. Add typed presentation-only \`CURRENT\` / \`RECENT_EXPIRED\` / \`COLLAPSED_HISTORY\` styling driven by already-proven public step identity; support at least Duel Attack #1 → #2, Negation → counter-Negation, and ordered group target progress.
3. Limit visible history to current + immediately previous expired on phones unless measured space permits more. Do not compete with the 3-second readable public counter relationship or prevent live actions.

**Final acceptance and evidence (all tasks):**
- Use the **production page against actual server-created/seeded rooms**. UI operations must be performed from actual hand/response controls at least once per family; API-only POSTs or fixture-only renders are not equivalent to UI reachability.
- Capture screenshot and **time-stamped frame/DOM traces** for all major states, including 390×844, 480×900, 1440×900, **6/8-player** dense scenes and both local/remote viewers. Publish useful screenshot/Playwright report artifacts from successful CI for independent review.
- Confirm exact source/target IDs, public root/event/frame/revision scope, root rectangle stability **≤1 CSS px**, connector/marker presence and visibility, complete public response duration **3,000ms ±200ms** when not superseded, branch marker legibility, collision-free card ownership, and no unexpected original Stage/reveal duplicates.
- Verify actor/responder privacy, stale/rejected response proof, browser reconnect, polling, touch-like viewport changes, reduced motion, new authoritative root preemption, and that server timers are unaffected.
- **No final UX Reviewer acceptance is implied by green CI.** Do not reopen completed §4D work or change \`HANDOVER.md\` on the UX Reviewer side. The Coding Agent owns task selection/results in \`HANDOVER.md\`; this document is the design source of truth.

### 6.30 User-approved CI gate policy: maximum six minutes, minimal tests, visual tests only after acceptance (2026-10-09)

**This policy overrides any earlier §§6.27–6.29 wording that would make long, unapproved UX/browser tests mandatory on each push.** This is a process and CI requirement, not a claim that any visual feature is accepted.

**Hard limit:** Ordinary \`ux-v2\` push CI, including the required checks and production deployment/smoke step, must finish within **6:00 wall-clock minutes** in a successful normal run. Track actual workflow start-to-finish time. Do not call a 6-minute browser shard a 6-minute pipeline.

**Test admission is controlled by the user:**
- Before the user explicitly approves a feature from the **actual rendered game**, do **not** add its long UX tests, repeated multi-scene assertions, 10-game loops, 12-second frame samples, or 6/8-player geometry matrices to required per-push CI.
- A new feature's **smallest useful, short correctness test** may run locally during implementation. It does not automatically enter the required push suite. After visual acceptance, obtain the user's approval before adding that feature's tests to routine CI.
- Previously added, long or unapproved UX tests must be **removed from the required per-push selection**, not deleted from the repository. They may run locally or by manual workflow dispatch; do not use them to block routine deployment before acceptance.
- Tests that claim a successful public Attack relationship while accepting \`geometry-unavailable\`, old Stage fallback or merely a private target Preview are **not valid positive UX acceptance tests**. Retain any useful negative fallback/safety cases separately, without misrepresenting them as user-visible proof.

**Minimum required fast CI:** keep a small, reliable set of **build/typecheck, lint, fast game-rule/API/privacy and core startup/interaction smoke** checks. Run jobs concurrently and measure their duration. Use the smallest representative browser set necessary to detect app boot, room creation and fundamental control/API breakage. Do not run the entire existing Playwright collection on every push. Move broad Hero roster, AOE/Duel/Attack dense layouts, Negation chains and lengthy repeated scenarios into **manual or post-acceptance validation**, unless the user separately approves a short gate. Preserve correctness and private-information safeguards.

**Honest result:** Never use \`|| true\`, forced success, skipped failing required assertions, or changed expected values merely to paint CI green. Genuine failures in the deliberately small required gate must remain failures and be repaired. The instruction that CI “must not fail” means **eliminate unreliable, redundant, unapproved UX gates and maintain a stable minimal CI**, not suppress real errors.

**UX release status is independent of CI:** A green fast CI means the chosen technical checks passed. It does **not** mean Attack/Dodge, AOE or any other card passed visual acceptance. The user's real-device observation of missing Attack lines remains **UX REJECTED / OPEN** until the user examines a working implementation.

**Agent's next isolated execution task — \`UX2-CI-MINIMAL-6MIN-01\`:**
1. Inventory required CI tests, execution time and false-positive UX tests. Identify the current long Attack/Dodge and dense 6/8-player cases that have **not been accepted by the user**.
2. Change workflow and test selection so those long UX cases **do not run on push**. Keep their source files and make a separate manually triggered runner for diagnostics; do not modify game presentation while doing this CI-only task.
3. Retain only the bounded build/lint, essential rules/API/privacy and basic browser journey checks on push. Remove redundant setup/build where safe; measure cold/warm timings, retries and runner consumption.
4. Push one bounded CI change, demonstrate **three successful ordinary CI runs each no longer than 6:00 end-to-end**, with accurate checks, no swallowed failures, and honest deployment verification. If the limit is not yet reached, report the exact remaining slow stage and continue optimizing this CI task rather than broadening UX scope.
5. Update Coding Agent-owned \`HANDOVER.md\` and **stop for the user's next instruction**. Do not claim Reviewer visual approval or enroll unapproved long UX tests.

**Priority:** This CI-gate correction comes before starting another card type. Subsequent implementation is **one card, one user-visible feature, one user approval at a time**. Long-term regression coverage should be admitted only after that acceptance and must be designed to respect the six-minute push budget.


### 6.31 User-approved Attack/Dodge mobile graph and trace-menu polish (2026-10-10)

**Scope and evidence:** The user supplied two real iPhone screenshots of a working Attack/Dodge relationship graph and the System Menu. The requested work is **visual polish only**: the current portrait Attack and Dodge cards crowd/obscure the red relationship arrow, and a long diagnostic paragraph below **Download UX trace** makes the in-game menu unnecessarily large. This is not a request to change gameplay, causality, card/skill handling, 20-second graph hold, server deadlines, or trace collection. The user will visually review the result.

**Override on mobile:** For ordinary Attack/Dodge at **390–480 CSS px**, visibility of the direction/blocked endpoint takes priority over §§6.27–6.27.1's earlier preference for maximally large cards. Preserve §§6.27.2, 6.29.5–6.29.7's direct Dodge interception, authentic physical CardFace, arrowless green authorship tether, strong red Attack direction, fixed Seats/Dock and safe controls. This override applies to mobile Attack/Dodge sizing, not automatically to other card types.

#### 6.31.1 Card size and position

- On approximately **440px** portrait (the user's screenshot), and across 390–480px, start with a *matched smaller pair*: approximately **Attack 96–108 × 144–162 CSS px**, **Dodge 88–98 × 132–147 CSS px** at 2:3 aspect. This is roughly **75–85% of the oversized current fit**, subject to actual CSS measurements. Keep card artwork, rank and suit readable; adjust after screenshot comparison rather than applying a blind transform. In narrower 320px layouts choose the smallest readable non-overlapping fit, and report impossible geometry explicitly.
- Arrange a **compact, separated** causal composition inside the playable upper/middle table. Place the Attack clearly in the attacking author's foreground, and Dodge on or immediately adjacent to the *proven incoming Attack path*. The size/position must leave useful visible red path between cards and a clear block near Dodge, while retaining source ownership. Avoid top player Seats, Deck/Discard, Local Dock, menus, Guidance and actionable controls.
- Never reposition an already displayed Attack root simply because Dodge appears; keep same-interaction root location stable **within 1 CSS px** when viewport and anchors are unchanged. For an actual viewport/anchor change, re-fit using authoritative public IDs. Do not duplicate the same public card in the legacy overlay.
- Measure actual card rectangles and recompute arrow geometry **together**. Reducing CSS sizes while leaving old SVG endpoints or cached layout coordinates is not a finished fix.

#### 6.31.2 No hidden red arrowhead or false Attack continuation

- **Before Dodge:** the red Attack arrow must be visibly directional from the authentic Attack card boundary toward the actual target Seat/Dock; neither path endpoint nor arrowhead may sit under a card body or its border.
- **After proven Dodge:** show a visibly incoming red segment **ending at the leading Dodge edge or a visible external block/contact mark**. The arrowhead, bar or cross that explains the block must be visible **outside the cards**, not concealed underneath blue Dodge art. Keep the approximate 26–32px phone arrowhead where a directional head is used. Do **not** leave an active red arrow visually continuing from the block to the targeted player. Optional expired remainder is <=20% opacity and has no active arrowhead.
- Dodge remains a **physical interception**, not a free-floating triangular network. For tight geometries, the §6.27.2 adjacent fallback may place the nearest Dodge edge **12–20px** from the genuine path, with a short explicit contact segment. This intentional contact at the card edge is different from allowing the card to hide the causal line. Do not blindly raise the full SVG layer over card art.
- Keep Attack and Dodge's **green, arrowless** owner-to-card tethers legible and distinct from red direction, consistent with §6.29.5. Do not obscure controls or shift Seat/Dock DOM. Check actual rendered stroke, marker, SVG clipping and z-order: DOM existence and \`graphReady=true\` do not prove the arrow is visibly legible.

**Visual acceptance:** Show side-by-side before/after **real server-backed** Attack → publicly played Dodge screenshots at 390×844, approximately 440px portrait, and 480×900, plus a relevant narrow/short fit if changed. Confirm true root/response ownership, readable rank/suit, clearly visible incoming red direction and stopped/block mark, green source tethers, no occluded arrowhead, no control overlap, unchanged response timing. A geometry-unavailable fallback or legacy-only card display is **not** a positive UX pass. Keep any new lengthy visual diagnostic suite out of required push CI until the user approves it (§6.30).

#### 6.31.3 Compact System Menu

The existing \`app/page.tsx\` menu contains a long \`stage-system-diagnostics-note\` about automatic recording, privacy exclusions, trace IDs and length limits. **Remove that long visible note**, not the actual safety or diagnostics functionality.

Keep the **GitHub Actions build SHA**, **Download UX trace** button and **Exit Game** button. Keep the build badge, actual JSON export/automatic recording, privacy filtering, trace-size limit, short download success \`role="status"\` feedback, keyboard/focus behavior and Exit Game confirmation. Prefer **no text** under the download button; only a single short unobtrusive hint if truly needed.

**Menu acceptance:** A mobile screenshot shows a compact SHA + two actions with no large explanatory paragraph, excess height or hidden controls. Download and Exit continue to work. Do not change the trace API or data policy to achieve the visual reduction.

#### 6.31.4 Coding Agent boundary

This is one bounded **UI-only** task: inspect \`app/interaction-root-overlay.tsx\`, \`app/sequence-overrides.css\` and System Menu in \`app/page.tsx\`. Deliver measured before/after mobile screenshots and a brief focused regression check. Do **not** change rules, public proof, skills, response deadlines, graph-hold duration, CI selection or other card graphs. Stop for the user's visual review; a green CI alone is not UX acceptance. Work on this only at an authorized planning boundary; do not interrupt an existing HANDOVER task.


### 6.32 Compilation, ESLint and test memory optimization — evidence first (user-requested review 2026-10-10)

**Scope:** The user reports local compilation/testing sometimes approaching **3–4 GB RAM** and failing with OOM. This is a **reported symptom**, not a measured per-process peak from the available GitHub Actions logs. Memory profiling and subsequent safe optimizations are authorized investigation topics; an unverified heap leak, OOM cause or memory saving must **not** be asserted as fact. This is independent of §6.31's UI polish.

#### 6.32.1 Confirmed review evidence (historical baseline, remeasure on current HEAD)

| Area | Verified evidence | Caution |
| --- | --- | --- |
| Vinext build | Around **6–9 seconds** per build in recent successful GitHub Actions runs | Wall time is **not** peak memory |
| Complete ESLint | **71 seconds** in Actions run **38061870954**, **92 seconds** in run **38064028420** | Likely worthwhile to profile; no RSS/heap peak recorded |
| Fast tests | **261 passing tests**, **8.64 seconds** in run 38061870954; \`--test-concurrency=1\` | Already relatively efficient; no justification to remove tests |
| API suite | **266 passing tests** across **24 files** and **four concurrent shards**, about **76.62 seconds** | Each shard creates its own Wrangler/D1/test Node process group; aggregate RSS may be high, but is **unmeasured** |
| Source size | \`app/api/rooms/route.ts\` ~**584 KB**, \`app/page.tsx\` ~**468 KB**, \`app/interaction-root-overlay.tsx\` ~**171 KB** | Babel emits a >500 KB deoptimization warning for route.ts; warning **does not prove OOM** |
| ESLint heap configuration | \`NODE_OPTIONS=--max-old-space-size=8192\` in \`.github/workflows/deploy.yml\` | 8192 is a permitted V8 old-space maximum, **not actual 8 GB allocation**, and may be unsafe as a workaround on a RAM-limited host |
| Browser tests | Required CI runs one room-startup smoke; full Playwright diagnostics are manual. Local \`test:browser\` has no explicit workers cap | Automatic local worker count can cause aggregate Chromium pressure on smaller machines; measure it first |

GitHub's required \`lint-fast\`, \`api\` and \`browser-smoke\` jobs execute on **separate runners**, so do not add their RAM figures as if on one shared host. Conversely a local developer running multiple commands concurrently may see aggregate memory pressure. The inspected successful GitHub runs did **not** contain a proven OOM event or a peak RSS metric; do not confuse lack of such logs with proof that the user's local problem cannot occur.

Inspect the current \`package.json\`, \`eslint.config.mjs\`, \`tests/run-api-suite.mjs\`, \`tests/run-tests.mjs\`, \`tests/run-fast-tests.mjs\`, \`tests/browser/playwright.config.mjs\`, \`.github/workflows/deploy.yml\` and \`docs/CI_TEST_OPTIMIZATION.md\` (the latter is historical analysis, **not** current policy). Always refresh the measurements and test membership.

#### 6.32.2 First deliverable: reproducible process-tree memory profile

Before modifying source or discarding tests:

1. Record exact branch SHA, OS/RAM limit and Node/tool versions. Run **separately** \`npm run build\`, \`npm run lint\`, \`npm run test:fast\`, \`npm run test:api\` and the existing **single** browser-smoke test.
2. Capture **peak resident memory (RSS) for the complete spawned process tree**, not just \`node\`'s heap: include Wrangler, workerd, Miniflare/D1, test Node processes and Chromium when present. Record per-PID RSS, optional \`heapUsed/heapTotal\`, wall time, peak aggregate tree RSS, subprocess count, exit code and test pass count. Use appropriate OS process sampling and/or \`/usr/bin/time -v\`; explicitly state metric limitations.
3. Check whether child processes remain alive after command exit. A \`SIGTERM\` call without awaiting process exit is a **cleanup risk to measure**, not itself proof of leaked workers.
4. If it OOMs, distinguish **V8 \`JavaScript heap out of memory\`**, **OS/container \`SIGKILL\` / exit 137 / cgroup \`oom_kill\`**, and unrelated failures; include the shortest safe error tail. Do not accidentally reveal test tokens, private cards or game secrets.
5. Make a reproducible comparison table: **command / concurrent processes / peak tree RSS / heap peak where measurable / duration / test counts / result**. If no OOM reproduces, state that honestly and identify the strongest measured memory consumer.
6. Profiling belongs in local/opt-in diagnostics, **not** an unapproved lengthy push-CI job. Do not trigger repeated known OOM failures in ordinary CI.

#### 6.32.3 Evidence-driven optimization candidates and safety rules

**P0 — Lint costs:** Profile large files and the current ESLint flat config, especially the React Compiler/Hooks rule scope for server-only modules versus genuine React components. If React-specific analysis is demonstrably unnecessary on non-React files, **narrow that rule application only where valid**; keep every relevant React/hook check on UI/hooks, and preserve TypeScript, security and accessibility checks. Prove equivalent intended rule enforcement via a small deliberately failing lint fixture or precise rule coverage comparison. Do not disable entire lint categories merely to lower memory.

**P0 — API process concurrency:** Compare **four versus two API shards** while maintaining **exactly the same 24 test files/test membership**, isolated D1 states and meaningful assertions. Profile aggregate tree RSS and duration. A change from four to two is a candidate **only if** it produces a verified memory benefit and does not push full required CI/deployment past the user-approved limit. Do not reduce test counts, share databases across concurrent suites unsafely, or hide failures.

**P1 — Child process lifetimes:** Audit \`tests/run-tests.mjs\` cleanup after Wrangler termination and temporary state removal, and verify whether any descendants survive. If observed, use a bounded graceful shutdown/wait and appropriate escalation, preserving test outcome. Do not assume leak from code shape alone.

**P1 — Optional full browser diagnostics:** Measure RAM under local Playwright's implicit worker count; use a memory-aware explicit \`--workers=1\` or \`--workers=2\` when appropriate. Required push smoke already uses one worker. Keep broad UX cases in optional/manual diagnostics until post-acceptance authorization (§6.30), **not** deleted from the repository.

**P2 — Oversized production modules:** Consider a **later separately approved** domain/module decomposition only if it materially lowers measured lint/build memory or improves maintainability. A Babel >500 KB warning alone does not justify a risky refactor of the authoritative room API, game rules, or client state machine.

**Forbidden shortcuts:** raising Node old-space above physical/container RAM as a blanket cure; turning off real lint/privacy checks; skipping or deleting passing tests to save RAM; running all benchmark commands simultaneously and mislabeling system-wide load as a single-command peak; weakening assertions or marking an OOM as successful.

#### 6.32.4 Memory optimization acceptance and the six-minute CI policy

An optimization is proven only by **comparable before/after peak process-tree RSS** or elimination of an **actually reproduced OOM**, together with unchanged meaningful lint checks, full API/fast test membership and results, and no gameplay/privacy regressions. Report the time cost. The **full normal push-to-required-CI-to-Cloudflare-deploy/smoke interval must still finish within 6:00** under §6.30, rather than optimizing a single stage while harming the full pipeline.

Only implement a **small, measured runner/config change** in the same bounded diagnostic task. If the leading fix is a production refactor or alters test grouping substantially, report the measurements and hand off a **separate, scoped follow-up task** instead of expanding the investigation. Never claim the 3–4 GB root cause fixed without relevant proof.

### 6.33 Next-planning-boundary task separation for §§6.31–6.32

These are **separate approved areas**, not a combined implementation mandate. The Coding Agent owns \`HANDOVER.md\`, chooses one bounded task at the next valid planning boundary consistent with the user's direction, and must not interrupt an unrelated in-flight task merely because this design was amended.

**Candidate A — Mobile Attack/Dodge arrows and compact trace menu:** Apply §6.31 to \`app/interaction-root-overlay.tsx\`, \`app/sequence-overrides.css\` and the System Menu in \`app/page.tsx\`. Preserve exact public relationships and trace export. Validate on actual server-backed 390/~440/480px views; deliver side-by-side screenshots of clear red direction/Dodge interception and the compact menu. Short focused local checks; required CI stays fast. **Stop for the user's visual acceptance**. No memory/test-runner changes.

**Candidate B — Build/lint/test memory measurement and limited optimization:** Apply §6.32. Measure per-command peak process-tree RSS, compare 4-vs-2 API shards and ESLint rule costs, inspect child cleanup, and separate V8 heap OOM from OS/cgroup kill. Preserve all tests and checks. Make only one evidence-backed low-risk runner/config change if justified, verify RSS/time and exact-SHA CI/deploy; otherwise report root cause/next smallest task. **Stop for review**. No card layout or System Menu changes.

**Neither item is completed by this design amendment.** Green CI is not UX approval; performance advice is not proof of memory savings. Do not treat old §6.30 examples as authority to restart historical tasks without a current planning decision.
