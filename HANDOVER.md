# Three Kingdoms — current handover

## Latest presentation update — Xiahou Dun portrait — 2026-10-01

Replaced `public/hero-xiahou-dun.jpg` with the supplied portrait. The existing
shared `HERO_ART_BY_ID` / `HeroPortrait` path continues to cover hero selection,
the locked-in selection state, the local hero card, and opponent cards. This
remains presentation-only: no gameplay rules, projections, selection legality,
layout dimensions, or semantic actions changed.

## Current state — Lü Bu / Unrivaled semantic multi-response — 2026-10-01

Implemented generic semantic response settlement. `ActionRequirement.count`
is the persisted number of Attack/Dodge responses still required; provider
selection min/max and physical costs no longer rewrite that semantic count.
Successful responses either resume the existing continuation or reopen it with
the decremented count, preserving the continuation and returning delegated
follow-up decisions to the original semantic requester. Eight Trigrams
Judgement and Duel/Lust use the same path, while failed Judgement preserves
the requirement.

Regression coverage includes ordinary and converted Dodges, successful Eight
Trigrams, delegated Entourage, ordinary/conversion/Serpent Spear Duel,
Influencing, reload/stale safety, actor ownership, private choices, and exact
physical-card conservation. `npm test` passed 80 fast tests and 196 API tests;
build and focused semantic/API suites also passed.

Known boundary: this is generic semantic settlement only. No provider-specific
routes, artwork, Huang Gai, or UX work was added. Preserve current-action
authority, private projection, stale/replay rejection, and Quick Test parity.

Recommended next work is the next separately confirmed Standard gameplay
correction; Huang Gai and UX remain out of scope.

## Current state — Sima Yi Retaliation random Hand hardening — 2026-10-01

Retaliation preserves the profile-button activation and target-card selection
window introduced in 746adc5, but its projected Hand choice is now one opaque
`hand` zone. The UI no longer renders or submits `hand:0`/`hand:1` choices.
Equipment and Judgement cards continue to use exact visible-card IDs.

The server accepts the Hand zone only for Retaliation, reloads the live source
Playing Area during trigger resolution, chooses one physical Hand card with
authoritative randomness, and applies the existing private transfer and
continuation path. Empty or changed Hands return stale recovery, and the
existing CAS claim preserves one concurrent winner and card conservation.

Mounted coverage protects the preserved activation/cancel/re-entry UX and
opaque Hand submission. API coverage protects random physical selection,
privacy, forged index rejection, vanished-Hand revalidation, public-zone
selection, stale safety, and concurrency.

Recommended next work remains the existing generic Lü Bu / Unrivaled semantic
multi-response correction. Do not broaden this fix into another hero or
provider-specific gameplay protocol.

## Latest presentation update — two supplied hero portraits — 2026-10-01

Added and wired the two supplied portraits through the shared
`HERO_ART_BY_ID` / `HeroPortrait` renderer:

- Photo 1: Pan Feng (`public/hero-pan-feng.jpg`)
- Photo 2: Zhuge Liang (`public/hero-zhuge-liang.jpg`)

The shared path covers hero selection, the locked-in selection state, the local
hero card, and opponent cards. This remains presentation-only: no gameplay
rules, projections, selection legality, layout dimensions, or semantic actions
changed.

## Current state — Guo Jia Eight Trigrams Judgement lifecycle — 2026-10-01

Fixed Guo Jia's missing Jealousy of God interaction after using Eight Trigrams
Formation to answer a Dodge response. Eight Trigrams already returned the
generic Judgement resolution, so its revealed card now continues through the
existing `judgement_revealed` / Necromancy / `judgement_effective` lifecycle;
the defect was the shared state guard rejecting a semantic post-Judgement
actor whenever a different seat owned the active turn.

The guard now permits the actor recorded by either generic Judgement trigger
continuation. No Eight Trigrams-, Heart-, Guo Jia-, or provider-specific route
branch was added. The final effective card still determines red/black Dodge
success, Jealousy obtains only that final card, and the original replaced card
follows its normal destination.

API regressions cover Heart, Diamond, Club, Spade, Sima Yi replacement,
non-Guo Jia behavior, Raining Arrows resumption, private Jealousy ownership,
and exact physical-card conservation. Existing generic Guo Jia Judgment and
Eight Trigrams tests remain in place.

