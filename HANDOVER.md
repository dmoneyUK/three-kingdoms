# Three Kingdoms — current handover

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
