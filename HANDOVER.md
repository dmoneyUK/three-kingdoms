# WTK UX2 — Current Handoff

Branch: `ux-v2`

## Latest result

**UX2-10.2-B2-BORROWED-SWORD-SERVER-RULES-REVIEW-01 — delivered; PENDING REVIEW.** A missing forced-Attack route now resolves the official Borrowed Sword fallback by transferring the exact current Weapon once. Missing/stale/replaced weapons cannot transfer a replacement; normal forced Attack, Negation, equipment-loss and continuation paths remain intact. Worker/D1 API passed 7/7; production build and targeted ESLint passed. `npx tsc --noEmit` still fails with 530 repository-wide diagnostics, including unresolved `cloudflare:workers`; the edited capability and helper have no remaining diagnostics after explicit helper typing. Code SHA `d1df021145bf3a18f719c84c5b378e5bdf6760f3`; exact-SHA [Actions run 38682609779](https://github.com/dmoneyUK/three-kingdoms/actions/runs/38682609779) passed Lint/fast, API, browser startup/room smoke and deploy. Production `/api/health` returned HTTP 200 and `{"ok":true,"worker":"available"}`. No browser gameplay or Reviewer acceptance is claimed.

## Design review

Latest code/design input reviewed: branch head `d1df021145bf3a18f719c84c5b378e5bdf6760f3`, `docs/UX2-refine.md` blob `5cbcd6744686fccd38932f6c6e66130319585625`. Re-read §§8–11. §8.7 Policy B and §9 Plan A remain unchanged. §10.5.3 is closed; §10.7 R3/R4 and §10.8 H1–H3 add reviewer-led UX requirements; §11 remains future-only. Per the user's latest direction, the next slice is server/rules only and will not enter UX implementation. A status-only B2 progress note was appended; no design criteria changed.

## Current bounded task

**UX2-10.2-B3-DRAWTWO-SERVER-RULES-SOURCE-REVIEW-01 — server/rules only.** Compare Something Out of Nothing with `docs/OFFICIAL_CARD_REFERENCE.md` and its authenticated Worker resolution. Verify exact two-card draw, source/physical-card conservation, Negation settlement and no-draw behavior when negated, deck exhaustion/reshuffle, private drawn-card projection, and turn/trigger continuation. Reproduce only suspected gaps with the nearest Worker/D1 tests and make a narrow server-only correction if proven. No UX, client, visual or design-criteria changes. Record result, focused validation, CI and deployment evidence, then review the next bounded task.
