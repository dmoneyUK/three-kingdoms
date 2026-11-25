# HANDOVER — UX2 §10.74 Fixed H4/PAC display lane

**Design reviewed:** `docs/UX2-refine.md` revision 2026-11-24 22:38 UTC; remote baseline `d2b1461a13d8e639ca6a493907705e670551f24f`.

**Current task:** §10.74 PUBLIC-DISPLAY-LANE-FIXED-BANDS-01, including the remaining §10.70 geometry correction. Implement stable message-free H4/PAC reserves, fixed stationary-card placement, whole-frame centering, and the proven local Kirin material-owner miniature above the PAC reserve. Preserve H4/PAC ownership and timing, real card identity, fail-closed geometry, and all existing selection/parking behavior.

**Implementation status:** Source and focused regression changes are complete in `app/public-card-display.tsx`, `app/public-stage-layout-context.tsx`, `app/public-upper-anchor.ts`, `game/public-stage-layout.ts`, `tests/public-stage-layout.test.mjs`, and `tests/browser/target-card-real-gameplay.spec.mjs`. Copy measurement uses inert clones with the actual parent style context; React-owned H4/PAC nodes are not restyled for measurement. Not yet committed or pushed.

**Validation:** 62/62 targeted layout, announcement and effect-frame tests passed; targeted ESLint passed with 0 errors and 14 existing Hook-dependency warnings; `npm run build` passed with existing chunk-size and route-classification warnings; focused real Kirin Bow Attack reaction browser scenario passed (1/1); `git diff --check` passed.

**Pre-commit CI gate:** remote `ux-v2` is still `d2b1461a13d8e639ca6a493907705e670551f24f`. That documentation-only commit has no check runs because the workflow ignores `**/*.md`; latest relevant push workflow `45496587014` for `298a933368d02b519cb6eed17913ae9f81d3158a` succeeded.

**Next action:** Commit only this task and HANDOVER, push to `origin/ux-v2`, then verify exact-SHA Actions, Worker deployment and production smoke. After that safe boundary, HANDOVER advances to §10.75 only.

**Review boundary:** §10.74 and the §10.70 dependent geometry remain **PENDING OWNER iPHONE REVIEW**. No player-facing UX is marked USER-ACCEPTED.
