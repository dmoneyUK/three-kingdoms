# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result and CI

UX2.REFINE tasks 1–7 are implemented. Task 7 adds a typed, viewer-equal single-target Negation disposition to the public snapshot for root cancellation/restoration, bound to the proven interaction/root/resolution; legacy text/final-result flags and malformed identity fail closed. Validation: snapshot + PresentationV2 tests 48/48; `presentation-v2-engine.test.mjs` 33/33 including both settlement outcomes; `npm run build`; targeted ESLint and `git diff --check` passed. Before Task 7 commit, Actions run `37548238667` for exact base SHA `4cdabe38d34230e1bffd36b11b9f513bafb74a44` was `in_progress`, with no failure observed; proceeding without waiting per direct user instruction.

## Design checkpoint

Re-fetched and re-read current `docs/UX2-refine.md`; blob `b4a26be8dc293bfb1f2996821e68a6de75338fcc`. Task 7 addresses §2.12 authority only; Stage rendering/settlement transition remains open.

## Next task

`UX2.REFINE-NEGATION-SETTLEMENT-STAGE-01` — consume the typed settlement proof in the public Stage: for `ROOT_CANCELLED`, collapse the branch and show only a brief compact `⊘` on the root before exiting the interaction; for `ROOT_RESTORED`, collapse the branch and restore the root as the active head while the authoritative root action continues. Keep Source/root/Target geometry stable and fail closed without the typed proof. Prove both states at 390×844, 480×900, and wide with Stage/Dock/Guidance containment, ≤2 CSS px anchor movement, and no overflow; use the existing presentation lifecycle rather than guessed timing or inferred outcomes.
