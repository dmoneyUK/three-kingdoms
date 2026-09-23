# Three Kingdoms project handover

## Opponent board arc, unclipped zones, and inspection — 2026-09-24

The mobile opponent board remains driven by the existing `relativeIndex`
mapping in `app/page.tsx` (`1=left`, `2=top`, `3=right`). The appended table
rules in `app/sequence-overrides.css` convert those seats to one responsive
absolute arc: shared `--opponent-seat-x`, `--top-seat-y`, and `--side-seat-y`
variables keep left/right symmetric, while the centred `.play-center` uses a
lower `clamp(290px, 66%, 520px)` anchor. The local player dock and its CSS were
not changed.

The previous compact-card clipping came from the opponent card/hero wrapper,
zone row, and child row combining `overflow: hidden` with a `max-height: 34%`
constraint. The public zone override permits visible height and wrapping, so
multiple miniature Equipment/Judgement cards retain their 2:3 shape instead
of being cropped or laid over one another.

`expandedOpponentId` is presentation-only React state. An opponent hero tap
opens one bounded battlefield inspection layer; its hero tap closes it, and
the layer shows full `CardFace` cards in separately labelled Equipment and
Judgement Zone sections. Compact and expanded card info controls stop event
propagation. `targetSelectionActive` is computed from the existing selected
card/skill/trigger state, so target clicks continue to call `onTarget`; the
inspection handler is used only when no target-selection mode is active. Any
inspection is cleared when target selection begins, and the layer is bounded
to the table so it cannot cover the local action dock or leave a hitbox behind.

`tests/room-safety-render.test.mjs` now protects the seat variables, pile
anchor, public-zone overflow/wrapping rules, inspection state and markup,
info-button propagation, and target-selection priority. The live browser
review at 390px, 393px, 402px, and 430px was attempted but was blocked by the
shared Mac lock; those viewport-specific visual checks remain recommended on
an unlocked device. Other player counts retain the same relative seat classes
and no server/rules/projection code was changed.

Validation status for this pass: build passed; fast render/regression tests
passed 39/39; all 106 API tests passed across four shards; lint and
`git diff --check` passed. An earlier API attempt hit a temporary Wrangler
inspector-port collision from the dev server, then the full suite passed after
that server was stopped. Recommended next work is unlocked-device visual
review and final graphic/theme polish with approved artwork intake for
remaining fallback heroes.

## Current focus — LocalPlayerDock final follow-up

Repository: `dmoneyUK/three-kingdoms`

Current implementation is based on commit:

`9c4e3aed23a8d1a5512c82c2f17ac3a32f9f2b3f` — **Resize local player panel layout**

The LocalPlayerDock redesign is mostly complete. Do not rebuild it from scratch.

### Current approved mobile layout

At phone widths (`<=480px`):

- Local hero column: `70px`
- Local hero card:
  - fills available hero-column width
  - `height: auto`
  - `aspect-ratio: 2 / 3`
  - must not be vertically stretched
- Hero overlay contains:
  - HP
  - hearts
  - role
  - hero name
- Role text is intentionally more prominent than HP/hearts.
- Hero skills are no longer below the hero image.
- Hero skills render vertically in the former Status panel.
- Skills panel uses all flexible width between Hero and Equipment.
- Equipment is immediately left of Judgement.
- Judgement is the final/rightmost top-row panel.
- Top Skills / Equipment / Judgement row: `58px`
- Hand panel: `108px`
- Hand visible/peek height target: `102px`
- Physical hand-card height remains `102px`
- Mobile action/message row: `48px`
- Opponent panels, board geometry, Draw pile and Discard pile must remain unchanged.

Relevant files:

- `app/page.tsx`
- `app/sequence-overrides.css`
- `tests/room-safety-render.test.mjs`

## Required follow-up 1 — Use the full Hand panel height

Status: implemented — review requested.

The deployed screenshot shows an unnecessary black strip below the normal hand cards.

Current CSS:

```css
--hand-panel-height: 108px;
--hand-peek-height: 102px;
--hand-card-height: 102px;
```

The physical cards are already `102px` tall, and normal `.card-slot` elements
now use the full `--hand-peek-height` with `overflow: hidden`, so the existing
102px cards are fully revealed.

Do not enlarge the cards and do not increase the Hand panel.

Change only:

```css
--hand-peek-height: 102px;
```

Keep:

```css
--hand-panel-height: 108px;
--hand-card-height: 102px;
```

The intent is to use the existing black/empty space to reveal the already-existing full physical card height.

Verify:

