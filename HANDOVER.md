# Current Handover

Working branch: `ux-v2`. Latest design reviewed: `docs/UX2-refine.md` §10.17.1.1, owner-approved minimal Plan A (design commit `b8b62cf6d42acd09d9dd70c0ea4b532adbd8f6d5`). Preserve unrelated work in the primary checkout.

## Latest implementation and verification

- BCP-1-F1 code SHA: `4ee295ef32470af00ce5fe2de1f9462c6357a749`. Removed Harvest author-slot markup, state and CSS; the normal Hero, Seat, Dock and Hand layout no longer reserves card space. Authentic root and response miniatures are positioned from the public event actor and that player's actual Hero anchor. Existing card identities and REVEAL → MOVE → PARKED timing remain; root is below the visible pool and real response cards remain above it. No gameplay, privacy or timer rules changed.
- The four-card pool now measures the usable battlefield corridor and places itself toward its centre while avoiding measured Seats, H4, timer/activity indicators, Inspector and local controls. Accepted H4 positioning is unchanged. If no fully clear corridor fits, placement chooses the least-overlapping bounded position; no real-phone geometry measurement was collected in this delivery.
- Exact-SHA GitHub Actions [39328998201](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39328998201) for `4ee295e` succeeded: Lint/fast, API, browser startup/room smoke, D1 migration, Worker deployment and production smoke. Worker version: `67e98ee2-1c59-4e7b-868f-c0a5c85910cd`. Workflow root and `/api/health` checks passed; independent production `/api/health` returned HTTP 200 at 2026-10-19 21:41 UTC.
- The initial implementation SHA `8453557` failed CI because the new layout effect read `expandedOpponentId` before its state initialization. The state declaration was moved above the effect in `4ee295e`; all required jobs passed on that final SHA. No extra local test campaign or new tests were run.

**Status: IMPLEMENTED / DEPLOYED — PENDING USER PHONE RE-REVIEW.** The owner has not accepted this correction.

## One next action

Owner manually re-reviews BCP-1-F1 on iPhone, especially the unchanged Hero size, real author attachment after SWITCH, root/pool layering, response visibility and the pool's safe position. Do not start another UX task before that review.
