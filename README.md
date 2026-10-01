# War of Three Kingdoms

## Hero artwork update — 2026-10-01

Replaced the eight supplied portraits through the shared
`HERO_ART_BY_ID` / `HeroPortrait` renderer: Photo 1 is Liu Bei, Photo 2 is
Zhuge Liang, Photo 3 is Ma Chao, Photo 4 is Zhao Yun, Photo 5 is Guan Yu,
Photo 6 is Zhang Fei, Photo 7 is Huang Yueying, and Photo 8 is Lady Gan. The
shared renderer applies the artwork in hero selection, locked-in selection,
the local hero dock, and opponent cards.

This is a presentation-only update: gameplay rules, projections, selection
legality, layout dimensions, and semantic actions are unchanged.

## Hero artwork update — 2026-10-01

Replaced the Xiahou Dun portrait at `public/hero-xiahou-dun.jpg`. It remains
connected through the shared `HERO_ART_BY_ID` / `HeroPortrait` renderer, so the
new artwork appears in hero selection, locked-in selection, the local hero
dock, and opponent cards.

This is a presentation-only update: gameplay rules, projections, selection
legality, layout dimensions, and semantic actions are unchanged.

## Gameplay correctness — Lü Bu / Unrivaled semantic multi-response — 2026-10-01

Response requirements now count remaining semantic Attack/Dodge responses,
independently of each provider's physical card cost. Generic settlement
decrements and reopens the same continuation when another response remains,
preserves the semantic requester across delegation, and applies the same path
to Eight Trigrams Judgement and Duel/Lust. Conversions and Serpent Spear each
contribute one semantic response with their own physical cost.

Regression coverage protects sequential ordinary/conversion Dodges, Eight
Trigrams, delegated responses, Duel provider mixtures, reload/stale safety,
actor ownership, private choices, and exact physical-card conservation. The
full fast/API suite and existing Guo Jia/Sima Yi and Lord regressions remain
green.

Current stage remains Stage 7 product polish with Standard gameplay correctness
maintained. Huang Gai and UX work remain outside this change; the next
milestone is the next separately confirmed Standard gameplay correction.

## Gameplay correctness — Sima Yi Retaliation random Hand hardening — 2026-10-01

Retaliation now projects the source Hand as one opaque `hand` zone choice;
the client cannot choose `hand:0`, `hand:1`, or another physical Hand index.
The existing 746adc5 button-to-selection-window UX is unchanged. Equipment
and Judgement cards remain individually selectable by their visible IDs.

The server revalidates the live source Playing Area after the trigger request,
chooses a random physical Hand card with server-side randomness, and then
performs the existing atomic continuation, private transfer, stale safety, and
card-conservation flow. API and mounted UI regressions cover the opaque zone,
privacy, forged indexes, vanished Hands, exact public-card selection, and
idempotent concurrent submission.

Current stage remains Stage 7 product polish with Standard gameplay correctness
maintained. The next gameplay milestone remains the existing generic Lü Bu /
Unrivaled semantic multi-response correction.

## Hero artwork update — 2026-10-01

Added and replaced the two supplied portraits through the shared
`HERO_ART_BY_ID` / `HeroPortrait` renderer: Photo 1 is Pan Feng and Photo 2
replaces Zhuge Liang. The shared renderer applies the artwork in hero selection,
locked-in selection, the local hero dock, and opponent cards.

This is a presentation-only update: gameplay rules, projections, selection
legality, layout dimensions, and semantic actions are unchanged.

## Gameplay correctness — Guo Jia Eight Trigrams Judgement lifecycle — 2026-10-01

Fixed the post-Judgement trigger ownership boundary for Eight Trigrams
Formation. Guo Jia's red or black Eight Trigrams Judgement now reaches the
generic `judgement_effective` continuation and can offer Jealousy of God even
when another seat owns the active turn. The final card still controls whether
the Attack is Dodged; accepting Jealousy only obtains that final physical card.

Regression coverage includes all four suits, Sima Yi replacement, non-Guo Jia
Eight Trigrams, Raining Arrows continuation, private Jealousy ownership, and
exact card conservation. The next milestone remains the existing generic Lü
Bu / Unrivaled semantic multi-response correction.

