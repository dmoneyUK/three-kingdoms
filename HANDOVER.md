# HANDOVER

Target branch: `ux-v2` (working branch: `codex/quick-test-modes`). Phone-only.

## Latest delivery

**W3-F2-R1 shared announcement stability correction — IMPLEMENTED / DEPLOYED — PENDING USER PHONE RE-REVIEW.** Exact source SHA `6c1159ddf5ca90de8e1e1dede13a3e25092769e9`; exact-SHA [Actions `40147754985`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/40147754985) passed browser startup/room smoke, lint/fast, API, D1 migration, Worker deployment and production smoke after a same-SHA rerun. The first API attempt had a transient local Worker `fetch failed`; the rerun passed. Worker `1b1c1f07-2f43-4b4a-9350-e33a11a5e0b9`; production `/` and `/api/health` returned HTTP 200. The owner’s original Prodigal Healer flicker scenario has not been replayed locally after this correction; no phone acceptance is inferred. T3-F1 R2 was already implemented/deployed at `e5abe17e81df79d9dfe7026a862dc2dfb0da5e05` and remains pending phone review; it is not being reimplemented.

Latest design reviewed: `docs/UX2-refine.md` at `6c1159ddf5ca90de8e1e1dede13a3e25092769e9`; §10.9 W4 scope and conversion-frame contract. The W3-F2 status has been reconciled to the verified delivery above.

## Exactly one current bounded task

**W4-F1 — God of War active Play Phase conversion Frame.** For Guan Yu’s ordinary Play Phase use of one genuine red non-Attack Hand card as Attack, decorate the existing matching public Attack journey with a `GOD OF WAR · AS ATTACK` frame. Require the unique event and matching raw/projected `guan_yu_red_card_attack` proof, exact physical CardFace/material identity, actor, target and `playedAs: attack`. Preserve the existing Attack root, target and legal Dodge/response flow; do not create independent action arbitration or change gameplay rules. Missing or mismatched proof fails closed to the existing Attack presentation. Response-stage conversions are outside this slice.

**Current local result:** implementation is complete. `npm run build` passed; targeted ESLint reported 0 errors and 17 existing Hook-dependency warnings. The focused 390×844 authenticated browser regression passed 1/1 with the Guan Yu owner and an independent observer; it confirmed the same real red CardFace/frame and AS ATTACK announcement, legal Dodge availability for the target, no private Hand leak, and no announcement/frame overlap. `git diff --check` passed. Exact-SHA CI/deployment is pending the task push.

**Acceptance and delivery:** one focused authenticated mobile browser regression at 390×844 using the actor and an independent observer. Verify identical public frame/card/announcement, target’s legal Dodge action, and no unrelated private Hand leakage. Keep local UI/browser testing within five minutes; skip if it exceeds the limit. After push, wait for exact-SHA required Actions and deployment, and record production smoke. Final status must remain **IMPLEMENTED / DEPLOYED — PENDING USER PHONE RE-REVIEW**.
