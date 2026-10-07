# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result and CI

`UX2.REFINE-XIAHOU-DUN-STAUCHNESS-SKILLS-BAND-01` completed and was pushed as
`420f4573bf7596f4123a772544adf0bc13a47f96`. Its focused browser spec passed
3/3 at 390×844 and 1440×900; targeted ESLint and `git diff --check` passed.
Test-only change; no production, rules, or server-projection changes. The
previous run `37654907194` failed at workflow level before test jobs were
created. Fresh run `37657102454` for this exact HEAD is in progress; lint/fast,
API tests, and both browser shards succeeded, while deploy was still running at
the last check. Reviewer acceptance is not claimed.

## Design checkpoint

Latest complete remote review: `docs/UX2-refine.md` blob
`f8d1ff3bd61be6177de0cf562b3cd38dfb83d888` (unchanged). §§1.5/1.7 require
CurrentAction-gated Hero-skill activation from Skills band and the existing
selection flow; §1.8 prohibits duplicate Hero-skill activation controls in the
Action Row. §5 keeps the interaction-graph refactor deferred while active
refinements in §§1–4 remain.

## Current task

`UX2.REFINE-ZHOU-YU-SOWING-DISTRUST-SKILLS-BAND-01` — Add focused browser
proof that an authoritative `zhou_yu_fanjian` CurrentAction target option
activates Sowing Distrust from the Skills band at mobile and wide viewports,
uses the existing projected target/Confirm/trigger path, and has no duplicate
Action Row activation. The skill stays disabled without its CurrentAction
provider. Preserve the existing `zhou_yu_fanjian_choice` follow-up. Focused
browser proof passes 3/3 at 390×844 and 1440×900; targeted ESLint and
`git diff --check` pass. No rules, provider, server-projection, or protocol
changes. Before commit, inspect CI for the current remote HEAD; wait if in
progress and repair any actual failing test without weakening coverage.
