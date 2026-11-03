# HANDOVER — Current Task Only

Repository: `dmoneyUK/three-kingdoms` · target `ux-v2`

Worktree: `/Users/jingedai/.codex/worktrees/ux2-judgement-seat-01` · branch `codex/ux2-judgement-seat-01`

Latest design reviewed: `docs/UX2-refine.md` revision `e33190bfdee03c87ddcd27ccfaeab4b1db9638d4` (2026-11-02 23:09 UTC).
Latest remote `ux-v2` reviewed: `a884568859377bad73ac9f36ee0259dd1ee5247e`; design revision unchanged.

## Current bounded task — T6 PUBLIC-PAC-REVEAL-ORDER-01 (§10.30)

**Status: IN PROGRESS — NOT OWNER-ACCEPTED.** This remains one consolidated phone-acceptance scope. Preserve the delivered T4 Frame typography and accepted T2 Inspector, Console End, Harvest, Steal/Dismantle, privacy and 4/5/6-player behavior. The design defines no new task IDs.

**Current implementation step:** Wire the shared measured layout into the genuine primary CardFace/Frame, H4 and PAC for one proven reveal scene. The shared identity includes room, root event scope, optional interaction, physical card, viewer, phase and geometry generation. The solver retains full card dimensions, orders H4 → card/frame → PAC with at least an 8px card/PAC gap, accounts for visible Seat, timer, Inspector, Dock and action obstacles, and fails closed when proof or space is insufficient. No card/effect-specific offsets were added. T3 conversion settlement and T5 private Attack/Dodge guidance are already included by earlier T6 source deliveries; T4 Frame typography remains unchanged and T2 stays closed.

**Local result — 2026-11-03 00:09 UTC:** `npm run build` passed. Focused layout tests **4/4** and public announcement tests **27/27** passed. Targeted ESLint exited 0 with 15 Hook warnings in existing `app/page.tsx` and `app/public-card-display.tsx` locations. `git diff --check` passed. One real-game 390×844 browser scenario passed in 10.0s for committed Something Out of Nothing and Barbarian Invasion reveals: CardFace/Frame, H4 and PAC shared one layout identity; full-size 90×135 card and safe timer/Dock bounds were preserved. Earlier browser attempts used stale `dist/client` and one obsolete assertion required PAC compression; after rebuilding current source and removing that superseded assertion, the source-backed scenario passed. Total local browser time remained below five minutes.

**Delivery state:** Source changes and this handoff are local and not yet committed. Remote `ux-v2` is `a884568859377bad73ac9f36ee0259dd1ee5247e`; the latest exact-head run `41548159753` is **SUCCESS**. Commit/push this shared-layout integration, then verify its exact-SHA Actions, Worker deployment and production health before advancing.

**After this delivery, the next T6 bounded step:** Trace genuine committed public response-card events through the existing event, projection and renderer owners. Establish the first point at which an already committed public card loses its visible history owner, using stable event/card IDs and viewer checkpoints. Change history retention only when the committed proof identifies the safe generic owner; otherwise stop and report the missing proof. Do not infer public identity from private intent or client-local state. Keep the single combined T6 owner iPhone review pending until all T6 corrections are deployed.
