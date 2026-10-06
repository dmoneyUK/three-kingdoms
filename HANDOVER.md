# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

Product/UI behavior is defined by `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`; execution rules are in `AGENTS.md` and `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`; durable history is in `docs/AUTONOMOUS_UI_ROADMAP.md`.

## Latest result and CI

`UX2.11-AOE-MOBILE-NEGATION-CARD-01` is implemented: proven Group/AOE Negation branches visually distinguish the latest public Negation node as the active gold card-like head while keeping the response waiting node neutral. Public actor/card text remains projection-backed, the root Action card and Target Strip remain stable, and private responder data remains outside the Stage. Local validation passed: build; focused public Negation branch slice 5/5; focused active-current-effect plus protected `ui19.spec.mjs` Group/AOE slice 64/64; targeted ESLint; and `git diff --check`. The pre-commit remote SHA `d5bb7d5` had push-triggered Actions run `37457268458` **in_progress**; this feature push result is not yet observed.

## Design checkpoint

Reviewed remote design blob `530c8ec9b7ef5790b6a8bc27b694ac7b00499a6a` at `db8970d`, including §§0.35–0.36, 0.51–0.54, 3B–3C, 6, 10–12, and the 2026-10-06 Group/AOE mobile composition additions. Group outcomes remain small public summaries gated by server-owned participant/causal proof; the §12.8 Cavalry priority is implemented and is not reopened.

## Next task — UX2.12-AOE-MOBILE-COUNTER-NEGATION-01 (READY TO IMPLEMENT)

For a proven Group/AOE counter-Negation branch with multiple submitted public nodes, preserve the root Action card and Target Strip while keeping the newest public Negation as the only active branch head and older public nodes compact/subdued. Preserve public actor/card projection, neutral waiting copy, private Local Dock controls, protected `ui19.spec.mjs` geometry, fixed seat DOM, privacy, and gameplay/projection semantics; add focused 390/480px and wider browser regressions. Do not infer private passes or add history authority.
