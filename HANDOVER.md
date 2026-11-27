# HANDOVER

## Latest relevant delivery

§10.81-B is deployed at `52e72c55afc8643e3147946c5ef8d52359ab9c00`; exact-SHA Actions `46046788125` passed and Worker `13d843b6-c874-40ed-bf9b-bfc6491b555e` is live. Owner iPhone acceptance remains pending.

## Current task — §10.82-A/B UNIVERSAL-PUBLIC-DISCARD-SETTLEMENT-01

Implement the Axe and Stauchness true-discard faces/H4 through the existing public Frame. Preserve card identity, ownership, event order and privacy. End-turn behavior remains outside scope under §10.78. Latest design reviewed: `docs/UX2-refine.md` at `baf0ac3711b4fe19b4702ca6d072f88aab9e13fc` (unchanged §10.82).

Initial task commit `cc685d600a886e997a510c93db155dae332dd391` is pushed. Exact-SHA Actions `46052204542`: API tests and browser startup/H4 smoke passed; lint failed in `react-hooks/rules-of-hooks` at `app/page.tsx:5094` with `RangeError: Maximum call stack size exceeded`; fast tests/build and deployment were skipped. No production deployment occurred.

Current correction isolates cursor-owned versus timeline-fallback selection in `game/public-announcement.ts`; it keeps an exact current cost event eligible and prevents that cost action returning through the stale hero fallback. Focused tests pass 34/34; helper/test ESLint and `git diff --check` pass. Local lint of `app/page.tsx` also overflows on the pre-task baseline, so exact CI must determine whether this correction resolves the added complexity. No local UI/browser/device tests. Do not start §10.83 until §10.82 CI, deployment and production smoke are verified.

**Next action:** commit and push this §10.82 correction, verify exact-SHA Actions and deployment/smoke, then reconcile the latest design and proceed to §10.83 at the next safe task boundary. Owner iPhone review remains pending.
