# UX2 Refinement Decisions

This document is the current UX2 product/UI design authority for the refinement phase. It records reviewer-approved expected behavior, interaction presentation, responsive requirements, and measurable acceptance criteria. It is not a task queue.

# UX2 Refinement Decisions

**Current product authority — revised 2026-10-13.** This is a design/acceptance specification, **not** the Coding Agent's task queue. User visual review rejected the relationship-line/graph approach after the real Duel experience. **All former public relationship-graph layout requirements in the previous §0.1 and former §§6.1–6.39 are withdrawn and removed from this current design.** Prior revisions remain accessible only in Git history; they are not alternative implementation specifications. The current no-connector card-display contract in §6 takes precedence over earlier graphics in `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`, historical roadmaps, agent workflow examples and previous screenshots. None of these older documents may be used to resurrect source tethers, target arrows, branch forks, SVG edges or enormous duplicated Reaction Chain presentations.

## 0. Current UX authority, safety and implementation order

**Player-facing goal:** Instead of visualizing the causal relationship as lines, make each **genuinely committed public card** readable in the middle of the battlefield, then **shrink/move it into a short-lived card display in front of its actual owner's Seat or Local Player Dock**. Use compact readable text to explain source, target, response and result. This applies to ordinary Attack/Dodge first, then Duel, Negation, AOE and other public card families. Never move the real Seat/Dock.

**What is cancelled:** All source/player→card green lines, red card→player arrows, Dodge interception lines, per-target branches, card-to-card counter edges, historic dimmed paths, elbow/90° geometry, line widths and graph-only root/card positioning metrics. No client or Agent should implement or preserve them as an active UX requirement. Earlier B1 Duel diagram and Stage A routing acceptance are explicitly withdrawn **for visual presentation**, not for correct server gameplay.

**What remains mandatory:** The engine and server own all legal actions and outcomes. `CurrentAction` alone controls each viewer's legal buttons/private options. Typed, verified public event/card/actor/target information controls what may be shown to all players. No private card identity is revealed before authoritative commitment, no implied response based on HP/time or hand selection, no source inferred from seat geometry, no invented player/avatar, no altered match rules, no automatic switch into another real human player's account, and no resurrecting already retired events. Keep real opponent Seats and Local Dock fixed, preserve target-picker/Inspect/Skill controls, system timers, responsive safe regions and accessibility.

**Work sequencing:** The rejected Duel B1 graph task is **not approved** and must not proceed to B2 or Stage C. First remove the obsolete visible connector graph and competing legacy combat-panel ownership (§6.10, Phase R). Once accepted, implement central public reveal → owner-side thumbnail transition (§6.10, Phase P). Do not combine both migrations into a large unreviewable coding change. **The Planner must not edit `HANDOVER.md`; only the Coding Agent owns its execution handoff.** Section §7 preserves independent CI, diagnostics and compact menu rules.

### 0.1 One public-card presentation grammar (no connectors)

- **Reveal:** Each newly server-confirmed public card appears as one authentic Hand-size CardFace in the centre of the available battlefield, with a concise true public actor/action/target message.
- **Owner-side parking:** After a short readable beat it shrinks into a **medium public thumbnail** adjacent to the true author’s *real* Seat/Dock edge facing the battle area: under an opponent's top-row portrait, above the local player's Dock, or on the inward side of side-column Seats. All perspectives independently place it in front of the same real player, never in an invented centre avatar.
- **Decision:** The viewer's actual Local Dock/Guidance responds with the correct server-owned legal actions. Pending Attack on that viewer adds a restrained **red border/highlight around the existing response area**, a clear short actor→victim sentence and the existing response timer. Highlight alone is never the only cue. No uncommitted Dodge is shown.
- **Response:** A genuine publicly committed Dodge/Attack-as-Dodge/Negation/etc. is revealed centre-first by the same rules, then parks at its own responding player's seat. The original root thumbnail remains context while the same interaction is unresolved; newest public response has the strongest visual emphasis.
- **Outcome:** Show proven BLOCKED, TAKE DAMAGE or other actual settlement on the **affected true player’s Seat/Dock area**, briefly legible to other viewers. Do not infer damage from Skip or decreased HP alone. Display controls remain nonblocking; a newer independent authoritative action supersedes old display.
- **No relationship SVG, green/red strokes, arrows, card chains or 'source/effect/target' field diagrams.** Explicit actor/target text and per-player placement replace them.
- **Evidence:** Real server-backed phone screenshots and exact public IDs, room/viewer identity, real visible card layout and accessible result are required; fixture-only or green CI is not human visual acceptance.

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

## 2. Single-target Negation — compact card reveal and decision UX (revised 2026-10-13)

### 2.1 Open response opportunity

Show the **already publicly committed original Stratagem card** as the source player's seat-front thumbnail after its centre reveal (§6). Show one compact public description, e.g. “Cao Cao used Duel on Zhang Liao.” The Local Dock of an eligible actual responder says **“Play Negation or Skip.”** No private responder is publicly named or shown before committing. There is **no** large `NEGATION RESPONSE`, `EFFECT`, `REACTION CHAIN`, `ORIGINAL EFFECT` or dedicated oversized centre Hero/target panel. An open opportunity is not a played Negation.

