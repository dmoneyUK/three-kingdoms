# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result and CI

UX2.REFINE tasks 1–3 are implemented in this handoff: Skills wrapping (`f378f0b1…`), compact single-target Negation source (`0b765778…`), and this task's typed, viewer-equal root `cardKind` projection from the server-owned effective card. Build, 87 focused presentation/client tests, and 32 `presentation-v2-engine` API tests pass. Dismantle remains `cardKind: Dismantle` despite the display name “Burning Bridges”; frame/source/target/effect mismatches fail closed; physical card IDs are not projected; Group/Oath/Bumper contracts remain separate. At the commit gate, Actions run `37545220462` for remote HEAD `0b7657789ebd3bd7c8a5ea04bca5bca8a162b86c` was `in_progress`, with no failure observed; proceeded without waiting per direct user instruction.

## Design checkpoint

Re-fetched and re-read `docs/UX2-refine.md` blob `16fe069bd585731a4dafe0c9296dc82a0487d4fc` at the Task 3 boundary; unchanged. §§1–2 remain authoritative.

## Current task

`UX2.REFINE-NEGATION-OPEN-CAUSAL-SPINE-01` — for proven generic single-target open Negation scenes only (no public Negation submitted; exclude Group, Oath, and Bumper), compose the portrait Stage as Source → typed root card → Target. Remove the text EFFECT/empty Reaction Chain/state-copy treatment and duplicate participant facts; preserve Local Dock guidance and responder privacy. Use the new projected `rootCard.cardKind`; fail closed if absent. Prove self/non-self scenes and 390×844, 480×900, and wide geometry, including Stage/Guidance/Dock containment, no overlap/overflow, and compact public identities. Submitted-Negation branch visuals remain out of scope.
