# HANDOVER — Current Task Only

Repository: `dmoneyUK/three-kingdoms` · target branch: `ux-v2`

## Latest relevant delivery

`PUBLIC-RENDER-MIGRATION-PLAN-01 / M1` was implemented and pushed at `070d433573deacced2eff05158a910887ed954d8`. Exact-SHA [Actions 41326971857](https://github.com/dmoneyUK/three-kingdoms/actions/runs/41326971857) passed lint/fast tests, API tests, browser startup smoke, deployment and production smoke. Cloudflare Worker version `9fdb5158-602b-4534-9814-e5b4c2d4ed9f` deployed; live `/api/health` returned HTTP 200 `{"ok":true,"worker":"available"}` at 16:38 UTC. M1 changed no visible renderer behavior. Status: **IMPLEMENTED / DEPLOYED — PENDING REVIEW**.

## Current task

`PUBLIC-RENDER-MIGRATION-PLAN-01 / M2 — Equipment physical route and replacement/loss` · authorized by the owner's ordered continuation after §10.25.3 and §10.26 technical delivery. Prerequisites are met: Step B at `73ce7fac` and M1 at `070d4335` are technically delivered; no owner phone review is inferred. Latest `origin/ux-v2` source is `070d433573deacced2eff05158a910887ed954d8`; design §10.27.1–.6 and `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md` were reread at this clean boundary.

Cut over only E11/E12 genuine Equipment zone transitions from `TableResolutionSequence` to the M1 typed route: original physical card and author to the server-confirmed slot, then later replacement or exact loss. Preserve `game/equipment-arrival.js` arrival identity, R4/Inspector, Step B's single H4, and recipient-only refusal transfer. Do not change H4/PAC, rules, timers, R4 frames or unrelated legacy routes. Add focused proof for slot identity/one arrival, stale poll/replay, replacement/loss, private refusal transfer, and no early/duplicate face or false Steal/Dismantle result. If authoritative transition proof is missing, stop and name its producer/consumer; do not infer from DOM or labels. Keep combined local UI/browser validation under five minutes; no broad player matrix.

**M1 closed at 2026-11-01 16:38 UTC:**

- 16:24 — Reconciled after Step B deployment; audited page ownership readiness/filters, `TableResolutionSequence` branches and public fact/timeline sources.
- 16:27 — Added pure router, E01–E21 classification, named legacy allowlist and eight focused tests; registered the test in fast tests. No visible renderer, H4, PAC, Console or layout change.
- 16:31 — Focused tests 8/8, targeted ESLint and diff check passed. First whole-project `tsc` had 658 diagnostics including 10 in the new router; recorded and fixed those router typing errors.
- 16:32 — Re-run focused tests 8/8, targeted ESLint and diff check passed. Whole-project `tsc` still exits 2 with 648 unrelated diagnostics; none reference the M1 router or tests. No local UI/browser test was needed.
- 16:33 — Pre-commit remote CI was green at `73ce7fac` ([run 41325367297](https://github.com/dmoneyUK/three-kingdoms/actions/runs/41325367297)). Committed and pushed M1 as `070d433573deacced2eff05158a910887ed954d8`.
- 16:38 — Exact-SHA [Actions 41326971857](https://github.com/dmoneyUK/three-kingdoms/actions/runs/41326971857) passed all four jobs (lint/fast, API, browser startup smoke, deploy/production smoke). Worker `9fdb5158-602b-4534-9814-e5b4c2d4ed9f`; live health HTTP 200. M1 status: **IMPLEMENTED / DEPLOYED — PENDING REVIEW**.

**M2 progress (2026-11-01 16:39 UTC):** M1 delivery is verified and the latest design/workflow were reread at the clean boundary. M2 is the sole active task; source audit and implementation have not started. Do not begin M3 before M2 exact-SHA CI/deployment.