Recommended next work remains the existing generic Lü Bu / Unrivaled semantic
multi-response correction. Do not broaden this fix into another hero or a
second Judgement protocol.

## Current state — Diao Chan Beauty skill-control fix — 2026-10-01

Mapped `diao_chan_beauty_outshining_moon` to Diao Chan's existing generic
hero-profile skill map. Beauty Outshining the Moon is now the only rendered
Beauty control: it stays visible but disabled without the server-projected
trigger, enables during Diao Chan's optional own-turn `turn_end` trigger, and
submits `{ providerId: "diao_chan_beauty_outshining_moon" }` through the
existing semantic `trigger` action. The generic trigger footer no longer
duplicates the mapped provider, and Skip remains available.

Added mounted regression coverage for one-button rendering, profile aria
label, enabled/disabled states, exact submission, and optional Skip. The
server-side Beauty behavior and existing `tests/api/diao-chan.test.mjs`
coverage were not changed.

Known boundary: this is a small presentation/routing correction only; no
server capability, continuation, or Lust behavior changed.

Recommended next work remains the existing generic Lü Bu / Unrivaled semantic
multi-response correction. Do not broaden this fix into another hero or
server rules work.

## Current state — Da Qiao Deflection review closure — 2026-10-01

The shared active hero-skill submission control now uses generic `Confirm`
after activation, so Da Qiao has exactly one Deflection-labelled control: the
profile skill button. Confirm remains disabled until the server-projected cost
and replacement target are selected, then submits the unchanged semantic
`trigger` action for `daqiao_deflection`; Skip remains the optional
`decline_trigger` path.

Mounted coverage now asserts both UI states and rejects every other button
whose label contains “Deflection”. A separate `attack_targeted` fixture pairs
mapped Deflection with an unmapped synthetic provider and verifies that only
the unmapped provider remains in generic trigger controls.

The test-only `seedPlayingGame` endpoint now retries bounded D1 room-code
insert conflicts while preserving the normal five-character code contract.
This isolates collision hardening from production room creation and removes
the parallel API-suite flake caused by `UNIQUE constraint failed:
rooms.code`.

This is still the same Da Qiao fix round. Do not start Lü Bu / Unrivaled until
the complete validation workflow and deployment gate are green.

## Current state — Sima Yi Retaliation activation UX — 2026-10-01

Retaliation now uses the shared hero-skill activation mode for its projected
`target_cards` selection. When Sima Yi owns a `damage_suffered` trigger,
Retaliation is enabled beside the profile and remains optional; the target-card
picker is not mounted until the player clicks the skill. Clicking the active
skill cancels the picker and clears selected keys, while the existing generic
`trigger` action submits `{ providerId: "sima_yi_fankui", cardKeys }` after an
eligible card is selected. Action-revision changes clear the provider and all
local selection state. Unmapped target-card providers retain their generic
picker fallback.

Mounted interaction coverage verifies the initial enabled/inactive button,
absence of the picker and trigger submission before activation, activation,
card selection, cancel/re-entry, revision reset, exact semantic submission,
and optional Skip. Sima Yi and Wei API regressions remain green; server-owned
eligibility, privacy, continuation, and card conservation were not changed.

Recommended next work remains the existing generic Lü Bu / Unrivaled semantic
multi-response correction. Do not broaden this fix into another hero or a
server rules change.

## Current state — Guo Jia Legacy distribution UI — 2026-10-01

Fixed the Legacy dialog presentation defect. The real `CardFace` instances
inside `.legacy-distribution-card` no longer use the temporary played-card
fade/flight animation, so both privately projected cards remain visible until
the server successfully resolves the `card_distribution` action. A failed
request leaves the same unresolved decision and visible cards available for a
retry.

Recipient selects still submit the unchanged player IDs, but their displayed
labels now use `heroName(player.hero)` and the placeholder says “Choose a hero”.
The existing filter supplies only living eligible recipients. Backend Legacy
timing, privacy, card ownership, per-damage-point repetition, and semantic
`trigger` submission were not changed.

Focused render-source coverage protects the static Legacy card presentation,
real CardFace usage, hero-name labels, and player-ID option values. The
existing Guo Jia API regression remains the authority for private projection,
atomic distribution, conservation, retries, and repeated damage points.

