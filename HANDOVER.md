# HANDOVER

Target branch: `ux-v2` (working branch: `codex/ux2-equilibrium-phone`). Phone-only; maximum 8 players.

## Latest execution state

**`UX2-10.9 W3 Prodigal Healer F1 → F2` — implementation prepared; exact-SHA CI and deployment pending.** Reviewed the current remote design at `6779f320577879eb06c6b2430bac5fc19a9aae05`, §10.9 W3 F1/F2. The change keeps verified historical COST proof, retires the announcement after parking or a newer committed root, scopes retirement by room/viewer, and stabilizes semantic journey ownership and copy placement. Source has not yet been pushed; no deployment is claimed.

**Validation:** `npm run build` passed; `node --test tests/public-hero-cost-lifecycle.test.mjs` passed 2/2; focused ESLint reported 0 errors and 16 existing Hook-dependency warnings; `git diff --check` passed. The focused four-viewer browser flow was not completed: three bounded runs reached the W3 frame and privacy checks, with 390×844 announcements visible and the 390×700 announcement safely hidden after sustained lack of a safe placement. The last run then stopped because the fixture tried to play before the next player drew. The fixture now draws before Attack and on later draw turns; it was not rerun under the local five-minute UI-test limit. Do not report this browser regression as PASS.

Latest pre-change `ux-v2` Actions run `40133917306` succeeded at `7aff0585216ffcec54c0e5e83d12c3fda69f6df5`; this does not validate the pending source SHA. After pushing, verify every required exact-SHA job, deployment, and production `/` plus `/api/health`.

## Exactly one current bounded task

Finish delivery of **`UX2-10.9 W3 Prodigal Healer F1 → F2`**: push the prepared change to `ux-v2`, verify exact-SHA CI and Worker deployment/health, then hand off for owner real-iPhone re-review. Final product status must remain **IMPLEMENTED / DEPLOYED — PENDING USER REAL-iPHONE RE-REVIEW** until the owner accepts it.
