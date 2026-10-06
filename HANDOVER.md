# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

Product/UI behavior is defined by `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`; execution rules are in `AGENTS.md` and `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`; durable history is in `docs/AUTONOMOUS_UI_ROADMAP.md`.

## Latest result and CI

At the latest pre-commit check, remote head `487fbd9` had Actions run `37398791627` completed as failure in `npm test`. The failure was reproduced as stale UI assertions for player-facing Hero Focus roles and duplicated decision metadata. This combined task includes the narrow presentation/assertion repair alongside the actor-scoped card projection.

The projection and repair passed local `npm test` (build, fast 204/204, API 249/249), the three Judgement Stage browser viewports (3/3), targeted ESLint, and `git diff --check`. No Actions result for this combined push is claimed here.

## Design checkpoint

Reviewed remote design blob `5157af29079cf03f86476b71bc58607a215d6b53`, including §§0.30, 0.65, 3B target redirection, 3C SELECTABLE DETAIL, §§10–11, and 12.3–12.9. SELECTABLE DETAIL may use only server-projected eligible objects; concealed positions remain anonymous and the existing picker remains the fallback when proof is incomplete.

## Current task — UX2.4-SELECTABLE-DETAIL-PENDING-TARGET-CARD-HERO-FOCUS-01

Migrate only the existing Steal/Dismantle `target_card` Pending from its separate modal into the proven external Hero Focus, consuming the actor-scoped `currentAction.targetCardSelection` projection. Keep Hand positions anonymous, show only projected public object IDs, preserve Local Dock confirmation and the existing `choose_target_card` zone/index-or-ID payload, and retain the current picker when the projection/focus proof is absent or invalid. Reconcile local choice on action revision/availability changes and do not extend this migration to trigger-based Retaliation or other selectable-detail flows.
