# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

Product/UI behavior is defined by `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`; execution rules are in `AGENTS.md` and `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`; durable history is in `docs/AUTONOMOUS_UI_ROADMAP.md`.

## Latest result and CI

The AOE `npm test` failure on run `37411200534` was repaired in `f98ba4c`. The browser failure on `45b7ce3` (run `37414234939`) was repaired in `bdd039a`; run `37416789582` completed **Success**. Run `37418042611` for `1c5f4ef` completed **Success**. Runs `37419896636` for `1d28913` and `37420750930` for `d1ab5dd` completed **Success** for build-and-test and deploy. Runs `37419043447` and `37419081776` were **cancelled** by subsequent pushes.

## Design checkpoint

Reviewed remote design blob `5157af29079cf03f86476b71bc58607a215d6b53`, including §§0.35–0.36, 0.51–0.52, 3B, and 12.6–12.9. Public Reaction Chain history must be structured and server-projected; never derive nodes from logs, timeline ordering, private response scans, or animation state.

## Latest implementation — UX2.9-10P-NARROW-EXIT-CLEARANCE-01

For 10-player Side Column at widths up to 610px without a response timer, Exit now sits in a clear top-centre lane above the Interaction Stage instead of covering the top-right seat. Seat DOM, topology, and timer placement remain unchanged. Focused checks passed: Side Column geometry 12/12 at 320/390/480/610/620/650px; response timer 6/6; target Preview and self-target 10/10; Quick Test active-skill render 1/1; Dock perspective render 1/1; Huang Yueying API file 6/6; `git diff --check`. This local change is not yet covered by CI.

## Current task — UX2.9-FINAL-UX2-INTEGRATION-GATE-01 (IN PROGRESS)

Continue the §12.9 integration audit across the listed topologies and interaction families. Visual checks already cover 2/4/6/10-player layouts, Inspect, Preview-to-Active, Attack/Dodge, Duel, Negation, Dying/Peach, Judgement, AOE/Halberd, Selectable Detail, Borrowed Sword, self-target, multi-target selection, long Guidance, and large Hand; mobile and 1440px screenshots were saved and inspected. Remaining: replace the raw parent-frame technical label visible in Borrowed Sword Stage context with player-facing wording (confirm production projection and add a focused regression), then complete the privacy/meaningfulness pass. Quick Test acting-seat ownership passed focused API/component checks, but no live viewer-switch browser fixture was available. Keep the final gate open; do not alter `tests/browser/ui19.spec.mjs` unless an exact gate failure requires it.
