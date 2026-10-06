# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

Product/UI behavior is defined by `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`; execution rules are in `AGENTS.md` and `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`; durable history is in `docs/AUTONOMOUS_UI_ROADMAP.md`.

## Latest result and CI

The previous feature commit `fb44d95` passed Actions run #758 (`37433985701`). `UX2.7-AOE-NEGATED-OUTCOME-01` now exposes `Negated` only after authoritative Negation cancels the exact Raining Arrows / Barbarian Invasion Group participant and that participant resolves. Open windows, pass-only resolution, counter-Negation, and mismatched target identity remain outcome-free. Local validation passed: build, focused presentation tests 111/111, engine-backed API tests 29/29, targeted ESLint, and `git diff --check`. This task's push-triggered CI result is not yet observed.

## Design checkpoint

Reviewed remote design blob `5157af29079cf03f86476b71bc58607a215d6b53`, including §§0.35–0.36, 0.51–0.54, 3B–3C, 6, 10–12, and the 2026-10-04 correctness additions. Group outcomes remain small public summaries gated by server-owned participant/causal proof; the §12.8 Cavalry priority is implemented and is not reopened.

## Next task — UX2.7-AOE-DEFEATED-OUTCOME-01 (READY TO IMPLEMENT)

Project `Defeated` only when positive AOE damage leads to an authoritative Dying failure for that exact Raining Arrows / Barbarian Invasion participant and the Group continuation resumes. A rescued participant remains `Damaged`; pending Dying, unrelated defeats, and mismatched continuations expose no `Defeated` outcome. Preserve server authority, privacy, fail-closed projection, and protected `ui19.spec.mjs`; add focused server-to-Stage regressions.
