# UX2 Refinement Decisions

This document is the current UX2 product/UI design authority for the refinement phase. It records reviewer-approved expected behavior, interaction presentation, responsive requirements, and measurable acceptance criteria. It is not a task queue.

## 0. Reading guide: current authority, historical gates, and no duplicate tasks (revision 2026-10-12)

This is a **product/UX design and acceptance specification, not the Coding Agent's task queue**. Only the user's latest instruction and the Coding Agent-owned `HANDOVER.md` determine an active implementation task. `docs/AUTONOMOUS_UI_ROADMAP.md` records implementation/test evidence, not user visual acceptance. Do not reconstruct old task lists from this document, and do not repeat implementation-closed work without a reproduced regression, a newly approved requirement, or a specific independent verification request.

**Phase interpretation:** §§1–4C specify enduring UX contracts. The historical pre-§6 integration gate in §4D was revalidated and cleared **for implementation sequencing** in the roadmap milestone `UX2.REFINEMENT-PRE-SECTION-6-GATE-REVALIDATION-01`; the earlier §5 deferral has expired. Section 6 physical-seat causal visualization is already under implementation/refinement. Neither milestone nor passing CI constitutes the user's visual sign-off.

**Current refinement precedence (newer specific decisions win over older generic targets):**

| Subject | Current canonical requirement | Older wording to treat as superseded |
| --- | --- | --- |
| Universal graph meaning and visual grammar | **§0.1 applies to every design session and agent:** exact public proof, stable root identity, semantic lifecycle, fixed Seat/Dock anchors, pale-green source tether, vivid-red effect relation, orthogonal routing, one compact balanced composition, privacy, and real-game evidence | Older family notes that imply client-inferred causality, curved routes, duplicate player/card panels, or a timer-driven graph lifetime |
| Shared public battle-card scale and spatial placement | **§0.1 + §§6.34/6.38:** use authentic public CardFaces no larger than the same viewport's hand cards; accepted Stage A size targets are 60×90 CSS px and 54×81px compact where fit requires it; place the whole graph centrally and balance it around the actual usable field | Older proposals for oversized/source-edge cards are superseded; retain only compatible proof and accessibility requirements |
| Connector semantics and weight | Source/player→card is pale green and arrowless; card→actual target/effect is vivid red with a clear directional endpoint; a counter relation terminates at the proven response with a non-colour interception marker. Use §6.29.5's measured stroke hierarchy, with current Attack references `#a6e0c5` and `#ff4b4b` | Muted/cream Attack lines, hairline source links, diagonal/Bézier routes, or equal-strength contradictory post-Dodge target arrows |
| Relationship lifecycle | **§0.1 / §6.35:** graph remains while its server-authoritative interaction is unresolved, regardless of elapsed time. Once terminal outcome is proven and the complete result is first rendered, keep it readable for **4 seconds**. No 20-second graph countdown. Server response deadlines remain separate and never pause | Fixed 20s/3s/sub-second graph-retention windows, countdown-driven disappearance, or treating animation/layout readiness as game completion |
| CI gate and evidence | **§6.30:** required push-to-deploy/smoke <=6 minutes, minimal meaningful checks; expansive unapproved visual tests remain optional | Old large per-push browser matrices and historical one-time CI task commands |
| Diagnostic memory work | **§6.32:** profile real process-tree RSS/OOM before any bounded optimization | Assuming the reported 3–4GB figure is a measured root cause or a license to remove checks |

All server-authored public causal proof, local `CurrentAction` legality, hidden-information protections, stable Seat/Dock geometry, fail-closed behavior and real-device acceptance requirements remain in force. Follow detailed sections below for actual UX behavior, not historic task IDs.

### 0.1 Universal public relationship-graph principles — normative for every design session and agent (2026-10-12)

These are **standing design rules, not a task or task queue**. Every UX2 design conversation, review, handoff, implementation and test involving a relationship graph must read and obey them. Family-specific sections may add detail, but may not contradict these rules. The user's newest explicit decision takes precedence over older wording. If a required public relationship cannot be proven or a visual requirement conflicts with a real gameplay/control boundary, fail closed and raise the exact gap; do not guess.

#### Meaning and authority

- A relationship graph is a readable rendering of the **server-authoritative public causal interaction**, not an animation reconstructed from event order. Every visible player, card, edge, current/expired state and outcome must map to exact validated public identity and scope. `CurrentAction` alone owns the viewer's legal/private controls.
- The public root has an immutable identity for that interaction. Presentation barriers such as `readyAfterEventId` control when a visual may be revealed; they are **not** substitutes for the root card/event identity. Once a genuine public root card is committed, show its graph immediately, including while an authorized optional skill/trigger is offered before the ordinary response window. Declining that trigger continues the same root. A redirection preserves the original root and changes the target only from new authoritative proof; never fabricate a Dodge or claim the original target responded.
- A response enters the public graph only after the matching response is committed and its actor, physical card (or typed played-as identity), root/frame, target branch and resolution are proven. Private hand selection, legal options, hidden cards, responder scan order and local preview never create or decorate public graph facts.
- Physical opponent Seats and the Local Player Dock are the only player anchors. Keep their DOM positions fixed; do not duplicate a Hero/Player centrally. Use authoritative player IDs to bind graph facts to those anchors. Geometry may choose an anchor on the corresponding real Seat/Dock edge, but geometry, seat order, names, HP and DOM order never determine who caused or receives an effect.

#### Lifecycle and focus

- Graph lifetime follows the authoritative card/interaction lifecycle, **not a fixed timer**. Keep the active root and its valid causal relations present for as long as that interaction is unresolved—even beyond 20 seconds, repeated polling, a skill handoff or a response wait. Same-root progress updates the graph without replacing its root; an optional private choice does not advance or erase it.
- When authoritative terminal settlement is reached, show the **complete, readable final graph for 4 seconds from its first fully rendered settled composition**, then retire it. This applies to all card families; remove the older 20s/3s and sub-second retention variants. Reduced-motion mode keeps the same four-second static result and removes motion, not readability.
- Do not display a graph-retention/debug countdown. A real server-owned response deadline is a separate control, belongs in its approved UI location, and must not be paused or extended by graph presentation. Presentation must never delay legal actions, turns, damage, response deadlines or server progression.
- During a chain, the newest server-proven unresolved step is strongest; the immediately prior proven step may remain subdued context; older history is compacted before it creates a card pile or collision. A new independent authoritative interaction takes visual priority, must not be confused with same-root continuation, and must never be blocked by presentation. Never resurrect an expired graph.

#### Shared visual grammar

- Arrange one real public root CardFace and its proven relationships as a single balanced composition in the **usable central battlefield**. Use authentic card art/rank/suit and the compact hand-sized tiers in §§6.34/6.38; never substitute fake cards, duplicate legacy miniatures or verbose `EFFECT`/`REACTION` panels that repeat the same graph facts. Keep the root's position and scale stable while the same interaction advances.
- **Source/authorship:** connect the actual source Seat/Dock to its public card with a pale-green, arrowless tether. The current ordinary Attack reference is `#a6e0c5` (about 5.5–6.5 CSS px on mobile, scaled/readability-checked at wider sizes).
- **Target/effect:** connect the root card to the exact affected Seat/Dock with a vivid-red directional relation; current ordinary Attack reference is `#ff4b4b` (about 6–8 CSS px on mobile, with a clearly visible 26–32px phone arrowhead). A successful Dodge changes the dominant red relation to Attack→Dodge and visibly terminates/intercepts it there; do not leave a full-strength red hit arrow to the target. Preserve the original target fact in the authoritative graph and accessible description. Negation connects to the exact effect/card it counters; Group/AOE uses only proven per-target branches.
- All connector routes use straight horizontal/vertical segments and the fewest collision-free **rounded 90-degree elbows**. No diagonals, Bézier/decorative curves or hairline shortcuts. Source and effect remain distinguishable without colour: source has no arrowhead; target has a clear arrowhead; interception has a distinct terminal/bar/shield/break mark. Brightness, stroke and glow emphasize the current relation; older same-root relations are visibly subdued.
- Older ASCII sketches in family sections communicate causal meaning, not literal coordinates, line angles or required card size. Use §6.38 only for the accepted ordinary Attack/Dodge placement details; do not let an older sketch override this shared visual grammar.
- Determine left/right and path shape from the **viewer-relative positions of the real, proven source/target anchors**, not a hard-coded side. Balance cards plus all connectors in the measured usable field, avoid Seats/Dock/Guidance/menu/timer/controls, and never move physical players to make the graph fit. Use the actual Seat/Dock edge facing the field. Prefer the shortest legible orthogonal route; document a real fit trade-off rather than drawing an invented relationship.
- Show outcomes at the proven relationship endpoint. In particular, `TAKE DAMAGE` belongs on/adjacent to the red Attack→actual-target relation, near the target side and outside tiny Hero artwork; make it large enough to read as a result, not a control button. Do not show it merely because a response was declined—require public damage-settlement proof.

#### Evidence and acceptance language

- Positive UX evidence requires the real server-backed production path, exact public proof identities, visible rendered CardFaces and actual SVG/DOM geometry. Separate server projection, client selection, mounted graph, actual visible frame, CI/deploy and human visual acceptance; none implies the next. Cover attacker, defender and observer where semantics allow, and use measured mobile plus relevant wide geometry.
- Tests and screenshots must not pass a `geometry-unavailable` fallback, guessed relation, private selection or hidden/occluded arrow as a successful graph. CI validates code; only the human Reviewer/user decides visual acceptance.

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


### 4A.12 Compact, non-blocking Effect Triggered notices — approved repair (2026-10-12)

**Design status:** User-reported production mobile screenshot defect; **this UX remedy is specified for a separate, bounded implementation/review**, not evidence of implementation or an automatic change to the Coding Agent's current HANDOVER task. This extends §4A's compact transient-display principles and leaves §0.1's authoritative interaction graph and current legal actions intact.

**Observed screenshot:** On an iPhone-sized game, a large centred `EFFECT TRIGGERED / Test Player 2 ... with Dauntless` banner overlays the battlefield and competes with the simultaneously visible `Use Retaliation, or skip` decision for Sima Yi. The screenshot alone does **not** prove the underlying individual timeline events or their exact ordering. The documented Standard implementation makes one plausible chain: Yue Jin's **Dauntless** can trigger at another player's turn end; its Equipment-discard-or-damage settlement may cause a Sima Yi **Retaliation** post-damage decision. These are separate authoritative gameplay events and must not be conflated or changed to fix a visual notice.

