# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

Current task authority. Long-lived decisions/history: `docs/AUTONOMOUS_UI_ROADMAP.md`. Workflow: `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`.

## Latest result

### UX2.0VIS-10A — Short-portrait Top Row Stage containment

Status: `COMPLETED BY AGENT — CI GREEN`
Final tested revision: `b107ca2dde5cb58ff2e264ca45b5fbbe61db4033`
CI run: [37200561740](https://github.com/dmoneyUK/three-kingdoms/actions/runs/37200561740) — `build-and-test` and `deploy` succeeded, including production smoke test.

Focused browser validation: 40/40; targeted ESLint and `git diff --check` passed. CI caught a desktop 1440×900 geometry regression from a broad height query and a stale overflow expectation; the query is now mobile-width-scoped and the probe verifies compact containment. Human Reviewer acceptance remains separate.

## Current task

### UX2.0VIS-10B — Separate the Primary Action from Secondary Actions

Status: `IMPLEMENTED — CI PENDING`

Objective: Anchor the semantic Primary action at the far left of the Local Player Dock action bar; group local Cancel and authoritative Decline/End at the far right, leaving a clear empty center gutter. This is the user's explicit visual decision and updates the prior `Cancel | Primary | Decline` spatial order without changing button semantics.

Observed gap: `.turn-controls [data-action-slots]` currently renders all three fixed-width slots together at the right edge, so Confirm sits between Cancel and End and is easy to mis-tap.

Design authority: `docs/UX_V2_INTERACTION_STAGE_DESIGN.md` §§2.7, 8; `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md` §§7.8, 19; accepted VIS-06A stable semantic slots; user's supplied mobile screenshot and direction.

Scope: `app/page.tsx`, `app/sequence-overrides.css`, focused `tests/browser/ui19.spec.mjs`, the two cited design/workflow contracts, HANDOVER and roadmap. README is unchanged.

Requirements:
- Primary appears first visually and in keyboard traversal, left-aligned at the action bar's left inset.
- Cancel then Decline/End stay grouped at the right inset; if only one is present it occupies the right edge. A measured center gutter of at least 32px separates the zones at 480px and 1440px.
- Keep the three semantic slot identities, labels, enabled states, payloads, guidance, and provider Extras behavior unchanged; Extras must not fill the center gutter or displace the horizontal action anchors.
- Preserve >=78×32px buttons, non-overlap, responsive Dock bounds, and zero document horizontal overflow.

Regression: Extend the mounted VIS-06A matrix at 480×900 and 1440×900 across confirm/cancel, confirm/decline, combined, turn/end, provider-extra, and long-guidance states. Assert left/right anchoring, center separation, right-group adjacency/order, keyboard order, existing semantic labels, touch bounds, and no overflow. Retain current guidance/Hand clearance checks.

Validation: Focused browser cases for VIS-10B and retained VIS-06A, targeted lint for changed test code, and `git diff --check`; do not run local full suite/build/lint. Push the implementation and docs together, then inspect GitHub Actions for that exact revision and fix any real failure before continuing.

Stop condition: If the explicit two-zone layout cannot fit the existing Dock bounds while preserving button touch targets and Extras behavior, record measured evidence and stop with `BLOCKED — HUMAN REVIEW REQUIRED`; do not change action semantics or hide controls.

Implementation result: `app/page.tsx` puts Primary first in visual/DOM order; `app/sequence-overrides.css` anchors it left and groups Cancel/Decline right (a lone secondary action aligns right), with a proven >=32px center gutter. Provider Extras remain separate. Handlers, labels, enabled states and payloads are unchanged. Focused browser validation: VIS-06A action-slot/guidance cases 3/3 at 480px/1440px; VIS-10A short-height containment plus retained VIS-04B 9/9. Targeted ESLint and `git diff --check` passed. CI pending for the pushed revision.
