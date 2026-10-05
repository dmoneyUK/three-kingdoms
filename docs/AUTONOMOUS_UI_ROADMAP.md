# WTK Autonomous UI / Layout Roadmap and History

Repository: `dmoneyUK/three-kingdoms`  
Branch: `ux-v2`

## Purpose

This file is **history, not instruction**.

It records durable UX2 UI/Layout implementation milestones and known implementation gaps. It does not define the current task, task order, product design, CI cadence, or Agent workflow.

Current sources of authority are:

- product/UI behavior: `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`;
- current task/status: `HANDOVER.md`;
- repository rules: `AGENTS.md`;
- autonomous execution method: `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`.

If a historical statement conflicts with current design/code, treat it as history.

Detailed older handoff evidence through VIS-12J is archived in:
`docs/history/UX_V2_HANDOVER_THROUGH_VIS_12J.md`.

## Durable milestone summary

- **UX2 presentation foundation:** causal context, presentation projection, stable snapshot/client adapters, scene continuity, fail-closed semantic presentation, browser regression harness.
- **VIS-01 / VIS-04:** 2–4 player Top Row topology and compact top anchoring.
- **VIS-05:** deterministic 5–10 player Side Column topology, containment/hit safety, central safe zone, participant hierarchy.
- **VIS-06:** dedicated full-width Guidance, semantic action slots, mapped Hero Skills.
- **VIS-07:** Group/AOE neutral target-scope density without invented progress/order.
- **VIS-08:** open Side Column Stage shell, fail-closed focus, Dying metadata deduplication.
- **VIS-09:** local Judgement Hero overlay, one-row large-Hand navigation, Hand viewport anchoring.
- **VIS-10:** short-portrait Stage containment, action-zone separation, opponent Hero/public Equipment readability.
- **VIS-11:** narrow short-portrait containment and mobile Primary action placement.
- **VIS-12A–J:** mobile skill readability, Hero-first Top Row sizing/composition, pile de-emphasis, Hero crop/focal tuning across surfaces, narrow-width Hand validation, and centered mobile single-target Stage.
- **VIS-12K:** added representative four-player ordinary-turn visual coverage and exposed the Guidance placement mismatch.
- **VIS-12L:** corrected Guidance/action vertical composition so decision guidance remains above bottom actions without displacing the Hand.
- **VIS-12M:** deduplicated already-proven non-Dying Stage source metadata and corrected resulting narrow metadata containment; follow-up stale Dock source-shape coverage was repaired.
- **VIS-12N:** completed the four-player 480×900/390×640 screenshot and geometry matrix; extended the compact short-height Stage layout to fit Group observer and Dying content at 390×640. Focused browser coverage passed locally; exact-revision CI remains pending in HANDOVER.
- **VIS-12O:** separated Deck/Discard from active four-player Top Row Stage content with lower-edge full-size piles at 480×900 and a compact top-edge pile row at 390×640. Six focused state/viewport cases and 19 related 12N/12J/12K/12C regressions passed locally; six screenshots were visually inspected. Exact-revision CI remains pending in HANDOVER.
- **VIS-12P:** deduplicated Group current-participant metadata only when projected Hero Focus role and player ID match; preserved Active Scope, distinct DECISION, nonmatching target-owned metadata, and fail-closed ambiguous focus. Focused display-model tests passed 39/39; the 21-case 12P/12M/12N/12O/12J/12K browser selection passed. Exact-revision CI remains pending in HANDOVER.

## Durable implementation principles established by completed work

These are historical implementation outcomes, not a replacement design specification:

- public interaction presentation uses authoritative projected identities and fails closed when semantic proof is missing;
- viewer/local Hero remains in the Local Player Dock;
- physical opponent seat DOM remains fixed;
- 2–4 players use Top Row and 5–10 use Side Column;
- Interaction Stage content stays within the protected safe zone and above the Local Dock;
- local Guidance and action controls are separate stable surfaces;
- local Hand remains one horizontal layer with responsive overlap/pan behavior;
- persistent local Judgement is associated with the local Hero;
- ambiguous Group/AOE progress/order/outcomes are not fabricated in the client.

For exact current product behavior, always use the UX V2 design document.

## Known deferred semantic gaps

The following remain historical known gaps unless current code/design has since resolved them:

- Group/AOE per-participant resolved/pending/outcome/order requires explicit authoritative projection; do not infer it from remaining IDs, target-array order, timeline, HP, turn owner, or seat position.
- Durable independently proven counter-history / settlement-transition history remains outside the established public UI contract unless authoritative projection support is added.
- Real-device/touch certification, full WCAG audit, live multiplayer timing validation, and production-health certification are separate from browser-layout CI evidence.

## Historical evidence policy

Do not add active task instructions to this file.

When a task closes, add only a short durable milestone/result when it is useful for future review. Keep detailed command sequences, temporary CI failures, and current resume instructions in HANDOVER while active, then archive or remove them when obsolete.