Recommended next work remains the existing generic Lü Bu / Unrivaled semantic
multi-response correction. Do not broaden this UI fix into another hero or
Legacy rules change.

## Current state — Da Qiao Deflection UI/recovery fix — 2026-09-30

Da Qiao's `daqiao_deflection` capability is now included in the stable
semantic `HERO_SKILL_EFFECT_IDS` mapping and is routed to the hero-profile
Skills panel even when the authoritative trigger event is `attack_targeted`.
The generic trigger footer excludes that mapped provider while retaining
unmapped and equipment/future providers, so only the profile Deflection button
activates the decision and optional `decline_trigger` remains available.

The profile action reuses the existing active-skill selection state for one
server-projected Hand or Equipment cost and one projected replacement target.
Only projected targets are targetable; the original attacker remains excluded.
Submission remains the generic `trigger` action with provider ID
`daqiao_deflection`. Action-revision reset and cancel/re-entry clear stale
local selections.

The production recovery crash was reproduced in mounted `GameRoom` tests. The
generic footer path selected Deflection and caused a rerender where
`localEquipmentSelection` read `responseDecisionReady` before that later `const`
declaration, producing `ReferenceError: Cannot access 'responseDecisionReady'
before initialization`. Response-readiness calculation now precedes all of its
selection consumers; the error boundary remains unchanged.

Mounted regressions cover the exact attack-targeted fixture, one-button
rendering, enabled profile activation, Hand and Equipment cost paths,
ineligible-card and target blocking, selected-target styling, disabled-until-
complete submission, exact generic trigger payload, Skip, cancel/re-entry,
action-revision reload, Recovery-screen exclusion, and unmapped generic
fallback. Existing Da Qiao API coverage remains the authority for domain
legality and Attack continuation behavior.

Recommended next work remains the existing generic Lü Bu / Unrivaled semantic
multi-response correction. Do not add another hero in this fix round.

## Current state — Huang Yueying Cultivation UI/trigger-prompt correction — 2026-09-30

The Huang Yueying Cultivation UI defect is confirmed fixed. The shared
`HERO_SKILL_EFFECT_IDS` map now routes `Cultivation` to
`huang_yueying_cultivation`, so a null-selection trigger submits directly
through the semantic `trigger` action. The generic trigger partition only hides
effects with a real hero-skill mapping; an unmapped future trigger remains
visible through the generic controls.

`commandPrompt` now handles projected trigger decisions before the ordinary
response fallback. The acting player sees a provider-derived prompt such as
“Use Cultivation … or skip”; other seats see that the authoritative trigger
actor is deciding, never “Waiting for the target to answer the attacker”.
After Cultivation, the existing semantic continuation remains authoritative:
Overindulgence re-enters its Negation flow and Burning Bridges re-enters its
source-owned target-card choice. No card-specific UI or server branch was
added.

Mounted GameRoom tests cover the card-independent Cultivation semantic trigger,
private controls, Skip, actor ownership, continuation rendering, normalized
optional-trigger punctuation, and unmapped generic triggers. Card-specific
Overindulgence and Burning Bridges continuation coverage remains in the API
suite.
API tests cover accepted and declined Cultivation, stale/replayed submissions,
reload/privacy, Quick Test ownership, refill boundaries, Negation behavior,
target-card continuation, and physical-card conservation.

The Standard milestone remains **30/30 heroes and 46/46 skills**. Recommended
next work is the existing generic Lü Bu / Unrivaled semantic multi-response
correction. Keep the semantic protocol, server-owned legality, private
projection, and persisted continuation boundaries unchanged.

## Current state — generic cross-phase active-skill target-selection UI fix — 2026-09-30

Zhang Liao Assault now uses the shared semantic active-skill target mode even
when the authoritative `currentAction` is a Draw Phase trigger rather than a
Play Phase turn action. The opponent board keeps normal card/Attack targeting
behind the Play Phase gate, while active skill targetability uses only the
server-projected target IDs and live-player state. No Zhang-Liao-specific UI
branch, route, server settlement, or opponent-Hand picker was added.

Mounted `GameRoom` regression coverage verifies inactive opponent inspection,
Assault activation in a real `draw_phase` trigger fixture, eligible target
controls, selected-target styling, one/two-target submission, invalid-target
blocking, the exact generic `trigger` payload, and cancel/re-entry reset.

