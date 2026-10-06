# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

Product/UI behavior is defined by `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`; execution rules are in `AGENTS.md` and `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`; durable history is in `docs/AUTONOMOUS_UI_ROADMAP.md`.

## Latest result and CI

Remote head `527e7fe` failed Actions run `37411200534` at `npm test` because the AOE failure-damage path called an undefined participant-status helper; its repair was pushed with the AOE Stage task as `f98ba4c`, and local `npm test` passed build, fast 213/213, and API 250/250. Run `37414138268` for `f98ba4c` was cancelled after a docs push. Latest remote head `45b7ce3` failed run `37414234939` at `npm run test:browser`: compact Group cards were horizontally scrollable, but three geometry cases counted clipped track children as visible Stage overflow. The browser assertions now check the scroll viewport and last-card reachability; Hero-art geometry fixtures wait for successful image load. The full local browser step passed 539/539 and targeted ESLint passed; no CI pass is claimed for this repair yet.

## Design checkpoint

Reviewed the current remote design blob `5157af29079cf03f86476b71bc58607a215d6b53` (unchanged since the prior checkpoint), including §§0.35–0.36, 0.51–0.52, 3B, and 12.3–12.9. Public Reaction Chain history must be explicitly structured and server-projected; never derive nodes from logs, timeline ordering, private response scans, or animation state.

## Next task — UX2.6-REACTION-CHAIN-NEGATION-HISTORY-01

Persist and project an ordered, viewer-equal public history of actually submitted Negation cards in the active Negation continuation, including counter-Negation links. Omit private responder scans and pass/decline actions; bind nodes to proven interaction/frame identity and fail closed on mismatch. Keep private CurrentAction controls unchanged, do not add UI rendering in this task, and do not infer from logs or timeline. Cover ordinary and nested Group Negation, multiple counters, observer/actor projection equality, and pass/stale cases with focused engine-backed tests.
