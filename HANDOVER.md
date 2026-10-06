# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result and CI

`UX2.REFINE-HERO-SKILLS-BAND-WIDTH-WRAPPING-01` implemented: at ≤390px Skills uses a full-width row with Equipment directly below; all 30 implemented Heroes passed geometry/text checks at 320/390/480/1440px. Full focused Skills browser spec: 4 passed. Before this task commit, latest relevant Actions run observed was `37541914535` on `593f5a5d1a63cbed112689b8da1e9b4232513045` (success); docs-only HEAD `20def13c87c66a313f1619cd5063fd02582585da` had no associated run. The new task commit's Actions result has not yet been observed.

## Design checkpoint

Re-fetched and re-read `docs/UX2-refine.md` blob `16fe069bd585731a4dafe0c9296dc82a0487d4fc` at the task boundary; unchanged from the prior review. §§1–2 remain authoritative.

## Current task

`UX2.REFINE-NEGATION-SOURCE-COMPACT-IDENTITY-01` — for a proven generic single-target `NEGATION` Stage (excluding Group, Oath, and Bumper Harvest compositions), render the authoritative public Source as portrait + player name only. Preserve viewer/self-target deduplication; retain other Stage source layouts. Prove source identity/content and containment at 390/480/wide widths; no HP, Hero name, role label, or duplicate source.
