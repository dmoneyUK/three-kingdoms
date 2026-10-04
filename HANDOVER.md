# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

Current task authority. Long-lived decisions/history: `docs/AUTONOMOUS_UI_ROADMAP.md`. Workflow: `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`.

## Previous result

### UX2.0VIS-09B — Navigate Overflowing Hand Cards in One Row

Status: `COMPLETED BY AGENT — CI GREEN`  
Implementation: `8eb5499edba1c9907d061039efd98cfe5d3c1042`

Final tested revision: `e15008d42abbdc235b20d8bac26b2405ae250c39`

CI: [run 37195526183](https://github.com/dmoneyUK/three-kingdoms/actions/runs/37195526183) — build-and-test and deploy succeeded.

One-layer 68×102px Hand cards now remain reachable by native horizontal pan and keyboard; the 480px/25-card rail scrolls its 788px content extent without document overflow. CI's platform-dependent synthesized scroll helper was replaced with explicit trusted touch events; independent tap/inspection checks and focused 09B browser validation passed 23/23. Human Reviewer acceptance remains separate. Semantic anchoring across card changes and real-device certification remain open.

## Current task

### UX2.0VIS-09C — Preserve Hand Viewport Context Across Card Changes

Status: `PLANNED — READY TO IMPLEMENT`

Objective: Keep the viewer's physical-card context in place when authoritative local Hand membership changes, without auto-panning to newly appended cards.

Observed gap: the rail currently adjusts only to reveal a selected card (`app/page.tsx`, Hand layout effects). There is no physical-card viewport anchor when an earlier card is removed. Appended-card behavior has no mounted-update regression proof.

Design authority: `docs/UX_V2_INTERACTION_STAGE_DESIGN.md` §§0.86–0.87; workflow §§6.1, 12, 19. Use only viewer-private `room.myHand` IDs as local presentation anchors.

Requirements:
- Preserve a surviving visible physical-card anchor at its viewport-relative position after Hand IDs change.
- If that card is removed, keep the nearest surviving card from the previous visible neighborhood in view.
- Appending cards must not steal the current viewport or change selection; a genuinely replaced Hand/viewer may establish a new anchor.
- Keep native scrolling, one-layer geometry, current selected-card reveal, `CurrentAction` legality, and all gameplay/server/protocol authority unchanged.

Focused regression: extend the existing browser fixture to rerender a mounted `GameRoom` with changed synthetic physical IDs; assert anchor position after preceding/anchor-card removal and no viewport jump after appending cards at 480px and 650px. Synthetic IDs remain geometry-only.

Likely scope: `app/page.tsx`, `tests/browser/fixture.jsx`, `tests/browser/ui19.spec.mjs`, this handoff, and roadmap closeout. Run only focused render/browser validation and `git diff --check`; GitHub Actions is the final gate.

Planning gate: approved requirement YES; private existing identity authority YES; bounded local-UI behavior YES; high impact to repeated large-Hand use YES; mounted geometry regression YES.

Stop if physical IDs cannot establish continuity or implementation would require guessing new gameplay/public semantics or an unapproved reset/anchor trade-off. Never write `REVIEWER ACCEPTED`.
