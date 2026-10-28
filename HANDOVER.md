# Current Handover

Repository: `dmoneyUK/three-kingdoms`

Target: `origin/ux-v2`; worktree: `codex/h2-g3-f2-r3`

Latest design reviewed: `docs/UX2-refine.md` at `b5b882f88e20f0aad9edf82d4c61a8d0065d56da`, §§10.8.2.2 and 10.24, plus `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`.

## Latest relevant result

**H2-G3 F2-R3 — IMPLEMENTED / DEPLOYED — PENDING OWNER iPHONE RE-REVIEW.** Source `cda8c8e71217675f3492004b0c6c5f74f41ab533`; exact-SHA [Actions 40612723870](https://github.com/dmoneyUK/three-kingdoms/actions/runs/40612723870) passed API, lint/fast, browser startup/room smoke, D1 migration, Worker deployment, and production smoke. Worker version `c4b06c8a-bd89-4a2c-b492-ba2d8fcfe7bf`. Direct production checks returned `/` HTTP 200 and `/api/health` HTTP 200 with `{"ok":true,"worker":"available"}`. Focused 4-player 390×844 and 6-player 390×700 geometry/screenshot cases passed; the all-count structure check passed. Local UI execution stayed below five minutes.

## Current bounded task

**H2-G3 F2-R3 — OWNER iPHONE RE-REVIEW PENDING.** Check the same paired Hero-name/HP and player-name/public-Hand rows in four- and six/eight-player games; verify taller readable skills, the two-slot Judgement and four-slot Equipment panels aligned in the bottom strip, unchanged Inspector frame/close/details, and prior accepted controls, TEST SWITCH, and privacy behaviors. Only the owner can accept this correction. Do not bundle H2-G3 F1-R3 or infer acceptance from CI.

### Acceptance and stop boundary

- Review the latest §10.8.2.2 F2-R3 plan before edits. Preserve the reported 2026-10-28 PASS items and all real card identities, Details, close, TEST SWITCH and privacy behavior.
- Focused phone evidence only: one authenticated 4-player 390×844 Cao Cao case and one 6- or 8-player Guo Jia/Sima Yi regression; add only cheap structure assertions for other player counts. Capture before/after outer, portrait, paired header, skills, Judgement/Equipment and six slot DOMRects plus a screenshot. UI execution combined maximum: five minutes.
- Keep the same-view Inspector outer size within 1 CSS px; paired stats remain separate and right-aligned; Judgement is below the portrait and left of Equipment; panel edges align; all six genuine slots match within 1 CSS px; skill labels are readable without horizontal overflow; controls remain accessible.
- If these invariants cannot fit inside the measured current outer frame, stop and report measurements/options. Do not enlarge the box or silently shrink/hide content.
- Final status is **IMPLEMENTED / DEPLOYED — PENDING OWNER iPHONE RE-REVIEW**; never mark USER-ACCEPTED as the Agent.

### Execution log

- 2026-10-28 — fetched and reviewed `origin/ux-v2` through `b5b882f`; the latest design makes F2-R3 the current compatible H2-G3 correction after the completed ST-RING-DIR-1 step. Remote source is preserved in a clean worktree; earlier uncommitted documentation in the prior worktree was left untouched.
- 2026-10-28 00:58 UTC — confirmed the count-gated 4-player branch in `OpponentPublicInspector` and existing 6/8-only CSS. Reworked the Inspector markup to share the paired identity rows and bottom Judgement/Equipment wrapper; added a focused 4/6 geometry/screenshot case and updated superseded Inspector assertions. No gameplay, seat mapping, legality or projection changes.
- 2026-10-28 00:58 UTC — `npm run build` passed (existing chunk-size and route-classification warnings). First direct Playwright invocation used the default config and failed before navigation because no `baseURL` was configured; no UI assertions ran. Located the required `tests/browser/playwright.config.mjs`; rerunning the same two phone cases through `npm run test:browser` is pending.
- 2026-10-28 00:59 UTC — correct focused run reached both phone layouts. It exposed a 4-seat inherited-height override (150.5px vs 140.8px baseline), a 6-seat 1.45px excess (148px vs 146.55px), and 1.125px card-height spread caused by proportional zone padding. Updated the direct top-row height override and derived one shared six-slot width; the first browser run did not pass and a single focused rerun is pending.
- 2026-10-28 01:00 UTC — first geometry corrections produced 4-seat Inspector 139px (1.78px undersize) and 6-seat 149.5px (2.95px oversize); 6-seat used the older side-column `28px` slot override due CSS specificity. Increased the 4-seat upper row by 2px and set the shared side-column slot variable at matching specificity; rerun pending.
- 2026-10-28 01:01 UTC — focused rerun passed the 4-seat geometry and common-strip assertions. The 6-seat case exposed a CSS variable dependency: shrinking the common slot size also recomputed the main-track width, violating the fixed outer frame. The main-track formula is now anchored to the pre-existing 28–32px seat-count sizing; only the card slot unit uses the derived value. A final focused 4/6 rerun is pending.
- 2026-10-28 01:01 UTC — after decoupling the sizing variables, both focused phone geometry cases passed in 7.7s. The lightweight all-count DOM-structure check first stopped before its first assertion because it used `tap()` with the non-touch fixture page; changed the structural-only interaction to `click()`.
- 2026-10-28 01:02 UTC — the all-supported-count Inspector structure check passed in 7.6s. Combined local UI execution remained well under the five-minute cap; focused geometry screenshots and DOMRects were captured for four- and six-player phones. Targeted ESLint passed with 0 errors and 2 pre-existing Hook warnings; `node --check` and `git diff --check` passed. `npm run build` had passed after the final layout adjustment, with only the existing chunk-size and static route-classification warnings. Exact-SHA CI and deployment remain pending.
- 2026-10-28 01:03 UTC — pre-commit gate checked against remote head `b5b882f88e20f0aad9edf82d4c61a8d0065d56da`: latest run [40610378878](https://github.com/dmoneyUK/three-kingdoms/actions/runs/40610378878) on `5dc09005e20b5525df9203a63f2411ea1887a9b1` was successful and no queued/in-progress run existed.
- 2026-10-28 01:03 UTC — committed and pushed F2-R3 source/test/handoff as `cda8c8e71217675f3492004b0c6c5f74f41ab533` to `origin/ux-v2`.
- 2026-10-28 01:06 UTC — exact-SHA [Actions 40612723870](https://github.com/dmoneyUK/three-kingdoms/actions/runs/40612723870) succeeded: API tests, lint/fast, browser startup/room smoke, D1 migrations, deployment, and production smoke all passed. Worker version `c4b06c8a-bd89-4a2c-b492-ba2d8fcfe7bf` deployed.
- 2026-10-28 01:07 UTC — direct production checks returned `/` HTTP 200 and `/api/health` HTTP 200 with `{"ok":true,"worker":"available"}`. Implementation remains pending owner iPhone review.
