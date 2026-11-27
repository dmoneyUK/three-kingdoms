# HANDOVER

## Current task — §10.78 Frost Frame header visibility correction

Design reviewed: `docs/UX2-refine.md` at `28150eccf4efa46a562e17703b61761c93548dea`.

Implemented in one bounded correction: Frost-only Frame hides the redundant visible material-count row while retaining the two real material identities, accessibility details and data attributes; its title header reservation is reduced from 43px to 28px; the existing shared H4–PAC lane anchor applies one deterministic +8px Frost preference. Card dimensions, H4/PAC, other Frame variants, picker behavior, End Turn and game rules remain unchanged.

Flicker source check: no specific size-feedback defect established; deferred as `UNVERIFIED` per the non-blocking design instruction. No local browser, UX or phone test run.

Validation: focused layout/render/stage tests passed 42/42; `npm run build` passed; `git diff --check` passed. No local browser/UX/phone test run. Implementation commit `ea9198e3c4d1a269d18239c9bb66c4f86694db8e`; exact-SHA Actions `45922037119` passed all jobs, D1 migration, Worker deployment (`f46bd581-4ed5-44f5-84b3-d188559427d5`) and production `/` + `/api/health` smoke. Flicker remains `UNVERIFIED` and non-blocking as specified. Status: `PENDING OWNER iPHONE REVIEW`; stop here and do not self-accept.
