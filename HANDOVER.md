# HANDOVER

## Current bounded task — §10.76-B shared committed Effect Frame delivery

**Status:** IMPLEMENTED / DEPLOYED — PENDING OWNER iPHONE REVIEW. §10.76-B remains NOT CLOSED pending the Owner's phone review.

**Design reviewed:** latest remote `docs/UX2-refine.md` §10.76-B, controlling 15:27 UTC Code Review correction. Work was based on `origin/ux-v2` `83d48d115d6cc8726c3aa819f1099d243353b0a9`.

**Implementation:** commit `f492ab18d4ee5723b1aeffdc05f7bec423799abe`, pushed to `ux-v2`.

- In a proven Effect Frame REVEAL, a matching public H4 remains required; PAC message content may be absent while its canonical reserved band remains mandatory. If a real PAC is mounted, its visibility and measured clearance are still checked.
- REVEAL requires safe center placement and painted frame. MOVE/PARKED readiness now depends on the current viewer's measured real parking target; these phases no longer require retired reveal-center geometry and remain renderable when that center is absent.
- Stationary Effect Frame clearance uses actual measured complete-frame, H4 and PAC/reserve rectangles with an exact 5px minimum. The solver keeps 0.5px headroom; ordinary CardFaces and parked miniatures retain their 8px rules.

**Files changed:** `app/public-card-display.tsx`, `app/public-stage-layout-context.tsx`, `game/public-stage-layout.ts`, `tests/public-stage-layout.test.mjs`.

**Validation:** focused layout tests 30/30 passed; targeted ESLint 0 errors (15 existing React Hooks warnings); `git diff --check` passed. Local UI/browser tests were SKIPPED because this bounded task's combined five-minute budget was already exhausted; the budget was not reset. Exact-SHA [GitHub Actions run 45650453378](https://github.com/dmoneyUK/three-kingdoms/actions/runs/45650453378) succeeded: API tests, lint/fast tests, build, required browser startup/visible-H4 smoke, D1 migrations, Worker deploy and production smoke. Worker version `0dddffbf-727c-4e21-b954-f2f53b122519`. Direct production checks returned `/` HTTP 200 and `/api/health` `{"ok":true,"worker":"available"}` (HTTP 200).

**Owner review still required:** verify on iPhone the real Kirin/Frost complete frame with matching H4 and PAC naturally absent/present, actual ≥5px gaps, bounded REVEAL→MOVE→PARKED completion at the genuine material-owner miniature, and unaffected ordinary-card presentation. CI smoke does not establish this phone geometry/lifecycle. Wait for Owner review; do not start another task or mark USER-ACCEPTED.
