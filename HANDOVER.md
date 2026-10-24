# HANDOVER

Target branch: `ux-v2` (working branch: `codex/ux2-equilibrium-phone`). Phone-only validation; maximum 8 players.

## Latest result

**`UX2-10.13.5.1-U13-E-F-R1-P0-FULL-PLAYER-NAMES` — IMPLEMENTED / DEPLOYED, PENDING USER PHONE REVIEW.** Release SHA `8474c4152d8afcbd5d2f9613d597d5fb6f87f85c`; exact-SHA [Actions `40131528074`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/40131528074) passed lint/fast, API, browser startup/room smoke, D1 migration, Worker deployment and production smoke. Worker `c06ebbf0-b3a1-477a-b2af-b5f87c974193`; production `/` and `/api/health` returned 200, health `{"ok":true,"worker":"available"}`. Copy tests passed 4/4, build passed, targeted ESLint had 0 errors and 16 existing Hook warnings. Focused phone regressions verified normal names in two lines at 390×700 and full long Latin/CJK names without clipping at 390×844, 440×766 and 480×900. No owner phone acceptance is claimed.

**Latest design reviewed:** `docs/UX2-refine.md` at release revision `8474c4152d8afcbd5d2f9613d597d5fb6f87f85c`, including remote Planner update `0c2dbefe8d1566c146cb4f9718c034538c7eb1ec` and the accepted R1 sequencing: full names first, passive Frame styling next. No other active identity was merged or removed.

## Exactly one current bounded task

**`UX2-10.13.5.1-U13-E-F-R1-P1-PASSIVE-LUST-FRAME-CHROME` — P1, IN PROGRESS.** Align only the passive LUST COST Frame's title scale, thin antique-gold border treatment and interior breathing room with the existing WTK skill/selection visual language. Preserve the accepted vertical order (`LUST` title above the genuine 90×135 cost CardFace), full participant narration in the separate H4 band, cost identity/owner, reveal→move→park geometry, and all legal actions/privacy. Do not add picker controls or duplicate announcements. Use the existing measured geometry first; change JS anchors/transforms only if a basic phone capture demonstrates that geometry must change. Run only basic local validation as directed by the owner; then use the required exact-SHA CI/deployment gate and keep the result pending owner phone review.
