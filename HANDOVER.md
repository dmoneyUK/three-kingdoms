# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

Product/UI behavior is defined by `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`; execution rules are in `AGENTS.md` and `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`; durable history is in `docs/AUTONOMOUS_UI_ROADMAP.md`.

## Latest result and CI

`UX2.17-AOE-MOBILE-GROUP-GUIDANCE-GEOMETRY-01` adds a three-viewport browser regression proving Stage, Raining Arrows root, and proven Target Strip geometry remain stable (≤1 CSS px) before/after selecting the authorized local Negation response. Guidance, Hand, Confirm, and Skip remain readable/reachable without overlap or horizontal overflow. Focused Group/AOE, Negation, observer/privacy, and related Stage regressions passed 38/38, including the new 390×844, 480×900, and 1440×900 cases; targeted ESLint and `git diff --check` passed. Before this task commit, exact remote SHA `e676385d633c15cf74a5051e2dbcc87276d733ab` had push-triggered Actions run `37459258633` **success**.

## Design checkpoint

Reviewed the complete 6907-line remote design at `e676385d`; blob `530c8ec9b7ef5790b6a8bc27b694ac7b00499a6a`. The review confirms §12.6 Group/AOE composition, §12.7 fast-response behavior, §12.8 priorities, and §12.9 final gate. The source identity is already public/proven in the current Group Negation fixture, but the central source presentation is omitted when several Group targets prevent a unique Hero Focus; do not infer a source or duplicate the local viewer in the Stage.

## Next task — UX2.18-GROUP-AOE-PROVEN-SOURCE-PRESENTATION-01 (READY TO IMPLEMENT)

`UX2.18-GROUP-AOE-PROVEN-SOURCE-PRESENTATION-01` — For the authorized public Group/AOE Negation case, render the already-proven non-viewer `stage.source` as the compact Stage source while multiple Group targets are shown in the Target Strip. Preserve the local viewer's source as Dock-only; keep the Target Strip as the sole current-participant display; do not add source HP/skill/equipment/hand metadata or infer identity. Prove source/root/Target Strip roles and privacy for local responder and observer fixtures at mobile and wide widths; retain existing Group/AOE regressions. Stop if the typed public source proof is absent or this requires new protocol/gameplay authority or an undefined layout decision (§§12.6.1–12.6.2, 12.6.12).
