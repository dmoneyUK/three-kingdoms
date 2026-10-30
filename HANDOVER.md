# HANDOVER — Current Task Only

Repository: `dmoneyUK/three-kingdoms` · Target: `ux-v2`
Latest design reviewed: `docs/UX2-refine.md` §10.25.3, R6-QA-01, 2026-10-30 23:12 UTC.

## Current task — NEG-COPY-1 R6-QA-01

**2026-10-30 23:21 UTC:** QA-03 source `ab40d149259f5d9bce6b5ca68ec99a5d518c8f44` pushed; exact-SHA CI [41143946009](https://github.com/dmoneyUK/three-kingdoms/actions/runs/41143946009) is pending. QA-02 partial and its missing server proof remain documented in `docs/UX2-refine.md` and prior commit `05be8d57`.

**2026-10-30 23:21 UTC:** Source review found `publicCorridorWidth` only reserved the measured countdown when mounted, so both captions changed width at timer appearance. Reserve the existing CSS maximum timer footprint from the stable safe-zone geometry at all times; retain actual obstacle avoidance. Verify a focused mobile scenario and stable width across countdown appearance; no claim of iPhone acceptance.

**2026-10-30 23:22 UTC:** Source inspection and 440px phone test confirmed width depended on countdown mount. Reserved the CSS maximum timer footprint using the always-present safe-zone geometry. Focused mobile Duel case passed twice (19.7s and 19.8s); second run checked stable PAC before/after countdown and H4 across private Pass. Pure layout/announcement tests 18/18, build and diff check passed. Actual 8-seat geometry and iPhone review remain unverified.
