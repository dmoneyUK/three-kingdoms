# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

Current task authority. Long-lived decisions/history: `docs/AUTONOMOUS_UI_ROADMAP.md`. Workflow: `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`.

## Latest result

### UX2.0VIS-10A — Short-portrait Top Row Stage containment

Status: `COMPLETED BY AGENT — CI GREEN`
Final tested revision: `b107ca2dde5cb58ff2e264ca45b5fbbe61db4033`
CI run: [37200561740](https://github.com/dmoneyUK/three-kingdoms/actions/runs/37200561740) — `build-and-test` and `deploy` succeeded, including production smoke test.

Focused browser validation: 40/40; targeted ESLint and `git diff --check` passed. CI caught a desktop 1440×900 geometry regression from a broad height query and a stale overflow expectation; the query is now mobile-width-scoped and the probe verifies compact containment. Human Reviewer acceptance remains separate.

## Current task

### UX2.0VIS-10B — Separate the Primary Action from Secondary Actions

Status: `IMPLEMENTED — CI PENDING`

Objective: Anchor the semantic Primary action at the far left of the Local Player Dock action bar; group local Cancel and authoritative Decline/End at the far right, leaving a clear empty center gutter. This is the user's explicit visual decision and updates the prior `Cancel | Primary | Decline` spatial order without changing button semantics.

Observed gap: `.turn-controls [data-action-slots]` currently renders all three fixed-width slots together at the right edge, so Confirm sits between Cancel and End and is easy to mis-tap.

Design authority: `docs/UX_V2_INTERACTION_STAGE_DESIGN.md` §§2.7, 8; `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md` §§7.8, 19; accepted VIS-06A stable semantic slots; user's supplied mobile screenshot and direction.

Scope: `app/page.tsx`, `app/sequence-overrides.css`, focused `tests/browser/ui19.spec.mjs`, the two cited design/workflow contracts, HANDOVER and roadmap. README is unchanged.

Requirements:
- Primary appears first visually and in keyboard traversal, left-aligned at the action bar's left inset.
- Cancel then Decline/End stay grouped at the right inset; if only one is present it occupies the right edge. A measured center gutter of at least 32px separates the zones at 480px and 1440px.
- Keep the three semantic slot identities, labels, enabled states, payloads, guidance, and provider Extras behavior unchanged; Extras must not fill the center gutter or displace the horizontal action anchors.
- Preserve >=78×32px buttons, non-overlap, responsive Dock bounds, and zero document horizontal overflow.

Regression: Extend the mounted VIS-06A matrix at 480×900 and 1440×900 across confirm/cancel, confirm/decline, combined, turn/end, provider-extra, and long-guidance states. Assert left/right anchoring, center separation, right-group adjacency/order, keyboard order, existing semantic labels, touch bounds, and no overflow. Retain current guidance/Hand clearance checks.

Validation: Focused browser cases for VIS-10B and retained VIS-06A, targeted lint for changed test code, and `git diff --check`; do not run local full suite/build/lint. Push the implementation and docs together, then inspect GitHub Actions for that exact revision and fix any real failure before continuing.

Stop condition: If the explicit two-zone layout cannot fit the existing Dock bounds while preserving button touch targets and Extras behavior, record measured evidence and stop with `BLOCKED — HUMAN REVIEW REQUIRED`; do not change action semantics or hide controls.

Implementation result: `app/page.tsx` puts Primary first in visual/DOM order; `app/sequence-overrides.css` anchors it left and groups Cancel/Decline right (a lone secondary action aligns right), with a proven >=32px center gutter. Provider Extras remain separate. Handlers, labels, enabled states and payloads are unchanged. Focused browser validation: VIS-06A action-slot/guidance cases 3/3 at 480px/1440px; VIS-10A short-height containment plus retained VIS-04B 9/9. Targeted ESLint and `git diff --check` passed. CI pending for the pushed revision.


## Reviewer-requested next task after VIS-10B closes

### UX2.0VIS-10C — Improve Opponent Hero Readability and Public Equipment At-a-Glance

Priority: execute this next after VIS-10B reaches CI GREEN, unless VIS-10B itself exposes a blocking regression.

User-observed UX problem:
On the deployed mobile portrait board, opponent cards are compact enough that the Hero artwork is barely recognizable, and the public Equipment state is not visible at a glance. This makes target choice slower and error-prone for interactions such as Attack and Borrowed Sword, where the player needs to quickly understand who the opponent is and whether they visibly have a weapon, armour, +1 horse, or -1 horse.

Objective:
Keep the accepted opponent-seat topology and compact footprint, but make each opponent seat immediately readable as a Hero plus its public combat-relevant equipment state.

Authority:
Use only already-public opponent data from the existing projected player view, especially `player.hero`, HP, hand count, `player.equipmentCards`, and existing Judgement visibility. Do not expose private Hand identities or infer hidden state. Do not change gameplay legality, distance, attack range, or target rules.

Requirements:
- Increase the useful visible Hero-art area on opponent thumbnails so the Hero is recognizable at mobile portrait size; do not solve this by materially enlarging the whole seat into the Interaction Safe Zone.
- Preserve player name / Hero name, HP and concealed Hand count.
- Add a compact always-visible public Equipment summary on the seat using small visual thumbnails/icons for equipped slots: Weapon, Armour, +1 Horse, -1 Horse. Empty slots should consume little or no visual space.
- Prefer the existing physical equipment card identity and existing `CardFace`/mini-card assets where legible; a compact slot/icon treatment is acceptable if full mini-card art is too dense.
- Equipment summary is informational and may retain the existing inspect/info affordance, but must not introduce new gameplay controls or change `CurrentAction` authority.
- Keep the full opponent Inspect surface for detailed Hero/Equipment/Judgement information.
- Preserve Top Row 2–4 topology, Side Column 5–10 topology, Stage safe zones, target hit areas, and viewer privacy.
- Do not hide public equipment merely to satisfy containment. If Top Row and Side Column need different presentation densities, keep the same public information with topology-specific sizing.
- Validate representative states with: no equipment, Weapon only, Armour only, Weapon + Armour, and multiple equipment slots.

Focused browser regression:
- prove Hero portrait remains visibly meaningful and not covered by the text overlay at 480px and 650px;
- prove equipped Weapon/Armour/Horse items are represented on the opponent seat without opening Inspect;
- prove empty equipment does not create a large dead row;
- prove target selection and Inspect clicks remain hit-safe;
- prove no opponent seat overlaps the Interaction Stage or Local Player Dock and no document horizontal overflow is introduced;
- retain representative Top Row and Side Column geometry regressions.

Do not begin VIS-10C until VIS-10B is CI GREEN. If the compact seat cannot show recognizable Hero art plus the required public equipment summary without violating the accepted seat/safe-zone geometry, stop with `BLOCKED — HUMAN REVIEW REQUIRED` and report measured evidence instead of shrinking content into illegibility.
