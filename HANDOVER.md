# Current Handover

Target branch: `ux-v2`. Phone-only. Latest design reviewed: `docs/UX2-refine.md` §10.10.3.1, R4 at `18171647cf492e902de6a8cfe064c6dc719e89ba`.

## Latest relevant result

R4-A focused 4-player/390×844 Steal root-to-choice diagnostic: **NOT REPRODUCED; no production fix claimed**. Its focused browser test and handoff were delivered in `ae0e64c1e0364eaa953d4d14ca36e4b14aee72d6`; Actions `40264861304` passed CI/deployment and production health. The intermittent owner-reported root disappearance remains open. Latest R4-B delivery is recorded below.

## Current task — T3-F1 R4-B · shared public target pool and Inspector overlay

**Status: IMPLEMENTED / DEPLOYED — PENDING OWNER iPHONE RE-REVIEW.** R4-B applies only to Steal and Burning Bridges target selection. Actor and spectator now use the same public Hand count, ordered Hand/Equipment/Judgement zones, backs and public faces. The actor retains server-authorized eligibility, local selection and cross-zone “Selection retained” feedback, zone tabs and legal Confirm; observers receive no choice controls, marks or private identities. Inspector overlays these pools without participating in their placement/reflow calculations. Final source SHA `7f4166335340ff668d78d8ea4c133d51a1b24b59` is pushed to `ux-v2`. Exact-SHA [Actions 40269751043](https://github.com/dmoneyUK/three-kingdoms/actions/runs/40269751043) passed API, lint/fast tests, browser startup/room smoke, D1 migration, Worker deployment and production smoke. Worker version `4484d8d4-be5e-4182-96f0-4747d08d5ac3`; direct production checks returned HTTP 200 for `/` and `{"ok":true,"worker":"available"}` from `/api/health`. R4-A remains **NOT REPRODUCED**; no production fix is claimed for that intermittent root issue. No owner phone acceptance is claimed.

### Acceptance scope

- At 4 players / 390×844, one authenticated actor and one separate spectator must see the same public target Hand count, public zones and recognizable pool layout for the same server revision.
- Keep private actor eligibility, hidden Hand selection, local selection state and legal Confirm actor-only. Spectator receives no hidden card identity, index, eligibility, selection marking or action button.
- Show truthful shared choosing/completion stages without broadcasting an unproven selected Hand position.
- In the spectator view, opening Inspector must overlay the pool without moving its top/insets; closing restores the same pool and public stage. Retain all other protected controls and current game authority.
- Limit source scope to the R4-B surfaces in the design: `app/page.tsx`, `app/card-pool-panel.tsx`, `app/battlefield-choice-stage.tsx`, and narrowly scoped target-pool CSS in `app/sequence-overrides.css`. No server broadcast, gameplay mutation, broad layout refactor or unrelated mode changes.

### Validation and resume point

Use one focused authenticated actor/spectator mobile browser case, 390×844, with one Inspector open/close sequence, under five minutes total local UI time. Assert public geometry/count agreement at the same server revision, actor-only legal selection/confirmation, observer privacy, unchanged pool rect while Inspector overlays it, and successful legal resolution. Do not run a broad device/player matrix. Run only the directly relevant basic checks plus required exact-SHA CI/deploy/production health; do not claim owner acceptance. If UI testing exceeds five minutes, stop it and report unverified.

**Execution record (UTC):**

- 2026-10-26 04:03 — fetched `origin/ux-v2`; worktree base and remote both `aba591f2adc62fd54385491863b7feac685b7b63`, with no concurrent remote source changes. Latest relevant Actions run before this change was `40264861304` on `ae0e64c1e0364eaa953d4d14ca36e4b14aee72d6`; lint/fast, API, browser startup/room smoke, D1 migration, deploy and production smoke all succeeded. `aba591f` changes only HANDOVER relative to that successful source tree.
- Before 2026-10-26 04:03 UTC (exact test-run timestamp was not retained in this handoff snapshot) — focused R4-B mobile browser case passed 1/1 at 390×844 (13.3s), comparing Steal and Burning Bridges actor/spectator public pool geometry and privacy, plus Inspector open/close over Steal. The final actor-only zone-tab restoration and its new tab assertions were made after that pass; no further local UI run is allowed under the five-minute/task test cap. This remaining assertion is pending exact-SHA CI; existing CI's browser job is startup/room smoke, so CI alone may not execute the R4-B gameplay case.
- 2026-10-26 04:03 — targeted ESLint passed with 3 existing Hook dependency warnings; `npm run build`, browser spec syntax check and `git diff --check` passed. No game/server/projection permission changes were made.
- 2026-10-26 04:27 — Actions 40267195623 had API/browser/lint/build pass, but its fast-test step remained active for about 19 minutes until the run was cancelled; deployment was skipped. Source inspection found an obsolete `setPendingTargetCardActiveZone` call after that state moved into `CardPoolPanel`; removed only that call. The focused `normal deferred multi-target selection is local until ordered Confirm` test passes 1/1 and exits normally. `npx eslint app/page.tsx` passes with the same 3 existing Hook warnings, `npm run build` passes, and `git diff --check` passes. No UI browser tests were rerun.
- 2026-10-26 04:33 — reviewed failed Actions 40269158483 logs: public selection remained selected, but the shared component omitted the actor-only cross-zone status; the two actor title assertions still expected old card-only names. Restored the selected-zone status as one text node and aligned those two existing title assertions with the shared source/target title. Focused tests passed 3/3 (Dismantle retain/deselect and Steal/Dismantle shared-pool cases); targeted ESLint, local build, JS syntax and `git diff --check` passed. No local UI rerun.
- 2026-10-26 04:34 — committed/pushed the focused correction as `7f4166335340ff668d78d8ea4c133d51a1b24b59` to `ux-v2`; exact-SHA [Actions 40269751043](https://github.com/dmoneyUK/three-kingdoms/actions/runs/40269751043) passed every required job: API, lint/fast, browser startup/room smoke, D1 migration, Worker deploy and production smoke.
- 2026-10-26 04:37 — deployment log reports Worker version `4484d8d4-be5e-4182-96f0-4747d08d5ac3`. Direct production checks: `GET /` → HTTP 200; `/api/health` → `{"ok":true,"worker":"available"}`. Implementation remains pending owner iPhone review.

R4-A's intermittent root disappearance remains **NOT REPRODUCED** and is not fixed by R4-B. Await owner iPhone re-review of the shared pool, actor-only selection/confirmation, Inspector overlay and physical root continuity; do not mark T3-F1 accepted or closed until the owner reviews both stages.
