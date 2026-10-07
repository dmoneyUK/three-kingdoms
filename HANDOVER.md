# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result and CI

`UX2.REFINE-RETALIATION-UNIFIED-TARGET-CARD-MODAL-01` implementation is ready
to commit: proven external-target Sima Yi Retaliation now uses the shared
full-screen card-selection modal; selection remains CurrentAction-keyed,
revision-safe, private, and separate from Dock Confirm. The modal groups Hand,
Equipment, and Judgment; the full-screen overlay blocks underlying controls and
does not shift Stage/Dock geometry. Focused picker browser coverage passed
56/56, the existing UI-19 external Hero Focus regression passed 1/1, targeted
ESLint passed, and `git diff --check` passed.

Pre-commit Actions run `37634607717` passed on exact parent SHA
`9607280182e5f21a8d2acd5c03a707cb438906f5`. The current task change is not yet
on the remote; record its exact pushed SHA and actual Actions status at the
post-push boundary. Reviewer acceptance is not claimed.

## Design checkpoint

Latest remote design blob reviewed: `f8d1ff3bd61be6177de0cf562b3cd38dfb83d888`.
§4C.14 defines Retaliation's rule-facing instruction and safe Hand fallback;
§4C.21–§4C.28 require authoritative keys, privacy, stable geometry, and focused
browser proof. §5/§6 Hero/player visualization remains deferred until active
pre-§5 refinements close.

## Next task

`UX2.REFINE-POST-RETALIATION-DESIGN-RECHECK-01` — after pushing the current
task, record its exact remote SHA/CI state, re-fetch and review the latest
remote `docs/UX2-refine.md`, compare revisions, and select exactly one
authorized, bounded next refinement before source edits.
