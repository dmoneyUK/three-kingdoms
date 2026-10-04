# WTK UI / Layout — Current Handoff

Branch: `ux-v2`
Mode: `AUTONOMOUS UI RUN`
Authority: this file plus `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`.
History: `docs/AUTONOMOUS_UI_ROADMAP.md`.

## Latest result — UX2.0VIS-12L: Put Guidance Beside the Bottom Action Area

Status: `IMPLEMENTED — CI PENDING`

The Dock grid now orders Hero/Skills/Equipment, Hand, Guidance, Actions. Reordered row sizing at all existing responsive breakpoints, retaining region sizes and content-driven guidance height. Existing guidance text, action handlers and authoritative states are unchanged. The 12K four-player geometry tests now assert Hand → Guidance → Actions; the old contrary VIS-06A selected-card assertion now requires cards above Guidance.

Focused validation: 28/28 browser cases passed (12K, VIS-06A action/guidance, and all short-portrait Stage cases); targeted test ESLint passed. Reviewed 480px ordinary-turn and 390×640 selected-card screenshots. No full local tests/build/lint.
Source: `app/sequence-overrides.css`, `tests/browser/ui19.spec.mjs`. Commit/push and exact-revision CI follow delivery; no unverified green claim.

Pre-edit checkpoint: VIS-12K `c58a0800d95e3dbf958e72aed27125976fb13fcd`, Actions run `37230539712`, was pending; VIS-12J correction `9a5a245e1149c7a0baf721618c845fbe15aef381`, run `37230152044`, was still in progress. VIS-12K's seven new four-player checks and VIS-12J's 35 affected checks passed locally; their remote states remain pending until checked.

## Current task — UX2.0VIS-12M: Deduplicate Proven Source Metadata

Status: `PLANNED`

Evidence: `InteractionStage` currently renders the SOURCE metadata row outside Dying even when the same projected source identity is visibly named by Hero Focus or the Medium Source card. Design §§0.91.2 / 0.91.5 permit omission of repeated authoritative identity/facts while preserving distinct semantic roles.

Planning gate: all five §19 checks pass. The requirement is approved; both source identities come from the same typed Stage projection; only one repeated source presentation is in scope; it competes with artwork; existing ordinary/Group/Negation/Dying fixtures and semantic helpers can prove visibility and fallback.

Requirements:
- Omit a non-Dying SOURCE metadata row only when the same proven source ID is actually visibly labelled by the rendered Hero Focus source or Medium Source card.
- Preserve FOCUS/SCOPE, Current Participant, Decision, Resolver and nested/original context unless independently proven to be the same fact; keep Dying's accepted deduplication.
- Retain SOURCE fallback when its ID is missing or no matching source presentation is rendered.
- Add focused browser/source regressions for exact visible duplication, distinct roles, fallback and retained Dying behavior; retain short-portrait containment.

Scope: `app/page.tsx`, relevant focused tests, handoff/roadmap. No server/projection/gameplay changes. Before source editing synchronize remote, check current design/workflow updates and inspect the latest ux-v2 push run per §4.
Stop if role equality would need to be inferred from names, timeline, turn ownership or an unapproved semantic interpretation.
