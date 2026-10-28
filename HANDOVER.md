# Current Handover

Repository: `dmoneyUK/three-kingdoms`; target: `origin/ux-v2`.
Worktree: `/Users/jingedai/.codex/worktrees/h2-g3-f2-r3`.
Latest design reviewed: `b2a767db`, `docs/UX2-refine.md` §10.8.2.2, F1-R4 owner override (2026-10-28 19:12:12 UTC). Intervening W3-F2-R1 user acceptance is independent; F1-R4 requirements are unchanged.

## Latest completed result

**NEG-COPY-1 — IMPLEMENTED / DEPLOYED — PENDING OWNER REAL-iPHONE ACCEPTANCE.** Code commit `13d919a8e78863c1eadf8be4964524c25c27580d`; exact-SHA [Actions 40753757597](https://github.com/dmoneyUK/three-kingdoms/actions/runs/40753757597) passed browser smoke, lint/fast tests, API tests, deployment and production smoke. Worker version `032af0bd-9d8f-46bb-a0f6-f3a2ac06cfa5`; production `/api/health` returned `{"ok":true,"worker":"available"}`. Focused public-announcement tests passed 11/11, build and targeted lint passed (0 errors, 15 warnings), and one 390×700 Harvest reveal/park browser case passed twice. Optional whole-project `tsc --noEmit` failed with many unresolved Cloudflare and unrelated project diagnostics; it is not a required CI check. Duel/multi-counter iPhone review remains with owner. No gameplay authority or timing changed.

## Current task

**H2-G3 F1-R4 — IN PROGRESS.** Correct only the phone LEFT/RIGHT opponent Seat outer-frame size after the owner's partial F1-R3 review. On mobile, both side `.opponent-player-card` border boxes must match the same viewport's TOP frame width and height (spread <=1 CSS px), while keeping previously passing top dimensions/gaps, 7-player TOP4+two-side and 8-player TOP5+two-side counts, outer-edge alignment, ring identity, controls and Inspector. Applied a scoped CSS override with full measured width, a 108px bootstrap matching the existing top-frame height, and safe-corridor width based on the actual side footprint. Targeted 390px 7/8-player and 440px 8-player browser checks pass; DOMRects recorded below. Remaining: final build/diff checks, commit/push, exact-SHA CI/deployment, production health. Do not reopen accepted ST-RING-DIR-1 or F2-R3 and do not claim owner phone acceptance.

## Execution log

- 2026-10-28 19:26 UTC — NEG-COPY-1 exact-SHA CI completed successfully on `13d919a8`; all four jobs passed and Worker deployment plus production smoke succeeded. Current work switches to the separately owner-authorized F1-R4 correction.
- 2026-10-28 19:27 UTC — re-read the complete F1-R4 owner correction. Confirmed the stale side thumb width is inherited from the base side-column rule; fixed top cards already use measured `--mobile-seat-width`/`--mobile-seat-height`. Existing geometry spec checks outer-edge alignment but omits side/top size parity. Latest NEG-COPY-1 Actions is green, so the task can proceed to its next commit.
- 2026-10-28 19:29 UTC — first focused Playwright attempt omitted the repository config and failed immediately on relative fixture URLs. Re-ran with `tests/browser/playwright.config.mjs`; it exposed that binding side height directly to initially-zero `--mobile-seat-height` collapses the first measurement seat to its 2px border. Corrected the bootstrap with a 108px floor (the existing top-frame height), after which the measured value can converge to the same top size. No retry yet; local UI budget remains under five minutes.
- 2026-10-28 19:31 UTC — the correctly configured focused Playwright run passed 2/2 in 9.3s. At 390×844, both seven-player side frames equal top at 73.5×108px (outer-edge deltas 0px left/0px right); eight-player side frames are 73.5×108px (0px/0.5px edge deltas). At 440×766, eight-player side frames equal top at 83.5×108px (0px/0.5px edge deltas). Existing checks also retained top gap/margin rules, 7/8 seat counts, all target/SWITCH hit regions, 5/6 all-top and Inspector/SWITCH regression, and seven-player Harvest obstacle clearance. Initial misconfigured test and 2px bootstrap failure were both local, explained above; cumulative browser time remains well below five minutes.
- 2026-10-28 19:32 UTC — safely fast-forwarded the non-overlapping remote docs-only `b2a767db`; reviewed its W3-F2-R1 owner closure. F1-R4 is unchanged. The latest completed required Actions run remains green on code SHA `13d919a8`.
- 2026-10-28 19:32 UTC — F1-R4 `npm run build` passed; targeted ESLint, browser-spec syntax check and `git diff --check` passed. The prior exact-SHA CI run is fully green, and no newer run is queued or in progress. Preparing the focused source/test/handover commit.
- F1-R4 commit/push, exact-SHA CI, Worker deployment and production health: pending.
