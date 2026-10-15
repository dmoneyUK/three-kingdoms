# WTK UX2 — Current Handoff

Branch: `ux-v2`

Latest reviewed design: `docs/UX2-refine.md` blob `29c59710c8606e482a95de7b825a6dd84c96ab23`. After R4, the remote design was reread through §11. §8.7 still permits interruption only by a newly committed, publicly proven response; §9 retains the all-living-seats explicit Negation/Pass rule and immutable 8-second maximum. §§8.1–8.5 and §10.5.3 remain closed. §10.8 H1 → H2 → H3 is next; H2's newer placement is Hero name on portrait, real player name below, HP upper-right, Equipment below that strip. H3 requires short, proof-backed, readable announcements. §11 UX3 remains out of scope.

## Latest result

§10.7.4 R4 delivered in `e5ef24aa5d2de0ebaab5093895a372c978bf0042`: attached selected-card DETAILS affordance and reduced duplicate Card Details headings. Exact-SHA Actions run [38664033947](https://github.com/dmoneyUK/three-kingdoms/actions/runs/38664033947) passed Lint/fast, API, browser startup/room smoke (1 test), D1 migration step, build, Worker deployment and production `/` + `/api/health` smoke. Worker version: `4fba4a89-6feb-4562-afde-23b46f33bd07`. No local automated tests were run per user instruction; the routine browser smoke did not run the R4-specific visual cases. R4 is **PENDING REVIEW**; no UX acceptance is claimed.

## Current task — §10.8.1 H1: own in-game Hero Details panel

Change only the active-game local Hero information path. Replace its full-screen modal/backdrop with a battlefield-bounded, nonmodal panel using genuine existing Hero art; show canonical Hero name, faction, correctly sourced HP and every named skill with its full description. Keep scrolling inside the text area; preserve close, Escape/outside-tap dismissal and focus return. It must not block Hand, Guidance, timer or legal controls. Preserve the real self-target selection behavior and provide a separate accessible Details control during self-target actions. Do not change pre-game HeroSelection, opponent Inspector, rules, privacy or other Hero flows. Re-read the latest remote design before edits and follow the current §10.8.1 criteria. After exact-SHA CI/deploy, record truthful evidence as **PENDING REVIEW** and continue to H2; do not implement UX3.
