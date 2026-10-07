# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result and CI

`UX2.REFINE-KIRIN-BOW-UNIFIED-TARGET-CARD-MODAL-01` was pushed as
`da741ed044f83e581105b1bc555aeb938a7059cc`; Actions run `37641710984` failed
on that exact SHA at workflow level. The only listed job, `build-and-test`, and
all its steps passed; no deploy job was created. The workflow annotation is
`Internal server error` (correlation ID
`b81d14c9-f454-4e6a-8be8-d5e35be4b42f`), and GitHub rejected rerunning the run.
Current Dismantle/Steal implementation passes the focused target-card browser
spec 67/67 plus targeted ESLint and `git diff --check`. Reviewer acceptance is
not claimed.

## Design checkpoint

Latest complete remote design review: `docs/UX2-refine.md` blob
`f8d1ff3bd61be6177de0cf562b3cd38dfb83d888` (unchanged). Re-reviewed §4C.15–16
and §4C.21, §4C.24–28: Dismantle and Steal share the modal, with effect-correct
copy, only authoritative eligible Hand/Equipment/Judgment cards, exact
selection/revision/privacy behavior, and responsive/accessibility proof. §5
still defers the Hero/player graph until active pre-§5 refinements close.

## Current task

`UX2.REFINE-DISMANTLE-STEAL-UNIFIED-TARGET-CARD-MODAL-01` — route only proven
external Dismantle / Burning Bridges and Steal `target_card` decisions through
the shared modal. Preserve CurrentAction eligible keys and the exact existing
`choose_target_card` payload; use “Choose 1 card to discard/obtain” and
USE DISMANTLE / USE STEAL; prove Hand, Equipment, Judgment, revision safety,
privacy, cancellation, no duplicate Dock Confirm, and modal/Stage/Dock geometry
at 320-class, 390×844, 480×900, and wide viewports. Unproven targets/keys keep
the existing safe fallback. Do not change Hero/player geometry, game rules, or
projection semantics. Before committing, inspected latest run `37641710984`
for exact remote HEAD `da741ed…`: its sole actual job `build-and-test` passed;
the workflow-level internal error is recorded separately. Following the
Reviewer’s job-level CI cadence, commit this task without waiting for its new
run; inspect that run before the next commit.