- normal hand cards show their full `102px` height
- physical card size does not change
- Hand panel remains `108px`
- selected-card rise still works
- selected card does not cover the action row
- card info button remains usable
- horizontal card compression/distribution remains unchanged
- no new overflow appears

```text
--hand-peek-height: 102px
```

## Required follow-up 2 — Fix responsive Judgement spacing

Status: implemented — review requested.

The previous code in `LocalPlayerDock` used a hard-coded card width:

```tsx
style={{
  marginLeft:
    index === 0
      ? 0
      : `${judgementCardLayout.step - 34}px`
}}
```

This is incorrect because the actual Judgement/Equipment card width is responsive:

```css
--zone-card-width: clamp(28px, 7.6vw, 34px);
```

The component already measures the current card width in `judgementCardWidth`.

Change the spacing calculation to use that measured value:

```tsx
style={{
  marginLeft:
    index === 0
      ? 0
      : `${judgementCardLayout.step - judgementCardWidth}px`
}}
```

Do not otherwise redesign the approved LocalPlayerDock.

Review result — 2026-09-24: the live responsive review passed at approximately
320px, 390px, and 430px. The hero stayed 2:3, the Hand panel stayed `108px`,
physical hand cards stayed `102px`, the action row stayed `48px`, and document
width matched the viewport. One Judgement card centered correctly, two fit
naturally, and three overlapped within the fixed panel using the measured card
width. No remaining visual issue was found for these follow-ups.

## Required follow-up 3 — Hero skill response UI uses Skills panel + Confirm / Skip

Status: implemented — review requested.

The deployed Zhen Ji Dodge-response screenshot exposes an inconsistent UI path:

- The Skills panel shows `Empress Dowager` and `Godess of Luo River`, but they are disabled.
- The bottom response row separately shows provider-specific actions such as `Use Empress Dowager as Dodge` and `Play Dodge`.

This happens because the Skills panel is driven by `heroSkillButtons`, which currently resolves most generic skills through `HERO_SKILL_EFFECT_IDS` + Play Phase `activeSkillOptions`. Zhen Ji is not mapped there. Empress Dowager is instead implemented as the explicit response provider `zhen_ji_black_card_dodge` and is projected through `currentAction.options`, so only the bottom response controls currently see it.

The approved interaction model is:

```text
Hero Skills panel / hand = choose HOW to respond
Bottom response row      = CONFIRM | SKIP
```

During a Dodge response:

- A legal hero response skill becomes enabled in the Skills panel.
- Tapping the skill selects/activates that response provider.
- The active skill button is visually highlighted.
- The player selects the required eligible card(s) from hand if the provider needs a card cost.
- A normal physical Dodge is selected directly from the hand without a separate `Play Dodge` button.
- The bottom response row contains only `CONFIRM` and `SKIP`.
- `CONFIRM` is disabled until the selected response path is complete and legal.
- `SKIP` declines the response where decline is legal.

For Zhen Ji specifically:

- Enable `Empress Dowager` when `currentAction.options` contains provider `zhen_ji_black_card_dodge`.
- Tapping `Empress Dowager` should set/select that provider using the existing `responseProviderId` state.
- Only eligible black cards may then be selected.
- Tapping the active skill again should cancel that provider and clear incompatible provider-specific selection.
- `Godess of Luo River` remains disabled unless its own trigger is currently legal.

Remove duplicate provider-activation buttons from the bottom response row, including examples such as:

- `Use Empress Dowager as Dodge`
- `Play Dodge`
- `Use Braveheart as Dodge`
- equivalent response-provider activation buttons

Implementation result — the shared UI now maps legal response providers from
`currentAction.options` into the existing Skills panel for Empress Dowager,
Entourage, Influencing, God of War, and Braveheart. Physical responses remain
selected directly from the projected hand cards. The bottom response row uses
the generic `Confirm` and `Skip` controls, while optional turn triggers such as
Godess of Luo River continue to use the same projected trigger capability in
the Skills panel. No gameplay, route, or backend projection code changed.

Review result — 2026-09-24: rendered regressions passed for Zhen Ji's legal
Empress Dowager response, physical Dodge selection, Zhao Yun's Braveheart
response, Cao Cao/Liu Bei response mappings, and Zhen Ji's optional Luo River
trigger. The live Quick Test review showed Godess of Luo River enabled only
when its trigger was projected, Empress Dowager disabled outside a Dodge
response, and the trigger footer reduced to `Skip`; response render coverage
confirmed `Confirm`/`Skip` with no duplicate `Use Empress Dowager as Dodge` or
`Play Dodge` controls.

