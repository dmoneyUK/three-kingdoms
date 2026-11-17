# HANDOVER — Current task: §10.65 concealed Steal result lifetime correction

## Latest checkpoint

- Reviewed `docs/UX2-refine.md` §10.65 at `04f07c39`. The Owner's iPhone failure on deployed `b4a5de00c978` remains binding; §10.65 is not accepted.
- Implementation commits on `ux-v2`: `222d816a340ab2aa7ff38294fb64b2c616aa8eb5` and lint correction `75382e28366ca20a869e02a709a80ec9c847629a`.
- A single Steal result owner is scoped to room/root/settlement/action revision/viewer. It hides and retires when a newer action, H4, discard transition, room or private viewer scope supersedes it. New discard H4 and its card transitions retain their own event identity. No gameplay or privacy rules changed.
- Focused public-H4/discard tests passed (20/20), browser-spec ESLint and `git diff --check` passed. `app/page.tsx` local ESLint hit the React Hooks `Maximum call stack size exceeded` baseline failure. Four local mobile-browser attempts did not prove the final lifecycle; the corrected shared-H4 regression has not been browser-rerun, and the local UI-test budget is exhausted.
- Exact-SHA [Actions 44173403218](https://github.com/dmoneyUK/three-kingdoms/actions/runs/44173403218) for `75382e28` passed all jobs: lint/fast, browser startup/H4 smoke, API, D1 migration step and deployment/production smoke. No D1 migrations were pending. Worker version: `c7baf25e-8573-4611-a1d3-b34c4ada7472`. Production root returned HTTP 200 and `/api/health` returned `{"ok":true,"worker":"available"}`.

## Current task / resume point

§10.65 correction is implemented and deployed, **PENDING OWNER iPHONE RE-REVIEW**. On iPhone, verify an authorized Hand-Steal face stays visible only for its own result lifetime, retires after a subsequent real action, and does not replace or suppress the new discard H4/cards. The focused browser regression remains unverified; do not claim USER-ACCEPTED.
