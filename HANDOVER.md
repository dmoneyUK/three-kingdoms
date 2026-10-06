# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

Product/UI behavior is defined by `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`; execution rules are in `AGENTS.md` and `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`; durable history is in `docs/AUTONOMOUS_UI_ROADMAP.md`.

## Latest result and CI

`UX2.4-SELECTABLE-DETAIL-PENDING-TARGET-CARD-HERO-FOCUS-01` was pushed as `aabb312`. Its predecessor run `37400533926` on `7236cf9d` failed in `npm run test:browser` on two stale expectations for internal `INTERACTION STAGE` / `HERO FOCUS` chrome; the combined feature change repaired those labels/assertions. The new Actions run `37404317662` for `aabb312` was `in_progress` at the latest check; no CI pass is claimed.

Local validation passed: build; focused unit tests 6/6; focused browser regressions 11/11; full browser suite 535/535; targeted ESLint; `git diff --check`.

## Design checkpoint

Reviewed remote design blob `5157af29079cf03f86476b71bc58607a215d6b53`, including §3C and §§12.3–12.9. Player-facing UI should not expose `HERO FOCUS`; Preview/Inspect remain independent local states and must preserve their existing selection and authoritative Stage continuity.

## Next bounded task — UX2.7-PLAYER-FACING-PREVIEW-INSPECT-LABELS-01

Remove the internal `HERO FOCUS` heading from the existing local Preview and opponent Inspect presentations while retaining their useful `PREVIEW TARGET` / `INSPECT` labels and all public details. Do not change target selection, actions, privacy, or Stage identity; add browser assertions for 390/480/1440px and Preview → Inspect → Preview continuity.
