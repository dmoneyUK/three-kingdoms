# Current Handover

Branch target: `ux-v2`. Latest reviewed design: `docs/UX2-refine.md §10.18` (2026-10-20).

## Latest result and open acceptance

- ST5-1 implementation is prepared in this isolated worktree. Five-player phone Seats now use two top-aligned content-sized rows with an 8–16px gap; relative seat mapping and the existing 108px Seat height remain intact. Focused phone browser checks cover all five required viewports, real SWITCH/Inspector hits, Harvest choice geometry and other-count regressions. The real five-player Harvest + committed Negation parking scenario also passes.
- Local validation: `npm run build`; ST5-1 side-column browser checks (9 passed); real five-player Harvest/Negation browser check (1 passed); targeted ESLint and `git diff --check` passed. GitHub Actions and deployment for the ST5-1 commit are pending.
- `BCP-1-F1` and `INS-5-F1-R` remain USER-ACCEPTED/CLOSED. `BCP-1-F2` remains a separate open cross-view committed Negation mini/copy correction; do not modify it in ST5-1. Accepted H4 remains unchanged.

## ONE current bounded task: finish ST5-1 delivery

Commit and push only `app/sequence-overrides.css`, its two focused browser specs, and this handoff to `ux-v2`. Wait for the exact source-SHA required Actions workflow and Worker production smoke. Record actual CI/deployment evidence, then mark **IMPLEMENTED / DEPLOYED — PENDING OWNER PHONE REVIEW**. Do not start INS5-2 or BH5-1 in this slice.
