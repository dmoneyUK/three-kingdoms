# WTK UX2 — Current Handoff

Branch: `ux-v2`

Latest remote design reviewed: `docs/UX2-refine.md` blob `70d5475976562ca8798d505c84fff6678c412917`; Coding Agent progress-only update is blob `4cfe8e4f1a6149f31a22f01116d58d611705bf41`.

## Latest result

- UI-4 Diao Chan notices delivered in `604c15a`, on branch SHA `9c815e2b15387142e4f58c747a2dfd1c2d3c7cae`. Focused API 8/8, authenticated Worker/D1 browser 2/2, build, Actions run [38654422695](https://github.com/dmoneyUK/three-kingdoms/actions/runs/38654422695) (API, lint/fast, browser smoke, deploy and production smoke) all passed; production `/api/health` returned HTTP 200. No Reviewer acceptance is claimed.
- Local focused ESLint passed for route/game/test files; ESLint on `app/page.tsx` exhausted Node heap at 2 GB and 4 GB. `npx tsc --noEmit` reported existing repository-wide baseline diagnostics. CI lint/build passed on the pushed SHA.
- The latest Planner review reports §10.5.3 closed, UI-1/UI-2 original checks accepted, and new §10.7 R1–R4 defects. UI-4 is delivered; continue without entering a separate UX acceptance phase as directly requested.

## Current task — §10.7.1 R1: responses during Policy-B reveal

Reproduce in an authenticated Worker/D1 game at 440×894 why a server-authorized time-sensitive defender response is disabled while the root CardFace is still revealing. Trace CurrentAction/actionRevision/deadline, `responsePresentationReady`, visual-only `presentationBusy`, Hand/Confirm enabled state and the reason for any block. Remove only visual-read gating for legitimate server-authorized responses; preserve server legality, selection requirements, network-busy/single-submit safety and deadlines. On a genuine committed response, allow the existing Policy-B presenter to hand centre focus to its real card immediately. Start with the scoped cases and viewport widths in §10.7.1; no gameplay-rule changes or unrelated card-family work.