### 2.2 Actual Negation and counter-Negation

Only when the server confirms a real public Negation event: reveal the authentic Negation CardFace at the centre, then park a medium thumbnail at **the actor's own Seat/Dock**. Keep the original effect card visible at its original author's seat as contextual public history. Each later counter-Negation follows the same centre reveal → correct actor seat thumbnail sequence; the newest proven public card gets the primary glow, older public cards become visually subdued **without connection strokes**. If many responses exist, limit visible seat thumbnails and provide a small accessible count; do not stack unreadable cards or draw any relation diagram. A short public status such as “X played Negation” and “Effect negated/restored” must derive from typed, verified public resolution facts, not turn sequence or client parity guessing.

### 2.3 Resolution, controls and privacy

Continue/cancel the original effect only as authorized by the server; announce the settled result via a compact nonblocking banner. Local Guidance stays the single owner of the actual response command, with authentic `CurrentAction` legality and deadline. Do not expose private hand identities, possible respondents, pending card choices or unconfirmed outcomes. Use the canonical public proof and exact card/actor IDs to fail closed on ambiguous events. Keep existing target card pickers, reaction options and responder scanning untouched.

### 2.4 Responsive acceptance

At 390×844, approximately 440px phone width, 480×900 and wide viewport, an open Negation shows **zero unplayed Negation cards, zero relationship-line SVGs, zero giant Reaction Chain boxes** and one correct private instruction; a committed Negation briefly appears centre-first and then at its actor's seat. Long legitimate chains remain readable through last-public-card focus plus compact history count, without page overflow, Seat/Dock collision, duplicate card faces or leakage. Test real Negation/counter-Negation/decline/settlement states.

## 3. Group / AOE Response Refinement — Non-Hero Controls Only

### 3.1 Current Group/AOE presentation boundary (revised 2026-10-13)

Keep fixed real Hero Seats/Local Dock and the authorized group-response controls. All obsolete central duplicated Hero portraits, source/target line diagrams and per-participant connectors are retired by §0.1 / §6. Public AOE/group cards use the same centre reveal and source-side thumbnail, followed by **each proven responder's own seat-front public response thumbnail**. Ordered/pending/completed status is conveyed by small verified labels and Local Guidance, **not** connecting paths. No additional group gameplay logic or special-Hero control rewrite is authorized by this visual change.

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

**Design status:** User-reported production mobile screenshot defect; **this UX remedy is specified for a separate, bounded implementation/review**, not evidence of implementation or an automatic change to the Coding Agent's current HANDOVER task. This extends §4A's compact transient-display principles and leaves §0.1's server-authoritative public-card and CurrentAction boundaries and current legal actions intact.

**Observed screenshot:** On an iPhone-sized game, a large centred `EFFECT TRIGGERED / Test Player 2 ... with Dauntless` banner overlays the battlefield and competes with the simultaneously visible `Use Retaliation, or skip` decision for Sima Yi. The screenshot alone does **not** prove the underlying individual timeline events or their exact ordering. The documented Standard implementation makes one plausible chain: Yue Jin's **Dauntless** can trigger at another player's turn end; its Equipment-discard-or-damage settlement may cause a Sima Yi **Retaliation** post-damage decision. These are separate authoritative gameplay events and must not be conflated or changed to fix a visual notice.

**Code-confirmed UI root cause on inspected `ux-v2` source (2026-10-12):**

- `app/page.tsx` scans fresh authoritative timeline messages for `event.type === "message" && event.effectNotice`, copies the message text to local `effectNotice` state (around line 2961), and renders `<div className="turn-notice effect-notice" role="status"> ... </div>` (around line 5374).
- `app/globals.css` uses `.turn-notice` for a large **centred turn-start overlay**, with `left/top: 50%`, `translate: -50% -50%`, `padding: 20px 42px`, and `.turn-notice b { font-size:25px }`. Because the effect notice shares that class, it inherits inappropriate centre-screen size and overlap. This is a **confirmed presentation-CSS cause**, not a hypothesis about the gameplay engine.
- `app/page.tsx` declares `UI_TIMING.effectNotice = 2400` ms while `.turn-notice` uses the unrelated `turnPulse 1.6s` animation; there is no dedicated aligned effect-notice motion lifecycle. The `setTimeout` is created for text-keyed dismissal from within the fresh-event handler and is not managed as a normal cancellable effect timer. The exact live-session duplicate/stale-notice symptoms have **not** been independently reproduced; do not claim these as additional observed defects.

**Expected player-facing result:**

