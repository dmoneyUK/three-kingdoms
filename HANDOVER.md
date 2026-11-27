# HANDOVER

## Current task — §10.78 Frost Frame header visibility correction

Design reviewed: `docs/UX2-refine.md` at `28150eccf4efa46a562e17703b61761c93548dea`.

Implemented in one bounded correction: Frost-only Frame hides the redundant visible material-count row while retaining the two real material identities, accessibility details and data attributes; its title header reservation is reduced from 43px to 28px; the existing shared H4–PAC lane anchor applies one deterministic +8px Frost preference. Card dimensions, H4/PAC, other Frame variants, picker behavior, End Turn and game rules remain unchanged.

Flicker source check: no specific size-feedback defect established; deferred as `UNVERIFIED` per the non-blocking design instruction. No local browser, UX or phone test run.

Validation: focused layout/render/stage tests passed 42/42; `npm run build` passed; `git diff --check` passed. Latest relevant remote code baseline `b461907c3e60953469688a439c80493e7447ffd8` passed Actions `45917590779`, including deployment and production smoke; later commits through this design revision are documentation-only. This correction’s commit, exact-SHA CI, Worker deployment and production smoke are pending. Stop after technical delivery for Owner iPhone review; do not self-accept.
