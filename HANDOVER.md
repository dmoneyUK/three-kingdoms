# HANDOVER — Current task: §10.65 concealed Steal result lifetime correction

## Current checkpoint

- Reviewed latest design `docs/UX2-refine.md` at `04f07c39`; Owner iPhone FAIL on deployed `b4a5de00c978` is binding.
- Local implementation scopes one result owner to room/root/settlement/action revision/viewer and hides/retires it on superseding action/H4 or revoked proof. New Discard H4 and zone transition remain separate.
- Four focused mobile browser attempts were within the five-minute cap. The latest run timed out on a component-specific `[data-public-discard-announcement-event-id]` selector. Existing trace screenshots show the genuine Discard copy and neutral discard cards during their animation; the final capture still has a central anonymous card, whose owner/event identity was not established. Do not claim the browser regression passed.
- Current local correction adds a validated newer Discard zone-transition as a direct retirement signal for the old Steal owner. The regression now checks the shared H4 event identity and exact Discard transition event ID/card count. This latest diff has not been browser-rerun; no more local UI/browser tests for this task.
- Local validation: the focused public-H4-routing and public-discard-transition tests passed (20/20); browser spec ESLint passed; `git diff --check` passed. ESLint on `app/page.tsx` hit React Hooks `Maximum call stack size exceeded` at line 4113; the same failure reproduced on the unchanged `HEAD` copy, so it is a baseline tooling failure, not attributed to this patch.
- First delivery commit `222d816a340ab2aa7ff38294fb64b2c616aa8eb5`: exact-SHA [Actions 44172410340](https://github.com/dmoneyUK/three-kingdoms/actions/runs/44172410340) failed the lint job on an unused `activeStealSettlementEventKey`; browser startup/H4 smoke and API/build jobs passed, and deployment was skipped. Removed the unused value and changed the effect to read the tracked settlement fields directly. This correction is not yet committed or CI-verified.

## Current task / resume point

Commit/push the lint correction, then verify exact-SHA CI, Worker deployment and production health. Owner iPhone review remains pending; preserve the unresolved final-frame identity as a limitation unless CI or source evidence resolves it.
