# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

Product/UI behavior is defined by `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`; execution rules are in `AGENTS.md` and `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`; durable history is in `docs/AUTONOMOUS_UI_ROADMAP.md`.

## Latest result and CI

`UX2.3-ACTIVE-TARGET-SHIFT-CURRENT-EFFECT-01` (`81ac72d`) is pushed. Its Actions run `37393574566` failed in the browser job; that failure has been addressed in the next commit, with the short-screen Group Stage compacted and UI-19 assertions aligned to current fail-closed presentation.

`UX2.4-SELECTABLE-DETAIL-OPAQUE-HAND-POSITIONS-01` (`0e2cc79`) is pushed with that repair. Its Actions run `37398701721` is in progress; no CI pass is claimed. The full local browser job passed 526/526; Frost/selector coverage passed 19/19; the short-portrait matrix passed 20/20; targeted ESLint and `git diff --check` passed.

## Design checkpoint

Reviewed remote design blob `5157af29079cf03f86476b71bc58607a215d6b53`, including §§0.30, 0.65, 3B target redirection, 3C SELECTABLE DETAIL, and 12.3–12.9. SELECTABLE DETAIL may use only server-projected eligible objects; concealed positions remain anonymous and the existing picker remains the fallback when proof is incomplete.

## Current task — UX2.4-PENDING-TARGET-CARD-ELIGIBILITY-PROJECTION-01

Add a viewer-scoped `CurrentAction` projection for eligible Hand positions and public Equipment/Judgement objects in the existing Steal/Dismantle `target_card` Pending. Preserve the `choose_target_card` action payload, server revalidation, and current picker; do not change React rendering in this task. Prove actor-only availability, anonymous in-range `hand:<index>` keys, public object IDs, and empty/stale-target behavior before a separate Hero Focus migration.
