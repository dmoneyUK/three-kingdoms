# War of Three Kingdoms

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

The current verified priorities are:

1. **Lü Bu / Unrivaled:** correct generic multi-response handling so semantic Attack/Dodge count is independent of provider physical-card cost. This includes conversions, Serpent Spear, Eight Trigrams, delegated responses, normal Duel, and Diao Chan Lust.
4. **Huang Gai / Self Sacrifice:** verify the authoritative 1-HP timing; if confirmed, make lethal HP loss enter canonical Dying/rescue before the suspended draw resumes.
5. **Sima Yi / Retaliation:** make hidden-Hand acquisition server-random while keeping public Equipment/Judgement selection exact.

After these items are closed, run a final Standard cross-hero/card interaction regression pass.

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
