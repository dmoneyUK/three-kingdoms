# Current Handover

Branch: `ux-v2`

## Latest result

- **`UX2-10.17.1.1-BCP1-F1-HARVEST-CONTENT-FIT-INFO-MINI` — implementation complete; exact-SHA CI/deployment pending.** Four-card actor faces now measure 78×117 at 390×700 and 88×132 at 440×766, with a content-fit panel (panel width ≤ card-row width + 20px), bottom-centred independent 44×44 Info targets, and a compact 40×60 parked root with proportionally reduced corner, title and type marks. The lifecycle regression ties reveal, move, parked journey and thumbnail to the same physical card/event. Phone checks: all three Bumper Harvest browser tests passed; covers 1/2/4/6/8-card pools, 4/6/8 seats, horizontal touch swipe, actor select/re-tap/Confirm, spectator read-only/SWITCH, Inspector and Card Details. `npm run build`, focused browser ESLint and `git diff --check` passed. No desktop validation was run.
- **`UX2-10.17.1.2-BCP1-F2-HARVEST-NEGATION-READONLY-POOL` — IMPLEMENTED / DEPLOYED, PENDING USER PHONE REVIEW.** Exact SHA `6836aa2905a3dc71f7d8dfde8619ae190f6f4e14`; Actions [39131345860](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39131345860); Worker `705b26bf-2802-46d6-9869-e6aceaac282c`.
- **INS-5-F1-R is USER-ACCEPTED / CLOSED** per the latest design commit `ecc182c23eadf933e7fffcebbf6c6be3064af6cd`. Its accepted deployment remains SHA `44e7afb4435361c8fd7a5edbac0e038371481731`, Worker `2fdd9a9d-8c9d-4922-8e3d-8d5f4fcacbd4`.
- **Latest design reviewed:** `docs/UX2-refine.md` at `ecc182c23eadf933e7fffcebbf6c6be3064af6cd`, including §10.17.1.1 and §10.17.4.1. Preserve accepted H4 and the Q1–Q4 pause. Unrelated dirty files in the original checkout remain untouched.

## Exactly one current bounded task

Finish the exact-SHA Actions, Worker deployment and production health smoke for **`UX2-10.17.1.1-BCP1-F1-HARVEST-CONTENT-FIT-INFO-MINI`**, then hand off **IMPLEMENTED / DEPLOYED — PENDING USER PHONE REVIEW**. Do not claim human acceptance. At the next safe boundary, the design's next quick correction is **`UX2-10.17.4.1-HUD4-F-SWORD-SILHOUETTE`**, followed by the BCP-1-F2 Negation public-proof review already recorded above.
