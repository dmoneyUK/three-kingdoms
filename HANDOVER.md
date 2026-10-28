# Current Handover

Repository: `dmoneyUK/three-kingdoms`; target branch: `ux-v2`.
Worktree: `/Users/jingedai/.codex/worktrees/h2-g3-f1-r5/WTK`; working branch: `codex/h2-g3-f1-r5`.
Base: latest fetched `origin/ux-v2` `dc1a83ce92e9081dd41a186910208bab4deadf3e`.
Design reviewed: `docs/UX2-refine.md` revision `dc1a83ce`, §10.8.2.2 F1-R5 and current HANDOVER/workflow.

## Current task

**H2-G3 F1-R5 — mobile TOP Hero artwork fill.** Apply only the approved late mobile CSS override to top-ring `.hero-art-image` so it fills the existing portrait width (`left: 0; width: 100%; translate: none; object-fit: cover`). Keep the existing vertical crop unless measured evidence requires a safe adjustment. Do not change seat/frame geometry, top spacing/counts, side rules, game behavior, IDs, hit areas or anchors. Extend the existing seat-recognition browser spec with DOMRect/computed-style assertions; preserve non-image fallbacks and F1-R4 side parity. Delivery: focused mobile evidence, build/fast/lint as applicable, exact-SHA CI and Worker/production checks; status `IMPLEMENTED / DEPLOYED — PENDING USER iPHONE REVIEW OF F1-R5`.

## Execution log

- **2026-10-28 21:03 UTC** — Fetched `origin/ux-v2` to `dc1a83ce`; created a separate clean worktree and working branch from that exact source to preserve the unrelated uncommitted NEG-COPY-1 prototype and dirty primary checkout. Confirmed F1-R5 is the approved next task in the latest design.
- **2026-10-28 21:04 UTC** — First focused Playwright invocation could not start the app because the fresh worktree had no `dist/server/wrangler.json`. No browser assertions ran. Built the current source; build passed with only the existing large-chunk and dynamic-route classification warnings.
- **2026-10-28 21:05 UTC** — Captured the original 390×844 six-player TOP5 baseline. All five existing Hero images used `left:35.75px; translate:-50%`; image widths were 75.89px for p2 and 67.42px for p3–p6 against 71.5px portrait boxes. Baseline PNG: `/tmp/h2-g3-f1-r5-evidence/before-390x844-top5.png`.
- **2026-10-28 21:06 UTC** — Added the scoped mobile TOP-only `left:0; width:100%; translate:none` override, keeping `object-fit:cover`, the existing vertical crop, F1-R4 side rule and every outer Seat/portrait dimension unchanged. Extended the existing browser test to report image CSS/DOMRects and assert TOP fill at 6-player TOP5, 7-player TOP4 and 8-player TOP5.
- **2026-10-28 21:07 UTC** — Ran the 390×844 six-player regression with the original CSS restored temporarily. It failed at the new left-edge assertion by 2.1953px as expected; captured the baseline screenshot and restored the F1-R5 rule.
- **2026-10-28 21:08 UTC** — The same focused 390×844 browser test passed 1/1 in 8.8s after the fix. Six-player TOP5 image widths are all 71.5px and image left edges match portrait left within 0px; computed style is `object-fit:cover`, `left:0px`, `translate:none`, `transform:none`. Seven-player TOP4 and eight-player TOP5 fill assertions, retained side-frame/art parity, seat geometry, TEST SWITCH and Inspector interaction assertions also passed. Before/after PNGs and DOMRects are saved under `/tmp/h2-g3-f1-r5-evidence/`.
- **2026-10-28 21:10 UTC** — Final `npm run build` passed (existing warnings only); `npm run test:fast` passed 311/311 in 18.26s; targeted ESLint and `git diff --check` passed. Pre-commit Actions inspection found the latest relevant code run on `ux-v2` head `7ff2df4` [Actions 40757248761] SUCCESS; current remote head is docs-only `dc1a83ce`. No F1-R5 commit, push, exact-SHA Actions run, Worker deploy, production smoke or owner acceptance yet.

## Delivery state

Implementation and focused validation are complete locally. Next: verify remote `ux-v2` still points at the fetched base, commit only `HANDOVER.md`, `app/sequence-overrides.css` and `tests/browser/side-column-seat-recognition.spec.mjs`, push to `ux-v2`, wait for that exact SHA's required Actions/deployment and production smoke, then report `IMPLEMENTED / DEPLOYED — PENDING USER iPHONE REVIEW OF F1-R5`. Do not mark accepted.
