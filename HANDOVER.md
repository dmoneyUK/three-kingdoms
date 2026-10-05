# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

This file contains only the current execution handoff. Product design is in `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`; execution rules are in `AGENTS.md` and `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`; history is in `docs/AUTONOMOUS_UI_ROADMAP.md`.

## Latest delivery / CI checkpoint — UX2.3-FAST-RESPONSE-TIMER-02

Shared response-window timer `eb54f01` is pushed. The focused response-timer browser spec passed 3/3, targeted ESLint passed, and `git diff --check` passed. Exact Actions run `37312290991` is **queued** for `eb54f01`; the one-time checkpoint is complete and the next bounded task may proceed. Timer presentation `f5217d2` / run `37310264410` completed **successfully**; CI recovery `18fff19` / run `37307938922` also completed successfully. Durable evidence is in `docs/AUTONOMOUS_UI_ROADMAP.md`. No full local suite/build/lint was run.

## Design checkpoint

Reviewed remote design blob `45430bc62b7c50bcbeef40724408ead94ad27120` at `origin/ux-v2` commit `eb54f01f619e8bdc0a6079540b66bd9491d75272`; unchanged from the prior recorded design. Re-read §§0.91.1–0.91.5 and 12.0–12.8, including the current-effect direction, response-window privacy, vocabulary, visual hierarchy, and acceptance contracts. No intervening design change was present.

## Current task — UX2.3-HF-DUEL-CURRENT-EFFECT-01

Status: **IMPLEMENTED — FOCUSED VALIDATION PASSED; CI PENDING ON PUSH**. The one-time `eb54f01` checkpoint (`37312290991`) was queued; proceeded per workflow without polling.

Bounded scope: extend the ACTIVE Interaction Stage Current Effect panel to `DUEL_EXCHANGE` only when the proven public scene has a non-empty effect and an explicit current participant contained in its active targets. Present the player-facing label `Duel`; connect to Hero Focus only through the existing projected active-target identity. Missing or ambiguous proof stays unlinked/hidden. Do not change server/API/projection behavior, gameplay, Local Dock controls, or other Stage semantics.

Acceptance: focused Active Current Effect browser spec passed 12/12, covering the authoritative Duel effect/current-participant relationship at 390px Top Row, 480px Side Column, and 1440px Top Row; player-facing effect label, participant flow, viewer-Hero-Dock boundary; and fail-closed absence of effect/current-participant proof. The existing 650px Duel responder UI-19 browser regression passed 1/1 without modifying `ui19.spec.mjs`. Targeted ESLint and `git diff --check` passed. No full local suite/build/lint was run. Commit/push and record the exact CI state.

Resume point: `InteractionStage` now renders the player-facing `Duel` effect only for a proven `DUEL_EXCHANGE` with the public `duel` effect and a current participant contained in active targets. Existing focus projection supplies the participant link; missing effect or participant proof hides the panel. Attack/Negation, Preview, Inspect, and Local Dock behavior remain covered by the 12/12 focused spec.