1. **Small, non-blocking skill event banner, not a modal.** An eligible `effectNotice` appears as one **compact, black-and-gold, edge-anchored banner** inside the measured safe battlefield/Stage region, outside current public CardFaces and per-player card thumbnails, hero Seats, lower-right response timer/System Menu, Guidance, Hand and action buttons. Avoid the viewport/Stage centre and an all-table dimming layer. Prefer a banner width **<= 320 CSS px** or available safe width minus insets (whichever is smaller), approximately **8–10px vertical and 10–14px horizontal padding**, **12–13px readable body type**, contained text wrapping and content-driven height. Do not stretch a long message into huge central typography; preserve the full meaningful text accessibly.
2. **Notice and decision serve different functions.** Notice communicates a verified public event, e.g. `SKILL ACTIVATED · Yue Jin — Dauntless` **only if those actor/skill facts are actually supplied as authoritative public fields**. The primary `Retaliation` decision stays in its existing Local Dock/Guidance controls and remains operable. A public damage outcome, e.g. `Sima Yi takes 1 damage`, may only be attached when that specific public settlement is independently proven; never infer damage/skill/cause by parsing a message, comparing HP, hero names or adjacent timeline entries. Without typed facts, use the original public message unchanged with a compact `EFFECT TRIGGERED` heading; do **not** fabricate structured claims.
3. **Event identity and timing.** Render at most one active effect notice. Key its lifecycle by the authoritative timeline `event.id` rather than by the raw message string; a different verified event may replace an older notice without creating stacked banners, while repeated room polls must not restart one old banner. Use one cancellable lifecycle for mount/reading/fade/removal, aligning React visibility and CSS animation to the existing **~2,400ms** notice presentation (a short <= 200ms exit is appropriate), including reduced-motion mode as a static readable notification. Keep DOM/animation state consistent when the viewer navigates rooms or a newer authoritative event takes precedence. No notice should intercept pointer/touch or focus.
4. **No game-state change.** Maintain Dauntless availability and cost, its real turn-end source/target and equipment-discard/damage rules, any resulting Retaliation choice, `CurrentAction` legal actions, response deadlines, `PresentationSnapshot` and private skill/hand/role protections. This task is a **presentation-only** fix. Do not suppress the skill response or its genuine relationship graph merely to remove the large banner.
5. **Separate from visual Inspect design.** The unified compact player inspection §4B.12 is its own accepted design/refinement. A transient effect notice must not open, replace, or block that inspector; simultaneous states need deterministic single-overlay/focus priority and measured collision handling.

**Bounded Coding Agent implementation slice (when explicitly scheduled): `UX2-EFFECT-NOTICE-COMPACT-01`.** The cause above has already been investigated by Planner/Reviewer; the Coding Agent should **implement and validate**, not launch an open-ended research task:

- In `app/page.tsx`, replace the effect-only reuse of `.turn-notice` with a dedicated, semantically appropriate `effect-notice` banner element; keep `TURN BEGINS` and unrelated notices unchanged. Preserve the server-public message fallback, introduce event-ID keyed notice state and one reliably cleaned-up timer/effect boundary.
- In `app/globals.css` or `app/sequence-overrides.css`, add one scoped `.effect-notice` visual treatment and mobile-safe anchor, independent of `.turn-notice b`/large `turnPulse`. Do not create conflicting specificity across both stylesheets or hard-code one device's full-screen coordinates. Align entrance/exit with the notice's actual state lifetime and respect reduced motion.
- Using a **real server-backed** four-player setup, validate the exact sequence **Yue Jin Dauntless turn-end event → legitimate equipment/damage resolution → Sima Yi Retaliation offered when applicable**. Assert the actual `effectNotice` message identity and `CurrentAction` independently, and prove notice + Local Dock decision can coexist without text/panel overlap. Also verify cases with *no damage/Retaliation*, a second distinct effect notice, repeated polling, timer expiry and switching viewing session/room.
- Capture **390×844**, approximately **440px iPhone 17 Pro Max CSS portrait**, **480×900** and one wide viewport, with bounding rectangles/screenshot evidence: no overlap with opponent Seats, current relation graph/cards/labels, timer/System Menu, Local Guidance, local Hand, Confirm/Skip; no page horizontal overflow or accidental click capture. Test readable wrapped notice text and reduced motion. Preserve the no-connector card presentation design (§6); do not resurrect the retired Stage A/B graph.
- Report changed files, the root-cause fix, real-game screenshots and measured layout/timing, focused tests, exact commit SHA and required <=6-minute CI gate (§7.1). **STOP for independent user/reviewer acceptance.** Do not alter `HANDOVER.md`, game rules, §4B.12, Duel, Negation or AOE while executing this bounded item unless explicitly instructed.


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

**Target-selection and gameplay continuity:** Once the player picks a legal opponent target, reveal/update the unified inspector without obstructing their other opponents, selected Attack hand card, or bottom **Cancel/Confirm/End** controls. The selection remains valid if the inspector is closed. Changing inspection subject must **not** silently change the chosen gameplay target; an explicit legal Seat selection does. The inspector never sends gameplay requests, enables illegal buttons, cancels a selected target on close, or pretends a local unsubmitted choice is a server-proven public action. Preserve the existing `submittedTargetPreview`/presentation-readiness and no-private-leak boundaries when removing duplicate local presentation ownership. Ensure the normal confirmed public Attack reveal takes precedence once authoritative confirmation advances the interaction.

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

## 5. Historical interaction-stage work — architectural constraints still applicable

