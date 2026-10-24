# HANDOVER

Target branch: `ux-v2` (working branch: `codex/ux2-equilibrium-phone`). Phone-only; maximum 8 players.

## Latest execution state

**`UX2-10.9 W3 Prodigal Healer F1 → F2` — IMPLEMENTED / DEPLOYED; PENDING USER REAL-iPHONE RE-REVIEW.** Reviewed `docs/UX2-refine.md` §10.9 at design revision `6779f320577879eb06c6b2430bac5fc19a9aae05`. Source implementation is `3eec03daebec9af2efb0cc9ba5f64e34e502fe2c`, pushed to `ux-v2` and deployed.

F1 retires/supersedes the public COST announcement without deleting its proof or changing card identity; retirement is room/viewer scoped and late joins or TEST SWITCH do not replay it. F2 keeps journey ownership stable across ordinary geometry refreshes and retains a safe announcement placement briefly while layout settles; on a short viewport with no safe anchor, it hides the floating copy rather than overlap other UI.

**Validation:** local build passed; focused lifecycle unit tests passed 2/2; focused ESLint had 0 errors and 16 existing Hook-dependency warnings. Three bounded W3 browser attempts did not complete the whole scenario: they exercised the four-view frame/privacy path and exposed the 390×700 no-safe-anchor case; the final attempt stopped because its fixture had not drawn before Attack. The fixture was corrected to draw first, but not rerun under the five-minute UI-test cap. Do not report the W3-specific browser regression as passing. Exact-SHA [GitHub Actions run 40140774100](https://github.com/dmoneyUK/three-kingdoms/actions/runs/40140774100) passed all required jobs: lint/fast tests, API tests, browser startup/room smoke, Worker deployment, and production smoke. Live homepage returned HTTP 200; `/api/health` returned `{"ok":true,"worker":"available"}`.

## Exactly one current bounded task

Owner: perform real-iPhone review of **`UX2-10.9 W3 Prodigal Healer F1 → F2`**. Agent implementation and deployment are complete; only the focused W3 browser regression remains unverified locally, and product acceptance remains with the human Reviewer. Do not mark USER-ACCEPTED until that review is recorded.
