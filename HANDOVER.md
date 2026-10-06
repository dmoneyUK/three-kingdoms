# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

Product/UI behavior is defined by `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`; execution rules are in `AGENTS.md` and `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`; durable history is in `docs/AUTONOMOUS_UI_ROADMAP.md`.

## Latest result and CI

The AOE `npm test` failure on run `37411200534` was repaired in `f98ba4c`. The browser failure on `45b7ce3` (run `37414234939`) was repaired in `bdd039a`; run `37416789582` completed **Success**. Run `37418042611` for `1c5f4ef` completed **Success**. Run `37419896636` for `1d28913` completed **Success** for both build-and-test and deploy. Runs `37419043447` and `37419081776` were **cancelled** by subsequent pushes.

## Design checkpoint

Reviewed remote design blob `5157af29079cf03f86476b71bc58607a215d6b53`, including §§0.35–0.36, 0.51–0.52, 3B, and 12.6–12.9. Public Reaction Chain history must be structured and server-projected; never derive nodes from logs, timeline ordering, private response scans, or animation state.

## Latest implementation — UX2.6-REACTION-CHAIN-NEGATION-NODES-STAGE-01

The Reaction Chain now renders validated public Negation card nodes between the root effect and active response, preserving linked server order while exposing only the public actor and card kind. It omits physical card IDs, private CurrentAction/provider data, inferred pass nodes, and malformed history. PresentationClient tests passed 45/45; the focused Active Current Effect browser slice passed 13/13 across 390/480/1440px and 10-player geometry, including AOE/Halberd regressions; `npm run build`, targeted ESLint, and `git diff --check` passed.

## Next task — UX2.9-FINAL-UX2-INTEGRATION-GATE-01

Audit the implemented UX2 experience against design §12.9 using the current code/tests: 2/4/6/10-player topology; REST/turn, Inspect, Preview-to-Active, single/multi-target, AOE/Halberd, Attack/Dodge, Duel, Negation, Dying/Peach, Judgement, Steal/Dismantle, Borrowed Sword, Hero-skill targeting, self-target, long Guidance, large Hand, and viewer switching. Prioritize 390/480px portrait plus a wide layout; verify privacy, Dock ownership, normal interaction, geometry, and no client-invented legality. Reuse existing tests, add only missing focused regressions, fix only concrete in-scope defects, and keep unsupported semantic history fail-closed; do not alter `tests/browser/ui19.spec.mjs` unless an exact gate failure makes it necessary.
