# HANDOVER — UX2 §10.67 STARGAZING-COMPACT-TWO-ZONE-POOL-01

**Updated:** 2026-11-22 03:51 UTC
**Status:** CI REPAIR READY — NOT PUSHED
**Design reviewed:** `docs/UX2-refine.md` at `b98a6b0aabd8bb683b263aadcbb53628a09e2397`, §10.67 (Owner design 2026-11-22 03:14–03:15 UTC).

## Current task

Complete the approved private Stargazing two-zone picker. Initial delivery is pushed as `87b0258a8956d4e3b8e6efa3ddaf8593e9461358`: authentic cards start in server order in Top, Bottom starts empty, the third zone and per-card Move menus are removed, compact true CardFaces support touch and keyboard reorder, and one `CONFIRM` submits the unchanged server-authoritative draft.

## Latest verified checkpoint

- Exact-SHA Actions [run 44982035684](https://github.com/dmoneyUK/three-kingdoms/actions/runs/44982035684) for `87b0258a8956d4e3b8e6efa3ddaf8593e9461358` completed **FAILURE**: lint failed on focus/keyboard handling attached to a noninteractive `article`; API tests and required browser smoke passed; deployment was skipped because lint failed.
- Repair changes the card structure to a semantic `article role=listitem` containing a real focusable button. Arrow-key handling, focus retention and pointer capture now use that button; the full CardFace remains the drag target. No lint rules were disabled.
- After repair: build PASS (existing chunk-size/dynamic-route warnings only); focused deck/render tests PASS 31/31; one focused 440×894 four-player browser scenario PASS (8.3s), including geometry and no-scroll assertions, observer privacy, keyboard reorder/live announcement, 260ms touch drag, exact one-POST Confirm and stale replay. `git diff --check` and focused ESLint on changed tests PASS. API source was not changed by the repair; focused Zhuge Liang API tests had passed 9/9 before it. A local full-file ESLint attempt on `app/page.tsx` had hit the plugin's maximum-call-stack failure; authoritative lint is pending on the repair SHA.
- Repair is uncommitted. Next: commit only `HANDOVER.md`, `app/page.tsx`, `app/sequence-overrides.css` and the focused Stargazing browser spec; push to `ux-v2`; verify exact-SHA lint/fast, API and browser jobs, then Worker deployment and production smoke. Record actual results here.

**Owner review:** Final task status remains `IMPLEMENTED / DEPLOYED — PENDING OWNER iPHONE REVIEW`; never mark USER-ACCEPTED.
