# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `USER-DIRECTED UX REPAIR`

## Latest result / CI

Attack→Dodge graph readability is extended to 30 seconds of graph-ready visibility per viewer, with an on-screen `0:30` countdown beside the root card. The timer pauses with graph unavailability, polling follows the remaining visible interval, and a different authoritative root still preempts immediately. Negation remains at 3 seconds. No test files were changed or added.

Feature commit `df2d675719ba99bf6dc030c7eb8061b9b932efe8`; CI-only lint repairs `b8dc09fbda414cea488d9f84911dc2eecd57b2dd` and `cddba6bf1e6faa8bc365aabfcb3658dba2801d31`. Exact remote CI run `38018860884` (#971) for `cddba6b` succeeded, including API tests, browser startup smoke, lint/fast tests, deployment, and production health smoke. Exact `NODE_OPTIONS=--max-old-space-size=8192 npm run lint` also passed locally. Real Attack→Dodge gameplay screenshot has not been manually verified.

## Design checkpoint

Latest `docs/UX2-refine.md` blob `6ad42a6f4522be67bd492a20aa1564e420aeffe2` reviewed; unchanged since the prior handoff. §6.29.1 says 3 seconds, overridden for this bounded change by the user's direct 30-second instruction. No Reviewer acceptance is claimed.

## Current task

`UX2-6.29.1-ATTACK-DODGE-VISIBLE-30S-TIMER-04` — keep open until the user confirms the deployed real-game `0:30→0:00` Attack→Dodge graph. Before any next code commit, inspect exact current-HEAD CI; do not add tests.