The earlier UX V2 Interaction Stage and physical-seat graph refactor was an implementation experiment. Its **graphical connector, Hero duplication and verbose causal-panel presentation is superseded and must be removed** by the current decision (§0.1 and §6). Older `docs/UX_V2_INTERACTION_STAGE_DESIGN.md` and historical roadmap assertions remain historical context only and cannot override this UX2 refinement.

Still enforce: the viewer's Hero belongs in the Local Dock; other players remain in their physical Seats; verified public projection supplies card actor/target identities; the local viewer's private `CurrentAction` controls stay in the Dock; privacy and stage/Seat collision safety do not regress. Follow §6 for all new card-display visuals. Passing prior CI or previous graph tests is not evidence that the user accepted the previous graph or accepts this new design.

## 6. UX2 Simplified Public Card Presentation — no relationship graph (approved direction 2026-10-13)

### 6.1 Product scope and forbidden visual elements

**UX2 visual strategy has changed by explicit user decision:** stop graph-connection engineering. Public card interaction is a series of **centred, human-readable reveals followed by owner-seat thumbnail placement**. The physical seat layout and the Local Dock remain unchanged. A short text sentence can identify who used a card against whom; do not express that relationship with drawn connectors. Applies first to ordinary Attack/Dodge, then Duel, Negation, AOE, judgment/equipment/skills as applicable. Reuse existing public event/projection contracts and CardFace art.

**Not allowed anywhere in the active combat presentation:** source tethers, target arrows, counter/interception strokes, continuous graph lines, elbow paths, path forks, coloured historic routes, SVG arrow markers, fake central Hero copies, edge/graph legends, standalone giant `EFFECT`/`REACTION CHAIN` layouts, or duplicate full-size floating CardFaces produced by competing renderers. Red may still be used as a **response-panel border / damage status emphasis**, not as a route. Green may still occur in ordinary UI/card art, not as authorship paths.

### 6.2 Three-zone mobile layout

1. **Fixed player Seats:** Opponents remain in the actual upper/side positions for the viewer. At each player's battlefield-facing edge reserve a small public card parking area. Opponent top-row seats: **directly below that player's portrait card**. Side-column seats: **on the inward-facing side**. Never cover HP, Hand count, switch/view affordances or other Seats.
2. **Central reveal zone:** The usable centre of the battlefield is temporarily reserved for **one newly confirmed card at a time**, rendered as a *real* CardFace of the same size as the viewer's normal hand card (initial existing nominal ~60×90 CSS px, with actual Hand CSS as the reference; do not create oversized 150px overlays). Centre text such as “Cao Cao used Attack on Zhao Yun” may sit above/below it without turning into a multi-panel Stage.
3. **Local player's Dock:** The true viewer's Seat is fixed in the lower operational panel. Their public played card parks **just above the Dock's top boundary** in the battlefield, aligned with their local author area without blocking Guidance, Skill buttons, Hand, Confirm/Skip or a response timer. The floating thumbnail is **not** a copy of the private Hand; once played it is public and identified only by proven event data.

**Medium thumbnail:** Initial target **48×72 CSS px** (or 50×75 within the 2:3 aspect ratio), slightly smaller than the actual same-device Hand/centre reveal card. Use authentic art, rank/suit and readable name; allow bounded collision-driven reduction, but never unreadably tiny. Keep one primary recent card per player, optionally one subdued immediately previous card while the same interaction remains active; older events collapse into a compact “+N” history indicator only from genuinely public events. A player with no public committed card gets no placeholder thumbnail.

**No fabricated spatial semantics:** Placement depends on actual authenticated owner player ID and real Seat/Dock DOM position, never the top-row index guessed as the card actor. A single public event maps to one active card instance (centre while revealing, owner parking after), not two simultaneous copies.

### 6.3 Shared public-card reveal state machine

For each distinct authentic public card-play event (and actual author) in the current authoritative interaction:

1. **REVEAL:** Display its genuine CardFace **at the measured centre** as soon as the action is server confirmed and publicly visible to this viewer. Allow an initial legible hold around **500–800ms** (tune by on-phone review), along with actor/action/target text derived only from verified public facts.
2. **MOVE/PARK:** Animate (when motion is enabled) centre → real owner seat-front parking area, shrinking from Hand size to the medium thumbnail in about **250–450ms**; prefer one consistent unobstructed path rather than a relationship line. The card is a *moving object*, never a permanent arrow/connector. Once parked, it stays as public interaction context and the centre clears for the next publicly committed card.
3. **WAIT/RESPOND:** The current decision player's own Local Guidance controls the decision. Do not replay the same card, change to the next action, move another player's card, or show a private selected response publicly merely because `CurrentAction` polls.
4. **SETTLE/RETIRE:** Show only a **server-proven** outcome in compact readable text at the true impacted Seat/Dock. Initial aim: about **2 seconds of legible settled result** (subject to a newly confirmed independent action taking precedence); then remove obsolete parked cards. Do not pause server turns or response deadlines for reveal/hold. Genuine server response timers remain separate. Animation-only timers must not turn a private card into a public event.

