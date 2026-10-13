# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `USER-DIRECTED UX REFINEMENT`

## Latest result

- `UX2-NO-GRAPH-REMOVAL-01` is implemented and deployed. Commit `cdff8e71f3eb8f8e73598974553ecffeadf487c2` removes the graph renderer and oversized combat panels and adds the proof-backed static public-card presenter. Follow-ups `408e4c19f00cf179f76e08433ba5044599b79324`, `16fb711dbed8635dad686d41a0539d73e372f5a7`, and `f7b1aba6c6347f9361951fd385ba6f69a30af36b` fix React Compiler lint, retire old stage assertions/transition keyframes, and align one stale assertion.
- Manual test-view correction `3c32b3d48ba59457a5f03ee280c92fc19e684d38` defaults a fresh/reloaded controller view to HOST when gameplay is active, retains server-selected General progression during setup, and preserves an explicit SWITCH choice through polling and action responses. No local automated tests were run per user direction.
- Latest code SHA `3c32b3d48ba59457a5f03ee280c92fc19e684d38` passed Actions run [`38443997040`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/38443997040): lint/fast tests, API tests, browser startup smoke, deploy, and production smoke all succeeded. The Worker health endpoint also returned `ok: true` after deployment.
- The user reported automatic perspective changes from the previously deployed build. The correction is deployed; a real-game retest and visual acceptance remain pending. The public-card presenter is intentionally static in Task 1; no centre-to-seat movement has been implemented.

## Design checkpoint

Reviewed `docs/UX2-refine.md` at `83ad06cb33c5e959f2d76b5072b0848c17698805` (blob `b3e3d3642534ae97e8aa0c356c48d669f493ac9a`). It replaces the former relationship-graph UX. The design document has not been modified.

## Current boundary

Wait for the user's retest of manual SWITCH and visual acceptance of deployed Task 1. Do not start `UX2-CENTRE-REVEAL-SEAT-CARDS-02` until Task 1 is accepted and the user authorizes it.
