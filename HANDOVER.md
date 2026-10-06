# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

Product/UI behavior is defined by `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`; execution rules are in `AGENTS.md` and `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`; durable history is in `docs/AUTONOMOUS_UI_ROADMAP.md`.

## Latest result and CI

The AOE `npm test` failure on run `37411200534` was repaired in `f98ba4c`. The browser failure on `45b7ce3` (run `37414234939`) was repaired in `bdd039a`; runs `37416789582`, `37418042611`, `37419896636`, and `37420750930` completed **Success** for build-and-test and deploy. Runs `37419043447` and `37419081776` were **cancelled** by subsequent pushes. Run `37424045378` (#750) for `5c4db4c` is currently **in progress**; no result is known yet.

## Design checkpoint

Reviewed remote design blob `5157af29079cf03f86476b71bc58607a215d6b53`, including §§0.35–0.36, 0.51–0.52, 3B, and 12.6–12.9. Public Reaction Chain history must be structured and server-projected; never derive nodes from logs, timeline ordering, private response scans, or animation state.

## Latest implementation — UX2.9-BORROWED-SWORD-CONTEXT-01

Borrowed Sword forced-Attack context no longer displays the parent-frame ID. With complete source/holder/target/current-participant proof, the Stage keeps its player-facing causal sentence as the single expression; without or against that proof, it stays neutral. Focused checks passed: active-current-effect browser tests 53/53, projection/Hero Focus unit tests 2/2, and `git diff --check`. These local changes are not yet covered by CI; run #750 for the preceding pushed commit remains in progress.

## Current task — UX2.9-FINAL-UX2-INTEGRATION-GATE-01 (IN PROGRESS)

Continue the §12.9 integration audit across the listed topologies and interaction families. Visual checks already cover 2/4/6/10-player layouts, Inspect, Preview-to-Active, Attack/Dodge, Duel, Negation, Dying/Peach, Judgement, AOE/Halberd, Selectable Detail, Borrowed Sword, self-target, multi-target selection, long Guidance, and large Hand; mobile and 1440px screenshots were saved and inspected. Borrowed Sword now uses the proven player-facing causal sentence without duplicate frame context; focused regression covers matching, missing, and inconsistent root proofs, and the engine-backed projection already verifies the causal root. Remaining: complete the privacy/meaningfulness pass and note that Quick Test acting-seat ownership has focused API/component proof but no live viewer-switch browser fixture. Keep the final gate open; do not alter `tests/browser/ui19.spec.mjs` unless an exact gate failure requires it.
