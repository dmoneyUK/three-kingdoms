# Current Handover

Target branch: `ux-v2`. Latest design reviewed: `docs/UX2-refine.md` §10.7.4.3, including the user's 2026-10-20 smaller hand-card information mark request.

## Latest result

- BCP-1-F1 Harvest seat-overlap correction remains deployed at `c56e10a343ecbfcac9bde2db5ed98a49161e2571`; exact-SHA Actions `39338531582` passed. It remains pending the user's iPhone re-review.
- This task's implementation commit is `fbbebd2c4fe846c4816cf42f72023ceb7159f927` (`feat: customize host test player count`). The selected-hand info ring/glyph is now 30px/16px with its 44×44 target unchanged. The lobby can add a chosen number of host-controlled Test Players, capped by open seats; old requests without a count still fill to four players. These Test Players remain manually controlled, not autonomous AI.
- No local test suite or desktop visual check was run. Exact-SHA CI/deployment and user phone review for this change are pending.

**Status: IMPLEMENTED LOCALLY — PENDING CI/DEPLOYMENT AND USER PHONE REVIEW.** Not user-accepted.

## One next action

Verify the pushed `ux-v2` head's exact-SHA GitHub Actions/deployment, then request the user's mobile review of both changes. Preserve the earlier BCP-1-F1 phone-review handoff as a separate pending item in the roadmap.
