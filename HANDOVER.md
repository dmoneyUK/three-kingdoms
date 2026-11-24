# HANDOVER — UX2 §10.70 Kirin Bow settlement geometry

**Design reviewed:** `docs/UX2-refine.md` revision 2026-11-24 20:30 UTC (design commit `5b89d30c508cb6fc75662cede7e54eb992d5a1f5`); latest remote tip `fce69fbaf68401ddd9d7a7f57f537a536cd1361d`.

**Current task — §10.70 remaining correction:** move the complete genuine Kirin Bow Effect Frame below measured fixed H4 with at least 8px clearance, while retaining PAC/control/Seat/Dock safe geometry. When no safe rectangle exists, keep H4 visible and suppress only the unsafe static card/frame until geometry is safe. Preserve card identity, one reveal/parking lifecycle, picker, settlement and damage continuation.

**Local implementation and validation:** updated `app/public-card-display.tsx` and `app/public-stage-layout-context.tsx`; added wrapped-H4/no-fit layout assertions and extended the existing real Kirin Bow Confirm→discard browser scenario. Focused layout tests passed 22/22; focused browser scenario passed 1/1 (9.1s, 390×844); targeted ESLint reported no errors (14 existing hook-dependency warnings); `npm run build` passed with existing bundle/Vinext warnings; `git diff --check` passed. One initial raw `node --test` invocation lacked the `tsx` loader; rerun with `node --import tsx --test ...` passed. No local device test or Owner acceptance claimed.

**Delivery gate:** current implementation is uncommitted. Latest observed applicable remote CI is successful Actions `45477847408` for `61a929813dfac33abfb53009dc68de65b473e717`; the intervening remote update changed only `docs/PLANNER_REVIEWER_GUIDE.md`. After pushing the implementation, verify its exact-SHA required jobs, Worker deployment and production smoke, then update this handoff with actual evidence. §10.70 remains pending Owner iPhone review.
