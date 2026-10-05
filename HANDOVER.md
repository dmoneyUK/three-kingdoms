# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

Product/UI behavior is defined by `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`; execution rules are in `AGENTS.md` and `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`; durable history is in `docs/AUTONOMOUS_UI_ROADMAP.md`.

## Latest result and CI

`UX2.3-ACTIVE-BORROWED-SWORD-CURRENT-EFFECT-01` was pushed as `751ff2f17a6e0bd0fa3070775942989a92522fa7`. Focused browser coverage passed 35/35, engine-backed Presentation V2 API coverage 26/26, projector/client Node coverage 75/75, `npm run build`, targeted ESLint (0 errors), and `git diff --check`. Exact Actions run `37386622775` for `751ff2f` was observed **in progress** at the last check; no completion is claimed. `tests/browser/ui19.spec.mjs` remains unchanged.

## Design checkpoint

Remote design blob `5157af29079cf03f86476b71bc58607a215d6b53` is unchanged. Re-reviewed UI-09 and §§12.4–12.9: SELECTABLE DETAIL renders the server-projected random Hand zone and eligible public cards inside proven Hero Focus, but its visible internal label conflicts with §12.7's player-facing vocabulary requirement. This task changes copy/accessibility naming only; selection authority and payload are unchanged.

## Current task — UX2.4-SELECTABLE-DETAIL-PLAYER-COPY-01 (implementation complete locally; pre-commit CI check pending)

Hero Focus selectable detail now identifies the `Retaliation` effect and its choice in visible and accessible copy instead of showing `SELECTABLE DETAIL`. Focused `target-card-zone-picker.spec.mjs` passed 11/11 at 390/480/1440px; targeted ESLint and `git diff --check` passed. Picker objects, concealed Hand projection, selection state, Local Dock controls, and server payload are unchanged. `tests/browser/ui19.spec.mjs` remains unchanged.