## Gameplay correctness — Diao Chan Beauty skill-control fix — 2026-10-01

Mapped `diao_chan_beauty_outshining_moon` into Diao Chan's existing Skills
panel routing. Beauty Outshining the Moon now remains visible beside the hero
profile when unavailable, becomes enabled for the projected optional
`turn_end` trigger, submits the unchanged semantic `trigger` action, and no
longer appears as a duplicate generic turn control. Lust and all server-side
Beauty behavior are unchanged.

Mounted interaction coverage protects the single profile control, exact
provider submission, optional Skip, and disabled-unavailable state. The
existing Diao Chan API coverage remains unchanged and green.

Current stage remains Stage 7 product polish with Standard gameplay
correctness maintained. The next gameplay milestone remains the existing
generic Lü Bu / Unrivaled semantic multi-response correction.

## Gameplay correctness — Da Qiao Deflection review closure — 2026-10-01

The Deflection UI now keeps the profile skill button as the only
Deflection-labelled activation control. After activation, the shared
card/target hero-skill mode presents a generic `Confirm` button, with the
server-projected Hand or Equipment cost and replacement target still
authoritative. Mounted coverage explicitly checks the before/after one-button
contract, disabled-until-complete Confirm states, exact semantic submission,
and optional Skip.

The mounted suite also protects the important fallback boundary: an unmapped
provider in an `attack_targeted` trigger remains in the generic trigger
controls while mapped `daqiao_deflection` stays in the profile Skills panel.
The test-only `seedPlayingGame` fixture retains normal five-character room
codes and retries D1 `rooms.code` uniqueness conflicts inside the fixture
endpoint, preventing parallel API tests from failing on random collisions.

This remains the same Da Qiao Deflection fix round; no Lü Bu / Unrivaled work
was started.

## Gameplay correctness — Sima Yi Retaliation activation UX — 2026-10-01

Fixed Retaliation so a projected `sima_yi_fankui` target-card trigger first
appears as an enabled, optional Sima Yi Skills-panel button. The target-card
picker now opens only after the player activates Retaliation; activation and
cancel/re-entry never submit a server action, and the existing generic
`trigger` payload remains the final submission contract.

The shared action-revision reset clears the active provider and selected card
keys. Mounted interaction coverage protects the initial no-picker state,
optional Skip, activation, eligible-card selection, cancel/re-entry, stale
revision clearing, and exact `cardKeys` submission. Unmapped target-card
providers retain the generic picker path. No server rules, private projection,
or provider-specific route changed.

Current stage remains Stage 7 product polish with Standard gameplay correctness
maintained. The next gameplay milestone remains the existing generic Lü Bu /
Unrivaled semantic multi-response correction; no unrelated hero or refactor was
started.

## Gameplay correctness — Guo Jia Legacy distribution UI — 2026-10-01

Fixed the Legacy private card-distribution presentation. The two cards now
remain fully visible for the lifetime of the unresolved `card_distribution`
decision, including while recipients are selected or a failed submission is
shown. The existing server-owned private projection, physical-card transfer,
per-damage-point repetition, and retry behavior are unchanged.

Legacy recipient choices now display living hero/general names while retaining
player IDs as the submitted recipient values. A focused frontend regression
protects the static CardFace presentation and the hero-name option contract.

The next milestone remains the existing generic Lü Bu / Unrivaled semantic
multi-response correction; no new hero or backend Legacy work was started.

## Gameplay correctness — Da Qiao Deflection UI/recovery fix — 2026-09-30

Fixed the Da Qiao Deflection interaction so the mapped semantic
`daqiao_deflection` provider is routed through the existing hero-skill panel,
including `attack_targeted` trigger windows. The profile button is the only
Deflection activation control; the generic footer still renders unrelated or
unmapped trigger providers and keeps optional Skip available.

