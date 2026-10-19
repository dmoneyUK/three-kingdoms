# Current Handover

Working branch: `ux-v2`. Latest design reviewed: `docs/UX2-refine.md` §10.17.1.1, owner-approved minimal Plan A (design commit `b8b62cf6d42acd09d9dd70c0ea4b532adbd8f6d5`). Preserve unrelated work in the primary checkout.

## Latest implementation and verification

- BCP-1-F1 phone-feedback correction: code SHA `c56e10a343ecbfcac9bde2db5ed98a49161e2571`. Cause: the Harvest root thumbnail used the Hero portrait’s bottom edge as its vertical anchor, while the opponent seat continues below the portrait to its HP/equipment strip. The 40×60 card therefore overlapped equipment.
- The root thumbnail now avoids the author’s full seat bounds and uses measured lower candidates when the seat-adjacent band is occupied by H4. The accepted H4 position and thumbnail size are unchanged; the public pool may cover the parked root. Negation response placement and gameplay, identity, permissions and privacy are unchanged.
- Exact-SHA GitHub Actions [39338531582](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39338531582) for `c56e10a` passed: lint/fast, API, browser startup/room smoke, D1 migration, Worker deployment and production smoke. Worker version: `6600e513-2853-45b7-a091-43da01d5babf`. A post-deployment `/api/health` check returned HTTP 200.
- No additional local or bespoke test campaign was run. The owner has not yet re-reviewed this correction on iPhone.

**Status: IMPLEMENTED / DEPLOYED — PENDING USER PHONE RE-REVIEW.** Not user-accepted.

## One next action

Owner re-reviews BCP-1-F1 on iPhone, confirming the Harvest root no longer covers the author’s HP/equipment strip and that the H4/pool and Negation presentation remain correct. Do not begin another UX task before that review.
