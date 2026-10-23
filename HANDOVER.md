# Current Handover

Branch: `ux-v2` (synchronized with `origin/ux-v2` at `0eb03d3d651d173bec114d060d5990640fca34fe` before this task commit)

## Latest result

- **`UX2-10.19-NEG-A1-STEPWISE-COUNTER-NARRATION` — IMPLEMENTED / DEPLOYED — PENDING OWNER REAL-PHONE REVIEW.** Code SHA `5d754977f22bedd122789947fb8fae96da6feec9`; exact-SHA Actions [39880416654](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39880416654) passed lint/fast, API, browser startup smoke and deployment. Worker `2dbaed77-a338-48ff-b41d-4c7fde1b8a8e`; production `/api/health` returned `{"ok":true,"worker":"available"}`. The user has directed autonomous continuation without waiting for this phone review; the pending-review status remains truthful.
- **Latest design reviewed:** `origin/ux-v2` commit `0eb03d3d651d173bec114d060d5990640fca34fe`, especially `docs/UX2-refine.md` §§10.18.1, 10.19 and 10.20. Accepted Harvest, H4 and INS-5-F1-R baselines remain closed. Five-seat physical layout work remains subject to the repository's §5 sequencing boundary.
- The original dirty checkout and all its uncommitted EM-01/Harvest files remain preserved on local branch `codex/preserve-dirty-local-ux2-b085cbc`; this task uses the synchronized `ux-v2` worktree.

## Exactly one current bounded task

**`UX2-10.20-TGT-A1-A — release verification for the server-authoritative viewer-private target projection`.** Exact-SHA CI run [39882125591](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39882125591) failed only in API tests: the pre-existing “healthy Gongsun Zan makes a raw-distance-2 Attack legal” regression exposed that the new evaluator adapter omitted live HP, so the shared distance modifier was not applied. Fixed the adapter to carry `hp` and added a pure regression for live HP-dependent outbound/inbound distance. Focused repair evidence: build passed; capability suite 6/6; existing Gongsun Zan API suite and TGT-A1 API suite passed 6/6; targeted ESLint and `git diff --check` passed. The prior exact-SHA run's lint/fast and browser smoke jobs passed. No client tap behavior, gameplay rule or D1 schema change was introduced; no API route was added.

Commit and push only the HP-preservation repair, its focused regression and this handoff. Wait for the repair SHA's required CI and Worker deployment. If CI fails, fix it and wait for a green exact-SHA run before continuing. Once deployment and `/api/health` are confirmed, record Phase A as **IMPLEMENTED / DEPLOYED — PENDING USER PHONE REVIEW** in §10.20 and hand off **`UX2-10.20-TGT-A1-B`** as the sole next task: Local Dock rejected-target tap UX, eligibility-based highlighting and focused real-browser interaction checks. Keep Phase B blocked on Phase A's exact-SHA release verification, not on human review.

Latest observed required CI before this task commit is green: run `39880416654` for code SHA `5d754977f22bedd122789947fb8fae96da6feec9`.
