# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

This file contains only the current execution handoff. Product design is in `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`; execution rules are in `AGENTS.md` and `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`; history is in `docs/AUTONOMOUS_UI_ROADMAP.md`.

## Latest delivery / CI checkpoint — UX2.2-HF-INSPECT-01

Status: **IMPLEMENTED — CI PENDING**. This handoff push contains the implementation; its CI result has not been observed. The previous PREVIEW push run `37289101441` was observed `in_progress` once before this task and was not polled again. No production or Reviewer acceptance is implied.

Local validation: new Inspect browser coverage passed 6/6 across 390/480/1440px Top Row, Side Column, target-selection independence, ACTIVE Stage restoration, public-only data, and Hero/Equipment/Judgement explanations. Five focused legacy Inspect/target-selection tests in `ui19.spec.mjs` passed; Preview and Borrowed Sword regressions passed 9/9. Targeted ESLint and `git diff --check` passed. No full local test/build/lint suite was run; `tests/browser/ui19.spec.mjs` was not modified.

Completed: local target PREVIEW and public opponent INSPECT now use the shared Hero Focus structure. Inspect uses only public player projection fields, concealed Hand count/backs, and remains independent of selected targets and authoritative Stage identity.

## Design checkpoint

Reviewed current remote design blob `7d460ad6e998ef6666cf6299a190b727e14bb768` (unchanged). §12.1 PREVIEW and §12.2 public INSPECT are implemented; §12.3 is the next approved direction: make Current Effect the centre of ACTIVE composition. Direct user authorization enables autonomous task decomposition; the design remains the product behavior authority.

## Current task — UX2.2-HF-ACTIVE-01 Proven Current Effect in ACTIVE composition

Status: **PLANNED — USER-AUTHORIZED AUTONOMOUS UI RUN**.

Bounded scope: for the proven single-target ACTIVE Attack Response slice, make the existing public `stage.effect` an explicit Current Effect between the external source and focused target where those participants are shown. Use only the authoritative `PresentationClientView` effect and participant roles. Keep the viewer Hero Dock-only; preserve Stage identity, targets, Reaction Chain, and current decision context. Missing/empty effect renders no fabricated effect. No timeline/log/pending/turn inference, client legality changes, server/protocol changes, or gameplay changes.

Focused acceptance: representative authoritative Attack Response in Top Row and Side Column phone/wide layouts; explicit Current Effect relationship without viewer duplication; unchanged Stage identity/current target/decision context; no Current Effect for REST, PREVIEW, or INSPECT; absent effect fails closed; focused geometry and semantic regressions.

Resume point: before the first source edit, inspect the latest relevant push-triggered CI run once as required by the workflow. Stop or narrow further if public Current Effect/target authority cannot be demonstrated from the existing projection.
