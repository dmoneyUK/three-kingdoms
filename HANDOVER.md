# HANDOVER

Target branch: `ux-v2` (working branch: `codex/quick-test-modes`). Phone-only.

## Latest relevant result

**W4-F3 — Braveheart Attack AS DODGE:** source `5967adb3e8808f189bd5caaf56f42671009bedcb`; exact-SHA [Actions `40150717558`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/40150717558) passed and deployed Worker `c48a01ed-934d-4070-b567-49f832cb706d`. Pending user phone re-review; no acceptance inferred.

Latest design reviewed: `docs/UX2-refine.md` §§10.9.1–10.9.4 at `178a3cfcd4d8387fce30accf666aedd2c172b7f`.

## Exactly one current bounded task

**W4-F4 — Zhen Ji Empress Dowager black card AS DODGE while answering an Attack.** Implementation is complete locally and ready to commit. The server now publishes the exact committed black physical card, Empress Dowager conversion and Attack-root/target relation; both actor and observer render the genuine CardFace in the shared Frame with explicit `AS DODGE` narration. Legal response, gameplay rules, permissions, privacy and protocol are unchanged.

Focused validation: `npm run build` passed; `tests/api/equipment.test.mjs` passed 20/20; the real-click authenticated mobile regression passed 1/1 at 390×844 for Zhen Ji and an independent observer, including public proof/card identity, Attack linkage, successful Dodge settlement, private Hand protection and non-overlap; `git diff --check` passed. One earlier browser attempt exposed an invalid optional-proof-key shape; it was corrected and the focused regression then passed.

Resume point: commit the six W4-F4 source/test files and this handover; then require exact-SHA GitHub Actions, Worker deployment and production health verification. Final status: **IMPLEMENTED / DEPLOYED — PENDING USER PHONE RE-REVIEW**. Do not start another task until that delivery is verified.
