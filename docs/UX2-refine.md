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
- transient event timer relocation and compact event-overlay spacing from §4A.

### 5.4 Resume condition

The user has authorized the UX2 interaction-visualization refactor **after all active refinement sections before §5 are completed, including §4A**. This refactor is part of completing UX2, not a new UX version.

Therefore:

1. finish the remaining authorized refinement work before §5 first, including §4A;
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
