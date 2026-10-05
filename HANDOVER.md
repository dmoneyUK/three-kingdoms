# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

Product/UI behavior is defined by `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`; execution rules are in `AGENTS.md` and `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`; durable history is in `docs/AUTONOMOUS_UI_ROADMAP.md`.

## Latest result and CI

`UX2.3-ACTIVE-JUDGEMENT-CURRENT-EFFECT-01` shipped at `e80906dd8630115b6c1dbcb53c853e643e225cbd`. Focused `active-current-effect.spec.mjs` passed 29/29, targeted ESLint and `git diff --check` passed. Exact Actions run `37384283798` for `e80906d` was observed `in progress` at this handoff update; no completion is claimed. `tests/browser/ui19.spec.mjs` remains unchanged.

## Design checkpoint

Remote design blob `5157af29079cf03f86476b71bc58607a215d6b53` is unchanged. Re-reviewed §§0.6.3–0.6.4, §§0.94–0.105, §11, §§12.3–12.9, and the Borrowed Sword guidance. Proven nested Borrowed Sword Attack scenes expose the holder/current Attack roles and causal parent linkage; the typed client snapshot did not expose the immutable root-frame source/effect/target needed to name the full three-participant path.

## Current task — UX2.3-ACTIVE-BORROWED-SWORD-CURRENT-EFFECT-01 (implementation complete locally; push/CI pending)

The typed public scene now carries root-frame origin only when the root is an ancestor of the proven child frame. The Stage labels `borrowed_sword_attack` as Attack and names the Borrowed Sword source, weapon holder, and forced target only when root-to-holder and active-target/current-participant proof agree; missing or inconsistent root proof retains neutral current-Attack copy. Two-player source/target overlap stays in the Local Dock, duplicate visible decision-owner copy is suppressed, legal controls and rules are unchanged, and `tests/browser/ui19.spec.mjs` is unchanged.

Focused browser coverage passed 35/35 (including 2-player and 390/480/1440px), engine-backed Presentation V2 API coverage passed 26/26, focused projector/client Node coverage passed 75/75, `npm run build` passed, targeted ESLint passed with 0 errors, and `git diff --check` passed. Latest previous Actions run `37384283798` was observed in progress before this task's commit boundary; no CI completion has been observed for the current local change.
