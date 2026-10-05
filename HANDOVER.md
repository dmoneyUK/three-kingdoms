# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

Product/UI behavior is defined by `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`; execution rules are in `AGENTS.md` and `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`; durable history is in `docs/AUTONOMOUS_UI_ROADMAP.md`.

## Latest result and CI

`UX2.4-RANDOM-HAND-SELECTABLE-DETAIL-01` shipped at `16191de7aa01494860837d8263cef828161dc189`. Focused target-card browser checks passed 12/12, focused Retaliation/opaque-key/pendingTargetCard Node checks passed 4/4, and targeted ESLint plus `git diff --check` passed. Exact Actions run `37379800040` for `16191de` completed successfully, including `build-and-test` and `deploy`; current documentation-only HEAD `da47f82` has no separate Actions run observed. `tests/browser/ui19.spec.mjs` remains unchanged.

## Design checkpoint

Remote design blob `5157af29079cf03f86476b71bc58607a215d6b53` is unchanged. Re-reviewed §0.6.8, §§0.6.4–0.6.6, §§3–3C, §§4–11, §§12.0–12.9, and additions A–C. Proven Judgement scenes expose a public source/effect/current participant and active-target relationship; current UI composition currently supports Attack Response, Negation, Duel, and Dying only.

## Current task — UX2.3-ACTIVE-JUDGEMENT-CURRENT-EFFECT-01 (implementation complete locally; push/CI pending)

The Stage now shows Current Effect for `JUDGEMENT` only when the typed public scene proves its source/effect and one active target matching the current participant. Distinct Source → Effect → Target and same-participant cases use accurate public copy; the local participant stays in the Dock, and missing/mismatched proof keeps the existing fallback. The focused `active-current-effect.spec.mjs` passed 29/29; targeted ESLint on `app/page.tsx` and the spec passed with 0 errors (`fixture.jsx` has no matching ESLint config); `git diff --check` passed. Protocol/game rules/private controls and `tests/browser/ui19.spec.mjs` are unchanged. No CI has run for this local change yet.
