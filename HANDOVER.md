# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

Product/UI behavior is defined by `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`; execution rules are in `AGENTS.md` and `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`; durable history is in `docs/AUTONOMOUS_UI_ROADMAP.md`.

## Latest result and CI

`CI-REPAIR-ROOM-SAFETY-STAGE-LABEL-ASSERTION-01` was pushed as `5e476d9`. Actions run `37405661888` completed successfully; it repairs the sole failure in `37404719333` by replacing the obsolete `INTERACTION STAGE` text assertion with an accessible-name check and an assertion against visible architectural chrome.

`UX2.6-AOE-ORDERED-SCOPE-AND-CURRENT-PARTICIPANT-01` now keeps the full server-selected ordered Group/AOE target scope separate from the single current participant. `remainingIds` remains continuation-only; checkpoint updates require matching causal-frame proof. Local build passed; focused API tests passed 48/48; targeted ESLint and `git diff --check` passed. The feature change has not yet been pushed, so it has no Actions result recorded.

## Design checkpoint

Reviewed remote design blob `5157af29079cf03f86476b71bc58607a215d6b53`, including §§0.35–0.36, 0.51–0.52, 12.3–12.9. Group/AOE participant status and Reaction Chain history must be explicitly server-projected; never infer progress or causality from continuation tails, timeline order, HP, turn owner, or seat position.

## Next task — UX2.6-AOE-EXPLICIT-PARTICIPANT-PROGRESS-01

Add persisted, server-owned per-participant status for the Standard AOE family (Barbarian Invasion and Raining Arrows), then expose it in `PresentationV2.groupResolution` only when it matches the complete ordered root scope and causal frame. Track status at engine-owned transitions; do not derive it from `remainingIds`, target order, timeline, HP, turn owner, seats, or animation. This is a projection-only step: do not add player-facing progress UI, outcome summaries, Halberd changes, Reaction Chain history, or gameplay/legal-action changes. Cover initial response, participant advancement, nested Damage/Dying, and authoritative no-longer-applicable cases; malformed or incomplete status must fail closed.