The privacy boundary remains unchanged: Zhang Liao selects characters, and the
server chooses one random current Hand card from each selected character
without projecting Hand identities or positions.

Recommended next work remains Lü Bu / Unrivaled semantic multi-response
handling, followed by the remaining correctness items below.

## Latest presentation update — Lu Xun portrait — 2026-09-30

Added and wired the supplied portrait at `public/hero-lu-xun.jpg` through the
shared `HERO_ART_BY_ID` / `HeroPortrait` renderer. The shared path covers hero
selection, the locked-in selection state, the local hero card, and opponent
cards. This remains presentation-only: no gameplay rules, projections,
selection legality, layout dimensions, or semantic actions changed.

## Opponent frame anchoring fix — 2026-09-30

Mobile review immediately exposed that the newly applied opponent frames were
not visually attached to the opponent cards. Root cause: the decorative
`::before` layers use absolute positioning, but the integration rule had not
made `.player-square` a positioned containing block. Their `top`, `left`,
`height` and percentage widths were therefore resolving against an ancestor
instead of the individual player panel.

The runtime rule is now:

```css
.player-square {
  position: relative;
  isolation: isolate;
  overflow: visible;
}
```

The existing per-seat pseudo-element mapping and fit ratios remain unchanged.
No gameplay DOM, player state, target controls, equipment/judgement content or
hit areas changed.

## Current state — shared active hero-skill UI recovery — 2026-09-30

The shared React active hero-skill selection path is now safe at the required
empty intermediate state. Liu Bei Benevolence and Gan Ning Ambushment/Qixi were
reproduced through the real GameRoom UI; both failed at the same
`presentationBusy` use-before-initialization expression before card or target
selection. The shared presentation-busy derivation now precedes all active
selection consumers, so activation enters selection mode without rendering a
recovery screen.

The boundary keeps render exceptions separate from room normalization and logs
only non-private diagnostics: hero ID, action revision, current-action kind,
requirement and trigger event, active provider IDs, phase, pending kind, and
component stack. No provider-specific route or UI protocol was added.

Regression coverage now parameterizes the empty-selection UI contract across
Benevolence, Ambushment, Lust, Prodigal Healer, and Betrothment, and preserves
the shared normalized defaults for optional target/card fields. Guan Yu and
Zhao Yun conversion modes remain on their existing shared controls and must be
kept in the next full UI audit.

Mounted React interaction coverage now performs the real activation rerender
for all five generic skills, checks the recovery boundary stays absent, tests
disabled empty selection, legal card/target selection, cancel/re-entry, and
asserts the exact generic trigger payload. The UI capability map includes the
projected Prodigal Healer and Betrothment providers; no server semantics or
private-card logging changed.

Recommended next work remains Lü Bu / Unrivaled semantic multi-response
handling, followed by the remaining correctness items below.

The Benevolence hand animation is corrected: eligibility styling no longer
applies a transform, while selected multi-select cards still rise from the
normal baseline. Render-source regressions cover the absence of the eligibility
transform and the retained selected-card rise. Gameplay semantics and normal
single-card selection are unchanged.

## Current state — Cao Cao Entourage + Sun Quan Deliverance correctness — 2026-09-30

Cao Cao `cao_cao_hujia` (Entourage) now requires `context.hero ===
"cao-cao" && context.role === "Lord"` in both option discovery and semantic
resolution. Sun Quan rescue handling now requires `target.hero ===
"sun-quan" && target.role === "Lord"` before applying Deliverance's second
point, while preserving First Aid and the canonical recovery/Dying pipeline.
Focused API coverage proves Lord delegation, non-Lord discovery and forged
resolution rejection, Wu/other-character Peach restrictions, max-HP capping,
and resumed Dying state. No provider-specific route or UI protocol was added.

The next gameplay bug-fix task is **Lü Bu / Unrivaled semantic multi-response**.

## Opponent frame asset integration — 2026-09-30

The opponent-frame production assets are now wired into the existing
`.player-square-${relativeIndex}` layout using CSS pseudo-elements, so no JSX
or player-state rendering was forked.

Seat mapping:
- `.player-square-1`: asymmetric frame, normal orientation,
- `.player-square-2`: symmetric frame,
- `.player-square-3`: asymmetric frame, decorative image mirrored only.

