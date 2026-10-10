# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `USER-DIRECTED UX REPAIR`

## Latest result / CI

Committed Attack→Dodge graph readability is extended to 30 seconds of graph-ready visibility per viewer, with an on-screen `0:30` countdown beside the root card. The timer pauses with graph unavailability, polling follows the remaining visible interval, and a different authoritative root still preempts immediately. Negation remains at 3 seconds. No test files were changed; a CI-only correction for run #970 is pending.

Remote parent `b8dc09fbda414cea488d9f84911dc2eecd57b2dd`, Actions run `38018406436` (#970), failed in ESLint: `react-hooks/set-state-in-effect` rejects synchronous stale-settlement cleanup at `app/page.tsx:4298`. API tests and browser startup smoke passed; build/fast tests in the lint job and deploy were skipped. This CI-only repair removes the effect and uses a guarded render-time state adjustment. Exact `NODE_OPTIONS=--max-old-space-size=8192 npm run lint` passes locally. No test files were changed or added.

## Design checkpoint

Latest `docs/UX2-refine.md` blob `6ad42a6f4522be67bd492a20aa1564e420aeffe2` reviewed; unchanged since the prior handoff. §6.29.1 says 3 seconds, overridden for this bounded change by the user's direct 30-second instruction. No Reviewer acceptance is claimed.

## Current task

`UX2-6.29.1-ATTACK-DODGE-VISIBLE-30S-TIMER-04` — keep open until the user confirms the deployed real-game `0:30→0:00` Attack→Dodge graph. Before any next commit, inspect exact current-HEAD CI; do not add tests.
