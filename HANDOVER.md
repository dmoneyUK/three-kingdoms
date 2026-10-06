# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

Product/UI behavior is defined by `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`; execution rules are in `AGENTS.md` and `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`; durable history is in `docs/AUTONOMOUS_UI_ROADMAP.md`.

## Latest result and CI

`CI-REPAIR-ROOM-SAFETY-STAGE-LABEL-ASSERTION-01` was pushed as `5e476d9`. Actions run `37405661888` completed successfully; it repairs the sole failure in `37404719333` by replacing the obsolete `INTERACTION STAGE` text assertion with an accessible-name check and an assertion against visible architectural chrome.

`UX2.6-AOE-ORDERED-SCOPE-AND-CURRENT-PARTICIPANT-01` was pushed as `79b4e54`. It keeps the full server-selected ordered Group/AOE target scope separate from the single current participant; `remainingIds` remains continuation-only, and checkpoint updates require matching causal-frame proof. Actions run `37408039555` completed `cancelled`; no feature-CI pass is claimed. The current remote head `ceb5c6b` is a documentation-only status update whose Actions run `37408137461` completed successfully.

`UX2.6-AOE-EXPLICIT-PARTICIPANT-PROGRESS-01` is implemented locally and ready for delivery. Standard Barbarian Invasion / Raining Arrows persist server-owned ordered participant statuses and expose them in `PresentationV2.groupResolution` only with matching root scope and causal proof. Local build passed; Presentation V2 tests passed 35/35; focused Worker/D1 tests passed 30/30; targeted ESLint and `git diff --check` passed. The current remote head's required CI passed; this local change has not yet been pushed or CI-validated.

## Design checkpoint

Reviewed remote design blob `5157af29079cf03f86476b71bc58607a215d6b53`, including §§0.35–0.36, 0.51–0.52, 6, and 12.3–12.9. Group/AOE participant status and Reaction Chain history must be explicitly server-projected; the Stage consumes only proven projection and never infers status, order, outcome, or legality from continuation tails, timeline order, HP, turn owner, or seat position.

## Next task — UX2.6-AOE-PARTICIPANT-PROGRESS-STAGE-CONSUMER-01

Forward the validated Standard AOE `groupResolution.participantProgress` through the typed snapshot/client adapter and render each projected status on the existing Stage target cards. Preserve authoritative participant order and make CURRENT visually dominant while retaining the design's compact density for 4+ participants. Fail closed on any identity/scope mismatch; do not add outcomes, Reaction Chain history, new controls, Halberd behavior, or gameplay/legal-action changes. Cover small and large player counts and responsive Stage geometry.
