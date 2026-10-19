# Current Handover

Working branch: `codex/bcp1-r1-20261019`, isolated from `origin/ux-v2` at `46de50b7f10ab60a42c6dc6739d0e51bd9ab107f`. The primary checkout and remote feature branch have not been modified by this worktree.

## Latest result

- **BCP-1 is not user-accepted.** The latest phone review in `docs/UX2-refine.md` §10.17.1.1 (design update `fa957ee69127c4443f571b87b2544cc87a9c6e9b`) rejects the visible Harvest experience and calls for R1 physical-author attachment plus atomic SWITCH frames first. Preserve Plan A, accepted H4 placement/copy, Inspector behavior, server permissions, and 8s/60s timers.
- **Current local R1 implementation:** genuine Harvest root and publicly committed Negation/counter cards use a reserved slot beside their proven author Hero. Only the root/response authors receive a slot. Parking fails closed until that slot is measured and safe. During TEST SWITCH, card paint stays hidden until viewer and layout projections agree; the same physical card/event/reveal timestamp and public pool persist.
- **Focused phone validation passed locally:** `npm run build`; five Worker/D1 Playwright tests passed, covering root REVEAL→MOVE→PARKED, committed Negation and counter above the read-only pool, 6/8-seat author attachment, spectator TEST SWITCH while choices remain pending, Inspector and public/private Card Details, legal Harvest select/deselect/Confirm, and 1–8-card pool sizing at phone viewports. Screenshots and per-frame/parking geometry are in ignored Playwright test results.
- **No commit, exact-SHA CI, or deployment yet.** The latest successful deployment run is baseline code SHA `828d3cf5b6a9eb0c069416d4ab609c998eb3f0f6`, Actions `39177068741`; it does not validate these local edits.

## Exactly one active task

**BCP-1-R1 — deliver physical-author attachment and SWITCH frame safety.** Inspect the final diff, commit/push only this task to `ux-v2`, verify exact-SHA Actions and Worker/D1 deployment/smoke, then request the user's phone review. Status after technical delivery must be **IMPLEMENTED / DEPLOYED — PENDING USER PHONE REVIEW**, never accepted by the agent.

R2 (pool versus opened Inspector) and R3 (card-name readability/phase hierarchy) remain separate BCP-1 follow-ups and are not active until R1 reaches its review boundary.
