# HANDOVER — UX2-DISMANTLE-SETTLEMENT-RETIRE-01

**Updated:** 2026-11-21 23:51 UTC
**Status:** IMPLEMENTED / DEPLOYED — PENDING OWNER iPHONE RE-REVIEW

## Design and result

Reviewed `docs/UX2-refine.md` at revision 2026-11-19 23:32 UTC. Dismantle settlement ownership is tied to its committed public event, room, source root/turn, action revision and public sequence. A later proven public event or turn handoff retires the centre result and old root ownership, including when the next `rootAction` is null. Temporary H4 occlusion pauses readable time and does not retire a still-current result. A valid Dismantle result keeps its 3-second read period. Steal privacy and unrelated Duel/Attack history are unchanged.

Implementation source SHA: `a8b0de80708c23e78723593fef68c2a758be46d9` on `ux-v2`.

## Verification and deployment

- Lifecycle unit tests: 9 passed.
- Focused Gan Ning conversion → Negation pass → Shadowrunner discard → next-turn/discard browser regression: 1 passed after a fresh build.
- Local build, focused test-file ESLint and `git diff --check`: passed. `app/page.tsx` ESLint reproduces the React Hooks stack overflow on the unmodified base.
- Exact-SHA [GitHub Actions run 44963186592](https://github.com/dmoneyUK/three-kingdoms/actions/runs/44963186592): lint/fast, API, browser smoke and deploy jobs all passed. D1 migration and production smoke completed successfully.
- Worker version: `02a4773a-a15e-458c-9d25-c815c636f431`. Production `/api/health` returned `{"ok":true,"worker":"available"}`.

## Current handoff

**Only current task:** Owner iPhone re-review of `UX2-DISMANTLE-SETTLEMENT-RETIRE-01`. Verify the Gan Ning converted Dismantle result remains readable while current, then disappears after the later public Discard/turn transition; confirm the new H4/PAC is visible and the old card/root does not return after refresh. Do not mark USER-ACCEPTED until the Owner confirms.
