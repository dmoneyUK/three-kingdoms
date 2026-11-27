# HANDOVER

## Current task — §10.78 final Frost picker and Frame-title correction

Design reviewed: latest `origin/ux-v2` `docs/UX2-refine.md` at `daf1bacf`. The newer revisions only close §10.76 and record later review; the active §10.78 boundary is unchanged. Preserve the eight previously accepted checks and all card, Frame position/layer, H4/PAC, End Turn, selection, and rules behavior.

Implemented in this bounded change: Frost-only smaller painted Hand/Equipment tabs and Confirm/Skip surfaces, retaining 44px hit targets; a single-line `FROST SWORD · DISCARD` title with matching reduced Frame header reservation, retaining both 90×135 material faces. Kirin and other Frame titles keep existing presentation.

Flicker check: placement readiness and CSS visibility gating are present, but the available source and Owner video do not prove that a specific gate caused the reported disappearance. `FLICKER DEFERRED / UNVERIFIED`; no speculative lifecycle changes.

Validation: focused Frame-layout test 6/6 passed; SSR Frame-title and room-render tests 34/34 passed; `git diff --check` passed. No local UX/browser/device test run. Before this change, latest relevant code CI was Actions `45910324685` success for `39c09fd9`; changes since that SHA on `origin/ux-v2` are documentation-only. This delivery's exact-SHA CI, deployment, and production smoke are required after push and remain unverified until observed.

Stop after one commit is pushed and its exact-SHA CI, Worker deployment, and production smoke are verified. Status then: `PENDING OWNER iPHONE REVIEW`.