The shared card/target selection mode accepts exactly one server-projected Hand
or Equipment cost and one projected replacement target, preserves privacy and
stale action-revision clearing, and submits the canonical `trigger` action.
The production Recovery crash was a React temporal-dead-zone error: the
generic footer selected Deflection, then `localEquipmentSelection` read
`responseDecisionReady` before its later declaration during the rerender.
The response-readiness derivation now precedes all selection consumers.

Mounted GameRoom coverage reproduces the attack-targeted trigger, asserts the
single enabled profile button, hand/equipment selection, projected target
legality, cancel/re-entry, Skip, stale revision reset, exact generic payload,
and absence of the Recovery screen. An unmapped attack-targeted provider
continues to use the generic trigger controls. No gameplay route or server
Deflection logic changed.

The Standard completion count remains **30/30 heroes and 46/46 skills**. The
next gameplay milestone remains generic Lü Bu / Unrivaled semantic
multi-response handling; no new hero or artwork work was started.

## Gameplay correctness — Huang Yueying Cultivation UI correction — 2026-09-30

Confirmed and fixed the shared Cultivation interaction for both
Overindulgence and Burning Bridges. Huang Yueying's projected
`huang_yueying_cultivation` trigger now has a Skills-panel route that submits
the canonical `trigger` action, while optional unmapped trigger providers stay
available through the generic trigger controls. The command prompt now derives
the acting trigger option and shows the authoritative trigger actor's decision
instead of falling through to the Attack-response waiting message.

Mounted `GameRoom` coverage verifies enabled Use Cultivation and Skip controls,
private opponent projection, the corrected prompt, actor ownership, original
continuation rendering, normalized optional-trigger punctuation, and the
generic unmapped-trigger fallback. API coverage
verifies accepting one private draw for Overindulgence and Burning Bridges,
Negation/target-card continuation, stale and decline safety, reload/privacy,
Quick Test ownership, refill behavior, and physical-card conservation.

The Standard completion count remains **30/30 heroes and 46/46 skills**. The
next gameplay milestone remains generic Lü Bu / Unrivaled semantic
multi-response handling; no new hero or artwork work was started.

## Hero artwork update — 2026-09-30

Added the supplied Lu Xun portrait at `public/hero-lu-xun.jpg` and connected
it through the shared `HERO_ART_BY_ID` / `HeroPortrait` renderer. The artwork
appears in hero selection, locked-in selection, the local hero dock, and
opponent cards.

This is a presentation-only update: gameplay rules, projections, selection
legality, layout dimensions, and semantic actions are unchanged.

## Gameplay correctness — shared active hero-skill UI recovery — 2026-09-30

Fixed the shared React render regression that affected Liu Bei Benevolence and
Gan Ning Ambushment/Qixi immediately after activation. The active-skill
selection state now renders safely with zero selected cards and targets before
the player completes the projected selection. The fix is shared across the
generic active-skill path; it does not add hero-specific workarounds.

Live React UI reproduction covered both heroes and produced the same
`presentationBusy` initialization exception and `GameRoom` component stack.
Parameterized render coverage now protects Benevolence, Ambushment, Lust,
Prodigal Healer, and Betrothment selection states, including empty payload
normalization and recovery-screen exclusion. The render boundary diagnostics
also include action revision, current-action requirements, active provider IDs,
hero, and component stack without card identities.

Mounted React interaction coverage now clicks each of those five generic active
skills, verifies the zero-selection disabled state, exercises legal card and
target selection, cancel/re-entry, and checks the exact generic trigger
payload. The UI capability map now exposes Prodigal Healer and Betrothment for
their projected providers; server gameplay semantics are unchanged.

The next gameplay bug-fix milestone remains Lü Bu / Unrivaled semantic
multi-response handling.

Corrected Benevolence hand presentation so `hero-skill-eligible` keeps only
its eligibility border/glow and does not move every eligible card. The existing
multi-select selected-card rule remains responsible for the upward rise;
render-source regression coverage protects both contracts. Normal card
selection and Benevolence logic are unchanged.

## Opponent frame anchoring fix — 2026-09-30

Fixed the first opponent-frame integration after mobile review showed the frame
art was not visible around the individual player panels. The pseudo-elements
were absolutely positioned but `.player-square` was not a positioned
containing block, so their percentage geometry was resolving against an outer
ancestor instead of each player card.