**Code-confirmed UI root cause on inspected `ux-v2` source (2026-10-12):**

- `app/page.tsx` scans fresh authoritative timeline messages for `event.type === "message" && event.effectNotice`, copies the message text to local `effectNotice` state (around line 2961), and renders `<div className="turn-notice effect-notice" role="status"> ... </div>` (around line 5374).
- `app/globals.css` uses `.turn-notice` for a large **centred turn-start overlay**, with `left/top: 50%`, `translate: -50% -50%`, `padding: 20px 42px`, and `.turn-notice b { font-size:25px }`. Because the effect notice shares that class, it inherits inappropriate centre-screen size and overlap. This is a **confirmed presentation-CSS cause**, not a hypothesis about the gameplay engine.
- `app/page.tsx` declares `UI_TIMING.effectNotice = 2400` ms while `.turn-notice` uses the unrelated `turnPulse 1.6s` animation; there is no dedicated aligned effect-notice motion lifecycle. The `setTimeout` is created for text-keyed dismissal from within the fresh-event handler and is not managed as a normal cancellable effect timer. The exact live-session duplicate/stale-notice symptoms have **not** been independently reproduced; do not claim these as additional observed defects.

**Expected player-facing result:**

1. **Small, non-blocking skill event banner, not a modal.** An eligible `effectNotice` appears as one **compact, black-and-gold, edge-anchored banner** inside the measured safe battlefield/Stage region, outside current CardFaces, relation lines, hero Seats, lower-right response timer/System Menu, Guidance, Hand and action buttons. Avoid the viewport/Stage centre and an all-table dimming layer. Prefer a banner width **<= 320 CSS px** or available safe width minus insets (whichever is smaller), approximately **8–10px vertical and 10–14px horizontal padding**, **12–13px readable body type**, contained text wrapping and content-driven height. Do not stretch a long message into huge central typography; preserve the full meaningful text accessibly.
2. **Notice and decision serve different functions.** Notice communicates a verified public event, e.g. `SKILL ACTIVATED · Yue Jin — Dauntless` **only if those actor/skill facts are actually supplied as authoritative public fields**. The primary `Retaliation` decision stays in its existing Local Dock/Guidance controls and remains operable. A public damage outcome, e.g. `Sima Yi takes 1 damage`, may only be attached when that specific public settlement is independently proven; never infer damage/skill/cause by parsing a message, comparing HP, hero names or adjacent timeline entries. Without typed facts, use the original public message unchanged with a compact `EFFECT TRIGGERED` heading; do **not** fabricate structured claims.
3. **Event identity and timing.** Render at most one active effect notice. Key its lifecycle by the authoritative timeline `event.id` rather than by the raw message string; a different verified event may replace an older notice without creating stacked banners, while repeated room polls must not restart one old banner. Use one cancellable lifecycle for mount/reading/fade/removal, aligning React visibility and CSS animation to the existing **~2,400ms** notice presentation (a short <= 200ms exit is appropriate), including reduced-motion mode as a static readable notification. Keep DOM/animation state consistent when the viewer navigates rooms or a newer authoritative event takes precedence. No notice should intercept pointer/touch or focus.
4. **No game-state change.** Maintain Dauntless availability and cost, its real turn-end source/target and equipment-discard/damage rules, any resulting Retaliation choice, `CurrentAction` legal actions, response deadlines, `PresentationSnapshot` and private skill/hand/role protections. This task is a **presentation-only** fix. Do not suppress the skill response or its genuine relationship graph merely to remove the large banner.
5. **Separate from visual Inspect design.** The unified compact player inspection §4B.12 is its own accepted design/refinement. A transient effect notice must not open, replace, or block that inspector; simultaneous states need deterministic single-overlay/focus priority and measured collision handling.

**Bounded Coding Agent implementation slice (when explicitly scheduled): `UX2-EFFECT-NOTICE-COMPACT-01`.** The cause above has already been investigated by Planner/Reviewer; the Coding Agent should **implement and validate**, not launch an open-ended research task:

- In `app/page.tsx`, replace the effect-only reuse of `.turn-notice` with a dedicated, semantically appropriate `effect-notice` banner element; keep `TURN BEGINS` and unrelated notices unchanged. Preserve the server-public message fallback, introduce event-ID keyed notice state and one reliably cleaned-up timer/effect boundary.
- In `app/globals.css` or `app/sequence-overrides.css`, add one scoped `.effect-notice` visual treatment and mobile-safe anchor, independent of `.turn-notice b`/large `turnPulse`. Do not create conflicting specificity across both stylesheets or hard-code one device's full-screen coordinates. Align entrance/exit with the notice's actual state lifetime and respect reduced motion.
- Using a **real server-backed** four-player setup, validate the exact sequence **Yue Jin Dauntless turn-end event → legitimate equipment/damage resolution → Sima Yi Retaliation offered when applicable**. Assert the actual `effectNotice` message identity and `CurrentAction` independently, and prove notice + Local Dock decision can coexist without text/panel overlap. Also verify cases with *no damage/Retaliation*, a second distinct effect notice, repeated polling, timer expiry and switching viewing session/room.
- Capture **390×844**, approximately **440px iPhone 17 Pro Max CSS portrait**, **480×900** and one wide viewport, with bounding rectangles/screenshot evidence: no overlap with opponent Seats, current relation graph/cards/labels, timer/System Menu, Local Guidance, local Hand, Confirm/Skip; no page horizontal overflow or accidental click capture. Test readable wrapped notice text and reduced motion. Keep existing Stage A and Stage B graphical behavior unchanged.
- Report changed files, the root-cause fix, real-game screenshots and measured layout/timing, focused tests, exact commit SHA and required <=6-minute CI gate (§6.30). **STOP for independent user/reviewer acceptance.** Do not alter `HANDOVER.md`, game rules, §4B.12, Duel, Negation or AOE while executing this bounded item unless explicitly instructed.


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



### 4B.12 Unified compact target inspection — approved phone layout (2026-10-12; latest §4B decision)

**Status: user-approved visual direction, pending implementation and on-device acceptance.** This supersedes conflicting earlier §4B wording about separate small PREVIEW, separately overlaid INSPECT, a mandatory `Explain Hero` action, or an automatic large modal. It does **not** change §4C's interactive Hand/Equipment/Judgment *card-selection* modal or any server-owned target legality.

**The one-window decision:** During local target selection, **do not** render a small `PREVIEW TARGET` Hero Focus and subsequently stack a second public `INSPECT` window when the user taps another player. Reuse **one compact player-public-information inspector**, powered by the existing public INSPECT data (including Equipment/Judgment/Hand count) and the selected player ID. Tapping a different legal target updates that **same** panel's content; tapping a player information affordance opens the **same** panel for read-only inspection, without implicitly changing the selected target or committing an action. Keep a single active player info surface, not parallel `PREVIEW` / `INSPECT` / `View Details` surfaces.

**Actual iPhone 17 Pro Max visual target:** The accepted concept is a **compact, black-and-gold floating information panel** in the *upper/middle of the available battlefield*, below the fixed opponent Seats and above Local Guidance/Dock. Do not spread it across the full battleground or turn it into a full-height sheet. Prefer approximately **88–94% of the usable horizontal safe region** (never wider than the viewport safe region), with **content-driven height** and a practical cap of about **40–50% of the usable battlefield height**; use **scrolling inside the panel's detail area** when extra public cards or an expanded skill would otherwise push it over the cap. These numbers are **fit targets**, subordinate to measured collision-free Seat/Dock/Guidance/System Menu boundaries and 390×844 / ~440px phone layouts. Keep enough uncovered battlefield to maintain player seat context. The generated concept images are visual composition references, **not** game-state fixtures: use actual server-public player, hero, card identities, rules and art in production.

**Default information hierarchy (at a glance):**
- One header with the player's name and a clear **× Close** control; beneath/alongside it, a recognisable Hero portrait, Hero name, HP (e.g. 2/4), and public Hand **count only**. Faction/role is optional **only when public to this viewer**. Never show a hidden role based on player/hero labels or game inference.
- **Public Skills** as legible named chips (e.g. `Militia`) directly within this **same** panel. **Tap/click a skill name to expand/show its canonical description within the panel**, anchored immediately beside/below the selected chip, or in a bounded inside-panel disclosure. A subsequent tap on the same chip collapses it; choosing another skill replaces the explanation. Long descriptions wrap, scroll internally as required, and cannot cover/disable Local Guidance, Hand or Confirm. The details are **informational only**; do not invoke a Hero skill or modify CurrentAction when reading its description.
- **Equipment:** visible cards for actually filled Weapon/Armour/+1 Horse/−1 Horse slots, using readable small CardFaces/art and names. Missing slots may be compact placeholders or omitted when necessary; never fabricate equipment. Allow tight wrapping or contained horizontal scrolling if four slots plus card names would overflow.
- **Judgment Zone:** actual public delayed-stratagem cards if present; otherwise one compact `None` label (no large empty slots).
- Do not duplicate a `Hand` section with invented backs when the public Hand count is already unambiguous in the header; if backs are used decoratively, number and identity must remain privacy-safe.

**No `View Details` button, no automatic second-level screen.** The user explicitly rejected that step. Skill descriptions are reached solely by tapping skill names in the same compact panel. An existing CardFace explanation may open via a card's established info affordance where needed, but must respect one-at-a-time modal precedence rather than layering a second inspector behind the first.

**Target-selection and gameplay continuity:** Once the player picks a legal opponent target, reveal/update the unified inspector without obstructing their other opponents, selected Attack hand card, or bottom **Cancel/Confirm/End** controls. The selection remains valid if the inspector is closed. Changing inspection subject must **not** silently change the chosen gameplay target; an explicit legal Seat selection does. The inspector never sends gameplay requests, enables illegal buttons, cancels a selected target on close, or pretends a local unsubmitted choice is a server-proven public action. Preserve the existing `submittedTargetPreview`/presentation-readiness and no-private-leak boundaries when removing duplicate local presentation ownership. Ensure the normal public Attack graph takes precedence once authoritative confirmation advances the interaction.

