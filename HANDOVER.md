# HANDOVER

## Latest verified delivery — §10.76-A

Implementation commit `26b46ad29eb30b82627110332c8911f0228b2b8d` is pushed to `ux-v2`. Exact-SHA [GitHub Actions 45549376243](https://github.com/dmoneyUK/three-kingdoms/actions/runs/45549376243) passed all jobs: browser smoke 2/2, API tests, lint/fast tests, D1 migration, Worker deployment and production smoke. Deployed Worker version `775a5735-3f1c-4244-b6af-98d8633c545f`. Production `/api/health` returned `{"ok":true,"worker":"available"}` and `/` returned HTTP 200. Owner iPhone review remains pending.

**Verified fix:** Real Attack browser evidence showed the H4 provider's compact-measurement exception (`savedWidth is not defined`) prevented shared reveal publication; after fixing it, the test exposed one-frame H4/CardFace readiness skew. The implementation restores measured width in `finally`, validates exact scene identity, and keeps the authentic CardFace hidden until the matching H4 is visible and positioned under that same shared layout identity. `npm run build`, focused browser regression, focused Stage Layout/Announcement tests (57/57), targeted lint (0 errors; existing Hook warnings), and `git diff --check` passed. UI/browser testing stayed within the five-minute cap.

## Current bounded task — §10.76-B

**Design reviewed:** `docs/UX2-refine.md`, revision 2026-11-25 04:16 UTC; current remote baseline includes §10.76-A implementation `26b46ad29eb30b82627110332c8911f0228b2b8d`.

**Task:** `§10.76-B` — shared proof-backed public Effect Frame recovery for genuine Kirin Bow and Frost Sword settlement, incorporating the §10.70 correction. Reuse existing server proof, frame component and §10.76-A shared H4/readiness. Preserve actual physical-card identity, public/private boundaries, full title and revealed CardFaces, H4/PAC lane, normal bounded reveal lifetime, material-owner parking and valid Kirin selector. Frost Sword must show the two actually discarded cards when proven. Do not add Hero/card-specific rendering branches, relax proof, invent card faces, change gameplay/timers, or repeat §10.76-A.

**Resume point:** Follow §10.76-B's source references: compare committed `publicCardEffects` proof, validators, frame-action arbitration, reveal clock and parking/retirement decisions for the real Kirin/Frost outcomes; change only the demonstrated failing shared boundary. Add focused proof/privacy tests and at most one real Kirin browser scenario, with all local UI/browser time under five minutes. Then commit/push, verify exact-SHA CI/deployment/production smoke, update this handoff with actual results, and proceed only at the next clean boundary to §10.77.
