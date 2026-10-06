# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

Product/UI behavior is defined by `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`; execution rules are in `AGENTS.md` and `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`; durable history is in `docs/AUTONOMOUS_UI_ROADMAP.md`.

## Latest result and CI

`UX2.15-AOE-MOBILE-NEGATION-WAITING-PRIVACY-01` is implemented: proven Group/AOE NEGATION without a public submitted node keeps the root Raining Arrows effect visible, retains the authoritative Target Strip, and suppresses the generic empty Reaction Chain without exposing private responder/provider data. Ordinary non-Group Negation chains remain unchanged. Local validation passed: focused open/return/counter Group Negation coverage 15/15; ordinary Reaction Chain regressions 2/2; build; focused active-current-effect plus protected `ui19.spec.mjs` Group/AOE slice 76/76; targeted ESLint; and `git diff --check`. The pre-commit remote SHA `5443a33` had push-triggered Actions run `37457833613` **in_progress**; this feature push result is not yet observed.

## Design checkpoint

Reviewed remote design blob `530c8ec9b7ef5790b6a8bc27b694ac7b00499a6a` at `db8970d`, including §§0.35–0.36, 0.51–0.54, 3B–3C, 6, 10–12, and the 2026-10-06 Group/AOE mobile composition additions. Group outcomes remain small public summaries gated by server-owned participant/causal proof; the §12.8 Cavalry priority is implemented and is not reopened.

## Next task — UX2.16-AOE-MOBILE-GROUP-NEGATION-GUIDANCE-01 (READY TO IMPLEMENT)

For the viewer who is the server-authorized Group/AOE Negation responder, verify the Local Player Dock owns the direct \`Play Negation or Skip.\` guidance while the public Stage remains neutral and responder-private. Preserve CurrentAction authority, root/Target Strip geometry, protected `ui19.spec.mjs` geometry, fixed seat DOM, privacy, and gameplay/projection semantics; add focused 390/480px and wider browser regressions. Do not move private guidance into the public Stage or infer responder ownership.
