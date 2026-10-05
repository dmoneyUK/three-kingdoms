# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

Product/UI behavior is defined by `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`; execution rules are in `AGENTS.md` and `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`; durable history is in `docs/AUTONOMOUS_UI_ROADMAP.md`.

## Latest result and CI

`UX2.3-ACTIVE-GROUP-CURRENT-EFFECT-01` is implemented locally, not yet pushed. It renders the typed, proven Group source/effect/current participant and keeps original scope neutral without inventing progress. Focused Current Effect browser coverage passed 40/40; the two UI-19 Group contract repairs passed 2/2; targeted ESLint and `git diff --check` passed. No full local suite/build/lint was run.

The prior Actions run `37387292028` for `0b4b01d6457082f9fef44b12200e3e23f1e74f27` failed in `npm run test:browser`; its two stale Group metadata assertions are repaired in this task and will be committed with the feature. No result is claimed for the next Actions run before it is observed.

## Design checkpoint

Remote design blob `5157af29079cf03f86476b71bc58607a215d6b53` is unchanged. Re-reviewed the complete autonomous workflow and §§0.35, 12.3, 12.6–12.9. Group Current Effect consumes existing proven source/effect/current-participant projection; it does not infer per-participant progress/order from target order or remaining IDs.

## Current task — UX2.3-ACTIVE-TARGET-SHIFT-CURRENT-EFFECT-01

Prove redirected Attack presentation using typed public Stage facts: Current Effect follows the proven active target while the original target remains a neutral original scope. Missing or inconsistent proof stays fail-closed; do not invent a redirect actor or Reaction Chain event that the public projection does not provide. Add focused browser coverage for mobile Top Row, Side Column, wide layout, and viewer-in-Dock behavior. No server, gameplay, privacy, or action-payload change.