Fit was checked against the real CSS geometry. The player panel is fixed at a
2:3 aspect ratio, while the source frames are 493×512 and 506×512. Instead of
stretching those near-square assets to 2:3, the overlay height is 100% of the
player panel and its width is 144.4% (asymmetric) or 148.2% (symmetric). At the
maximum 180×270 panel this produces roughly 260×270 / 267×270 decorative boxes;
at a 100×150 mobile panel it produces roughly 144×150 / 148×150 boxes. The
horizontal overhang is visual only and has no pointer events.

No player positions, live content, targeting, state classes, card zones, or
hit areas changed. Next review should verify the deployed mobile portrait view
for ornament overlap before moving to the local-player frame.

## Approved board-background direction — 2026-09-30

The owner approved the latest board-background reference shown in chat as the
visual target for the real game board.

Approved visual content:
- dark forest-green / near-black ink texture,
- a large central enso / circular brush mark that is visibly readable,
- shadowed mountain silhouettes along the lower area,
- broad black ink-brush strokes entering from the corners/edges,
- restrained antique-gold flecks,
- quiet enough central contrast for player panels, deck/discard, cards, and
  animation overlays to remain readable.

Important production rule: do **not** use the uploaded presentation image
verbatim. The reference image contains presentation-only material that must not
be baked into the runtime board:
- the white header area,
- the "1. Board Background" title,
- the "War of the Three Kingdoms · UI Asset" label,
- the baked outer gold border.

Create/replace `public/assets/ui/game-board-bg.webp` with only the interior
board artwork. Keep `public/assets/ui/game-board-frame.svg` as the separate
outer frame; its portrait scaling fix using `preserveAspectRatio="none"` is
already deployed and working.

Target runtime layering remains:

```text
.play-table
  -> game-board-frame.svg   (separate decorative frame)
  -> game-board-bg.webp     (approved ink/enso/mountain artwork)
  -> existing live game UI
```

The current deployed `game-board-bg.webp` is considered too subtle/dark to
show the intended artwork clearly and should be replaced by this approved
direction before the visual pass is considered complete.

## Board frame portrait scaling fix — 2026-09-30

Deployed mobile review exposed an SVG scaling issue in the new board frame.
Although `.play-table` used `background-size: 100% 100%`, the SVG's
1672:941 viewBox still used the default `preserveAspectRatio="xMidYMid meet"`.
On the tall mobile board that preserved the landscape ratio and visually
letterboxed the ornament into a smaller centred rectangle.

The root SVG now declares `preserveAspectRatio="none"`. The frame therefore
stretches with the existing play-table box while leaving all current gameplay
DOM, anchors, z-index relationships, and interactions unchanged.

## Board visual skin integration — 2026-09-30

Step 1 of the approved staged UI integration is now implemented. The current
`.play-table` in `app/globals.css` uses two CSS background layers:
`game-board-frame.svg` on top and `game-board-bg.webp` below it. The frame
is sized to the table bounds and the artwork uses `cover`.

No JSX wrapper or decorative overlay node was added. This deliberately leaves
all existing measurement code in `TableResolutionSequence`, player anchors,
draw/discard anchors, equipment/judgement destinations, z-index behavior, and
pointer/touch handling untouched.

Recommended next work is Step 2 of the visual pass: integrate the shared card
visual system across both the local `.game-card` path and the shared
`CardFace` / `.played-card` path, then verify discard/equipment/judgement
sizes and sequence animations before continuing.

## Current state — 2026-09-30

The Standard hero implementation milestone is complete: **30/30 Standard heroes and 46/46 printed skills are implemented and enabled**. There is no remaining Standard hero implementation task.

The current codebase remains capability-driven: semantic `respond` / `decline_response` and `trigger` / `decline_trigger` actions, persisted continuations, canonical damage/Dying/recovery/Judgement pipelines, generic distance and target-legality capabilities, server-owned legality, private projection, stale/replay rejection, physical-card conservation, and Quick Test parity with normal multiplayer. Preserve these boundaries; do not solve interaction defects by adding hero-name branches to central rules when a generic capability/continuation fix fits.

## Real remaining gameplay work

### 1. Lü Bu / Unrivaled — fix generic semantic multi-response handling

This is the largest confirmed interaction defect. The current response layer uses `requirement.count = 2` and filters provider selections by physical selection count. Semantic response count must not be inferred from the number of physical cost cards.

Examples that must be correct after the fix:

