# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

Product/UI behavior is defined by `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`; execution rules are in `AGENTS.md` and `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`; durable history is in `docs/AUTONOMOUS_UI_ROADMAP.md`.

## Latest result and CI

At the pre-commit check, remote head `7236cf9d` had Actions run `37400533926` completed as failure in `npm run test:browser`; build and lint passed, and `npm test` was skipped. The failing assertions required internal `INTERACTION STAGE` / `HERO FOCUS` chrome contrary to §12.7.2. This delivery combines those player-facing assertion/presentation repairs with the active Steal/Dismantle migration.

Local validation passed: build; focused unit tests 6/6; focused browser regressions 11/11; full browser suite 535/535; targeted ESLint. The new push-triggered Actions result is not yet available; no CI pass is claimed.

## Design checkpoint

Reviewed remote design blob `5157af29079cf03f86476b71bc58607a215d6b53`, including §§0.30, 0.65, 3B target redirection, 3C SELECTABLE DETAIL, §§10–11, and 12.3–12.9. SELECTABLE DETAIL may use only server-projected eligible objects; concealed positions remain anonymous and the existing picker remains the fallback when proof is incomplete.

## Current task — UX2.4-SELECTABLE-DETAIL-PENDING-TARGET-CARD-HERO-FOCUS-01

Migrate only the existing Steal/Dismantle `target_card` Pending from its separate modal into the proven external Hero Focus, consuming the actor-scoped `currentAction.targetCardSelection` projection. Keep Hand positions anonymous, show only projected public object IDs, preserve Local Dock confirmation and the existing `choose_target_card` zone/index-or-ID payload, and retain the current picker when the projection/focus proof is absent or invalid. Reconcile local choice on action revision/availability changes and do not extend this migration to trigger-based Retaliation or other selectable-detail flows.
