# HANDOVER — UX2 §10.67 STARGAZING-COMPACT-TWO-ZONE-POOL-01

**Updated:** 2026-11-22 03:44 UTC
**Status:** IMPLEMENTED LOCALLY — EXACT-SHA CI / DEPLOYMENT PENDING
**Design reviewed:** `docs/UX2-refine.md` at `b98a6b0aabd8bb683b263aadcbb53628a09e2397`, §10.67 (Owner design 2026-11-22 03:14–03:15 UTC).

## Current task

Deliver the approved private Stargazing two-zone picker refinement only. `PrivateDeckReorderDialog` now starts every authentic revealed card in server order in Top, keeps Bottom empty, removes the third zone and per-card Move menus, uses compact true CardFaces, supports touch drag and functional keyboard reorder, and presents one enabled legal `CONFIRM`. Server submission, exact physical IDs, server limits, privacy and stale-action handling remain unchanged. Scoped CSS keeps the two single-frame zones and 44px action within the actual `.play-table`.

## Validation and delivery checkpoint

- `npm run build` — PASS; existing chunk-size and dynamic-route classification warnings only.
- `node --import tsx --test tests/deck-reorder.test.mjs tests/room-safety-render.test.mjs` — PASS, 31/31.
- Focused API run of `tests/api/zhuge-liang.test.mjs` — PASS, 9/9, including initial all-Top no-op confirmation and private-viewer projection.
- One focused 440×894 four-player Chromium scenario — PASS in 8.1s; measured panel/zone/card/button DOMRects and scroll bounds; exercised observer privacy, keyboard reorder/live announcement, real 260ms touch drag, exact single Confirm payload and stale replay. Two earlier attempts exposed and fixed a stale end-turn test helper and a test-only variable reference; final run passed. Total local browser time remained below five minutes.
- `git diff --check` — PASS. Focused ESLint for changed test files — PASS. Local ESLint on `app/page.tsx` hit the known `react-hooks/rules-of-hooks` maximum-call-stack failure at line 4134; no rule was suppressed or weakened. The last relevant exact-SHA full CI (`d189fc18446da8bda6904df08a067525cf078173`, run [44969910626](https://github.com/dmoneyUK/three-kingdoms/actions/runs/44969910626)) passed; latest remote design-only `b98a6b0a` is excluded by workflow `paths-ignore: **/*.md`.
- Implementation is not yet committed or pushed. Next: commit only the six §10.67 files, push to `ux-v2`, verify exact-SHA Actions / Worker deployment / production smoke, then update this handover with real SHA and deployment evidence.

**Owner review:** Keep final state `IMPLEMENTED / DEPLOYED — PENDING OWNER iPHONE REVIEW`; do not mark USER-ACCEPTED.