- Serpent Spear: two physical cost cards create **one** semantic Attack, never two.
- Guan Yu God of War: one eligible red card creates one Attack and may satisfy one of two required Attacks.
- Zhao Yun Braveheart: one conversion creates one Attack or Dodge and may satisfy one unit of the requirement.
- Zhen Ji Empress Dowager: one eligible black card creates one Dodge and may be followed by another Dodge provider.
- Eight Trigrams: one successful Judgement creates one Dodge; if another Dodge is required, reopen the remaining requirement.
- Cao Cao Entourage and Liu Bei Influencing: one successful delegated response contributes one semantic response and may be followed by the remaining requirement.
- Ordinary physical responses, ordinary Duel, and Diao Chan Lust Duel must continue to work.

Required architecture: make the response continuation track **semantic responses remaining** independently of provider cost-card count. Each successfully resolved provider contributes the semantic response it actually creates, normally one; if a remainder exists, persist/reopen the response decision. Do not add Lü-Bu-specific branches to individual conversion/equipment/Lord-skill providers.

Required regression coverage: ordinary + converted mixed responses, Serpent Spear, Guan Yu, Zhao Yun, Zhen Ji, Eight Trigrams, Entourage, Influencing, normal Duel, Diao Chan Lust Duel, reload, stale/replay rejection, privacy, and physical-card conservation.

### 4. Huang Gai / Self Sacrifice — verify 1 HP timing, then fix if confirmed

Current active-skill execution is represented as `lose_draw`; the audited route currently draws before completing the lethal HP-loss/Dying boundary when Huang Gai starts at 1 HP. This may expose the newly drawn cards before rescue.

Before changing code, verify the exact WTK ruling for Self Sacrifice at 1 HP. If the intended order is HP loss before draw, implement it through a persisted continuation: lose 1 HP; if still alive, draw 2; if HP reaches zero, enter canonical Dying/rescue; after successful rescue, resume the suspended Self Sacrifice and draw 2. Reuse the generic HP-loss/Dying continuation style already used by Pan Feng rather than introducing a Huang-Gai-specific Dying engine.

### 5. Sima Yi / Retaliation — make Hand acquisition server-random

The rules treat obtaining a card from another character's Hand as random, while public Equipment/Judgement cards may be selected deliberately. The current implementation hides Hand identities but allows an opaque positional Hand choice, so the server is not actually choosing the Hand card randomly.

Required work: when Retaliation chooses the Hand zone, make the authoritative server randomly choose one current Hand card. Keep exact selection for public Equipment/Judgement cards. Preserve private projection, live-zone revalidation, stale safety, and physical-card conservation.

## Rules interpretation intentionally left unresolved

Do not change the source zones for Guan Yu God of War, Zhen Ji Empress Dowager, Gan Ning Ambushment, Da Qiao Captivating, or Hua Tuo First Aid solely because the English card wording says “a card”. The current project reference records deliberate Hand-zone interpretations for some of these, and the available rule material does not clearly resolve every source-zone case. Require an explicit WTK ruling/source before changing them.

## Execution order and next work

Complete the remaining work in this order: **(1) generic Unrivaled/multi-response correction; (2) verify and, if confirmed, fix Huang Gai timing; (3) Sima Yi random-Hand hardening.**

After each correction, add focused deterministic regressions and run the relevant API/capability suites. Do not reduce the implementation status from **30/30 heroes / 46/46 skills**; these are corrections to completed skills.

**After these confirmed gameplay bugs are closed, the next active product work is UX improvement.** Review the actual normal-multiplayer and Quick Test flows and turn the findings into a small functional UX backlog covering action/turn clarity, decision prompts, card and target selection, response/trigger controls, waiting states, mobile/touch usability, feedback for rejected/stale actions, setup/hero selection, match-end flow, and Quick Test perspective switching.

Keep the larger Standard integration matrix and end-to-end/release hardening as **future TODO testing phases**, as defined in `ROADMAP.md`. Graphic/art redesign is separate from functional UX work unless explicitly requested.

## Out of scope for this handover

Historical hero-by-hero implementation stages, old “next hero” recommendations, intermediate completion counts, completed artwork intake, completed UI handovers, and already-pushed commit instructions have been removed from this file because they are no longer actionable. Expansion heroes and graphic-design work are not part of the current gameplay handover.