**Implementation guidance (bounded):** In `app/page.tsx`, the current `LocalTargetPreviewPresentation` only contains name, Hero and HP, whereas `LocalOpponentInspectionPresentation` already provides `handCount`, `equipmentCards` and `judgementCards`. Unify the local **public-info** model and render one inspector; avoid reusing the read-only inspector as §4C's game-action card picker. Remove the competing `HeroFocus` PREVIEW composition and the extra nested `opponent-inspection-layer`/legacy Stage positioning **as active simultaneous alternatives**. Use a single scoped layout and stacking context rather than inherited `.hero-focus` / `.interaction-stage` top-row/side-column grid rules that caused the screenshot overlap. Keep its panel position determined by measured battlefield safety rather than hard-coded entire-viewport coordinates.

**Acceptance on real production-path browser:** In an iPhone 17 Pro Max-like ~440px CSS-wide viewport (plus 390×844, 480×900, and a wide screen), select an opponent with **two public Equipment cards**, one public skill, HP 2/4, Hand 1 and an empty Judgment Zone; verify all true public values are visible in **one compact panel**, bottom decision/Hand remains operable, and **zero overlapping panels**, clipping, page horizontal overflow or shifted Seats/Dock. Tap the skill name: canonical description appears, stays legible, tap again collapses; no skill is activated. Switch inspection between two opponents; one panel updates and selected gameplay target changes **only** on the separate explicit legal selection. Close/reopen preserves legal target and Confirm/Cancel authority. Check equipment-rich, long-skill-description, hidden-role, empty-zone, 4/6/8-seat and iOS Safari touch/focus cases. Provide genuine server-backed before/after phone screenshots; automated geometry tests assert one inspector instance and zero Guidance/Dock intersection. **STOP for user visual acceptance**; Stage B Duel/Negation stays a separate roadmap gate.



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

## 4D. Production-path completion gate — historical pre-Section-6 checkpoint

### 4D.1 Purpose and closure scope

The original §4D gate was created after fixture-only rendering failed to reproduce the real Steal target-card modal and Zhuge Liang Stargazing experience. Its **permanent rule** is still valid: an API assertion or handcrafted browser fixture alone does not prove that the server-generated game state reaches the intended player-facing UI.

The five original P1–P5 task instructions here are **retired as active work**. The historical implementation/test record is in `docs/AUTONOMOUS_UI_ROADMAP.md`, including the milestone `UX2.REFINEMENT-PRE-SECTION-6-GATE-REVALIDATION-01`. That revalidation recorded the §4D prerequisites as closed **for starting Section 6**, after P1–P5, §4.10, §4C.29, §4A and §4B evidence was gathered. It does not establish device-level visual acceptance and should not be turned into a new prerequisite backlog.

### 4D.2 What remains required of any affected UX

| Historical gate | Durable acceptance invariant (not a new task) | Evidence location |
| --- | --- | --- |
| P1 — real room | Production page can be reached through real server-created game state, without fabricated CurrentAction/PresentationSnapshot | Roadmap: `UX2.REFINE-REAL-SERVER-TO-BROWSER-PROOF-P1-01` |
| P2 — selectable target cards | Steal, Burning Bridge (internal Dismantle), Retaliation, Frost Sword and Kirin Bow use the unified §4C UI when real legal options are supplied; anonymous Hand remains concealed; no unrelated legacy picker | Roadmap: `UX2.REFINE-UNIFIED-TARGET-CARD-MODAL-REAL-GAME-P2-01` |
| P3 — Hero Skills | All implemented actionable Hero providers remain reachable through the Skills band with server-projected options, exact submission, and no Action Row duplicate; absent authority is unavailable | Roadmap: `UX2.REFINE-HERO-SKILLS-REAL-GAME-REACHABILITY-P3-01` and later roster audit |
| P4 — interaction parity | Real-game single-target Negation, Raining Arrows responses and compact privacy-safe Opponent Inspect match §§2–3 and §4B | Roadmap: `UX2.REFINE-REAL-PRODUCTION-PATH-PARITY-P4-01` |
| P5 — phone Seat geometry | No unexplained ~55px unused band above opponent Seats at 390/480px; physical anchors, top controls and Stage safe region remain aligned | Roadmap: `UX2.REFINE-MOBILE-TOP-DEAD-SPACE-P5-01` and pre-§6 gate revalidation |

Additional prerequisite evidence is recorded for §4.10 Stargazing, §4C.29 mixed-zone picker, §4A Private Draw/Harvest timers and §4B compact Inspect. **Do not reassign any of these historical P tasks solely because their former instructions appeared in an older revision.** A concrete regression may justify a newly scoped repair; user visual certification remains separate.

### 4D.3 Evidence vocabulary (still normative)

Every relevant completion claim must distinguish **Rules/API proven**, **Server projection proven**, **Fixture browser proven**, **Real server-backed browser path proven**, **Deployed-game screenshot/reviewer proof** and **User visually accepted**. A clean build, passing fixture, green CI or roadmap closure is not a substitute for any later layer. For ongoing Section 6 changes, perform only targeted regressions to §4D contracts when those paths are affected; do not repeat the whole pre-Section-6 gate by default.

## 5. Historical Interaction-Stage deferral — gate cleared, constraints retained

### 5.1 Original sequencing decision

Before the §4D gate closed, work on central Hero/player visualization, physical-seat graph connectors and the new Interaction Stage was deliberately deferred so that incomplete real-game control routing and unstable Seat geometry would not be concealed by a new overlay. This was a **temporary implementation-order constraint**, not a permanent ban on Section 6.

### 5.2 Current interpretation

The roadmap's `UX2.REFINEMENT-PRE-SECTION-6-GATE-REVALIDATION-01` records the relevant prerequisites as implementation/test-closed for proceeding to §6. Section 6 has subsequently received real implementation evidence. **Do not send the Agent back to §§1–4D or restart §6 Phase A merely to re-satisfy the obsolete deferral.** Reopen a prior area only for a new user decision, a concrete reproduced regression, or a specifically requested targeted review.

### 5.3 Architecture boundaries carried into Section 6

The local viewer's Hero stays in the Local Dock and is not duplicated in the public central Stage. Opponent physical Seats remain fixed; all source, target, response, counter, participant and relationship evidence must come from the typed server/public projection, not from timeline order, private legal options, HP deltas or inferred geometry. Keep local controls/Inspect separate from public presentation and fail closed when proof or safe geometry is missing. These invariants are detailed in §§6.2–6.24 and remain mandatory.

### 5.4 Acceptance boundary

Closed implementation sequencing does **not** constitute Reviewer/device acceptance of the player-facing graph, the final AOE/multi-target visuals, or new refinements in §§6.27–6.32. Each newly changed visible behavior still requires focused proof and the user's review.

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
- hold the complete terminal graph for the four-second read window in §0.1;
- then retire it without leaving stale nodes or lines.

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

Place the root action card within the usable central battlefield. Balance the complete cards-and-connectors composition first; use only a modest viewer-relative bias toward the proven source/responder, as described in §§6.34/6.38. The source tether—not card proximity—establishes authorship.

For an ordinary single-target action:

~~~text
[Source Seat/Dock] ── pale-green, no arrow ── [ROOT CARD] ── vivid-red arrow ──▶ [Target Seat/Dock]
~~~

Placement goals:

- the source tether visibly reaches the real source Seat/Dock anchor;
- keep the card far enough from every Seat that it does not cover Hero information or controls;
- keep the card inside the usable battle field, not inside a player Seat;
- keep its position and scale stable for the same unresolved root interaction;
- avoid measured obstructions, including active controls and system UI;
- do not cover the response timer, System Menu, Guidance or Local Dock controls.

Route each relationship using straight horizontal/vertical segments with the fewest collision-free rounded 90-degree elbows. Do not use diagonal or Bézier/decorative curves. If a direct route is blocked, choose another legible orthogonal route around the measured obstruction.

Keep the root-card position stable when:

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
   - show the complete authoritative final-result state for four seconds from its first fully rendered frame, per §0.1;
   - examples: target arrow breaks, Dodge shield/interrupt resolves, damage feedback occurs, root relation reactivates after counter-Negation.

5. **Exit**
   - temporary cards and lines fade;
   - physical player Seats/Dock remain unchanged;
   - durable history remains available through the existing log/history system rather than leaving stale battle objects on the table.

Reduced-motion mode removes or simplifies motion while preserving the same four-second final-result readability and all semantic markers.

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
- connectors remain orthogonal; on narrow layouts use fewer/shorter straight segments, compact cards and clear rounded elbows rather than curves;
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
   - keep the final proven composition readable for four seconds under §0.1, then retire it.

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
### 6.27 Attack / Dodge: shared semantic rules (visual geometry is superseded by §6.38)

This section retains only Attack/Dodge semantics compatible with §0.1. For current card scale, placement, routing, colors and settlement, §0.1 and the user-confirmed Stage A baseline in §6.38 are authoritative. Conflicting geometry and timing from earlier drafts is superseded.

**Visual grammar over gameplay prose:** The graph should explain action, author, direction, and interception through real card artwork, distinct connectors, and strong target emphasis. Do not add user-visible explanatory prose such as "PLAYED BY", "FROM PLAYER", "DODGE AVAILABLE", or lengthy instructions. Demote generic "ROOT ACTION" and textual "BLOCKED" labels when their meaning is visible through the graph; retain concise accessible screen-reader semantics without private information.

**Source:** Green means which physical player played a public card. Use a clearly visible, relatively narrow ribbon/tube-like connector, not a fine hairline. No arrowhead; shape must distinguish source from target even without colour. A publicly played Dodge also has a green source tether from its actual player.

**Attack target:** Red means the incoming attack direction. Increase connector thickness, contrast, and arrowhead size significantly, so direction is unmistakable at phone scale. It is valid for the red arrow to terminate at the **top edge of the local player's whole Dock**, not necessarily at their portrait; an opponent's existing Seat is also a valid endpoint. While the Attack remains an active, unblocked target relation, the **entire attacked player Seat or Local Dock** must receive a clearly noticeable but controlled highlight/glow, not merely the portrait. After a proven Dodge, follow §6.38: no full-strength hit arrow or danger-signalling target glow remains. Do not shift panels or obstruct controls.

**Dodge interception:** When authoritative public Dodge succeeds, its **real card stands directly on or adjacent to the incoming Attack-to-target line, visibly intercepting it**. The red incoming line should terminate/break at the block; beyond it, the Attack path is absent or strongly subdued, with a clear block/bar/cross if necessary. Keep the green tether from the actual Dodge player to that card, but do not create a confusing separate three-sided/triangular causal diagram, a Dodge-to-self target arrow, or a second text-based explanation. What is blocked is **Attack**, never Dodge; do not label Dodge "BLOCKED". The source path must not obscure the block relationship.

