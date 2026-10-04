# WTK UI / Layout — Current Handoff

Branch: `ux-v2`
Mode: `AUTONOMOUS UI RUN`
Authority: this file plus `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`.
History: `docs/AUTONOMOUS_UI_ROADMAP.md`.

## Latest result — UX2.0VIS-12K: Four-Player Ordinary-Turn Visual Gate

Status: `IMPLEMENTED — CI PENDING`

Added an ordinary Play Phase fixture with a typed identity-free REST snapshot, active turn CurrentAction and six synthetic mixed Hand cards. The existing Hero-first seat regression now includes ordinary turns at 390/480/650px. Four integrated cases at 390×844, 480×900, 650×900 and 390×640 cover three opponent seats, a single local Dock, six unique readable-size cards, region bounds, action target/gutter protection and upward selection. Ordinary/selected screenshots and geometry are captured.

Focused validation: seven new cases passed 7/7; targeted ESLint passed. Reviewed ordinary and selected phone screenshots, including short portrait and 650px. No full local checks. Source scope: `tests/browser/fixture.jsx`, `tests/browser/ui19.spec.mjs`. Push together with this result; exact CI remains pending.

Pre-edit checkpoint: VIS-12J correction `9a5a245e1149c7a0baf721618c845fbe15aef381`, run `37230152044`, was in progress. Its focused affected matrix passed 35/35; remote green has not yet been claimed.

## Current task — UX2.0VIS-12L: Put Guidance Beside the Bottom Action Area

Status: `PLANNED`

Evidence: the four-player screenshots and Dock grid place `console-guidance` above Hero/Skills/Hand. Design §§0.91 and 2.7 explicitly require guidance at the bottom rather than above Hand. The current grid begins with `guidance guidance`; row heights begin with its auto track.

Planning gate: all five §19 checks pass. Approved requirement is explicit; existing CurrentAction guidance stays authoritative; one independently testable grid-order concern; it is visibly wrong in the user's screenshot; 12K and existing long-guidance tests provide a meaningful regression.

Requirements:
- Place guidance below Hero/Skills/Hand and immediately above actions, preserving usable region sizes and selected-card rise.
- Reorder corresponding grid row sizing consistently across phone/tablet/desktop widths; keep guidance fully readable, action reach/gutter intact, and Stage/Dock containment.
- Update the existing contrary VIS-06A assertion to require selected cards above guidance; extend 12K geometry to require Hand → Guidance → Actions.
- Preserve actual text, state, handlers, authority and semantics.

Scope: `app/sequence-overrides.css`, focused browser regressions, handoff/roadmap. Validation: 12K + VIS-06A guidance/action cases + short-portrait Stage matrix; targeted lint only.
Before source edits inspect the latest ux-v2 push run and apply §4's non-blocking checkpoint.
Stop if bottom placement cannot preserve readable guidance and accepted Hand/actions without an unresolved design choice.
