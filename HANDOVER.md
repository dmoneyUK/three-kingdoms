# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result and CI

`UX2.REFINE-OTHER-PLAYER-INSPECT-EMPTY-JUDGMENT-COMPACT-01` is complete:
empty Judgment measures 32px at 390×844, 480×900, and 1440×900; restoring the
old stretching alignment makes the 1440px regression measure 41px. Focused
Inspect browser coverage passed 20/20; targeted ESLint and `git diff --check`
passed.

Actions run #853 (`37625333252`) attempt 1 failed only after API shard 1 lost
transport to its local Wrangler server: 43/57 tests passed, then the final
Retaliation-state fetch and 13 subsequent tests failed with `fetch failed`.
Build, fast tests (228/228), browser (709/709), and API shards 2–4 passed. The
same shard passed locally 57/57. Attempt 2 passed both jobs on the exact SHA
`caae90cdd2084abbb7ed7b84e500c41b3a81dd45`. This is a transient Worker
transport failure, not a reproduced assertion/feature regression. The failed
runner's Wrangler log was not retained, so its lower-level trigger is unknown.
Reviewer acceptance is not claimed.

## Design checkpoint

Reviewed the complete remote `docs/UX2-refine.md`, blob
`f8d1ff3bd61be6177de0cf562b3cd38dfb83d888`. §4B's compact public zones,
content sizing, and empty Judgment state are covered. §4C's unified Target Card
Selection Modal remains active work; §5/§6 Hero/player visualization stays
deferred until the active pre-§5 refinements close.

## Next task

`UX2.REFINE-RETALIATION-UNIFIED-TARGET-CARD-MODAL-01` — make the proven
external-target Retaliation choice use the shared centered selection Modal
instead of inline Hero Focus selectable detail plus Local Dock Confirm. Keep
CurrentAction eligible keys and public target/card data authoritative; preserve
opaque Hand fallback versus server-proven `hand:n` positions, public Equipment
/ Judgment faces, revision safety, and privacy. The Modal owns selection and
primary submission so no duplicate Dock Confirm remains. Prove payload, privacy,
Stage/Dock stability, containment, and no horizontal overflow at 390×844,
480×900, and a wide viewport. Do not redesign gameplay or other effects in this
task.