Repeated polling, refresh and perspective switching must dedupe by proven event/root/card IDs. On late mount/refresh, **show the current already parked public cards without replaying a historical reveal**. Reduced-motion mode skips movement and uses a static visible centre beat/seat thumbnail with equivalent information and legibility.

### 6.4 Ordinary Attack → Dodge: reference sequence

**A. Attacker chooses and confirms Attack.** Before confirmation, any selected card is a **private Hand selection only**—no public floating Attack. After server confirmation: a genuine Attack at centre at full Hand size, short text “Cao Cao used Attack on Zhao Yun”; after the readable beat the same card shrinks/moves to the attacker's owner-front parking slot (for local attacker, just above their Dock; for upper opponent, under their actual Hero Seat). Preserve its public identity through the response opportunity.

**B. Defender receives Attack.** From the *defender's viewpoint*, the incoming authenticated Attack appears centre-first when newly confirmed/first observed, then parks **in front of the real attacking player** (not at the defender). The defender's own Local Dock response guidance/border becomes **visibly red-accented** and explicitly says e.g. “Cao Cao used Attack on you. Play Dodge or Skip.” The true server-owned response countdown and legal choices remain visible. Only actual `CurrentAction` options are actionable: usually genuine **Dodge**, or an explicitly legal skill-converted physical **Attack as Dodge** (e.g. Zhao Yun) if the server allows it. **Ordinary Attack is not generally a Dodge response**. No invented response card or centre target duplicate appears while the defender waits.

**C. Defender really commits Dodge.** After server confirmation, the genuine publicly played Dodge CardFace (or legitimate converted physical card with correct “AS DODGE” label) appears at the centre at standard Hand size, with short message e.g. “Zhao Yun played Dodge.” Then the same card shrinks and parks at **Zhao Yun's own seat-front area**: above their Dock for Zhao Yun viewing themselves, below the true Zhao Yun opponent Seat for the attacker/observers. The earlier Attack thumbnail remains at its actual attacker's Seat as context. No red line, arrow or Dodge→Attack counter link is drawn.

**D. Result.** If genuinely blocked, display **“DODGED / Attack blocked”** or equivalent short public verified result, with subtle non-colour target status; then clean the old cards at the natural public settlement/next action boundary. If the defender legitimately declines/times out and the server proves actual damage, display **“TAKE DAMAGE” at the defender's real Seat/Dock** for an initial ~2s legible window so *all other players* can see the outcome. Do **not** show Take Damage solely on Skip; if a prevention/skill cancels damage, show the proved alternative. On later independent gameplay, prior interaction cards retire without ghosts.

**Motion/source view equivalence:** The centre reveal is observed separately on each player's viewport, but after the move the card must sit before its true author in that viewer's real seat arrangement. Observers see the same public card truth and public result; they never see another player's private hand/options.

### 6.5 Duel without relationship lines

First Duel stratagem: authentic centre reveal → Duel owner's seat-front thumbnail. During any Negation opportunity keep one compact “Play Negation or Skip” private instruction and the public Duel thumbnail; do not display the giant old `NEGATION RESPONSE / EFFECT / REACTION CHAIN` composition. Once the Duel proceeds, every **actually committed Attack response** repeats the common centre reveal → **correct answering player's own seat**. Preserve a compact latest-card/history treatment at the two actual duelist Seats; text says whose Duel it is and **who needs to provide Attack now** only to those allowed by the authoritative current decision. Do not create fake Attack #2/#3/#4, intermediate arrows, old pair route forks, round rows or centrally duplicated Duel root. At terminal resolution show the actual damage/failure outcome using §6.3. The old §6.39 four-card diagram and B1 line geometry are **cancelled**, not a backlog item.

### 6.6 Negation/counter, Group/AOE and other cards

**Negation:** follow current §2; each proven card appears once in the centre then parks before its public author; recent committed card strongest, older public response cards/count subdued; effect status uses verified compact text, not card-to-card connector.

**Group/AOE:** root Group/AOE card appears centre then parks before its real author. At each actual ordered or simultaneous participant response, the true committed response card appears centre then parks before the true responder. Use compact per-participant verified pending/blocked/damaged labels and the already available Local Guidance/response timer, not arrows, participant branches or made-up public responses.

**Other public card actions / skill-triggered events:** the same CardFace reveal/owner parking whenever a real **public physical card** has been played. Skills without a public played card use a compact nonblocking textual trigger (§4A.12), never a fabricated CardFace. Existing private Draw, target-card picker, Judgment, equipment, Hero Skills and hidden Hand boundaries remain governed by §§1–4C, not overwritten by this motion concept.

### 6.7 Visual and layout priority

Priority: **server-authoritative identity/privacy → uninterrupted legal decisions → clear centre reveal → true owner seat placement → no Seat/Dock/control overlap → readable outcome → aesthetic timing**. Keep the battlefield visually quiet, black/gold palette, one strongest newly played public card, minimal messaging, no enormous Stage metadata. Avoid duplicate card renderers during handoff. Allow 4/6/8-seat and top/side arrangements, 390×844, ~440px iPhone 17 Pro Max and 480×900, and a wide viewport. Do not scroll/jump the main page or cover response controls; match geometry after viewport/keyboard changes.

