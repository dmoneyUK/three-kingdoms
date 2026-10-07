# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result and CI

Remote `ux-v2` HEAD `cf88742a062e26902ee96d11d947e504c1d20e4a` passed push run #829 (`37572039698`), including `build-and-test` and `deploy`. Local Triumphant change: focused browser spec 8/8 passed; targeted ESLint and `git diff --check` passed. The task change is not yet covered by CI.

## Design checkpoint

Reviewed remote `docs/UX2-refine.md`, blob `7e021455c8fdc9e88dc1b3b20d036400da82be44`, §§1.5–1.8. The direct user decision is recorded locally in blob `ae314707494f48e80c24e18e1a9a186ebb6c37c1`: cross-Hero passive choices belong in the current viewer's Local Dock Action Row, not the viewer's Skills band.

## Current task

`UX2.REFINE-HUA-XIONG-TRIUMPHANT-SKILL-CHOICE-01` — locally implemented. Render authoritative Recover/Draw options in the current viewer's Local Dock Action Row with server-authorized Skip; Hua Xiong's Skills band remains passive. Only `hua_xiong_triumphant` opts into inline choice rendering. Browser regression covers 320/390/480/wide geometry, exact action payloads, Skip, and observer privacy (no private trigger options). No gameplay/server changes. Next: recheck latest exact remote-head CI immediately before committing these task files, then push and record CI for the pushed SHA.
