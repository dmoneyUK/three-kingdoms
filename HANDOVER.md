# HANDOVER

Target branch: `ux-v2` (working branch: `codex/quick-test-modes`). Phone-only.

## Latest result

**W4-F3 — Braveheart Attack AS DODGE in an Attack response — IMPLEMENTED / DEPLOYED — PENDING USER PHONE RE-REVIEW.** Source SHA `5967adb3e8808f189bd5caaf56f42671009bedcb`; exact-SHA [Actions `40150717558`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/40150717558) passed API, lint/fast, browser startup/room smoke, D1 migration, Worker deployment and production smoke. Worker `c48a01ed-934d-4070-b567-49f832cb706d`; production `/` and `/api/health` returned HTTP 200 and health returned `{"ok":true,"worker":"available"}`. Focused authenticated mobile browser proof passed 1/1 at 390×844 for Zhao Yun and an independent observer; build and diff check passed. No owner acceptance is inferred.

Latest design reviewed: `docs/UX2-refine.md` §§10.9.1–10.9.4, revision `5967adb3e8808f189bd5caaf56f42671009bedcb`.

## Exactly one current bounded task

**W4-F4 — Zhen Ji Empress Dowager black card AS DODGE while answering an Attack.** Reuse the shared W2 Frame and current Attack/Dodge journey. Show the Frame only for the exact committed response when server proof ties (1) the genuine black physical response card and `zhen_ji_black_card_dodge` conversion, (2) Zhen Ji as responder/target, and (3) the response to the exact Attack root/target. Preserve the original physical CardFace, current legal response, public/private projection boundaries and turn flow. Extend only the server-authored response proof/projection if needed to prove this already-authorized response; do not alter gameplay rules, permissions or protocol behavior.

Acceptance: one focused authenticated 390×844 phone-sized regression with Zhen Ji and an independent viewer; verify identical proof-backed Frame/CardFace/narration and Attack linkage, successful legal Dodge settlement, no unspent Hand leak and no overlap. Keep combined local UI/browser testing within five minutes. Run focused validation, then exact-SHA required CI/deployment checks. Final status must be **IMPLEMENTED / DEPLOYED — PENDING USER PHONE RE-REVIEW**.
