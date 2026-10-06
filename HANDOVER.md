# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

Product/UI behavior is defined by `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`; execution rules are in `AGENTS.md` and `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`; durable history is in `docs/AUTONOMOUS_UI_ROADMAP.md`.

## Latest result and CI

`UX2.16-AOE-MOBILE-GROUP-NEGATION-GUIDANCE-01` is implemented and pushed as `6baec5f`: the browser fixture now proves a viewer who owns the server-authorized Group/AOE Negation response sees `Play Negation or Skip.` only in the Local Player Dock. The public Stage keeps the Raining Arrows root/Target Strip, redacts public decision/resolver identity, renders no private guidance or public branch, and preserves the existing observer/non-Group paths. Local validation passed: focused Group/AOE plus Negation-guidance coverage 28/28; protected `ui19.spec.mjs` Group/AOE geometry/Stage slice 37/37; build; targeted ESLint; and `git diff --check`. The exact feature SHA has push-triggered Actions run `37458837327` **in_progress**; no CI success is claimed.

## Design checkpoint

Reviewed the complete 6907-line remote design at `6baec5f`; blob remains `530c8ec9b7ef5790b6a8bc27b694ac7b00499a6a`. The full review confirms the established architecture/authority/privacy/baseline contracts, the §12.6 Group/AOE composition, §12.7 fast-response contract, §12.8 planning priorities, §12.9 final gate, and the historical verification record. Group outcomes remain small public summaries gated by server-owned participant/causal proof; the §12.8 Cavalry priority is implemented and is not reopened.

## Next task — UX2.17-AOE-MOBILE-GROUP-GUIDANCE-GEOMETRY-01 (READY TO IMPLEMENT)

`UX2.17-AOE-MOBILE-GROUP-GUIDANCE-GEOMETRY-01` — Measure the authorized Group/AOE Negation fixture at 390px, 480×900, and one wider layout. Prove that Stage/root/Target Strip geometry stays stable before and after local response-card selection; Guidance remains readable and adjacent below the Stage; Hand, Confirm, and Skip remain reachable without overlap or horizontal overflow. Preserve CurrentAction authority, public responder privacy, fixed seat DOM, and all existing Group/AOE branch/observer regressions. Stop if proving this requires new gameplay/projection authority or a layout/product decision not defined by §§12.6.12/12.7.6.