**Cards and space (superseded size policy):** Keep the genuine hand-card face/artwork family, but apply §6.34's **hand-size-or-smaller** shared public battle-card scale and centred, balanced composition. The former 'as large as practical' central-card preference is no longer normative. Preserve root stability, legible connectors, fixed Seats/Dock, timer/menu/Guidance clearance, Deck/Discard, and overflow safety.

**Controls:** Keep the previously unified primary action button **CONFIRM**, including an ordinary Dodge response; never rename it "PLAY DODGE" or another per-card command. Preserve only already-approved semantic exceptions such as **TAKE DAMAGE**. Do not expand response Guidance with explanatory paragraphs. Available providers remain exclusively server-authorized through CurrentAction.

**Accepted baseline:** Ordinary Attack/Dodge layout and visual acceptance are recorded in §6.38. For new or changed graph behavior, use §0.1's production-path evidence standard; do not reopen this old approval checklist as a task.

#### 6.27.1 Card scale, placement and connectors — superseded detail removed

Use the shared public CardFace size ceiling and measured fit rules in §§0.1 and 6.34, and the user-confirmed ordinary Attack/Dodge composition in §6.38. The former oversized card dimensions, source-to-target percentage placement, fixed edge offsets, old connector colors and old target-ring measurements are retired. Keep the real target Seat/Dock unobstructed and use its actual facing edge as the proven relation endpoint.

#### 6.27.2 Attack/Dodge meaning

An unsubmitted Dodge is private and does not enter the graph. After a matching Dodge is publicly committed and proven, retain the Attack root and show the red effect relation intercepted at the Dodge; do not show a full-strength hit arrow continuing to the target or imply that Dodge itself was blocked. Render the defender's pale-green, arrowless authorship tether only from proven response ownership. §6.38 defines the accepted placement and routing for the ordinary Attack/Dodge states.

#### 6.27.3 Rendered-card identity

Use the **same CardFace/game-card artwork and border/iconography family** as the hand for Attack and Dodge; scale by container dimensions without stretching or replacing art with a text box. Show short intrinsic card name/rank/suit if that is part of the real in-game card face, but **do not add second layers of explanatory titles** such as \`ROOT ACTION\`, \`FROM <player>\`, \`PLAYED BY\`, \`BLOCKED DODGE\`, \`AVAILABLE\`, or instructions to the player. Card art should remain the largest visual element; any readability treatment must follow existing card-face language.

#### 6.27.4 Reliability and evidence

When a graph is absent or changes unexpectedly, identify the first failing boundary: authoritative public proof, viewer projection, client proof selection, measured layout, or actual visible CardFace/SVG. Keep these states distinct and fail closed when proof or safe geometry is unavailable. Apply §0.1's production-path evidence standard; a mounted node, readiness flag, fixture, CI result or deployment alone does not prove the player saw the intended graph. This is a standing quality rule, not a claim that every historical report is resolved and not an implementation task. Current work/status belongs in \`HANDOVER.md\`.

### 6.28 Production-path evidence for relationship graphs

This section complements §0.1's universal evidence and lifecycle rules. It is design guidance, not an implementation checklist or task queue. Public causality, privacy, fixed physical Seat/Local Dock geometry and server gameplay timing remain unchanged.

#### 6.28.1 Production-path proof and visibility

A public Attack graph must appear as soon as its exact public root is established and remain visible throughout the unresolved response, including private selection and any authorized pre-response trigger. A privately selected/unsubmitted Dodge neither becomes a public node nor suppresses the graph.

When diagnosing a missing graph, distinguish absent/rejected server proof, viewer projection, measuring/unavailable geometry, event handoff, and a present-but-hidden SVG/CardFace. Use privacy-safe identifiers and actual DOM/SVG geometry; never infer causality from a legacy miniature, event order or local selection. Fail closed when proof is absent. §0.1 defines the shared production evidence and visual acceptance standard.

#### 6.28.2 Lifecycle reference

Use the single lifecycle in §0.1/§6.35 for every graph family. Do not define family-specific graph-retention durations or display a graph countdown. A mounted DOM node is not proof of visible geometry.

#### 6.28.3 Keep evidence boundaries separate

Report the first failing evidence layer and preserve negative fail-closed cases. A server proof, rendered component, passing CI, deployment, or successful screenshot is not a substitute for the other layers or for human visual acceptance.

### 6.29 Shared relationship-graph patterns for card families

This section records compatible family-specific semantics and layout patterns. It is design guidance, not a task queue. §0.1 controls shared authority, routing, colors, card scale, lifecycle and acceptance; §6.38 is the accepted ordinary Attack/Dodge baseline.

**One visual language:** A public card should visually belong to the **physical player who played it**; a connector shows **what that card does**. Players understand the graph through authentic card faces, clear arrow direction, physical obstruction, and active/expired emphasis—not explanatory prose. Use the same physical Seat/Local Dock anchors throughout. The server owns public card identities, exact targets, ordered participant states, causal response links, and settlement; the viewer's CurrentAction alone owns private legality. If proof or geometry is inadequate, fail closed and log an exact, test-only reason rather than fabricating relations.

#### 6.29.1 Attack → Dodge

An unsubmitted Dodge remains private and does not enter or suppress the graph. Keep the proven Attack root visible throughout its unresolved interaction. The production-path visibility and evidence rules are summarized in §6.28.1 and §0.1.

After a publicly committed, matching Dodge is proven, show the authentic response intercepting the effect while retaining the same root identity. Use §6.38 for the accepted layout; use §0.1 for lifecycle and shared visual grammar.

#### 6.29.2 Group/AOE cards: source ownership with shared central battle-field placement

**Revised ownership and placement decision (2026-10-10):** §6.34 supersedes the former source-foreground **physical proximity requirement** in this subsection. The original source Seat/Dock still owns the root for the full interaction, but the card should normally sit in the **shared central battle field**, moderately biased toward that source, not immediately below/above/along the source Seat. Do not optimize only for a short green tether or move toward a current target; the **whole visible graph** must remain centred and balanced after each response.

- Use measured open table geometry *after excluding* physical Seats/Dock, Deck/Discard, System Menu, timers, Guidance and other active cards. Rank collision-free candidates by central composition balance first, a modest source-direction preference second, and readable connector routing. Top/side/bottom source positions should yield comparably central public graph compositions without preferential crowding around one player's UI.
- One root CardFace stays at its proven-authoritative event location through ordered AOE participant progress and Negation handoffs (top-left drift <=1 CSS px with unchanged anchors/viewport). Show per-target public branches/status without re-anchoring the root at the current participant or a target centroid. Existing `layoutGroupRootAction()` source-to-centroid fraction search is a **code path to inspect/refine**, not a reason to implement a new parallel root renderer.
- Use §6.34's shared hand-size-or-smaller physical card tiers, not the old 108×162+ public-card sizes. Preserve a 12px safe-table inset and measured clearance from panels/controls as useful initial guardrails; never move Seats/Dock or invent public causality to force a centred layout. If no safe centre-biased layout exists, record the measured exact obstruction and fail closed.

#### 6.29.3 Group/AOE public target responses: show the played card in the shared battlefield

**Observed failure:** A Barbarian Invasion participant can publicly answer with **Attack** (or a Raining Arrows participant with **Dodge**) yet the AOE graph shows only that the branch was satisfied/blocked, **without the actual response card and its visible causal connection**. A tiny independent numbered card from the old table sequence is not an acceptable substitute.

**Public-proof requirement:** The group participant's **committed physical response card**, its **semantic played-as response** (where valid), **responding player ID**, **specific AOE root/active group frame**, **exact group target branch ID**, **response event/resolution identity**, and **public avoided/damaged/negated outcome** must be linked by **server-projected, viewer-equal typed proof** and independently validated by snapshot/client adapters before rendering. Group Negation already has scoped counter proof; do **not** misrepresent an ordinary Barbarian **Attack response** or Raining **Dodge response** as a Negation, nor reuse private hand or a timeline-adjacency guess as evidence. If ordinary group Attack/Dodge response proof is missing, add a bounded public projection before building visual lines. Do not expose a privately selected response until the server has committed it.

**Revised placement rule (§6.34):** Once exact public response proof exists, display the authentic physical response card **inside the balanced shared central battle field**, mildly biased toward its actual responding player; the green arrowless tether establishes ownership. Do not place it immediately adjacent to that player's Seat/Dock solely to shorten the tether. This replaces the older fixed Seat-edge offsets and oversize portrait-card targets while preserving the specific server-proven AOE branch that the card answers.

- All top-row, side-column and Local Dock response providers share **the same centred placement objective**; reflect player ownership by modest directional bias and a real green source tether, not by pinning the response beside a panel. Fit around current/root cards in the central safe field; use the two shared compact size tiers of §6.34.
- Connect the response CardFace only to the **typed, exact target-effect branch** it resolved, preserving a direct intercept where cleanly possible. An adjacent **short explicit contact/intercept segment** is acceptable when balanced placement would otherwise crowd a seat or obscure the graph. Never draw a fake response-to-own-Seat target arrow or make one answer appear to cancel the whole AOE.
- Keep the root, response and relevant target branch in one composition while the authoritative group interaction remains active. A completed participant branch becomes subdued context; compact older branches for density, not because a display timer expired. Do not show private uncommitted selections or infer response provenance from timeline adjacency.

**Timing:** The group root remains until the server-authoritative group interaction is complete. Preserve completed public branches as subdued context while the group continues, compacting only for density. When the entire interaction reaches terminal settlement, use the shared four-second final-result hold in §0.1. Never delay game progression.

#### 6.29.4 Group/AOE participant-progress grammar: completed vs current vs pending

The screenshot's tiny upper target check marks, subtle dashed branches and unchanging target visuals are **not sufficient**. Express branch progress without adding paragraphs or secondary player portraits. Use server-projected **status/outcome**, not guessed HP delta, role, line order, or turn ownership.

| Public state | Branch appearance | Player area and terminal marker |
| --- | --- | --- |
| **CURRENT** response required | **100% opacity**; width **4.5–6px** on 390px; strong existing gold/attack effect emphasis; clear target direction | Entire physical target Seat/Dock receives controlled focus; **18–22px** current/target emblem at end of active branch |
| **PAUSED** by nested public Dying/Negation/choice | **75–90% opacity**, distinguishable segmented/paused effect; maintain real target ownership | Target still identifiable; use distinct pause mark, not a false completed check |
| **RESOLVED: AVOIDED / successful required answer** | Subdued, muted, with no active arrow glow | Visible check/shield mark near branch's target end; retain the committed response as compact public history while the root continues |
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

Use §0.1's current pale-green source and vivid-red effect references (`#a6e0c5` and `#ff4b4b` for ordinary Attack), sized to the measured viewport. The green source line is always arrowless; an active effect relation has a directional endpoint; an intercepted relation has a non-colour block marker. Green means authorship, not effect direction.

