# WTK UX2 — Current Handoff

Branch: `ux-v2`

## Latest result

Reviewed design `docs/UX2-refine.md` blob `f610c660a55cf3970117cfed7ec1ccc04168867c`. L4 implementation commit `5a8e6fc98ddfc63a60bdf44483c3798cfb9dea1e` was pushed. Exact-SHA Actions run [38767688870](https://github.com/dmoneyUK/three-kingdoms/actions/runs/38767688870): API tests and browser startup/room smoke passed; Lint and fast tests failed on one unused type import at `app/page.tsx:14`; deploy was skipped. The only blocking diagnostic is confirmed from the Actions annotation. Removing it now as a separate CI-repair change. A focused local `@typescript-eslint/no-unused-vars` check passed; full local ESLint exhausted Node's heap and is not claimed as passing.

Measured parked CardFace rectangles from the real browser run: LUST cost at `(338.3,124)`, first Attack at `(14,529)`, second Attack at `(53.7,124)`, each `48×72`; all three remained in place during settlement. Screenshots and the attached geometry record are in `tests/browser/test-results/browser/hero-active-skills-real-ga-4cfe6-istory-at-true-author-Seats/`.

## Current task

**L4 CI repair only.** Remove the unused `PresentationSnapshotLustDuelExchange` type import identified by run `38767688870`. Keep this repair separate from feature changes. Verify the focused unused-import lint locally, commit and push, then wait for the exact-SHA Actions jobs and deployment. Do not start L5 until L4 CI/deployment is verified.

**Stop/status:** L4 remains **PENDING REVIEW**; no Reviewer acceptance is claimed. After the repair SHA succeeds and deploys, record the exact result, re-read current §10.12.5, then continue with L5 only. Do not implement unrelated queued UX tasks.
