# HANDOVER — Current Task Only

Repository: `dmoneyUK/three-kingdoms` · branch: `ux-v2`

## Latest completed result

**CONSOLE-01 · §10.26** — End Turn now opens a local battlefield/card-pool-style confirmation panel. **IMPLEMENTED / DEPLOYED — PENDING OWNER IPHONE REVIEW.** Source implementation: `a0f85e49124dcefa6ff689319878a1aaf586b35e`; fast-test correction and this handoff: `0eae4bbb4b68f4b17a8050a53122a54f63c6532b`. Exact-SHA [Actions 41362878141](https://github.com/dmoneyUK/three-kingdoms/actions/runs/41362878141) passed Lint/fast, API, browser startup/room smoke, deployment and production smoke. Cloudflare Worker version: `09e22cdf-7003-4a24-aafd-a656a213d704`; live `/api/health` returned `{"ok":true,"worker":"available"}`. The obsolete `window.confirm` fast-test expectation was updated; affected file passed 47/47. Do not claim owner acceptance.

## Current bounded task

**PUBLIC-PAC-REVEAL-ORDER-01 · §10.30 — keep each active genuine centre CardFace above the stable lower PAC.** Status: NOT ACCEPTED; implement and deploy, then stop for owner iPhone review.

**Design reviewed:** latest `origin/ux-v2/docs/UX2-refine.md`, commit `0eae4bbb4b68f4b17a8050a53122a54f63c6532b`, especially §10.30 and shared §R2. The owner explicitly requested this before M4 E16, M5 and M6; follow that order.

**Task:** Reproduce the reported four-player iPhone ordering with one bounded mobile browser flow using committed Barbarian Invasion and Something Out of Nothing roots with genuine Negation response, or one authentic flow plus a pure geometry variant. Record the real event/root/card IDs, journey phase (`REVEAL`/`MOVE`/`PARKED`), PAC `data-public-activity-layout`, and measured CardFace/H4/PAC/Seats/countdown/Dock rectangles. Then repair the first responsible layout route so the active full-size centre CardFace is above lower PAC with a measured nonzero gap (prefer ≥8 CSS px), both inside the safe battlefield. Keep H4 independent and readable, countdown separate, PAC below the card and above Dock; do not hide PAC, shrink/replay/relocate the genuine reveal into Dock, or alter gameplay or Negation rules. Preserve the real public card identity, privacy, and current 4/5/6-player contract.

**Validation boundary:** One focused mobile browser scenario only; total local UI/browser attempts ≤5 minutes including retries. Add only focused geometry/privacy regressions. Run `git diff --check`, then the required exact-SHA GitHub Actions, Worker deployment and production health check. If the genuine public proof or a safe measured lane is missing, STOP and record the exact proof/geometry gap rather than guessing. Remain **PENDING OWNER IPHONE REVIEW**, never USER-ACCEPTED.

**Resume point:** Start from clean tracked state at `0eae4bbb`; preserve untracked generated `tsconfig.tsbuildinfo`. Inspect `app/public-activity-chip.tsx`, `app/public-card-display.tsx` and their focused tests; do not change M4–M6 in this task. Before each commit, check the latest relevant exact-SHA CI run for remote `ux-v2`.
