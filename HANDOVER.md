# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result and CI

`UX2.REFINE-SIMA-YI-NECROMANCY-SKILLS-BAND-01` adds browser proof for the
existing `sima_yi_guicai` option: only the CurrentAction-projected private Hand
card is selectable, no duplicate Action Row activation appears, and Confirm
preserves the `trigger` provider/cardIds payload. The focused browser spec
passed 3/3 at 390×844 and 1440×900; targeted ESLint and `git diff --check`
passed. No production, rules, or server-projection changes. Reviewer acceptance
is not claimed. Pre-commit remote HEAD
`461cc60bfd360fc98974bef67f76a2264d22cf1a` had no Actions workflow runs or
status checks; treated as success per Reviewer instruction. Deferred: Bumper
Harvest's active choice has no authoritative deadline in the current
projection; do not synthesize a chooser timer.

## Design checkpoint

Latest complete remote design review: `docs/UX2-refine.md` blob
`f8d1ff3bd61be6177de0cf562b3cd38dfb83d888` (unchanged). §1.5/§1.8 require
voluntary Hero skills to activate only from Skills band; §1.10 requires
CurrentAction-gated behavior across the implemented roster. §1.5 names Huang
Gai Self Sacrifice and Sima Yi Necromancy as activation examples. §5 still
defers the Hero/player graph until active pre-§5 refinements close.

## Current task

`UX2.REFINE-CAO-CAO-TREACHERY-SKILLS-BAND-01` — prove the existing
`cao_cao_jianxiong` CurrentAction option activates Treachery from the Skills
band at mobile and wide sizes, with no duplicate Action Row control and the
unchanged `trigger` provider payload; the skill stays disabled without the
authoritative option. Use only a fixture for the already-projected voluntary
trigger. Do not change damage/card-transfer rules, provider semantics, or
server projection. Before commit, inspect the latest actual job for the remote
HEAD; if successful, commit and continue without waiting for this commit's CI.
