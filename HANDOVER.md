# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result and CI

`UX2.REFINE-CAO-CAO-TREACHERY-SKILLS-BAND-01` adds browser proof that the
existing `cao_cao_jianxiong` CurrentAction option enables Treachery only in the
Skills band, with no duplicate Action Row entry and the unchanged `trigger`
provider payload. The focused browser spec passed 3/3 at 390×844 and 1440×900;
targeted ESLint and `git diff --check` passed. No production, rules, or server
projection changes. Reviewer acceptance is not claimed. Parent SHA
`099b7d55a4a922b798dcb11168508d5e30e6ada0` Actions run `37653271153` succeeded
(API tests, both browser shards, lint/fast tests, and deploy). Pre-commit remote
HEAD `99e15b00a29944a3556fabceeb4aa5f874c17e5e` had no Actions runs or status
checks; treated as success per Reviewer instruction. Deferred: Bumper Harvest's
active choice has no authoritative deadline in the current projection; do not
synthesize a chooser timer.

## Design checkpoint

Latest complete remote design review: `docs/UX2-refine.md` blob
`f8d1ff3bd61be6177de0cf562b3cd38dfb83d888` (unchanged). §1.5/§1.8 require
voluntary Hero skills to activate only from Skills band; §1.10 requires
CurrentAction-gated behavior across the implemented roster. §1.5 names Cao Cao
Treachery, Huang Gai Self Sacrifice, and Sima Yi Necromancy as activation
examples. §5 still defers the Hero/player graph until active pre-§5 refinements
close.

## Current task

`UX2.REFINE-XIAHOU-DUN-STAUCHNESS-SKILLS-BAND-01` — prove Xiahou Dun's existing
`xiahou_dun_ganglie` CurrentAction option activates Stauchness from the Skills
band at mobile and wide sizes, with no duplicate Action Row activation and the
unchanged `trigger` provider payload; absent authority stays disabled. Keep the
later damage-source choice on its existing generic Action Row path. Do not
change Judgement rules, provider semantics, or server projection. At commit,
inspect the latest remote-HEAD CI; wait if incomplete, repair first if failed,
and otherwise commit without waiting for this task's own CI.
