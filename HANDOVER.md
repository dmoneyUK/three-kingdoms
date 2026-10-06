# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result and CI

Remote base `593f5a5d1a63cbed112689b8da1e9b4232513045` passed Actions run `37541914535`. Local uncommitted WIP fills the Skills band and adds a 30-Hero × 4-width browser regression. The focused sweep exposes a design-fit conflict at 390px: Zhuge Liang's `Empty Fortress Strategem` occupies three natural lines in a 61.9px equal-width peer button; at 320px the peer is 50.7px. The Skills band already uses its full allocated width. No implementation commit or push was made; CSS/test WIP is preserved.

## Design checkpoint

Reviewed `docs/UX2-refine.md` blob `16fe069bd585731a4dafe0c9296dc82a0487d4fc`. §1 remains unchanged; §2 adds the single-target Negation refinement.

## Current task — blocked

`BLOCKED — USER INPUT REQUIRED` — `UX2.REFINE-HERO-SKILLS-BAND-WIDTH-WRAPPING-01`. Resume after the Reviewer chooses the narrow-screen treatment for long multi-word skill labels: keep two equal side-by-side controls and permit a three-line exception, or authorize a responsive Dock reflow/redistribution that retains full labels and the two-line maximum. The current design does not specify this trade-off. The 30-Hero sweep stopped at this first failing case. Preserve the local uncommitted WIP.