`.player-square` now explicitly uses `position: relative`. The previously
calculated frame fit (144.4% asymmetric / 148.2% symmetric width at 100%
panel height) is unchanged. This is a presentation-only correction; player
positions, hit areas, targeting, live content and gameplay logic are unchanged.

## Gameplay correctness — Cao Cao Entourage + Sun Quan Deliverance — 2026-09-30

Corrected the missing Lord-role gates for Cao Cao's Entourage and Sun Quan's
Deliverance. Entourage now requires authoritative Lord status in both semantic
provider discovery and resolution, preserving delegated-response ownership,
privacy, ordering, and stale safety. Deliverance now additionally requires
Lord Sun Quan while retaining the existing Wu-rescuer, other-character,
First Aid, max-HP, and canonical Dying/recovery behavior.

Focused API regressions cover Lord and non-Lord discovery/resolution, faction
and ownership restrictions, capping, and Dying continuation. The next
gameplay bug-fix milestone is Lü Bu / Unrivaled semantic multi-response.

## Opponent frame asset integration — 2026-09-30

Applied the approved opponent-frame assets without changing the existing player
layout or hit areas. Left/right seats use
`other-player-frame-asymmetric.webp`; the top seat uses
`other-player-frame-symmetric.webp`, and only the right decorative layer is
mirrored.

The frame bitmaps are near-square (493×512 and 506×512) while the live opponent
panels remain 2:3. To avoid deforming the ornament, CSS matches frame height to
the player panel and lets the art extend horizontally: 144.4% width for the
asymmetric frame and 148.2% for the symmetric frame. Decorative pseudo-elements
use `pointer-events: none`; player content, target controls, state borders and
gameplay logic remain unchanged.

## Board frame portrait scaling fix — 2026-09-30

Corrected the staged board-frame integration after deployed mobile review showed
the gold frame compressed into a smaller landscape rectangle in the centre of
the portrait play area. The SVG source viewBox is landscape (1672:941), and its
default SVG aspect-ratio preservation caused internal letterboxing even though
CSS requested `background-size: 100% 100%`.

`game-board-frame.svg` now uses `preserveAspectRatio="none"`, allowing the
decorative frame to follow the real `.play-table` bounds on portrait and
desktop layouts. This is presentation-only; no gameplay layout or animation
anchors changed.

## Board visual skin integration — 2026-09-30

Started the staged UI asset integration with the lowest-risk board foundation.
The existing `.play-table` now renders `game-board-bg.webp` as the cover
background and `game-board-frame.svg` as a full-size upper background layer.
Both layers live entirely in CSS behind the current gameplay DOM, so no player,
deck/discard, LocalPlayerDock, response flow, hidden-information behavior, or
card-flight/landing anchor was changed.

This is intentionally only Step 1 of the staged visual pass. Card frames,
opponent frames, the local-player frame, and the secondary button remain
unapplied for now; blocked/missing primary/deck/destructive assets are still not
substituted.

Current stage: Stage 7 product polish, board skin applied; continue the visual
pass incrementally with regression checks between steps.

A web implementation of the **WTK Standard** ruleset, built around authoritative server-side game state and semantic capability-driven actions.

## Gameplay correctness — cross-phase active-skill target selection — 2026-09-30

Fixed the shared opponent targeting UI so semantic active hero skills can
select projected character targets outside the Play Phase. Zhang Liao Assault
now enters generic target-selection mode during its Draw Phase trigger: only
server-projected live targets are selectable, selected opponents use the
existing target treatment, and the generic `trigger` payload carries one or
two character IDs. Ordinary Play Phase targeting and inactive opponent hero
inspection remain unchanged. Assault continues to resolve hidden Hand cards
server-side without exposing opponent Hand identities.

Mounted GameRoom coverage protects activation, inspection-vs-selection button
semantics, one/two-target selection, invalid-target rejection, exact semantic
submission, and cancel/re-entry reset behavior.

## Current status — 2026-09-30

The Standard gameplay foundation is implemented:

