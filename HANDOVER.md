# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

Product/UI behavior is defined by `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`; execution rules are in `AGENTS.md` and `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`; durable history is in `docs/AUTONOMOUS_UI_ROADMAP.md`.

## Latest result and CI

`UX2.8-AOE-MOBILE-TARGET-STRIP-DENSITY-01` is implemented: proven Group/AOE Target Strips use compact one-row markers at narrow 390px Top Row and 480px Side Column widths, while authoritative participant status, viewer marker, fixed seats, and the protected Hero Focus contract remain unchanged. Local validation passed: build; focused compact-strip browser tests 5/5; the focused active-current-effect plus protected `ui19.spec.mjs` Group/AOE geometry slice 57/57; targeted ESLint; and `git diff --check`. The previous feature SHA `41c7231` passed Actions run `37455806263`; this feature push-triggered result is not yet observed.

## Design checkpoint

Reviewed remote design blob `530c8ec9b7ef5790b6a8bc27b694ac7b00499a6a` at `db8970d`, including §§0.35–0.36, 0.51–0.54, 3B–3C, 6, 10–12, and the 2026-10-06 Group/AOE mobile composition additions. Group outcomes remain small public summaries gated by server-owned participant/causal proof; the §12.8 Cavalry priority is implemented and is not reopened.

## Next task — UX2.9-AOE-MOBILE-NEGATION-BRANCH-01 (READY TO IMPLEMENT)

For a proven Group/AOE Negation ACTIVE window, converge the public branch to a compact Negation-card presentation tied to the existing causal/participant authority, while keeping neutral waiting copy and private responder controls in the Local Dock. Preserve the compact Target Strip, protected `ui19.spec.mjs`, fixed seat DOM, privacy, and gameplay/projection semantics; add focused 390/480px and wider browser regressions.
