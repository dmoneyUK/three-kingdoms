# WTK UX2 — Current Handoff

Branch: `ux-v2`

Latest reviewed design: `docs/UX2-refine.md`, blob `b93a6478fb095a64e88f8c9bdab107d09bad15ff` (remote §8.7 P0 plus Dismantle delivery record).

Latest user decision: §8.1 Duel layout passed visual validation. The newly reported §8.7 four-second Attack reveal timing remains a separate P0 acceptance gap.

## Latest result

`UX2-DISMANTLE-CENTRE-PARK-01` delivered at `6160457e99ea5caf698acc3e335583e876a5d5b2`. Actions run `38596523717` for that SHA: Lint/fast, API, browser startup/room smoke and Cloudflare deploy job pages all reported success (2m22s, 2m27s, 1m09s, 49s). The run summary page still showed stale “In progress”; all four required jobs were individually observed succeeded. Production `/api/health` returned `{"ok":true,"worker":"available"}`. No local automated gameplay tests or screenshots were run; aggregate visual review is pending.

## Current task — UX2-CENTRE-REVEAL-4S-P0 (§8.7)

Diagnose and fix the user-reported ordinary Attack reveal that shrinks/parks in under one second despite the 4-second requirement. Do not assume a cause: inspect event queueing, first-painted reveal timing, `moveRootOutOfCenter`, seen-event persistence, temporary presenter disable/remount, and competing legacy ownership. Keep one committed physical card full-size and visibly centered for 4,000 ms from its first painted frame; queue fast committed responses, then move the same card once in about 380 ms to its proven actor Seat/Dock.

**Boundaries:** preserve server-authoritative Attack/Dodge, Duel histories, Deflection identity, Negation privacy/timing, all `CurrentAction` controls and gameplay deadlines. No graph UI, unrelated rules, or card-family expansion. Missing proof fails closed.

**Validation / stop:** diagnose on the real server-backed gameplay path and retain actual timing/geometry evidence where available. Do not run local automated test suites per the user's instruction; verify exact-SHA CI/deploy. The §8.7 design calls for visual validation of this P0 before beginning another card family. Do not claim visual acceptance without the user's review.
