# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

This file contains only the current execution handoff. Product design is in `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`; execution rules are in `AGENTS.md` and `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`; history is in `docs/AUTONOMOUS_UI_ROADMAP.md`.

## Latest delivery / CI checkpoint — UX2.2-HF-ACTIVE-01

Status: **IMPLEMENTED — CI PENDING** at source commit `e25b5240d7080538967895a3e168177ef0858a04`. The one-time lookup for this push was unavailable because GitHub CLI requires authentication; the run/result was not observed. No production or Reviewer acceptance is implied.

Local validation: Current Effect matrix passed 5/5 across 390px Top Row, 480px Side Column, and 1440px Top Row, including Inspect preservation and fail-closed absence. Combined Current Effect/Preview/Borrowed Sword/Inspect browser tests passed 20/20; six selected existing UI-19 active-stage/Inspect regressions passed. Targeted ESLint and `git diff --check` passed. No full local test/build/lint suite was run; `tests/browser/ui19.spec.mjs` was not modified.

Completed: local PREVIEW and public opponent INSPECT share Hero Focus. Proven single-target Attack Response now presents its public `stage.effect` as Current Effect; connectors are shown only when the Hero Focus is the projected active target. Inspect over an ACTIVE Stage preserves effect context without a misleading participant link.

## Design checkpoint

Reviewed current remote design blob `7d460ad6e998ef6666cf6299a190b727e14bb768` (unchanged). The bounded §12.3 single-target Attack Response slice is implemented; the remaining active composition work is still open. Direct user authorization enables autonomous task decomposition; the design remains the product behavior authority.

## Current task — UX2.2-HF-ACTIVE-NEGATION-01 Current Effect in proven NEGATION

Status: **PLANNED — USER-AUTHORIZED AUTONOMOUS UI RUN**.

Bounded scope: extend the central Current Effect presentation to a single-target proven NEGATION stage. Use only non-empty public `stage.effect`, the sole projected active target, and Hero Focus identity to connect the external source → effect → target. Preserve the existing Attack Response treatment, authoritative Stage identity, Reaction Chain, decision context, and viewer-Hero-in-Dock rule. If effect/target/focus proof is missing or ambiguous, render no inferred connection. No timeline/log/Pending/CurrentAction inference, client legality changes, server/protocol changes, or gameplay changes.

Focused acceptance: representative Top Row wide and Side Column phone geometry for an authoritative single-target NEGATION; Dismantle Current Effect and existing Reaction Chain remain visible; source/effect/focus connect only for the proven active target; identity, target, decision context, and privacy remain unchanged; missing/ambiguous effect/focus fails closed; existing Attack Response tests remain green.

Resume point: before the first source edit, the one-time CI lookup for `e25b524` was attempted but unavailable because `gh` is not authenticated. Keep that delivery CI-unverified; proceed without repeated polling. Stop if the authoritative NEGATION focus/effect relationship cannot be proven from the existing public projection.
