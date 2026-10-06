# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result and CI

UX2.REFINE tasks 1–5 are implemented. Task 5 adds the proven first public Negation branch; focused browser checks passed 12/12 across 390×844, 480×900, and wide, including self-target and fail-closed proof cases. Source/root/target coordinate deltas are ≤2 CSS px; Stage/Dock and Stage/Guidance overlap are zero; no horizontal overflow. Targeted ESLint and `git diff --check` passed. Known separate gap: prior related checks found Oath and Bumper open-scene Stage/Dock overlap at 390×640; baseline was not verified. Before Task 5 commit, Actions run `37546915501` for exact prior remote SHA `0f5c74f71250c89dc639bcc00ef2cbe9e45db1b8` was `in_progress` (`build-and-test` in progress, no failure observed); proceeding without waiting per direct user instruction.

## Design checkpoint

Re-fetched and re-read `docs/UX2-refine.md` at the Task 5 planning boundary; blob `16fe069bd585731a4dafe0c9296dc82a0487d4fc`, unchanged. Next work follows §§2.2, 2.8, 2.11, and 2.19.

## Current task

`UX2.REFINE-NEGATION-COUNTER-BRANCH-01` — extend the same proven single-target causal spine to public counter-Negation: retain the root and public predecessor cards as subdued context, show only the newest public response as active, keep Source/root/Target stable, and compact older history while keeping the root and active head visible. No large Reaction Chain or private responder data. Fail closed on missing/mismatched proof. Prove 390×844, 480×900, and wide geometry, Stage/Dock/Guidance containment, active-card uniqueness, and no overflow.