- **30 / 30 Standard heroes** are implemented and selectable.
- **46 / 46 printed Standard hero skills** are implemented.
- **28 / 28 verified Standard card identities** are playable.
- The canonical **108-card Standard deck** is implemented.
- Core turn flow, responses, triggers, damage, Dying/rescue, recovery, Judgement, delayed Stratagems, equipment interactions, match outcome, private projections, stale-action rejection, and Quick Test infrastructure are implemented.

The hero-implementation milestone is closed. Remaining Standard work is interaction correction and hardening of already implemented rules rather than adding more Standard heroes.

See:

- `ROADMAP.md` for the active priorities.
- `HANDOVER.md` for implementation details and known remaining defects.
- `docs/STANDARD_HERO_REFERENCE.md` for the complete Standard hero/skill reference.
- `docs/OFFICIAL_CARD_REFERENCE.md` for the verified Standard card reference.
- `docs/STANDARD_108_DECK_MANIFEST.md` for the physical deck manifest.

## Active gameplay work

The Cao Cao/Sun Quan Lord-role correction, Lü Bu/Unrivaled semantic
multi-response correction, and Sima Yi/Retaliation random-Hand hardening are
complete. The remaining gameplay-correction gate is **Huang Gai / Self
Sacrifice**: the project’s authoritative references do not establish whether
the 1 HP loss is completed before the two-card draw. No gameplay change has
been made pending that ruling.

After this ruling is resolved and, if required, implemented and validated,
functional UX improvement becomes the next active work.

The Standard completion count remains **30/30 heroes and 46/46 skills** while these interaction defects are corrected.

## Gameplay architecture

The supported gameplay protocol is semantic and capability-driven.

- `currentAction` is the authoritative client decision contract.
- Responses use generic `respond` / `decline_response` actions.
- Triggered and active capabilities use generic `trigger` / `decline_trigger` actions.
- Persisted continuations resume interrupted Attack, Duel, group-card, damage, Dying, recovery, Judgement, equipment-loss, and hero-skill flows.
- Legality is owned and revalidated by the server.
- Private Hand/provider choices are projected only to the acting seat.
- Stale and replayed decisions are rejected.
- Physical card identity and conservation are preserved through conversions and continuations.
- Quick Test uses the same human-style game rules and seat ownership as normal multiplayer.

New rules should extend these generic boundaries rather than introduce hero/card-specific HTTP actions or a second rules engine.

## Standard rules scope

The active ruleset is **WTK Standard**. Expansion sets such as Endless Legends and Kingdom Wars are outside the active gameplay roadmap unless scope is explicitly changed.

The project uses the official WTK Standard rulebook/card references recorded in the repository as the rules and terminology basis. Where a wording interpretation remains unresolved, do not silently change the implementation without explicit WTK evidence.

One currently parked interpretation concerns the source zone for cards used by Guan Yu God of War, Zhen Ji Empress Dowager, Gan Ning Ambushment, Da Qiao Captivating, and Hua Tuo First Aid. Their existing Hand-zone interpretations should remain until an explicit ruling/source resolves them.

## Development

Requirements:

- Node.js **22.13.0 or newer**
- npm

Install dependencies:

```bash
npm install
```

Run locally:

```bash
npm run dev
```

Build:

```bash
npm run build
```

Run the fast tests:

```bash
npm run test:fast
```

Run the API suite:

```bash
npm run test:api
```

Run the complete validation test command:

```bash
npm test
```

Lint:

```bash
npm run lint
```

Before release, run:

```bash
npm run build
npm test
npm run lint
git diff --check
```

## Deployment

Production deployment is handled through the repository's GitHub Actions / Cloudflare workflow. The repository instructions in `AGENTS.md` are authoritative for contribution, validation, and deployment requirements.

Do not deploy through ChatGPT Sites.

## Project documentation

`README.md` is intentionally a **current-state overview**, not a chronological implementation log. Historical hero-by-hero milestones, intermediate completion counts, completed UI task briefs, artwork intake notes, and old “next hero” instructions should not be re-added here.

Detailed current work belongs in `HANDOVER.md` and `ROADMAP.md`. Stable rule/reference material belongs under `docs/`.