### 6.8 Rejected old graph implementation — technical migration boundary

Current code is much larger than the new UX needs. The **obsolete presentational system** includes: `app/interaction-root-overlay.tsx` SVG/geometry renderer and graph-only fit states, its `InteractionRootOverlay` composition in `app/page.tsx`, conditional legacy `InteractionStage` / `SingleTargetNegationCausalComposition` / text-heavy Duel/Negation root panels, `TableResolutionSequence` duplicate CardFaces, graph-only selectors in `app/sequence-overrides.css` and `app/globals.css`, and graph-only browser geometry assertions.

**Do not delete** the server-side engine continuation, true causal event IDs, `PresentationSnapshot` / `PresentationV2` / `PresentationClientView` public proof and privacy validation, `CurrentAction` controls, target inspection/picking, match rules, legal response timers, genuine public card-zone/discard/draw animations, test-controller authorization or useful server correctness/API assertions. Rendering deletion and semantic proof deletion are **not the same thing**. When graph renderer currently gates or owns an Attack/Dodge/Negation/Duel settlement hold, relocate its **public outcome/lifecycle authority** to the simple card/outcome presenter before removing the old gate. Avoid a blank field or early-disappearing legitimate result.

### 6.9 Real-game acceptance

Use a real server-backed four-player room (including authorised host-controlled test players) to capture: (1) attacker confirmed Attack in centre, (2) Attack parked before actor, (3) defender red response Dock and true Attack at author seat, (4) authentic Dodge centred, (5) Dodge parked at responder seat as seen by attacker/defender, (6) authoritative blocked or **TAKE DAMAGE** outcome. Test decline/timeouts, non-Dodge legal responses, quick supersession, refresh/viewer switch, Negation opportunity on Duel, four actual Duel Attack responses if game legally reaches them, and at least one Group/AOE response. **Zero** connector SVGs/visible graph edge strokes; **zero** giant legacy `EFFECT / REACTION CHAIN` panels; one physical played CardFace in each presentation phase, no duplicated full cards, private leaks or gameplay delay. CI and on-device human acceptance are distinct.

### 6.10 Two separately accepted implementation slices — do not merge

**Phase R: `UX2-NO-GRAPH-REMOVAL-01` — FIRST.** Disable/remove all **visible** relationship-graph connectors, arrowhead markers, geometry engines and their stale UI ownership; remove the obsolete oversized duplicated central interaction/Reaction Chain panels. Keep a **minimal static, proof-authenticated public played-card and compact text display** for every affected card/response while the new reveal/park animation is not yet implemented. Preserve all functional timers, CurrentAction options, public validation/settlements and privacy. Remove obsolete graph-only CSS/DOM selectors/positive visual tests, retaining core rules/API and legitimate fail-closed tests. This phase is a meaningful functional intermediate state: game playable, true current public card visible, no graph, no giant legacy panel. STOP for human review and do not implement motion in the same task.

**Phase P: `UX2-CENTRE-REVEAL-SEAT-CARDS-02` — only after Phase R visual acceptance.** Implement the shared centre reveal/seat-front thumbnail state machine, first for ordinary Attack/Dodge/Damage, with true actor/public event identity, collision-safe physical Seat/Dock anchoring and per-viewer dedupe. Then extend **in separately reviewable small slices** to Duel, Negation, AOE and other public cards. No new graph connections or causal geometry.

**Ownership:** This section specifies UX outcomes only; the Coding Agent alone maintains `HANDOVER.md`. Planner/Reviewer may provide a copyable scoped task but must never modify that handoff without direct permission.

## 7. Independent process and System Menu rules retained from the prior UX2 specification

### 7.1 User-approved CI gate policy: maximum six minutes, minimal tests, visual tests only after acceptance (2026-10-09)

**This policy remains current during the no-connector UX2 migration; removed graph-only visual tests are not current user-visible acceptance criteria.** This is a process and CI requirement, not a claim that any visual feature is accepted.

**Hard limit:** Ordinary `ux-v2` push CI, including the required checks and production deployment/smoke step, must finish within **6:00 wall-clock minutes** in a successful normal run. Track actual workflow start-to-finish time. Do not call a 6-minute browser shard a 6-minute pipeline.

**Test admission is controlled by the user:**
- Before the user explicitly approves a feature from the **actual rendered game**, do **not** add its long UX tests, repeated multi-scene assertions, 10-game loops, 12-second frame samples, or 6/8-player geometry matrices to required per-push CI.
- A new feature's **smallest useful, short correctness test** may run locally during implementation. It does not automatically enter the required push suite. After visual acceptance, obtain the user's approval before adding that feature's tests to routine CI.
- Previously added, long or unapproved UX tests must be **removed from the required per-push selection**, not deleted from the repository. They may run locally or by manual workflow dispatch; do not use them to block routine deployment before acceptance.
- Old graph geometry/connector assertions are **not valid positive acceptance tests for the new no-connector UX**. Retain any useful negative fallback/safety cases separately, without misrepresenting them as user-visible proof.

