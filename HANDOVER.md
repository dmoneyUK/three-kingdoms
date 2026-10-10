# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `USER-DIRECTED UX REPAIR`

## Latest result / CI

Committed Attack→Dodge graph readability is extended to 30 seconds of graph-ready visibility per viewer, with an on-screen `0:30` countdown beside the root card. The timer pauses with graph unavailability, polling follows the remaining visible interval, and a different authoritative root still preempts immediately. Negation remains at 3 seconds. No test files were changed; a CI-only correction for run #969 is pending.

Remote HEAD `df2d675719ba99bf6dc030c7eb8061b9b932efe8`, Actions run `38018181246` (#969), failed only in ESLint: a remaining effect captured the whole `activeAttackDodgeSettlement` object instead of depending on its scalar event ID. Browser smoke and API tests passed; deploy was skipped. This CI-repair-only change extracts the remaining effect dependencies. Local `npm run build`, focused overlay ESLint, and `git diff --check` pass. Local ESLint on `app/page.tsx` OOMs at 4.5GB. Full `tsc` reports many repository-wide errors outside changed files; no baseline comparison was made. No test files were changed; no local test suites were run.

## Design checkpoint

Latest `docs/UX2-refine.md` blob `6ad42a6f4522be67bd492a20aa1564e420aeffe2` reviewed; unchanged since the prior handoff. §6.29.1 says 3 seconds, overridden for this bounded change by the user's direct 30-second instruction. No Reviewer acceptance is claimed.

## Current task

`UX2-6.29.1-ATTACK-DODGE-VISIBLE-30S-TIMER-04` — keep open until the user confirms the deployed real-game `0:30→0:00` Attack→Dodge graph. Before any next commit, inspect exact current-HEAD CI; do not add tests.
