# HANDOVER — Current Task Only

Repository: `dmoneyUK/three-kingdoms` · target branch: `ux-v2`

## Current task

`BORROWED-SWORD-PHONE-01 — §10.25.3 Step A (A1–A6)`

Design reviewed: `docs/UX2-refine.md` at `origin/ux-v2` `adfbbb3df9d77c7e979e02dd78f46830fea13abf`. The latest Table A and §10.27 preserve Step A as first; Step B, CONSOLE-01 and M1–M6 cannot interrupt it.

**Status: IMPLEMENTATION LOCALLY VERIFIED; COMMIT, EXACT-SHA CI AND WORKER DEPLOYMENT PENDING.** Final status must be `IMPLEMENTED / DEPLOYED — PENDING OWNER iPHONE REVIEW`, never USER-ACCEPTED. Stop after Step A's required review boundary.

## Scope delivered locally

- Keep one server-proven Borrowed Sword root and committed Negation history linked through target choice, holder forced choice and the resulting genuine Attack.
- Route the root and committed Negations through the existing `SingleTargetCardJourney` once; remove the duplicate Borrowed Sword notice without changing card identities or animation ownership.
- Publish H4/PAC only from committed facts and show the chooser, Weapon holder and real Attack responder accurately. Preserve the viewer-private Console and server-owned action permissions.
- No gameplay rules, response order, timers, or public/private boundaries changed.

## Execution and validation

- **2026-11-01 08:57 UTC:** Baseline API reproduction passed; isolated the lost Borrowed Sword root, private uncommitted Negation projection gap, forced-stage misclassification and incorrect Attack/result handoff.
- **2026-11-01 12:28 UTC:** Safely synced the isolated task worktree to design SHA `adfbbb3`; main checkout's existing dirty work was left untouched.
- **2026-11-01 12:36 UTC:** Focused API `tests/api/borrowed-sword.test.mjs` passed 8/8; Presentation V2/snapshot/client tests passed 131/131; targeted ESLint exited 0 with two existing React Hook warnings; `git diff --check` passed.
- **2026-11-01 12:35 UTC:** The 480px browser case first failed because its new assertion queried the action-button container instead of the sibling `.console-guidance`. Updated the locator to the actual guidance owner; the same case then passed 1/1. Combined local browser time remained below the five-minute cap. No production change was made for this test-only mismatch.
- **2026-11-01 12:37 UTC:** `npm run build` passed; only existing chunk-size, dynamic API classification and Node deprecation notices appeared.
- Latest relevant remote Actions run before this change: [41257243551](https://github.com/dmoneyUK/three-kingdoms/actions/runs/41257243551), exact SHA `01a6e70e7f72f02f63ee8534ea77f582de2de02b`, success. The earlier `05efe554` run failed; the later `01a6e70` run is green. No BSW source commit has been pushed yet.

## Resume point

Review the task-only diff, commit/push only these BSW source/tests plus this HANDOVER to `ux-v2`, then wait for the exact source SHA's required Actions and Worker deployment. Verify production `/api/health` and record the actual run, deployment version and health result here. The separate main checkout remains detached at `b085cbc` with pre-existing uncommitted W3/EM-01-related files; do not stage or alter them.
