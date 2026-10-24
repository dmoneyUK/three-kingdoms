# HANDOVER

Target branch: `ux-v2` (working branch: `codex/ux2-equilibrium-phone`). Phone-only validation; maximum 8 players.

## Latest result

**Last release: `UX2-10.13.5.1-U13-E-F-R1-P0-FULL-PLAYER-NAMES` — IMPLEMENTED / DEPLOYED, PENDING USER PHONE REVIEW.** Release SHA `8474c4152d8afcbd5d2f9613d597d5fb6f87f85c`; exact-SHA [Actions `40131528074`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/40131528074) passed all required jobs. Worker `c06ebbf0-b3a1-477a-b2af-b5f87c974193`; production `/` and `/api/health` returned 200, health `{"ok":true,"worker":"available"}`. No owner phone acceptance is claimed.

**Current P1 working result — LOCAL, NOT YET COMMITTED.** `app/globals.css` now matches the LUST passive Frame's dark field, antique-gold border/inset and restrained shadow to the shared choice-panel treatment, and adjusts only its title to 20px. Frame/card geometry is unchanged. Basic `npm run build` and `git diff --check` passed; no additional browser campaign was run per owner direction. Exact-SHA Actions/deployment is still required.

**Latest design reviewed:** `docs/UX2-refine.md` at remote revision `2fa8ab0d7c43a8625c42c1cd512d955e1b497965`, including Planner update `0c2dbefe8d1566c146cb4f9718c034538c7eb1ec`. Re-read §10.13.5.1: P0 names are delivered; P1 is limited to passive Frame styling. No other active identity was merged or removed.

## Exactly one current bounded task

**`UX2-10.13.5.1-U13-E-F-R1-P1-PASSIVE-LUST-FRAME-CHROME` — P1, IN PROGRESS.** Finish the CSS-only passive LUST COST Frame styling now edited locally: shared dark field, restrained warm-gold double line/shadow and balanced 20px heading. Preserve the 168×190 measured panel, real 90×135 cost CardFace, 8px padding, full player copy in the separate H4 band, and all card/animation/response/privacy behavior. No picker controls or duplicate announcements. Local build and diff check pass. Next: verify the current remote-head CI gate, commit/push this bounded change, observe exact-SHA Actions/Worker deploy/production health, and report pending owner phone review. The owner will perform visual acceptance; do not launch extra local multi-player testing.