**Minimum required fast CI:** keep a small, reliable set of **build/typecheck, lint, fast game-rule/API/privacy and core startup/interaction smoke** checks. Run jobs concurrently and measure their duration. Use the smallest representative browser set necessary to detect app boot, room creation and fundamental control/API breakage. Do not run the entire existing Playwright collection on every push. Move broad Hero roster, AOE/Duel/Attack dense layouts, Negation chains and lengthy repeated scenarios into **manual or post-acceptance validation**, unless the user separately approves a short gate. Preserve correctness and private-information safeguards.

**Honest result:** Never use `|| true`, forced success, skipped failing required assertions, or changed expected values merely to paint CI green. Genuine failures in the deliberately small required gate must remain failures and be repaired. The instruction that CI “must not fail” means **eliminate unreliable, redundant, unapproved UX gates and maintain a stable minimal CI**, not suppress real errors.

**UX release status is independent of CI:** A green fast CI means the chosen technical checks passed. It does **not** mean a card family passed visual acceptance. The user withdrew the relationship-line UX on 2026-10-13; neither old Stage A nor Duel B1 graph screenshots imply acceptance of the new card-reveal flow.

**Historic execution note:** The former `UX2-CI-MINIMAL-6MIN-01` assignment text has been removed from this design. The **policy above** is the permanent requirement. The current `.github/workflows/deploy.yml` selects fast tests, API checks, lint, a single browser startup smoke and a dependent deploy; actual <=6:00 end-to-end compliance still requires exact-run measurement. Do **not** restart a CI optimization task or demand another fixed set of three historical runs solely because that task ID once appeared here. Future changes to CI or its performance gate require a fresh, scoped user direction.

### 7.2 Compilation, ESLint and test memory optimization — evidence first (user-requested review 2026-10-10)

**Scope:** The user reports local compilation/testing sometimes approaching **3–4 GB RAM** and failing with OOM. This is a **reported symptom**, not a measured per-process peak from the available GitHub Actions logs. Memory profiling and subsequent safe optimizations are authorized investigation topics; an unverified heap leak, OOM cause or memory saving must **not** be asserted as fact. This is independent of the compact menu UI polish.

#### 7.2.1 Confirmed review evidence (historical baseline, remeasure on current HEAD)

| Area | Verified evidence | Caution |
| --- | --- | --- |
| Vinext build | Around **6–9 seconds** per build in recent successful GitHub Actions runs | Wall time is **not** peak memory |
| Complete ESLint | **71 seconds** in Actions run **38061870954**, **92 seconds** in run **38064028420** | Likely worthwhile to profile; no RSS/heap peak recorded |
| Fast tests | **261 passing tests**, **8.64 seconds** in run 38061870954; `--test-concurrency=1` | Already relatively efficient; no justification to remove tests |
| API suite | **266 passing tests** across **24 files** and **four concurrent shards**, about **76.62 seconds** | Each shard creates its own Wrangler/D1/test Node process group; aggregate RSS may be high, but is **unmeasured** |
| Source size | `app/api/rooms/route.ts` ~**584 KB**, `app/page.tsx` ~**468 KB**, `app/interaction-root-overlay.tsx` ~**171 KB** | Babel emits a >500 KB deoptimization warning for route.ts; warning **does not prove OOM** |
| ESLint heap configuration | `NODE_OPTIONS=--max-old-space-size=8192` in `.github/workflows/deploy.yml` | 8192 is a permitted V8 old-space maximum, **not actual 8 GB allocation**, and may be unsafe as a workaround on a RAM-limited host |
| Browser tests | Required CI runs one room-startup smoke; full Playwright diagnostics are manual. Local `test:browser` has no explicit workers cap | Automatic local worker count can cause aggregate Chromium pressure on smaller machines; measure it first |

GitHub's required `lint-fast`, `api` and `browser-smoke` jobs execute on **separate runners**, so do not add their RAM figures as if on one shared host. Conversely a local developer running multiple commands concurrently may see aggregate memory pressure. The inspected successful GitHub runs did **not** contain a proven OOM event or a peak RSS metric; do not confuse lack of such logs with proof that the user's local problem cannot occur.

Inspect the current `package.json`, `eslint.config.mjs`, `tests/run-api-suite.mjs`, `tests/run-tests.mjs`, `tests/run-fast-tests.mjs`, `tests/browser/playwright.config.mjs`, `.github/workflows/deploy.yml` and `docs/CI_TEST_OPTIMIZATION.md` (the latter is historical analysis, **not** current policy). Always refresh the measurements and test membership.

#### 7.2.2 First deliverable: reproducible process-tree memory profile

Before modifying source or discarding tests:

