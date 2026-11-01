# HANDOVER — Current Task Only

Repository: `dmoneyUK/three-kingdoms` · target branch: `ux-v2`

## Current task

`BORROWED-SWORD-PHONE-01 — §10.25.3 Step A (A1–A6)`

Design reviewed: `docs/UX2-refine.md` at `origin/ux-v2` `adfbbb3df9d77c7e979e02dd78f46830fea13abf`. The latest Table A and §10.27 preserve Step A as first; Step B, CONSOLE-01 and M1–M6 cannot interrupt it.

**Status: IMPLEMENTED / DEPLOYED — PENDING OWNER iPHONE REVIEW.** Feature commit: `49c08a6a4e1980ec359941d617b7142cc2698c0b`; CI repair and deployed commit: `a9d9a9d5283d433a04934453214a60c9c8b03fe9`. Do not mark USER-ACCEPTED. Stop at this Step A review boundary; do not start Step B until the owner review/replan boundary.

## Delivered scope

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
- **2026-11-01 12:37:46 UTC:** Pushed source commit `49c08a6a4e1980ec359941d617b7142cc2698c0b` to `ux-v2`; exact-SHA Actions run [41307401417](https://github.com/dmoneyUK/three-kingdoms/actions/runs/41307401417) is queued. Worker deployment and production health are pending that run.
- **2026-11-01 12:41 UTC:** Exact-SHA Actions failed only in API tests (329 passed, 2 failed); Lint/Fast and browser-startup smoke passed, deployment was skipped. `tests/api/presentation-v2-engine.test.mjs:949` caught a new forced-choice presentation barrier that would alter response timing; remove that barrier while retaining the committed target-choice fact. `tests/api/public-activity.test.mjs:378` caught a regression where a generic `SKILL_USED` fact at its own root event is no longer selected for H4; preserve generic root-fact narration.
- **2026-11-01 12:43 UTC:** Removed the new Borrowed Sword `readyAfterEventId` timer/presentation gate and restored same-root generic public-fact narration. Build passed; the affected API files (`presentation-v2-engine`, `public-activity`, `borrowed-sword`) passed 68/68; targeted ESLint had 0 errors; `git diff --check` passed. No UI/browser rerun was needed for these non-layout corrections.
- **2026-11-01 12:43:31 UTC:** Exact-SHA Actions run [41307843233](https://github.com/dmoneyUK/three-kingdoms/actions/runs/41307843233) started for repair commit `a9d9a9d5283d433a04934453214a60c9c8b03fe9`.
- **2026-11-01 12:48 UTC:** Exact-SHA run [41307843233](https://github.com/dmoneyUK/three-kingdoms/actions/runs/41307843233) completed successfully on `a9d9a9d5283d433a04934453214a60c9c8b03fe9`: API tests, Lint/Fast, Browser startup/room smoke, and deployment all passed. Worker deployed to `https://three-kingdoms.dai-jinge.workers.dev`; Cloudflare Worker version `0bed6825-8839-4b56-8e49-523ef727933b`. Workflow production smoke passed and a direct `/api/health` check returned `{"ok":true,"worker":"available"}`.

## Review boundary

Step A is technically delivered and deployed. Await the owner's real-iPhone review; no UX acceptance is claimed. Do not begin `EQUIP-H4-01` Step B or another task before this review boundary is resolved. The separate main checkout remains detached at `b085cbc` with pre-existing uncommitted files outside this task; they were not staged or changed.
