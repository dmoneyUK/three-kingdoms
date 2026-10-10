# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `USER-DIRECTED UX REPAIR`

## Latest result / CI

Committed Attack→Dodge graph readability is extended to 30 seconds of graph-ready visibility per viewer, with an on-screen `0:30` countdown beside the root card. The timer pauses with graph unavailability, polling follows the remaining visible interval, and a different authoritative root still preempts immediately. Negation remains at 3 seconds. No test files were added or changed; the resulting commit's CI has not been observed.

Current remote HEAD `c670e373be13dd0dc9eb50ea9cf33df461af00a5`, Actions run `38002965666` (#968), failed only in ESLint: `useEffect` omitted `activeAttackDodgeSettlement`; build, API tests, and browser startup smoke passed. The dependency issue is repaired in this change. Local `npm run build`, focused overlay ESLint, and `git diff --check` pass. Full `tsc` reports many repository-wide errors outside the changed files; no baseline comparison was made. Local ESLint on `app/page.tsx` OOMs at 4.5GB. No new tests were run.

## Design checkpoint

Latest `docs/UX2-refine.md` blob `6ad42a6f4522be67bd492a20aa1564e420aeffe2` reviewed; unchanged since the prior handoff. §6.29.1 says 3 seconds, overridden for this bounded change by the user's direct 30-second instruction. No Reviewer acceptance is claimed.

## Current task

`UX2-6.29.1-ATTACK-DODGE-VISIBLE-30S-TIMER-04` — keep open until the user confirms the real-game `0:30→0:00` Attack→Dodge graph after this change is deployed. Before any next commit, inspect the exact current-HEAD CI; do not add tests.
