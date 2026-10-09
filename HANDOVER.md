# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result / CI

The latest relevant Actions run, `37943726091` for `06e9c5b8f75462c2701c9f011202d04d4752fa7a`, failed Browser shard 1 (job `113864425947`); 444 tests passed and two Attack graph tests failed. The 6-player/390×844 graph handoff measured 273ms and 405ms against 250ms. The 8-player/390×844 graph later fell to `geometry-unavailable` at about 14.98s while the server root identity remained unchanged. Other workflow jobs passed. Current remote docs-only HEAD `f6139f6bf345b2bcdd29c7931dcafed3c256e692` has no status checks. A CI-only repair is prepared locally; exact repair-SHA validation is pending. No Reviewer acceptance is claimed.

## Design checkpoint

Latest remote `docs/UX2-refine.md` blob `88c73eb523b6e14f769fc10eee5a5ad40b8f93ba` reviewed, including §§6.28–6.29. Current Task A covers four-player Attack/Dodge graph continuity and the complete 3,000ms public Dodge/Negation counter hold. §6.29.5's global 5–6px active source tether and later AOE tasks remain separate follow-up scope.

## Current task

`UX2-6.29-A-ATTACK-DODGE-CONTINUITY-AND-HOLD-01` — after the CI-repair SHA is green, complete the server-backed four-player Attack graph reproduction and repair: 10 independently seeded windows, ordinary/converted Attacks, attacker/defender/observer views, 390×844, 480×900, and 1440×900; sample private Dodge select/unselect without exposing it; preserve root identity, source/target links, and whole-Dock emphasis through polls and remeasurement; then prove browser-submitted Dodge and Negation/counter-Negation complete causal graphs remain readable for 3,000ms without delaying gameplay. Include reduced motion, reconnect/polling, timeout/Skip, screenshots and timestamped DOM traces. Keep later AOE ownership/projection/progress and expired-link styling out of this task.
