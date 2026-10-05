# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

This file contains only the current execution handoff. Product design is in `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`; execution rules are in `AGENTS.md` and `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`; history is in `docs/AUTONOMOUS_UI_ROADMAP.md`.

## Latest delivery / CI checkpoint — UX2.2-HF-ACTIVE-01

Status: **IMPLEMENTED — CI PENDING** at source commit `e25b5240d7080538967895a3e168177ef0858a04`. CI for this delivery has not been observed; no production or Reviewer acceptance is implied. GitHub CLI was not authenticated at the prior one-time check, so do not infer a CI result.

Local validation: Current Effect matrix passed 5/5 across 390px Top Row, 480px Side Column, and 1440px Top Row, including Inspect preservation and fail-closed absence. Combined Current Effect/Preview/Borrowed Sword/Inspect browser tests passed 20/20; six selected existing UI-19 active-stage/Inspect regressions passed. Targeted ESLint and `git diff --check` passed. No full local test/build/lint suite was run; `tests/browser/ui19.spec.mjs` was not modified.

Completed: local PREVIEW and public opponent INSPECT share Hero Focus. Proven single-target Attack Response now presents its public `stage.effect` as Current Effect; connectors are shown only when the Hero Focus is the projected active target. Inspect over an ACTIVE Stage preserves effect context without a misleading participant link.

## Design checkpoint

Reviewed current remote design blob `7d460ad6e998ef6666cf6299a190b727e14bb768` (unchanged). The bounded §12.3 single-target Attack Response slice is implemented; the rest of §12.3 remains open. Direct user authorization enables autonomous task decomposition; the design remains the product behavior authority.

## Current task — UX2.2-HF-ACTIVE-01 Proven Current Effect in ACTIVE composition

Status: **IMPLEMENTED — CI PENDING**.

Bounded scope delivered in `e25b524`: for the proven single-target ACTIVE Attack Response slice, make the existing public `stage.effect` an explicit Current Effect between the external source and focused target where those participants are shown. Use only the authoritative `PresentationClientView` effect and participant roles. Keep the viewer Hero Dock-only; preserve Stage identity, targets, Reaction Chain, and current decision context. Missing/empty effect renders no fabricated effect. No timeline/log/pending/turn inference, client legality changes, server/protocol changes, or gameplay changes.

Focused acceptance: representative Top Row/Side Column phone and wide layouts; unchanged authoritative identity and target; no fabricated Current Effect in pure REST/PREVIEW; Inspect over ACTIVE preserves effect but never links it to the inspected Hero; missing effect fails closed. All focused criteria passed as listed above.

Resume point: implementation and focused evidence are complete. At the next planning boundary, re-read the latest remote HANDOVER, autonomous workflow, and overall design before choosing one successor. Inspect the latest relevant push-triggered run once before that successor's first source edit; if GitHub status is unavailable, retain CI as unverified.
