# HANDOVER

## Current bounded task — §10.76-B

**Design reviewed:** latest remote `docs/UX2-refine.md` at `778efd2f8e26994b46d30ac3ca7edc8f74a964f8`, revision 2026-11-25. Owner-approved complete Effect Frame↔H4/PAC minimum clearance is 5 CSS px; ordinary CardFaces and parked miniatures retain 8 px.

**Implementation prepared locally:** shared solver and fallback use the same 5 px Effect Frame policy; strict room/root/interaction/event/card/viewer and H4 ownership checks remain required. Added no-fit geometry diagnostics. Fixed the REVEAL readiness bootstrap by allowing the exact proven layout target before paint readiness, then remeasuring only after same-scene owned placement styles land. Reveal completion now waits for measured safe paint and this viewer’s real parking target; same-event failure cannot bypass no-fit through fallback.

**Validation:** focused layout/Effect Frame tests pass 29/29; targeted ESLint has 0 errors and 15 hook-dependency warnings; `git diff --check` passes. Local `tsc --noEmit` is not green: the current tree reports multiple type errors in `app/public-card-display.tsx`; the narrowed output reported none in `app/public-stage-layout-context.tsx` or `game/public-stage-layout.ts`. Local UI/browser verification is **SKIPPED** because this task’s combined five-minute budget was already exhausted; 390×844 frame/H4/PAC fit and actual miniature parking remain unverified. No local build, commit, push, CI or deployment yet.

**Resume point:** commit only the four §10.76-B source/test files and this handoff on `ux-v2`; push, verify exact-SHA required Actions and Worker deployment/production smoke, then record actual results. Do not claim phone acceptance or verified runtime parking.
