# HANDOVER — Current Task Only

Repository: `dmoneyUK/three-kingdoms` · target branch: `ux-v2`

## Latest relevant delivery

`EQUIP-H4-01` (§10.25.3 Step B) was implemented at `73ce7fac8e296ea1faf11d102da411774257e074` and pushed. Exact-SHA [Actions 41325367297](https://github.com/dmoneyUK/three-kingdoms/actions/runs/41325367297) passed API, lint/fast tests, browser smoke, deployment and production smoke. Cloudflare Worker version `d1dee9d8-28df-40bb-a9fe-0e2d7abcc464` deployed; live `/api/health` returned HTTP 200 `{"ok":true,"worker":"available"}`. Status: **IMPLEMENTED / DEPLOYED — PENDING OWNER iPHONE REVIEW**.

## Current task

`PUBLIC-RENDER-MIGRATION-PLAN-01 / M1 — pure Router and ownership shadow audit` · authorized by the owner's instruction to continue §10.27 after §10.25.3 and §10.26 technical delivery. Reviewed latest `origin/ux-v2` design at `73ce7fac8e296ea1faf11d102da411774257e074`, §10.27.1–.6, and `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`.

Implement the pure typed `routePublicPresentation` selector and focused test-only comparison/classification. Inventory E01–E21 and explicitly name any still-valid legacy route owners. Preserve the current renderer behavior: no H4, PAC, Console, layout, or visible renderer switch. Use only validated public proof; do not log or infer private Hand data. Cover current route ownership, stale/replay/viewer rebasing, false candidates, child readiness, sequential server-proven card transitions, and private pending Negation. Stop with the exact producer/consumer if required authoritative proof is absent.

**M1 execution checkpoints (2026-11-01 UTC):**

- 16:24 — Reconciled the clean boundary against current `origin/ux-v2` (`73ce7fac`), read §10.27.1–.6 and the autonomous workflow. Audited page ownership readiness/filters and the `TableResolutionSequence` equipment, Judgement, discard and public history consumers. Confirmed public sequence/card IDs come from the committed room timeline and causal scope from validated public facts.
- 16:27 — Added pure `routePublicPresentation`, the E01–E21 coverage inventory and exact temporary legacy allowlist; added eight focused tests and registered them in fast tests. No JSX, H4, PAC, Console or layout behavior changed.
- 16:31 — First focused run: 8/8 tests, targeted ESLint and `git diff --check` passed. Whole-project `tsc` failed with 658 existing/project errors, including 10 new errors in the router. Recorded the failure; fixed the router's proof-result narrowing and allowlist typing.
- 16:32 — Re-run: 8/8 tests, targeted ESLint and `git diff --check` passed. Whole-project `tsc` still exits 2 with 648 errors outside this task; no diagnostics reference `app/public-presentation-routing.ts` or its tests. No local UI/browser test was needed for this non-visible pure-router task.
- 16:31 — Pre-commit CI check: latest `ux-v2` run [41325367297](https://github.com/dmoneyUK/three-kingdoms/actions/runs/41325367297), exact remote head `73ce7fac`, completed successfully. M1 is not yet committed or pushed; after review, commit only the M1 router, focused test/runner registration and this handoff. Then wait for exact-SHA CI/deployment before selecting M2.
