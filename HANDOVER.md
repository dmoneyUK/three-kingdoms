# WTK UX2 — Current Handoff

Branch: `ux-v2`

Latest reviewed design: `docs/UX2-refine.md`, blob `939c260f746b7608fdfa9a590f38c5770606eda8`.

Latest user decision: §8.1 Duel layout passed visual validation; continue autonomous, one bounded task at a time. Aggregate review of other delivered UX work remains pending.

## Latest result

`UX2-NEGATION-CENTRE-PARK-01` delivered at `9efc94b8567136ff3157ab8bbc813e1590402748`. Actions run `38594143195` passed Lint/fast, API, browser startup/room smoke and deploy. Production `/api/health` returned `{"ok":true,"worker":"available"}`. No local automated gameplay tests or screenshots were run; aggregate visual review is pending.

## Current task — UX2-DISMANTLE-CENTRE-PARK-01 (§10.2 B)

Observed gap: the proven Burning Bridges/Dismantle root is rendered statically during its normal action/settlement path; it does not receive the centre reveal → actor-seat parking lifecycle. Existing typed `PresentationDismantleSettlement` proves the root event, source, target and completed outcome.

Implement one Dismantle public-card journey: reveal the exact committed root at normal Hand size for 4 seconds, move that same CardFace in 380 ms to its actual author's Seat/Dock, then show only the matched server-proven Dismantle result. Keep the root stable across Negation-window and settlement projections and suppress legacy copies only for the exact owned event/card.

**Boundaries:** no game-rule or target-picker changes; keep `CurrentAction` as the sole legal-control source and preserve anonymous target Hand/Equipment/Judgement selection. Do not include Steal, Borrowed Sword, DrawTwo, Duel, Group/AOE, or graph UI. Missing or mismatched root/settlement proof fails closed.

**Validation:** no local automated gameplay tests per the user's instruction; use the exact-SHA CI/deploy gate and leave visual acceptance pending for aggregate manual review.