1. Record exact branch SHA, OS/RAM limit and Node/tool versions. Run **separately** `npm run build`, `npm run lint`, `npm run test:fast`, `npm run test:api` and the existing **single** browser-smoke test.
2. Capture **peak resident memory (RSS) for the complete spawned process tree**, not just `node`'s heap: include Wrangler, workerd, Miniflare/D1, test Node processes and Chromium when present. Record per-PID RSS, optional `heapUsed/heapTotal`, wall time, peak aggregate tree RSS, subprocess count, exit code and test pass count. Use appropriate OS process sampling and/or `/usr/bin/time -v`; explicitly state metric limitations.
3. Check whether child processes remain alive after command exit. A `SIGTERM` call without awaiting process exit is a **cleanup risk to measure**, not itself proof of leaked workers.
4. If it OOMs, distinguish **V8 `JavaScript heap out of memory`**, **OS/container `SIGKILL` / exit 137 / cgroup `oom_kill`**, and unrelated failures; include the shortest safe error tail. Do not accidentally reveal test tokens, private cards or game secrets.
5. Make a reproducible comparison table: **command / concurrent processes / peak tree RSS / heap peak where measurable / duration / test counts / result**. If no OOM reproduces, state that honestly and identify the strongest measured memory consumer.
6. Profiling belongs in local/opt-in diagnostics, **not** an unapproved lengthy push-CI job. Do not trigger repeated known OOM failures in ordinary CI.

#### 7.2.3 Evidence-driven optimization candidates and safety rules

**P0 — Lint costs:** Profile large files and the current ESLint flat config, especially the React Compiler/Hooks rule scope for server-only modules versus genuine React components. If React-specific analysis is demonstrably unnecessary on non-React files, **narrow that rule application only where valid**; keep every relevant React/hook check on UI/hooks, and preserve TypeScript, security and accessibility checks. Prove equivalent intended rule enforcement via a small deliberately failing lint fixture or precise rule coverage comparison. Do not disable entire lint categories merely to lower memory.

**P0 — API process concurrency:** Compare **four versus two API shards** while maintaining **exactly the same 24 test files/test membership**, isolated D1 states and meaningful assertions. Profile aggregate tree RSS and duration. A change from four to two is a candidate **only if** it produces a verified memory benefit and does not push full required CI/deployment past the user-approved limit. Do not reduce test counts, share databases across concurrent suites unsafely, or hide failures.

**P1 — Child process lifetimes:** Audit `tests/run-tests.mjs` cleanup after Wrangler termination and temporary state removal, and verify whether any descendants survive. If observed, use a bounded graceful shutdown/wait and appropriate escalation, preserving test outcome. Do not assume leak from code shape alone.

**P1 — Optional full browser diagnostics:** Measure RAM under local Playwright's implicit worker count; use a memory-aware explicit `--workers=1` or `--workers=2` when appropriate. Required push smoke already uses one worker. Keep broad UX cases in optional/manual diagnostics until post-acceptance authorization (§7.1), **not** deleted from the repository.

**P2 — Oversized production modules:** Consider a **later separately approved** domain/module decomposition only if it materially lowers measured lint/build memory or improves maintainability. A Babel >500 KB warning alone does not justify a risky refactor of the authoritative room API, game rules, or client state machine.

**Forbidden shortcuts:** raising Node old-space above physical/container RAM as a blanket cure; turning off real lint/privacy checks; skipping or deleting passing tests to save RAM; running all benchmark commands simultaneously and mislabeling system-wide load as a single-command peak; weakening assertions or marking an OOM as successful.

#### 7.2.4 Memory optimization acceptance and the six-minute CI policy

An optimization is proven only by **comparable before/after peak process-tree RSS** or elimination of an **actually reproduced OOM**, together with unchanged meaningful lint checks, full API/fast test membership and results, and no gameplay/privacy regressions. Report the time cost. The **full normal push-to-required-CI-to-Cloudflare-deploy/smoke interval must still finish within 6:00** under §7.1, rather than optimizing a single stage while harming the full pipeline.

Only implement a **small, measured runner/config change** in the same bounded diagnostic task. If the leading fix is a production refactor or alters test grouping substantially, report the measurements and hand off a **separate, scoped follow-up task** instead of expanding the investigation. Never claim the 3–4 GB root cause fixed without relevant proof.

### 7.3 Compact System Menu and UX trace behavior

#### 7.3.1 Compact System Menu

The existing `app/page.tsx` menu contains a long `stage-system-diagnostics-note` about automatic recording, privacy exclusions, trace IDs and length limits. **Remove that long visible note**, not the actual safety or diagnostics functionality.

Keep the **GitHub Actions build SHA**, **Download UX trace** button and **Exit Game** button. Keep the build badge, actual JSON export/automatic recording, privacy filtering, trace-size limit, short download success `role="status"` feedback, keyboard/focus behavior and Exit Game confirmation. Prefer **no text** under the download button; only a single short unobtrusive hint if truly needed.

**Menu acceptance:** A mobile screenshot shows a compact SHA + two actions with no large explanatory paragraph, excess height or hidden controls. Download and Exit continue to work. Do not change the trace API or data policy to achieve the visual reduction.

#### 7.3.2 Preserved menu boundary

The compact System Menu/build identifier/trace-export behavior is a separate UI concern from public-card placement. Preserve its established privacy and exit-confirmation semantics. This section is a design baseline, not a current task; `HANDOVER.md` controls execution.
