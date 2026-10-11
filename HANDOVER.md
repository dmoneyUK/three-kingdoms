# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `USER-DIRECTED UX2 TASK`

## Latest result / CI

`UX2-6.36-03-LONGDAN-ATTACK-AS-DODGE-GRAPH-PROOF` shipped in `f9cb0fe006bb5770f00ee84b2d2e2762feb6adec`; its CI-only lint repair shipped in `2bfdc5b1632c1406571ad523cba05d5b92d718c2`. The server accepts a Dodge proof only for Zhao Yun’s exact `zhao_yun_attack_as_dodge` execution consuming one physical Attack as Dodge; the public event keeps its Attack face while typed proof binds exact root/response/resolution/frame/source/target. Projection, snapshot validation and overlay layout preserve physical/effective identity. Real four-player browser flow showed the graph from attacker, defender and observer views with `AS DODGE`. Focused API (40), presentation/snapshot (64), build and converted-response browser checks passed. Exact final-SHA Actions run `38124908539`: **success** (Lint/fast, API, browser smoke, deploy). Production `/api/health` returned `{"ok":true,"worker":"available"}` and the deployed page bundle contains the full `2bfdc5b1632c1406571ad523cba05d5b92d718c2` SHA. A separate ordinary-Dodge browser run reached and passed graph assertions but failed its existing 20-second timing assertion: the observer saw the exit class about 687ms before layout-ready `shownAt`; timers are out of scope. Focused local ESLint exhausted Node heap (default and 4GB); Actions lint is green.

## Design checkpoint

Latest remote `docs/UX2-refine.md` blob: `d966440b487bcbe172d5ea608704cc6945dfe6df` (reviewed; §6.36.4 Task 3 governs this bounded Longdan proof repair).

## Current task

`WTK-TEST-ROOM-HERO-SELECTION-01` — Add host-controlled hero selection to test games while leaving ordinary multiplayer unchanged. The user requested this after Task 3; confirm the intended assignment flow (default proposal: host assigns heroes per test seat before match start) before implementation. Do not mix it into the completed Longdan change.
