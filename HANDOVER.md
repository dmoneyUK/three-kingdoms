# HANDOVER

Target branch: `ux-v2` (working branch: `codex/quick-test-modes`). Phone-only.

## Latest delivery

**W4-F2 — Zhao Yun Braveheart Dodge AS ATTACK — IMPLEMENTED / DEPLOYED — PENDING USER PHONE RE-REVIEW.** Exact source SHA `ee45af2e8b1df7039db821e8edce7e54bc89f0fb`; [Actions `40149627373`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/40149627373) passed every required job: lint/fast, API, browser startup/room smoke, D1 migration, Worker deployment and production smoke. Worker `cc6b2005-d6fc-4ac6-b1cd-dc41b76fca31`; production `/` and `/api/health` returned HTTP 200, health `{"ok":true,"worker":"available"}`. Build passed and the focused authenticated 390×844 mobile browser regression passed 2/2 for Zhao Yun and an independent observer, checking identical genuine Dodge CardFace/frame/narration, legal Dodge response, privacy and announcement geometry. User phone acceptance is not inferred.

The requested Quick Test change is already present in `ux-v2` from `f954d67`: the lobby omits `attack_dodge` and `attack_negation`, and the Dismantle/Steal preset assigns each of five supported seats both cards, one real weapon and Lightning or Overindulgence. Exact-SHA run `40149627373` passed all three existing preset regressions. No additional source change was needed.

Latest design reviewed: `docs/UX2-refine.md` §10.9.1–10.9.4 at source revision `0d5766f2feae945eb959833c5942e9979902ea95`; this handoff records the subsequent W4-F2 delivery and W4-F3 selection.

## Exactly one current bounded task

**W4-F3 — Zhao Yun Braveheart Attack AS DODGE while answering an Attack.** Show `BRAVEHEART · ATTACK AS DODGE` only when the exact committed response has matching server proof for provider `zhao_yun_attack_as_dodge`, the same physical Attack card, Zhao Yun as responder, the actual Attack root/target, and `playedAs: dodge`. Preserve the genuine Attack CardFace, original Attack root, current legal response and existing turn flow. All viewers must see the same public proof-backed conversion; ordinary Dodge and unproved/mismatched events retain their existing presentation. Do not change rules, permissions, protocol, privacy or card conservation.

Acceptance: one focused authenticated phone-sized regression at 390×844 for Zhao Yun and an independent viewer, proving identical physical identity/frame, correct Attack root and legal result, with no private Hand leak or overlap. Keep combined local UI/browser testing within five minutes; run only the focused validation and repository-required exact-SHA CI/deployment checks. Final status: **IMPLEMENTED / DEPLOYED — PENDING USER PHONE RE-REVIEW**.
