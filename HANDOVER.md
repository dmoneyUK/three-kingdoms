# HANDOVER — Current Task Only

Repository: `dmoneyUK/three-kingdoms` · target: `origin/ux-v2`

## Latest delivery

**§10.27 M4 — IMPLEMENTED / DEPLOYED — PENDING OWNER PHONE RE-REVIEW.** Commit [`9ac7c110d4f0f897a086de8ce8fad76c9ec258d9`](https://github.com/dmoneyUK/three-kingdoms/commit/9ac7c110d4f0f897a086de8ce8fad76c9ec258d9); exact-SHA [Actions 41347045676](https://github.com/dmoneyUK/three-kingdoms/actions/runs/41347045676) passed lint/fast, API, browser smoke, deploy, and production smoke. Cloudflare Worker version: `f8945216-7b62-4187-bbac-0b6d7db3b9e4`; production `/api/health` returned HTTP 200 and `{"ok":true,"worker":"available"}` at 2026-11-01 20:33 UTC.

M4 adds server-proven physical transitions for directly committed public discard events, routes exact cards from Hand/Equipment/Judgement anchors to the discard anchor, and retires only each routed event after animation. Dismantle result faces, `publicCardEffects`/R4 material, private transfers, and uncommitted choices remain with their existing owners. Genuine `action: "play"` roots remain owned by the existing validated `PublicCardDisplay` Journey; the M4 route rejects them to prevent duplicate card faces. Build passed; focused API proof passed 30/30; public discard/routing regressions passed 13/13; targeted ESLint had zero errors and two existing React Hooks warnings; `git diff --check` passed. No local UI/browser test was run. M4 has not received owner phone acceptance.

Design reviewed: `docs/UX2-refine.md` §§10.27.3–10.27.5, §10.28, and the 2026-11-01 20:20 clean-boundary order at design revision `78a3efa381af4ce807c8505652375c53ee616f38`.

## Current task

**CONSOLE-01 — §10.26 in-place CONFIRM/END phone geometry correction.** This is the same original CONSOLE-01 item; preserve its delivered ordinary Play Cancel removal, same-card retap behavior, legal actions, provider-specific Cancel/Skip, and native End Turn confirmation.

**Approved scope:** In ordinary Play target selection, centre CONFIRM in the available action strip and align END to its far-right edge with the existing inset; leave no Cancel action or reserved Cancel column. Prefer the specified CSS-only grid correction. Replace the existing two-column-count assertion with one focused 390×844 mobile DOMRect check for centred CONFIRM, right-aligned END, no overlap, visible/tappable controls, and absent ordinary Cancel, before and after valid target selection. Preserve the focused provider-Cancel and existing retap/End-dialog assertions. Local UI/browser budget is five minutes total; no desktop testing.

**Required delivery:** Focused checks only, `git diff --check`, commit/push to `ux-v2`, exact-SHA required CI/Worker/production smoke. Then stop for explicit owner iPhone re-review; do not mark USER-ACCEPTED from CI.

**Current state (2026-11-01 20:34 UTC):** M4 is pushed and deployed. This task is now active at a clean boundary. `origin/ux-v2` and HEAD are `9ac7c110d4f0f897a086de8ce8fad76c9ec258d9`. A local untracked generated `tsconfig.tsbuildinfo` is preserved and excluded from task commits.
