# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

Product/UI behavior is defined by `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`; execution rules are in `AGENTS.md` and `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`; durable history is in `docs/AUTONOMOUS_UI_ROADMAP.md`.

## Latest result and CI

`CI-REPAIR-ROOM-SAFETY-STAGE-LABEL-ASSERTION-01` was pushed as `5e476d9`. Actions run `37405661888` for that SHA is `in_progress`; no CI pass is claimed. It repairs the sole failure in `37404719333` by replacing the obsolete `INTERACTION STAGE` text assertion with an accessible-name check and an assertion against visible architectural chrome.

The Steal/Dismantle delivery passed local build, focused unit tests 6/6, focused browser regressions 11/11, full browser suite 535/535, targeted ESLint, and `git diff --check`. Preview/Inspect copy passed local build, focused browser tests 14/14, targeted ESLint, and `git diff --check`. The CI-repair regression file passed locally: 19/19 tests.

## Design checkpoint

Reviewed remote design blob `5157af29079cf03f86476b71bc58607a215d6b53`, including §12.7.2 and §§0.35–0.36, 3B, 3C, 12.6, and 12.8–12.9. Architectural headings are not player-facing copy; Group/AOE progress must use explicit server-projected participant data.

## Current task — UX2.6-AOE-ORDERED-SCOPE-AND-CURRENT-PARTICIPANT-01

Have the authoritative Group/AOE start paths pass the complete ordered affected-player list into the causal root, and project the currently resolving participant separately as the single current target. Keep `remainingIds` as continuation input only; do not infer progress/order from it, add UI status labels, alter gameplay legality, or change viewer privacy. Add engine-backed coverage for initial Group, the next target, and nested Negation/Damage states.
