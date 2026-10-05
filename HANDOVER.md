# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

This file contains only the current execution handoff. Product design is in `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`; execution rules are in `AGENTS.md` and `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`; history is in `docs/AUTONOMOUS_UI_ROADMAP.md`.

## Latest delivery / CI checkpoint — UX2.3-FAST-RESPONSE-TIMER-01

Response timer presentation `f5217d2` is pushed. Its focused browser spec passed 1/1, targeted ESLint passed, and `git diff --check` passed. Actions run `37310264410` is for this exact SHA: the `build-and-test` and `deploy` jobs both report **success**, while the workflow run itself still reports **in_progress**; do not record the run as fully green until its conclusion is observed. The preceding CI recovery `18fff19` / run `37307938922` completed successfully after correcting the stale compact-Dock assertion; details remain in `docs/AUTONOMOUS_UI_ROADMAP.md`. No full local suite/build/lint was run.

## Design checkpoint

Reviewed remote design blob `45430bc62b7c50bcbeef40724408ead94ad27120` at `origin/ux-v2` commit `f5217d20f8c3f9f9b97e16c897517f62fbda4a0a`; unchanged from the prior recorded design. Re-read §§0.91.1–0.91.5 and 12.0–12.8, including the response-window timer, privacy, vocabulary, visual hierarchy, and acceptance contracts. No intervening design change was present.

## Current task — UX2.3-FAST-RESPONSE-TIMER-02

Status: **IMPLEMENTED — FOCUSED VALIDATION PASSED; READY TO PUSH**. For the preceding `f5217d2` push, both Actions jobs succeeded; workflow conclusion remains in progress/unverified.

Bounded scope: render the existing neutral response-window timer for non-responding viewers as well as the eligible responder when the viewer projection explicitly has `phase=response`, `CurrentAction.kind=response`, and a positive authoritative deadline. Key the timer to the window/deadline, not a private actor; retain the existing actor-gated fallback for response-ready legacy/trigger views. Preserve the actor-null/empty-legal-actions observer projection and keep all response controls, guidance, and legality viewer-gated. Do not change server/API/projection behavior, gameplay, other countdowns, or Stage/Dock layout.

Acceptance: focused browser coverage compares responder and observer views with the same timer label/deadline; proves the observer has null actor, no legal actions/private response options/response controls, and no responder identity in timer copy; proves a missing deadline hides the timer; and retains 390px, 480px, and wide-viewport placement coverage. The response-timer browser spec passed 3/3, targeted ESLint passed, and `git diff --check` passed. No full local suite/build/lint was run. Update roadmap and handover, then commit/push and record the exact CI state. Preserve existing VIS-12N coverage.

Resume point: `seatCountdown` now accepts an authoritative shared response window without requiring a viewer actor, and its response key uses the deadline only. The browser fixture models a responder and an observer with the same deadline; the observer's actor is null, legal actions/options and local response controls are absent, yet the neutral timer is visible. A response-kind observer with no deadline remains timer-free. The prior timer styling and 390px/480px/1440px geometry and urgency checks remain unchanged.
