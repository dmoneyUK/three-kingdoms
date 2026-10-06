# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result and CI

`UX2.REFINE-HERO-SKILLS-BAND-WIDTH-WRAPPING-01` pushed as `f378f0b1d9b97410a7b16bef7bf68f47f9a0309b`: Skills uses a full-width row with Equipment below at ≤390px; 30 Heroes × 320/390/480/1440px and the 4-test focused Skills spec passed. `UX2.REFINE-NEGATION-SOURCE-COMPACT-IDENTITY-01` locally verified: proven generic single-target source is portrait + player name only; source portrait measured 64×82px at 390/480/wide, with no overlap. Its focused browser spec passed 5/5; screenshots were captured and visually checked. At this task's commit gate, Actions run `37544826372` for remote HEAD `f378f0b1d9b97410a7b16bef7bf68f47f9a0309b` was `in_progress` (`build-and-test` in progress; no failure observed). Proceeded without waiting per direct user instruction.

## Design checkpoint

Re-fetched and re-read `docs/UX2-refine.md` blob `16fe069bd585731a4dafe0c9296dc82a0487d4fc` at the Task 2 boundary; unchanged. §§1–2 remain authoritative.

## Current task

`UX2.REFINE-NEGATION-ROOT-CARD-AUTHORITY-01` — add a typed, viewer-equal public root `cardKind` for proven generic single-target `NEGATION` scenes, sourced from the actual server-owned root Stratagem card and bound to the active causal identity. Fail closed on missing/mismatched proof; preserve Group/Oath/Bumper contracts and never expose physical card IDs. Prove Dismantle/Burning Bridges identity, viewer parity, frame/source/target mismatch rejection, and no private data. No React layout change in this task.
