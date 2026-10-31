# HANDOVER — Current Task Only

Repository: `dmoneyUK/three-kingdoms` · target branch: `ux-v2`
Design authority: [`docs/UX2-refine.md` §10.25.3](docs/UX2-refine.md)

## Current bounded task — NEG-COPY-1 / owner real-iPhone review

**Status: IMPLEMENTED / DEPLOYED — PENDING OWNER iPHONE REVIEW.** All R6 coding work, including R6-ARCH-01 and R6-ARCH-02, is delivered. No R6 implementation task remains. Do not mark NEG-COPY-1 USER-ACCEPTED/CLOSED until the owner reports an explicit phone `PASS`.

### Release evidence

- Source: `11857f230f4118aa93c32234d818a5b4f08ee453` on `ux-v2`.
- Exact-SHA [GitHub Actions run 41162137191](https://github.com/dmoneyUK/three-kingdoms/actions/runs/41162137191): required lint/fast tests, API tests, browser smoke, migrations, Worker deployment and production smoke all passed.
- Worker version: `5a7b41c2-9f04-4d17-98d6-53c5f727f1ff`. Production `/` returned HTTP 200; `/api/health` returned `{"ok":true,"worker":"available"}`.
- Focused API: 125/125 across seven affected files; Borrowed Sword path 7/7; private-hand reducer 6/6. Build and `git diff --check` passed. Focused ESLint: 0 errors, 15 existing Hook dependency warnings in changed UI files. No local UI/browser test was run (0 minutes); required CI browser smoke passed.
- **2026-10-31 03:00 UTC:** Exact-SHA workflow and production health verified after deployment. The pending documentation/Handover-only update is ignored by `.github/workflows/deploy.yml` and does not change the deployed source.

### Owner review boundary

On the deployed Worker, follow §10.25.3: four-player Duel → Negation/locked choice → TEST SWITCH → counter/Attack → damage → Treachery or Skip. Check H4/PAC, author/card parking, privacy, a single recipient-only Hand reveal, and timer/control access. Check an eight-seat corridor if practical; mark anything unobserved NOT TESTED. Only the owner can complete this review.
