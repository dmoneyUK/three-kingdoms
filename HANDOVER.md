# HANDOVER

**Latest verified runtime delivery:** `215d5a5e7a61b5ad38cb239710fc1f2984df7193`; exact-SHA [Actions 45531370457](https://github.com/dmoneyUK/three-kingdoms/actions/runs/45531370457) passed Lint/fast, API, browser smoke, D1 migration, Worker deploy and production smoke. Worker `7d98d102-8ca6-4475-94e7-612e7b34daa5`; `/api/health` returned `{"ok":true,"worker":"available"}`. Current §10.76-A changes are not yet committed or verified remotely.

## Current bounded task — §10.76-A

**Design reviewed:** `docs/UX2-refine.md`, revision 2026-11-25 04:16 UTC, baseline `26225fb5dbef29e61f029fa9019d5afe36f7db28`.

**Task:** `UNIVERSAL-H4-CARDFACE-SYNCHRONIZATION-01`. Coordinate a genuine primary public CardFace reveal with its matching committed H4 under the same shared scene identity. Keep server event ownership, viewer identity, privacy, geometry, reveal lifecycle and equipment behavior unchanged. Implement only §10.76-A.

**Reproduced cause:** A real four-player Attack showed a visible CardFace while its matching H4 was hidden at `PENDING_PLACEMENT`. The shared layout provider repeatedly threw `savedWidth is not defined` while measuring compact H4 geometry, so it never published the shared reveal identity. With that exception fixed, a second mismatch remained: the card became readable one frame before the provider confirmed that the H4 was visibly placed.

**Implementation in worktree:** Save and restore the H4 measurement width in `try/finally`; let the provider measure an identity-matched REVEAL candidate while its copy is awaiting placement; publish `revealReady` only after the matching H4 is visible, marked positioned under the same layout identity and inside its reserved band; keep the authentic card hidden until that readiness is true. Share exact room/root/interaction/event/card/viewer/phase matching across card and provider.

**Validation:** `npm run build` passed (existing chunk-size and route-classification notices only); focused Stage Layout + Announcement tests passed, 57/57; one real Attack browser regression passed, asserting a single visible matching H4 at every readable frame, no card/H4 overlap, correct event/card/viewer/layout identities and no browser runtime errors; `git diff --check` passed. Local UI/browser runs remained within the five-minute task cap. Source is not yet committed or pushed; exact-SHA CI, Worker deployment and production smoke remain outstanding. Owner iPhone review remains pending.

**Next authorized task:** §10.76-B, only after this task is committed, pushed, exact-SHA CI/deployment/smoke are verified and this handoff is updated with observed results.
