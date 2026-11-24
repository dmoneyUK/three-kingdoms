# HANDOVER — UX2 §10.70 KIRIN-BOW-COMPACT-CARD-POOL-01

**Design reviewed:** `docs/UX2-refine.md` at `f691470c9f6673f37dd8552fc58af8970e85bb1c`.

**Current task:** Route authorized opponent Kirin Bow choices through the shared compact actor-target pool. Preserve server legality, physical card identity, privacy, Skip/Confirm, Retaliation and damage continuation.

**Implementation:** `06b9e9b40ae876f973f15c5d8bcdff00b0ca5421` on `origin/ux-v2`. Added fail-closed projection of only eligible public Equipment cards and reused the shared measured BattlefieldChoiceStage and CardPoolPanel. Kirin placement also protects the shared H4/PAC stage. The local-player Dock remains on its existing path.

**Verification:** Focused layout/render regressions 101/101, equipment API tests 22/22, build and diff checks passed. The single local 390×844 browser run exposed H4 overlap; the shared obstacle-protection option was added, but the browser scenario was not rerun under the one-run limit, so final pool geometry remains unverified locally. Initial run `45373362897` failed lint on inline hook-placement object property reads; that was corrected by destructuring. Exact-SHA run [`45374913002`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/45374913002) passed lint, fast tests, API tests, browser startup/H4 smoke, D1 migration, Worker deployment and production smoke. Worker version: `c11c0a3a-d177-4f4d-8ab6-40a695a4b050`. Direct production `/api/health`: HTTP 200, `{"ok":true,"worker":"available"}`.

**Status / review boundary:** **IMPLEMENTED / DEPLOYED — PENDING OWNER iPHONE REVIEW.** Owner should verify Kirin Bow pool placement and H4/PAC clearance on iPhone. No player-facing UX acceptance is claimed.
