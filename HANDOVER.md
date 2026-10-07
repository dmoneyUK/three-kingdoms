# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result and CI

`UX2.REFINE-OTHER-PLAYER-INSPECT-ZONE-CONTENT-HEIGHT-01` is locally complete.
The 1440×900 Judgment zone remains 111px high while the adjacent Concealed Hand
is 41px (111px before the fix); 390×844 and 480×900 remain contained. Focused
Inspect browser spec passed 17/17; targeted ESLint and `git diff --check`
passed. Pre-commit base `2344c51349f45148a99e476b888679e5c309e769` passed
Actions run `37624104273` on that exact SHA. Reviewer acceptance is not
claimed.

## Design checkpoint

Current remote `docs/UX2-refine.md` blob is
`f8d1ff3bd61be6177de0cf562b3cd38dfb83d888`. Reviewer added §4C (unified Target
Card Selection Modal); its actionable picker remains separate from passive
Inspect. §4B.2–4B.5 and §4B.6's single-card Equipment / §4B.7 zone-sizing
requirements are complete; §5 remains deferred until active pre-§5 refinements
close. Full design reviewed at this task boundary; the remote design blob is
unchanged.

## Next task

`UX2.REFINE-OTHER-PLAYER-INSPECT-EMPTY-JUDGMENT-COMPACT-01` — close the
explicit §4B.6 empty-Judgment acceptance gap: when no public Judgment card
exists, show compact `None` without reserving a tall zone. Add a focused fixture
and geometry proof at 390×844, 480×900, and 1440×900; preserve public-data
privacy, other zone geometry, and Stage/Menu/Guidance/Dock relationships.
