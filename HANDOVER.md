# HANDOVER

Target branch: `ux-v2` (working branch: `codex/quick-test-modes`). Phone-only.

## Latest delivery

**W4-F1 — God of War active Play Phase AS ATTACK — IMPLEMENTED / DEPLOYED — PENDING USER PHONE RE-REVIEW.** Exact source SHA `0346c34c19086428876b0e1f9146927d5cdb7051`; [Actions `40148957425`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/40148957425) passed lint/fast, API, browser startup/room smoke, D1 migration, Worker deployment and production smoke. Worker version `c1ba6674-8505-4cce-b44c-1e7c915e5446`; production `/` and `/api/health` returned HTTP 200, health `{"ok":true,"worker":"available"}`. Focused authenticated mobile browser regression passed 1/1 at 390×844 with Guan Yu and an observer: identical public real red CardFace/frame/announcement, target's legal Dodge action, no private Hand identity leak and no frame/announcement overlap. Build and `git diff --check` passed; targeted ESLint had zero errors and 17 existing Hook-dependency warnings. No user phone acceptance is inferred.

Latest design reviewed: `docs/UX2-refine.md` §10.9.1–10.9.4 at exact source SHA `0346c34c19086428876b0e1f9146927d5cdb7051`.

## Exactly one current bounded task

**W4-F2 — Zhao Yun Braveheart: Dodge AS ATTACK during the active Play Phase.** Extend the existing Attack/Dodge journey with a `BRAVEHEART · DODGE AS ATTACK` conversion frame only when the unique committed event and matching raw/projected `zhao_yun_dodge_as_attack` proof establish the same physical Dodge CardFace, Zhao Yun as actor/material owner, actual target, `playedAs: attack`, and the real Hand→Discard transition. Preserve the existing Attack root, target and server-authorized response flow. Missing or mismatched proof stays on the ordinary Attack presentation; do not change game rules or expose private Hand data.

Acceptance scope: one focused authenticated phone-browser regression for the source player and an independent viewer at 390×844, proving identical public real-card/frame/announcement, legal target response, and no unrelated private Hand leak. Keep local UI testing within five minutes and stop at the cap. Update this handoff to the actual result, then push and verify exact-SHA Actions, Worker deployment and production health before selecting another task. Final status must remain **IMPLEMENTED / DEPLOYED — PENDING USER PHONE RE-REVIEW**.