All color and stroke values from prior drafts are retired. Keep source links clearly visible but secondary to effect relations, following §0.1 and evidence-based responsive measurements.

#### 6.29.6 Expired causal relationships: old link becomes subdued, current step takes focus

**Updated user decision:** In sequential interactions such as **Duel**, when an earlier exchange finishes and the next publicly committed **Attack** arrives, the previous source/response/target relationship should **not stay highlighted**, but a faint trace can remain so the user understands the chain. This is a **visual lifecycle state**, not a server game-state mutation.

**Semantics:**

- \`CURRENT\`: relation belonging to the newest server-proven active step/effect.
- \`RECENT_EXPIRED\`: immediately previous **public, verified** relation in the **same interaction/root** that is no longer the current focus.
- \`COLLAPSED_HISTORY\`: older verified public steps that no longer fit cleanly; show at most a compact neutral history cue or omit their lines to preserve fit. No new full Hero portraits or stacked orphaned card pile. The active root lifecycle and four-second terminal read are governed only by §0.1.
- A newly played card is not current until its exact public response/event identity has become authoritative. An earlier line becomes expired **only when authoritative public progress supersedes it**, not when a player merely selects a private hand card or a timer animation starts.

**Required styling for an expired relation:**

- body thickness **55–70%** of that relation's active body (e.g. source **3–4px** if active green is 5–6px; active Attack line 7px becomes **~4px**);
- opacity **25–40%** and desaturated **grey-green** for a source tether, **grey-red/warm grey** for an expired attack/target relation;
- no full-bright arrowhead, source/target glow, or whole-player target halo; a weak terminal shape may remain where necessary to show direction, without looking active;
- use a **5–7px dash / 4–6px gap** if helpful to distinguish expired from live, but do not use dash alone as the only signal;
- historical CardFace, if retained, loses glow and may scale to **80–90% of the active node's apparent size** **only when that can be done without moving the root or reflowing already laid-out cards**. Do not scale away rank/suit or remove proof-linked card identity.

**History limit on mobile:** Prefer one current relation plus the immediately preceding subdued relation. Collapse older links before allowing overlap. The root remains stable through the interaction. When the root is terminal, retain the final composition for four seconds per §0.1, then retire it; never resurrect it.

**Duel example:** The Duel root remains the single unchanged authoritative card. After player B publicly commits Attack #1, its green author tether and Duel counter relation are active. When the next player publicly commits Attack #2 and the server proves the exchange advanced, **Attack #2's author tether + response-to-Duel relation become the only brightest pair**; Attack #1's source and response links become **RECENT_EXPIRED** at 25–40% opacity, not a second fully bright active exchange. The previous card/trace is readable enough to show why it continued, then collapses as subsequent exchanges accumulate. Do not infer Duel turns or response ownership from player position or turn seat.

**Negation example:** On counter-Negation, the superseded Negation-to-effect link loses emphasis and the new server-proven Negation-to-previous-Negation relation becomes strongest. Keep exact scope: countering a specific Group target effect does not negate the whole AOE root. Earlier public response cards remain subdued history while the same root is active. A new independent graph takes visual priority without being confused with a continuation.

**Ordered AOE example:** Once player A's publicly answered target branch is resolved, its branch transitions to subdued **completed** styling, while player B's next authorised target branch becomes strongest. Retain A's authentic response as subdued graph history while the same root remains active, as space permits, without covering B's controls. This expresses **completed vs current vs pending** per §6.29.4; do not invent old branches from timeline sequencing.

#### 6.29.7 Interaction-wide compositional and timing rules

- **One authored physical card, one owner:** Do not draw the same card as a large active root and a separate numbered floating duplicate. Hide/suppress the legacy \`TableResolutionSequence\` copy **only once** the server-proven graph actually owns the composition, so a legitimate fail-closed fallback still exists when proof is missing.
- **Spatial hierarchy (latest §6.34):** Root and public response cards favour the **usable shared battle-field centre**, with a modest source/responder bias but no upper/lower/side Seat-edge crowding. Real green tethers establish authorship; red target and direct block/contact relations express effects. Keep already visible root positions and physical Seats/Dock fixed. For Attack/Dodge preserve a visibly terminated incoming red path at Dodge/contact under §6.27.2, including its safe adjacent-contact fallback; never invent a free-floating response triangle.
- **Visual hierarchy:** Strong current target arrow/branch > robust active green source tether > completed/expired relationship > pending relationship. Use only genuine public authored proof for each element.
- **Lifecycle:** Apply §0.1 uniformly: retain an unresolved graph for the interaction's full authoritative lifetime, then show its fully rendered terminal composition for four seconds. A new independent action may take visual priority but must not erase a same-root continuation; no graph countdown or per-family retention duration is shown.
- **Minimal text:** Card artwork carries identity. Do not add visible "PLAYED BY", "ROOT ACTION" where a real face is available, verbose response instructions, or bespoke primary button captions. Preserve **CONFIRM** and already-approved **TAKE DAMAGE** exceptions. Keep accessible, privacy-safe, screen-reader-only semantic descriptions and accessible controls.
- **No inference:** No client-only made-up source/target/counter relation, private card disclosure, guessed group response provenance, stale root reappearance, or a false whole-AOE block. All fallback/visibility decisions must have a reason observable in **test-only** evidence.

#### 6.29.8 Cross-feature evidence and acceptance (no duplicate execution plan)

Each **newly changed** causal-graph behavior must be validated with a real production page backed by server-created/seeded room state. Confirm the **exact typed public** source, target, response, frame and participant scope, viewer equality/privacy, stable root geometry (within 1 CSS px unless measured layout changes), appropriate screenshot legibility, no overlapping Seats/controls, valid reconnect/revision cleanup, and no duplicate numbered legacy card while the proven graph owns composition.

Use the relevant family semantics in §§6.29.2–6.29.6 with the shared production evidence standard in §0.1. Test phone and wide geometry where affected, and distinguish rendered evidence, CI/deployment and human visual acceptance. This section does not choose the next implementation task.

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

**UX release status is independent of CI:** A green fast CI means the chosen technical checks passed. It does **not** mean a card family passed visual acceptance. The user confirmed ordinary Attack/Dodge Stage A on 2026-10-12; other graph families and broader release readiness have separate review boundaries.

**Historic execution note:** The former `UX2-CI-MINIMAL-6MIN-01` assignment text has been removed from this design. The **policy above** is the permanent requirement. The current `.github/workflows/deploy.yml` selects fast tests, API checks, lint, a single browser startup smoke and a dependent deploy; actual <=6:00 end-to-end compliance still requires exact-run measurement. Do **not** restart a CI optimization task or demand another fixed set of three historical runs solely because that task ID once appeared here. Future changes to CI or its performance gate require a fresh, scoped user direction.

### 6.31 User-approved Attack/Dodge mobile graph and trace-menu polish (2026-10-10)

**Scope and evidence:** This section records an earlier menu/CardFace polish decision. It does not define the current graph layout or lifecycle; use §0.1 and the user-confirmed Stage A baseline in §6.38. The menu's compact build identifier and trace-export/privacy behavior remain independent of graph geometry.

**Current layout authority:** Stage A ordinary Attack/Dodge uses the shared compact CardFace and viewer-relative orthogonal composition in §6.38. Do not use the retired large-card, along-the-red-path placement, or per-family timer proposals below as current targets. Shared graph rules in §0.1 also apply to other card families.

#### 6.31.1 Card size and position

- Use §6.34's shared hand-size-or-smaller physical-card tiers (60×90px normal / 54×81px compact as design references), with actual viewport Hand measurements and legibility controlling any fit adjustment. Do not revive the retired 96–108px-wide Attack card or asymmetric larger Attack/Dodge pair.
- Place the complete card-and-connector composition in the measured usable battlefield and balance it around that field. Use §6.38's approved seat-relative left/right mapping and orthogonal path rules; avoid Seats, Dock, menus, Guidance and controls.
- Never reposition an already displayed Attack root simply because Dodge appears; keep same-interaction root location stable **within 1 CSS px** when viewport and anchors are unchanged. For an actual viewport/anchor change, re-fit using authoritative public IDs. Do not duplicate the same public card in the legacy overlay.
- Measure actual card rectangles and recompute arrow geometry **together**. Reducing CSS sizes while leaving old SVG endpoints or cached layout coordinates is not a finished fix.

#### 6.31.2 No hidden red arrowhead or false Attack continuation

- **Before Dodge:** the red Attack arrow must be visibly directional from the authentic Attack card boundary toward the actual target Seat/Dock; neither path endpoint nor arrowhead may sit under a card body or its border.
- **After proven Dodge:** the vivid-red relation ends/intercepts at Dodge and does not continue as a full-strength hit arrow to the target. Make direction and interception visible with a non-colour marker, following §6.38.
- Keep SVG paths and markers visible and correctly layered; do not hide the endpoint beneath a card or draw diagonal/decorative routes.
- Keep Attack and Dodge's **green, arrowless** owner-to-card tethers legible and distinct from red direction, consistent with §6.29.5. Do not obscure controls or shift Seat/Dock DOM. Check actual rendered stroke, marker, SVG clipping and z-order: DOM existence and \`graphReady=true\` do not prove the arrow is visibly legible.

**Visual evidence:** Follow §0.1. The Stage A composition is user-confirmed complete; a new regression requires a fresh bounded task and current server-backed evidence, not rerunning this retired acceptance queue.

#### 6.31.3 Compact System Menu

The existing \`app/page.tsx\` menu contains a long \`stage-system-diagnostics-note\` about automatic recording, privacy exclusions, trace IDs and length limits. **Remove that long visible note**, not the actual safety or diagnostics functionality.

Keep the **GitHub Actions build SHA**, **Download UX trace** button and **Exit Game** button. Keep the build badge, actual JSON export/automatic recording, privacy filtering, trace-size limit, short download success \`role="status"\` feedback, keyboard/focus behavior and Exit Game confirmation. Prefer **no text** under the download button; only a single short unobtrusive hint if truly needed.

**Menu acceptance:** A mobile screenshot shows a compact SHA + two actions with no large explanatory paragraph, excess height or hidden controls. Download and Exit continue to work. Do not change the trace API or data policy to achieve the visual reduction.

#### 6.31.4 Preserved menu boundary

The compact System Menu/build identifier/trace-export behavior is a separate UI concern from graph geometry. Preserve its established privacy and exit-confirmation semantics. This section is a design baseline, not a current task; `HANDOVER.md` controls execution.


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

### 6.33 Refinement ownership and accepted baselines

§6.31's compact System Menu and §6.32's memory investigation are independent of graph design. §6.38 Stage A is user-confirmed complete and is a regression baseline, not an outstanding task. Do not confuse a passing code gate with human UX acceptance.

**Current design sequence (2026-10-12):** The §6.36 Attack/Dodge proof/recovery cases and §6.38 Stage A are closed for their accepted scenarios. Remaining relationship-graph design areas are Duel, Negation and Group/AOE as summarized in §6.37. This sequence is not task authority: the current bounded implementation task comes only from `HANDOVER.md`.


**Implementation evidence boundary:** Source and CI state are time-sensitive; inspect the current branch and HANDOVER before work. The accepted Stage A design is in §6.38. Do not assume a current deployment or reopen earlier proof/menu work without a reproduced regression or direct user instruction.

**Remaining design questions:** For Group/AOE, verify that each displayed response and outcome has exact typed public proof for its root/frame/branch. Keep participant progress distinct by shape and emphasis, and compact old same-root history without losing the active target or causal scope. For Duel and Negation, emphasize only the latest server-proven step while retaining subdued same-root context as space permits. These are design constraints, not statements about current implementation status; inspect `HANDOVER.md` and current code before work.

**Separate engineering diagnostic:** §6.32's process-tree profile exists in the roadmap (`UX2-6.32-PROCESS-TREE-MEMORY-PROFILE-01`). Local ESLint heap OOM may still warrant a current-head investigation if it blocks work; this is not a generic card-UX task and must not weaken the passing six-minute CI gate.


### 6.34 Shared card scale and balanced central composition — accepted Stage A foundation

**Status:** The user confirmed Stage A complete on 2026-10-12. This section records the shared compact-card and balanced-composition foundation for later family-specific design. It does not assign a task; the current execution task, if any, is only the one in `HANDOVER.md`.

**Player-facing purpose:** Resemble physical table play: multiple genuine public CardFaces share one open battle field in the **usable middle of the table**, slightly biased toward their actual authors without piling up beside Seats/Dock or drifting wholly to the top, bottom or one side. The visible **composition as a whole** should feel spatially fair even when both source and responder belong to top-row opponents. Authors are already established by their proven, green, arrowless tethers; physical proximity is a secondary hint, never the sole ownership signal.

#### 6.34.1 Shared public CardFace scale, not bigger than Hand

- First **measure actual rendered Hand CardFace dimensions** in 390×844, ~440px iPhone portrait, 480×900 and a wide production-game view; CSS assumptions or screenshot-device pixels are not measurements. Public physical cards must be **no larger than the same viewport's actual visible Hand cards** in either dimension. Preserve authentic CardFace 2:3 art, readable name/rank/suit, stroke separation and accessible semantic text.
- **Accepted Stage A size tiers:** normal public CardFace **60×90 CSS px** and dense compact CardFace **54×81 CSS px**, subject to the same viewport's actual Hand-size ceiling, measured safe fit and legibility. These are design targets, not permission to exceed the Hand or silently overlap controls; report a genuine impossible fit.
- These shared scale tiers apply to physical public **Attack, Dodge, Duel responses, ordinary AOE committed responses, Negation/counter-Negation and the physical root cards** when available. Nonphysical semantic effect nodes, status glyphs and private Hand/target-card pickers are not forced into fake 2:3 CardFaces. Do not make Attack the only card that uses the compact scale; do not stretch art or create an oversized root exception.
- Prefer **two stable, measured size tiers**, chosen for available-space and expected public chain density at initial layout. Avoid per-card arrival causing all existing cards to shrink/reflow repeatedly. During the **same proven interaction** keep the root and already-present public cards at the same size and position where anchors/viewport have not changed. A genuine change in viewport, measured obstacles, or an impossible fit may justify a deliberate one-time reflow, clearly testable and minimally disruptive.
- When public cards multiply, prefer **history compaction over ever-smaller text**. Do not force all previously visible cards to stay as full-size nodes once their required read window has ended.

#### 6.34.2 Centre-first, mildly source-biased and composition-balanced placement

- Determine the **usable public battle field** from the actual table/overlay rectangle *minus measured obstruction and safety zones*: opponent Seats, entire Local Dock, active controls, Guidance, menus, timers, Deck/Discard and other currently presented cards. Use this field's **available centre**, not the entire phone-screen centre nor the player-source/target centroid as the primary objective. Keep existing safe inset/clearance checks; never shift the physical Seats/Dock or cover gameplay controls.
- Score candidates in priority order: **(1) collision-free fit/readable links, (2) centred and balanced complete visible card+relationship composition, (3) modest relative bias toward the specific proven source/responder, (4) short/clean connectors**. Don't improve the source line by dragging a card against a Seat; don't improve the target relation by stacking Attack and Dodge at a screen edge. Balance should be re-evaluated for the *whole current public set*, not independently centring each card.
- For a top-row attacker and local defender, Attack may lie somewhat **above** the battle-field centre and Dodge somewhat **below** it; for reversed roles invert that relative ordering. For two top-row players, still expand into the **shared central field**, with modest horizontal authorship bias rather than clustering both cards at the top. Likewise, left/right source assignments may bias horizontally without shifting the whole group to one extreme.
- **Composition fairness metric for review, not a magic clamp:** measure and report the available-region rectangle, its centre, the union bounds and centre of all full public CardFaces, nearest edge/control distances, and each card-to-author direction. The initial design aim is that the **group's visual centre stays in the middle third-to-middle-half of the usable region when a collision-free fit permits**, rather than having all full-size cards hugging the upper/lower/left/right boundary. If geometry prevents it, document the measured reason instead of faking a passing coordinate.
- The real author tether remains visible, **green, arrowless** and connected to the actual player anchor; the red Attack path points toward the actual target and is stronger. Do not reconstruct authorship from card position, or draw fake actions/targets to achieve symmetry. Use §6.29.5's stroke distinction, §6.31.2's arrowhead/occlusion safety and §6.20's non-colour accessibility.
- **Root stability is paramount:** after an accepted root is shown, adding a committed response must not move or resize it solely to make a prettier layout. With unchanged geometry, preserve its top-left coordinates within **1 CSS px**. Plan enough response space without blocking an otherwise displayable authoritative root just because an optional future response may not fit. New response placement uses remaining central space and a proven direct counter/contact relation.

#### 6.34.3 Interaction families and density budget

| Family | Public composition | History/density rule |
| --- | --- | --- |
| Ordinary Attack awaiting Dodge | One hand-size-or-smaller Attack root, its real author tether, unobstructed red direction and full target emphasis | Selected **private** Dodge must not appear as a public card or displace the root |
| Attack → committed Dodge | Attack stays fixed; Dodge occupies the defender-side half in the viewer-relative composition; vivid-red relation intercepts at Dodge | Preserve the exact public root and response identities; apply the shared §0.1 lifecycle |
| Duel repeated Attack responses | Persistent Duel root plus newest proven response; an immediately previous proven response may remain in subdued context when space/read time allows | Older proven rounds fold into a compact neutral **+N** or similar history cue, not a growing pile; newest public exchange alone is dominant |
| Single-target Negation / counter-Negation | Persistent original Stratagem root with newest one or two typed, public counter cards joined to the **actual countered card/effect** | Compact older proven nodes into a history cue; no false player-target arrows; shared §0.1 lifecycle |
| Group/AOE Raining Arrows, Barbarian Invasion, etc. | One stable group root and exact public participant branches; show genuine committed response CardFaces only where independently **typed public response proof** exists | Response cards share central space; completed branches become subdued; compact older public history while preserving ongoing target/progress context |

**Important implementation boundary:** The current AOE status/outcome projections and group Negation branch proof are already present. The ordinary Group Attack/Dodge response's exact linked physical-card projection is **not established by this new layout request**; if absent, do not generate a public response from private `CurrentAction`, a timeline event or inferred player/card adjacency. Record that separate projection dependency for an independently authorized server task; complete and review the layout work with existing proven public cards first. Reuse existing AOE participant status and Negation history compaction rather than inventing duplicate state machines.

**Interaction lifecycle:** An unresolved root and its proven branches remain for the full authoritative interaction. After terminal settlement, retain the complete final composition for four seconds from its first fully rendered settled frame. Do not show a graph-retention countdown; never delay legal actions or server progression. See §0.1.

#### 6.34.4 Reviewable implementation stages (one bounded slice at a time)

**Updated user-approved implementation brief:** §6.38 is the **newer, explicit Stage A routing/composition decision** (2026-10-11). For ordinary Attack/Dodge only, it overrides older Stage A connector-shape and two-stage red emphasis preferences where they conflict, while leaving server proof, timing, physical ownership, safe fit, root immobility and user-reviewed §6.36 repairs intact. Read §6.38 before implementing or reviewing Stage A.

**Stage A — accepted baseline:** The user confirmed completion on 2026-10-12. Its accepted ordinary Attack-only and Attack→Dodge composition is recorded in §6.38 and must be preserved; do not reopen or rebuild it absent a reproduced regression or direct user request.

**Stage B — long-chain layout reuse (separately reviewable after A).** Apply the same accepted shared CardFace/composition language to already-proven Duel repeated Attacks and Negation/counter-Negation, using existing typed response links and history compaction. Validate source ownership, root stability, current versus subdued context, no overlap/dangling arrows, no infinite shrink and no accumulated card pile. Apply the single lifecycle in §0.1; do not retain family-specific graph durations.

**Stage C — AOE layout adoption (separately reviewable after B).** Apply the shared geometry to existing proven Group/AOE root and participant branches with 4/6/8-player positions, preserving per-target semantics and §6.29.4 outcome markers. Audit which ordinary AOE responses have actual typed public identity; integrate only proven cards. If that proof is missing, stop that subpart and report the exact projector/snapshot/client contract needed for a separate authorized change. No new legality or rule work hidden inside a UI geometry task.

**No duplicate-work rule:** These stages refine existing renderers and projections; they do not authorize rebuilding §6.31 menu work, accepted Attack proof, Dodge settlement, existing Duel/group/Negation foundations, or the §6.32 memory investigation. Stage order is design guidance only. Select exactly one current implementation task from `HANDOVER.md` at a valid planning boundary.

#### 6.34.5 Acceptance and stop conditions

These are family-level quality criteria, not a requirement to rerun every scenario for each change. Follow the single bounded scope selected in `HANDOVER.md` and validate only the affected paths plus relevant regressions.

- Inspect **actual rendered Hand width/height** and public CardFace CSS pixels. All physical public cards <= Hand width and height; no stretched/fake art; rank, suit and card identity recognizable in the screenshots.
- Public cards visibly occupy the **middle usable battle field**, not a strip immediately below top-row Seats or above the local Dock; top/bottom/left/right authorship cases are comparably balanced. Report computed individual/union rectangles and card-to-anchor positions, not only a `layoutReady` flag.
- With stable anchors, the Attack/other root does **not jump or rescale** when a response is committed; Dodge/contact visibly interrupts red Attack and preserves both author tethers. Private selection leaves public layout unchanged.
- Across their respective review boundaries, continuous and multi-step flows should remain legible: real Attack/Dodge, repeated Duel responses, counter-Negation and multi-player AOE; no page-level horizontal overflow, panel obstruction, orphaned graph, duplicate legacy miniature card or all-card shrink on every new step.
- Positive visual assertions require real **server-backed** proof and visible rendered lines/card faces. Fixture-only DOM, an inferred public response, geometry-unavailable fallback, or screenshot-free passing CI does not constitute user UX acceptance. Preserve viewer equality/privacy, stale/reconnect fail-closed behavior and accessibility.
- Keep the §6.30 **<=6-minute** required CI/deployment gate. New long scenario suites stay optional until user approval; use focused, meaningful evidence for each selected slice. A successful commit/CI is distinct from **the user's visual acceptance**.

### 6.35 Semantic lifecycle of a public relationship graph

This section is the single lifecycle reference and implements the normative rule in §0.1:

- **Active:** Keep the same authoritative root and proven graph visible while its interaction is unresolved, regardless of elapsed time, response waits, trigger handoffs, polling or refresh. Same-root progress updates the graph; it does not create a new root. Local preview/selection is not public progress.
- **Terminal:** Once the server proves the interaction is complete, retain the complete final graph for **four seconds from the first fully rendered settled composition**, then retire it. Reduced-motion users receive the same static read interval. Do not show a graph-retention countdown.
- **Supersession:** A new independent authoritative interaction may take focus; it is not a same-root continuation. Never let old state block the new interaction, erase still-active same-root context, or resurrect after expiry. Do not delay turns, deadlines, legal actions or server progression for presentation.
- **Outcome:** Show `TAKE DAMAGE` only with exact public damage-settlement proof, on/near the red effect relation at the actual target side and outside tiny Hero artwork. A declined response alone is not proof of damage.

Use server-owned identity and progress only. This is a product contract, not a diagnosis, code inspection request or task queue.

### 6.36 Accepted Attack/Dodge semantic regression baselines

**Status:** The user accepted the scenarios below as regression baselines. Their detailed trace analysis, completed implementation plans, commit ledger and historical CI evidence belong in the roadmap, not in this design authority. They do not create current work; consult `HANDOVER.md` for that.

- A new ordinary Attack after a completed Negation window has its own authoritative root/frame; completed Negation history cannot replace it.
- A committed, server-proven Attack→Dodge graph can recover for an eligible viewer after refresh/reconnect, while expired, superseded, malformed or private-unsubmitted responses never resurrect or appear publicly.
- Zhao Yun Longdan may use a physical Attack as an effective Dodge only when the server-proven typed conversion binds the exact root, response, actor, card and frame. Preserve the actual Attack CardFace; never fabricate a Dodge.
- All cases continue to obey §0.1: exact public authority, private-information boundaries, stable physical Seats/Dock, semantic lifecycle, orthogonal shared visual language and evidence distinct from CI/deployment or human acceptance.

These accepted cases are regression safeguards, not a claim that every orientation or every graph family is complete. Do not reopen them without a reproduced regression or direct user instruction.


### 6.37 Remaining relationship-graph design scope (not a task queue)

**Product direction:** Complete the shared Standard-card playing experience before new special-Hero-specific UX adjustments. The order below is design sequencing only; it does not create or select implementation tasks. Section 1–4 foundations and the accepted §6.36/§6.38 cases are regression baselines. Only `HANDOVER.md` identifies the current bounded task.

#### 6.37.1 Status and scope

- **User accepted regression cases:** §6.36 ordinary post-Negation Attack/Dodge, eligible Attack/Dodge refresh recovery, and authentic Zhao Yun Attack-as-Dodge proof. These are regression controls, not remaining card tasks.
- **User-confirmed complete:** §6.38 Stage A uses authentic hand-size-or-smaller public CardFaces, balanced viewer-relative placement, stable root geometry and orthogonal routing. Preserve as a regression baseline. This does not imply Stage B/C acceptance.
- **Existing foundations, not new tasks:** shared target-card picker (§4C), local player controls and earlier real-game gate (§4D), basic single-target proof, Duel/Negation/Group projector and layout foundations, group participant progress model. Test only paths relevant to a new change. The separate test-room Hero-choice infrastructure was reported shipped as `9f4b93c`; it is **not an outstanding generic card-UX item**.
- **Out of scope until after generic UX:** individual Hero skills and exceptional response rules, other than preventing regression to already accepted Zhao Yun Longdan. An earlier Lv Bu two-Dodge trace is not by itself authorisation for a Hero-specific repair.

#### 6.37.2 Remaining design areas and acceptance principles

| Design order | References | Design status | Required player-facing principle |
| --- | --- | --- | --- |
| **1 — Stage A: complete** | §§0.1, 6.34, 6.38 | User-confirmed complete | Preserve compact, balanced, viewer-relative ordinary Attack/Dodge composition and exact public root/response semantics. |
| **2 — Duel chains** | §§6.12, 6.29.6, 6.34 Stage B | Further design/review required | Keep one stable Duel root. The newest server-proven response and its exact relation lead; the immediately previous step may remain subdued; compact older history without card piles, false arrows, private disclosure or root movement. |
| **3 — Negation chains** | §§2, 6.13–6.14, 6.29.6, 6.34 Stage B | Further design/review required | Connect each new public Negation to the exact countered card/effect. Keep root identity stable, demote prior same-root relations, and preserve scope without false player-target or whole-AOE claims. Apply §0.1 lifecycle. |
| **4 — Group/AOE** | §§6.9–6.10, 6.29.2–6.29.4, 6.34 Stage C | Further proof/layout review required | Reuse one stable root and exact public per-target branches; distinguish ordered from simultaneous semantics. Show a physical response only with server-proven card, actor, frame, branch and outcome. Distinguish current/paused/resolved/pending/inapplicable states by shape and contrast; never infer outcomes from HP or turn order. |
| **5 — Cross-family review** | §§2–4, 6.7–6.26, 6.30 and this section | Human visual acceptance gate | Use real server-backed flows across representative card families, player counts and mobile/wide sizes. Confirm privacy, stable roots, visible geometry, no overlap/overflow and correct lifecycle. Do not treat CI or fixture-only proof as reviewer acceptance. |

**Design order:** Stage A is complete; review Duel, then Negation, then Group/AOE. Verify Group physical-response proof before displaying its CardFace. Missing proof is a projection gap, never permission to infer or fabricate. This order does not authorize implementation; `HANDOVER.md` remains the sole task source.

#### 6.37.3 Later or conditional items (not current generic-card work)

- **Hero exceptions**: separately plan after generic cards; preserve already accepted Longdan. Special two-Dodge, Hero-converted cards and other skill-only graphs each require concrete proof and user direction.
- **Local ESLint memory:** §6.32 has an existing sampled process-tree RSS profile in the roadmap; local lint heap OOM may still justify a *separate* current-head bounded investigation if it obstructs work. It is not a graph-design acceptance condition, and no lint or CI safety gate may be silently weakened.
- **Historical closed pre-§6 work and test-room tooling:** no new assignment without an independently reproduced defect or explicit user request.

#### 6.37.4 Evidence and ownership

Every selected slice must use actual authoritative public projection and real server-backed browser evidence; compare current code before touching it, make no private-card inference, preserve fixed Seats/Dock and real physical CardFaces, show screenshots plus relevant geometry/proof identifiers, distinguish code/CI completion from **user visual acceptance**, and stop for review after **one** bounded task. Updating this product-design register neither selects work for the Coding Agent nor edits Agent-owned `HANDOVER.md`.


### 6.38 Accepted Stage A baseline — balanced orthogonal Attack / Dodge battlefield

**Status:** The user confirmed Stage A complete on 2026-10-12. This section is the durable visual/regression baseline for later relationship-graph design and implementation. It is not an active task. Do not reopen Stage A without a reproduced regression or direct user instruction; do not infer that Stage B/C are accepted by this confirmation.

**Decision basis:** The user reviewed the live 440px iPhone screenshot and iterated on two concept mockups: (A) **Cao Cao plays Attack against top-left Zhang Liao**, (B) **Zhang Liao commits a physical Dodge**. The user explicitly selected **central composition first**, horizontally/vertically balanced Cards + paths, removed the two visible **Deck/Discard pile blocks** from the battle area, rejected side-origin/meandering green paths and diagonal/sweeping curves, and approved **orthogonal routing with the fewest possible rounded 90-degree bends**. These images were conversation *concepts*, not code screenshots and not permission to replace card artwork, battlefield scenery, turn instructions or game assets. **The explicit rules below control implementation if a generated preview's arrowheads or decorative details disagree.**

#### 6.38.1 Common visual grammar and order of priorities

1. **Authentic public proof and private safety:** Server-authored exact attacker, target, physical Attack, and (when committed) real physical Dodge/skill-valid conversion are authoritative. The existing `PresentationSnapshot`/`PresentationClientView` validation and CurrentAction boundary stay intact. No inferred author, response or target from DOM position, local hand or timeline proximity; uncertain graph fails closed.
2. **Unobstructed and balanced use of space:** Determine the battle-safe region from actual overlay and measured Seats/Dock/Guidance/menu/timer/piles/controls. Optimise the **entire visible card+connector composition** around its usable centre, both **left/right and top/bottom**. Do not place every card or all long lines against one edge merely to shorten one tether. Fit/collision and real semantic identity take priority over mathematical symmetry. Attack may sit a little right of centre *in the approved local-bottom → top-left example*; reverse/rotate relative offset for other real source/target geometries when needed.
3. **Physical CardFaces:** Use the actual current Hand artwork, suit, rank, physical card ID and hand-size-or-smaller 2:3 face from §6.34 (currently normal **60×90 CSS px**, compact **54×81 CSS px**, subject to measured fit). Do not enlarge them or substitute illustrated placeholder cards. Do not change their dimensions unless real measured collision makes the existing approved size impossible.
4. **Routing shape:** Each visible source/target/counter route uses **only straight horizontal and vertical segments** joined by **rounded 90° elbows**. Prefer a straight line, otherwise one elbow, otherwise the fewest collision-free elbows necessary; **no diagonal or decorative Bézier swoops**, excessive detours, or free-floating intermediate target squares. Minimise bends *after* preserving proof, physical anchors and legibility. Use consistent bend radius, stroke and visible non-colour indicators. Preserve §6.29.5 green/red contrast hierarchy. **Green author/source tethers have NO arrowheads** under §6.27/§6.20; red attack/counter endpoints must clearly express direction/interception.
5. **Real edge anchors, not invented player positions:** Use the actual authenticated source's Seat/Dock edge facing the usable battlefield; geometry may select a point along that edge but may never assign authorship. In the approved local-attacker reference case, the Local Dock-top anchor is directly below Attack and its green tether is straight vertical. Other orientations use the real Seat/Dock edge and the shortest legible orthogonal route without crossing controls. Never begin from a viewport edge, unrelated battlefield point, or inferred player position.
6. **Stable state transition:** Once Attack is publicly mounted, its position/scale stays stable (<= **1 CSS px** coordinate change at unchanged viewport/obstacles) when valid Dodge commits, during polling and refresh recovery. Allocate response-side space without hiding an otherwise renderable Attack. Do not duplicate the root CardFace or move physical Seats/Dock.

#### 6.38.2 State A — Attack declared; no public Dodge yet

For the approved reference case, the **bottom local Cao Cao** uses a genuine ordinary `Attack` against **top-left Zhang Liao**:

- Show **exactly one** public Attack CardFace in the middle of the actual available battlefield, **slightly right of the shared centre** to reserve natural response space toward the left. Do not show a public Dodge until a matching response is actually committed and proven. A privately selected but unsubmitted Dodge must never appear.
- **Green source:** One **straight vertical** author tether from the genuine Local Dock-top anchor **directly under Attack** into Attack's lower edge. Do not make a sideways segment for this reference geometry; preserve arrowless green-source semantics.
- **Red target:** From the **Attack card's left outer edge**, travel **horizontally toward the left-hand actual target Seat**, then take **one softly rounded 90° turn vertically upward**, with the arrow terminating at the genuine **Zhang Liao Seat's lower facing edge**. The whole target Seat may glow subtly for the active incoming Attack. **There is NO empty `TARGET` placeholder, copied hero, or target marker box in the battlefield.**
- Do not add a separate red counter line or an imaginary unplayed Dodge. The Attack root and red destination come from one exact authoritative Attack/target proof, not from screen geography.
- For right/top/side/local targets use the same **orthogonal minimum-bend, real Seat/Dock endpoint** principle and mirrored layout, not a hard-coded Zhang Liao coordinate. Where a horizontal-then-vertical path cannot fit the real target/obstacle geometry, choose the minimum-legible orthogonal alternative and record the reason.

#### 6.38.3 State B — the same Attack is publicly blocked by committed Dodge

With that *same public Attack* still at its identical position, Zhang Liao submits a genuine server-proven ordinary Dodge:

- **Attack stays fixed** at the original location. Place authentic Dodge to the **left of Attack**, ideally roughly aligned vertically so the **two CardFaces and their connecting red segment together sit centrally**. Allow only collision-driven compact variations; never relocate Attack to manufacture symmetry.
- Keep **green attacker→Attack source** identical to State A: real Local Dock-top, **straight vertical**, arrowless and visually clear. Add **green defender→Dodge source** from the genuine Zhang Liao Seat-bottom edge, using a vertical/horizontal path with the **fewest rounded 90° elbows**, ending at Dodge's top/appropriate outer edge without crossing the red block line.
- The **single dominant red visible relation** becomes **Attack → Dodge**, ideally one short **horizontal** red segment from Attack's left edge to the right edge of Dodge. It visibly **terminates/is intercepted at Dodge** (with a non-colour block terminal treatment where required). **Do NOT simultaneously render another full-strength red Attack→target-Hero arrow.** The completed target relation remains **in the same authoritative server causal proof and accessibility semantics**; optionally use only a *weak, non-danger-signalling* target/response halo after block. Do not wrongly suggest that Dodge is blocked or that Zhang Liao still faces an unblocked hit.
- **Public semantics versus painted lines:** The user-approved settled view emphasises **three visible connector paths** (attacker-source green, defender-source green, Attack→Dodge red), **not four equally prominent SVG lines**. This deliberately refines earlier §6.11/§6.27/§6.34 and old visual-test expectations for a bright red Attack→Hero line *after* an ordinary successful Dodge. **Do not delete or relax the fourth causal fact** (Attack's true target) from server projections or privacy/fail-closed checks. Preserve identity-based proofs and the accepted §6.36 regression baselines.
- For a Dodge decline, illegal/mismatched/stale response, or no committed public proof, **do not** switch to State B. The real visible Attack target path remains while appropriate, subject to normal game settlement/§6.35 retirement rules.

#### 6.38.4 Deck / Discard display removal — visual only, never gameplay removal

- Remove the **two large visible `DECK` and `DISCARD` card-pile blocks** from the **central battlefield composition** in the approved layout. They must not consume central placement space or push Attack/Dodge up toward the opponent row. Preserve original Standard deck inventory, draw/discard rules, actual discard top, counts, private/public disclosure semantics and history. This is **not** a request to delete any game zone.
- Code inspection before implementation: `app/page.tsx` currently renders `play-center > draw-stack[data-draw-anchor]` and `discard-stack[data-discard-anchor]` and uses these DOM anchors for **draw/discard/reveal animation positioning**. Do not delete anchors or set `display:none` if that breaks movement paths, measurement or reveal timing. Provide semantically correct alternative safe animation anchors or compact non-obstructing presentation; any essential public pile information should remain available through an existing compact UI path. If the cards rely on an irreplaceable interactive pile UI, **report this separate conflict for reviewer decision** before moving unrelated controls.
- No new floating fake discard action or uncontrolled new game rules, no change to discard-card timing, deck order, replay safety or server endpoints. The background artwork may remain as-is; the design mockups' different illustrated background is **not approved asset work**.

#### 6.38.5 Preserved architecture boundaries

Extend the existing server-authored public projection, viewer-side proof validation and shared relationship-graph renderer. Keep physical Seat/Dock DOM fixed; use those real anchors for geometry; layer non-interactive graph visuals without intercepting gameplay controls; preserve authentic physical CardFaces, existing animation/game-zone behavior, privacy, exact root/response identities and accepted Zhao Yun conversion. Check current code paths before implementation; file names and component boundaries may change. Apply §0.1 and do not infer public semantics from presentation state.

These rules define the accepted ordinary Attack/Dodge treatment. They do not by themselves authorize any implementation task or imply acceptance of Duel, Negation, AOE, special-Hero graphs or broader release readiness. The current task is selected only from `HANDOVER.md`.

#### 6.38.6 Accepted scenarios and regression baseline

The following describe the **accepted reference states**, not an automatic test suite for every task. Recheck only the scenario/viewports affected by a reproduced regression or the task selected in `HANDOVER.md`.

**A. Attack-only:** In a genuine four-player server-backed game, local Cao Cao commits Attack against top-left Zhang Liao. The Attack is centred with reserved response space; Local Dock→Attack is a **straight vertical arrowless green** tether; the red target route goes **horizontal first, then vertical** to Zhang Liao's exact Seat without placeholders; target emphasis is legible, with no unplayed Dodge, obstruction or duplicate legacy CardFace.

**B. After an actual Dodge:** The same room/interaction receives a real Zhang Liao Dodge. The graph retains exact authoritative public root/response/frame/physical-card identities and Attack position remains within 1 CSS px; Dodge appears left of Attack; attacker and responder have genuine green authorship paths; the **only full-strength red line is Attack→Dodge**, short/horizontal, with an understandable interception; no simultaneous bright red path to Zhang Liao and no false `Dodge BLOCKED` cue. On ordinary Attack decline, remain truthful to server settlement.

**C. Reference coverage for regression review (not a blanket per-task suite):** When a reported change affects these cases, use real browser evidence at **390×844, ~440px portrait, 480×900 and a relevant wide viewport**. Cover the affected local/top-row orientations and attacker/defender/observer semantics. Measure CardFace/union centre, usable battlefield centre, nearest Seat/Dock/control distances, exact connector endpoints, bend count and marker visibility. Include a legitimate compact/fail-closed case where relevant; never make impossible geometry pass by covering private controls.

**D. Related safeguards:** Preserve refresh/reconnect recovery, no resurrection after a graph expires, private selected-Dodge concealment, target/response privacy, accessible non-colour direction/block semantics, real draw/discard and physical-card animation endpoints, and accepted Zhao Yun conversion. Apply §0.1's semantic lifecycle. CI and deployment are evidence layers, not visual acceptance.

The ordinary Attack-only and committed Attack→Dodge cases above are the accepted Stage A reference. Preserve exact server proof, viewer-relative orthogonal geometry and the measured compact CardFace composition. Any future regression report must distinguish server proof, rendered visibility, geometry, CI/deployment and human review; do not reuse the former Stage A stop gate as an outstanding assignment.

**Ownership:** This document is the current relationship-graph design authority. `HANDOVER.md` remains the Coding Agent-owned source for exactly one current or next bounded implementation task.
