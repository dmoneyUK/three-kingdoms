# HANDOVER

## Latest verified delivery — §10.81-A

SHA `e51c0cc1c8656f758c28749700bc7e14b8ddec20`; exact-SHA Actions `46095122544` passed lint/fast, API, browser startup/H4 smoke, Worker deployment and production smoke. Worker `8b811185-7176-4a45-a947-780d6438fbf3`. Owner iPhone review remains pending.

## Current task — §10.81-B shared visible-hold lifecycle retirement

Design reviewed: `docs/UX2-refine.md` at `2d8adec54fd1b90fbab01fab54b011606062749c`, including §10.81 and Planner Guide §6C. One typed proof-bound `PublicStageVisibleHoldPolicy` now owns exact room/viewer/event/material/root/interaction/frame/H4 identity and real completion endpoint. The Necromancy proof adapter and Equipment transition builder both construct it; `app/public-card-display.tsx` consumes it for paint, pending layout, H4 recovery, pause/resume and completion. The 235ms interruption checkpoint and existing four-second accumulated visible hold remain intact.

§6C retirement: removed `verifiedGuicaiVisibleHold`, `requiresPublicH4VisibleHold`, `zoneTransitionPaintIdentity`, `allowPendingVerifiedReveal`, `pendingRevealIdentity` and `revealCompletionPolicy`. Static search finds none in `app/` or `game/`; `sima_yi_guicai` remains only in `app/page.tsx` domain proof construction/selection, not shared lifecycle/rendering. Equipment arrival remains bound to its actual claim, owner, card and slot. Regression checks cover both completion endpoints, mismatched identity rejection, the shared renderer cleanup, Equipment arrival and visible-time checkpoint.

Validation completed before delivery: focused shared layout/equipment tests 43/43; `npm run test:fast` 531/531; `npm run test:api` 397/397; `git diff --check` passed. No local UI/browser/device tests. Exact implementation SHA Actions, deployment and production smoke are pending this task commit. No Owner acceptance claimed.