The bottom row should not decide the provider. It should only complete or decline the already selected response.

Preserve the normal Play Phase controls:

```text
PLAY | END
```

This response simplification applies only to contextual response decisions.

This is a **global Hero Skill UI rule**, not a Zhen Ji-specific fix.

For ALL heroes:

1. If a hero skill is currently legally usable, its button in the Hero Skills panel must become enabled from the canonical projected capability.
2. Clicking an active/optional hero skill starts that skill's interaction mode.
3. Any required card, target, or choice is then selected in the normal hand/board UI.
4. For contextual decisions, the bottom row is only `CONFIRM | SKIP`.
5. Do not duplicate the same hero skill as another activation button in the bottom action row.
6. Passive skills remain visible but do not become clickable unless they actually require a player decision.
7. Trigger skills enable only during their legal trigger window; if they require a follow-up selection, use `CONFIRM | SKIP` after selection.
8. Play Phase skills activate from the Hero Skills panel; normal Play Phase bottom controls remain `PLAY | END`.
9. Response skills activate from the Hero Skills panel; normal physical response cards are selected directly from hand; bottom controls are `CONFIRM | SKIP`.

Apply this consistently to all implemented heroes, not only Zhen Ji, Guan Yu, Zhao Yun, Cao Cao, or Liu Bei.


Prefer deriving hero skill availability from the canonical projected capabilities for the current action (`currentAction.options` / `triggerOptions`) rather than maintaining a separate UI-only availability model that can drift from the server projection.

Review the same pattern for other response-capable skills/providers, especially:

- Zhen Ji — Empress Dowager
- Guan Yu — God of War
- Zhao Yun — Braveheart
- Cao Cao / Liu Bei lord-response skills where applicable

Do not change gameplay semantics or backend rules unless a missing capability projection is actually discovered.

Required regression coverage:

- Empress Dowager Skills-panel button enables during a legal Dodge response.
- Clicking it selects `zhen_ji_black_card_dodge`.
- The button shows an active state.
- Only eligible black cards can be selected for that provider.
- Normal Dodge card selection still works.
- Bottom response UI contains only `CONFIRM` and `SKIP`.
- No duplicate provider-specific activation button is rendered.
- `CONFIRM` is disabled until the selected response is complete.
- Switching between a hero-skill provider and a physical response clears incompatible stale selection.
- `SKIP` still performs the existing decline action.
- Play Phase still renders `PLAY` / `END`.
- Hero skill buttons are disabled when their canonical capability is not currently legal.
- Add representative coverage for the architecture, not only Zhen Ji:
  - at least one response skill
  - at least one trigger skill
  - at least one Play Phase skill
  - at least one passive skill
- The representative tests should prove that skill availability comes from the current canonical projected capability and that passive skills do not become interactive accidentally.

## Required visual checks

Review approximately:

- 320px
- 390px
- 430px

Confirm:

1. Hero card remains 2:3 and is not stretched.
2. Skills remain vertically stacked.
3. Equipment remains directly to the left of Judgement.
4. Judgement remains flush with the right edge.
5. One Judgement card centres correctly.
6. Two Judgement cards fit naturally in the fixed Judgement panel.
7. Three or more Judgement cards overlap correctly.
8. Hand panel remains `108px`.
9. Normal hand cards use the full existing `102px` card height.
10. The previous black strip below normal hand cards is removed or reduced to panel padding/border only.
11. Physical hand cards are not enlarged.
12. Selected hand card behaviour still works.
13. Action row remains `48px` on mobile.
14. No horizontal page overflow.
15. Opponents, board, Draw and Discard remain unchanged.
16. Legal response hero skills enable in the Skills panel.
17. Response bottom row shows only `CONFIRM` and `SKIP`.
18. `CONFIRM` enables only for a complete legal response selection.
19. Normal Play Phase still shows `PLAY` and `END`.

## Validation required before completion

Run all of:

```bash
npm run build
npm test
npm run lint
git diff --check
```

Do not mark this task complete unless all four pass.

After validation, report:

- files changed
- exact Hand peek-height change
- exact Judgement spacing fix
- hero-skill response wiring changes
- response bottom-row simplification to `CONFIRM` / `SKIP`
- build result
- test result
- lint result
- `git diff --check` result
- any remaining visual issue

## Scope guard

Do not make unrelated refactors.

Do not change:

- gameplay rules
- card legality
- target legality
- distance calculation
- equipment semantics
- judgement rules
- hero skill legality
- response flow
- role privacy
- semantic action API
- opponent panel layout
- Draw / Discard presentation
